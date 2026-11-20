import { defineConfig } from '@playwright/test';
import gameplay from './playwright.config.js';

export default defineConfig({
  ...gameplay,
  testMatch: ['qa-iteration.spec.ts', 'gameplay.spec.ts'],
  testIgnore: [],
  use: { ...gameplay.use, trace: 'off' },
  globalSetup: './tests/e2e/qa-iteration-setup.ts',
});
