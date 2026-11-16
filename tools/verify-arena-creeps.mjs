import {boot} from '@colyseus/testing';
import {createServer} from 'vite';
import {createGameServer} from '../apps/game-server/dist/app.config.js';
import {m1Config} from '../packages/game-data/dist/index.js';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('.'),out=resolve(root,'docs/evidence/phase1f-integration');mkdirSync(out,{recursive:true});
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve(root,'.cache/ms-playwright');
const {chromium}=await import('@playwright/test');
const errors=[],contexts=[],poseEvidence=[],shots=[],sourceStats=new Map();
let server,client,browser;
const wait=async(fn,label,timeout=12000)=>{const end=Date.now()+timeout;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,70));}throw Error('Timeout: '+label);};
const read=p=>p.evaluate(()=>window.__VOLAM__.snapshot()),inspect=p=>p.evaluate(()=>window.__VOLAM__.presentation());
const shot=async(p,n)=>{await p.screenshot({path:resolve(out,n)});shots.push(n);};
try{
 server=await boot(createGameServer());
 assert((await fetch('http://127.0.0.1:2568/health')).ok,'test server health');
 process.env.VITE_SERVER_URL='http://127.0.0.1:2568';
 client=await createServer({root:resolve(root,'apps/game-client'),configFile:false,server:{host:'127.0.0.1',port:5175,strictPort:true,watch:null,hmr:false},define:{'import.meta.env.VITE_SERVER_URL':JSON.stringify('http://127.0.0.1:2568')}});
 await client.listen();
 browser=await chromium.launch({headless:true});
 const pages=[];let roomId;
 for(let n=0;n<6;n++){
  const context=await browser.newContext({viewport:{width:n===0?1920:1280,height:n===0?1080:720},deviceScaleFactor:1});contexts.push(context);
  const p=await context.newPage();pages.push(p);
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  p.on('requestfailed',r=>errors.push(r.url()+' '+r.failure()?.errorText));
  await p.goto('http://127.0.0.1:5175/?debug=1');await p.locator('[data-action=play]').click(); await p.locator('#pre-nickname').fill('Creep QA '+(n+1));
  await p.getByRole('button',{name:'Vào game',exact:true}).click();
  if(roomId){await p.getByLabel('Room code',{exact:true}).fill(roomId);await p.getByRole('button',{name:'Join by code',exact:true}).click();}
  else await p.getByRole('button',{name:'Create room',exact:true}).click();
  await wait(async()=>!!(await read(p))?.roomId,'join');
  roomId??=(await read(p)).roomId;
 }
 await pages[0].getByRole('button',{name:'Start Game',exact:true}).click();
 for(const p of pages){
  await p.locator('[data-school=cai_bang]').click();
  await p.getByRole('button',{name:'Confirm Selection',exact:true}).click();
 }
 await wait(async()=>(await read(pages[5])).state.phase==='IN_GAME','six-player game start');
 await wait(async()=>(await inspect(pages[0])).ready,'Phaser ready');
 const room=server.getRoomById(roomId),definition=JSON.stringify(room.simulation.invasion.definition),saved=new Map();
 let sameWavePeer;
 assert.equal(room.world.heroes.size,6);
 // Test-only server fixture: exercise the existing director with normal stats/count scaling.
 // No public debug command, no browser state mutation, no production clock/rule edit.
 room.world.creeps.clear();
 for(let wave=1;wave<=12;wave++){
  room.simulation.invasion.nextWaveTick=room.world.tick+1;room.simulation.step();
  const e=[...room.world.creeps.values()].find(e=>e.invasion?.wave===wave);
  assert(e);saved.set(wave,e);sourceStats.set(wave,JSON.stringify(e.stats));
  if(wave===9)sameWavePeer=[...room.world.creeps.values()].find(v=>v.id!==e.id&&v.invasion?.wave===9);
  room.world.creeps.clear();
 }
 room.simulation.invasion.nextWaveTick=room.world.tick+room.simulation.invasion.definition.intervalTicks;
 const heroes=[...room.world.heroes.values()];
 heroes.forEach((h,i)=>{h.x=700+(i%4)*130;h.y=710+Math.floor(i/4)*65;h.fx=0;h.fy=-1;h.moveX=0;h.moveY=0;});
 const stun=e=>{e.statuses=[{kind:'stun',sourceId:'qa_server_fixture',abilityId:'qa_pose',durationTicks:3000,magnitude:1,until:room.world.tick+3000}];e.cooldown=room.world.tick+3000;e.actionUntil=room.world.tick+3000;e.hurtUntil=0;};
 const arrange=(waves,pose='idle',dir='down')=>{
  room.world.creeps.clear();
  for(const [i,wave]of waves.entries()){
   const e=saved.get(wave);e.x=700+(i%4)*130;e.y=waves.length===12?440+Math.floor(i/4)*100:waves.length===8?640+Math.floor(i/4)*130:640;
   e.fx=dir==='left'?-1:dir==='right'?1:0;e.fy=dir==='up'?-1:dir==='down'?1:0;
   e.hp=pose==='death'?0:e.maxHp;e.respawnAt=room.world.tick+3000;e.pose=pose;stun(e);room.world.creeps.set(e.id,e);
  }
 };
 arrange(Array.from({length:12},(_,i)=>i+1));
 await wait(async()=>(await inspect(pages[0])).actors.filter(a=>a.wave).length===12,'all12 rendered');
 const gallery=await inspect(pages[0]);
 assert.equal(gallery.arenaCreeps.length,12);assert(gallery.arenaCreeps.every(a=>a.texture&&a.animations.length===20));
 await shot(pages[0],'arena-waves-01-12.png');
 arrange(Array.from({length:8},(_,i)=>i+1));await pages[0].waitForTimeout(380);
 await shot(pages[0],'arena-waves-01-08.png');
 // Two genuine Wave9 spawns share a texture but retain independent animation state.
 assert(sameWavePeer);arrange([9]);
 Object.assign(sameWavePeer,{x:830,y:640,hp:sameWavePeer.maxHp,fx:1,fy:0,pose:'walk'});stun(sameWavePeer);
 room.world.creeps.set(sameWavePeer.id,sameWavePeer);
 await wait(async()=>{const a=(await inspect(pages[0])).actors;return a.some(v=>v.id===saved.get(9).id&&v.animation.endsWith(':idle:down'))&&a.some(v=>v.id===sameWavePeer.id&&v.animation.endsWith(':walk:right'));},'independent same-texture actors');
 await shot(pages[0],'arena-independent-instances.png');
 const manifests=JSON.parse(readFileSync('assets/arena_creeps.manifest.json','utf8'));
 const frameCoverage=new Map();
 for(const state of (process.argv.includes('--combat-only')?[]:['idle','walk','basic_attack','hurt','death'])){
  for(const dir of ['down','left','right','up']){
   arrange([9,10,11,12],state,dir);
   // A different network pose between repeated samples ensures a genuine new action transition.
   if(state==='basic_attack'||state==='hurt')for(const e of room.world.creeps.values())e.actionUntil=room.world.tick+3000;
   const seen=new Map(),end=Date.now()+1150;
   while(Date.now()<end){
    const p=await inspect(pages[0]);
    for(const a of p.actors.filter(a=>a.wave>=9)){
     if(!String(a.animation).endsWith(':'+state+':'+dir))continue;
     const set=seen.get(a.texture)||new Set();set.add(String(a.frame));seen.set(a.texture,set);
    }
    await pages[0].waitForTimeout(25);
   }
   for(const wave of [9,10,11,12]){
    const m=manifests.assets.find(a=>a.wave===wave),anim=m.animations.find(a=>a.state===state&&a.direction===dir);
    const observed=new Set((await inspect(pages[0])).observedCreepFrames[m.id+':'+state+':'+dir]||[]);
    assert.equal(observed.size,anim.frames.length,'actual arena frames '+m.id+' '+state+' '+dir);
    frameCoverage.set(m.id+':'+state+':'+dir,[...observed]);
   }
   const p=await inspect(pages[0]);assert(p.actors.filter(a=>a.wave>=9).every(a=>a.depth===a.y&&a.scale.every(v=>v===1)));
   poseEvidence.push({state,dir,actors:p.actors.filter(a=>a.wave>=9)});
   if(dir==='down'||state==='walk')await shot(pages[0],'arena-'+state+'-'+dir+'.png');
   // Reset via idle so a one-shot with a new direction can restart without replacing an active hit.
   if(['basic_attack','hurt','death'].includes(state)){arrange([9,10,11,12],'idle','down');await pages[0].waitForTimeout(380);}
  }
 }
 // Real controls and synchronized server position with six independent browser contexts.
 const sixth=heroes[5],startX=sixth.x;
 await pages[5].locator('#game canvas').focus();await pages[5].keyboard.down('ArrowRight');await pages[5].waitForTimeout(180);await pages[5].keyboard.up('ArrowRight');
 await wait(async()=>Object.values((await read(pages[0])).state.players).some(h=>Math.abs(h.x-startX)>8&&Math.abs(h.x-sixth.x)<3),'sixth movement synchronization');
 // Natural AI attacks/hits at unchanged stats. No fake combat messages or HP injection.
 for(const p of pages.slice(4)){
  await p.locator('[data-menu=settings]').click();await p.locator('#dialog-content [data-menu=skills]').click();
  await p.getByLabel('Normal attack').selectOption('cai_bang_chuong');await p.keyboard.press('Escape');
 }
 const naturalStart=(await inspect(pages[0])).sceneTime;
 arrange([9,10,11,12]);
 heroes.forEach((h,i)=>{h.x=700+(i<4?i:i-2)*130;h.y=i<4?660:760;h.fx=0;h.fy=-1;h.moveX=0;h.moveY=0;});
 for(const e of room.world.creeps.values()){
  e.statuses=[];e.actionUntil=room.world.tick;e.cooldown=room.world.tick;e.hurtUntil=0;
  e.invasion.targetId='';e.invasion.reacquireAt=0;e.invasion.chaseOrigin={x:e.x,y:e.y};
 }
 const ids=[...room.world.creeps.keys()];
 await wait(async()=>(await inspect(pages[0])).impacts.map(a=>a.id).filter((a,i,v)=>v.indexOf(a)===i).length===4,'four real enemy impact types');
 await shot(pages[0],'arena-natural-attacks.png');
 const afterAttacks=await read(pages[0]);assert(afterAttacks.events.some(e=>e.abilityId==='creep_strike'&&e.kind==='hit'));
 const deathCaptured=new Set(),end=Date.now()+30000;
 while(Date.now()<end&&ids.some(id=>(room.world.creeps.get(id)?.hp??0)>0)){
  await Promise.all(pages.map(async p=>{await p.locator('#game canvas').focus();await p.keyboard.press('KeyA');}));
  await pages[0].waitForTimeout(820);
  for(const [wave,e]of saved){
   if(wave>=9&&e.hp===0&&!deathCaptured.has(wave)){deathCaptured.add(wave);await shot(pages[0],'arena-death-wave-'+wave+'.png');}
  }
 }
 assert(ids.every(id=>(room.world.creeps.get(id)?.hp??0)===0),'all four enemies killed by real A commands');
 await pages[0].waitForTimeout(1000);
 const completed=await inspect(pages[0]);
 for(const id of ids){
  assert(completed.completedAnimations.some(a=>a.id===id&&a.at>=naturalStart&&a.key.includes(':death:')),'natural death completes '+id);
  assert(completed.completedAnimations.some(a=>a.id===id&&a.at>=naturalStart&&a.key.includes(':hurt:')),'natural hurt completes '+id);
 }
 const spirit=completed.actors.find(a=>a.wave===10);if(spirit)assert.equal(spirit.alpha,0);
 const aState=await read(pages[0]),bState=await read(pages[1]);
 assert.equal(Object.keys(aState.state.players).length,6);
 for(const id of ids)assert.equal(aState.state.creeps[id]?.hp??0,bState.state.creeps[id]?.hp??0);
 assert(Object.values(aState.state.players).some(h=>h.xp>0));
 assert.equal(JSON.stringify(room.simulation.invasion.definition),definition);
 for(const [wave,e]of saved)assert.equal(JSON.stringify(e.stats),sourceStats.get(wave));
 assert.equal(room.simulation.invasion.wave,12);
 assert.equal(errors.length,0,errors.join('\n'));
 const report={status:'PASS',fixture:'Actual six-browser MatchRoom/ArenaScene. Director deadlines triggered in a server-owned fixture for Waves1–12; normal production180s cadence/stat recipes unmodified. Existing stun used only for deterministic pose coverage; natural AI and real A inputs used for combat.',sixClients:true,networkMovement:true,synchronizedHp:true,rewards:true,all12Textures:true,controlledPoseFrames:Object.fromEntries(frameCoverage),poseEvidence,completed:completed.completedAnimations,impactEvents:completed.impacts,screenshots:shots,errors,recording:false,serverStatsUnchanged:true,productionWaveDefinitionUnchanged:true};
 report.independentInstances=true;
 writeFileSync(resolve(out,process.argv.includes('--combat-only')?'combat_diagnostic.json':'integration_verification.json'),JSON.stringify(report,null,2)+'\n');
 console.log('PASS: six real clients,12 textures, four-direction arena pose coverage, real attack/hit/death/rewards/impacts, synchronization and unchanged stats/definition.');
}catch(e){const p=contexts[0]?.pages()[0];const diagnostics=p?{snapshot:await read(p),presentation:await inspect(p)}:{};if(p)await shot(p,'arena-failure.png');writeFileSync(resolve(out,'failure.json'),JSON.stringify({error:String(e),stack:e.stack,errors,screenshots:shots,...diagnostics},null,2));throw e;}
finally{for(const c of contexts)await c.close();await browser?.close();await client?.close();await server?.shutdown();}

