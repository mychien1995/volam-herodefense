import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'kim-xiangyang-review.spec.ts',
  workers: 1,
  timeout: 130000,
  reporter: 'list',
  outputDir: 'artifacts/boss-vfx-preview/kim-xiangyang-test',
  use: {
    baseURL: 'http://127.0.0.1:59760',
    viewport: { width: 1440, height: 900 },
    video: 'off',
    trace: 'off',
  },
});
