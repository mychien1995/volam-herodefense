import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: 'review.spec.mjs',
  testIgnore: '**/history/**',
  timeout: 240000,
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  outputDir: '../../../../.cache/dong-ta-art-playwright',
  use: { video: 'off', trace: 'off', screenshot: 'only-on-failure' },
});
