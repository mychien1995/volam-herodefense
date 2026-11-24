import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {qaBrowserEnvironment} from './qa-preflight.mjs';
import {startQaStatic} from './qa-static.mjs';
Object.assign(process.env,qaBrowserEnvironment());
const {chromium}=await import('@playwright/test');
const folder=resolve('docs/evidence/skill-revise-production'),port=Number(process.env.SKILL_REVISE_REVIEW_PORT??5608);
await mkdir(folder,{recursive:true});
const close=await startQaStatic({script:'assets/reviews/skill-revise-v01/serve.mjs',port,environment:{SKILL_REVISE_REVIEW_PORT:String(port)},directory:folder});
let browser;const errors=[],results=[];
try {
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1366,height:768}});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto('http://127.0.0.1:'+port+'/components');
  await page.waitForFunction(()=>window.__SKILL_REVISE__?.ready,{timeout:15000});
  const packs=await page.evaluate(()=>window.__SKILL_REVISE__.packs);
  for(const p of packs)for(const c of p.clips) {
    await page.evaluate(({id,name})=>window.__SKILL_REVISE__.select(id,name),{id:p.id,name:c.name});
    await page.waitForFunction(({id,name,n})=>new Set(window.__SKILL_REVISE__.snapshot().history.filter(e=>e.key===id+':'+name).map(e=>e.frame)).size===n,{id:p.id,name:c.name,n:c.frames.length},{timeout:15000});
    if(!c.loop)await page.waitForFunction(()=>!window.__SKILL_REVISE__.snapshot().playing,{timeout:15000});
    const presentation=await page.evaluate(()=>window.__SKILL_REVISE__.snapshot());
    if(presentation.origin.some((v,i)=>Math.abs(v-p.pivot[i])>1e-6)||Math.abs(presentation.scale-(p.scale??.5))>1e-6)throw Error('Unstable pivot/scale: '+p.id+':'+c.name);
    const seen=await page.evaluate(({id,name})=>[...new Set(window.__SKILL_REVISE__.snapshot().history.filter(e=>e.key===id+':'+name).map(e=>e.frame))],{id:p.id,name:c.name});
    results.push({pack:p.id,clip:c.name,framesObserved:seen.length,expected:c.frames.length});
  }
  await page.evaluate(()=>window.__SKILL_REVISE__.select('thien-su','thrust_down_right'));
  await page.screenshot({path:resolve(folder,'phaser-native.png')});
  const snapshot=await page.evaluate(()=>window.__SKILL_REVISE__.snapshot());
  if(errors.length)throw Error(errors.join('\n'));
  const report={status:'PASS',scope:'Isolated Phaser raster/animation playback only; no authority, multiplayer, combat or final art approval',packs:packs.length,clips:results.length,frames:results.reduce((n,r)=>n+r.framesObserved,0),results,errors,renderer:{scale:snapshot.scale,origin:snapshot.origin,zoom:snapshot.zoom}};
  await writeFile(resolve(folder,'playback.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,packs:report.packs,clips:report.clips,frames:report.frames,errors}));
} catch(e){await writeFile(resolve(folder,'playback-failure-'+Date.now()+'.json'),JSON.stringify({status:'FAIL',error:String(e),results,errors},null,2));throw e}
finally{await browser?.close();await close()}
