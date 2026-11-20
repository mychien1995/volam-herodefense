import { defineConfig, devices } from '@playwright/test';
import { qaSession } from './tools/qa-session.mjs';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'world-depth-expansion.spec.ts',
  outputDir: qaSession().outputDir,
  workers: 1,
  timeout: 600_000,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    launchOptions: {
      executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    },
    video: 'off',
    trace: 'off',
  },
});
