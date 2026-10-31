import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './artifacts/playwright-m3c2',
  globalSetup: './tests/e2e/m3c2-setup.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 180000,
  reporter: [
    ['list'],
    ['json', { outputFile: 'docs/evidence/m3c2/playwright-results.json' }],
  ],
  use: { video: 'off', trace: 'off' },
  projects: [
    {
      name: 'runtime-preview',
      testMatch: [
        'm3c2-preview.spec.ts',
        'skills.spec.ts',
        'm3c1-preview.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5188' },
    },
    {
      name: 'progression-regression',
      testMatch: [
        'm3c2.spec.ts',
        'progression.spec.ts',
        'gameplay.spec.ts',
        'dungeons.spec.ts',
        'ui.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5186' },
    },
  ],
});
