import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  m1Config,
  creepDungeons,
  namDeDefinition,
  bacCaiDefinition,
  vuongDefinition,
} from '@volam/game-data';
import {
  initializeProgression,
  refreshCharacter,
  addCreep,
  initializeNamDe,
  spawnNamDeIfReady,
  beginNamDeCast,
  BacCaiEncounter,
  VuongEncounter,
} from '@volam/game-core';
import { cancelOwnedEffects } from '../../packages/game-core/dist/status.js';
import { experienceAtLevel } from '../../packages/game-core/dist/campaign.js';
import { waitForQa } from '../../tools/qa-wait.mjs';
const catalog = JSON.parse(
  readFileSync('apps/game-client/src/renovation-art.generated.json', 'utf8'),
);
export async function verifyDepthExpansion({ room, pages, out, onZone }) {
  const [page, peer] = pages,
    sim = room.simulation,
    w = room.world,
    c = sim.arena.config;
  const playerIds = await Promise.all(
    pages.map((p) => p.evaluate(() => window.__VOLAM__.snapshot().sessionId)),
  );
  let heroes = playerIds.map((id) => w.heroes.get(id)),
    h = heroes[0];
  const view = () => page.evaluate(() => window.__VOLAM__.presentation());
  const read = (p = page) => p.evaluate(() => window.__VOLAM__.snapshot());
  const wait = (fn, label) =>
    waitForQa(fn, label, { timeout: 20000, diagnostics: view });
  page.on('pageerror', (error) =>
    console.log('[depth pageerror] ' + error.message),
  );
  const report = {
    status: 'RUNNING',
    clients: pages.length,
    batches: [],
    branches: [],
    creeps: [],
    zones: [],
    effects: [],
    fixtures:
      'Server-only legal max-rank builds, zone placement and durable targets. Movement/casts/hits use real commands. Scene/tick pause only for exact PNG comparison.',
  };
  const save = () =>
    writeFileSync(
      resolve(out, 'verification.json'),
      JSON.stringify(report, null, 2),
    );
  sim.invasion.nextWaveTick = w.tick + 100000;
  w.creeps.clear();
  const setBuild = (hero, school, basic) => {
    cancelOwnedEffects(w, hero.id);
    hero.schoolId = school;
    room.state.players.get(hero.id).schoolId = school;
    hero.level = 30;
    hero.xp = experienceAtLevel(30, c);
    initializeProgression(hero, c, 'fixed', basic);
    const ids = hero.progression.defaultSkills;
    hero.progression.ranks = Object.fromEntries(ids.map((id) => [id, 4]));
    hero.progression.revision++;
    hero.skillIds = [...ids];
    hero.skillCooldowns = [0, 0, 0, 0, 0];
    hero.abilityCooldowns = {};
    hero.actionUntil = 0;
    hero.statuses = [];
    hero.pose = 'idle';
    refreshCharacter(hero, c);
    hero.hp = hero.maxHp;
    hero.mana = hero.maxMana;
  };
  const place = () =>
    heroes.forEach((hero, i) =>
      Object.assign(hero, {
        x: 640 + (i % 3) * 85,
        y: 645 + Math.floor(i / 3) * 90,
        fx: 0,
        fy: 1,
        moveX: 0,
        moveY: 0,
      }),
    );
  const pause = () =>
    page.evaluate(
      () =>
        new Promise((resolve) =>
          window.__VOLAM__.afterRender((renderer) => {
            renderer.game.scene.getScene('Arena').scene.pause();
            resolve();
          }),
        ),
    );
  const resume = () =>
    page.evaluate(
      () =>
        new Promise((resolve) =>
          window.__VOLAM__.afterRender((renderer) => {
            renderer.game.scene.getScene('Arena').scene.resume();
            resolve();
          }),
        ),
    );
  const pair = async (name) => {
    await pause();
    const step = sim.step;
    sim.step = () => {};
    const before = await view();
    try {
      for (const [enabled, label] of [
        [false, 'before'],
        [true, 'after'],
      ]) {
        await page.evaluate(
          (enabled) =>
            new Promise((resolve) => {
              window.__VOLAM__.reviewWorldDepth(enabled);
              window.__VOLAM__.afterRender(() => resolve());
            }),
          enabled,
        );
        await page
          .locator('#viewport')
          .screenshot({ path: resolve(out, name + '-' + label + '.png') });
      }
      const after = await view();
      assert.equal(after.zoom, before.zoom);
      assert.deepEqual(
        after.actors.map((a) => [a.id, a.x, a.y, a.frame]),
        before.actors.map((a) => [a.id, a.x, a.y, a.frame]),
      );
    } finally {
      sim.step = step;
      await resume();
    }
  };
  const budget = async () => {
    heroes.forEach((hero) => setBuild(hero, 'cai_bang', 'cai_bang_chuong'));
    place();
    assert.equal(sim.enterLoiDai(h.id), undefined);
    await wait(
      async () =>
        (await view()).zoneId === 'loi_dai' &&
        (await view()).worldDepth.environment.layers.length === 3,
      'final PvP environment',
    );
    if (onZone) await onZone({ hero: sim.hero(h.id), zone: sim.zoneOf(h.id) });
    await pair('batch2-loi-dai');
    sim.exitLoiDai(h.id);
    heroes = playerIds.map((id) => w.heroes.get(id));
    h = heroes[0];
    await wait(
      async () => (await view()).zoneId === 'arena',
      'final PvP return',
    );
    place();
    for (let i = 0; i < 96; i++) {
      const e = addCreep(
        w,
        'depth_stress_' + i,
        { x: 540 + (i % 12) * 31, y: 530 + Math.floor(i / 12) * 34 },
        c,
      );
      Object.assign(e, {
        archetypeId: 'creep_bandit_grunt',
        hp: 100000,
        maxHp: 100000,
        controlled: true,
      });
      e.stats = { ...c.creep, hp: 100000, damage: 0 };
    }
    await wait(
      async () =>
        (await view()).worldDepth.expandedShadows.actors.filter(
          (a) => a.id.startsWith('depth_stress_') && a.visible,
        ).length >= 80,
      'visible stress actors',
    );
    const v = (await view()).worldDepth;
    assert.equal(v.expandedShadows.actors.filter((a) => a.cast).length, 64);
    assert.ok(v.expandedShadows.bytes <= v.expandedShadows.maxBytes);
    assert.equal(v.expandedShadows.clipped, 0);
    for (const p of pages) {
      await p.locator('#game canvas').focus();
      await p.keyboard.press('KeyT', { delay: 36 });
    }
    let peak = 0;
    const end = Date.now() + 2500;
    while (Date.now() < end) {
      peak = Math.max(peak, (await view()).worldDepth.lights.length);
      await page.waitForTimeout(40);
    }
    assert.ok(peak > 0 && peak <= 16);
    await pair('batch4-party-stress');
    const measure = (enabled) =>
      page.evaluate(
        (enabled) =>
          new Promise((resolve) => {
            window.__VOLAM__.reviewWorldDepth(enabled);
            let old;
            const d = [];
            const step = (t) => {
              if (old !== undefined) d.push(t - old);
              old = t;
              if (d.length >= 90) {
                d.sort((a, b) => a - b);
                resolve({ median: d[45], p95: d[85] });
              } else requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          }),
        enabled,
      );
    report.frameTiming = {
      off: await measure(false),
      on: await measure(true),
      clients: pages.length,
      creeps: 96,
      scenario: '96 controlled creeps, six clients; browser wall-frame spacing',
    };
    report.bounds = { ...v.expandedShadows, peakLights: peak };
    report.batches.push(
      'final pivot correction in PvP; 96-creep/6-player bounded shadows and real ultimate casts',
    );
    report.status = 'PASS';
    save();
    return report;
  };
  if (process.env.VOLAM_DEPTH_STAGE === 'budget') return budget();
  const branches = Object.entries(m1Config.progression.schools).flatMap(
    ([school, p]) => p.basicIds.map((basic) => ({ school, basic })),
  );
  if (!['2', '3', '4'].includes(process.env.VOLAM_DEPTH_STAGE)) {
    for (let offset = 0; offset < branches.length; offset += heroes.length) {
      place();
      const group = branches.slice(offset, offset + heroes.length);
      for (let i = 0; i < group.length; i++)
        setBuild(heroes[i], group[i].school, group[i].basic);
      await wait(async () => {
        const s = await read();
        return group.every(
          (b, i) => s.state.players[heroes[i].id]?.basicId === b.basic,
        );
      }, 'authoritative branch acknowledgement ' + offset);
      report.progress = 'branch acknowledged ' + offset;
      save();
      await page.evaluate(
        () =>
          new Promise((resolve, reject) => {
            const t = setTimeout(
              () => reject(Error('No Phaser render after branch change')),
              6000,
            );
            window.__VOLAM__.afterRender(() => {
              clearTimeout(t);
              resolve();
            });
          }),
      );
      await wait(async () => {
        const v = await view();
        return group.every((b, i) =>
          v.actors.some(
            (a) =>
              a.id === heroes[i].id &&
              a.texture &&
              !a.texture.includes('MISSING'),
          ),
        );
      }, 'branch bodies ' + offset);
      await wait(async () => {
        const v = (await view()).worldDepth;
        return group.every((b, i) =>
          [...v.actors, ...v.expandedShadows.actors].some(
            (a) => a.id === heroes[i].id && a.visible,
          ),
        );
      }, 'branch shadows ' + offset);
      const shown = await view();
      report.branches.push(
        ...group.map((b, i) => ({
          ...b,
          rendered: shown.actors.find((a) => a.id === heroes[i].id),
        })),
      );
      save();
      if (!offset) await pair('batch1-party');
    }
    setBuild(h, 'cai_bang', 'cai_bang_chuong');
    place();
    const creepProfiles = catalog.actors.filter(
      (a) => a.group === 'wave_creeps',
    );
    for (let offset = 0; offset < creepProfiles.length; offset += 8) {
      w.creeps.clear();
      const group = creepProfiles.slice(offset, offset + 8);
      for (let i = 0; i < group.length; i++) {
        const e = addCreep(
          w,
          'depth_creep_' + i,
          { x: 610 + (i % 4) * 95, y: 600 + Math.floor(i / 4) * 125 },
          c,
        );
        Object.assign(e, {
          archetypeId: group[i].id,
          invasionWave: offset + i + 1,
          hp: 100000,
          maxHp: 100000,
          controlled: true,
        });
        e.stats = { ...c.creep, hp: 100000, damage: 0 };
      }
      await wait(async () => {
        const s = await read();
        return group.every(
          (a, i) => s.state.creeps['depth_creep_' + i]?.archetypeId === a.id,
        );
      }, 'authoritative creep acknowledgement ' + offset);
      await wait(async () => {
        const v = (await view()).worldDepth;
        return group.every((a, i) =>
          [...v.actors, ...v.expandedShadows.actors].some(
            (s) => s.id === 'depth_creep_' + i && s.visible,
          ),
        );
      }, 'creep shadows ' + offset);
      report.creeps.push(...group.map((a) => a.id));
      if (!offset) await pair('batch1-creeps');
      save();
    }
    const shadow = (await view()).worldDepth.expandedShadows;
    assert.ok(shadow.bytes <= shadow.maxBytes);
    assert.equal(shadow.clipped, 0);
    report.batches.push('1: all school branches and 20 arena creep families');
    save();
    if (process.env.VOLAM_DEPTH_BATCH === '1') {
      report.status = 'PASS';
      save();
      return report;
    }
  }
  w.creeps.clear();
  place();
  setBuild(h, 'cai_bang', 'cai_bang_chuong');
  h.invulnerable = true;
  if (!['3', '4'].includes(process.env.VOLAM_DEPTH_STAGE)) {
    for (const dungeon of creepDungeons) {
      h.hp = h.maxHp;
      assert.equal(sim.enter(h.id, 'shared', dungeon.id), undefined);
      const zone = sim.zoneOf(h.id);
      h.x = dungeon.width * 0.42;
      h.y = dungeon.height * 0.58;
      for (const e of zone.world.creeps.values()) e.controlled = true;
      await wait(async () => {
        const v = await view();
        return (
          v.zoneId === zone.id &&
          v.worldDepth.profile?.id === dungeon.id &&
          v.worldDepth.environment.layers.length === 3 &&
          v.worldDepth.expandedShadows.actors.some(
            (a) => a.id === h.id && a.visible,
          )
        );
      }, 'zone lighting ' + dungeon.id);
      await page.waitForTimeout(300);
      if (onZone) await onZone({ hero: sim.hero(h.id), zone, dungeon });
      await pair('batch2-' + dungeon.id);
      const v = (await view()).worldDepth;
      assert.ok(v.expandedShadows.bytes <= v.expandedShadows.maxBytes);
      report.zones.push({
        zone: dungeon.id,
        profile: v.profile,
        environment: v.environment,
        shadowActors: v.expandedShadows.actors.length,
      });
      save();
      Object.assign(h, {
        x: dungeon.exit.x,
        y: dungeon.exit.y,
        moveX: 0,
        moveY: 0,
      });
      assert.equal(sim.exit(h.id), undefined);
      await wait(
        async () => (await view()).zoneId === 'arena',
        'return from ' + dungeon.id,
      );
    }
    h.hp = h.maxHp;
    assert.equal(sim.enterLoiDai(h.id), undefined);
    await wait(async () => {
      const v = await view();
      return (
        v.zoneId === 'loi_dai' && v.worldDepth.environment.layers.length === 3
      );
    }, 'PvP lighting');
    await pair('batch2-loi-dai');
    report.zones.push({
      zone: 'loi_dai',
      profile: (await view()).worldDepth.profile,
    });
    sim.exitLoiDai(h.id);
    heroes = playerIds.map((id) => w.heroes.get(id));
    h = heroes[0];
    await wait(async () => (await view()).zoneId === 'arena', 'PvP return');
    report.batches.push('2: all eight dungeons and PvP');
  }
  save();
  if (process.env.VOLAM_DEPTH_BATCH === '2') {
    report.status = 'PASS';
    save();
    return report;
  }

  if (process.env.VOLAM_DEPTH_STAGE !== '4') {
    const keyByBranch = {
      cai_bang_chuong: 'KeyT',
      thien_son_phien: 'KeyQ',
      thien_son_dao: 'KeyR',
      vo_dang_quyen: 'KeyW',
      vo_dang_kiem: 'KeyT',
      thieu_lam_quyen: 'KeyE',
      thieu_lam_dao: 'KeyQ',
      con_luan_thien_su: 'KeyW',
      con_luan_kiem_ton: 'KeyR',
      duong_mon_co_quan: 'KeyT',
      duong_mon_am_khi: 'KeyT',
      ngu_doc_ta_hiep: 'KeyQ',
      ngu_doc_co_su: 'KeyT',
      cai_bang_bong: 'KeyE',
    };
    for (const b of branches) {
      w.creeps.clear();
      setBuild(h, b.school, b.basic);
      Object.assign(h, { x: 700, y: 660, fx: 1, fy: 0, moveX: 0, moveY: 0 });
      const targets = [45, 155].map((dx, i) => {
        const e = addCreep(
          w,
          'depth_fx_target_' + i,
          { x: 700 + dx, y: 660 },
          c,
        );
        Object.assign(e, {
          hp: 100000,
          maxHp: 100000,
          controlled: true,
          archetypeId: 'creep_wild_dog',
        });
        e.stats = { ...c.creep, hp: 100000, damage: 0 };
        return e;
      });
      await wait(
        async () => (await read()).state.players[h.id]?.basicId === b.basic,
        'VFX loadout ' + b.basic,
      );
      await page.waitForTimeout(450);
      await page.locator('#game canvas').focus();
      const before = (await read()).events.at(-1)?.id ?? 0;
      const key = keyByBranch[b.basic],
        slot = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT'].indexOf(key),
        ability = h.skillIds[slot];
      await page.evaluate(
        ({ before, ability }) => {
          window.__depthFxCapture = new Promise((resolve) => {
            const api = window.__VOLAM__,
              end = performance.now() + 3000,
              frames = new Set(),
              sources = new Set();
            let event,
              peak = 0;
            const observe = (renderer) => {
              const s = api.snapshot(),
                v = api.presentation();
              event ??= s.events.find(
                (e) =>
                  e.id > before &&
                  e.sourceId === s.sessionId &&
                  e.abilityId === ability &&
                  e.kind === 'cast',
              );
              const lights = v.worldDepth.lights;
              peak = Math.max(peak, lights.length);
              for (const l of lights) {
                frames.add(l.texture + ':' + l.frame);
                sources.add(l.texture);
              }
              if (performance.now() > end)
                resolve({
                  event,
                  peak,
                  frames: [...frames],
                  sources: [...sources],
                });
              else api.afterRender(observe);
            };
            api.afterRender(observe);
          });
        },
        { before, ability },
      );
      await page.keyboard.press(key, { delay: 36 });
      const capture = await page.evaluate(() => window.__depthFxCapture);
      if (!capture.event) {
        report.castFailure = {
          ability,
          hero: { ...h },
          snapshot: await read(),
        };
        save();
      }
      assert.ok(capture.event, 'authoritative cast ' + ability);
      assert.ok(capture.peak <= 16);
      report.effects.push({
        ...b,
        ability,
        ...capture,
        damaged: targets.some((e) => e.hp < 100000),
      });
      save();
      // Matched real casting frame is captured separately while the server action is still alive.
      if (
        ['cai_bang_chuong', 'con_luan_thien_su', 'ngu_doc_ta_hiep'].includes(
          b.basic,
        )
      ) {
        h.skillCooldowns = [0, 0, 0, 0, 0];
        h.abilityCooldowns = {};
        h.actionUntil = 0;
        h.statuses = [];
        h.mana = h.maxMana;
        await page.waitForTimeout(200);
        await page.evaluate(() => {
          window.__depthFreeze = new Promise((resolve) => {
            const api = window.__VOLAM__,
              end = performance.now() + 7000;
            const sample = (renderer) => {
              const v = api.presentation();
              if (v.worldDepth.lights.length) {
                renderer.game.scene.getScene('Arena').scene.pause();
                resolve(true);
              } else if (performance.now() > end) resolve(false);
              else api.afterRender(sample);
            };
            api.afterRender(sample);
          });
        });
        await page.keyboard.press(key, { delay: 36 });
        assert.ok(
          await page.evaluate(() => window.__depthFreeze),
          'live lit frame ' + ability,
        );
        await pair('batch3-' + b.basic);
      }
    }
    assert.ok(
      report.effects.filter((e) => e.peak > 0).length >= 7,
      'representative emissive effects across branches',
    );
    assert.ok(report.effects.some((e) => e.school === 'ngu_doc' && e.peak > 0));
    assert.ok(
      report.effects.some((e) => e.school === 'con_luan' && e.peak > 0),
    );
    report.batches.push(
      '3: real max-rank casts for 14 branches; bounded selective emission',
    );
  }
  setBuild(h, 'thieu_lam', 'thieu_lam_dao');
  place();
  w.creeps.clear();
  const crescentTarget = addCreep(
    w,
    'depth_crescent',
    { x: h.x + 190, y: h.y },
    c,
  );
  Object.assign(crescentTarget, {
    hp: 100000,
    maxHp: 100000,
    controlled: true,
    archetypeId: 'creep_wild_dog',
  });
  crescentTarget.stats = { ...c.creep, hp: 100000, damage: 0 };
  h.fx = 1;
  h.fy = 0;
  await wait(
    async () => (await read()).state.players[h.id]?.basicId === 'thieu_lam_dao',
    'crescent build',
  );
  await page.locator('#game canvas').focus();
  await page.keyboard.press('KeyA', { delay: 36 });
  await wait(
    async () =>
      (await view()).worldDepth.observed.includes('shaolin-dao-review'),
    'real crescent emission',
  );
  report.crescent =
    'real normal attack with shared body/FX atlas, only crescent emits';
  save();
  await Promise.all(
    pages.map((p, i) =>
      p
        .evaluate(
          () =>
            new Promise((resolve, reject) =>
              window.__VOLAM__.afterRender((renderer) => {
                renderer.game.scene
                  .getScene('Arena')
                  .prepareArt('wave-bosses')
                  .then(() => resolve(), reject);
              }),
            ),
        )
        .then(() => console.log('[depth] boss art ready ' + (i + 1))),
    ),
  );
  report.bosses = [];
  const cleanBoss = () => {
    w.creeps.clear();
    w.projectiles.clear();
    w.areas = [];
    w.shots = [];
    w.actions = [];
    w.combos = [];
    w.namDe = undefined;
    w.vuong = undefined;
    w.bacCai = undefined;
    sim.dongTa.phase = 'waiting';
    sim.tayDoc.phase = 'waiting';
    sim.mainBosses.encounter = undefined;
    sim.waveArena = undefined;
    sim.lockWaveArena(false);
    sim.invasion.wave = 0;
    sim.invasion.nextWaveTick = w.tick + 100000;
    heroes.forEach((hero) => {
      hero.hp = hero.maxHp;
      hero.invulnerable = true;
    });
    place();
  };
  const bossCase = async (name, actor, begin) => {
    assert.ok(actor, 'spawn ' + name);
    Object.assign(actor, {
      x: 780,
      y: 645,
      hp: 100000,
      maxHp: 100000,
      fx: -1,
      fy: 0,
    });
    await wait(
      async () =>
        (await view()).worldDepth.expandedShadows.actors.some(
          (a) => (a.id === actor.id || a.kind === 'boss') && a.visible,
        ),
      'boss shadow ' + name,
    );
    begin();
    const frames = new Set(),
      lightTextures = new Set();
    let peak = 0;
    const end = Date.now() + 2200;
    while (Date.now() < end) {
      const v = await view();
      for (const a of v.renovation.bodies.filter((a) => a.visible))
        frames.add(a.texture + ':' + a.frame);
      for (const l of v.worldDepth.lights) lightTextures.add(l.texture);
      peak = Math.max(peak, v.worldDepth.lights.length);
      await page.waitForTimeout(50);
    }
    assert.ok(peak <= 16);
    const edgeAudit = await page.evaluate(
      () =>
        new Promise((resolve) =>
          window.__VOLAM__.afterRender((renderer) =>
            resolve(
              renderer.game.scene.getScene('Arena').worldDepth.auditShadows(),
            ),
          ),
        ),
    );
    assert.equal(edgeAudit.clipped, 0);
    report.bosses.push({
      name,
      edgeAudit,
      frames: [...frames],
      lightTextures: [...lightTextures],
      peak,
    });
    save();
  };
  cleanBoss();
  const dong = sim.dongTa;
  dong.phase = 'fighting';
  dong.summoned = true;
  dong.spawn(w, c, 'dong_ta', { x: 780, y: 645 });
  await bossCase(
    'dong_ta',
    w.creeps.get('dong_ta'),
    () => (
      (dong.casts = []),
      (dong.effects = []),
      assert.ok(dong.beginCast(w, c, 'dong_ta', 'dan_chi_than_cong', h.id))
    ),
  );
  for (const [form, phase, ability] of [
    ['tay_doc', 'phase1', 'tay_doc_staff'],
    ['tay_doc_cap_mo', 'phase2', 'ngu_doc_than_chuong'],
  ]) {
    cleanBoss();
    const tay = sim.tayDoc;
    assert.ok(tay.spawn(w, c));
    tay.phase = phase;
    tay.nextActionAt = w.tick + 100000;
    await bossCase(
      form,
      w.creeps.get(tay.bossId),
      () => ((tay.cast = undefined), assert.ok(tay.begin(w, c, ability, h))),
    );
  }
  cleanBoss();
  initializeNamDe(w, c, namDeDefinition);
  w.namDe.phase = 'rest';
  w.namDe.spawnAt = 0;
  spawnNamDeIfReady(w, c, w.tick);
  w.namDe.phase = 'combat';
  w.namDe.nextActionAt = w.namDe.nextSmallAt = w.tick + 100000;
  await bossCase(
    'nam_de',
    w.creeps.get('boss_nam_de'),
    () => (
      (w.namDe.cast = w.namDe.smallCast = undefined),
      assert.ok(beginNamDeCast(w, c, 'nhat_duong_chi', h.id))
    ),
  );
  await pair('batch3-nam-de');
  cleanBoss();
  const bac = new BacCaiEncounter(bacCaiDefinition);
  bac.initialize(w, c);
  bac.phase = 'combat';
  bac.nextAction = w.tick + 100000;
  sim.mainBosses.encounter = bac;
  await bossCase(
    'bac_cai',
    w.creeps.get(bac.bossId),
    () => ((bac.cast = undefined), assert.ok(bac.begin(w, c, 'palms', h))),
  );
  for (const phase of [1, 2]) {
    cleanBoss();
    const vuong = new VuongEncounter(vuongDefinition);
    vuong.initialize(w, c);
    vuong.releasedAt = w.tick - 100;
    vuong.phase = phase;
    vuong.nextAction = w.tick + 100000;
    sim.mainBosses.encounter = vuong;
    await bossCase('vuong_p' + phase, w.creeps.get('vuong_trung_duong'), () =>
      vuong.start(
        w,
        c,
        w.creeps.get('vuong_trung_duong'),
        phase === 1 ? 'crescent' : 'pulse',
        h,
        heroes,
      ),
    );
  }
  cleanBoss();
  report.batches.push(
    '4: seven arena boss forms, real encounter casts and projected bodies',
  );
  setBuild(h, 'cai_bang', 'cai_bang_chuong');
  w.creeps.clear();
  place();
  await wait(
    async () => (await read()).state.players[h.id]?.basicId === h.basicId,
    'final arena build',
  );
  await page.locator('#game canvas').focus();
  const start = h.x;
  await page.keyboard.down('ArrowRight');
  try {
    await wait(async () => h.x > start + 16, 'authoritative keyboard movement');
  } finally {
    await page.keyboard.up('ArrowRight');
  }
  await wait(
    async () => Math.abs((await read(peer)).state.players[h.id].x - h.x) < 2,
    'peer movement acknowledgement',
  );
  await page.keyboard.press('F8');
  assert.equal((await view()).worldDepth.enabled, false);
  assert.equal((await view()).worldDepth.lights.length, 0);
  await page.keyboard.press('F8');
  assert.equal((await view()).worldDepth.enabled, true);
  const timing = async (enabled) =>
    page.evaluate(
      (enabled) =>
        new Promise((resolve) => {
          window.__VOLAM__.reviewWorldDepth(enabled);
          const d = [];
          let previous;
          const frame = (t) => {
            if (previous !== undefined) d.push(t - previous);
            previous = t;
            if (d.length === 90) {
              d.sort((a, b) => a - b);
              resolve({ median: d[45], p95: d[85] });
            } else requestAnimationFrame(frame);
          };
          requestAnimationFrame(frame);
        }),
      enabled,
    );
  report.frameTiming = {
    off: await timing(false),
    on: await timing(true),
    clients: pages.length,
    scenario:
      'idle arena after representative casts; browser wall-frame spacing, not GPU benchmark',
  };
  report.bounds = (await view()).worldDepth;
  assert.ok(
    report.bounds.expandedShadows.bytes <=
      report.bounds.expandedShadows.maxBytes,
  );
  assert.ok(report.bounds.pooledFireLights <= 16);
  report.controls = 'Real arrow command and peer movement, real F8 off/on PASS';
  await budget();
  report.status = 'PASS';
  save();
  return report;
}
