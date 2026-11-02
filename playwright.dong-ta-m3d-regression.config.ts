import { defineConfig } from '@playwright/test';
import baseline from './playwright.m3d-r3.config.js';

// Keep the current M3D fixture and assertions; use the installed browser already
// used by the Đông Tà profile instead of requiring a separate Chromium download.
export default defineConfig({
  ...baseline,
  testMatch: ['m3d-r3-integration.spec.ts'],
  use: { ...baseline.use, channel: 'msedge' },
});
