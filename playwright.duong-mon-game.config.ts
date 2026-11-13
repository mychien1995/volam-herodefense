import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'duong-mon-game.spec.ts',
  outputDir: 'artifacts/duong-mon-game',
  workers: 1,
  timeout: 130_000,
  globalSetup: './tests/e2e/duong-mon-game-setup.ts',
  use: {
    baseURL:
      'http://127.0.0.1:' + (process.env['VOLAM_QA_CLIENT_PORT'] ?? 5574),
    browserName: 'chromium',
    channel: 'chrome',
    viewport: { width: 1280, height: 720 },
    video: 'off',
    trace: 'off',
  },
});
