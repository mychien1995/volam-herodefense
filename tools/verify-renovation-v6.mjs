import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { addCreep, refreshCharacter } from '@volam/game-core';
import { verifyRenovationRuntime } from './verify-renovation-runtime.mjs';
import { profiles, naturalParty } from './verify-renovation-v3.mjs';
import { verifyRenovationBosses } from './verify-renovation-v3-bosses.mjs';
import { waitForQa } from './qa-wait.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const read = (p) => p.evaluate(() => window.__VOLAM__.snapshot());
const view = (p) => p.evaluate(() => window.__VOLAM__.presentation());
const wanted = [
  'hoa_van_chuong',
  'khang_long_huu_hoi',
  'hang_long_hoa_vu',
  'pha_giap_bong',
  'bach_liet_thien_kich',
  'thai_cuc_tran',
];
export async function verifyRenovationV6(
  browser,
  { players = 2, development = true, scope = 'heroes' } = {},
) {
  const out = resolve('docs/evidence/renovation-v6');
  mkdirSync(out, { recursive: true });
  const report = {
    status: 'RUNNING',
    scope,
    players,
    cases: [],
    fixture:
      'Real keyboard casts, server-owned legal builds and durable targets. Real encounter phases selected on the server for coverage, not a natural boss-clear claim. No injected hit or damage outcomes.',
  };
  const wait = (fn, label) => waitForQa(fn, label, { timeout: 18000 });
  try {
    return await verifyRenovationRuntime(browser, {
      players,
      development,
      evidenceDir: out,
      onReady: async ({ room, pages }) => {
        const p = pages[0],
          peer = pages[1],
          w = room.world,
          h = [...w.heroes.values()][0],
          c = room.simulation.arena.config;
        room.simulation.invasion.nextWaveTick = w.tick + 100000;
        room.simulation.dongTa.phase = 'waiting';
        if (scope === 'bosses') {
          process.env.VOLAM_V3_BOSS_GROUP =
            process.env.VOLAM_V6_BOSS_GROUP ??
            'dong-ta,mai_sieu_phong,hoang_dung,tay-doc,nam-de,bac-cai,vuong';
          report.bosses = await verifyRenovationBosses({
            room,
            pages,
            out,
            full: false,
            allowM3d: true,
            followup: true,
          });
          delete process.env.VOLAM_V3_BOSS_GROUP;
        } else {
          for (const skill of wanted.filter(
            (id) =>
              !process.env.VOLAM_V6_SKILLS ||
              process.env.VOLAM_V6_SKILLS.split(',').includes(id),
          )) {
            const profile = profiles.find((a) => a.skills.includes(skill));
            assert(profile, skill);
            for (const [direction, fx, fy] of [
              ['right', 1, 0],
              ['left', -1, 0],
              ['down', 0, 1],
              ['up', 0, -1],
            ]) {
              w.creeps.clear();
              w.projectiles.clear();
              w.actions = [];
              w.areas = [];
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
              Object.assign(h.progression, {
                mode: 'custom',
                ranks: Object.fromEntries(
                  profile.skills.map((id) => [
                    id,
                    c.progression.skills[id].ranks.length,
                  ]),
                ),
                branchId: profile.basic,
                revision: h.progression.revision + 1,
              });
              room.state.players.get(h.id).schoolId = profile.school;
              refreshCharacter(h, c);
              h.hp = h.maxHp;
              h.mana = h.maxMana;
              const distance = skill === 'hang_long_hoa_vu' ? 180 : 70,
                e = addCreep(
                  w,
                  'v6_target',
                  { x: h.x + fx * distance, y: h.y + fy * distance },
                  c,
                );
              Object.assign(e, {
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
              await wait(
                async () => {
                  const a = (await read(p)).state.players[h.id];
                  return (
                    a.qSkill === skill &&
                    a.fx === fx &&
                    a.fy === fy &&
                    a.pose === 'idle'
                  );
                },
                'ack ' + skill + direction,
              );
              await wait(
                async () =>
                  !(await view(p)).renovation.skillEffects.some((a) =>
                    a.name?.endsWith(':' + skill),
                  ),
                'prior ' + skill,
              );
              const before = (await read(p)).events.at(-1)?.id ?? 0;
              const observedBefore = new Set(
                Object.keys((await view(p)).renovation.observed),
              );
              const frames = new Set(),
                effects = new Map(),
                headings = new Set(),
                phases = new Set();
              let captured = false,
                crackCaptured = false;
              await p.locator('#game canvas').focus();
              await p.keyboard.press('KeyQ');
              await wait(
                async () =>
                  (await read(p)).events.some(
                    (a) =>
                      a.id > before &&
                      a.kind === 'cast' &&
                      a.abilityId === skill &&
                      a.sourceId === h.id,
                  ),
                'cast ' + skill,
              );
              const until =
                w.tick +
                (skill === 'hang_long_hoa_vu'
                  ? 100
                  : skill === 'bach_liet_thien_kich'
                    ? 55
                    : skill === 'khang_long_huu_hoi'
                      ? 30
                      : 32);
              while (w.tick < until) {
                const v = (await view(p)).renovation,
                  b = v.bodies.find((b) => b.name === 'actor:' + h.id);
                if (b && !b.locomotion) frames.add(b.texture + ':' + b.frame);
                if (skill === 'pha_giap_bong')
                  for (const f of v.observed.hero_cai_bang ?? [])
                    if (
                      f.startsWith(
                        'renovated-v6-staff_action:' + direction + '_',
                      )
                    )
                      frames.add(f);
                for (const a of v.skillEffects) {
                  effects.set(a.texture + ':' + a.frame, a);
                  if (a.authoredHeading) headings.add(a.authoredHeading);
                  if (a.projectileStage) phases.add(a.projectileStage);
                  if (a.texture === 'renovated-v6-dragon_turns') {
                    assert.equal(a.rotation, 0, 'dragon raster rotation');
                    assert(
                      /^(right|down_right|down|up_right|up)_\d$/.test(
                        String(a.frame),
                      ),
                    );
                  }
                }
                const contact =
                  skill === 'pha_giap_bong'
                    ? b?.texture === 'renovated-v6-staff_action' &&
                      Number(String(b.frame).split('_').at(-1)) >= 2
                    : effects.size > 0;
                if (!captured && direction === 'right' && contact) {
                  await p.screenshot({ path: resolve(out, skill + '.png') });
                  captured = true;
                }
                if (
                  !crackCaptured &&
                  direction === 'right' &&
                  skill === 'pha_giap_bong' &&
                  v.skillEffects.some(
                    (a) =>
                      a.texture === 'renovated-v6-staff_crack' &&
                      Number(a.frame) >= 2,
                  )
                ) {
                  await p.screenshot({
                    path: resolve(out, 'pha_giap_bong-crack.png'),
                  });
                  crackCaptured = true;
                }
                await sleep(25);
              }
              const event = (await read(p)).events.filter(
                  (a) =>
                    a.id > before &&
                    a.sourceId === h.id &&
                    a.abilityId === skill,
                ),
                fxs = [...effects.values()];
              let shown = (await view(p)).renovation.observed;
              if (skill === 'hoa_van_chuong') {
                assert(
                  fxs.some(
                    (a) =>
                      a.texture ===
                      'retained_m3d_cai_bang_chuong_dragon_v2_projectile',
                  ),
                  'M3D palm projectile',
                );
                assert(!fxs.some((a) => a.effect === 'dragon_head'));
              }
              if (skill === 'khang_long_huu_hoi') {
                assert(
                  !fxs.some((a) =>
                    [
                      'khang_long_huu_hoi_vfx',
                      'm3d_khang_long_huu_hoi_vfx',
                    ].includes(a.texture),
                  ),
                  'hand hidden',
                );
                assert(
                  fxs.some((a) => a.texture === 'm3d_khang_long_burn_vfx'),
                  'burn ring retained',
                );
              }
              if (skill === 'hang_long_hoa_vu') {
                for (const [key, directions] of Object.entries(shown))
                  if (
                    key.startsWith('v6:dragon_heading:') &&
                    !observedBefore.has(key)
                  )
                    for (const direction of directions) headings.add(direction);
                assert.equal(
                  headings.size,
                  8,
                  'authored camera views around full orbit',
                );
                assert(event.some((a) => a.stage === 'dragon_impact'));
                assert.equal(
                  event.filter((a) => a.kind === 'hit' && a.targetId === e.id)
                    .length,
                  1,
                );
              }
              if (skill === 'pha_giap_bong') {
                // Simulation ticks can finish this sampling window before the
                // separately received client effect has finished its lifetime.
                // Await real displayed cels rather than extending the game clock.
                await wait(
                  async () => {
                    shown = (await view(p)).renovation.observed;
                    return ['staff_arc', 'staff_crack'].every(
                      (id) =>
                        (shown['v6:' + id + ':' + h.id + ':' + fx + ':' + fy]
                          ?.length ?? 0) >= 3,
                    );
                  },
                  'displayed staff arc/crack ' +
                    direction +
                    ' ' +
                    JSON.stringify(
                      Object.fromEntries(
                        Object.entries(shown).filter(([key]) =>
                          key.startsWith('v6:staff'),
                        ),
                      ),
                    ),
                );
                for (const i of [0, 1, 2, 3])
                  assert(
                    [...frames].some(
                      (f) =>
                        f.endsWith('_' + i) &&
                        f.startsWith('renovated-v6-staff_action'),
                    ),
                    'attached staff pose ' + i,
                  );
                for (const id of ['staff_arc', 'staff_crack'])
                  assert(
                    (shown['v6:' + id + ':' + h.id + ':' + fx + ':' + fy]
                      ?.length ?? 0) >= 3,
                    id + ' distinct displayed cels',
                  );
                assert(
                  !fxs.some((a) => a.effect === 'staff_slam'),
                  'floating prop removed',
                );
              }
              if (skill === 'bach_liet_thien_kich')
                assert(
                  fxs.some(
                    (a) =>
                      a.effect === 'blossom_slashes' && a.bounds.width > 250,
                  ),
                  'larger forward cuts',
                );
              if (skill === 'thai_cuc_tran') {
                assert(
                  !fxs.some((a) => a.effect === 'tai_chi_dome'),
                  'dome removed',
                );
                assert(
                  w.areas.some(
                    (a) => a.abilityId === skill && a.effect.confines,
                  ),
                  'confinement retained',
                );
              }
              e.invulnerable = true;
              const hp = e.hp;
              await wait(async () => {
                const [a, b] = await Promise.all([read(p), read(peer)]);
                return (
                  a.state.creeps[e.id].hp === hp &&
                  b.state.creeps[e.id].hp === hp
                );
              }, 'peer ' + skill);
              report.cases.push({
                skill,
                direction,
                frames: [...frames],
                headings: [...headings],
                phases: [...phases],
                effects: fxs.map((a) => ({
                  texture: a.texture,
                  frame: a.frame,
                  source: a.source,
                  effect: a.effect,
                })),
                events: event.map((a) => ({
                  kind: a.kind,
                  stage: a.stage,
                  damage: a.damage,
                })),
                peer: true,
              });
              console.log('[v6] ' + skill + ' ' + direction + ' PASS');
            }
          }
          if (players === 6)
            report.party = await naturalParty({ room, pages, out, wait });
        }
        report.status = 'PASS';
        writeFileSync(
          resolve(out, scope + '-runtime.json'),
          JSON.stringify(report, null, 2),
        );
        return report;
      },
    });
  } catch (e) {
    report.status = 'FAIL';
    report.error = String(e);
    writeFileSync(
      resolve(out, scope + '-failure.json'),
      JSON.stringify(report, null, 2),
    );
    throw e;
  }
}
