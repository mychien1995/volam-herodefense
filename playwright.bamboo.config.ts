import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['bamboo-forest.spec.ts', 'dungeons.spec.ts', 'gameplay.spec.ts'],
  workers: 1,
  fullyParallel: false,
  timeout: 180000,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5187', video: 'off', trace: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  globalSetup: './tests/e2e/bamboo-setup.ts',
});
