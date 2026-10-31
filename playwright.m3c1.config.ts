import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './artifacts/playwright-m3c1',
  globalSetup: './tests/e2e/m3c1-setup.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 180000,
  reporter: [
    ['list'],
    ['json', { outputFile: 'docs/evidence/m3c1/playwright-results.json' }],
  ],
  use: { video: 'off', trace: 'off' },
  projects: [
    {
      name: 'runtime-preview',
      testMatch: ['m3c1-preview.spec.ts', 'skills.spec.ts'],
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5180' },
    },
    {
      name: 'progression-regression',
      testMatch: [
        'm3c1.spec.ts',
        'progression.spec.ts',
        'ui.spec.ts',
        'dungeons.spec.ts',
        'late-join.spec.ts',
        'gameplay.spec.ts',
      ],
      grepInvert: /two clients agree on combat/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:5178' },
    },
  ],
});
