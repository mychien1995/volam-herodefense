import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { verifyFinishScenes } from './hero-finish-scenes.mjs';
import { test } from '@playwright/test';
import { verifyRenovationRuntime } from '../../tools/verify-renovation-runtime.mjs';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
import {
  verifyHeroFinish,
  verifyMovingCombat,
  verifySpecialModes,
  verifyFinalArenaProof,
} from './hero-finish-probe.mjs';
test('hero finish authored actions idle and transitions', async ({
  browser,
}) => {
  await verifyRenovationRuntime(browser, {
    players: Number(process.env['VOLAM_FINISH_PLAYERS'] ?? 2),
    compareLegacy: false,
    selectionTimeout: 120000,
    clientDist: process.env['VOLAM_FINISH_DIST'] ?? '.cache/finish-dist',
    evidenceDir: qaEvidenceDirectory('docs/evidence/hero-finish'),
    onReady: async (context) => {
      if (process.env['VOLAM_FINISH_STAGE'] === 'shaolin') {
        process.env['VOLAM_FINISH_ACTOR'] = 'thieu_lam_quyen';
        const actions = await verifyHeroFinish(context);
        const modes = await verifySpecialModes(context);
        return { actions, modes };
      }
      if (process.env['VOLAM_FINISH_STAGE'] === 'proof')
        return verifyFinalArenaProof(context);
      if (process.env['VOLAM_FINISH_STAGE'] === 'review') {
        const child = (name: string) => {
          const out = resolve(context.out, name);
          mkdirSync(out, { recursive: true });
          return { ...context, out };
        };
        process.env['VOLAM_FINISH_ACTOR'] = 'cai_bang_bong';
        const bo = await verifyHeroFinish(child('bong'));
        delete process.env['VOLAM_FINISH_ACTOR'];
        const modes = await verifySpecialModes(child('modes'));
        const scenes = await verifyFinishScenes(child('scenes'));
        return { bo, modes, scenes };
      }
      if (process.env['VOLAM_FINISH_STAGE'] === 'modes')
        return verifySpecialModes(context);
      if (process.env['VOLAM_FINISH_STAGE'] === 'scenes')
        return verifyFinishScenes(context);
      if (process.env['VOLAM_FINISH_STAGE'] === 'stress')
        return verifyMovingCombat(context);
      const result = await verifyHeroFinish(context);
      if (process.env['VOLAM_FINISH_STAGE'] === 'all')
        await verifyMovingCombat(context);
      return result;
    },
  });
});
