import { defineConfig } from '@playwright/test';
import gameplay from './playwright.config.js';

export default defineConfig({
  ...gameplay,
  testMatch: ['qa-helpers.spec.ts', 'gameplay.spec.ts'],
  globalSetup: './tests/e2e/qa-helpers-setup.ts',
});
