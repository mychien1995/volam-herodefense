import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['desert.spec.ts', 'dungeons.spec.ts'],
  workers: 1,
  fullyParallel: false,
  timeout: 240000,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5196', video: 'off', trace: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  globalSetup: './tests/e2e/desert-setup.ts',
});
