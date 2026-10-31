import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['gameplay.spec.ts'],
  globalSetup: './tests/e2e/vo-dang-skills-setup.ts',
  outputDir: 'artifacts/vo-dang-skills-regression',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile:
          'assets/reviews/skills/vo-dang/gameplay_regression_v01.json',
      },
    ],
  ],
  use: { baseURL: 'http://127.0.0.1:5216', video: 'off', trace: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
