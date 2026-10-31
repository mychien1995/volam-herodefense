import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['thien-son-skills.spec.ts', 'gameplay.spec.ts'],
  globalSetup: './tests/e2e/thien-son-skills-setup.ts',
  outputDir: 'artifacts/thien-son-skills-playwright',
  fullyParallel: false,
  workers: 1,
  timeout: 300000,
  reporter: [
    ['list'],
    [
      'json',
      {
        outputFile:
          'assets/reviews/skills/thien-son/playwright_results_v01.json',
      },
    ],
  ],
  use: {
    baseURL: 'http://127.0.0.1:5196',
    viewport: { width: 1280, height: 720 },
    video: 'off',
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
