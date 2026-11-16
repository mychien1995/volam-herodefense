import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import {
  BacCaiEncounter,
  VuongEncounter,
  addCreep,
  beginNamDeCast,
  initializeNamDe,
  initializeProgression,
  refreshCharacter,
  spawnNamDeIfReady,
} from '@volam/game-core';
import {
  bacCaiDefinition,
  namDeDefinition,
  vuongDefinition,
} from '@volam/game-data';
import { hurt } from '../../packages/game-core/dist/combat.js';
import { cancelOwnedEffects } from '../../packages/game-core/dist/status.js';

const facings = [
  ['right', 'ArrowRight', 1, 0],
  ['down', 'ArrowDown', 0, 1],
  ['left', 'ArrowLeft', -1, 0],
  ['up', 'ArrowUp', 0, -1],
];
const state = (page) => page.evaluate(() => window.__VOLAM__.snapshot());
const wait = (page, fn, arg) =>
  page
    .waitForFunction(fn, arg, { timeout: 5500, polling: 25 })
    .then(async (handle) => {
      const value = await handle.jsonValue();
      await handle.dispose();
      return value;
    });
// Arm before the server resolves the input. Inspect the same frame Phaser
// submitted and retain only a single PNG when requested.
async function armFrame(page, kind, query, pngPath) {
  await page.evaluate(
    ({ kind, query, png }) => {
      const api = window.__VOLAM__;
      const seen = [];
      let firstCast;
      const observedCleave = new Map();
      let peakSimultaneous = 0;
      let cleaveShot;
      let shotScore = 0;
      window.__m3dFrame = new Promise((resolve) => {
        const deadline = performance.now() + 6500;
        const sample = (renderer) => {
          const v = api.presentation();
          const s = api.snapshot();
          const actor = v.actors.find((b) => b.id === query.actorId);
          const boss = v.renovation.bodies.find(
            (b) => b.id === query.form && b.visible,
          );
          let result;
          if (kind === 'hit') {
            const event = s.events.find(
              (e) => e.kind === 'hit' && e.abilityId === query.ability,
            );
            const effect = v.hitArt.find(
              (h) => h.id === event?.id && h.spark && h.outline,
            );
            const body = query.form ? boss : actor;
            if (event && effect && body) result = { body, effect, event };
          } else if (kind === 'cast') {
            const event = s.events.find(
              (e) =>
                e.id > query.before &&
                e.kind === 'cast' &&
                e.sourceId === query.actorId &&
                e.abilityId === query.ability,
            );
            if (event && actor?.frame === query.contact + '_' + query.direction)
              result = { body: actor, event };
          } else if (kind === 'boss') {
            if (boss?.action?.ability === query.ability) {
              firstCast ??= boss;
              if (boss.action.phase === 'release') result = boss;
            } else if (firstCast) result = firstCast;
          } else if (kind === 'cleave') {
            const scene = renderer.game.scene.scenes.find(
              (candidate) => candidate.hitArt?.contacts,
            );
            const contacts = scene?.hitArt.contacts;
            const rendered = new Set(scene?.cameras.main.renderList);
            const effects = [];
            for (const hit of v.hitArt) {
              if (
                hit.id <= query.before ||
                !query.ids.includes(hit.target) ||
                !hit.outline
              )
                continue;
              const sprite = contacts?.get(hit.id)?.sprite;
              if (sprite?.visible && sprite.alpha > 0 && rendered.has(sprite))
                effects.push({ ...hit, contact: sprite.frame.name });
            }
            // Consecutive messages from one server tick can straddle a render.
            // Check every target's actual sprite plus the shared combat tick.
            for (const effect of effects) observedCleave.set(effect.id, effect);
            peakSimultaneous = Math.max(peakSimultaneous, effects.length);
            if (png && effects.length) {
              const ring = effects.find((effect) => effect.ring)?.ring;
              const score =
                effects.length + (ring ? (ring === 'crack-0' ? 4 : 8) : 0);
              if (score > shotScore) {
                shotScore = score;
                cleaveShot = document
                  .querySelector('#game canvas')
                  .toDataURL('image/png');
              }
            }
            if (observedCleave.size === query.ids.length)
              result = {
                effects: [...observedCleave.values()],
                peakSimultaneous,
                events: s.events.filter(
                  (e) =>
                    e.id > query.before &&
                    query.ids.includes(e.targetId) &&
                    e.kind === 'hit',
                ),
              };
          }
          if (result) {
            const shot =
              kind === 'cleave'
                ? cleaveShot
                : png
                  ? document
                      .querySelector('#game canvas')
                      .toDataURL('image/png')
                  : undefined;
            resolve({ result, png: shot });
            return;
          }
          const frame = [
            actor?.texture,
            actor?.frame,
            boss?.texture,
            boss?.frame,
            boss?.action?.ability,
            boss?.action?.phase,
            ...v.hitArt.map((h) => [h.target, h.spark, h.outline].join(':')),
          ].join(' ');
          if (frame !== seen.at(-1) && seen.length < 50) seen.push(frame);
          if (performance.now() >= deadline)
            resolve({
              failure: { kind, query, seen, events: s.events.slice(-10) },
            });
          else api.afterRender(sample);
        };
        api.afterRender(sample);
      });
    },
    { kind, query, png: !!pngPath },
  );
  return async () => {
    const value = await page.evaluate(() => window.__m3dFrame);
    assert(!value.failure, JSON.stringify(value.failure));
    if (value.png && pngPath)
      writeFileSync(pngPath, Buffer.from(value.png.split(',')[1], 'base64'));
    return value.result;
  };
}
const validSprite = (b, texture, frame) =>
  b.texture === texture && b.frame.includes(frame);

export async function verifyM3dHitContinuity({ room, pages, out, report }) {
  const [page] = pages;
  const peer = pages[2] ?? pages[1];
  const { simulation: sim } = room;
  let w = room.world;
  let c = sim.arena.config;
  const heroId = (await state(page)).sessionId;
  const verify = {
    players: report.players,
    development: report.development,
    protocol: report.protocol,
    zoom: await page.evaluate(() => window.__VOLAM__.presentation().zoom),
    fixture:
      'Normal room and Phaser. Server fixtures select encounter, positions and legal skill loadout. Keyboard casts, encounter release and hurt use authoritative combat.',
    heroes: [],
    bosses: [],
    impacts: [],
    bossFailures: [],
  };
  const save = () =>
    writeFileSync(
      resolve(out, 'observations.json'),
      JSON.stringify(verify, null, 2) + '\n',
    );
  const hero = () => w.heroes.get(heroId);
  const actionOf = (a) => {
    a.statuses = [];
    a.pose = 'idle';
    a.hurtUntil = 0;
    a.castAbilityId = '';
    a.actionUntil = 0;
    a.cooldown = w.tick + 100000;
  };
  const setBuild = (basicId, schoolId, skill, fx, fy) => {
    const h = hero();
    cancelOwnedEffects(w, h.id);
    actionOf(h);
    h.schoolId = schoolId;
    room.state.players.get(h.id).schoolId = schoolId;
    h.level = c.maxLevel;
    initializeProgression(h, c, 'custom', basicId);
    if (skill) h.progression.ranks[skill] = 1;
    h.progression.revision++;
    Object.assign(h, {
      x: 580,
      y: 770,
      fx,
      fy,
      moveX: 0,
      moveY: 0,
      cooldown: 0,
      skillIds: [skill, '', '', ''],
      skillCooldowns: [0, 0, 0, 0, 0],
      abilityCooldowns: {},
      basicChains: {},
    });
    refreshCharacter(h, c);
    h.hp = h.maxHp;
    h.mana = h.maxMana;
  };
  const cleanArena = () => {
    w.creeps.clear();
    w.events.length = 0;
    w.shots = [];
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
  };
  const arrange = (actor, fx, fy, distance = 110) => {
    actionOf(actor);
    Object.assign(actor, {
      x: c.width / 2,
      y: c.height * 0.57,
      fx,
      fy,
      hp: actor.maxHp,
    });
    const members = [
      hero(),
      ...[...w.heroes.values()].filter((h) => h.id !== heroId),
    ];
    members.forEach((h, i) => {
      actionOf(h);
      Object.assign(h, {
        x: actor.x + fx * distance - fy * i * 65,
        y: actor.y + fy * distance + fx * i * 65,
        fx: -fx,
        fy: -fy,
        moveX: 0,
        moveY: 0,
        hp: 100000,
        maxHp: 100000,
      });
    });
  };
  const showActor = (tab, actorId, form, direction, pose) =>
    wait(
      tab,
      ({ actorId, form, direction, pose }) => {
        const v = window.__VOLAM__.presentation();
        const a = form
          ? v.renovation.bodies.find(
              (b) =>
                b.id === form &&
                b.visible &&
                (!direction || b.direction === direction),
            )
          : v.actors.find((b) => b.id === actorId);
        return (
          a &&
          (!pose || a.pose === pose || String(a.frame).startsWith(pose)) &&
          (!direction || String(a.frame).includes(direction)) &&
          a
        );
      },
      { actorId, form, direction, pose },
    );
  const hitFrame = async (actorId, form, hit, image) => {
    const read = await armFrame(
      page,
      'hit',
      { actorId, form, ability: hit.ability },
      image && resolve(out, image + '.png'),
    );
    hit.schedule();
    return read();
  };
  const press = async (key) => {
    await page.bringToFront();
    await page.locator('#game canvas').focus();
    await page.keyboard.press(key, { delay: 36 });
  };
  let hitCount = 0;
  const onlyHit = (actor, source = 'fixture_attacker') => {
    const ability = 'fixture_resolved_strike_' + ++hitCount;
    const step = sim.step;
    const zoneId = sim.zoneOf(heroId).id;
    // Resolve the hit on the next fixed tick and let MatchRoom assign the
    // network event ID and broadcast it through the normal zone filter.
    return {
      ability,
      schedule() {
        sim.step = function (now) {
          sim.step = step;
          step.call(sim, now);
          const start = w.events.length;
          const accepted = hurt(w, actor, source, ability, 37, c, {
            critChance: 0,
            critMultiplier: 1,
          });
          verify.lastFixture = {
            accepted,
            hp: actor.hp,
            zoneId,
            events: w.events.slice(start),
          };
          for (const event of w.events.slice(start))
            sim.events.push({ zoneId, event });
        };
      },
    };
  };
  const eventCursor = async () => (await state(page)).events.at(-1)?.id ?? 0;

  try {
    cleanArena();
    await page.bringToFront();
    const bossOnly =
      report.development && process.env.VOLAM_QA_HIT_BOSSES_ONLY === '1';
    if (!bossOnly) {
      for (const [direction, key, fx, fy] of facings) {
        setBuild('thieu_lam_dao', 'thieu_lam', '', fx, fy);
        await showActor(page, heroId, undefined, direction, 'idle');
        await page.locator('#game canvas').focus();
        await page.keyboard.down(key);
        const walk = await showActor(
          page,
          heroId,
          undefined,
          direction,
          'walk',
        );
        await page.keyboard.up(key);
        const idle = await showActor(
          page,
          heroId,
          undefined,
          direction,
          'idle',
        );
        const received = await hitFrame(
          heroId,
          undefined,
          onlyHit(hero()),
          direction === 'right' ? 'thieu-lam-dao-hit' : undefined,
        );
        for (const b of [walk, idle, received.body])
          assert(
            validSprite(b, 'shaolin-dao-review', direction),
            JSON.stringify(b),
          );
        assert.equal(received.body.frame, 'idle_' + direction);
        const casts = [];
        for (const [ability, contact] of [
          ['kim_quang_ho_tran', 'lotus'],
          ['bat_dong_minh_vuong', 'lotus'],
          ['tam_gioi_quy_thien', 'strike'],
        ]) {
          setBuild('thieu_lam_dao', 'thieu_lam', ability, fx, fy);
          const subject = addCreep(
            w,
            'dao_aim',
            { x: 580 + 80 * fx, y: 770 + 80 * fy },
            c,
          );
          Object.assign(subject, {
            archetypeId: 'creep_bandit_grunt',
            controlled: true,
            hp: 50000,
            maxHp: 50000,
          });
          const before = await eventCursor();
          await wait(
            page,
            ({ heroId, ability }) => {
              const h = window.__VOLAM__.snapshot().state.players[heroId];
              return h.pose === 'idle' && h.qSkill === ability;
            },
            { heroId, ability },
          );
          const rendered = await armFrame(
            page,
            'cast',
            { actorId: heroId, ability, contact, direction, before },
            direction === 'right' && ability === 'kim_quang_ho_tran'
              ? resolve(out, 'thieu-lam-dao-cast.png')
              : undefined,
          );
          await press('q');
          const shown = await rendered();
          assert.equal(shown.body.texture, 'shaolin-dao-review');
          casts.push({
            ability,
            body: shown.body.frame,
            event: shown.event.id,
          });
          w.creeps.delete(subject.id);
        }
        verify.heroes.push({
          direction,
          hit: received,
          walk: walk.frame,
          casts,
        });
        save();
      }

      for (const critical of [false, true]) {
        setBuild('cai_bang_bong', 'cai_bang', '', 1, 0);
        const ids = [];
        for (const [i, dx, dy] of [
          [0, 52, 0],
          [1, 76, -19],
          [2, 76, 19],
        ]) {
          const enemy = addCreep(
            w,
            'impact_' + i,
            { x: 580 + dx, y: 770 + dy },
            c,
          );
          Object.assign(enemy, {
            archetypeId: 'creep_bandit_grunt',
            controlled: true,
            hp: 50000,
            maxHp: 50000,
          });
          ids.push(enemy.id);
        }
        await wait(
          page,
          ({ heroId, ids }) => {
            const s = window.__VOLAM__.snapshot();
            return (
              s.state.players[heroId].basicId === 'cai_bang_bong' &&
              ids.every((id) => s.state.creeps[id])
            );
          },
          { heroId, ids },
        );
        const previous = w.random;
        const before = await eventCursor();
        w.random = () => (critical ? 0 : 0.99);
        try {
          const [localReady, peerReady] = await Promise.all([
            armFrame(
              page,
              'cleave',
              { ids, before, critical },
              resolve(
                out,
                critical ? 'critical-cleave.png' : 'normal-cleave.png',
              ),
            ),
            armFrame(peer, 'cleave', { ids, before }),
          ]);
          await press('a');
          const [local, remote] = await Promise.all([
            localReady(),
            peerReady(),
          ]);
          assert.deepEqual(local.events, remote.events);
          for (const data of [local, remote]) {
            assert.equal(data.events.length, 3);
            assert.equal(new Set(data.events.map((e) => e.tick)).size, 1);
            assert(data.events.every((e) => e.critical === critical));
            assert(data.events.every((e) => e.hitPhase === 'thrust'));
            assert(
              data.effects.every((e) =>
                /^staff-point-(peak|break|embers)$/.test(e.contact),
              ),
            );
            assert.equal(
              data.effects.filter((e) => e.ring).length,
              critical ? 1 : 0,
            );
            const primary = data.events.find((e) => !e.hitIndex);
            if (critical)
              assert(
                data.effects.find((e) => e.target === primary.targetId).ring,
              );
          }
          verify.impacts.push({ critical, local, remote });
          await wait(
            page,
            (before) =>
              !window.__VOLAM__
                .presentation()
                .hitArt.some((e) => e.id > before),
            before,
          );
        } finally {
          w.random = previous;
        }
        for (const id of ids) w.creeps.delete(id);
        save();
      }
    }

    const boss = async (form, actor, reset, cast, ability) => {
      for (const [direction, , fx, fy] of facings) {
        const current = { form, direction, ability, id: actor.id };
        verify.currentBoss = current;
        try {
          reset();
          const distance = form === 'ly_mac_sau' ? 65 : 110;
          arrange(actor, fx, fy, distance);
          // A newly activated chapter can recall its players on the first tick.
          await showActor(page, actor.id, form);
          arrange(actor, fx, fy, distance);
          if (form === 'kim_luan') {
            // Hold the pre-hit facing while the moving boss would run across the target.
            actor.statuses = [
              {
                kind: 'stun',
                until: w.tick + 300,
                magnitude: 1,
                abilityId: 'fixture_hold_facing',
                sourceId: heroId,
              },
            ];
          }
          const before = await showActor(page, actor.id, form, direction);
          assert.equal(before.texture, 'renovated-' + form);
          const actualId =
            w === room.world
              ? actor.id
              : sim.zoneOf(heroId).id + ':' + actor.id;
          const received = await hitFrame(
            actualId,
            form,
            onlyHit(actor, heroId),
          );
          assert(
            validSprite(
              received.body,
              'renovated-' + form,
              '_' + direction + '_',
            ),
            JSON.stringify(received),
          );
          await showActor(page, actor.id, form, direction);
          const ready = await armFrame(
            page,
            'boss',
            { form, ability },
            direction === 'right' && ['dong_ta', 'ly_mac_sau'].includes(form)
              ? resolve(out, form + '-cast.png')
              : undefined,
          );
          if (form === 'kim_luan') arrange(actor, fx, fy, distance);
          cast(hero());
          const shown = await ready();
          assert.equal(shown.texture, 'renovated-action-' + form + '_actions');
          assert(
            String(shown.frame).startsWith(direction + '_'),
            JSON.stringify(shown),
          );
          assert.deepEqual(shown.origin, [0.5, 0.8]);
          assert.deepEqual(shown.scale, [0.5, 0.5]);
          verify.bosses.push({
            form,
            direction,
            ability,
            idle: before.frame,
            hit: received,
            cast: {
              phase: shown.action.phase,
              texture: shown.texture,
              frame: shown.frame,
              source: shown.source,
              origin: shown.origin,
            },
          });
        } catch (error) {
          const context = await page.evaluate(() => {
            const api = window.__VOLAM__,
              p = api.presentation(),
              s = api.snapshot();
            return {
              forms: p.renovation.bodies
                .filter((b) => b.visible)
                .map(({ id, pose, direction, frame, texture }) => ({
                  id,
                  pose,
                  direction,
                  frame,
                  texture,
                })),
              zone: p.zoneId,
              tayDoc: p.tayDoc?.phase,
              chu: p.chu?.phase,
              actors: Object.values(s.state.creeps)
                .slice(0, 10)
                .map(({ archetypeId, hp, pose, fx, fy }) => ({
                  archetypeId,
                  hp,
                  pose,
                  fx,
                  fy,
                })),
            };
          });
          verify.bossFailures.push({
            ...current,
            error: String(error),
            ...context,
          });
          console.warn(
            'M3D directional match failure: ' + form + ' ' + direction,
          );
        }
        save();
      }
      console.info('M3D directional match checks: ' + form);
    };

    cleanArena();
    const dong = sim.dongTa;
    dong.phase = 'fighting';
    dong.summoned = true;
    dong.spawn(w, c, 'dong_ta', { x: 700, y: 600 });
    await boss(
      'dong_ta',
      w.creeps.get('dong_ta'),
      () => {
        dong.casts = [];
        dong.effects = [];
      },
      (h) => assert(dong.beginCast(w, c, 'dong_ta', 'dan_chi_than_cong', h.id)),
      'dan_chi_than_cong',
    );

    cleanArena();
    const tay = sim.tayDoc;
    assert(tay.spawn(w, c));
    for (const [form, phase, ability] of [
      ['tay_doc', 'phase1', 'tay_doc_staff'],
      ['tay_doc_cap_mo', 'phase2', 'ngu_doc_than_chuong'],
    ]) {
      await boss(
        form,
        w.creeps.get(tay.bossId),
        () => {
          tay.phase = phase;
          tay.cast = undefined;
          tay.nextActionAt = w.tick + 100000;
          tay.pools.clear();
          tay.pillars.clear();
          tay.projectiles.clear();
        },
        (h) => assert(tay.begin(w, c, ability, h)),
        ability,
      );
    }

    cleanArena();
    initializeNamDe(w, c, namDeDefinition);
    w.namDe.phase = 'rest';
    w.namDe.spawnAt = 0;
    spawnNamDeIfReady(w, c, w.tick);
    w.namDe.phase = 'combat';
    await boss(
      'nam_de',
      w.creeps.get('boss_nam_de'),
      () => {
        const s = w.namDe;
        s.cast = s.smallCast = undefined;
        s.effects.clear();
        s.nextActionAt = s.nextSmallAt = w.tick + 100000;
      },
      (h) => assert(beginNamDeCast(w, c, 'nhat_duong_chi', h.id)),
      'nhat_duong_chi',
    );

    cleanArena();
    const bac = new BacCaiEncounter(bacCaiDefinition);
    bac.initialize(w, c);
    bac.phase = 'combat';
    sim.mainBosses.encounter = bac;
    await boss(
      'bac_cai',
      w.creeps.get(bac.bossId),
      () => {
        bac.cast = undefined;
        bac.forms = [];
        bac.effects.clear();
        bac.nextAction = w.tick + 100000;
      },
      (h) => assert(bac.begin(w, c, 'palms', h)),
      'palms',
    );

    cleanArena();
    const vuong = new VuongEncounter(vuongDefinition);
    vuong.initialize(w, c);
    for (const [phase, ability] of [
      [1, 'slash'],
      [2, 'pulse'],
    ]) {
      const actor = w.creeps.get(vuong.bossId);
      await boss(
        'vuong_trung_duong_p' + phase,
        actor,
        () => {
          vuong.phase = phase;
          vuong.action = undefined;
          vuong.hazards = [];
          vuong.nextHazard =
            vuong.nextSpecial =
            vuong.nextFinger =
              w.tick + 100000;
          vuong.releasedAt = w.tick - 100;
          vuong.nextAction = w.tick + 100000;
        },
        (h) => vuong.start(w, c, actor, ability, h, [...w.heroes.values()]),
        ability,
      );
    }

    cleanArena();
    for (const destination of [
      'chu_ba_thong',
      'hong_liet',
      'kim_luan',
      'co_mo',
    ]) {
      for (const id of sim.membership.keys()) {
        const z = sim.zoneOf(id),
          h = sim.hero(id);
        h.hp = h.maxHp;
        if (z.id !== 'arena') {
          Object.assign(h, z.dungeon.exit);
          assert.equal(sim.exit(id), undefined);
        }
        assert.equal(sim.enter(id, 'shared', destination), undefined);
      }
      const zone = sim.zoneOf(heroId);
      w = zone.world;
      c = zone.config;
      await wait(
        page,
        (id) => window.__VOLAM__.presentation().zoneId === id,
        zone.id,
      );
      if (destination === 'chu_ba_thong') {
        const s = w.chu;
        await boss(
          destination,
          w.creeps.get(destination),
          () => {
            s.phase = 'idle';
            s.until = w.tick + 100000;
            s.nextBasicAt = w.tick + 100000;
          },
          () => {
            s.phaseIndex =
              s.definition.phases.findIndex((p) => p.id === 'palm') - 1;
            s.until = w.tick;
            s.nextBasicAt = w.tick;
          },
          'palm',
        );
      } else if (destination === 'hong_liet') {
        const e = zone.encounter;
        await boss(
          'hoan_nhan_hong_liet',
          w.creeps.get(e.bossId),
          () => {
            e.cast = undefined;
            e.effects.clear();
            e.nextActionAt = w.tick + 100000;
          },
          (h) => e.begin(w, c, 'hong_liet_a2', h),
          'hong_liet_a2',
        );
      } else if (destination === 'kim_luan') {
        const e = zone.kim,
          id = 'kim_luan_phap_vuong';
        e.spawn(w, c, id);
        await boss(
          destination,
          w.creeps.get(id),
          () => {
            e.casts.clear();
            e.effects.clear();
            e.next = new Map(
              [...w.creeps.keys()].map((id) => [id, w.tick + 100000]),
            );
          },
          (h) => e.begin(w, c, id, 'kim_sweep', h),
          'kim_sweep',
        );
      } else {
        const b = w.boss,
          id = b.actorId;
        await boss(
          'ly_mac_sau',
          w.creeps.get(id),
          () => {
            b.cast = undefined;
            b.cooldowns = {};
            b.nextActionAt = w.tick + 100000;
          },
          () => {
            b.rotation = c.bossEncounter.rotation.indexOf('phat_tran_cong');
            b.nextActionAt = w.tick;
          },
          'phat_tran_cong',
        );
      }
    }
    if (!bossOnly) {
      assert.equal(verify.heroes.length, 4);
      assert.equal(verify.impacts.length, 2);
    }
    assert.deepEqual(
      verify.bossFailures.map(({ form, direction }) => form + '/' + direction),
      [],
    );
    assert.equal(verify.bosses.length, 44);
    delete verify.currentBoss;
    delete verify.lastFixture;
    verify.status = 'PASS';
  } catch (error) {
    verify.failure = {
      message: String(error),
      events: (await state(page)).events.slice(-10),
      presentation: await page.evaluate((id) => {
        const v = window.__VOLAM__.presentation();
        return {
          hero: v.actors.find((a) => a.id === id),
          effects: v.hitArt,
          bodies: v.renovation.bodies.filter((b) => b.visible),
          boss: { tayDoc: v.tayDoc?.phase, chu: v.chu?.phase },
          zone: v.zoneId,
          zoom: v.zoom,
        };
      }, heroId),
    };
    throw error;
  } finally {
    save();
  }
}
