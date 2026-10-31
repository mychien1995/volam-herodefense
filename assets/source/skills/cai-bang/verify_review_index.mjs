import {createServer} from 'node:http';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../../..'),evidence=resolve(root,'assets/reviews/skills/cai-bang');
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve(root,'.cache/ms-playwright');
const {chromium}=await import('@playwright/test');
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.md':'text/plain'};
const server=createServer((req,res)=>{try{const p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!p.startsWith(root+sep))throw Error('Path');res.setHeader('Content-Type',mime[extname(p)]||'application/octet-stream');res.end(readFileSync(p));}catch{res.writeHead(404);res.end();}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true}),errors=[];let report;
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/assets/reviews/skills/cai-bang/index.html');
 const previews=await page.locator('.previews img').evaluateAll(imgs=>Promise.all(imgs.map(async im=>{im.loading='eager';await im.decode();return {src:im.getAttribute('src'),width:im.naturalWidth,height:im.naturalHeight};})));
 const manifest=JSON.parse(readFileSync(resolve(root,'assets/exports/skills/cai-bang/production_manifest_v1.json'),'utf8'));
 const expected=[...new Set(manifest.assets.filter(a=>a.kind==='character').map(a=>a.skillId))].length*4;
 if(previews.length!==expected||previews.some(im=>im.width!==1280||im.height!==720))throw Error('Invalid PNG preview');
 if(await page.locator('video').count())throw Error('Routine review must use PNG previews and the live Phaser viewer');
 await page.locator('.overview img').evaluateAll(imgs=>Promise.all(imgs.map(im=>{im.loading='eager';return im.decode();})));
 await page.locator('.overview').screenshot({path:resolve(evidence,'gameplay_contact_sheet.png')});
 await page.setViewportSize({width:900,height:900});await page.reload();
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Review horizontal overflow');
 await page.goto(origin+'/assets/reviews/skills/cai-bang/frames.html');
 const count=await page.locator('.frames img').count();if(count!==464)throw Error('Wrong frame album count');
 const broken=await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(async im=>{try{im.loading='eager';await im.decode();return null;}catch{return im.getAttribute('src');}})));
 if(broken.some(Boolean))throw Error('Broken frame album images');
 if(errors.length)throw Error(errors.join('\n'));
 report={status:'PASS',previews,screenshotPreviewCount:previews.length,individualFrameImages:count,responsiveReviewChecked:true,errors};
 writeFileSync(resolve(evidence,'review_index_validation.json'),JSON.stringify(report,null,2)+'\n');
 console.log('PASS: all PNG previews decode; 464 frame images decode; responsive review page and actual-render contact sheet captured.');
}finally{await browser.close();await new Promise(ok=>server.close(ok));}

