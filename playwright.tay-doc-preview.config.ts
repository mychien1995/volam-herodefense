import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'tay-doc-preview.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  reporter: 'list',
  outputDir: 'test-results/tay-doc-preview',
  use: { video: 'off', trace: 'off', screenshot: 'off' },
  webServer: {
    command: 'node assets/reviews/tay_doc_v02/server.mjs',
    url: 'http://127.0.0.1:5398',
    env: { TAY_DOC_REVIEW_PORT: '5398' },
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
