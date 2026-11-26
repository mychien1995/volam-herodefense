import { defineConfig } from '@playwright/test';
import gameplay from './playwright.config.js';
export default defineConfig({
  ...gameplay,
  testMatch: ['performance.spec.ts'],
  testIgnore: [],
  timeout: 180_000,
  use: {
    ...gameplay.use,
    viewport: { width: 1280, height: 900 },
    trace: 'off',
    video: 'off',
  },
  globalSetup: './tests/e2e/performance-setup.ts',
});
