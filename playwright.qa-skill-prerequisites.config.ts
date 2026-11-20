import { defineConfig } from '@playwright/test';
import gameplay from './playwright.config.js';

export default defineConfig({
  ...gameplay,
  testIgnore: [],
  testMatch: ['qa-skill-prerequisites.spec.ts'],
  globalSetup: './tests/e2e/qa-skill-prerequisites-setup.ts',
  timeout: 180_000,
  use: {
    ...gameplay.use,
    viewport: { width: 1280, height: 720 },
    trace: 'off',
    video: 'off',
  },
});
