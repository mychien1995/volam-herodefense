import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['hell.spec.ts', 'dungeons.spec.ts'],
  workers: 1,
  fullyParallel: false,
  timeout: 240000,
  expect: { timeout: 15000 },
  reporter: 'list',
  outputDir: 'test-results/hell-dungeon',
  use: { baseURL: 'http://127.0.0.1:5300', video: 'off', trace: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  globalSetup: './tests/e2e/hell-setup.ts',
});
