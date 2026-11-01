const {chromium}=require(process.env.VOLAM_REVIEW_PLAYWRIGHT||'@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
let browser;
(async()=>{
 const started=Date.now();browser=await chromium.launch({headless:true,channel:'msedge'});const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:5198/assets/reviews/bosses/hoan_nhan_hong_liet_v01/?v=3');await page.waitForFunction(()=>window.artReview?.ready,null,{timeout:15000});
 const set=o=>page.evaluate(o=>artReview.set(o),o),report={scope:'v03 standalone art only; no Phaser/combat/multiplayer',video:false,trace:false,errors,checks:[]};
 const warning=await set({clip:'cannons',time:.8});assert.equal(warning.draws.filter(d=>d.role==='perimeter_cannon').length,16);assert.equal(warning.draws.filter(d=>d.role==='full_arena_warning').length,8);
 for(const axis of ['horizontal','vertical'])assert.equal(warning.draws.filter(d=>d.role==='full_arena_warning'&&d.axis===axis).length,4);
 for(const time of [1.6001,2.1,3.6,4.8,5.7]){
  const s=await set({clip:'cannons',time}),guns=s.draws.filter(d=>d.role==='perimeter_cannon'),flash=s.draws.filter(d=>d.role==='cannon_muzzle_flash');
  assert.equal(guns.length,16);assert.equal(flash.length,16);assert.equal(s.geometry.routes.length,16);
  for(const axis of ['horizontal','vertical']){assert.equal(flash.filter(d=>d.axis===axis).length,8);assert.ok(s.geometry.bolts.some(b=>b.axis===axis));}
 }
 for(const axis of ['horizontal','vertical']){
  const span=axis==='horizontal'?710:490,travel=span/600,s=await set({clip:'cannons',time:1.6+travel-.001}),shots=s.geometry.bolts.filter(b=>b.axis===axis&&b.volley===0);
  assert.equal(shots.length,8);for(const b of shots)assert.ok(Math.hypot(b.position[0]-b.to[0],b.position[1]-b.to[1])<1);
 }
 assert.equal((await set({clip:'cannons',time:7.2})).draws.filter(d=>d.role==='perimeter_cannon'||d.role==='cannon_bolt').length,0);
 report.checks.push({name:'16 perimeter cannons / 8 lanes, simultaneous axes, complete crossing and cleanup',result:'PASS'});
 const paths={right:[[390,475],[940,475]],left:[[900,475],[350,475]],down:[[640,230],[640,680]],up:[[640,680],[640,230]]};
 const positions=[];
 for(const [dir,[start,end]]of Object.entries(paths)){
  const warn=await set({clip:'lava',dir,time:.5});assert.deepEqual(warn.boss,start);assert.equal(warn.draws.filter(d=>d.role==='lava_dash_warning').length,1);assert.equal(warn.draws.filter(d=>d.role==='lava_dash_trail').length,0);
  for(const time of [1,1.2,1.4,1.6,1.8]){
   const s=await set({clip:'lava',dir,time}),u=Math.max(0,Math.min(1,(time-1)/.8));
   assert.ok(Math.abs(s.boss[0]-(start[0]+(end[0]-start[0])*u))<.001);assert.ok(Math.abs(s.boss[1]-(start[1]+(end[1]-start[1])*u))<.001);
   const actor=s.draws.find(d=>d.role==='lava_dash_boss');assert.ok(actor);assert.equal(actor.scaleX,1);assert.equal(actor.scaleY,1);
   const trail=s.draws.find(d=>d.role==='lava_dash_trail');
   if(u>0){assert.ok(trail);assert.equal(trail.asset,'vfx_lava_lane_v03');assert.ok(Math.abs(trail.laneClip.length-s.geometry.pathLength*u)<.001);assert.equal(trail.scaleY,1.2);assert.ok(trail.scaleY<1.55);}
   positions.push({dir,time,boss:s.boss,progress:s.geometry.progress,frame:actor.frame});
  }
  const hold=await set({clip:'lava',dir,time:3});assert.deepEqual(hold.boss,end);assert.equal(hold.geometry.progress,1);assert.equal(hold.draws.filter(d=>d.role==='lava_dash_trail').length,1);
  const cool=await set({clip:'lava',dir,time:12.8});assert.deepEqual(cool.boss,end);assert.equal(cool.geometry.trailActive,false);
  const clean=await set({clip:'lava',dir,time:13.8});assert.equal(clean.draws.filter(d=>d.role==='lava_dash_trail').length,0);
 }
 report.checks.push({name:'4-direction dash follows lane, trail behind feet only, retained endpoint, lingering/cooling/cleanup',result:'PASS'});report.positions=positions;
 await set({clip:'lava',dir:'right',time:1.01,playing:true});
 const live=await page.evaluate(async()=>{const out=[],start=performance.now();while(performance.now()-start<950){await new Promise(requestAnimationFrame);const s=artReview.snapshot();out.push({time:s.state.time,boss:s.boss,frame:s.draws.find(d=>d.role==='lava_dash_boss')?.frame});}return out;});
 const frames=[...new Set(live.map(s=>s.frame).filter(f=>f?.startsWith('right_walk')))],travel=Math.max(...live.map(s=>s.boss[0]))-Math.min(...live.map(s=>s.boss[0]));
 assert.equal(frames.length,4);assert.ok(travel>450);report.liveDash={observations:live.length,frames,travel};
 await set({clip:'cannons',time:2.1});await page.screenshot({path:path.join(__dirname,'review_cannon_v03_1x.png')});
 await set({clip:'lava',dir:'right',time:1.45});await page.screenshot({path:path.join(__dirname,'review_lava_dash_v03_1x.png')});
 await set({clip:'lava',dir:'right',time:2.5});await page.screenshot({path:path.join(__dirname,'review_lava_trail_v03_1x.png')});
 // Keep the two preceding user corrections intact while adding this revision.
 for(const dir of ['down','left','right','up']){
  assert.equal((await set({clip:'thrust',dir,time:.94})).draws.filter(d=>d.role==='a1_forward_blade').length,3);
  assert.equal((await set({clip:'sweep',dir,time:.94})).geometry.reachMultiplier,1.5);
 }
 for(const [width,height]of [[1920,1080],[960,600]]){await page.setViewportSize({width,height});for(const clip of ['lava','cannons'])assert.equal((await set({clip,time:clip==='lava'?1.4:2.1})).errors.length,0);}
 assert.equal(errors.length,0,JSON.stringify(errors));report.result='PASS_V03_STANDALONE_ONLY';report.elapsedSeconds=(Date.now()-started)/1000;
 await fs.writeFile(path.join(__dirname,'browser_validation_v03.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:report.result,checks:report.checks,liveDash:report.liveDash,elapsedSeconds:report.elapsedSeconds,errors}));await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1;});
