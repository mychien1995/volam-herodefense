import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'../..',testMatch:'**/viewer.spec.mjs',testIgnore:'**/history/**',workers:1,timeout:60000,
  outputDir:'../../previews/test-results',reporter:'line',
  use:{video:'off',trace:'off',screenshot:'off',viewport:{width:1280,height:720},deviceScaleFactor:1},
  // Start serve.mjs explicitly for this review task. Never borrow another task's
  // server; the persistent viewer is also the director's review surface.
});
