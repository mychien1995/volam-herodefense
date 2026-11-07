import base from './playwright.renovation-v9.config.js';
import { defineConfig } from '@playwright/test';
export default defineConfig({ ...base, testMatch: 'renovation-v10.spec.ts' });
