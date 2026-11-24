import { defineConfig, devices } from '@playwright/test';
import { qaSession } from './tools/qa-session.mjs';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'skill-revise-game.spec.ts',
  outputDir: qaSession({
    profile: 'skill-revise',
    serverPort: 2926,
    clientPort: 5529,
  }).outputDir,
  workers: 1,
  timeout: 600_000,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    video: 'off',
    trace: 'off',
    launchOptions: {
      args: [
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
    },
  },
});
