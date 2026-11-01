import { defineConfig } from '@playwright/test';
import kim from './playwright.kim-luan.config.js';
import ly from './playwright.ly-mac-sau.config.js';
export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  fullyParallel: false,
  timeout: 360000,
  expect: { timeout: 15000 },
  reporter: 'list',
  outputDir: './artifacts/kim-luan-m3d-merge',
  globalSetup: './tests/e2e/kim-luan-m3d-setup.ts',
  projects: [
    { name: 'kim-luan', testMatch: 'kim-luan.spec.ts', use: { ...kim.use } },
    {
      name: 'existing-m3d',
      testMatch: ['ly-mac-sau.spec.ts', 'dungeons.spec.ts'],
      use: { ...ly.use },
    },
  ],
});
