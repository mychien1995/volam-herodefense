import { defineConfig } from '@playwright/test';

import { qaSession } from './tools/qa-session.mjs';
const session = qaSession({
  profile: 'arena-creeps',
  serverPort: 2588,
  clientPort: 5186,
  outputDir: 'artifacts/arena-creeps-13-16-playwright',
});
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'arena-creeps-13-16.spec.ts',
  outputDir: session.outputDir,
  fullyParallel: false,
  workers: 1,
  timeout: 360000,
  reporter: [['list']],
  use: { video: 'off', trace: 'off' },
});
