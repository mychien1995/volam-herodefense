import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: [
    'ngu-doc-game.spec.ts',
    'ngu-doc-preview.spec.ts',
    'phase1.spec.ts',
    'late-join.spec.ts',
    'controls-menu.spec.ts',
  ],
  outputDir: 'artifacts/ngu-doc-game',
  workers: 1,
  timeout: 130_000,
  globalSetup: './tests/e2e/ngu-doc-game-setup.ts',
  use: {
    baseURL:
      'http://127.0.0.1:' + (process.env['VOLAM_QA_CLIENT_PORT'] ?? 5581),
    browserName: 'chromium',
    channel: 'chrome',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    video: 'off',
    trace: 'off',
  },
});
