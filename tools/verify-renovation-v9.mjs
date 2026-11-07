import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { addCreep, refreshCharacter } from '@volam/game-core';
import { verifyRenovationRuntime } from './verify-renovation-runtime.mjs';
import { naturalParty } from './verify-renovation-v3.mjs';
import { waitForQa } from './qa-wait.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const read = (p) => p.evaluate(() => window.__VOLAM__.snapshot());
const view = (p) => p.evaluate(() => window.__VOLAM__.presentation());

/** Real A/Q inputs; the fixture supplies legal builds and durable targets only. */
export async function verifyRenovationV9(
  browser,
  {
    players = 2,
    development = true,
    baseline = false,
    evidenceDir = 'docs/evidence/renovation-v9',
  } = {},
) {
  const out = resolve(evidenceDir);
  mkdirSync(out, { recursive: true });
  const report = {
    status: 'RUNNING',
    baseline,
    players,
    cases: [],
    violations: [],
  };
  const wait = (fn, label) => waitForQa(fn, label, { timeout: 18000 });
  try {
    return await verifyRenovationRuntime(browser, {
      players,
      development,
      evidenceDir: out,
      onReady: async ({ room, pages }) => {
        const w = room.world,
          c = room.simulation.arena.config;
        const heroes = [...w.heroes.values()],
          h = heroes[0],
          p = pages[0],
          peer = pages[1];
        room.simulation.invasion.nextWaveTick = w.tick + 100000;
        room.simulation.dongTa.phase = 'waiting';
        for (const a of heroes.slice(1))
          Object.assign(a, { x: 1400, y: 1000, moveX: 0, moveY: 0 });
        for (const [mode, index] of [
          ['m3d', 1],
          ['current', 0],
        ]) {
          const actor = heroes[index],
            page = pages[index];
          for (const [direction, fx, fy] of [
            ['right', 1, 0],
            ['left', -1, 0],
            ['down', 0, 1],
            ['up', 0, -1],
          ]) {
            if (mode === 'm3d' && direction !== 'right') continue;
            w.creeps.clear();
            w.projectiles.clear();
            w.actions = [];
            w.shots = [];
            w.areas = [];
            w.combos = [];
            for (const a of heroes)
              Object.assign(a, {
                x: 1400,
                y: 1000,
                moveX: 0,
                moveY: 0,
                statuses: [],
                actionUntil: 0,
                hurtUntil: 0,
                pose: 'idle',
              });
            Object.assign(actor, {
              schoolId: 'cai_bang',
              basicId: 'cai_bang_chuong',
              level: 30,
              x: 600,
              y: 760,
              fx,
              fy,
              cooldown: 0,
              basicChains: {},
              castAbilityId: '',
              skillIds: ['phi_long_tai_thien', '', '', ''],
              skillCooldowns: [0, 0, 0, 0],
              abilityCooldowns: {},
            });
            Object.assign(actor.progression, {
              mode: 'custom',
              branchId: 'cai_bang_chuong',
              ranks: {
                phi_long_tai_thien:
                  c.progression.skills.phi_long_tai_thien.ranks.length,
              },
              revision: actor.progression.revision + 1,
            });
            room.state.players.get(actor.id).schoolId = 'cai_bang';
            refreshCharacter(actor, c);
            actor.hp = actor.maxHp;
            actor.mana = actor.maxMana;
            const target = addCreep(
              w,
              'v9_target',
              { x: actor.x + fx * 180, y: actor.y + fy * 180 },
              c,
            );
            Object.assign(target, {
              controlled: true,
              archetypeId: 'creep_wild_dog',
              hp: 100000,
              maxHp: 100000,
              stats: {
                ...c.creep,
                hp: 100000,
                speed: 0,
                damage: 0,
                defense: 0,
                xp: 0,
                gold: 0,
              },
            });
            await wait(async () => {
              const a = (await read(page)).state.players[actor.id];
              return (
                a.basicId === actor.basicId &&
                a.qSkill === 'phi_long_tai_thien' &&
                a.x === 600 &&
                a.fx === fx &&
                a.fy === fy &&
                a.pose === 'idle'
              );
            }, 'V9 build/facing ack');
            const before = (await read(page)).events.at(-1)?.id ?? 0;
            const bodies = new Map(),
              effects = new Map(),
              stages = [],
              attackBodies = [];
            const sample = async () => {
              const v = (await view(page)).renovation;
              const b = v.bodies.find((b) => b.name === 'actor:' + actor.id);
              if (b && !b.locomotion)
                bodies.set(b.texture + ':' + b.frame, {
                  texture: b.texture,
                  frame: b.frame,
                  source: b.source,
                  action: b.action,
                });
              for (const e of v.skillEffects.filter(
                (e) => !e.texture.startsWith('wave_feedback:'),
              ))
                effects.set(e.texture + ':' + e.frame, {
                  texture: e.texture,
                  frame: e.frame,
                  source: e.source,
                  effect: e.effect,
                });
              return { v, b };
            };
            await page.locator('#game canvas').focus();
            for (let attack = 0; attack < 6; attack++) {
              await wait(
                () => actor.cooldown <= w.tick && actor.actionUntil <= w.tick,
                'V9 A ready',
              );
              const id = (await read(page)).events.at(-1)?.id ?? 0;
              await page.keyboard.press('KeyA');
              await wait(
                async () =>
                  (await read(page)).events.some(
                    (e) =>
                      e.id > id &&
                      e.sourceId === actor.id &&
                      e.kind === 'attack' &&
                      e.abilityId === actor.basicId,
                  ),
                'V9 accepted A',
              );
              const end = w.tick + 24;
              let captured = false;
              const frames = new Set();
              while (w.tick < end) {
                const { v, b } = await sample();
                if (b && !b.locomotion) frames.add(b.texture + ':' + b.frame);
                if (
                  !captured &&
                  direction === 'right' &&
                  (attack === 0 || attack === 5) &&
                  b &&
                  !b.locomotion &&
                  v.skillEffects.length
                ) {
                  await page.screenshot({
                    path: resolve(
                      out,
                      `${baseline ? 'baseline-' : ''}${mode}-basic-${attack === 5 ? 'sixth' : 'palm'}.png`,
                    ),
                  });
                  captured = true;
                }
                await sleep(20);
              }
              attackBodies.push([...frames]);
            }
            const events = (await read(page)).events.filter(
              (e) =>
                e.id > before &&
                e.sourceId === actor.id &&
                e.abilityId === actor.basicId,
            );
            stages.push(
              ...events.filter((e) => e.kind === 'attack').map((e) => e.stage),
            );
            assert.deepEqual(
              stages,
              ['palm', 'palm', 'palm', 'palm', 'palm', 'dragon'],
              'five accepted palms followed by the genuine sixth dragon',
            );
            assert(
              events.some((e) => e.kind === 'hit'),
              'A resolves real hits',
            );
            await wait(async () => {
              const [a, b] = await Promise.all([
                read(page),
                read(pages[1 - index]),
              ]);
              return (
                a.state.creeps[target.id]?.hp === target.hp &&
                b.state.creeps[target.id]?.hp === target.hp
              );
            }, 'V9 A peer HP');
            const fxs = [...effects.values()];
            if (mode === 'current') {
              const original = report.cases.find((a) => a.mode === 'm3d');
              const originalEffects = new Set(
                original.effects.map((e) => e.source),
              );
              if (fxs.some((e) => e.source?.includes('/renovation-v')))
                report.violations.push(
                  'basic ' + direction + ' still uses renovated VFX',
                );
              if (
                attackBodies.some((frames) => frames.length === 0) ||
                ![...bodies.values()].every(
                  (b) =>
                    b.texture ===
                      'renovated-action-hero_cai_bang_chuong_actions' &&
                    b.action?.body === 'hero_cai_bang_chuong_actions',
                )
              )
                report.violations.push(
                  'basic ' +
                    direction +
                    ' must keep the renovated character body',
                );
              if (!fxs.every((e) => originalEffects.has(e.source)))
                report.violations.push(
                  'basic ' + direction + ' VFX differs from original M3D',
                );
              if (
                !fxs.some(
                  (e) => e.texture === 'retained_m3d_hoa_van_chuong_vfx',
                )
              )
                report.violations.push(
                  'basic ' + direction + ' missing original palm',
                );
              if (
                !fxs.some(
                  (e) =>
                    e.texture ===
                    'retained_m3d_cai_bang_chuong_dragon_v2_projectile',
                )
              )
                report.violations.push(
                  'basic ' + direction + ' missing original sixth dragon',
                );
              assert(
                new Set(
                  fxs
                    .filter(
                      (e) => e.texture === 'retained_m3d_hoa_van_chuong_vfx',
                    )
                    .map((e) => e.frame),
                ).size >= 2,
                'original palm animates',
              );
              await wait(
                async () =>
                  (await view(page)).renovation.bodies.some(
                    (b) =>
                      b.name === 'actor:' + actor.id &&
                      b.locomotion &&
                      b.texture === 'renovated-hero_cai_bang_chuong',
                  ),
                'V9 returns to approved renovated idle',
              );
            }
            report.cases.push({
              skill: 'cai_bang_chuong',
              mode,
              direction,
              stages,
              attackBodies,
              bodies: [...bodies.values()],
              effects: fxs,
              hits: events.filter((e) => e.kind === 'hit').length,
              peer: true,
            });
            if (mode === 'm3d') continue;
            await wait(
              async () =>
                !(await view(page)).renovation.skillEffects.some(
                  (e) => e.name === 'feedback-v2:cai_bang_chuong',
                ),
              'V9 prior basic FX finished',
            );
            await wait(() => actor.actionUntil <= w.tick, 'V9 Q ready');
            actor.mana = actor.maxMana;
            const qBefore = (await read(page)).events.at(-1)?.id ?? 0;
            effects.clear();
            bodies.clear();
            await page.keyboard.press('KeyQ');
            await wait(
              async () =>
                (await read(page)).events.some(
                  (e) =>
                    e.id > qBefore &&
                    e.sourceId === actor.id &&
                    e.kind === 'cast' &&
                    e.abilityId === 'phi_long_tai_thien',
                ),
              'V9 accepted Phi Long',
            );
            let captured = false;
            const end = w.tick + 40;
            while (w.tick < end) {
              const { v } = await sample();
              if (
                !captured &&
                direction === 'right' &&
                v.skillEffects.some((e) => e.effect === 'dragon_head')
              ) {
                await page.screenshot({
                  path: resolve(
                    out,
                    `${baseline ? 'baseline-' : ''}phi-long.png`,
                  ),
                });
                captured = true;
              }
              await sleep(20);
            }
            const qEvents = (await read(page)).events.filter(
              (e) =>
                e.id > qBefore &&
                e.sourceId === actor.id &&
                e.abilityId === 'phi_long_tai_thien',
            );
            assert(
              qEvents.some((e) => e.kind === 'hit'),
              'Phi Long resolves real hit',
            );
            const qFx = [...effects.values()];
            assert(
              qFx.some((e) => e.effect === 'dragon_head'),
              'retained new dragon head visible',
            );
            if (qFx.some((e) => e.texture === 'phi_long_tai_thien_vfx'))
              report.violations.push(
                'Phi Long ' + direction + ' still shows old hand wave',
              );
            await wait(
              async () =>
                (await read(peer)).state.creeps[target.id]?.hp === target.hp,
              'V9 Q peer HP',
            );
            report.cases.push({
              skill: 'phi_long_tai_thien',
              direction,
              bodies: [...bodies.values()],
              effects: qFx,
              hits: qEvents.filter((e) => e.kind === 'hit').length,
              peer: true,
            });
            console.log('[v9] ' + direction + ' real six A + Phi Long checked');
          }
        }
        if (!baseline)
          assert.deepEqual(
            report.violations,
            [],
            'M3D basic and no extra hand',
          );
        if (players === 6)
          report.party = await naturalParty({ room, pages, out, wait });
        report.status = baseline ? 'REPRODUCED' : 'PASS';
        writeFileSync(
          resolve(out, baseline ? 'baseline.json' : 'runtime.json'),
          JSON.stringify(report, null, 2) + '\n',
        );
        return report;
      },
    });
  } catch (error) {
    report.status = 'FAIL';
    report.error = String(error);
    writeFileSync(
      resolve(out, 'failure.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    throw error;
  }
}
