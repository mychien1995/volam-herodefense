import { defineConfig } from '@playwright/test';
import hell from './playwright.hell.config.js';
export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  fullyParallel: false,
  timeout: 360000,
  expect: { timeout: 15000 },
  reporter: 'list',
  use: {
    video: 'off',
    trace: 'off',
    // Match the existing Kim QA profile for simultaneous animation observers.
    launchOptions: {
      args: [
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
      ],
    },
  },
  outputDir: 'test-results/hell-m3d-merge',
  // The selected boss regressions use normal UI/input, not boss fixture routes.
  globalSetup: './tests/e2e/hell-setup.ts',
  projects: [
    {
      name: 'hell',
      testMatch: ['hell.spec.ts', 'dungeons.spec.ts'],
      use: { ...hell.use },
    },
    {
      name: 'all-destinations',
      testMatch: 'ly-mac-sau.spec.ts',
      grep: /M3D selector/,
      use: { ...hell.use },
    },
    {
      name: 'kim-regression',
      testMatch: 'kim-luan.spec.ts',
      grep: /two real clients enter/,
      use: { ...hell.use },
    },
  ],
});
