import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /m4d(-review|-r3|-wave-pacing|-easy-xp)?\.spec\.ts/,
  globalSetup: './tests/e2e/m4d-setup.ts',
  workers: 1,
  timeout: 180000,
  expect: { timeout: 20000 },
  reporter: 'list',
  outputDir:
    process.env['VOLAM_QA_PLAYWRIGHT_OUTPUT'] ?? 'artifacts/m4d-browser',
  use: {
    baseURL: 'http://127.0.0.1:5554',
    viewport: { width: 1366, height: 768 },
    video: 'off',
    trace: 'off',
    screenshot: 'off',
    launchOptions: {
      args: [
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
      ],
    },
  },
});
