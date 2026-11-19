import { defineConfig } from '@playwright/test';
import pvp from './playwright.standalone-pvp.config.js';
export default defineConfig({
  ...pvp,
  globalSetup: './tests/e2e/pvp-repair-setup.ts',
  testMatch: [
    '**/pvp-regressions.spec.ts',
    '**/standalone-pvp.spec.ts',
    '**/gameplay.spec.ts',
  ],
});
