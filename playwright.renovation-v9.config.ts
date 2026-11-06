import base from './playwright.renovation-v8.config.js';
import { defineConfig } from '@playwright/test';
export default defineConfig({ ...base, testMatch: 'renovation-v9.spec.ts' });
