import { test } from '@playwright/test';
import { runReview } from './verify.mjs';
test('Dong Ta sprite and VFX preview only', async () => {
  await runReview();
});
