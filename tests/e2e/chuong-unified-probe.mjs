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
const KEY = 'cai-bang-chuong-unified';
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
export async function verifyCoherentChuong({ room, pages, out }) {
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
  const report = {
    status: 'RUNNING',
    clients: pages.length,
    scope:
      process.env.VOLAM_CHUONG_STAGE === 'party'
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
      'Only Cái Bang Chưởng changed. Status and hit fixtures are server-owned, body clocks never send combat commands.',
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
    h.schoolId = 'cai_bang';
    room.state.players.get(h.id).schoolId = 'cai_bang';
    h.level = 30;
    h.xp = experienceAtLevel(30, c);
    initializeProgression(h, c, 'fixed', 'cai_bang_chuong');
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
          s.state.players[h.id]?.basicId === 'cai_bang_chuong' &&
          bodies.some(
            (b) =>
              b.id === h.id &&
              b.texture === KEY &&
              Math.abs(b.x - h.x) < 2 &&
              Math.abs(b.y - h.y) < 2,
          ),
      );
    }, 'coherent body and server placement');
  const observe = async (ms, input = async () => {}, captureLabels = []) => {
    await page.evaluate(
      ({ ids, captureLabels }) => {
        const api = window.__VOLAM__;
        window.__chuongDeadline = Infinity;
        window.__chuongCapture = new Promise((resolve) => {
          const frames = Object.fromEntries(ids.map((id) => [id, []])),
            events = new Map(),
            pngs = {},
            ticks = [];
          const sample = (renderer) => {
            const snap = api.snapshot(),
              scene = renderer.game.scene.getScene('Arena');
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
                statuses: JSON.parse(h.statuses || '[]').map((s) => s.kind),
                x: b.x,
                y: b.y,
                hp: h.hp,
                pose: h.pose,
                ability: h.castAbilityId,
                tick: snap.state.tick,
              });
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
            if (performance.now() >= window.__chuongDeadline)
              resolve({ frames, events: [...events.values()], pngs, ticks });
            else api.afterRender(sample);
          };
          api.afterRender(sample);
        });
      },
      { ids, captureLabels },
    );
    await input();
    await page.evaluate((ms) => {
      window.__chuongDeadline = performance.now() + ms;
    }, ms);
    const capture = await page.evaluate(() => window.__chuongCapture);
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
        assert.equal(f.texture, KEY, label + ' source');
        assert.deepEqual(f.scale, [0.5, 0.5], label + ' scale');
        assert.deepEqual(f.origin, [0.5, 132 / 144], label + ' pivot');
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
    for (const d of ['reactions', 'party'].includes(
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
      );
      coherent(idle, 'idle ' + d[0]);
      const fs = [...new Set(idle.frames[ids[0]].map((f) => f.frame))];
      for (let i = 0; i < 4; i++)
        assert.ok(
          fs.includes(`idle_${i}_${d[0]}`),
          'idle distinct cel ' + d[0] + '/' + i,
        );
      for (const f of idle.frames[ids[0]])
        assert.equal(f.alpha, 1, 'idle never fades');
      report.idle.push({ direction: d[0], frames: fs, alpha: 1 });
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
      for (const key of ['KeyA', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT']) {
        reset(d);
        const targets = heroes.map((h, i) =>
          target(h, d, 'coherent_target_' + i),
        );
        await settle();
        const before = (await read()).events.at(-1)?.id ?? 0,
          slot = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT'].indexOf(key),
          ability = slot < 0 ? 'cai_bang_chuong' : heroes[0].skillIds[slot];
        const cap = await observe(
          key === 'KeyT' ? 2100 : 1250,
          () => keys(key),
          d[0] === 'down_right'
            ? key === 'KeyA'
              ? ['strike', 'alternate']
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
                /^(windup|strike|alternate|charge|release|rise|channel|recover)_/.test(
                  f,
                ) && f.endsWith('_' + d[0]),
            ),
            'action body ' + key + '/' + i,
          );
          cases.push({ id: ids[i], event, frames: f, targetHp: targets[i].hp });
        }
        const peer = (await read(pages[1])).state;
        for (const h of heroes)
          assert.equal(peer.players[h.id].hp, h.hp, 'peer health');
        if (key === 'KeyA')
          assert.ok(
            targets.some((e) => e.hp < e.maxHp),
            'server projectile hit',
          );
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
    for (const d of process.env.VOLAM_CHUONG_STAGE === 'party'
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
      assert.equal(
        (await read(pages[1])).state.players[h.id].hp,
        h.hp,
        'peer hit HP',
      );
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
        effect.frames[h.id][0].tint,
        'tint restored after status expiry',
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
    assert.ok(portrait.includes('/cai-bang-chuong-unified-v1/avatar.png'));
    report.portrait = portrait;
    if (pages.length === 6) {
      heroes.forEach((h, i) =>
        Object.assign(h, {
          x: 700 + (i % 3) * 110,
          y: 600 + Math.floor(i / 3) * 85,
        }),
      );
      await settle();
      for (let i = 0; i < 96; i++) {
        const e = addCreep(
          w,
          'coherent_crowd_' + i,
          { x: 600 + (i % 12) * 35, y: 570 + Math.floor(i / 12) * 35 },
          c,
        );
        e.archetypeId = 'creep_wild_dog';
        e.stats = { ...c.creep, hp: 120, damage: 1 };
        e.hp = e.maxHp = 120;
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
        creeps: 96,
        clients: 6,
        hits: combat.events.filter((e) => e.kind === 'hit').length,
        medianMs: deltas[Math.floor(deltas.length * 0.5)],
        p95Ms: deltas[Math.floor(deltas.length * 0.95)],
        frames: deltas.length,
      };
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
  }
}
