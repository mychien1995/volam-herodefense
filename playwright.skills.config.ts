import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  outputDir: './artifacts/playwright-m3a',
  testDir: './tests/e2e',
  testMatch: 'skills.spec.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 150000,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5176',
    video: 'off',
    trace: {
      mode: 'retain-on-failure',
      screenshots: false,
      snapshots: true,
      sources: true,
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  globalSetup: './tests/e2e/skills-setup.ts',
});
