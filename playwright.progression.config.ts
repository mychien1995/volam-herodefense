import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  outputDir: './artifacts/playwright-m3b',
  testDir: './tests/e2e',
  testMatch: [
    'progression.spec.ts',
    'ui.spec.ts',
    'dungeons.spec.ts',
    'late-join.spec.ts',
    'gameplay.spec.ts',
  ],
  workers: 1,
  // The historical two-free-skills case runs in the explicit M3A legacy suite.
  // M3B scenarios instead learn skills through their real earned point budget.
  grepInvert: /two clients agree on combat/,
  fullyParallel: false,
  timeout: 180000,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5178', video: 'off', trace: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  globalSetup: './tests/e2e/progression-setup.ts',
});
