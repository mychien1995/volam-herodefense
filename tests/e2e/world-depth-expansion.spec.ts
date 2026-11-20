import { test } from '@playwright/test';
import { verifyRenovationRuntime } from '../../tools/verify-renovation-runtime.mjs';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
import { verifyDepthExpansion } from './world-depth-expansion-probe.mjs';
test('world depth expansion batches', async ({ browser }) => {
  process.env['VOLAM_DEPTH_STAGE'] ??= '3';
  process.env['VOLAM_DEPTH_BATCH'] ??= process.env['VOLAM_DEPTH_STAGE'];
  await verifyRenovationRuntime(browser, {
    players: Number(process.env['VOLAM_DEPTH_PLAYERS'] ?? 2),
    compareLegacy: false,
    clientDist: '.cache/depth-expansion-dist',
    evidenceDir: qaEvidenceDirectory('docs/evidence/depth-expansion'),
    onReady: verifyDepthExpansion,
  });
});
