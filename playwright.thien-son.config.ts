import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: [
    'thien-son-art.spec.ts',
    'cai-bang-art.spec.ts',
    'gameplay.spec.ts',
  ],
  globalSetup: './tests/e2e/thien-son-setup.ts',
  outputDir: 'artifacts/thien-son-playwright',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile: 'assets/reviews/thien_son_v01/playwright_results_v01.json',
      },
    ],
  ],
  use: { baseURL: 'http://127.0.0.1:5189', video: 'off', trace: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
