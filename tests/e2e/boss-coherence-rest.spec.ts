import { test } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifyRenovationRuntime } from '../../tools/verify-renovation-runtime.mjs';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
import { waitForQa } from '../../tools/qa-wait.mjs';
import { bossFixture } from './boss-coherence-fixture.js';

test('remaining boss identity source pilots in their actual renderers', async ({
  browser,
}) => {
  const before = process.env['VOLAM_BOSS_BEFORE'] === '1';
  const ids = (
    process.env['VOLAM_BOSS_IDS'] ??
    'vuong_trung_duong_p1,vuong_trung_duong_p2,chu_ba_thong,hoan_nhan_hong_liet,kim_luan,ly_mac_sau'
  ).split(',');
  await verifyRenovationRuntime(browser, {
    players: 2,
    compareLegacy: false,
    selectionTimeout: 120000,
    clientDist: '.cache/boss-coherence-dist',
    clientQuery: before ? '&bossCoherence=0' : '',
    evidenceDir: qaEvidenceDirectory('docs/evidence/boss-rest'),
    onReady: async ({ room, pages, out }: any) => {
      mkdirSync(out, { recursive: true });
      const report: any = {
        status: 'PASS',
        before,
        scope:
          'directional idle/source pilots in native scene/encounter; not full skills/phase acceptance',
        cases: [],
      };
      for (const id of ids) {
        const fixture = bossFixture(room, id);
        if (process.env['VOLAM_BOSS_READY'] === '1' && id.startsWith('vuong_'))
          fixture.encounter.lightningHits = 3; // Match the native shield-cleared comparison prerequisite.
        const read = () =>
          pages[0].evaluate(
            (id: string) =>
              (window as any).__VOLAM__
                .presentation()
                .renovation.bodies.find((b: any) => b.id === id && b.visible),
            id,
          );
        await waitForQa(
          async () => {
            const b = await read();
            return before ? !!b : b?.texture === 'boss-unified:' + id;
          },
          'native boss renderer ' + id,
          {
            timeout: 30000,
            diagnostics: async () => ({
              serverActors: [...fixture.w.creeps.values()].map((a: any) => ({
                id: a.id,
                archetype: a.archetypeId,
                hp: a.hp,
              })),
              serverVuong: fixture.w.vuong?.state,
              client: await pages[0].evaluate(() => {
                const api = (window as any).__VOLAM__,
                  p = api.presentation(),
                  s = api.snapshot();
                return {
                  ready: p.ready,
                  zone: p.zoneId,
                  bodies: p.renovation.bodies,
                  vuong: s.state.vuong,
                  creeps: s.state.creeps,
                  ui: document.body.innerText.slice(-400),
                };
              }),
            }),
          },
        );
        fixture.arrange();
        if (!before)
          await waitForQa(
            async () => (await read())?.frame?.endsWith('_down_right'),
            'settled source facing ' + id,
            { timeout: 15000 },
          );
        const cap = await pages[0].evaluate(
          (id: string) =>
            new Promise<any>((resolve) => {
              const start = performance.now(),
                frames = new Set<string>(),
                scales = new Set<string>();
              const poll = () => {
                const b = (window as any).__VOLAM__
                  .presentation()
                  .renovation.bodies.find((b: any) => b.id === id && b.visible);
                if (b) {
                  frames.add(String(b.frame));
                  scales.add(JSON.stringify(b.scale));
                }
                if (performance.now() - start >= 2900)
                  resolve({ frames: [...frames], scales: [...scales] });
                else requestAnimationFrame(poll);
              };
              poll();
            }),
          id,
        );
        fixture.arrange();
        await waitForQa(
          async () => {
            const b = await read();
            return (
              b &&
              Math.hypot(b.x - fixture.origin.x, b.y - fixture.origin.y) < 20 &&
              (before ||
                (b.texture === 'boss-unified:' + id &&
                  b.frame.endsWith('_down_right')))
            );
          },
          'PNG fixture settled ' + id,
          { timeout: 15000 },
        );
        const body = await read();
        if (!before) {
          assert.equal(body.texture, 'boss-unified:' + id);
          assert.deepEqual(cap.scales, ['[0.5,0.5]']);
          assert.ok(cap.frames.length >= 2, 'authored motion ' + id);
        }
        await pages[0]
          .locator('#viewport')
          .screenshot({ path: resolve(out, id + '.png') });
        report.cases.push({ id, body, cap });
      }
      writeFileSync(
        resolve(out, 'verification.json'),
        JSON.stringify(report, null, 2),
      );
    },
  });
});
