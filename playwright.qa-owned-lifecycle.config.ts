import { defineConfig } from '@playwright/test';
import gameplay from './playwright.config.js';
export default defineConfig({
  ...gameplay,
  testIgnore: [],
  testMatch: 'qa-owned-lifecycle.spec.ts',
  globalSetup: './tests/e2e/m3c1-setup.ts',
  timeout: 90000,
  use: { ...gameplay.use, trace: 'off', video: 'off' },
});
