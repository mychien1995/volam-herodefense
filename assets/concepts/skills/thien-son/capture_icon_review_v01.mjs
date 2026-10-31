// Static concept HTML only. No game connection, video, tracing or runtime changes.
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../../..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(root,'.cache/ms-playwright');
const {chromium}=await import('@playwright/test');
const output=path.join(here,'thien-son-icon-overview-v01.png');
try { await fs.access(output); throw new Error('Existing overview preserved; use a new version'); }
catch(error) { if(error.code!=='ENOENT') throw error; }
const browser=await chromium.launch({headless:true});
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(pathToFileURL(path.join(here,'icon-review-v01.html')).href);
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(im=>im.decode()));});
 const result=await page.evaluate(()=>({cards:document.querySelectorAll('.card').length,images:document.images.length,allImagesLoaded:[...document.images].every(im=>im.complete&&im.naturalWidth===256),sizes:[...document.querySelectorAll('.sizes img')].map(im=>im.getBoundingClientRect().width)}));
 if(result.cards!==13||result.images!==52||!result.allImagesLoaded||result.sizes.some((x,i)=>x!==[64,48,32][i%3])||errors.length)throw new Error(JSON.stringify({result,errors}));
 await page.screenshot({path:output,fullPage:true,animations:'disabled'});
 await fs.writeFile(path.join(here,'icon_review_observations_v01.json'),JSON.stringify({scope:'static concept review only; not Phaser or gameplay verification',video:false,trace:false,errors,...result},null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',...result,output}));
 await context.close();
} finally {await browser.close();}
