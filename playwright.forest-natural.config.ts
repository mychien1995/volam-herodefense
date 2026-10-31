import { defineConfig } from '@playwright/test';
import bamboo from './playwright.bamboo.config.js';

// Same production server/menu/renderer, with no pose endpoint or practice targets.
process.env['FOREST_NATURAL_PLAYTEST'] = '1';
export default defineConfig({
  ...bamboo,
  testMatch: [
    'forest-natural.spec.ts',
    'bamboo-forest.spec.ts',
    'dungeons.spec.ts',
  ],
  timeout: 300000,
  expect: { timeout: 20000 },
  outputDir: 'test-results/forest-natural',
});
