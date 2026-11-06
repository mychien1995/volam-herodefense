import base from './playwright.renovation-v7.config.js';
import { defineConfig } from '@playwright/test';
export default defineConfig({ ...base, testMatch: 'renovation-v8.spec.ts' });
