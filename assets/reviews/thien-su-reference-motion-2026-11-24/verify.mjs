import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {qaBrowserEnvironment} from '../../../tools/qa-preflight.mjs';
Object.assign(process.env,qaBrowserEnvironment());
const {chromium}=await import('@playwright/test');
const url='http://127.0.0.1:5634/',directory='docs/evidence/thien-su-reference-motion-2026-11-24';
await mkdir(directory,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
 await page.goto(url);await page.waitForFunction(()=>window.__THIEN_SU_REFERENCE__?.ready);
 await page.waitForFunction(()=>window.__THIEN_SU_REFERENCE__.snapshot().cycles>=2);
 const played=await page.evaluate(()=>window.__THIEN_SU_REFERENCE__.snapshot());
 assert.equal(played.seen.length,4);assert.equal(new Set(played.renderLog.map(f=>f.frame)).size,4);
 const selected=[];
 for(let i=0;i<4;i++){
  await page.locator('#poses button').nth(i).click();
  await page.waitForFunction(i=>{const s=window.__THIEN_SU_REFERENCE__.snapshot();return s.index===i&&s.paused&&s.renderLog.at(-1)?.frame===s.frame},i);
  selected.push(await page.evaluate(()=>window.__THIEN_SU_REFERENCE__.snapshot()));
 }
 assert(selected.every(s=>s.scale===3&&s.position[0]===440&&s.position[1]===525));
 assert(selected.every(s=>s.objects===played.objects));
 await page.screenshot({path:directory+'/contact.png'});
 await page.locator('#poses button').nth(1).click();
 await page.waitForFunction(()=>window.__THIEN_SU_REFERENCE__.snapshot().renderLog.at(-1)?.frame==='reference_1_right');
 await page.screenshot({path:directory+'/loaded.png'});
 await page.locator('#speed').selectOption('0.5');
 await page.locator('#restart').click();
 await page.waitForFunction(()=>window.__THIEN_SU_REFERENCE__.snapshot().clock>150);
 await page.locator('#play').click();
 assert.equal(await page.locator('#play').textContent(),'Tiếp tục');
 await page.locator('#zoom').selectOption('0.5');
 assert.equal(await page.evaluate(()=>window.__THIEN_SU_REFERENCE__.snapshot().scale),.5);
 assert.deepEqual(errors,[]);
 await writeFile(directory+'/observations.json',JSON.stringify({status:'PASS',scope:'Four-key-pose single-facing authoring study, live Phaser playback and controls; not game integration or final animation approval.',url,played,selected: selected.map(({index,frame,position,scale})=>({index,frame,position,scale})),errors},null,2)+'\n');
 console.log('PASS: four rendered poses, stable registration/scale, repeat, pause, seek, half-speed, gameplay-size control; no browser errors.');
}finally{await browser.close()}
