import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {qaBrowserEnvironment} from './qa-preflight.mjs';
import {startQaStatic} from './qa-static.mjs';
Object.assign(process.env,qaBrowserEnvironment());
const {chromium}=await import('@playwright/test');
const folder=resolve(process.env.SKILL_REVISE_MOTION_EVIDENCE??'docs/evidence/skill-revise-sweep-v03'),port=Number(process.env.SKILL_REVISE_E2E_PORT??5610);
await mkdir(folder,{recursive:true});
const close=await startQaStatic({script:'assets/reviews/skill-revise-v01/serve.mjs',port,environment:{SKILL_REVISE_REVIEW_PORT:String(port)},directory:folder});
let browser;const errors=[],results=[];
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1366,height:768}});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:'+port+'/');
 await page.waitForFunction(()=>window.__SKILL_REVISE_E2E__?.ready,{timeout:20000});
 const api=fn=>page.evaluate(fn);
 const all=await api(()=>window.__SKILL_REVISE_E2E__.actions);
 assert(!all.some(a=>['sword-basic','lightning-ring'].includes(a.id)),'unchanged attacks/E must not be presented as reworks');
 const run=async(id,direction='right')=>{
  await page.evaluate(({id,direction})=>window.__SKILL_REVISE_E2E__.run(id,direction),{id,direction});
  await page.waitForFunction(()=>{const s=window.__SKILL_REVISE_E2E__.snapshot();return s.completed&&s.lastRender?.at===s.clock},null,{timeout:12000});
  const s=await api(()=>window.__SKILL_REVISE_E2E__.snapshot());
  assert.equal(s.visible.filter(n=>n.kind==='actor').length,1,id+' must end with one actor');
  assert.equal(s.visible.filter(n=>n.kind==='effect').length,0,id+' leaves stale VFX');
  assert(s.trace.some(e=>e.type==='complete'),id+' missing rendered completion');
  const cues=type=>s.trace.filter(e=>e.type===type);
  if(id==='monk-combo'){assert.deepEqual(cues('contact').map(c=>c.beat),['thrust','rising','sweep','slam']);assert.equal(s.renderedFrames.filter(f=>f.startsWith('thien-su-v2:')).length,18,'retain the other three v02 strikes');assert.equal(s.renderedFrames.filter(f=>f.startsWith('sweep-v3:')).length,6,'observe all six new sweep poses');assert(cues('contact').every(c=>c.visible.find(n=>n.kind==='actor').scaleX===.5),'no runtime enlargement/shrinking of attacks')}
  if(id==='seven-swords'){assert.equal(cues('sword-impact').length,7);assert.equal(new Set(cues('sword-impact').map(c=>c.at)).size,7)}
  if(id==='five-swords'){assert.equal(cues('formation-impact').length,5);assert.equal(new Set(cues('formation-impact').map(c=>c.at)).size,1);assert(cues('formation-impact').every(c=>c.stun===false))}
  if(id==='air-bombs'){assert.equal(cues('bomb-impact').length,3);assert(cues('bomb-impact').every(c=>c.point.x>780))}
  if(id==='air-feathers')assert.equal(cues('projectile-end').length,3);
  if(id==='eight-darts'){assert.equal(cues('dart-release').length,8);const event=cues('dart-release')[0];assert.equal(event.visible.filter(n=>n.texture==='dm-fx').length,8);assert(event.visible.find(n=>n.kind==='actor').x>=760)}
  if(id==='fire-dash'){const event=cues('impact')[0];assert.equal(event.point.x,835);assert.equal(event.visible.find(n=>n.kind==='actor').x,835)}
  if(id==='wind-retreat'||id==='wind-crescent'){const event=cues('release')[0];assert.equal(event.at,420);assert.equal(event.visible.find(n=>n.kind==='actor').x,572);assert(event.visible.filter(n=>n.kind==='dummy').every(n=>n.x===895))}
  if(id==='sonic-ink'){assert.equal(cues('impact')[0].point.x,835);assert.equal(cues('ink-impact').length,5);assert.equal(cues('ink-impact')[0].visible.filter(n=>n.texture==='ink-impact').length,5);assert.equal(new Set(cues('ink-impact').map(c=>c.point.x+','+c.point.y)).size,5)}
  if(id==='lightning-parry')assert.equal(cues('negate').length,1);
  if(id==='fan-three')assert.deepEqual(s.trace.filter(c=>['release','stop','recall'].includes(c.type)).map(c=>c.type),['release','stop','recall']);
  results.push({id,direction,duration:s.duration,renderedFrames:s.renderedFrames.length,events:s.trace.map(({visible,...cue})=>({...cue,visible:visible.map(n=>({kind:n.kind,texture:n.texture,frame:n.frame,x:n.x,y:n.y}))}))});
  console.log('Rendered '+id+' / '+direction);return s;
 };
 for(const a of all)await run(a.id);
 // Exercise the whole hammer chain in each other direction at ordinary playback speed.
 for(const direction of ['down_right','down','down_left','left','up_left','up','up_right'])await run('monk-combo',direction);
 const staged=async(id,time)=>{await page.evaluate(({id,time})=>{window.__SKILL_REVISE_E2E__.run(id);window.__SKILL_REVISE_E2E__.seek(time)},{id,time});await page.waitForFunction(time=>window.__SKILL_REVISE_E2E__.snapshot().lastRender?.at===time,time);return api(()=>window.__SKILL_REVISE_E2E__.snapshot())};
 const feathers=(await staged('air-feathers',500)).visible.filter(n=>n.texture==='dm-fx');
 assert.equal(feathers.length,3);assert(feathers.every(n=>n.frame==='feather'&&n.scaleX===.55),'use current game feather and game scale');
 const bombs=(await staged('air-bombs',650)).visible.filter(n=>n.texture==='ice-bomb');
 assert.equal(bombs.length,3);assert(bombs.every(n=>n.frame.startsWith('bomb')&&n.scaleX===.175),'halve bomb scale from .35');
 const inkA=(await staged('sonic-ink',1050)).visible.filter(n=>n.texture==='ink-impact').map(n=>[n.x,n.y]);
 const inkB=(await staged('sonic-ink',1050)).visible.filter(n=>n.texture==='ink-impact').map(n=>[n.x,n.y]);
 assert.notDeepEqual(inkA,inkB,'ink positions must vary between casts');
 // All compositions and directions must resolve real frames before the first rendered take.
 for(const a of all)for(const direction of ['down','left','up','down_right','down_left','up_left','up_right']){
  await page.evaluate(({id,direction})=>{window.__SKILL_REVISE_E2E__.run(id,direction);window.__SKILL_REVISE_E2E__.pause()},{id:a.id,direction});
 }
 await api(()=>{window.__SKILL_REVISE_E2E__.run('air-laser');window.__SKILL_REVISE_E2E__.seek(900)});
 await page.waitForFunction(()=>window.__SKILL_REVISE_E2E__.snapshot().lastRender?.at===900);
 const laser=await api(()=>window.__SKILL_REVISE_E2E__.snapshot());
 assert(laser.visible.find(n=>n.kind==='actor').x>770,'air laser must move the actor');
 assert(laser.visible.filter(n=>n.texture==='laser-ground').length>=3,'downcast/contact/ground trail must be present');
 await page.waitForTimeout(150);
 assert.equal((await api(()=>window.__SKILL_REVISE_E2E__.snapshot())).clock,900,'pause changed review clock');
 // Changing action during an effect destroys the old scene objects.
 for(let i=0;i<12;i++)await api(()=>{window.__SKILL_REVISE_E2E__.run('air-bombs');window.__SKILL_REVISE_E2E__.seek(1000);window.__SKILL_REVISE_E2E__.run('monk-thrust');window.__SKILL_REVISE_E2E__.pause()});
 const clean=await api(()=>window.__SKILL_REVISE_E2E__.snapshot());
 assert.equal(clean.displayObjects,clean.objects+1,'cancel/restart leaked scene objects');
 assert(clean.visible.every(n=>!n.texture.startsWith('ice-')));
 for(const [id,time] of [['monk-sweep',320]]){
  await page.evaluate(({id,time})=>{window.__SKILL_REVISE_E2E__.run(id,'down');window.__SKILL_REVISE_E2E__.seek(time)},{id,time});
  await page.waitForFunction(time=>window.__SKILL_REVISE_E2E__.snapshot().lastRender?.at===time,time);
  await page.screenshot({path:resolve(folder,id+'.png')});
 }
 assert.deepEqual(errors,[]);
 const report={status:'PASS',scope:'Isolated end-to-end Phaser motion composition; no game authority/combat/multiplayer or final art approval',scenarios:all.length,continuousTakes:results.length,directionalCompositions:all.length*8,results,errors,pauseSeek:true,cancelCleanup:true};
 await writeFile(resolve(folder,'playback.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,scenarios:report.scenarios,continuousTakes:report.continuousTakes,directionalCompositions:report.directionalCompositions,errors}));
}catch(e){await writeFile(resolve(folder,'failure-'+Date.now()+'.json'),JSON.stringify({status:'FAIL',error:String(e),results,errors},null,2));throw e}
finally{await browser?.close();await close()}
