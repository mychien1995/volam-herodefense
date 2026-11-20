import { test } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeNamDe, spawnNamDeIfReady, BacCaiEncounter } from '@volam/game-core';
import { namDeDefinition, bacCaiDefinition } from '@volam/game-data';
import { verifyRenovationRuntime } from '../../tools/verify-renovation-runtime.mjs';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
import { waitForQa } from '../../tools/qa-wait.mjs';
test('boss batch2 representative locomotion source pilots',async({browser})=>{
 await verifyRenovationRuntime(browser,{players:2,compareLegacy:false,selectionTimeout:120000,clientDist:'.cache/boss-coherence-dist',evidenceDir:qaEvidenceDirectory('docs/evidence/boss-batch2'),onReady:async({room,pages,out}:any)=>{
  mkdirSync(out,{recursive:true});const sim=room.simulation,w=room.world,c=sim.arena.config,heroes=[...w.heroes.values()] as any[],page=pages[0],report:any={status:'PASS',scope:'one-facing live source pilots; no full encounter/skill acceptance',cases:[]};
  sim.invasion.nextWaveTick=w.tick+100000;
  const clean=()=>{w.creeps.clear();w.projectiles.clear();w.areas=[];w.shots=[];w.actions=[];sim.dongTa.phase='waiting';sim.tayDoc.phase='waiting';sim.mainBosses.encounter=undefined;w.namDe=undefined;sim.waveArena=undefined;sim.lockWaveArena(false);};
  for(const id of ['tay_doc','tay_doc_cap_mo','nam_de','bac_cai']){
   clean();let actor:any;
   if(id.startsWith('tay_doc')){assert.ok(sim.tayDoc.spawn(w,c));sim.tayDoc.phase=id.endsWith('cap_mo')?'phase2':'phase1';sim.tayDoc.nextActionAt=w.tick+100000;actor=w.creeps.get(sim.tayDoc.bossId);}
   else if(id==='nam_de'){initializeNamDe(w,c,namDeDefinition);w.namDe.phase='rest';w.namDe.spawnAt=0;spawnNamDeIfReady(w,c,w.tick);w.namDe.phase='combat';w.namDe.nextActionAt=w.namDe.nextSmallAt=w.tick+100000;actor=w.creeps.get('boss_nam_de');}
   else {const e:any=new BacCaiEncounter(bacCaiDefinition);e.initialize(w,c);e.phase='combat';e.nextAction=w.tick+100000;sim.mainBosses.encounter=e;actor=w.creeps.get(e.bossId);}
   assert.ok(actor,id+' spawned');Object.assign(actor,{x:700,y:650,fx:1,fy:1,cooldown:w.tick+100000,pose:'idle',statuses:[]});heroes.forEach((h:any,i:number)=>Object.assign(h,{x:780+i*25,y:730+i*25,hp:100000,maxHp:100000,invulnerable:true,moveX:0,moveY:0,statuses:[]}));
   const read=()=>page.evaluate((id:string)=>(window as any).__VOLAM__.presentation().renovation.bodies.find((b:any)=>b.id===id&&b.visible),id);
   await waitForQa(async()=>{const b=await read();return b?.texture==='boss-unified:'+id;},'candidate live '+id,{timeout:15000});
   const cap=await page.evaluate(({id}:any)=>new Promise<any>(resolve=>{const start=performance.now(),frames=new Set<string>();const poll=()=>{const b=(window as any).__VOLAM__.presentation().renovation.bodies.find((b:any)=>b.id===id&&b.visible);if(b&&b.texture==='boss-unified:'+id)frames.add(String(b.frame));if(performance.now()-start>=2900)resolve({frames:[...frames]});else requestAnimationFrame(poll);};poll();}),{id});
   const b=await read();assert.equal(b.texture,'boss-unified:'+id);assert.deepEqual(b.scale,[.5,.5]);assert.ok(cap.frames.length>=2,'authored motion '+id);await page.locator('#viewport').screenshot({path:resolve(out,id+'.png')});report.cases.push({id,body:b,cap});
  }
  writeFileSync(resolve(out,'verification.json'),JSON.stringify(report,null,2));
 }});
});
