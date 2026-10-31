import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'arena-creeps-13-16.spec.ts',
  outputDir: 'artifacts/arena-creeps-13-16-playwright',
  fullyParallel: false,
  workers: 1,
  timeout: 360000,
  reporter: [['list']],
  use: { video: 'off', trace: 'off' },
});
