import type { PlaywrightTestConfig } from '@playwright/test';
import config from './playwright.config.js';

const diamondPalmConfig: PlaywrightTestConfig = {
  ...config,
  globalSetup: './tests/e2e/diamond-palm-setup.ts',
  timeout: 60_000,
};
export default diamondPalmConfig;
