import { defineConfig } from '@playwright/test';
import skills from './playwright.skills.config.js';
export default defineConfig({
  ...skills,
  outputDir: './artifacts/playwright-m3a-regression',
  testMatch: [
    'gameplay.spec.ts',
    'ui.spec.ts',
    'dungeons.spec.ts',
    'late-join.spec.ts',
    'phase1.spec.ts',
  ],
});
