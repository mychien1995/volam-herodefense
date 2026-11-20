import { defineConfig } from '@playwright/test';
import gameplay from './playwright.config.js';
export default defineConfig({
  ...gameplay,
  testIgnore: [],
  testMatch: '**/standalone-pvp.spec.ts',
  timeout: 240000,
  use: {
    ...gameplay.use,
    viewport: { width: 1440, height: 900 },
    video: 'off',
    trace: 'off',
  },
});
