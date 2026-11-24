import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {qaBrowserEnvironment} from '../../../tools/qa-preflight.mjs';
Object.assign(process.env,qaBrowserEnvironment());
const {chromium}=await import('@playwright/test');
const directory='docs/evidence/thien-su-reference-sweep-2026-11-24',url='http://127.0.0.1:5634/moves?action=sweep';
await mkdir(directory,{recursive:true});const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(url);await page.waitForFunction(()=>window.__THIEN_SU_REFERENCE__?.ready);
 const results=[];let objectCount;
 for(const id of ['sweep','slam','sweep']){
  await page.locator('#action').selectOption(id);
  await page.waitForFunction(id=>{const s=window.__THIEN_SU_REFERENCE__.snapshot();return s.id===id&&s.cycles>=2&&s.seen.length===4},id);
  const played=await page.evaluate(()=>window.__THIEN_SU_REFERENCE__.snapshot());
  assert.deepEqual(new Set(played.seen),new Set(played.frames));objectCount??=played.objects;assert.equal(played.objects,objectCount);
  const selected=[];
  for(let i=0;i<4;i++){
   await page.locator('#poses button').nth(i).click();
   await page.waitForFunction(({id,i})=>{const s=window.__THIEN_SU_REFERENCE__.snapshot();return s.id===id&&s.index===i&&s.paused&&s.renderLog.at(-1)?.frame===s.frame},{id,i});
   const s=await page.evaluate(()=>window.__THIEN_SU_REFERENCE__.snapshot());
   assert.equal(s.scale,3);assert.deepEqual(s.position,[440,525]);selected.push({index:i,frame:s.frame,scale:s.scale,position:s.position});
  }
  results.push({id,played,selected});
 }
 await page.locator('#poses button').nth(2).click();
 await page.waitForFunction(()=>window.__THIEN_SU_REFERENCE__.snapshot().renderLog.at(-1)?.frame==='sweep_2_right');
 await page.screenshot({path:directory+'/sweep-preview.png'});
 await page.locator('#speed').selectOption('0.5');await page.locator('#restart').click();
 await page.waitForFunction(()=>window.__THIEN_SU_REFERENCE__.snapshot().clock>100);await page.locator('#play').click();
 assert.equal(await page.locator('#play').textContent(),'Tiếp tục');
 await page.locator('#zoom').selectOption('0.5');assert.equal(await page.evaluate(()=>window.__THIEN_SU_REFERENCE__.snapshot().scale),.5);
 await page.locator('#speed').selectOption('0.25');await page.locator('#progress').fill('900');
 await page.waitForFunction(()=>window.__THIEN_SU_REFERENCE__.snapshot().index===3);
 assert.deepEqual(errors,[]);
 await writeFile(directory+'/observations.json',JSON.stringify({status:'PASS',scope:'Additional four-key-pose sweep study and retained overhead selector in live Phaser; no gameplay/final animation approval.',url,results,controls:['pause','restart','pose seek','timeline seek','half speed','quarter speed selection','gameplay size','action switching'],errors},null,2)+'\n');
 console.log('PASS: both four-pose studies rendered, switch/reset stable, controls work, zero browser errors.');
}finally{await browser.close()}
