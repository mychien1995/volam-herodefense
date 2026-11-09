import { defineConfig } from '@playwright/test';
import gameplay from './playwright.config.js';

export default defineConfig({
  ...gameplay,
  testMatch: '**/vo-dang-kiem-rework.spec.ts',
  testIgnore: [],
  timeout: 150_000,
  use: {
    ...gameplay.use,
    trace: 'off',
    launchOptions: {
      args: [
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
      ],
    },
  },
  globalSetup: './tests/e2e/vo-dang-kiem-setup.ts',
});
