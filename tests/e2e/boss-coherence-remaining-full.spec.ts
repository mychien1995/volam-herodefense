import { test } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifyRenovationRuntime } from '../../tools/verify-renovation-runtime.mjs';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
import { waitForQa } from '../../tools/qa-wait.mjs';
import { bossFixture } from './boss-coherence-fixture.js';
import { bossActionPoses } from '../../apps/game-client/src/boss-unified-actions.js';

test('remaining boss bodies follow native phases, casts and peer replication', async ({
  browser,
}) => {
  const before = process.env['VOLAM_BOSS_BEFORE'] === '1';
  const ids = (
    process.env['VOLAM_BOSS_IDS'] ??
    'vuong_trung_duong_p1,vuong_trung_duong_p2,chu_ba_thong,hoan_nhan_hong_liet,kim_luan,ly_mac_sau'
  ).split(',');
  await verifyRenovationRuntime(browser, {
    players: Number(process.env['VOLAM_BOSS_PLAYERS'] ?? 2),
    compareLegacy: false,
    selectionTimeout: 120000,
    clientDist: '.cache/boss-coherence-dist',
    clientQuery: before ? '&bossCoherence=0' : '',
    evidenceDir: qaEvidenceDirectory('docs/evidence/boss-remaining-full'),
    onReady: async ({ room, pages, out }: any) => {
      mkdirSync(out, { recursive: true });
      const report: any = {
        status: 'RUNNING',
        before,
        clients: pages.length,
        scope:
          'server-owned spawn/phase/schedule prerequisites, native controller releases and replicated body presentation; not natural progression, balance, successful QTE or loot acceptance',
        cases: [],
      };
      const save = () =>
        writeFileSync(
          resolve(out, 'verification.json'),
          JSON.stringify(report, null, 2),
        );
      const wait = (fn: any, label: string) =>
        waitForQa(fn, label, { timeout: 25000 });
      const read = (p: any, id: string) =>
        p.evaluate(
          (id: string) =>
            (window as any).__VOLAM__
              .presentation()
              .renovation.bodies.filter((b: any) => b.visible && b.id === id),
          id,
        );
      const observe = (p: any, id: string, ms: number, token = 0) =>
        p.evaluate(
          ({ id, ms, token }: any) =>
            new Promise<any>((resolve) => {
              (window as any).__bossFrameProbe = token;
              const start = performance.now(),
                frames = new Set<string>(),
                textures = new Set<string>(),
                scales = new Set<string>();
              let maxBodies = 0;
              const poll = () => {
                const bs = (window as any).__VOLAM__
                  .presentation()
                  .renovation.bodies.filter(
                    (b: any) => b.visible && b.id === id,
                  );
                maxBodies = Math.max(maxBodies, bs.length);
                for (const b of bs) {
                  frames.add(String(b.frame));
                  textures.add(b.texture);
                  scales.add(JSON.stringify(b.scale));
                }
                if (performance.now() - start >= ms)
                  resolve({
                    frames: [...frames],
                    textures: [...textures],
                    scales: [...scales],
                    maxBodies,
                  });
                else requestAnimationFrame(poll);
              };
              poll();
            }),
          { id, ms, token },
        );
      for (const id of ids) {
        const f = bossFixture(room, id),
          { w, c, encounter: e, actor: b, heroes } = f;
        const vuong = id.startsWith('vuong_'),
          chu = id === 'chu_ba_thong',
          hong = id === 'hoan_nhan_hong_liet',
          kim = id === 'kim_luan';
        let allowBasicPalm = false;
        const schedule = () => {
          if (vuong)
            e.nextAction =
              e.nextSpecial =
              e.nextHazard =
              e.nextFinger =
                w.tick + 100000;
          else if (chu) {
            if (!allowBasicPalm) e.nextBasicAt = w.tick + 100000;
          } else if (kim) e.next.set(b.id, w.tick + 100000);
          else e.nextActionAt = w.tick + 100000;
        };
        const timer = setInterval(schedule, 30);
        try {
          const reset = () => {
            allowBasicPalm = false;
            f.arrange(1, 1, id === 'ly_mac_sau' ? 45 : 118);
            schedule();
            w.projectiles.clear();
            w.areas = [];
            w.shots = [];
            w.actions = [];
            if (vuong) {
              e.lightningHits = 3;
              e.qteOutcome = '';
              e.qteFailed = false;
              e.failedNotes = false;
              e.hazards = [];
              e.swords = [];
              e.notes = [];
              e.controls.clear();
              e.participants.clear();
            }
            if (chu) {
              e.missiles = [];
              e.hands = [];
              e.wine = [];
              delete e.trap;
            }
            if (kim || hong) e.effects.clear();
          };
          reset();
          await wait(
            async () =>
              (await read(pages[0], id)).some(
                (b: any) => before || b.texture === 'boss-unified:' + id,
              ),
            'body ready ' + id,
          );
          reset();
          const entry: any = {
            id,
            idle: await observe(pages[0], id, 2900),
            directions: [],
            cases: [],
          };
          report.cases.push(entry);
          save();
          if (!before) {
            assert.deepEqual(entry.idle.textures, ['boss-unified:' + id]);
            assert.deepEqual(entry.idle.scales, ['[0.5,0.5]']);
            const dirs = [
              [1, 0, 'right'],
              [1, 1, 'down_right'],
              [0, 1, 'down'],
              [-1, 1, 'down_left'],
              [-1, 0, 'left'],
              [-1, -1, 'up_left'],
              [0, -1, 'up'],
              [1, -1, 'up_right'],
            ];
            for (const [fx, fy, direction] of dirs) {
              f.arrange(fx as number, fy as number, 118);
              schedule();
              await wait(
                async () =>
                  (await read(pages[0], id)).some(
                    (b: any) =>
                      b.texture === 'boss-unified:' + id &&
                      b.frame.endsWith('_' + direction),
                  ),
                'native facing ' + id + ' ' + direction,
              );
              entry.directions.push(direction);
            }
          }
          reset();
          await wait(
            async () =>
              (await read(pages[0], id)).some(
                (body: any) =>
                  Math.hypot(body.x - f.origin.x, body.y - f.origin.y) < 20 &&
                  (before || body.frame.endsWith('_down_right')),
              ),
            'settled PNG ' + id,
          );
          await pages[0]
            .locator('#viewport')
            .screenshot({ path: resolve(out, id + '-idle.png') });
          const abilities = vuong
            ? id.endsWith('p1')
              ? ['thrust', 'slash', 'crescent', 'counter', 'elements', 'tam']
              : [
                  'thrust',
                  'slash',
                  'crescent',
                  'tam',
                  'pulse',
                  'stars',
                  'swords',
                  'notes',
                ]
            : chu
              ? [
                  'idle',
                  'sweep',
                  'fists',
                  'palm',
                  'hands',
                  'trap',
                  'spin',
                  'reflect',
                  'ultimate',
                  'drink',
                ]
              : hong
                ? [
                    'hong_liet_a1',
                    'hong_liet_a2',
                    'dung_nham_liet_dia',
                    'hoa_son_bao_phat',
                    'liet_diem_phong_toa',
                    'hoa_tien_te_phat',
                    'thiet_ky_trieu_binh',
                    'van_ly_nham_hoa',
                    'hoa_phao_thien_la',
                  ]
                : kim
                  ? [
                      'kim_sweep',
                      'kim_hand_chop',
                      'kim_luan_truy_hon',
                      'ngu_luan_ho_the',
                      'ngu_luan_phong_toa',
                      'long_tuong_chan_thien',
                      'long_tuong_bat_nha_cong',
                      'long_tuong_bat_nha_thap_tang',
                    ]
                  : [
                      'ly_mac_sau_basic',
                      'bang_phach_ngan_cham',
                      'xich_luyen_chuong',
                      'phat_tran_cong',
                      'co_mo_kiem_phap',
                      'ngu_doc_chuong',
                    ];
          for (const ability of abilities) {
            reset();
            // Observe before native begin so short contact cels cannot be missed by screenshot latency.
            const token = Date.now();
            const motion = Promise.all(
              pages.map((p: any) =>
                observe(
                  p,
                  id,
                  vuong && ability === 'elements'
                    ? 4900
                    : chu && ability === 'drink'
                      ? 7800
                      : 2600,
                  token,
                ),
              ),
            );
            await Promise.all(
              pages.map((p: any) =>
                wait(
                  async () =>
                    await p.evaluate(
                      (token: number) =>
                        (window as any).__bossFrameProbe === token,
                      token,
                    ),
                  'armed peer frame observer',
                ),
              ),
            );
            let cast: any, activeAt: number, startedAt: number;
            if (vuong) {
              e.start(w, c, b, ability, heroes[0], heroes);
              cast = e.action;
              activeAt = cast.next;
              startedAt = cast.start;
            } else if (chu) {
              const i = e.definition.phases.findIndex(
                (p: any) => p.id === ability,
              );
              assert.ok(i >= 0);
              e.phaseIndex =
                (i - 1 + e.definition.phases.length) %
                e.definition.phases.length;
              e.until = w.tick;
              const tick = w.tick;
              await wait(
                () => w.tick > tick && e.phase === ability,
                'native phase ' + ability,
              );
              startedAt = e.started;
              activeAt = e.started + Math.round(c.tickRate * 0.6);
            } else if (hong) {
              e.begin(w, c, ability, heroes[0]);
              cast = e.cast;
              activeAt = cast.activeAt;
              startedAt = cast.startedAt;
            } else if (kim) {
              e.begin(w, c, b.id, ability, heroes[0]);
              cast = e.casts.get(b.id);
              activeAt = cast.activeAt;
              startedAt = cast.startedAt;
            } else {
              clearInterval(timer);
              e.cooldowns = {};
              if (ability === 'ly_mac_sau_basic') {
                b.cooldown = w.tick;
                e.nextActionAt = w.tick + 100000;
              } else {
                e.rotation = f.c.bossEncounter.rotation.indexOf(ability);
                assert.ok(e.rotation >= 0);
                e.nextActionAt = w.tick;
              }
              await wait(
                () => e.cast?.id === ability,
                'native AI chose ' + ability,
              );
              cast = e.cast;
              activeAt = cast.releaseAt;
              startedAt = cast.startedAt;
            }
            const peers = await Promise.all(
              pages.map(async (p: any) => {
                let ack: any;
                await wait(
                  async () => {
                    ack = await p.evaluate(
                      ({ id, ability, startedAt, zoneId, actorId }: any) => {
                        const s = (window as any).__VOLAM__.snapshot().state;
                        if (id.startsWith('vuong_')) {
                          const a = JSON.parse(s.vuong.arena.snapshot).action;
                          return a?.skill === ability && a.start === startedAt
                            ? { ability, start: a.start, stage: a.stage }
                            : null;
                        }
                        if (id === 'chu_ba_thong') {
                          const v = JSON.parse(
                            s.dungeons[zoneId]?.encounter || '{}',
                          );
                          return v.phase === ability
                            ? {
                                phase: v.phase,
                                elapsed: v.elapsed,
                                missiles: v.missiles?.length,
                              }
                            : null;
                        }
                        if (id === 'kim_luan') {
                          const a = JSON.parse(
                            s.dungeons[zoneId]?.encounter || '{}',
                          ).casts?.find((a: any) => a.actorId === actorId);
                          return a?.abilityId === ability &&
                            a.startedAt === startedAt
                            ? {
                                ability,
                                start: a.startedAt,
                                activeAt: a.activeAt,
                                pulse: a.pulse,
                              }
                            : null;
                        }
                        const a = s.creeps[zoneId + ':' + actorId];
                        if (id === 'hoan_nhan_hong_liet') {
                          const fx = Object.values(s.bossEffects).find(
                            (fx: any) =>
                              fx.abilityId === ability &&
                              fx.startedAt >= startedAt,
                          );
                          if (fx)
                            return {
                              ability,
                              mode: 'replicated native effect',
                              startedAt: (fx as any).startedAt,
                              activeAt: (fx as any).activeAt,
                            };
                        }
                        return a?.castAbilityId === ability
                          ? {
                              ability,
                              pose: a.pose,
                              actionEndsAt: a.actionEndsAt,
                            }
                          : null;
                      },
                      {
                        id,
                        ability,
                        startedAt,
                        zoneId: f.zone.id,
                        actorId: b.id,
                      },
                    );
                    return !!ack;
                  },
                  'peer cast ' + id + ' ' + ability,
                );
                return ack;
              }),
            );
            let release: any;
            if (chu) {
              if (ability === 'idle') {
                allowBasicPalm = true;
                e.nextBasicAt = w.tick;
                await wait(() => e.missiles.length > 0, 'native basic palm');
                release = { mode: 'native idle palm missile', tick: w.tick };
              } else {
                await wait(
                  () => w.tick >= activeAt,
                  'native phase presentation',
                );
                release = {
                  mode: 'native phase elapsed; not full mechanic acceptance',
                  tick: w.tick,
                };
              }
            } else if (vuong && ['swords', 'notes'].includes(ability)) {
              assert.ok((ability === 'swords' ? e.swords : e.notes).length > 0);
              release = {
                mode:
                  ability === 'notes'
                    ? 'native read stage only; QTE not exercised'
                    : 'native sword hold created',
                tick: w.tick,
              };
            } else {
              await wait(
                () =>
                  w.tick >= activeAt &&
                  (vuong
                    ? cast.stage > 0 || e.action !== cast
                    : kim
                      ? cast.pulse > 0
                      : (cast.fired ?? cast.released)),
                'native release ' + ability,
              );
              release = {
                mode: vuong
                  ? 'native action advanced'
                  : kim
                    ? 'native pulse'
                    : 'native release flag',
                tick: w.tick,
                activeAt,
              };
            }
            if (
              [
                'stars',
                'spin',
                'ultimate',
                'dung_nham_liet_dia',
                'thiet_ky_trieu_binh',
                'kim_luan_truy_hon',
                'long_tuong_bat_nha_cong',
                'bang_phach_ngan_cham',
                'phat_tran_cong',
              ].includes(ability)
            )
              await pages[0].locator('#viewport').screenshot({
                path: resolve(out, id + '-' + ability + '.png'),
              });
            const observations = await motion;
            if (!before)
              for (const m of observations) {
                assert.deepEqual(
                  m.textures,
                  ['boss-unified:' + id],
                  id + ' ' + ability + ' family',
                );
                assert.deepEqual(
                  m.scales,
                  ['[0.5,0.5]'],
                  id + ' ' + ability + ' scale',
                );
                const roles =
                  bossActionPoses[id]![
                    chu && ability === 'idle' ? 'palm' : ability
                  ]!;
                const contact =
                  ability === 'counter' || ability === 'notes'
                    ? roles[0]
                    : roles[1];
                assert.ok(
                  m.frames.some((f: string) => f.startsWith(contact + '_')),
                  id + ' ' + ability + ' native contact/hold on peer',
                );
                assert.ok(
                  m.frames.length >= (vuong && ability === 'notes' ? 1 : 2),
                  id + ' ' + ability + ' authored motion',
                );
                if (chu && ability === 'spin')
                  assert.ok(m.maxBodies >= 2, 'canonical spin afterimages');
                if (chu && ability === 'idle')
                  assert.ok(
                    m.frames.some((f: string) => f.startsWith('cast_1_')),
                    'idle palm contact',
                  );
              }
            entry.cases.push({
              ability,
              startedAt,
              activeAt,
              peers,
              release,
              observations,
            });
            save();
          }
        } finally {
          clearInterval(timer);
        }
      }
      await pages[0].locator('#game canvas').focus();
      for (const enabled of [false, true]) {
        await pages[0].keyboard.press('F8');
        await wait(
          async () =>
            (await pages[0].evaluate(
              () => (window as any).__VOLAM__.presentation().worldDepth.enabled,
            )) === enabled,
          'F8 ' + enabled,
        );
      }
      report.status = 'PASS';
      save();
    },
  });
});
