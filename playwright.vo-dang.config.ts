import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['vo-dang-art.spec.ts', 'gameplay.spec.ts'],
  globalSetup: './tests/e2e/vo-dang-setup.ts',
  outputDir: 'artifacts/vo-dang-playwright',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile: 'assets/reviews/vo_dang_v01/playwright_results_v01.json',
      },
    ],
  ],
  use: { baseURL: 'http://127.0.0.1:5192', video: 'off', trace: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
