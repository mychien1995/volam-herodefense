import { test } from '@playwright/test';
import { verifyRenovationRuntime } from '../../tools/verify-renovation-runtime.mjs';
import { verifyCoherentChuong } from './chuong-unified-probe.mjs';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
test('batch1 Cái Bang Bổng coherent lifecycle and authored staff actions', async ({
  browser,
}) => {
  await verifyRenovationRuntime(browser, {
    players: Number(process.env['VOLAM_CHUONG_PLAYERS'] ?? 2),
    compareLegacy: false,
    selectionTimeout: 120000,
    clientDist:
      process.env['VOLAM_CHUONG_DIST'] ?? '.cache/hero-coherence-batch1-dist',
    evidenceDir: qaEvidenceDirectory('docs/evidence/hero-coherence-batch1'),
    onReady: async (context: any) =>
      verifyCoherentChuong(context, {
        staffChoreography: true,
        partial: process.env['VOLAM_COHERENCE_PARTIAL'] === '1',
        basic: 'cai_bang_bong',
        school: 'cai_bang',
        texture: 'hero-unified:cai_bang_bong',
        pivot: [0.5, 352 / 720],
        nativeFacingAbilities: ['pha_giap_bong'],
        partySpacingY: 55,
        avatar: '/assets/cai-bang-bong-unified-v1/avatar.png',
      }),
  });
});
