import { defineConfig, devices } from '@playwright/test';
import { qaSession } from './tools/qa-session.mjs';
const session = qaSession({
  serverPort: 2928,
  clientPort: 5528,
  profile: 'creep-upgrade',
});
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: [
    'creep-upgrade.spec.ts',
    'creep-preview.spec.ts',
    'creep-feedback-r3.spec.ts',
    'creep-feedback-r4.spec.ts',
  ],
  outputDir: session.outputDir,
  workers: 1,
  fullyParallel: false,
  timeout: 360000,
  reporter: 'list',
  use: {
    baseURL: session.clientUrl,
    viewport: { width: 1920, height: 1080 },
    video: 'off',
    trace: {
      mode: 'retain-on-failure',
      screenshots: false,
      snapshots: true,
      sources: true,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
  globalSetup: './tests/e2e/creep-upgrade-setup.ts',
});
