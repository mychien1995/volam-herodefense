import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  initializeProgression,
  refreshCharacter,
  addCreep,
} from '@volam/game-core';
import { experienceAtLevel } from '../../packages/game-core/dist/campaign.js';
import { hurt } from '../../packages/game-core/dist/combat.js';
import {
  cancelOwnedEffects,
  applyStatus,
} from '../../packages/game-core/dist/status.js';
import { waitForQa } from '../../tools/qa-wait.mjs';
const dirs = [
  ['down', 0, 1, ['ArrowDown']],
  ['down_right', 1, 1, ['ArrowDown', 'ArrowRight']],
  ['right', 1, 0, ['ArrowRight']],
  ['up_right', 1, -1, ['ArrowUp', 'ArrowRight']],
  ['up', 0, -1, ['ArrowUp']],
  ['up_left', -1, -1, ['ArrowUp', 'ArrowLeft']],
  ['left', -1, 0, ['ArrowLeft']],
  ['down_left', -1, 1, ['ArrowDown', 'ArrowLeft']],
];
export async function verifyCoherentChuong({ room, pages, out }, profile = {}) {
  const KEY = profile.texture ?? 'cai-bang-chuong-unified';
  const BASIC = profile.basic ?? 'cai_bang_chuong',
    SCHOOL = profile.school ?? 'cai_bang';
  const pivot = profile.pivot ?? [0.5, 132 / 144];
  const baseline = process.env.VOLAM_CHUONG_STAGE === 'baseline';
  const w = room.world,
    sim = room.simulation,
    c = sim.arena.config,
    page = pages[0];
  const ids = await Promise.all(
      pages.map((p) => p.evaluate(() => window.__VOLAM__.snapshot().sessionId)),
    ),
    heroes = ids.map((id) => w.heroes.get(id));
  const testingDirs = process.env.VOLAM_CHUONG_DIRECTIONS
    ? dirs.filter((d) =>
        process.env.VOLAM_CHUONG_DIRECTIONS.split(',').includes(d[0]),
      )
    : dirs;
  // Read-only QA history of serialized server state: compare a peer patch with its own tick,
  // not with live HP which continues regenerating while six browser contexts are sampled.
  const serverHP = new Map(),
    originalSyncState = room.syncState;
  const tickAuthority = profile.staffChoreography || profile.sameTickAuthority;
  const cleanParty =
    profile.staffChoreography || profile.stationaryPartyTargets;
  if (tickAuthority)
    room.syncState = function (...args) {
      const result = originalSyncState.apply(this, args);
      serverHP.set(
        this.state.tick,
        Object.fromEntries(
          ids.map((id) => [id, this.state.players.get(id)?.hp]),
        ),
      );
      if (serverHP.size > 900) serverHP.delete(serverHP.keys().next().value);
      return result;
    };
  const report = {
    status: 'RUNNING',
    clients: pages.length,
    basic: BASIC,
    partial: !!profile.partial,
    scope: ['locomotion', 'idle-after-T'].includes(
      process.env.VOLAM_CHUONG_STAGE,
    )
      ? 'diagnostic ' + process.env.VOLAM_CHUONG_STAGE
      : ['extras', 'weapon'].includes(process.env.VOLAM_CHUONG_STAGE)
        ? 'authored choreography / swordless lifecycle only'
        : process.env.VOLAM_CHUONG_STAGE === 'party'
          ? 'party, F8, portrait only'
          : process.env.VOLAM_CHUONG_STAGE === 'reactions'
            ? 'reactions, natural arena respawn, F8, party'
            : 'all',
    idle: [],
    walk: [],
    actions: [],
    reactions: [],
    authority: [],
    notes: [
      'Profile-scoped body art only. Status and hit fixtures are server-owned, body clocks never send combat commands.',
    ],
  };
  mkdirSync(out, { recursive: true });
  const save = () =>
    writeFileSync(
      resolve(out, 'verification.json'),
      JSON.stringify(report, null, 2),
    );
  const read = async (p = page) =>
    p.evaluate(() => window.__VOLAM__.snapshot());
  const wait = (fn, label) => waitForQa(fn, label, { timeout: 15000 });
  const reset = (direction) => {
    w.creeps.clear();
    w.actions = [];
    w.shots = [];
    w.projectiles.clear();
    w.areas = [];
    w.combos = [];
    heroes.forEach((h, i) => {
      sim.respawns.delete(h.id);
      cancelOwnedEffects(w, h.id);
      h.statuses = [];
      h.nguDocSummons = [];
      h.actionUntil = 0;
      h.cooldown = 0;
      h.hurtUntil = 0;
      h.abilityCooldowns = {};
      if (profile.voDangChoreography || profile.resetChargeCooldowns)
        h.chargeCooldowns = {};
      h.skillCooldowns = [0, 0, 0, 0, 0];
      h.mana = h.maxMana;
      h.hp = h.maxHp;
      h.pose = 'idle';
      h.invulnerable = true;
      delete h.moveDestination;
      Object.assign(h, {
        x: 700 + (i % 3) * 170,
        y: 660 + Math.floor(i / 3) * 170,
        moveX: 0,
        moveY: 0,
        fx: direction[1],
        fy: direction[2],
      });
    });
  };
  heroes.forEach((h) => {
    h.schoolId = SCHOOL;
    room.state.players.get(h.id).schoolId = SCHOOL;
    h.level = 30;
    h.xp = experienceAtLevel(30, c);
    initializeProgression(h, c, 'fixed', BASIC);
    h.progression.ranks = Object.fromEntries(
      h.progression.defaultSkills.map((id) => [id, 4]),
    );
    h.progression.revision++;
    h.skillIds = [...h.progression.defaultSkills];
    refreshCharacter(h, c);
  });
  sim.invasion.nextWaveTick = w.tick + 100000;
  const settle = async () =>
    wait(async () => {
      const s = await read();
      const bodies = await page.evaluate(
        () => window.__VOLAM__.presentation().actors,
      );
      return heroes.every(
        (h) =>
          s.state.players[h.id]?.basicId === BASIC &&
          bodies.some(
            (b) =>
              b.id === h.id &&
              b.texture === KEY &&
              (!profile.settleIdle ||
                (s.state.players[h.id]?.pose === 'idle' &&
                  b.alpha === 1 &&
                  String(b.frame).startsWith('idle_'))) &&
              Math.abs(b.x - h.x) < 2 &&
              Math.abs(b.y - h.y) < 2,
          ),
      );
    }, 'coherent body and server placement');
  const observe = async (
    ms,
    input = async () => {},
    captureLabels = [],
    minSceneMs = 0,
  ) => {
    await page.evaluate(
      ({ ids, captureLabels, baseline, minSceneMs, durationMs }) => {
        const api = window.__VOLAM__;
        window.__chuongDeadline = Infinity;
        window.__chuongCapture = new Promise((resolve) => {
          const frames = Object.fromEntries(ids.map((id) => [id, []])),
            events = new Map(),
            pngs = {},
            ticks = [];
          let firstSceneAt, firstWallAt;
          const sample = (renderer) => {
            const snap = api.snapshot(),
              scene = renderer.game.scene.getScene('Arena');
            firstSceneAt ??= scene.time.now;
            firstWallAt ??= performance.now();
            ticks.push(performance.now());
            for (const e of snap.events) events.set(e.id, e);
            for (const id of ids) {
              const b = scene.children.getByName('actor:' + id),
                h = snap.state.players[id];
              if (!b || !h) continue;
              frames[id].push({
                texture: b.texture.key,
                frame: String(b.frame.name),
                alpha: b.alpha,
                scale: [b.scaleX, b.scaleY],
                origin: [b.originX, b.originY],
                tint: b.tintTopLeft,
                facing:
                  b.getData('hero-motion-direction') ??
                  b.getData('renovation')?.direction,
                phase: b.getData('unified-body-phase') ?? '',
                basicStage: h.basicStage,
                statuses: JSON.parse(h.statuses || '[]').map((s) => s.kind),
                x: b.x,
                y: b.y,
                hp: h.hp,
                pose: h.pose,
                ability: h.castAbilityId,
                tick: snap.state.tick,
                sceneNow: scene.time.now,
              });
              if (baseline && id === ids[0]) {
                const name =
                  'before-' + b.texture.key.replace(/[^a-z0-9_-]/gi, '_');
                if (!pngs[name])
                  pngs[name] = renderer.game.canvas.toDataURL('image/png');
              }
              if (id === ids[0])
                for (const item of captureLabels) {
                  const label = typeof item === 'string' ? item : item.name,
                    prefix =
                      typeof item === 'string'
                        ? item === 'idle'
                          ? 'idle_'
                          : item
                        : item.prefix;
                  if (!pngs[label] && String(b.frame.name).startsWith(prefix))
                    pngs[label] = renderer.game.canvas.toDataURL('image/png');
                }
            }
            if (
              (performance.now() >= window.__chuongDeadline &&
                scene.time.now - firstSceneAt >= minSceneMs) ||
              performance.now() - firstWallAt > durationMs + 10000
            )
              resolve({
                frames,
                events: [...events.values()],
                pngs,
                ticks,
                sceneElapsedMs: scene.time.now - firstSceneAt,
              });
            else api.afterRender(sample);
          };
          api.afterRender(sample);
        });
      },
      { ids, captureLabels, baseline, minSceneMs, durationMs: ms },
    );
    await input();
    await page.evaluate((ms) => {
      window.__chuongDeadline = performance.now() + ms;
    }, ms);
    const capture = await page.evaluate(() => window.__chuongCapture);
    assert.ok(
      capture.sceneElapsedMs >= minSceneMs,
      'observed a complete render-clock cycle',
    );
    for (const [label, png] of Object.entries(capture.pngs))
      writeFileSync(
        resolve(out, label + '.png'),
        Buffer.from(png.split(',')[1], 'base64'),
      );
    return capture;
  };
  const coherent = (cap, label) => {
    for (const id of ids) {
      assert.ok(cap.frames[id].length > 2, label + ' samples');
      for (const f of cap.frames[id]) {
        if (profile.partial && f.facing !== 'down_right') {
          report.partialTransitionFrames =
            (report.partialTransitionFrames ?? 0) + 1;
          continue;
        } // incomplete facings exist only in the one-direction production gate
        assert.equal(f.texture, KEY, label + ' source');
        const scale = profile.expectedScale?.(f) ?? 0.5;
        assert.deepEqual(f.scale, [scale, scale], label + ' scale');
        assert.deepEqual(f.origin, pivot, label + ' pivot');
      }
    }
  };
  const target = (h, d, name, range = 48) => {
    const n = Math.hypot(d[1], d[2]),
      e = addCreep(
        w,
        name,
        { x: h.x + (d[1] / n) * range, y: h.y + (d[2] / n) * range },
        c,
      );
    Object.assign(e, {
      controlled: true,
      hp: 100000,
      maxHp: 100000,
      archetypeId: 'creep_wild_dog',
    });
    e.stats = { ...c.creep, hp: 100000, damage: 0 };
    return e;
  };
  const keys = async (key) => {
    for (const p of pages) {
      await p.locator('#game canvas').focus();
      await p.keyboard.press(key, { delay: 28 });
    }
  };
  try {
    if (baseline) {
      reset(dirs[2]);
      await wait(async () => {
        const s = await read();
        return heroes.every((h) => s.state.players[h.id]?.basicId === BASIC);
      }, 'baseline build ack');
      const idle = await observe(2850);
      heroes.forEach((h, i) => target(h, dirs[2], 'baseline_target_' + i));
      const action = await observe(1500, () => keys('KeyA'));
      const textures = [
        ...new Set(
          [...idle.frames[ids[0]], ...action.frames[ids[0]]].map(
            (f) => f.texture,
          ),
        ),
      ];
      report.sourceMix = {
        textures,
        idle: idle.frames[ids[0]],
        action: action.frames[ids[0]],
      };
      save();
      assert.deepEqual(
        textures,
        [KEY],
        'one canonical body through idle and A',
      );
      return report;
    }
    if (
      profile.staffChoreography &&
      !profile.partial &&
      !['reactions', 'party'].includes(process.env.VOLAM_CHUONG_STAGE)
    ) {
      reset(dirs[2]);
      heroes.forEach((h) => (h.basicChains = {}));
      heroes.forEach((h, i) => target(h, dirs[2], 'four_beat_target_' + i));
      await settle();
      report.staffCombo = [];
      for (const [stage, pose] of [
        ['thrust', 'thrust'],
        ['sweep', 'sweep'],
        ['lift', 'rising'],
        ['smash', 'overhead'],
      ]) {
        await wait(
          () => heroes.every((h) => w.tick >= h.cooldown),
          'real A cadence',
        );
        const before = (await read()).events.at(-1)?.id ?? 0;
        const cap = await observe(360, () => keys('KeyA'), [
          { name: 'combo-' + pose, prefix: pose + '_' },
        ]);
        coherent(cap, 'four-beat ' + stage);
        for (const id of ids) {
          assert.ok(
            cap.events.some(
              (e) =>
                e.id > before &&
                e.sourceId === id &&
                e.abilityId === BASIC &&
                e.kind === 'attack' &&
                e.stage === stage,
            ),
            'accepted A ' + stage,
          );
          assert.ok(
            cap.frames[id].some((f) => f.frame === pose + '_right'),
            'authored A contact ' + stage,
          );
        }
        report.staffCombo.push({
          stage,
          pose,
          events: cap.events.filter(
            (e) => e.id > before && e.kind === 'attack',
          ),
          frames: [...new Set(cap.frames[ids[0]].map((f) => f.frame))],
        });
        save();
      }
    }
    for (const d of ['reactions', 'party', 'extras', 'weapon'].includes(
      process.env.VOLAM_CHUONG_STAGE,
    )
      ? []
      : testingDirs) {
      reset(d);
      await settle();
      const idle = await observe(
        2850,
        undefined,
        d[0] === 'down_right'
          ? ['idle']
          : d[0] === 'right'
            ? [{ name: 'idle-right', prefix: 'idle_' }]
            : [],
        2800,
      );
      coherent(idle, 'idle ' + d[0]);
      const fs = [...new Set(idle.frames[ids[0]].map((f) => f.frame))];
      if (![0, 1, 2, 3].every((i) => fs.includes(`idle_${i}_${d[0]}`))) {
        report.idleFailure = {
          direction: d[0],
          names: fs,
          frames: idle.frames[ids[0]],
          ticks: idle.ticks,
        };
        save();
      }
      for (let i = 0; i < 4; i++)
        assert.ok(
          fs.includes(`idle_${i}_${d[0]}`),
          'idle distinct cel ' + d[0] + '/' + i,
        );
      for (const f of idle.frames[ids[0]])
        assert.equal(f.alpha, 1, 'idle never fades');
      report.idle.push({
        direction: d[0],
        frames: fs,
        alpha: 1,
        renderElapsedMs:
          idle.frames[ids[0]].at(-1).sceneNow - idle.frames[ids[0]][0].sceneNow,
        wallElapsedMs: idle.ticks.at(-1) - idle.ticks[0],
      });
      const start = heroes[0].x + heroes[0].y;
      const walk = await observe(480, async () => {
        await page.locator('#game canvas').focus();
        for (const k of d[3]) await page.keyboard.down(k);
      });
      for (const k of d[3]) await page.keyboard.up(k);
      coherent(walk, 'walk ' + d[0]);
      const gait = [
        ...new Set(
          walk.frames[ids[0]]
            .filter((f) => f.frame.startsWith('walk_'))
            .map((f) => f.frame),
        ),
      ];
      assert.ok(gait.length >= 3, 'authored gait ' + d[0]);
      await wait(async () => {
        const p = (await read(pages[1])).state.players[ids[0]];
        return Math.hypot(p.x - heroes[0].x, p.y - heroes[0].y) < 2;
      }, 'peer walk synchronization');
      report.walk.push({ direction: d[0], frames: gait });
      save();
      for (const key of (process.env.VOLAM_CHUONG_STAGE === 'locomotion'
        ? []
        : process.env.VOLAM_CHUONG_STAGE === 'idle-after-T'
          ? ['KeyT']
          : profile.keys) ??
        (profile.partial
          ? ['KeyA']
          : ['KeyA', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT'])) {
        reset(d);
        const targets = heroes.map((h, i) =>
          target(h, d, 'coherent_target_' + i),
        );
        await settle();
        if (profile.prepareKey) {
          await profile.prepareKey({ key, keys, wait, heroes, w });
          await settle();
        }
        const before = (await read()).events.at(-1)?.id ?? 0,
          slot = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT'].indexOf(key),
          ability = slot < 0 ? BASIC : heroes[0].skillIds[slot];
        const cap = await observe(
          key === 'KeyT' ? 2100 : 1250,
          () => keys(key),
          d[0] === 'down_right' && profile.captureByKey
            ? (profile.captureByKey[key] ?? [])
            : d[0] === 'down_right' && profile.staffChoreography
              ? {
                  KeyA: ['thrust', 'overhead'],
                  KeyQ: [{ name: 'Q-hoanh-tao', prefix: 'sweep_' }],
                  KeyW: [{ name: 'W-pha-giap', prefix: 'slam_contact_' }],
                  KeyE: [{ name: 'E-cam-long', prefix: 'pull_' }],
                  KeyR: [
                    { name: 'R-truy-phong', prefix: 'thrust_' },
                    { name: 'R-stomp', prefix: 'stomp_' },
                  ],
                  KeyT: [
                    { name: 'T-whirl', prefix: 'sweep_' },
                    { name: 'T-finisher-raise', prefix: 'finisher_raise_' },
                    { name: 'T-ending', prefix: 'stomp_' },
                  ],
                }[key]
              : d[0] === 'down_right'
                ? key === 'KeyA'
                  ? profile.basic === 'cai_bang_bong'
                    ? ['thrust', 'overhead']
                    : ['strike', 'alternate']
                  : key === 'KeyQ'
                    ? ['release']
                    : key === 'KeyE'
                      ? ['rise']
                      : key === 'KeyR'
                        ? ['channel']
                        : []
                : [],
        );
        coherent(cap, key + ' ' + d[0]);
        if (d[0] === 'right' && key === 'KeyA')
          await page
            .locator('#viewport')
            .screenshot({ path: resolve(out, 'arena-after.png') });
        const cases = [];
        for (let i = 0; i < ids.length; i++) {
          const event = cap.events.find(
            (e) =>
              e.id > before &&
              e.sourceId === ids[i] &&
              e.abilityId === ability &&
              ['attack', 'cast'].includes(e.kind),
          );
          assert.ok(event, 'real accepted ' + key + '/' + i);
          const f = [...new Set(cap.frames[ids[i]].map((f) => f.frame))];
          assert.ok(
            f.some(
              (f) =>
                new RegExp(
                  profile.actionBodyPattern ??
                    '^(native|windup|strike|alternate|charge|release|rise|channel|recover|thrust|sweep|rising|overhead|pull|slam|stomp|finisher|palm|cut|taichi|aim|guard|sword)_',
                ).test(f) &&
                f.endsWith(
                  '_' +
                    ((profile.nativeFacingAbilities ?? []).includes(ability)
                      ? d[0].includes('down')
                        ? 'down'
                        : d[0].includes('up')
                          ? 'up'
                          : d[0]
                      : d[0]),
                ),
            ),
            'action body ' + key + '/' + i,
          );
          if (profile.contactPose && key === 'KeyA') {
            const contact = profile.contactPose(event);
            assert.ok(
              f.includes(contact + '_' + d[0]),
              'actual authored basic contact ' + contact + '/' + i,
            );
          }
          if (profile.voDangChoreography && key === 'KeyA') {
            const contact =
              BASIC === 'vo_dang_quyen'
                ? event.stage === 'right_palm'
                  ? 'palm_right'
                  : 'palm_left'
                : event.stage;
            assert.ok(
              f.includes(contact + '_' + d[0]),
              'real accepted normal contact ' + contact + '/' + i,
            );
          }
          cases.push({ id: ids[i], event, frames: f, targetHp: targets[i].hp });
        }
        if (tickAuthority)
          await wait(async () => {
            const peer = (await read(pages[1])).state,
              expected = serverHP.get(peer.tick);
            return (
              expected &&
              heroes.every(
                (h) => Math.abs(peer.players[h.id].hp - expected[h.id]) < 0.001,
              )
            );
          }, 'peer health at same serialized tick');
        else {
          const peer = (await read(pages[1])).state;
          for (const h of heroes)
            assert.ok(
              Math.abs(peer.players[h.id].hp - h.hp) < 0.001,
              'peer health (schema float precision)',
            );
        }
        if (key === 'KeyA')
          assert.ok(
            targets.some((e) => e.hp < e.maxHp),
            'server projectile hit',
          );
        if (profile.staffChoreography && ability === 'pha_giap_bong') {
          const samples = cap.frames[ids[0]],
            phases = [...new Set(samples.map((f) => f.phase))];
          for (const [phase, pose] of [
            ['raise', 'slam_raise'],
            ['strike', 'slam_contact'],
            ['recovery', 'recover'],
          ])
            assert.ok(
              samples.some(
                (f) =>
                  f.phase.includes(phase) && f.frame.startsWith(pose + '_'),
              ),
              'Phá Giáp ' + phase + ' body matches live VFX clock',
            );
          report.staffSlam ??= [];
          report.staffSlam.push({
            direction: d[0],
            phases,
            frames: [...new Set(samples.map((f) => f.frame))],
          });
        }
        report.actions.push({ direction: d[0], key, ability, cases });
        save();
      }
    }
    // Apply server-owned combat resolution on a fixed simulation tick, through normal Room event broadcast.
    const resolveHit = (raw) => {
      const h = heroes[0];
      h.invulnerable = false;
      const step = sim.step;
      sim.step = function (now) {
        sim.step = step;
        step.call(sim, now);
        const first = w.events.length;
        hurt(w, h, 'coherent_enemy', 'coherent_resolved_hit', raw, c, {
          critChance: 0,
          critMultiplier: 1,
        });
        for (const event of w.events.slice(first))
          sim.events.push({ zoneId: 'arena', event });
      };
    };
    for (const d of [
      'party',
      'extras',
      'weapon',
      'locomotion',
      'idle-after-T',
    ].includes(process.env.VOLAM_CHUONG_STAGE) || profile.partial
      ? []
      : testingDirs) {
      reset(d);
      await settle();
      const h = heroes[0],
        hp = h.hp;
      const hit = await observe(
        450,
        async () => resolveHit(40),
        d[0] === 'down_right' ? ['hurt_'] : [],
      );
      coherent(hit, 'hurt');
      assert.ok(h.hp < hp, 'real hurt HP');
      assert.ok(
        hit.events.some((e) => e.kind === 'hit' && e.targetId === h.id),
        'broadcast hit',
      );
      assert.ok(
        hit.frames[h.id].some((f) => f.frame.startsWith('hurt_')),
        'authored hurt',
      );
      const hitTick = Math.max(
        ...hit.events
          .filter((e) => e.kind === 'hit' && e.targetId === h.id)
          .map((e) => e.tick),
      );
      let acknowledged;
      await wait(async () => {
        const state = (await read(pages[1])).state;
        const peerHp = state.players[h.id].hp;
        const serverHp = tickAuthority
          ? serverHP.get(state.tick)?.[h.id]
          : h.hp;
        const matched =
          state.tick >= hitTick &&
          serverHp !== undefined &&
          Math.abs(peerHp - serverHp) < 0.001;
        if (matched) acknowledged = { tick: state.tick, serverHp, peerHp };
        return matched;
      }, 'peer hit HP at acknowledged server tick');
      report.authority.push({
        kind: 'resolved-hit',
        direction: d[0],
        hitTick,
        acknowledged,
      });
      save();
      report.reactions.push({
        direction: d[0],
        kind: 'hurt',
        frames: [...new Set(hit.frames[h.id].map((f) => f.frame))],
      });
      applyStatus(
        h,
        { kind: 'stun', durationTicks: 15, magnitude: 1 },
        'coherent_enemy',
        'coherent_stun',
        w.tick,
      );
      const stun = await observe(750);
      coherent(stun, 'stun');
      assert.ok(stun.frames[h.id].some((f) => f.frame === 'hurt_1_' + d[0]));
      assert.ok(stun.frames[h.id].at(-1).frame.startsWith('idle_'));
      report.reactions.push({
        direction: d[0],
        kind: 'stun',
        alphaAfter: stun.frames[h.id].at(-1).alpha,
      });
      for (const kind of [
        'slow',
        'silence',
        'disarm',
        'root',
        'burn',
        'poison',
      ])
        applyStatus(
          h,
          { kind, durationTicks: 12, magnitude: 0.2 },
          'coherent_enemy',
          'coherent_status',
          w.tick,
        );
      const effect = await observe(700);
      coherent(effect, 'status');
      assert.equal(effect.frames[h.id].at(-1).alpha, 1);
      assert.equal(
        effect.frames[h.id].at(-1).tint,
        stun.frames[h.id].at(-1).tint,
        'tint restored to idle baseline before statuses',
      );
      assert.ok(effect.frames[h.id].at(-1).frame.startsWith('idle_'));
      report.reactions.push({
        direction: d[0],
        kind: 'status expiry',
        observed: [...new Set(effect.frames[h.id].flatMap((f) => f.statuses))],
        alphaAfter: 1,
      });
      reset(d);
      await settle();
      const death = await observe(
        850,
        async () => resolveHit(1000000),
        d[0] === 'down_right' ? ['death_1'] : [],
      );
      coherent(death, 'death');
      assert.equal(h.hp, 0);
      assert.ok(death.frames[h.id].some((f) => f.frame === 'death_0_' + d[0]));
      assert.ok(death.frames[h.id].some((f) => f.frame === 'death_1_' + d[0]));
      assert.equal((await read(pages[1])).state.players[h.id].hp, 0);
      report.reactions.push({
        direction: d[0],
        kind: 'death',
        frames: [...new Set(death.frames[h.id].map((f) => f.frame))],
      });
      // Let the existing arena respawn timer complete; no HP reset or shortened gameplay clock.
      await wait(async () => {
        const s = await read();
        return (
          h.hp > 0 && !sim.respawns.has(h.id) && s.state.players[h.id].hp > 0
        );
      }, 'natural arena respawn');
      const revive = await observe(300);
      coherent(revive, 'revival');
      assert.ok(
        revive.frames[h.id].every(
          (f) => f.alpha === 1 && f.frame.startsWith('idle_'),
        ),
      );
      report.reactions.push({
        direction: d[0],
        kind: 'natural arena revival',
        alphaAfter: 1,
      });
      save();
    }
    if (
      profile.extraChecks &&
      (!process.env.VOLAM_CHUONG_STAGE ||
        ['extras', 'weapon'].includes(process.env.VOLAM_CHUONG_STAGE))
    ) {
      report.extraChecks = await profile.extraChecks({
        observe,
        reset,
        settle,
        target,
        keys,
        heroes,
        ids,
        read,
        coherent,
        wait,
        dirs,
        w,
        sim,
        c,
        out,
        page,
        pages,
        resolveHit,
        basic: BASIC,
        partial: profile.partial,
      });
      save();
    }
    reset(dirs[1]);
    await settle();
    await page.locator('#game canvas').focus();
    for (const enabled of [false, true]) {
      await page.keyboard.press('F8');
      await wait(
        async () =>
          (await page.evaluate(
            () => window.__VOLAM__.presentation().worldDepth.enabled,
          )) === enabled,
        'F8 ' + enabled,
      );
    }
    report.f8 = 'PASS';
    const portrait = await page
      .locator('#viewport')
      .evaluate((el) => el.style.getPropertyValue('--hero-portrait'));
    if (!profile.partial)
      assert.ok(
        portrait.includes(
          profile.avatar ?? '/cai-bang-chuong-unified-v1/avatar.png',
        ),
      );
    report.portrait = portrait;
    if (pages.length === 6) {
      heroes.forEach((h, i) =>
        Object.assign(h, {
          x: 700 + (i % 3) * 110,
          y: 600 + Math.floor(i / 3) * (profile.partySpacingY ?? 85),
        }),
      );
      await settle();
      if (cleanParty)
        await page
          .locator('#viewport')
          .screenshot({ path: resolve(out, 'party-ready.png') });
      for (let i = 0; i < 96; i++) {
        const e = addCreep(
          w,
          'coherent_crowd_' + i,
          { x: 600 + (i % 12) * 35, y: 570 + Math.floor(i / 12) * 35 },
          c,
        );
        e.archetypeId = 'creep_wild_dog';
        const hp = cleanParty ? 100000 : 120;
        e.stats = { ...c.creep, hp, damage: 1 };
        e.hp = e.maxHp = hp;
        if (cleanParty) e.controlled = true;
      }
      const combat = await observe(
        2600,
        async () => {
          await keys('KeyQ');
          await page.locator('#game canvas').focus();
          await page.keyboard.down('ArrowRight');
          await page.waitForTimeout(350);
          await page.keyboard.up('ArrowRight');
          await keys('KeyA');
        },
        ['release'],
      );
      await page.keyboard.up('ArrowRight');
      coherent(combat, 'six-client combat');
      assert.ok(
        combat.events.some((e) => e.kind === 'hit' && ids.includes(e.sourceId)),
        'natural combat hit',
      );
      const deltas = combat.ticks
        .slice(1)
        .map((t, i) => t - combat.ticks[i])
        .sort((a, b) => a - b);
      report.party = {
        targetFixture: cleanParty
          ? '96 stationary high-HP server targets; real keyboard hero attacks/hits, no creep AI combat/reward coverage'
          : '96 normal low-HP targets',
        creeps: 96,
        clients: 6,
        hits: combat.events.filter((e) => e.kind === 'hit').length,
        medianMs: deltas[Math.floor(deltas.length * 0.5)],
        p95Ms: deltas[Math.floor(deltas.length * 0.95)],
        frames: deltas.length,
      };
      if (profile.staffChoreography) {
        report.party.creepTextures = await page.evaluate(() => {
          const scene = window.__VOLAM__.presentation();
          return (
            scene.renovation?.bodies
              ?.filter((b) => String(b.id).includes('coherent_crowd_'))
              .map((b) => b.texture) ?? []
          );
        });
      }
      const framing = await page.evaluate(
        (ids) =>
          new Promise((resolve) =>
            window.__VOLAM__.afterRender((renderer) => {
              const scene = renderer.game.scene.getScene('Arena'),
                v = scene.cameras.main.worldView;
              resolve(
                ids.map((id) => {
                  const b = scene.children.getByName('actor:' + id),
                    r = b.getBounds();
                  // Atlas trim is the visible raster; logical staff-safe canvas includes deliberately empty margins.
                  if (b.frame.trimmed) {
                    const f = b.frame.data.spriteSourceSize;
                    r.x =
                      b.x -
                      b.originX * b.frame.realWidth * b.scaleX +
                      f.x * b.scaleX;
                    r.y =
                      b.y -
                      b.originY * b.frame.realHeight * b.scaleY +
                      f.y * b.scaleY;
                    r.width = f.w * b.scaleX;
                    r.height = f.h * b.scaleY;
                  }
                  return {
                    id,
                    visible: b.visible,
                    bounds: {
                      x: r.x,
                      y: r.y,
                      right: r.right,
                      bottom: r.bottom,
                    },
                    viewport: {
                      x: v.x,
                      y: v.y,
                      right: v.right,
                      bottom: v.bottom,
                    },
                    inside:
                      r.x >= v.x &&
                      r.y >= v.y &&
                      r.right <= v.right &&
                      r.bottom <= v.bottom,
                  };
                }),
              );
            }),
          ),
        ids,
      );
      report.party.framing = framing;
      save();
      assert.ok(
        framing.every((x) => x.visible && x.inside),
        'all six complete bodies inside normal viewport',
      );
      await page
        .locator('#viewport')
        .screenshot({ path: resolve(out, 'party.png') });
    }
    const final = await observe(300);
    coherent(final, 'return to idle');
    report.status = 'PASS';
    save();
    return report;
  } catch (error) {
    report.status = 'FAIL';
    report.failure = String(error);
    save();
    await page
      .locator('#viewport')
      .screenshot({ path: resolve(out, 'failure.png') })
      .catch(() => {});
    throw error;
  } finally {
    if (tickAuthority) room.syncState = originalSyncState;
  }
}
