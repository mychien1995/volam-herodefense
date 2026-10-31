import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['thieu-lam-art.spec.ts', 'gameplay.spec.ts'],
  globalSetup: './tests/e2e/thieu-lam-setup.ts',
  outputDir: 'artifacts/thieu-lam-playwright',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile: 'assets/reviews/thieu_lam_v01/playwright_results_v01.json',
      },
    ],
  ],
  use: { baseURL: 'http://127.0.0.1:5193', video: 'off', trace: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
