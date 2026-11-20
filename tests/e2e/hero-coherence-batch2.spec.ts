import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { verifyRenovationRuntime } from '../../tools/verify-renovation-runtime.mjs';
import { verifyCoherentChuong } from './chuong-unified-probe.mjs';
import { verifyVoDangChoreography } from './vo-dang-unified-probe.mjs';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
const branch = process.env['VOLAM_HERO_BRANCH'] ?? 'vo_dang_quyen';
test('batch2 Vo Dang body coherence', async ({ browser }) => {
  await verifyRenovationRuntime(browser, {
    players: Number(process.env['VOLAM_CHUONG_PLAYERS'] ?? 2),
    compareLegacy: false,
    selectionTimeout: 120000,
    clientDist:
      process.env['VOLAM_CHUONG_DIST'] ?? '.cache/hero-coherence-batch2-dist',
    evidenceDir: qaEvidenceDirectory('docs/evidence/hero-coherence-batch2'),
    onReady: async (context: any) => {
      const forms =
        process.env['VOLAM_CHUONG_STAGE'] === 'baseline' || branch === 'both'
          ? ['vo_dang_quyen', 'vo_dang_kiem']
          : [branch];
      for (const basic of forms) {
        const profile = {
          basic,
          sameTickAuthority: true,
          stationaryPartyTargets: true,
          voDangChoreography: true,
          extraChecks: verifyVoDangChoreography,
          captureByKey: {
            KeyA:
              basic === 'vo_dang_quyen'
                ? [{ name: 'A-contact', prefix: 'palm_' }]
                : ['thrust', 'cut_left', 'cut_right', 'cut_down', 'cut_up'].map(
                    (p) => ({ name: 'A-' + p, prefix: p + '_' }),
                  ),
            KeyQ: [
              {
                name: 'Q-contact',
                prefix: basic === 'vo_dang_quyen' ? 'palm_release_' : 'cut_',
              },
            ],
            KeyW: [
              {
                name: 'W-contact',
                prefix:
                  basic === 'vo_dang_quyen' ? 'palm_release_' : 'release_away_',
              },
            ],
            KeyE: [
              {
                name: 'E-channel',
                prefix: basic === 'vo_dang_quyen' ? 'channel_' : 'sword_raise_',
              },
            ],
            KeyR: [{ name: 'R-guard', prefix: 'guard_' }],
            KeyT: [
              {
                name: 'T-body',
                prefix: basic === 'vo_dang_quyen' ? 'taichi_' : 'aim_',
              },
            ],
          },
          school: 'vo_dang',
          texture: 'hero-unified:' + basic,
          pivot:
            basic === 'vo_dang_quyen' ? [0.5, 192 / 224] : [0.5, 224 / 288],
          avatar:
            '/assets/' + basic.replaceAll('_', '-') + '-unified-v1/avatar.png',
          partial: process.env['VOLAM_COHERENCE_PARTIAL'] === '1',
        };
        const options = { ...context, out: resolve(context.out, basic) };
        if (process.env['VOLAM_CHUONG_STAGE'] === 'baseline')
          await expect(verifyCoherentChuong(options, profile)).rejects.toThrow(
            'one canonical body',
          );
        else await verifyCoherentChuong(options, profile);
      }
    },
  });
});
