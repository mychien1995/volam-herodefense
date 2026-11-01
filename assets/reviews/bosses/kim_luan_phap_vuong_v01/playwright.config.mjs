import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: 'review.spec.mjs',
  timeout: 180000,
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  outputDir: '../../../../.cache/kim-luan-art-playwright',
  use: { video: 'off', trace: 'off', screenshot: 'only-on-failure' },
});
