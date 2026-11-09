import { defineConfig } from '@playwright/test';
import gameplay from './playwright.config.js';

export default defineConfig({
  ...gameplay,
  testMatch: ['shaolin-dao-match.spec.ts', 'shaolin-dao-preview.spec.ts'],
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
  globalSetup: './tests/e2e/shaolin-dao-match-setup.ts',
});
