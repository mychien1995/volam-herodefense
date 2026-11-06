import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'renovation-v5.spec.ts',
  workers: 1,
  timeout: 900000,
  reporter: [['list']],
  use: {
    video: 'off',
    trace: 'off',
    launchOptions: {
      executablePath:
        process.env['VOLAM_REVIEW_CHROMIUM'] ??
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
      args: [
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
      ],
    },
  },
});
