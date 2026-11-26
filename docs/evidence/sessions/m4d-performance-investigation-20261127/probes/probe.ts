import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { chromium } from '@playwright/test';
import { matchMaker } from '@colyseus/core';
import { addCreep } from '@volam/game-core';
import { MATCH_ROOM } from '@volam/game-protocol';
import { startOwnedGameQa } from '../../../../../tools/qa-game-services.mjs';
import { qaWorkflowSession } from '../../../../../tools/qa-session.mjs';
import { joinWaiting, startTogether } from '../../../../../tests/e2e/pregame-helper.ts';
import { observeQa, pressQaAndWait } from '../../../../../tools/qa-browser.mjs';
process.chdir(new URL('../../../../../', import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1'));
const out = resolve('docs/evidence/sessions/m4d-performance-investigation-20261127');
mkdirSync(out, { recursive: true });
const report:any = { date:'2026-11-27', scope:'Two local headless Chromium contexts, development client, synthetic stationary creep loads; no gameplay changes; no GPU or WAN guarantee', phases:[], errors:[] };
const save = () => writeFileSync(resolve(out,'measurements.json'), JSON.stringify(report,null,2));
const stats = (a:number[]) => { const b=a.slice().sort((x,y)=>x-y); return {n:a.length, mean:a.reduce((x,y)=>x+y,0)/(a.length||1), p50:b[Math.floor(b.length*.5)]??0,p95:b[Math.floor(b.length*.95)]??0,p99:b[Math.floor(b.length*.99)]??0,max:b.at(-1)??0}; };
const session = qaWorkflowSession('browser',['--config','playwright.config.ts']);
const stop = await startOwnedGameQa({session,clientMode:'development',loadClientConfig:true,environment:{NODE_ENV:'development',VOLAM_INPUT_TIMING:'1',VOLAM_DEV_PRACTICE_CREEPS:'0'}});
let browser;
try {
 browser = await chromium.launch({headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 report.browser = browser.version();
 const contexts = await Promise.all([browser.newContext({baseURL:session.clientUrl,viewport:{width:1440,height:1000}}),browser.newContext({baseURL:session.clientUrl,viewport:{width:1440,height:1000}})]);
 const pages = await Promise.all(contexts.map(c=>c.newPage()));
 let wireBytes=0,wireFrames=0;
 for(const page of pages) { page.on('pageerror',e=>report.errors.push(String(e))); page.on('websocket',ws=>ws.on('framereceived',f=>{ wireBytes += typeof f.payload==='string'?Buffer.byteLength(f.payload):f.payload.length;wireFrames++;})); }
 console.log('Joining host'); await joinWaiting(pages[0], 'Perf host', undefined, '/?debug=1&inputTiming=1',45000);
 const roomId=await pages[0].evaluate(()=> (window as any).__VOLAM__.snapshot().roomId);
 await joinWaiting(pages[1], 'Perf peer', roomId, '/?debug=1&inputTiming=1',45000);
 console.log('Starting two clients'); await startTogether(pages,['cai_bang_chuong','vo_dang_kiem'],45000);
 const room:any=matchMaker.getLocalRoomById(roomId);
 report.roomId=roomId;
 // Synthetic controlled stress fixture. Simulation and network continue at real 30Hz.
 room.simulation.invasion=undefined;
 room.world.creeps.clear();
 for(const h of room.world.heroes.values()) { h.hp=h.maxHp=1e9;h.autoBasic=false; }
 let serverSamples:number[]=[],syncSamples:number[]=[];
 const step=room.simulation.step;
 room.simulation.step=function(...args:any[]) { const t=performance.now();try{return step.apply(this,args);}finally{serverSamples.push(performance.now()-t);} };
 const sync=room.syncState;
 room.syncState=function(...args:any[]) {const t=performance.now();try{return sync.apply(this,args);}finally{syncSamples.push(performance.now()-t);} };
 for(const page of pages) {
 await page.evaluate(async()=>{
  const {ArenaScene}=await import('/src/arena-scene.ts');
  const p= ArenaScene.prototype as any, orig=p.setSnapshot;
  p.setSnapshot=function(...a:any[]){ (window as any).__perfScene=this;return orig.apply(this,a);};
 });
 await pages[0].waitForTimeout(100);
 await page.waitForFunction(()=>!!(window as any).__perfScene);
 await page.evaluate(async()=>{
  const w=window as any,s=w.__perfScene;
  const {GameUI}=await import('/src/ui.ts');
  w.__perf={uiEnabled:true,ui:[],update:[],render:[],frames:[],longTasks:[],patches:[],counts:[],parts:{}};
  const p=GameUI.prototype as any, refresh=p.refresh;
  p.refresh=function(...a:any[]){const m=w.__perf;if(!m.uiEnabled)return;const t=performance.now();try{return refresh.apply(this,a);}finally{m.ui.push(performance.now()-t);m.patches.push(performance.now());}};
  const update=s.sys.sceneUpdate;
  s.sys.sceneUpdate=function(...a:any[]){const t=performance.now();try{return update.apply(this,a);}finally{w.__perf.update.push(performance.now()-t);}};
  for(const name of ['worldDepth','vfx','creepCombatArt','skillReviseArt','hitArt']) {
   const obj=s[name];if(!obj?.sync)continue;const fn=obj.sync;
   obj.sync=function(...a:any[]){const t=performance.now();try{return fn.apply(this,a);}finally{(w.__perf.parts[name]??=[]).push(performance.now()-t);}};
  }
  let pre=0,last=0;
  s.game.events.on('prerender',()=>pre=performance.now());
  s.game.events.on('postrender',()=>{const t=performance.now();w.__perf.render.push(t-pre);if(last)w.__perf.frames.push(t-last);last=t;});
  new PerformanceObserver(list=>{for(const e of list.getEntries()) w.__perf.longTasks.push({duration:e.duration,start:e.startTime});}).observe({type:'longtask',buffered:false});
 });
 }
 const host=pages[0], peer=pages[1];
 const hostId=await host.evaluate(()=>(window as any).__VOLAM__.snapshot().sessionId);
 const h=room.world.heroes.get(hostId);
 const before=h.x;
 await pressQaAndWait(host,'ArrowRight',(a:any)=>(window as any).__VOLAM__.snapshot().state.players[a.id].x>a.x+8,{id:hostId,x:before},{keyDelay:250,timeout:5000});
 await observeQa(peer,(a:any)=>Math.abs((window as any).__VOLAM__.snapshot().state.players[a.id].x-a.x)<2,{id:hostId,x:h.x},{timeout:5000});
 report.movement={serverX:h.x,peerAcknowledged:true,inputTiming:await host.evaluate(()=>(window as any).__VOLAM__.inputTiming())};
 const cdp=await host.context().newCDPSession(host);
 await cdp.send('Profiler.enable');
 const configs=[
  {count:0,offscreen:false,ui:true,depth:true},
  {count:80,offscreen:false,ui:true,depth:true},
  {count:200,offscreen:false,ui:true,depth:true},
  {count:200,offscreen:false,ui:false,depth:true},
  {count:200,offscreen:false,ui:true,depth:false},
  {count:200,offscreen:false,ui:true,depth:true},
  {count:200,offscreen:true,ui:true,depth:true},
 ];
 for(const [index,config] of configs.entries()) {
  room.world.creeps.clear();
  for(let i=0;i<config.count;i++) {
   const e:any=addCreep(room.world,'perf_'+i,{x:config.offscreen?100+(i%20)*14:h.x-220+(i%20)*23,y:config.offscreen?100+Math.floor(i/20)*14:h.y-160+Math.floor(i/20)*28},room.simulation.arena.config);
   e.invasionWave=1;e.neverRespawn=true;e.hp=e.maxHp=1e9;e.stats={...room.simulation.arena.config.creep,damage:0,speed:0};
  }
  await Promise.all(pages.map(p=>p.evaluate(c=>{const w=window as any;w.__perf.uiEnabled=c.ui;w.__VOLAM__.reviewWorldDepth(c.depth);},config)));
  await host.waitForTimeout(1800);
  await Promise.all(pages.map(p=>p.evaluate(()=>{const m=(window as any).__perf;for(const k of ['ui','update','render','frames','longTasks','patches'])m[k]=[];m.parts={};})));
  serverSamples=[];syncSamples=[];wireBytes=0;wireFrames=0;
  const t=performance.now();
  if(index===2) await cdp.send('Profiler.start');
  await host.waitForTimeout(6000);
  if(index===2) {const profile=await cdp.send('Profiler.stop');writeFileSync(resolve(out,'client-200.cpuprofile'),JSON.stringify(profile.profile));}
  const ms=performance.now()-t;
  const clients=await Promise.all(pages.map(p=>p.evaluate(()=>{
   const w=window as any,m=w.__perf,s=w.__perfScene;
   const times=m.patches.slice(1).map((t:number,i:number)=>t-m.patches[i]);
   const gl=s.game.renderer.gl;
   const dbg=gl?.getExtension('WEBGL_debug_renderer_info');
   return {metrics:{ui:m.ui,update:m.update,render:m.render,frames:m.frames,patchIntervals:times,...Object.fromEntries(Object.entries(m.parts).map(([k,v])=>['part_'+k,v]))},longTasks:m.longTasks,actors:s.actors.size,objects:s.children.list.length,textures:Object.keys(s.textures.list).length,visibility:document.visibilityState,renderer:s.game.renderer.type,gpu:dbg?gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL):null,heap:(performance as any).memory?.usedJSHeapSize};
  })));
  const row={config,milliseconds:ms,serverStep:stats(serverSamples),serverSync:stats(syncSamples),combinedWireKiBPerSec:wireBytes/1024/(ms/1000),wireFramesPerSec:wireFrames/(ms/1000),clients:clients.map(c=>({...c,metrics:Object.fromEntries(Object.entries(c.metrics).map(([k,v])=>[k,stats(v as number[])]))}))};
  report.phases.push(row);save();console.log(JSON.stringify({phase:index,config,serverP95:row.serverStep.p95,syncP95:row.serverSync.p95,clients:row.clients.map(c=>({actors:c.actors,objects:c.objects,frameP95:c.metrics.frames.p95,updateP95:c.metrics.update.p95,uiMean:c.metrics.ui.mean,renderP95:c.metrics.render.p95,depthMean:c.metrics.part_worldDepth?.mean}))}));
 }
 await Promise.all(pages.map(p=>p.evaluate(()=>{(window as any).__perf.uiEnabled=true;(window as any).__VOLAM__.reviewWorldDepth(true);})));
 report.resources=await host.evaluate(()=>performance.getEntriesByType('resource').map((e:any)=>({name:e.name.split('/').slice(-2).join('/'),bytes:e.encodedBodySize,decoded:e.decodedBodySize,duration:e.duration})).sort((a,b)=>b.bytes-a.bytes).slice(0,20));
 report.status='completed';save();
} catch(e) {report.status='failed';report.failure=String(e);save();throw e;}
finally{await browser?.close();await stop();}
