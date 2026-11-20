import { verifyShaolinChoreography } from './shaolin-unified-probe.mjs';
import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { verifyRenovationRuntime } from '../../tools/verify-renovation-runtime.mjs';
import { verifyCoherentChuong } from './chuong-unified-probe.mjs';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
const branch = process.env['VOLAM_HERO_BRANCH'] ?? 'both';
test('batch4 Shaolin body coherence', async ({ browser }) => {
  await verifyRenovationRuntime(browser, {
    players: Number(process.env['VOLAM_CHUONG_PLAYERS'] ?? 2),
    compareLegacy: false,
    selectionTimeout: 120000,
    clientDist:
      process.env['VOLAM_CHUONG_DIST'] ?? '.cache/hero-coherence-batch4-dist',
    evidenceDir: qaEvidenceDirectory('docs/evidence/hero-coherence-batch4'),
    onReady: async (context: any) => {
      for (const basic of branch === 'both'
        ? ['thieu_lam_quyen', 'thieu_lam_dao']
        : [branch]) {
        const profile = {
          basic,
          extraChecks: verifyShaolinChoreography,
          sameTickAuthority: true,
          settleIdle: true,
          stationaryPartyTargets: true,
          captureByKey: basic.endsWith('quyen')
            ? {
                KeyA: [
                  'left_fist',
                  'right_fist',
                  'front_kick',
                  'roundhouse',
                ].map((p) => ({ name: 'A-' + p, prefix: p + '_' })),
                KeyQ: [{ name: 'Q-contact', prefix: 'la_han_' }],
                KeyW: [{ name: 'W-contact', prefix: 'ground_punch_' }],
                KeyE: [{ name: 'E-release', prefix: 'palm_release_' }],
                KeyR: [{ name: 'R-guard', prefix: 'guard_' }],
                KeyT: [{ name: 'T-release', prefix: 'sky_release_' }],
              }
            : {
                KeyA: [{ name: 'A-contact', prefix: 'sweep_' }],
                KeyQ: [{ name: 'Q-contact', prefix: 'release_' }],
                KeyW: [{ name: 'W-guard', prefix: 'guard_' }],
                KeyE: [{ name: 'E-roar', prefix: 'roar_' }],
                KeyR: [{ name: 'R-buddha', prefix: 'buddha_' }],
                KeyT: [{ name: 'T-release', prefix: 'release_' }],
              },
          actionBodyPattern:
            '^(windup|left|right|front|roundhouse|recover|la_han|ground|palm|guard|spin|stomp|kick|flying|channel|lotus|sky|sweep|overhead|charge|roar|buddha|blade|release)_',
          school: 'thieu_lam',
          texture: 'hero-unified:' + basic,
          pivot: basic.endsWith('dao') ? [0.5, 248 / 320] : [0.5, 224 / 288],
          avatar:
            '/assets/' + basic.replaceAll('_', '-') + '-unified-v1/avatar.png',
          partial: process.env['VOLAM_COHERENCE_PARTIAL'] === '1',
        };
        const opts = { ...context, out: resolve(context.out, basic) };
        if (process.env['VOLAM_CHUONG_STAGE'] === 'baseline')
          await expect(verifyCoherentChuong(opts, profile)).rejects.toThrow(
            'one canonical body',
          );
        else await verifyCoherentChuong(opts, profile);
      }
    },
  });
});
