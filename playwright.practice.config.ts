import { defineConfig } from '@playwright/test';
import base from './playwright.pvp-regressions.config.js';
export default defineConfig({
  ...base,
  testMatch: [
    '**/practice.spec.ts',
    '**/audio-settings.spec.ts',
    '**/con-luan-sounds.spec.ts',
    '**/school-sounds.spec.ts',
    '**/standalone-pvp.spec.ts',
    '**/gameplay.spec.ts',
    '**/pvp-regressions.spec.ts',
  ],
});
