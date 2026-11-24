import { test } from '@playwright/test';
import { verifyRenovationRuntime } from '../../tools/verify-renovation-runtime.mjs';
import { verifySkillReviseGame } from './skill-revise-game-probe.mjs';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
import { verifySkillReviseFeedback } from './skill-revise-feedback-probe.mjs';
test('skill revise in actual Phaser: motion, server results and multiplayer combat', async ({
  browser,
}) => {
  await verifyRenovationRuntime(browser, {
    players: process.env['VOLAM_QA_DEV_CLIENT'] === '1' ? 2 : 6,
    development: process.env['VOLAM_QA_DEV_CLIENT'] === '1',
    compareLegacy: false,
    evidenceDir: qaEvidenceDirectory('docs/evidence/skill-revise-game'),
    onReady: process.env['VOLAM_QA_SKILL_REVISE_FEEDBACK']
      ? verifySkillReviseFeedback
      : verifySkillReviseGame,
  });
});
