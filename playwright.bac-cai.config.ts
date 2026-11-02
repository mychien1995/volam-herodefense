import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['bac-cai-runtime.spec.ts', 'bac-cai-preview.spec.ts'],
  workers: 1,
  fullyParallel: false,
  timeout: 240000,
  outputDir: './artifacts/bac-cai-runtime-browser',
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://127.0.0.1:${process.env['VOLAM_QA_CLIENT_PORT'] ?? 5397}`,
    viewport: { width: 1440, height: 1000 },
    video: 'off',
    trace: 'off',
    launchOptions: {
      args: [
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
      ],
    },
  },
  globalSetup: './tests/e2e/bac-cai-setup.ts',
});
