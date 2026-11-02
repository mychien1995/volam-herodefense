import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./assets/reviews/nam_de_v02',testMatch:'review.spec.mjs',workers:1,timeout:180000,reporter:'list',
 outputDir:'.cache/nam-de-review/playwright',
 use:{channel:'msedge',viewport:{width:1280,height:720},video:'off',trace:'off'},
 webServer:{command:'node tools/serve-nam-de-review.mjs',url:'http://127.0.0.1:5413/assets/reviews/nam_de_v02/',reuseExistingServer:false,timeout:20000},
});
