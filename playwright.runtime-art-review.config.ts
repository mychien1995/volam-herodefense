import { defineConfig } from '@playwright/test';
import base from './playwright.wave-boss-feedback.config.js';
export default defineConfig({
  ...base,
  testMatch: 'runtime-art-review.spec.ts',
  globalSetup: './tests/e2e/runtime-art-review-setup.ts',
  outputDir: 'artifacts/runtime-art-review-v04',
  timeout: 1_800_000,
  use: {
    ...base.use,
    channel: 'chrome',
    viewport: { width: 1920, height: 1080 },
  },
});
