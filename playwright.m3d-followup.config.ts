import { defineConfig, devices } from '@playwright/test';
import { qaSession } from './tools/qa-session.mjs';
const s = qaSession();
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['m3d-followup.spec.ts', 'm3d-r3-integration.spec.ts'],
  globalSetup: './tests/e2e/m3d-r3-setup.ts',
  outputDir: s.outputDir,
  workers: 1,
  timeout: 300000,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: s.clientUrl,
    viewport: { width: 1280, height: 720 },
    video: 'off',
    trace: 'off',
  },
});
