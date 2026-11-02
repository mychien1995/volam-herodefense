import { defineConfig, devices } from '@playwright/test';
import { qaSession } from './tools/qa-session.mjs';
const s = qaSession();
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['m3d-r3-integration.spec.ts', 'm3d-feedback-integration.spec.ts'],
  outputDir: s.outputDir,
  globalSetup: './tests/e2e/m3d-r3-setup.ts',
  workers: 1,
  timeout: 600000,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: s.clientUrl,
    viewport: { width: 1280, height: 720 },
    video: 'off',
    trace: 'off',
  },
});
