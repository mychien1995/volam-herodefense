import { defineConfig } from '@playwright/test';
import { qaSession } from './tools/qa-session.mjs';

const session = qaSession({
  profile: 'boss-game',
  serverPort: 45099,
  clientPort: 59763,
});

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'boss-game.spec.ts',
  timeout: 120000,
  workers: 1,
  reporter: 'list',
  outputDir: 'artifacts/boss-readiness/boss-game-test',
  use: {
    baseURL: session.clientUrl,
    viewport: { width: 1440, height: 900 },
    video: 'off',
    trace: 'off',
  },
  globalSetup: './tests/e2e/boss-game-setup.ts',
});
