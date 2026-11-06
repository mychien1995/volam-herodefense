import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { addCreep, refreshCharacter } from '@volam/game-core';
import { verifyRenovationRuntime } from './verify-renovation-runtime.mjs';
import { profiles, naturalParty } from './verify-renovation-v3.mjs';
import { waitForQa } from './qa-wait.mjs';
import { verifyRenovationBosses } from './verify-renovation-v3-bosses.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const read = (p) => p.evaluate(() => window.__VOLAM__.snapshot());
const view = (p) => p.evaluate(() => window.__VOLAM__.presentation());
const skills = [
  'hoa_van_chuong',
  'phi_long_tai_thien',
  'hang_long_hoa_vu',
  'hoanh_tao_bong',
  'pha_giap_bong',
  'cam_long_cong',
  'thien_ha_vo_cau',
  'truy_hon_dao',
  'liet_phong_dao',
  'bach_liet_thien_kich',
  'thai_cuc_tran',
  'luong_nghi_thu',
  'that_tinh_kiem',
  'la_han_quyen',
  'vi_da_quyen',
  'tru_ta',
  'tam_gioi_quy_thien',
];
const originals = new Set(['thien_ha_vo_cau', 'tam_gioi_quy_thien']);
export async function verifyRenovationV5(
  browser,
  {
    players = 2,
    development = true,
    full = false,
    bosses = false,
    scope = 'all',
  } = {},
) {
  const out = resolve('docs/evidence/renovation-v5');
  mkdirSync(out, { recursive: true });
  const report = {
    status: 'RUNNING',
    players,
    cases: [],
    basics: [],
    fixture:
      'Server-owned legal max-rank builds and durable targets. Real keyboard casts, authoritative phase/hit events and peer state; no injected visual outcomes.',
  };
  const wait = (fn, label) => waitForQa(fn, label, { timeout: 18000 });
  try {
    return await verifyRenovationRuntime(browser, {
      players,
      development,
      evidenceDir: out,
      clientQuery: '&renovationSkills=v5',
      onSelection: async ({ page }) => {
        await wait(
          async () =>
            (await page.locator('.school-window .school-portrait').count()) ===
            4,
          'school portraits',
        );
        const backgrounds = await page
          .locator('.school-window .school-portrait')
          .evaluateAll((nodes) =>
            nodes.map((n) => getComputedStyle(n).backgroundImage),
          );
        assert(
          backgrounds.every((s) => s.includes('/renovation-v5/portrait-hero_')),
        );
        await page.screenshot({ path: resolve(out, 'school-selection.png') });
        report.portraits = backgrounds;
      },
      onReady: async ({ room, pages }) => {
        const page = pages[0],
          peer = pages[1],
          w = room.world,
          h = [...w.heroes.values()][0],
          c = room.simulation.arena.config;
        room.simulation.invasion.nextWaveTick = w.tick + 100000;
        room.simulation.dongTa.phase = 'waiting';
        const clear = () => {
          w.creeps.clear();
          w.projectiles.clear();
          w.areas = [];
          w.shots = [];
          w.actions = [];
          w.combos = [];
        };
        const setup = (profile, skill, fx, fy) => {
          clear();
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
            basicChains: {},
            basicChainDeadline: undefined,
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
                x: 1050,
                y: 900,
                hp: other.maxHp,
                statuses: [],
                moveX: 0,
                moveY: 0,
              });
        };
        const target = (fx, fy, range) => {
          const e = addCreep(
            w,
            'v5_dummy',
            { x: h.x + fx * range, y: h.y + fy * range },
            c,
          );
          Object.assign(e, {
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
          return e;
        };
        if (!process.env.VOLAM_V5_ONLY_BOSSES && scope !== 'bosses') {
          for (const profile of profiles)
            for (const skill of profile.skills.filter(
              (id) =>
                scope !== 'basics' &&
                !process.env.VOLAM_V5_ONLY_BASICS &&
                skills.includes(id) &&
                (!process.env.VOLAM_V5_SKILLS ||
                  process.env.VOLAM_V5_SKILLS.split(',').includes(id)),
            ))
              for (const [direction, fx, fy] of full
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
                setup(profile, skill, fx, fy);
                const dummy = target(
                  fx,
                  fy,
                  skill === 'hang_long_hoa_vu'
                    ? 180
                    : skill === 'vi_da_quyen'
                      ? 200
                      : skill === 'truy_hon_dao' ||
                          skill === 'hoa_van_chuong' ||
                          skill === 'phi_long_tai_thien'
                        ? 180
                        : 70,
                );
                await wait(
                  async () => {
                    const s = (await read(page)).state.players[h.id];
                    return (
                      s.qSkill === skill &&
                      s.basicId === profile.basic &&
                      s.fx === fx &&
                      s.fy === fy &&
                      s.pose === 'idle'
                    );
                  },
                  'ack ' + skill + direction,
                );
                await wait(
                  async () =>
                    !(await view(page)).renovation.skillEffects.some((e) =>
                      e.name?.endsWith(':' + skill),
                    ),
                  'prior effect done ' + skill,
                );
                const before = (await read(page)).events.at(-1)?.id ?? 0;
                await page.locator('#game canvas').focus();
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
                  'real cast ' + skill + direction,
                );
                const deadline =
                    w.tick +
                    (skill === 'hang_long_hoa_vu'
                      ? 100
                      : skill === 'bach_liet_thien_kich'
                        ? 55
                        : skill === 'thai_cuc_tran'
                          ? 35
                          : skill === 'liet_phong_dao'
                            ? 36
                            : skill === 'that_tinh_kiem'
                              ? 28
                              : 22),
                  timeout = performance.now() + 20000;
                const effects = new Map(),
                  frames = new Set(),
                  sources = new Set(),
                  phases = new Set();
                let png = false;
                while (w.tick < deadline) {
                  assert(performance.now() < timeout, 'tick stall ' + skill);
                  const v = await view(page);
                  const b = v.renovation.bodies.find(
                    (b) => b.name === 'actor:' + h.id,
                  );
                  // The renderer records every presented cel. Browser RPCs
                  // can miss a short intermediate pose with six live canvases.
                  if (skill === 'vi_da_quyen')
                    for (const f of v.renovation.observed.hero_thieu_lam ?? [])
                      if (
                        f.startsWith(
                          'renovated-v5-vi_da_body:' + direction + '_',
                        )
                      )
                        frames.add(f);
                  if (b && !b.locomotion) {
                    frames.add(b.texture + ':' + b.frame);
                    sources.add(b.source);
                    if (originals.has(skill))
                      assert(
                        !b.texture.startsWith('renovated-action-'),
                        skill + ' body should be M3D',
                      );
                    else
                      assert(
                        /renovation-v[235]/.test(b.source),
                        skill + ' unexpected body ' + b.source,
                      );
                  }
                  for (const e of v.renovation.skillEffects) {
                    effects.set(
                      e.texture + ':' + e.frame + ':' + e.rotation,
                      e,
                    );
                    if (e.projectileStage) phases.add(e.projectileStage);
                    if (
                      e.texture.startsWith('renovated-v5-') &&
                      e.sourceHeading &&
                      !e.shadow &&
                      e.velocity
                    ) {
                      const sx = e.sourceHeading[0] * (e.flipX ? -1 : 1),
                        sy = e.sourceHeading[1],
                        x =
                          sx * Math.cos(e.rotation) - sy * Math.sin(e.rotation),
                        y =
                          sx * Math.sin(e.rotation) + sy * Math.cos(e.rotation);
                      assert(
                        (x * e.velocity[0] + y * e.velocity[1]) /
                          Math.hypot(...e.velocity) >
                          0.99,
                        skill + ' direction ' + direction,
                      );
                    }
                  }
                  if (
                    !png &&
                    direction === 'left' &&
                    (skill === 'vi_da_quyen'
                      ? b?.action?.body === 'v5:vi_da_body' &&
                        Number(String(b.frame).split('_').at(-1)) >= 2
                      : v.renovation.skillEffects.some(
                          (e) =>
                            e.name === 'renovation-v5:' + skill ||
                            e.name === 'feedback-v2:' + skill ||
                            e.texture.startsWith('retained_m3d_'),
                        ))
                  ) {
                    await page.screenshot({
                      path: resolve(out, skill + '-left.png'),
                    });
                    png = true;
                  }
                  await sleep(35);
                }
                const events = (await read(page)).events.filter(
                  (e) =>
                    e.id > before &&
                    e.abilityId === skill &&
                    e.sourceId === h.id,
                );
                assert(frames.size, skill + ' no cast body observed');
                if (skill === 'that_tinh_kiem')
                  assert.equal(
                    events.filter(
                      (e) => e.kind === 'pulse' && e.stage === 'sweep',
                    ).length,
                    7,
                  );
                if (skill === 'bach_liet_thien_kich') {
                  assert.equal(
                    events.filter(
                      (e) => e.kind === 'pulse' && e.stage === 'sweep',
                    ).length,
                    10,
                  );
                  assert(
                    [...effects.values()].some((e) => e.effect === 'foot_wind'),
                  );
                  assert([...frames].some((f) => f.includes('bach_liet_body')));
                }
                if (skill === 'hang_long_hoa_vu') {
                  for (const phase of [
                    'dragon_forward',
                    'dragon_orbit',
                    'dragon_rise',
                    'dragon_dive',
                  ])
                    assert(
                      phases.has(phase),
                      'missing ' + phase + ' ' + direction,
                    );
                  assert.equal(
                    events.filter((e) => e.stage === 'dragon_impact').length,
                    1,
                  );
                  assert.equal(
                    events.filter(
                      (e) => e.kind === 'hit' && e.targetId === dummy.id,
                    ).length,
                    1,
                  );
                }
                if (skill === 'luong_nghi_thu')
                  assert(
                    [...effects.values()].some((e) =>
                      e.texture.startsWith(
                        'retained_m3d_vo_dang_hands_v2_projectile',
                      ),
                    ),
                    'original yin-yang source',
                  );
                if (skill === 'thai_cuc_tran')
                  assert(
                    [...effects.values()].some(
                      (e) => e.effect === 'tai_chi_dome',
                    ),
                  );
                if (skill === 'pha_giap_bong')
                  assert(
                    new Set(
                      [...effects.values()]
                        .filter((e) => e.effect === 'staff_slam')
                        .map((e) => e.frame),
                    ).size > 1,
                    'staff descends through distinct cels',
                  );
                if (skill === 'liet_phong_dao') {
                  assert(
                    [...effects.values()].some(
                      (e) => e.effect === 'blue_fissure',
                    ),
                  );
                  assert(
                    ![...effects.values()].some(
                      (e) => e.texture === 'renovated-v4-earth_eruption',
                    ),
                  );
                }
                if (skill === 'la_han_quyen') {
                  assert(
                    [...effects.values()].some(
                      (e) => e.texture === 'retained_m3d_lahan_guard',
                    ),
                  );
                  assert(
                    ![...effects.values()].some(
                      (e) =>
                        e.texture === 'la_han_quyen_vfx' &&
                        /^guard/.test(e.frame),
                    ),
                  );
                }
                if (skill === 'vi_da_quyen')
                  for (const index of [0, 1, 2, 3])
                    assert(
                      [...frames].some(
                        (f) =>
                          f.includes('vi_da_body') && f.endsWith('_' + index),
                      ),
                      'ground punch pose ' +
                        index +
                        ' ' +
                        direction +
                        '; rendered ' +
                        [...frames],
                    );
                // End the durable target's observation window before comparing
                // asynchronous patches. Long channels otherwise deal another
                // valid hit between the two sequential browser reads.
                dummy.invulnerable = true;
                const settledHp = dummy.hp;
                await wait(async () => {
                  const [a, b] = await Promise.all([read(page), read(peer)]);
                  return (
                    a.state.creeps.v5_dummy.hp === settledHp &&
                    b.state.creeps.v5_dummy.hp === settledHp
                  );
                }, 'peer settled HP ' + skill);
                report.cases.push({
                  skill,
                  direction,
                  frames: [...frames],
                  sources: [...sources],
                  phases: [...phases],
                  effects: [...effects.values()],
                  events: events.map((e) => ({
                    kind: e.kind,
                    stage: e.stage,
                    damage: e.damage,
                  })),
                  peer: true,
                });
                console.log('[v5] ' + skill + ' ' + direction + ' PASS');
              }
          if (!process.env.VOLAM_V5_SKILLS && scope !== 'schools') {
            const profile = profiles.find((p) => p.basic === 'thieu_lam_quyen');
            for (const [direction, fx, fy] of [
              ['right', 1, 0],
              ['left', -1, 0],
              ['down', 0, 1],
              ['up', 0, -1],
            ]) {
              setup(profile, 'la_han_quyen', fx, fy);
              target(fx, fy, 180);
              await wait(
                async () =>
                  (await read(page)).state.players[h.id].basicId ===
                  'thieu_lam_quyen',
                'basic branch',
              );
              await page.locator('#game canvas').focus();
              let before = (await read(page)).events.at(-1)?.id ?? 0;
              const seen = [];
              for (const stage of [
                'left_fist',
                'right_fist',
                'front_kick',
                'roundhouse_kick',
              ]) {
                await page.keyboard.press('KeyA');
                await wait(
                  async () =>
                    (await read(page)).events.some(
                      (e) =>
                        e.id > before &&
                        e.kind === 'attack' &&
                        e.sourceId === h.id &&
                        e.stage === stage,
                    ),
                  'A ' + stage,
                );
                const until = w.tick + 7;
                while (w.tick < until) {
                  seen.push((await view(page)).renovation);
                  await sleep(20);
                }
              }
              const ev = (await read(page)).events.filter(
                (e) =>
                  e.id > before && e.kind === 'attack' && e.sourceId === h.id,
              );
              assert.deepEqual(
                ev.map((e) => e.stage),
                ['left_fist', 'right_fist', 'front_kick', 'roundhouse_kick'],
              );
              assert(
                seen.some((v) =>
                  v.skillEffects.some(
                    (e) => e.effect === 'azure_crescent' && e.velocity,
                  ),
                ),
                'roundhouse travelling crescent',
              );
              const bodyFrames = seen.flatMap((v) =>
                v.bodies
                  .filter((b) => b.name === 'actor:' + h.id)
                  .map((b) => String(b.frame)),
              );
              for (const index of [0, 1, 2, 3])
                assert(
                  bodyFrames.some((f) => f.endsWith('_' + index)),
                  'missing Shaolin pose ' + index + ' ' + direction,
                );
              for (const effect of seen
                .flatMap((v) => v.skillEffects)
                .filter((e) => e.effect === 'azure_crescent' && e.velocity)) {
                assert(
                  effect.velocity[0] * fx + effect.velocity[1] * fy > 0,
                  'crescent travels forward ' + direction,
                );
                const sx = effect.flipX ? -1 : 1;
                assert(
                  sx * Math.cos(effect.rotation) * fx +
                    sx * Math.sin(effect.rotation) * fy >
                    0.99,
                  'crescent cutting edge faces travel ' + direction,
                );
              }
              report.basics.push({
                direction,
                stages: ev.map((e) => e.stage),
                frames: [
                  ...new Set(
                    seen.flatMap((v) =>
                      v.bodies
                        .filter((b) => b.name === 'actor:' + h.id)
                        .map((b) => b.texture + ':' + b.frame),
                    ),
                  ),
                ],
              });
            }
          }
        }
        if (bosses) {
          process.env.VOLAM_V3_BOSS_GROUP =
            process.env.VOLAM_V5_BOSS_GROUP ?? 'chu,hong-liet,kim,ly-mac-sau';
          report.bosses = await verifyRenovationBosses({
            room,
            pages,
            out,
            full,
            allowM3d: true,
          });
          delete process.env.VOLAM_V3_BOSS_GROUP;
        }
        if (players === 6)
          report.party = await naturalParty({ room, pages, out, wait });
        report.status = 'PASS';
        writeFileSync(
          resolve(
            out,
            scope === 'all'
              ? development
                ? 'iteration.json'
                : 'runtime.json'
              : scope + '-runtime.json',
          ),
          JSON.stringify(report, null, 2),
        );
        return report;
      },
    });
  } catch (e) {
    report.status = 'FAIL';
    report.error = String(e);
    writeFileSync(
      resolve(out, 'failure.json'),
      JSON.stringify(report, null, 2),
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
    await verifyRenovationV5(browser, {
      bosses: process.argv.includes('--bosses'),
      full: process.argv.includes('--full'),
    });
  } finally {
    await browser.close();
  }
}
