import { defineConfig, devices } from '@playwright/test';
import { qaSession } from './tools/qa-session.mjs';
const session = qaSession();
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['m3d-feedback-tech.spec.ts', 'm3d-feedback-integration.spec.ts'],
  outputDir: session.outputDir,
  globalSetup: './tests/e2e/m3d-feedback-setup.ts',
  workers: 1,
  timeout: 600000,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: session.clientUrl,
    viewport: { width: 1280, height: 720 },
    video: 'off',
    trace: 'off',
  },
});
