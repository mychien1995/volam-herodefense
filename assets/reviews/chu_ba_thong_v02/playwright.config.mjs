import {defineConfig} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));
export default defineConfig({
 testDir:'.',testMatch:'review.spec.mjs',workers:1,timeout:90000,reporter:'list',
 outputDir:root+'/.cache/chu-ba-thong-review/playwright',
 use:{video:'off',trace:'off'},
 webServer:{command:'python -m http.server 5401 --bind 127.0.0.1',cwd:root,url:'http://127.0.0.1:5401/assets/reviews/chu_ba_thong_v02/index.html',reuseExistingServer:false,timeout:20000}
});
