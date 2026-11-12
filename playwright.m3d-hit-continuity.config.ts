import { defineConfig, devices } from '@playwright/test';
import { qaSession } from './tools/qa-session.mjs';
const session = qaSession();

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'm3d-hit-continuity.spec.ts',
  outputDir: session.outputDir,
  workers: 1,
  timeout: 8 * 60_000,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], video: 'off', trace: 'off' },
});
