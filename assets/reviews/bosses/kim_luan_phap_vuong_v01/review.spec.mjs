import { test } from '@playwright/test';
import { runReview } from './verify.mjs';
test('retained Kim Luan art, all Phaser frames and skill choreography', async () => {
  await runReview();
});
