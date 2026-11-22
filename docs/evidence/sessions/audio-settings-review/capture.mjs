import { chromium } from '@playwright/test';
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.goto('http://127.0.0.1:55871/?debug');
  await page.getByRole('button',{name:'Cài đặt',exact:true}).click();
  await page.screenshot({path:'docs/evidence/sessions/audio-settings-review/settings.png'});
} finally { await browser.close(); }
