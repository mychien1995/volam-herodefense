import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['bamboo-forest.spec.ts', 'dungeons.spec.ts', 'gameplay.spec.ts'],
  // M3B starts with earned points and empty skill slots; the old free-skill
  // scenario belongs to its existing explicit legacy suite.
  grepInvert: /two clients agree on combat/,
  workers: 1,
  fullyParallel: false,
  timeout: 180000,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5187', video: 'off', trace: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  globalSetup: './tests/e2e/bamboo-setup.ts',
});
