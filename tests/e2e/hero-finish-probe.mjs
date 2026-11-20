import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  initializeProgression,
  refreshCharacter,
  addCreep,
} from '@volam/game-core';
import { experienceAtLevel } from '../../packages/game-core/dist/campaign.js';
import { cancelOwnedEffects } from '../../packages/game-core/dist/status.js';
import { waitForQa } from '../../tools/qa-wait.mjs';
const actors = JSON.parse(
  readFileSync('assets/source/hero-motion-v1/actors.json', 'utf8'),
);
const directions = [
  ['down', 0, 1],
  ['down_right', 1, 1],
  ['right', 1, 0],
  ['up_right', 1, -1],
  ['up', 0, -1],
  ['up_left', -1, -1],
  ['left', -1, 0],
  ['down_left', -1, 1],
];
function fixture(room) {
  const sim = room.simulation,
    w = room.world,
    c = sim.arena.config,
    heroes = [...w.heroes.values()];
  const build = (h, a) => {
    cancelOwnedEffects(w, h.id);
    h.schoolId = a.school;
    room.state.players.get(h.id).schoolId = a.school;
    h.level = 30;
    h.xp = experienceAtLevel(30, c);
    initializeProgression(h, c, 'fixed', a.basic);
    h.progression.ranks = Object.fromEntries(
      h.progression.defaultSkills.map((id) => [id, 4]),
    );
    h.progression.revision++;
    h.skillIds = [...h.progression.defaultSkills];
    refreshCharacter(h, c);
    h.hp = h.maxHp;
    h.invulnerable = true;
  };
  const reset = () => {
    for (const h of heroes) {
      cancelOwnedEffects(w, h.id);
      h.statuses = [];
      h.nguDocSummons = [];
      h.actionUntil = 0;
      h.cooldown = 0;
      h.skillCooldowns = [0, 0, 0, 0, 0];
      h.abilityCooldowns = {};
      h.mana = h.maxMana;
      h.pose = 'idle';
      h.moveX = h.moveY = 0;
    }
    w.creeps.clear();
    w.actions = [];
    w.shots = [];
    w.projectiles.clear();
    w.areas = [];
    w.combos = [];
  };
  const place = () =>
    heroes.forEach((h, i) =>
      Object.assign(h, {
        x: 520 + (i % 3) * 180,
        y: 660 + Math.floor(i / 3) * 150,
        moveX: 0,
        moveY: 0,
      }),
    );
  const target = (h, fx, fy, id) => {
    const n = Math.hypot(fx, fy),
      e = addCreep(
        w,
        id,
        { x: h.x + (fx / n) * 48, y: h.y + (fy / n) * 48 },
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
  };
  sim.invasion.nextWaveTick = w.tick + 100000;
  return { sim, w, c, heroes, build, reset, place, target };
}
async function beginObserve(page, ids, ms, proof, awaitInputs = false) {
  await page.evaluate(
    ({ ids, ms, proof, awaitInputs }) => {
      window.__finishDeadline = awaitInputs ? Infinity : performance.now() + ms;
      window.__finishCapture = new Promise((resolve) => {
        const api = window.__VOLAM__,
          end = performance.now() + ms,
          frames = Object.fromEntries(ids.map((id) => [id, []]));
        let png;
        const events = new Map();
        const sample = (renderer) => {
          const s = api.snapshot(),
            scene = renderer.game.scene.getScene('Arena');
          for (const e of s.events) events.set(e.id, e);
          for (const id of ids) {
            const p = s.state.players[id],
              sprite = scene.children.getByName('actor:' + id);
            if (p && sprite) {
              const r = {
                t: performance.now(),
                texture: sprite.texture.key,
                frame: String(sprite.frame.name),
                statuses: JSON.parse(p.statuses || '[]').map((s) => s.kind),
                until: p.actionUntil,
                startedAt: p.actionStartedAt,
                tick: s.state.tick,
                pose: p.pose,
                ability: p.castAbilityId,
                x: sprite.x,
                y: sprite.y,
                sx: p.x,
                sy: p.y,
                fx: p.fx,
                fy: p.fy,
                scale: sprite.scaleX,
                originY: sprite.originY,
              };
              frames[id].push(r);
              if (
                proof &&
                !png &&
                id === ids[0] &&
                r.texture.startsWith('hero-finish:') &&
                r.frame.startsWith('release_')
              )
                png = renderer.game.canvas.toDataURL('image/png');
            }
          }
          if (performance.now() >= window.__finishDeadline)
            resolve({ frames, png, events: [...events.values()] });
          else api.afterRender(sample);
        };
        api.afterRender(sample);
      });
    },
    { ids, ms, proof, awaitInputs },
  );
}
export async function verifyHeroFinish({ room, pages, out }) {
  const { w, c, heroes, build, reset, place, target } = fixture(room),
    [page, peer] = pages;
  const view = () => page.evaluate(() => window.__VOLAM__.presentation()),
    snap = (p = page) => p.evaluate(() => window.__VOLAM__.snapshot());
  const wait = (fn, label) =>
    waitForQa(fn, label, { timeout: 15000, diagnostics: view });
  const report = {
    status: 'RUNNING',
    clients: pages.length,
    idle: [],
    actions: [],
    transitions: [],
  };
  const save = () =>
    writeFileSync(resolve(out, 'finish.json'), JSON.stringify(report, null, 2));
  const selected = process.env.VOLAM_FINISH_ACTOR
    ? actors.filter((a) => a.basic === process.env.VOLAM_FINISH_ACTOR)
    : actors.slice(Number(process.env.VOLAM_FINISH_OFFSET ?? 0));
  for (let offset = 0; offset < selected.length; offset += heroes.length) {
    const group = selected.slice(offset, offset + heroes.length),
      ids = group.map((a, i) => heroes[i].id);
    group.forEach((a, i) => build(heroes[i], a));
    reset();
    place();
    await wait(async () => {
      const s = await snap();
      return group.every(
        (a, i) => s.state.players[ids[i]]?.basicId === a.basic,
      );
    }, 'group build ' + offset);
    await wait(async () => {
      const v = await view();
      return group.every((a, i) =>
        v.actors.some(
          (x) => x.id === ids[i] && /hero-(motion|finish):/.test(x.texture),
        ),
      );
    }, 'group art ' + offset);
    for (const [direction, fx, fy] of directions) {
      reset();
      place();
      group.forEach((a, i) => Object.assign(heroes[i], { fx, fy }));
      await page.waitForTimeout(150);
      await beginObserve(page, ids, 2550, false);
      const capture = await page.evaluate(() => window.__finishCapture);
      group.forEach((a, i) => {
        const frames = [
          ...new Set(
            capture.frames[ids[i]].map((s) => s.texture + ':' + s.frame),
          ),
        ];
        for (const f of [
          'inhale_' + direction,
          'exhale_' + direction,
          'idle_' + direction + '_1',
        ])
          assert.ok(
            frames.some((x) => x.endsWith(f)),
            a.basic + ' idle ' + f,
          );
        report.idle.push({ basic: a.basic, direction, frames });
      });
      save();
    }
    for (const [direction, fx, fy] of directions.filter((d) =>
      d[0].includes('_'),
    )) {
      for (const key of ['KeyA', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT']) {
        reset();
        place();
        group.forEach((a, i) => Object.assign(heroes[i], { fx, fy }));
        const targets = group.map((a, i) =>
          target(heroes[i], fx, fy, 'finish_target_' + i),
        );
        await wait(async () => {
          const v = await view();
          return group.every((a, i) =>
            v.actors.some(
              (x) =>
                x.id === ids[i] &&
                Math.abs(x.x - heroes[i].x) < 2 &&
                Math.abs(x.y - heroes[i].y) < 2,
            ),
          );
        }, 'feet settle');
        await page.waitForTimeout(100);
        if (key === 'KeyQ') {
          const index = group.findIndex((a) => a.basic === 'con_luan_kiem_ton');
          if (index >= 0) {
            const hero = heroes[index];
            await pages[index].locator('#game canvas').focus();
            await pages[index].keyboard.press('KeyS', { delay: 30 });
            await wait(
              async () =>
                (w.areas ?? []).some(
                  (a) => a.ownerId === hero.id && a.abilityId === 'kinh_loi',
                ),
              'real S plants prerequisite Kinh Loi',
            );
            await wait(
              async () => w.tick >= hero.actionUntil,
              'S action recovery',
            );
          }
        }
        const before = (await snap()).events.at(-1)?.id ?? 0;
        const privateIndex =
          key === 'KeyQ'
            ? group.findIndex((a) => a.basic === 'duong_mon_am_khi')
            : -1;
        if (privateIndex > 0)
          await beginObserve(
            pages[privateIndex],
            [ids[privateIndex]],
            1300,
            false,
            true,
          );
        await beginObserve(
          page,
          ids,
          key === 'KeyT' ? 2200 : 1300,
          offset === 0 && key === 'KeyQ' && direction === 'down_right',
          true,
        );
        for (let i = 0; i < group.length; i++) {
          await pages[i].locator('#game canvas').focus();
          await pages[i].keyboard.press(key, { delay: 24 });
        }
        await page.evaluate(
          (ms) => {
            window.__finishDeadline = performance.now() + ms;
          },
          key === 'KeyT' ? 2200 : 1300,
        );
        let privateCapture;
        if (privateIndex > 0) {
          await pages[privateIndex].evaluate(() => {
            window.__finishDeadline = performance.now() + 1300;
          });
          privateCapture = await pages[privateIndex].evaluate(
            () => window.__finishCapture,
          );
        }
        const capture = await page.evaluate(() => window.__finishCapture),
          s = await snap();
        if (capture.png)
          writeFileSync(
            resolve(out, 'diagonal-cast.png'),
            Buffer.from(capture.png.split(',')[1], 'base64'),
          );
        for (let i = 0; i < group.length; i++) {
          const a = group[i],
            h = heroes[i],
            samples = (
              privateCapture && i === privateIndex ? privateCapture : capture
            ).frames[ids[i]],
            slot = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT'].indexOf(key),
            ability = slot < 0 ? a.basic : h.skillIds[slot];
          const event = (
            privateCapture && i === privateIndex ? privateCapture : capture
          ).events.find(
            (e) =>
              e.id > before &&
              e.sourceId === h.id &&
              e.abilityId === ability &&
              ['cast', 'attack'].includes(e.kind),
          );
          const frames = [
            ...new Set(
              samples
                .filter(
                  (x) =>
                    x.texture === 'hero-finish:' + a.basic &&
                    /^(windup|strike|alternate|charge|release|recover)_/.test(
                      x.frame,
                    ),
                )
                .map((x) => x.frame),
            ),
          ];
          const modes = [
            ...new Set(
              samples
                .filter((x) => !/^hero-(finish|motion):/.test(x.texture))
                .map((x) => x.texture),
            ),
          ];
          const special = [
            'duong_mon_flight',
            'duong_mon_shell',
            'duong_mon_evade',
            'con_luan_chaos',
          ].some((k) => samples.some((s) => s.statuses?.includes(k)));
          const entry = {
            basic: a.basic,
            key,
            ability,
            direction,
            event,
            frames,
            nativeModes: modes,
            timingFailure: frames.length < 2 ? samples : undefined,
            special,
            hp: targets[i].hp,
          };
          report.actions.push(entry);
          save();
          if (
            [
              'ngu_hanh_cach_the_thuat',
              'vo_hinh_doc',
              'vo_hinh_ma_co',
            ].includes(ability)
          ) {
            assert.ok(!event, 'passive slot must not invent a cast ' + ability);
            entry.passiveSlot = true;
            entry.timingFailure = undefined;
            save();
            continue;
          }
          if (privateCapture && i === privateIndex) {
            entry.privateCast = {
              ownerObserved: !!event,
              peerObserved: capture.events.some(
                (e) =>
                  e.id > before &&
                  e.sourceId === h.id &&
                  e.abilityId === ability &&
                  e.kind === 'cast',
              ),
            };
            assert.equal(entry.privateCast.peerObserved, false, 'trap privacy');
          }
          assert.ok(event, 'server input ' + ability + '/' + direction);
          if (!special) {
            assert.ok(
              frames.length >= 2,
              'body phase changes ' + ability + ' ' + JSON.stringify(frames),
            );
            assert.ok(
              frames.every((f) => f.endsWith(direction)),
              'facing ' + ability + '/' + direction,
            );
          }
          if (key === 'KeyA') {
            assert.ok(targets[i].hp < 100000, 'real A damage ' + a.basic);
            await wait(
              async () =>
                (await snap(peer)).state.creeps[targets[i].id]?.hp ===
                targets[i].hp,
              'peer A damage ' + a.basic,
            );
            const drift = Math.max(
              ...samples.map((x) => Math.hypot(x.x - x.sx, x.y - x.sy)),
            );
            assert.ok(
              drift < 3,
              'stationary foot pivot ' + a.basic + ':' + drift,
            );
            report.transitions.push({
              basic: a.basic,
              direction,
              footDrift: drift,
              idleReturned: samples.some(
                (x) =>
                  x.pose === 'idle' && /^hero-(finish|motion):/.test(x.texture),
              ),
            });
          }
        }
      }
      // Real walk after recovery proves input and body transition, rather than pose injection.
      reset();
      place();
      await page.locator('#game canvas').focus();
      const h = heroes[0],
        x = h.x,
        y = h.y;
      const keys = [
        fx > 0 ? 'ArrowRight' : 'ArrowLeft',
        fy > 0 ? 'ArrowDown' : 'ArrowUp',
      ];
      for (const key of keys) await page.keyboard.down(key);
      try {
        await wait(
          async () => Math.hypot(h.x - x, h.y - y) > 25,
          'post-action authoritative walk',
        );
      } finally {
        for (const key of keys) await page.keyboard.up(key);
      }
      await wait(
        async () =>
          Math.hypot(
            (await snap(peer)).state.players[h.id].x - h.x,
            (await snap(peer)).state.players[h.id].y - h.y,
          ) < 2,
        'peer transition movement',
      );
    }
    console.log('[finish] group ' + offset + ' idle8 / A4 / all skills x4');
  }
  await page.locator('#game canvas').focus();
  await page.keyboard.press('F8');
  assert.equal((await view()).worldDepth.enabled, false);
  await page
    .locator('#viewport')
    .screenshot({ path: resolve(out, 'finish-off.png') });
  await page.keyboard.press('F8');
  assert.equal((await view()).worldDepth.enabled, true);
  await page
    .locator('#viewport')
    .screenshot({ path: resolve(out, 'finish-on.png') });
  report.status = 'PASS';
  save();
  return report;
}
export async function verifyMovingCombat({ room, pages, out }) {
  const { w, c, heroes, build, reset, place } = fixture(room),
    [page, peer] = pages;
  const report = {
    status: 'RUNNING',
    clients: pages.length,
    creeps: 96,
    runs: [],
  };
  const save = () =>
    writeFileSync(
      resolve(out, 'moving-combat.json'),
      JSON.stringify(report, null, 2),
    );
  const loadouts = [
    'cai_bang_chuong',
    'thien_son_phien',
    'vo_dang_kiem',
    'thieu_lam_dao',
    'con_luan_thien_su',
    'ngu_doc_ta_hiep',
  ];
  heroes.forEach((h, i) =>
    build(
      h,
      actors.find((a) => a.basic === loadouts[i % loadouts.length]),
    ),
  );
  reset();
  place();
  for (let i = 0; i < 96; i++) {
    const e = addCreep(
      w,
      'finish_stress_' + i,
      { x: 450 + (i % 16) * 31, y: 590 + Math.floor(i / 16) * 44 },
      c,
    );
    Object.assign(e, {
      hp: 100000,
      maxHp: 100000,
      controlled: true,
      archetypeId: 'creep_wild_dog',
      fx: i % 2 ? 1 : -1,
      fy: 0,
    });
    e.stats = { ...c.creep, hp: 100000, damage: 0 };
  }
  await page.setViewportSize({ width: 1920, height: 900 });
  for (const p of pages) await p.locator('#game canvas').focus();
  await page.waitForTimeout(700);
  let cdp;
  if (process.env.VOLAM_PROFILE === '1') {
    cdp = await page.context().newCDPSession(page);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
    await cdp.send('Profiler.start');
  }
  for (const enabled of [false, true]) {
    await page.evaluate(
      (enabled) => window.__VOLAM__.reviewWorldDepth(enabled),
      enabled,
    );
    heroes.forEach((h) => {
      h.skillCooldowns = [0, 0, 0, 0, 0];
      h.abilityCooldowns = {};
      h.mana = h.maxMana;
    });
    const before = await page.evaluate(
      () => window.__VOLAM__.snapshot().events.at(-1)?.id ?? 0,
    );
    await page.evaluate((before) => {
      window.__stressEnd = false;
      window.__stressSamples = [];
      window.__stressCasts = new Set();
      let old;
      const api = window.__VOLAM__;
      const frame = (renderer) => {
        if (window.__stressEnd) return;
        const now = performance.now(),
          scene = renderer.game.scene.getScene('Arena'),
          s = api.snapshot(),
          p = s.state.players[s.sessionId],
          sprite = scene.children.getByName('actor:' + s.sessionId);
        for (const e of s.events)
          if (e.kind === 'cast' && e.id > before)
            window.__stressCasts.add(e.id);
        if (old && sprite)
          window.__stressSamples.push({
            dt: now - old,
            x: sprite.x,
            y: sprite.y,
            sx: p.x,
            sy: p.y,
            until: p.actionUntil,
            startedAt: p.actionStartedAt,
            tick: s.state.tick,
            pose: p.pose,
          });
        old = now;
        api.afterRender(frame);
      };
      api.afterRender(frame);
    }, before);
    let peak = 0,
      casts = 0;
    const start = performance.now();
    for (let burst = 0; burst < 5; burst++) {
      const arrow = burst % 2 ? 'ArrowLeft' : 'ArrowRight';
      await page.keyboard.down(arrow);
      try {
        const key = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT'][burst];
        for (const p of pages) await p.keyboard.press(key, { delay: 20 });
        await page.waitForTimeout(1250);
        const v = await page.evaluate(() => window.__VOLAM__.presentation());
        peak = Math.max(peak, v.worldDepth.lights.length);
      } finally {
        await page.keyboard.up(arrow);
      }
    }
    const samples = await page.evaluate(() => {
        window.__stressEnd = true;
        return window.__stressSamples;
      }),
      s = await page.evaluate(() => window.__VOLAM__.snapshot()),
      v = await page.evaluate(() => window.__VOLAM__.presentation());
    casts = await page.evaluate(() => window.__stressCasts.size);
    const dt = samples.map((x) => x.dt).sort((a, b) => a - b),
      walk = samples.filter((x) => x.pose === 'walk'),
      lag = walk
        .map((x) => Math.hypot(x.x - x.sx, x.y - x.sy))
        .sort((a, b) => a - b);
    const damage = v.damage;
    const entry = {
      enabled,
      damageTextureCache: damage?.textureCache,
      seconds: (performance.now() - start) / 1000,
      samples: samples.length,
      median: dt[Math.floor(dt.length * 0.5)],
      p95: dt[Math.floor(dt.length * 0.95)],
      max: dt.at(-1),
      above50ms: dt.filter((x) => x > 50).length,
      acceptedCasts: casts,
      walkSamples: walk.length,
      walkRenderLagP95: lag[Math.floor(lag.length * 0.95)],
      peakLights: peak,
      shadows: v.worldDepth.expandedShadows,
      totalDynamicCasts:
        v.worldDepth.expandedShadows.actors.filter(
          (a) => a.cast && a.kind !== 'prop',
        ).length + v.worldDepth.actors.filter((a) => a.visible).length,
      raw: samples,
    };
    report.runs.push(entry);
    save();
    assert.ok(casts >= 10, 'real multi-client skill casts');
    assert.ok(walk.length > 20, 'moving during combat');
    assert.ok(entry.shadows.bytes <= entry.shadows.maxBytes);
    assert.ok(entry.shadows.cached <= 128);
    assert.ok(entry.shadows.actors.filter((a) => a.cast).length <= 64);
    assert.ok(
      entry.totalDynamicCasts <= 64,
      'dogs share the total dynamic-shadow budget',
    );
    if (enabled)
      assert.ok(
        entry.shadows.actors.filter(
          (a) => a.id.startsWith('finish_stress_') && a.visible,
        ).length >= 80,
        'dogs use bounded renderer',
      );
    assert.equal(entry.shadows.clipped, 0);
    assert.ok(peak <= 16);
    await page.locator('#viewport').screenshot({
      path: resolve(
        out,
        enabled ? 'moving-combat-on.png' : 'moving-combat-off.png',
      ),
    });
  }
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
  report.edgeAudit = edgeAudit;
  assert.ok(edgeAudit.checked > 0);
  assert.equal(edgeAudit.clipped, 0);
  const h = heroes[0];
  await waitForQa(async () => {
    const s = await peer.evaluate(() => window.__VOLAM__.snapshot());
    return Math.abs(s.state.players[h.id].x - h.x) < 2;
  }, 'stress peer movement');
  if (cdp) {
    const { profile } = await cdp.send('Profiler.stop');
    writeFileSync(resolve(out, 'cpu-profile.json'), JSON.stringify(profile));
    await cdp.detach();
  }
  report.status = 'PASS';
  save();
  console.log(
    '[stress] ' +
      JSON.stringify(report.runs.map(({ raw, shadows, ...r }) => r)),
  );
  return report;
}
export async function verifySpecialModes({ room, pages, out }) {
  const { w, c, heroes, build, reset, place, target } = fixture(room),
    [page, peer] = pages,
    h = heroes[0];
  const view = () => page.evaluate(() => window.__VOLAM__.presentation()),
    snap = () => page.evaluate(() => window.__VOLAM__.snapshot());
  const wait = (fn, label) =>
    waitForQa(fn, label, { timeout: 15000, diagnostics: view });
  const report = { status: 'RUNNING', alternateStance: [], forms: [] };
  const save = () =>
    writeFileSync(
      resolve(out, 'special-modes.json'),
      JSON.stringify(report, null, 2),
    );
  build(
    h,
    actors.find((a) => a.basic === 'thieu_lam_quyen'),
  );
  reset();
  place();
  await wait(
    async () => (await snap()).state.players[h.id]?.basicId === h.basicId,
    'monk build',
  );
  await page.locator('#game canvas').focus();
  await page.keyboard.press('KeyF', { delay: 30 });
  await wait(
    async () => h.skillIds[0] === 'toan_phong_thoai',
    'real F stance acknowledgement',
  );
  for (const [direction, fx, fy] of directions.filter((d) =>
    d[0].includes('_'),
  )) {
    for (const [slot, key] of [
      ['0', 'KeyQ'],
      ['1', 'KeyW'],
      ['2', 'KeyE'],
    ]) {
      reset();
      place();
      Object.assign(h, { fx, fy });
      target(h, fx, fy, 'finish_stance_target');
      await page.waitForTimeout(150);
      const before = (await snap()).events.at(-1)?.id ?? 0,
        ability = h.skillIds[Number(slot)];
      await beginObserve(page, [h.id], 1700, false);
      await page.keyboard.press(key, { delay: 30 });
      const capture = await page.evaluate(() => window.__finishCapture);
      assert.ok(
        capture.events.some(
          (e) =>
            e.id > before &&
            e.sourceId === h.id &&
            e.abilityId === ability &&
            e.kind === 'cast',
        ),
        'alternate real skill ' + ability,
      );
      const frames = [
        ...new Set(
          capture.frames[h.id]
            .filter(
              (s) =>
                s.texture === 'hero-finish:thieu_lam_quyen' &&
                /^(charge|release|recover)_/.test(s.frame),
            )
            .map((s) => s.frame),
        ),
      ];
      assert.ok(frames.length >= 2, 'alternate stance pose changes ' + ability);
      report.alternateStance.push({ direction, ability, frames });
      save();
    }
  }
  reset();
  await page.keyboard.press('KeyF', { delay: 30 });
  await wait(
    async () => h.skillIds[0] === 'la_han_quyen',
    'F returns primary stance',
  );
  for (const spec of [
    {
      basic: 'con_luan_thien_su',
      key: 'KeyT',
      kind: 'con_luan_chaos',
      toggle: false,
    },
    {
      basic: 'duong_mon_co_quan',
      key: 'KeyW',
      kind: 'duong_mon_flight',
      toggle: true,
    },
    {
      basic: 'duong_mon_co_quan',
      key: 'KeyR',
      kind: 'duong_mon_shell',
      toggle: false,
    },
    {
      basic: 'duong_mon_am_khi',
      key: 'KeyE',
      kind: 'duong_mon_evade',
      toggle: false,
    },
  ]) {
    build(
      h,
      actors.find((a) => a.basic === spec.basic),
    );
    reset();
    place();
    Object.assign(h, { fx: 1, fy: 1 });
    target(h, 1, 1, 'finish_mode_target');
    await wait(
      async () => (await snap()).state.players[h.id]?.basicId === h.basicId,
      'mode build',
    );
    await page.locator('#game canvas').focus();
    await page.keyboard.press(spec.key, { delay: 30 });
    await wait(
      async () => h.statuses.some((s) => s.kind === spec.kind),
      'real mode activation ' + spec.kind,
    );
    await beginObserve(page, [h.id], 1300, false);
    await page.keyboard.down('ArrowRight');
    try {
      await page.waitForTimeout(350);
    } finally {
      await page.keyboard.up('ArrowRight');
    }
    const capture = await page.evaluate(() => window.__finishCapture),
      active = capture.frames[h.id].filter((s) =>
        s.statuses.includes(spec.kind),
      );
    assert.ok(active.length > 2, 'observed active form ' + spec.kind);
    assert.ok(
      active.every((s) => !/^hero-(motion|finish):/.test(s.texture)),
      'native form identity retained ' + spec.kind,
    );
    const frames = [...new Set(active.map((s) => s.texture + ':' + s.frame))];
    if (spec.toggle) {
      await page.keyboard.press(spec.key, { delay: 30 });
      await wait(
        async () => !h.statuses.some((s) => s.kind === spec.kind),
        'real flight toggled off',
      );
    } else if (spec.kind !== 'con_luan_chaos') {
      await wait(
        async () => !h.statuses.some((s) => s.kind === spec.kind),
        'natural form expiry ' + spec.kind,
      );
    } else {
      // The long buff keeps normal duration; fixture cleanup ends this visual slice.
      cancelOwnedEffects(w, h.id);
      h.statuses = [];
    }
    await wait(
      async () =>
        (await view()).actors.some(
          (a) => a.id === h.id && /^hero-(finish|motion):/.test(a.texture),
        ),
      'normal body restored ' + spec.kind,
    );
    report.forms.push({
      ...spec,
      frames,
      activeSamples: active.length,
      exit: spec.toggle
        ? 'real toggle'
        : spec.kind === 'con_luan_chaos'
          ? 'explicit fixture cleanup'
          : 'natural expiry',
      facings: 'retained original four-facing special-form art',
    });
    save();
  }
  // Actual repeated authoritative hits retain every number's value and original text styling.
  build(
    h,
    actors.find((a) => a.basic === 'cai_bang_chuong'),
  );
  reset();
  place();
  Object.assign(h, { fx: 1, fy: 0 });
  const e = target(h, 1, 0, 'finish_number_target');
  await page.keyboard.press('KeyQ', { delay: 30 });
  await wait(
    async () => (await view()).damage.active.length > 0,
    'live cached damage number',
  );
  const damage = (await view()).damage;
  for (const n of damage.active) {
    assert.equal(
      n.text,
      `${n.critical ? '✦' : ''}${Number(n.damage.toFixed(2))}`,
    );
    assert.equal(n.color, n.critical ? '#ffc85c' : '#fff4db');
    assert.ok(!n.background);
    assert.equal(n.scrollFactor, 1);
    assert.ok(Math.abs(n.x - n.anchor.x) <= 24);
  }
  assert.ok(e.hp < 100000);
  report.numbers = {
    observed: damage.active,
    textureCache: damage.textureCache,
  };
  await wait(async () => {
    const s = await peer.evaluate(() => window.__VOLAM__.snapshot());
    return s.state.creeps[e.id]?.hp === e.hp;
  }, 'number hit peer HP');
  report.status = 'PASS';
  save();
  return report;
}
export async function verifyFinalArenaProof({ room, pages, out }) {
  const { sim, w, heroes, build, reset } = fixture(room),
    [page] = pages,
    h = heroes[0];
  build(
    h,
    actors.find((a) => a.basic === 'cai_bang_chuong'),
  );
  reset();
  Object.assign(h, { x: 700, y: 660, fx: 1, fy: 1 });
  heroes.slice(1).forEach((h) => Object.assign(h, { x: 1400, y: 1000 }));
  for (const [id, x, y] of [
    ['proof_dog_a', 810, 710],
    ['proof_dog_b', 845, 660],
  ]) {
    const e = addCreep(w, id, { x, y }, sim.arena.config);
    Object.assign(e, {
      archetypeId: 'creep_wild_dog',
      controlled: true,
      hp: 100000,
      maxHp: 100000,
    });
    e.stats = { ...sim.arena.config.creep, hp: 100000, damage: 0 };
  }
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.locator('#game canvas').focus();
  await waitForQa(async () => {
    const s = await page.evaluate(() => window.__VOLAM__.snapshot());
    return s.state.players[h.id]?.basicId === h.basicId;
  }, 'proof build ack');
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    window.__arenaProof = new Promise((resolve, reject) => {
      const api = window.__VOLAM__,
        end = performance.now() + 5000;
      const sample = (renderer) => {
        const s = api.snapshot(),
          a = api.presentation().actors.find((a) => a.id === s.sessionId);
        if (
          a?.texture === 'hero-finish:cai_bang_chuong' &&
          a.frame === 'release_down_right'
        ) {
          renderer.game.scene.getScene('Arena').scene.pause();
          resolve({
            frame: a.frame,
            texture: a.texture,
            event: s.events.find(
              (e) =>
                e.kind === 'cast' &&
                e.abilityId === 'hoa_van_chuong' &&
                e.sourceId === s.sessionId,
            ),
          });
        } else if (performance.now() > end) reject(Error('No real Q release'));
        else api.afterRender(sample);
      };
      api.afterRender(sample);
    });
  });
  await page.keyboard.press('KeyQ', { delay: 30 });
  const proof = await page.evaluate(() => window.__arenaProof);
  assert.ok(proof.event);
  const step = sim.step;
  sim.step = () => {};
  const states = [];
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
      const v = await page.evaluate(() => window.__VOLAM__.presentation());
      states.push({
        enabled,
        zoom: v.zoom,
        actors: v.actors.map((a) => [a.id, a.x, a.y, a.frame]),
        tick: w.tick,
        hp: h.hp,
        mana: h.mana,
        creeps: [...w.creeps].map(([id, e]) => [id, e.hp]),
      });
      await page
        .locator('#viewport')
        .screenshot({ path: resolve(out, 'arena-' + label + '.png') });
    }
    assert.deepEqual({ ...states[0], enabled: true }, states[1]);
  } finally {
    sim.step = step;
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          window.__VOLAM__.afterRender((renderer) => {
            renderer.game.scene.getScene('Arena').scene.resume();
            resolve();
          }),
        ),
    );
  }
  const report = {
    status: 'PASS',
    proof,
    sameRenderedActorsAndServerState: true,
    states,
  };
  writeFileSync(
    resolve(out, 'arena-proof.json'),
    JSON.stringify(report, null, 2),
  );
  return report;
}
