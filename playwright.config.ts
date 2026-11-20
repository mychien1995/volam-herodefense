import { defineConfig, devices } from '@playwright/test';

import { qaSession } from './tools/qa-session.mjs';
const session = qaSession();

export default defineConfig({
  outputDir: session.outputDir,
  testDir: './tests/e2e',
  // Accelerated invasion scenarios own separate server settings and ports.
  testIgnore: [
    '**/qa-iteration.spec.ts',
    '**/qa-owned-lifecycle.spec.ts',
    '**/qa-skill-prerequisites.spec.ts',
    '**/boss-game.spec.ts',
    '**/invasion.spec.ts',
    '**/skills.spec.ts',
    '**/progression.spec.ts',
    '**/loi-dai.spec.ts',
    '**/standalone-pvp.spec.ts',
    '**/pvp-regressions.spec.ts',
    '**/practice.spec.ts',
    '**/ui-camera.spec.ts',
    '**/vo-dang-quyen-rework.spec.ts',
    '**/vo-dang-kiem-rework.spec.ts',
  ],
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: 'list',
  use: {
    baseURL: session.clientUrl,
    video: 'off',
    trace: {
      mode: 'retain-on-failure',
      screenshots: false,
      snapshots: true,
      sources: true,
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  globalSetup: './tests/e2e/global-setup.ts',
});
