import { defineConfig } from '@playwright/test';
import bamboo from './playwright.bamboo.config.js';
export default defineConfig({
  ...bamboo,
  testMatch: [
    'forest-creep-review.spec.ts',
    'forest-creep-runtime.spec.ts',
    'bamboo-forest.spec.ts',
    'dungeons.spec.ts',
  ],
  timeout: 240000,
  expect: { timeout: 20000 },
});
