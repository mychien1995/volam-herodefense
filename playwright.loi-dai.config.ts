import { defineConfig } from '@playwright/test';
import gameplay from './playwright.config.js';

export default defineConfig({
  ...gameplay,
  testIgnore: [],
  testMatch: '**/loi-dai.spec.ts',
  globalSetup: './tests/e2e/loi-dai-setup.ts',
});
