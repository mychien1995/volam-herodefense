import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'wave-vfx-preview-v02.spec.ts',
  workers: 1,
  timeout: 180000,
  expect: { timeout: 15000 },
  reporter: 'list',
  outputDir: 'test-results/wave-vfx-preview-v02',
  use: {
    baseURL: 'http://127.0.0.1:5462',
    viewport: { width: 1280, height: 720 },
    video: 'off',
    trace: 'off',
    screenshot: 'off',
    launchOptions: {
      args: [
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
      ],
    },
  },
});
