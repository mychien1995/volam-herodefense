import base from './playwright.renovation-v6.config.js';
import { defineConfig } from '@playwright/test';
export default defineConfig({ ...base, testMatch: 'renovation-v7.spec.ts' });
