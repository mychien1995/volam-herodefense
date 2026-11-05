import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { addCreep, refreshCharacter } from '@volam/game-core';
import { m1Config } from '@volam/game-data';
import { waitForQa } from './qa-wait.mjs';

/** Legal server-side loadout/target prerequisites; casts and hits use real keys. */
export async function verifyRenovationSkills({
  room,
  pages,
  out,
  full = false,
}) {
  const [page, old] = pages,
    h = room.world.heroes.values().next().value,
    w = room.world,
    c = room.simulation.arena.config;
  const read = (p) => p.evaluate(() => window.__VOLAM__.snapshot());
  const inspect = (p) => p.evaluate(() => window.__VOLAM__.presentation());
  const wait = (fn, label) =>
    waitForQa(fn, label, {
      timeout: 12000,
      diagnostics: async () => ({
        hero: (await read(page)).state.players[h.id],
        presentation: (await inspect(page)).renovation.bodies.filter(
          (b) => b.name === 'actor:' + h.id,
        ),
      }),
    });
  const profiles = [
    {
      school: 'vo_dang',
      basic: 'vo_dang_kiem',
      skills: [
        'that_tinh_kiem',
        'nhan_kiem_hop_nhat',
        'bat_quai_kiem_tran',
        'toa_sat_bac_do',
        'van_kiem_quy_tong',
      ],
    },
    {
      school: 'thien_son',
      basic: 'thien_son_phien',
      skills: [
        'lien_hoa_phien',
        'luc_duong_chuong',
        'luu_phong_bo',
        'chiet_mai_thu',
        'bach_phien_phong_bao',
      ],
    },
  ];
  const report = {
    fixture:
      'Server-owned legal level30/rank1 loadout and durable targets; no injected cast/damage/reward outcomes',
    directions: full ? 4 : 1,
    basics: [],
    cases: [],
  };
  room.simulation.invasion.wave = 0;
  room.simulation.invasion.nextWaveTick = w.tick + 100000;
  room.simulation.dongTa.phase = 'waiting';
  for (const profile of profiles) {
    h.schoolId = profile.school;
    room.state.players.get(h.id).schoolId = profile.school;
    h.basicId = profile.basic;
    h.xp = (c.maxLevel - 1) * c.xpPerLevel;
    h.level = c.maxLevel;
    h.skillPoints = c.maxLevel;
    h.progression.mode = 'custom';
    h.progression.ranks = Object.fromEntries(
      profile.skills.map((id) => [id, 1]),
    );
    h.progression.branchId = profile.basic;
    h.progression.revision++;
    for (const [direction, fx, fy] of full
      ? [
          ['right', 1, 0],
          ['down', 0, 1],
          ['left', -1, 0],
          ['up', 0, -1],
        ]
      : [['right', 1, 0]])
      for (const skill of profile.skills) {
        w.creeps.clear();
        w.projectiles.clear();
        w.areas = [];
        w.shots = [];
        w.actions = [];
        w.combos = [];
        Object.assign(h, {
          x: 800,
          y: 760,
          fx,
          fy,
          moveX: 0,
          moveY: 0,
          statuses: [],
          pose: 'idle',
          actionUntil: 0,
          hurtUntil: 0,
          cooldown: 0,
          skillIds: [skill, '', '', ''],
          skillCooldowns: [0, 0, 0, 0],
          abilityCooldowns: {},
        });
        refreshCharacter(h, c);
        h.hp = h.maxHp;
        h.mana = h.maxMana;
        // Peers remain real connected players but do not overlap the test caster.
        for (const other of w.heroes.values())
          if (other.id !== h.id)
            Object.assign(other, {
              x: 1000,
              y: 760,
              moveX: 0,
              moveY: 0,
              statuses: [],
            });
        // Between radial projectile lanes, so collision cannot consume a lane before observation.
        const radial = ['van_kiem_quy_tong', 'bach_phien_phong_bao'].includes(
            skill,
          ),
          angle = radial ? Math.PI / 8 : 0;
        const dummy = addCreep(
          w,
          'renovation_dummy',
          {
            x:
              h.x +
              (fx * Math.cos(angle) - fy * Math.sin(angle)) *
                (radial ? 90 : 54),
            y:
              h.y +
              (fx * Math.sin(angle) + fy * Math.cos(angle)) *
                (radial ? 90 : 54),
          },
          c,
        );
        Object.assign(dummy, {
          archetypeId: 'creep_wild_dog',
          hp: 100000,
          maxHp: 100000,
          controlled: skill !== 'toa_sat_bac_do',
          cooldown: w.tick + 5,
        });
        dummy.stats = {
          ...c.creep,
          hp: 100000,
          damage: 18,
          defense: 0,
          xp: 0,
          gold: 0,
        };
        await wait(
          async () => {
            const s = await read(page);
            return (
              s.state.players[h.id].qSkill === skill &&
              Math.abs(s.state.players[h.id].x - 800) < 1
            );
          },
          'server fixture ' + skill + '/' + direction,
        );
        await page.locator('#game canvas').focus();
        if (skill === profile.skills[0]) {
          const start = (await read(page)).events.at(-1)?.id ?? 0;
          await page.keyboard.press('KeyA');
          await wait(
            async () =>
              (await read(page)).events.some(
                (e) =>
                  e.id > start &&
                  e.kind === 'attack' &&
                  e.sourceId === h.id &&
                  e.abilityId === profile.basic,
              ),
            'real basic ' + profile.basic + '/' + direction,
          );
          const frames = new Set();
          let newBody = false;
          const until = performance.now() + 400;
          while (performance.now() < until) {
            const b = (await inspect(page)).renovation.bodies.find(
              (b) => b.name === 'actor:' + h.id,
            );
            if (b?.source.includes('/renovation-v2/')) {
              newBody = true;
              frames.add(b.texture + ':' + b.frame);
            }
            await new Promise((r) => setTimeout(r, 25));
          }
          assert(
            newBody,
            'renovated basic body ' + profile.basic + '/' + direction,
          );
          await wait(
            async () =>
              (await read(page)).events.some(
                (e) =>
                  e.id > start &&
                  e.kind === 'hit' &&
                  e.sourceId === h.id &&
                  e.abilityId === profile.basic,
              ),
            'real basic hit ' + profile.basic + '/' + direction,
          );
          report.basics.push({
            basic: profile.basic,
            direction,
            observedFrames: [...frames],
          });
          await new Promise((r) => setTimeout(r, 1000));
        }
        const before = (await read(page)).events.at(-1)?.id ?? 0;
        await page.keyboard.press('KeyQ');
        await wait(
          async () =>
            (await read(page)).events.some(
              (e) =>
                e.id > before &&
                e.kind === 'cast' &&
                e.sourceId === h.id &&
                e.abilityId === skill,
            ),
          'real cast ' + skill + '/' + direction,
        );
        await wait(
          async () =>
            (await inspect(page)).renovation.bodies.some(
              (b) =>
                b.name === 'actor:' + h.id &&
                b.source.includes('/renovation-v2/overrides/'),
            ),
          'new body ' + skill + '/' + direction,
        );
        const [newView, oldView] = await Promise.all([
          inspect(page),
          inspect(old),
        ]);
        const body = newView.renovation.bodies.find(
          (b) => b.name === 'actor:' + h.id,
        );
        const baseline = oldView.renovation.bodies.find(
          (b) => b.name === 'actor:' + h.id,
        );
        if (direction === 'right') {
          // Startup cels can precede the guard/field; capture the visible active phase.
          if (
            [
              'toa_sat_bac_do',
              'bat_quai_kiem_tran',
              'lien_hoa_phien',
              'chiet_mai_thu',
            ].includes(skill)
          )
            await new Promise((r) => setTimeout(r, 200));
          await Promise.all(
            [
              [page, 'new', body],
              [old, 'old', baseline],
            ].map(([p, suffix, b]) =>
              p.screenshot({
                path: resolve(out, skill + '-' + suffix + '.png'),
                clip: {
                  x: Math.max(0, Math.min(854, Math.round(b.screen[0] - 256))),
                  y: Math.max(0, Math.min(288, Math.round(b.screen[1] - 240))),
                  width: 512,
                  height: 480,
                },
              }),
            ),
          );
        }
        assert(body.source.includes('/renovation-v2/'));
        assert(!baseline?.source.includes('/renovation-v2/'));
        assert.equal(body.density, 2);
        assert.equal(body.depth, body.y);
        if (skill !== 'luu_phong_bo')
          assert(
            Math.abs(body.x - (await read(page)).state.players[h.id].x) < 12,
          );
        let blink;
        let field;
        if (skill === 'lien_hoa_phien') {
          await wait(
            async () =>
              w.areas.some((a) => a.ownerId === h.id && a.abilityId === skill),
            'fixed lotus ground area',
          );
          const area = w.areas.find(
            (a) => a.ownerId === h.id && a.abilityId === skill,
          );
          const anchor = [area.x, area.y],
            radius =
              area.effect?.radius ??
              m1Config.skillCatalogue[skill].effect.radius;
          assert(Number.isFinite(radius));
          await page.keyboard.down('ArrowDown');
          await wait(
            async () =>
              Math.hypot(h.x - anchor[0], h.y - anchor[1]) > radius + 10,
            'leave fixed lotus',
          );
          await page.keyboard.up('ArrowDown');
          assert.deepEqual([area.x, area.y], anchor);
          await page.keyboard.down('ArrowUp');
          await wait(
            async () =>
              Math.hypot(h.x - anchor[0], h.y - anchor[1]) < radius - 15,
            'reenter fixed lotus',
          );
          await page.keyboard.up('ArrowUp');
          field = { anchor, after: [area.x, area.y] };
        }
        if (['van_kiem_quy_tong', 'bach_phien_phong_bao'].includes(skill)) {
          await wait(
            async () =>
              [...w.projectiles.values()].some(
                (p) => p.ownerId === h.id && p.abilityId === skill,
              ),
            'real eight-way burst',
          );
          // Preserve actual angles. Rounding into fixed 45-degree bins aliases
          // adjacent rays when the captured facing lies on a bin boundary.
          const angles = new Set(
            [...w.projectiles.values()]
              .filter((p) => p.ownerId === h.id && p.abilityId === skill)
              .map((p) =>
                (
                  (Math.atan2(p.vy, p.vx) + 2 * Math.PI) %
                  (2 * Math.PI)
                ).toFixed(4),
              ),
          );
          assert.equal(
            angles.size,
            8,
            skill + ' eight authoritative directions',
          );
        }
        if (skill === 'nhan_kiem_hop_nhat') {
          await wait(
            async () =>
              [...w.projectiles.values()].some(
                (p) => p.ownerId === h.id && p.abilityId === skill,
              ),
            'authoritative sword spawn',
          );
          const shot = [...w.projectiles.values()].find(
            (p) => p.ownerId === h.id && p.abilityId === skill,
          );
          const x = h.x,
            y = h.y;
          await new Promise((r) => setTimeout(r, 450));
          await page.keyboard.press('KeyQ');
          await wait(
            async () => Math.hypot(h.x - x, h.y - y) > 30,
            'server blink recast',
          );
          blink = {
            from: [x, y],
            to: [h.x, h.y],
            velocity: [shot.vx, shot.vy],
          };
        }
        const effect = m1Config.skillCatalogue[skill].effect;
        const activeMs =
          effect.mode === 'area' ||
          effect.mode === 'buff' ||
          effect.mode === 'guard_counter'
            ? (effect.durationTicks / c.tickRate) * 1000
            : effect.mode === 'multi_hit'
              ? Math.max(
                  0,
                  (((effect.hits - 1) * effect.spacingTicks) / c.tickRate) *
                    1000,
                )
              : effect.mode === 'dash'
                ? (effect.distance / effect.speed) * 1000
                : 1000;
        // Observe real sustained/channel/guard lifetimes before arranging the next case.
        await new Promise((r) =>
          setTimeout(r, Math.max(450, Math.min(6200, activeMs + 180))),
        );
        const events = (await read(page)).events.filter(
          (e) => e.id > before && e.sourceId === h.id && e.abilityId === skill,
        );
        if (
          [
            'that_tinh_kiem',
            'nhan_kiem_hop_nhat',
            'luc_duong_chuong',
            'luu_phong_bo',
            'bach_phien_phong_bao',
          ].includes(skill)
        )
          assert(
            events.some((e) => e.kind === 'hit'),
            skill + ' real damage',
          );
        report.cases.push({
          skill,
          direction,
          body,
          baseline,
          blink,
          field,
          events: events.map((e) => ({
            kind: e.kind,
            damage: e.damage,
            x: e.x,
            y: e.y,
            target: e.targetId,
          })),
          fx: (await inspect(page)).renovation.skillEffects,
        });
        console.log('[renovation skill] ' + skill + '/' + direction + ' PASS');
      }
  }
  h.statuses = [];
  w.creeps.clear();
  w.projectiles.clear();
  w.areas = [];
  w.actions = [];
  w.shots = [];
  report.navigation = [];
  h.hp = h.maxHp;
  assert.equal(room.simulation.enter(h.id, 'private', 'forest'), undefined);
  await wait(
    async () =>
      (await read(page)).state.players[h.id].zoneId.startsWith('forest_'),
    'forest entry acknowledged',
  );
  const drive = async (axis, target) => {
    const start = h[axis],
      positive = target > start;
    const key =
      axis === 'x'
        ? positive
          ? 'ArrowRight'
          : 'ArrowLeft'
        : positive
          ? 'ArrowDown'
          : 'ArrowUp';
    await page.locator('#game canvas').focus();
    await page.keyboard.down(key);
    await wait(
      async () => (positive ? h[axis] >= target : h[axis] <= target),
      'real forest movement ' + axis + '=' + target,
    );
    await page.keyboard.up(key);
    await wait(
      async () => (await read(page)).state.players[h.id].pose === 'idle',
      'forest movement stopped',
    );
    report.navigation.push({ axis, target, actual: h[axis] });
  };
  await drive('x', 480);
  await drive('y', 604);
  await drive('x', 912);
  await drive('y', 176);
  await drive('x', 160);
  await drive('y', 320);
  await page.screenshot({ path: resolve(out, 'forest-route-complete.png') });
  await page.keyboard.press('Space');
  await wait(
    async () => (await read(page)).state.players[h.id].zoneId === 'arena',
    'real Space exit',
  );
  report.status = 'PASS';
  writeFileSync(
    resolve(out, 'skill-comparison.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  return report;
}
