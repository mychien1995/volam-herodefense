import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'invasion.spec.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 90000,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    video: 'off',
    trace: {
      mode: 'retain-on-failure',
      screenshots: false,
      snapshots: true,
      sources: true,
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  globalSetup: './tests/e2e/invasion-setup.ts',
});
