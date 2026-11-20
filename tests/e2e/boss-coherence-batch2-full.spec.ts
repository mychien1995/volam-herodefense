import { test } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beginNamDeCast } from '@volam/game-core';
import { verifyRenovationRuntime } from '../../tools/verify-renovation-runtime.mjs';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
import { waitForQa } from '../../tools/qa-wait.mjs';
import { bossFixture } from './boss-coherence-fixture.js';

test('complete batch2 boss bodies follow native casts, doubles and rest states', async ({
  browser,
}) => {
  const before = process.env['VOLAM_BOSS_BEFORE'] === '1';
  const ids = (
    process.env['VOLAM_BOSS_IDS'] ?? 'tay_doc,tay_doc_cap_mo,nam_de,bac_cai'
  ).split(',');
  await verifyRenovationRuntime(browser, {
    players: Number(process.env['VOLAM_BOSS_PLAYERS'] ?? 2),
    compareLegacy: false,
    selectionTimeout: 120000,
    clientDist: '.cache/boss-coherence-dist',
    clientQuery: before ? '&bossCoherence=0' : '',
    evidenceDir: qaEvidenceDirectory('docs/evidence/boss-batch2-full'),
    onReady: async ({ room, pages, out }: any) => {
      mkdirSync(out, { recursive: true });
      const report: any = {
        status: 'PASS',
        before,
        clients: pages.length,
        scope:
          'server-owned spawn/HP/cooldown prerequisites; native encounter begin/release, peer replication and body states; not natural campaign progression or balance acceptance',
        cases: [],
      };
      const wait = (fn: any, label: string) =>
        waitForQa(fn, label, { timeout: 30000 });
      const bodies = (id: string) =>
        pages[0].evaluate(
          (id: string) =>
            (window as any).__VOLAM__
              .presentation()
              .renovation.bodies.filter((b: any) => b.id === id && b.visible),
          id,
        );
      const observe = (id: string, ms: number) =>
        pages[0].evaluate(
          ({ id, ms }: any) =>
            new Promise<any>((resolve) => {
              const start = performance.now(),
                frames = new Set<string>(),
                textures = new Set<string>(),
                scales = new Set<string>();
              let count = 0;
              const poll = () => {
                const bs = (window as any).__VOLAM__
                  .presentation()
                  .renovation.bodies.filter(
                    (b: any) => b.id === id && b.visible,
                  );
                count = Math.max(count, bs.length);
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
                    maxBodies: count,
                  });
                else requestAnimationFrame(poll);
              };
              poll();
            }),
          { id, ms },
        );
      for (const id of ids) {
        const f = bossFixture(room, id),
          { w, c, encounter: e, heroes } = f;
        const reset = () => {
          f.arrange();
          w.projectiles.clear();
          w.areas = [];
          w.shots = [];
          w.actions = [];
          for (const name of [
            'effects',
            'projectiles',
            'pools',
            'marks',
            'poisons',
            'pillars',
            'controls',
          ])
            if (e[name] instanceof Map) e[name].clear();
          if (id === 'bac_cai') {
            e.forms = [];
            e.phase = 'combat';
            e.outcomeUntil = 0;
            e.nextPreference = e.nextVote = w.tick + 100000;
          }
        };
        reset();
        await wait(async () => {
          const bs = await bodies(id);
          return bs.some(
            (b: any) => before || b.texture === 'boss-unified:' + id,
          );
        }, 'body ready ' + id);
        reset();
        await pages[0].waitForTimeout(150);
        const idle = await observe(id, 2900);
        if (!before) {
          assert.deepEqual(idle.textures, ['boss-unified:' + id]);
          assert.deepEqual(idle.scales, ['[0.5,0.5]']);
        }
        await pages[0]
          .locator('#viewport')
          .screenshot({ path: resolve(out, id + '-idle.png') });
        const abilities =
          id === 'tay_doc'
            ? [
                'tay_doc_staff',
                'tay_doc_gas',
                'van_doc_phi_cham',
                'doc_vu_me_hon',
                'co_doc_khoan_tam',
                'hon_thien_phuc_long_chan',
              ]
            : id === 'tay_doc_cap_mo'
              ? [
                  'doc_chuong',
                  'cap_mo_chan_kich',
                  'ngu_doc_than_chuong',
                  'van_doc_bao_phat',
                ]
              : id === 'nam_de'
                ? [
                    'nam_de_palm',
                    'nam_de_aura',
                    'nam_de_small_finger',
                    'nhat_duong_chi',
                    'lien_hoan_nhat_duong_chi',
                    'dai_ly_phong_huyet',
                    'phat_quang_pho_chieu',
                    'nhat_duong_quy_tong',
                    'nam_de_dash',
                  ]
                : [
                    'staff',
                    'palms',
                    'beam',
                    'dogs',
                    'field',
                    'spiral',
                    'tether',
                    'vortex',
                    'clones',
                  ];
        const cases = [];
        for (const ability of abilities) {
          reset();
          await pages[0].waitForTimeout(120);
          const observation = observe(id, 1200);
          assert.ok(
            id === 'nam_de'
              ? beginNamDeCast(w, c, ability as any, heroes[0].id)
              : e.begin(w, c, ability, heroes[0]),
            'native begin ' + ability,
          );
          const cast =
            id === 'nam_de'
              ? ability === 'nam_de_small_finger'
                ? e.smallCast
                : e.cast
              : e.cast;
          assert.ok(cast, 'server cast ' + ability);
          const activeAt = cast.activeAt ?? cast.releaseAt ?? cast.release;
          const endsAt = cast.endsAt ?? cast.until ?? cast.end;
          await wait(
            () =>
              w.tick >= activeAt &&
              (ability === 'lien_hoan_nhat_duong_chi'
                ? [...e.effects.values()].some(
                    (fx: any) =>
                      fx.abilityId === ability && fx.activeAt <= w.tick,
                  )
                : (cast.fired ?? cast.released)),
            'actual native release ' + ability,
          );
          const peerReleases = await Promise.all(
            pages.map(async (p: any) => {
              let ack: any;
              await wait(async () => {
                ack = await p.evaluate(
                  ({ id, ability, activeAt }: any) => {
                    const s = (window as any).__VOLAM__.snapshot().state;
                    const v = JSON.parse(
                      id === 'nam_de'
                        ? s.defense.namDe
                        : id === 'bac_cai'
                          ? s.bacCai.arena.snapshot
                          : s.tayDoc.arena.json,
                    );
                    const a =
                      id === 'nam_de'
                        ? ability === 'nam_de_small_finger'
                          ? v.smallCast
                          : v.cast
                        : id === 'bac_cai'
                          ? v.action
                          : v.cast;
                    if (ability === 'nam_de_dash') {
                      const followup = v.cast ?? v.smallCast;
                      return s.tick >= activeAt &&
                        followup?.startedAt >= activeAt
                        ? {
                            ability,
                            activeAt,
                            mode: 'native dash -> automatic aura/burst',
                            followup: followup.ability,
                          }
                        : null;
                    }
                    const released =
                      ability === 'lien_hoan_nhat_duong_chi'
                        ? Object.values(s.bossEffects).some(
                            (fx: any) =>
                              fx.abilityId === ability && fx.activeAt <= s.tick,
                          )
                        : (a?.fired ?? a?.released);
                    return a &&
                      (a.activeAt ?? a.releaseAt ?? a.release) === activeAt &&
                      released
                      ? {
                          ability: a.ability,
                          activeAt,
                          release: released,
                          mode:
                            ability === 'lien_hoan_nhat_duong_chi'
                              ? 'active native beam effects; cast.released intentionally false'
                              : 'native cast flag',
                        }
                      : null;
                  },
                  { id, ability, activeAt },
                );
                return !!ack;
              }, 'peer release ' + ability);
              return ack;
            }),
          );
          if (
            [
              'hon_thien_phuc_long_chan',
              'cap_mo_chan_kich',
              'nhat_duong_chi',
              'vortex',
              'clones',
            ].includes(ability)
          )
            await pages[0]
              .locator('#viewport')
              .screenshot({ path: resolve(out, id + '-' + ability + '.png') });
          const first = await observation;
          const tail = await observe(
            id,
            Math.max(
              600,
              Math.min(22000, ((endsAt - w.tick + 3) * 1000) / c.tickRate),
            ),
          );
          if (!before) {
            assert.deepEqual(
              [...new Set([...first.textures, ...tail.textures])],
              ['boss-unified:' + id],
            );
            assert.deepEqual(
              [...new Set([...first.scales, ...tail.scales])],
              ['[0.5,0.5]'],
            );
            if (ability === 'clones')
              assert.ok(
                Math.max(first.maxBodies, tail.maxBodies) >= 8,
                'all authored doubles',
              );
          }
          cases.push({ ability, activeAt, endsAt, peerReleases, first, tail });
        }
        const rest = [];
        if (id === 'bac_cai')
          for (const phase of ['drink', 'sleep']) {
            reset();
            e.phase = phase;
            e.outcomeUntil =
              w.tick + e.ticks(e.definition.preferences[phase + 'Ms'], c);
            const cap = await observe(id, 1700);
            if (!before) {
              for (let n = 0; n < 4; n++)
                assert.ok(
                  cap.frames.includes(phase + '_' + n + '_down'),
                  phase + ' cel ' + n,
                );
              assert.deepEqual(cap.textures, ['boss-unified:bac_cai']);
            }
            await pages[0]
              .locator('#viewport')
              .screenshot({ path: resolve(out, 'bac-cai-' + phase + '.png') });
            rest.push({ phase, cap });
          }
        report.cases.push({ id, idle, cases, rest });
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
      writeFileSync(
        resolve(out, 'verification.json'),
        JSON.stringify(report, null, 2),
      );
    },
  });
});
