import { test } from '@playwright/test';
import { verifyRenovationRuntime } from '../../tools/verify-renovation-runtime.mjs';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
import { verifyPresentationPolish } from './presentation-polish-probe.mjs';
test('moving arena frame pacing and current hero art', async ({ browser }) => {
  await verifyRenovationRuntime(browser, {
    players: Number(process.env['VOLAM_POLISH_PLAYERS'] ?? 2),
    compareLegacy: false,
    selectionTimeout: 120000,
    clientDist:
      process.env['VOLAM_POLISH_DIST'] ?? '.cache/depth-expansion-dist',
    evidenceDir: qaEvidenceDirectory('docs/evidence/presentation-polish'),
    onReady: verifyPresentationPolish,
  });
});
