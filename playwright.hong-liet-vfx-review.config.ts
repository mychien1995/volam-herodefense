import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'hong-liet-vfx-review.spec.ts',
  workers: 1,
  timeout: 150000,
  reporter: 'list',
  outputDir: 'artifacts/boss-vfx-preview/hong-liet-v05-test',
  use: {
    baseURL: 'http://127.0.0.1:59759',
    viewport: { width: 1440, height: 960 },
    video: 'off',
    trace: 'off',
  },
});
