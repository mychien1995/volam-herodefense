import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { addCreep, refreshCharacter } from '@volam/game-core';
import { verifyRenovationRuntime } from './verify-renovation-runtime.mjs';
import { profiles, naturalParty } from './verify-renovation-v3.mjs';
import { waitForQa } from './qa-wait.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const read = (p) => p.evaluate(() => window.__VOLAM__.snapshot());
const view = (p) => p.evaluate(() => window.__VOLAM__.presentation());
const selected = [
  'liet_phong_dao',
  'bach_liet_thien_kich',
  'luong_nghi_thu',
  'that_tinh_kiem',
  'la_han_quyen',
  'vi_da_quyen',
  'tru_ta',
  'nhu_lai_thien_diep',
];
export async function verifyRenovationV4(
  browser,
  { before = false, development = false, players = 6, focused = false } = {},
) {
  const out = resolve('docs/evidence/renovation-v4');
  mkdirSync(out, { recursive: true });
  const result = {
    status: 'RUNNING',
    before,
    players,
    fixture:
      'Server-owned level30/max-rank loadouts and durable enemies. Real keyboard Q casts; no injected effects or damage.',
    cases: [],
  };
  const wait = (fn, label) => waitForQa(fn, label, { timeout: 15000 });
  try {
    return await verifyRenovationRuntime(browser, {
      players,
      development,
      evidenceDir: out,
      clientQuery: before ? '&renovationSkills=v3' : '',
      onReady: async ({ room, pages }) => {
        const page = pages[0],
          w = room.world,
          h = [...w.heroes.values()][0],
          c = room.simulation.arena.config;
        room.simulation.invasion.nextWaveTick = w.tick + 100000;
        room.simulation.dongTa.phase = 'waiting';
        for (const profile of profiles)
          for (const skill of profile.skills) {
            if (
              process.env.VOLAM_V4_SKILLS &&
              !process.env.VOLAM_V4_SKILLS.split(',').includes(skill)
            )
              continue;
            if (
              (before && !['la_han_quyen', 'tru_ta'].includes(skill)) ||
              (focused && !selected.includes(skill))
            )
              continue;
            for (const [direction, fx, fy] of selected.includes(skill) &&
            !before
              ? [
                  ['right', 1, 0],
                  ['left', -1, 0],
                  ['down', 0, 1],
                  ['up', 0, -1],
                ]
              : [
                  ['right', 1, 0],
                  ['left', -1, 0],
                ]) {
              w.creeps.clear();
              w.projectiles.clear();
              w.areas = [];
              w.actions = [];
              w.shots = [];
              w.combos = [];
              Object.assign(h, {
                schoolId: profile.school,
                basicId: profile.basic,
                level: 30,
                x: 600,
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
                castAbilityId: '',
                skillIds: [skill, '', '', ''],
                skillCooldowns: [0, 0, 0, 0],
                abilityCooldowns: {},
              });
              h.progression.mode = 'custom';
              h.progression.ranks = Object.fromEntries(
                profile.skills.map((id) => [
                  id,
                  c.progression.skills[id].ranks.length,
                ]),
              );
              h.progression.branchId = profile.basic;
              h.progression.revision++;
              room.state.players.get(h.id).schoolId = profile.school;
              refreshCharacter(h, c);
              h.hp = h.maxHp;
              h.mana = h.maxMana;
              for (const other of w.heroes.values())
                if (other !== h)
                  Object.assign(other, {
                    x: 1000,
                    y: 950,
                    moveX: 0,
                    moveY: 0,
                    statuses: [],
                    hp: other.maxHp,
                  });
              const range =
                skill === 'vi_da_quyen'
                  ? 200
                  : skill === 'luong_nghi_thu'
                    ? 180
                    : skill === 'nhu_lai_thien_diep'
                      ? 260
                      : 80;
              const dummy = addCreep(
                w,
                'v4_dummy',
                { x: h.x + fx * range, y: h.y + fy * range },
                c,
              );
              Object.assign(dummy, {
                archetypeId: 'creep_wild_dog',
                controlled: true,
                hp: 100000,
                maxHp: 100000,
                stats: {
                  ...c.creep,
                  hp: 100000,
                  damage: 0,
                  defense: 0,
                  xp: 0,
                  gold: 0,
                },
              });
              await wait(
                async () => {
                  const s = (await read(page)).state.players[h.id];
                  return (
                    s.basicId === profile.basic &&
                    s.qSkill === skill &&
                    s.fx === fx &&
                    s.fy === fy &&
                    s.pose === 'idle'
                  );
                },
                'ack ' + skill + direction,
              );
              const last = (await read(page)).events.at(-1)?.id ?? 0;
              // A returning claw from the previous right-facing cast is valid
              // while the hero turns left. Let retained transients finish.
              await wait(
                async () =>
                  !(await view(page)).renovation.skillEffects.some(
                    (e) =>
                      e.sourceHeading &&
                      (e.name?.includes(skill) ||
                        e.texture.startsWith(skill + '_')),
                  ),
                'previous FX settled ' + skill,
              );
              await page.locator('#game canvas').focus();
              await page.keyboard.press('KeyQ');
              await wait(
                async () =>
                  (await read(page)).events.some(
                    (e) =>
                      e.id > last &&
                      e.kind === 'cast' &&
                      e.abilityId === skill &&
                      e.sourceId === h.id,
                  ),
                'cast ' + skill + direction,
              );
              const duration = selected.includes(skill)
                ? ({
                    bach_liet_thien_kich: 1700,
                    that_tinh_kiem: 900,
                    liet_phong_dao: 1200,
                    nhu_lai_thien_diep: 1250,
                  }[skill] ?? 450)
                : 350;
              const effects = new Map(),
                frames = new Set(),
                bodies = new Set();
              let captured = false,
                groundCaptured = false;
              const until = performance.now() + duration;
              const untilTick =
                w.tick +
                (skill === 'nhu_lai_thien_diep'
                  ? 65
                  : skill === 'bach_liet_thien_kich'
                    ? 52
                    : skill === 'liet_phong_dao'
                      ? 32
                      : skill === 'that_tinh_kiem'
                        ? 25
                        : 20);
              while (performance.now() < until || w.tick < untilTick) {
                assert(
                  performance.now() < until + 15000,
                  'server tick stalled ' + skill,
                );
                const v = await view(page);
                for (const b of v.renovation.bodies)
                  if (
                    b.name === 'actor:' + h.id &&
                    b.action?.ability === skill
                  ) {
                    frames.add(b.texture + ':' + b.frame);
                    bodies.add(b.source);
                  }
                for (const e of v.renovation.skillEffects) {
                  effects.set(
                    e.texture +
                      ':' +
                      e.frame +
                      ':' +
                      e.rotation +
                      ':' +
                      e.flipX,
                    e,
                  );
                  const native =
                    e.texture.startsWith('renovated-v4-') &&
                    e.name === 'renovation-v4:' + skill;
                  const frontalLegacy =
                    (e.name?.includes(skill) ||
                      e.texture.startsWith(skill + '_')) &&
                    ![
                      'thien_ha_vo_cau',
                      'luc_duong_dung_tuyet',
                      'bach_phien_phong_bao',
                      'toan_phong_thoai',
                      'vo_anh_cuoc',
                    ].includes(skill);
                  if (!before && e.sourceHeading && (native || frontalLegacy)) {
                    const heading = e.velocity ?? [fx, fy];
                    if (!/earth_eruption|liet_phong_overhead/.test(e.texture)) {
                      const sx = e.sourceHeading[0] * (e.flipX ? -1 : 1),
                        sy = e.sourceHeading[1],
                        ax =
                          sx * Math.cos(e.rotation) - sy * Math.sin(e.rotation),
                        ay =
                          sx * Math.sin(e.rotation) + sy * Math.cos(e.rotation);
                      assert(
                        (ax * heading[0] + ay * heading[1]) /
                          Math.hypot(...heading) >
                          (native ? 0.99 : 0.5),
                        skill +
                          ' wrong world direction ' +
                          direction +
                          ' ' +
                          JSON.stringify(e),
                      );
                    }
                    if (e.texture.startsWith('renovated-v4-'))
                      assert.equal(
                        Math.abs(e.scale[0]),
                        Math.abs(e.scale[1]),
                        skill + ' distorted ratio',
                      );
                  }
                  if (
                    !before &&
                    native &&
                    skill === 'vi_da_quyen' &&
                    e.texture.endsWith('earth_eruption')
                  ) {
                    assert(
                      Math.abs(e.x - (h.x + fx * 189)) < 0.01,
                      'Vi Da horizontal origin',
                    );
                    assert(
                      Math.abs(e.y - (h.y + fy * 189)) < 0.01,
                      'Vi Da ground origin',
                    );
                    assert.deepEqual(e.origin, [0.5, 212 / 256]);
                  }
                }
                if (
                  !captured &&
                  selected.includes(skill) &&
                  ['right', 'left'].includes(direction) &&
                  v.renovation.skillEffects.some(
                    (e) =>
                      before ||
                      skill === 'la_han_quyen' ||
                      e.name === 'renovation-v4:' + skill,
                  ) &&
                  performance.now() > until - duration + 100
                ) {
                  await page.screenshot({
                    path: resolve(
                      out,
                      (before ? 'before-' : '') +
                        skill +
                        '-' +
                        direction +
                        '.png',
                    ),
                  });
                  captured = true;
                }
                if (
                  !before &&
                  !groundCaptured &&
                  skill === 'liet_phong_dao' &&
                  ['left', 'right'].includes(direction) &&
                  v.renovation.skillEffects.some(
                    (e) => e.texture === 'renovated-v4-earth_eruption',
                  )
                ) {
                  await page.screenshot({
                    path: resolve(
                      out,
                      'liet_phong_dao-ground-' + direction + '.png',
                    ),
                  });
                  groundCaptured = true;
                }
                await sleep(25);
              }
              const events = (await read(page)).events.filter(
                (e) =>
                  e.id > last && e.sourceId === h.id && e.abilityId === skill,
              );
              if (
                !before &&
                selected.includes(skill) &&
                skill !== 'la_han_quyen'
              )
                assert(
                  [...effects.values()].some((e) =>
                    e.texture.startsWith('renovated-v4-'),
                  ),
                  skill +
                    ' new art missing ' +
                    direction +
                    ' ' +
                    JSON.stringify({
                      hero: [h.x, h.y, h.hp, h.statuses],
                      dummy: [dummy.x, dummy.y, dummy.hp],
                      areas: w.areas,
                      shots: [...w.projectiles.values()],
                      events,
                      effects: [...effects.values()],
                    }),
                );
              if (!before && skill === 'bach_liet_thien_kich') {
                assert.equal(
                  events.filter(
                    (e) => e.kind === 'pulse' && e.stage === 'sweep',
                  ).length,
                  10,
                );
                assert.equal(
                  events.filter(
                    (e) => e.kind === 'pulse' && e.stage === 'finisher',
                  ).length,
                  1,
                );
              }
              if (!before && skill === 'that_tinh_kiem')
                assert.equal(
                  events.filter(
                    (e) => e.kind === 'pulse' && e.stage === 'sweep',
                  ).length,
                  4,
                );
              assert(frames.size > 0, skill + ' missing renovated cast body');
              result.cases.push({
                skill,
                direction,
                castFrames: [...frames],
                bodies: [...bodies],
                effects: [...effects.values()],
                events: events.map((e) => ({
                  kind: e.kind,
                  stage: e.stage,
                  fx: e.fx,
                  fy: e.fy,
                })),
              });
              console.log(
                '[v4] ' +
                  skill +
                  ' ' +
                  direction +
                  ' ' +
                  effects.size +
                  ' FX frames',
              );
            }
          }
        if (players === 6)
          result.party = await naturalParty({ room, pages, out, wait });
        result.status = 'PASS';
        writeFileSync(
          resolve(out, before ? 'before-directions.json' : 'runtime.json'),
          JSON.stringify(result, null, 2),
        );
        return result;
      },
    });
  } catch (e) {
    result.status = 'FAIL';
    result.error = String(e);
    writeFileSync(
      resolve(out, before ? 'before-directions.json' : 'runtime.json'),
      JSON.stringify(result, null, 2),
    );
    throw e;
  }
}
if (import.meta.main) {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.VOLAM_REVIEW_CHROMIUM ??
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  try {
    await verifyRenovationV4(browser, {
      before: process.argv.includes('--before'),
      development: true,
      players: 2,
      focused: process.argv.includes('--focused'),
    });
  } finally {
    await browser.close();
  }
}
