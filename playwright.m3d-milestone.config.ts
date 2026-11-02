import { defineConfig } from '@playwright/test';
import base from './playwright.m3d-followup.config.js';
export default defineConfig({
  ...base,
  testMatch: [
    'm3d-followup.spec.ts',
    'm3d-r3-integration.spec.ts',
    'm3d-vo-anh.spec.ts',
    'merchant.spec.ts',
    'm3d-milestone.spec.ts',
  ],
});
