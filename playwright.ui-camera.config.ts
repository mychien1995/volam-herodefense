import { defineConfig } from '@playwright/test';
import gameplay from './playwright.config.js';

export default defineConfig({
  ...gameplay,
  testIgnore: [],
  testMatch: [
    'ui-camera.spec.ts',
    'practice.spec.ts',
    'standalone-pvp.spec.ts',
    'pvp-regressions.spec.ts',
  ],
  globalSetup: './tests/e2e/qa-helpers-setup.ts',
  timeout: 240_000,
  use: {
    ...gameplay.use,
    viewport: { width: 1280, height: 720 },
    trace: 'off',
    video: 'off',
  },
});
