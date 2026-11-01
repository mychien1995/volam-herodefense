const {chromium}=require(process.env.VOLAM_REVIEW_PLAYWRIGHT||'@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
let reviewBrowser;
(async()=>{
 const start=Date.now(),browser=reviewBrowser=await chromium.launch({headless:true,channel:'msedge'}),context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:5198/assets/reviews/bosses/hoan_nhan_hong_liet_v01/?v=2');
 await page.waitForFunction(()=>window.artReview?.ready,null,{timeout:15000});
 const set=o=>page.evaluate(o=>artReview.set(o),o),report={scope:'v02 standalone art choreography, no Phaser/server/multiplayer',video:false,trace:false,checks:[],errors};
 const dirs={down:Math.PI/2,left:Math.PI,right:0,up:-Math.PI/2};
 for(const [dir,center]of Object.entries(dirs)){
  for(const time of [.2,.72,.94,1.12]){
   const snap=await set({clip:'thrust',dir,time}),rays=snap.draws.filter(d=>d.role==='a1_forward_blade');
   assert.equal(rays.length,3);assert.equal(new Set(rays.map(r=>r.x+','+r.y)).size,1);
   const angles=rays.map(r=>Math.round((r.angle-center)*180/Math.PI));assert.deepEqual(angles,[-18,0,18]);
   assert.ok(rays.every(r=>r.scaleX>r.scaleY&&Math.cos(r.angle-center)>0&&r.frontClip.dir===dir));
  }
  const snap=await set({clip:'sweep',dir,time:.94}),arcs=snap.draws.filter(d=>d.role==='a2_front_semicircle');
  assert.equal(arcs.length,1);assert.ok(Math.abs(arcs[0].scaleX-1.05*1.5)<1e-10);
  assert.equal(arcs[0].frontClip.dir,dir);assert.deepEqual(arcs[0].pivot,[160,120]);
 }
 report.checks.push({name:'A1 three simultaneous forward fan rays',facings:4,spreadDegrees:[-18,0,18]},{name:'A2 increased reach with frontal-only clip',facings:4,multiplier:1.5});
 const warn=await set({clip:'cannons',time:.8}),warning=warn.draws.filter(d=>d.role==='full_arena_warning');
 assert.equal(warning.length,4);assert.equal(warning.filter(d=>d.axis==='horizontal').length,2);assert.equal(warning.filter(d=>d.axis==='vertical').length,2);
 assert.equal(warn.draws.filter(d=>d.role==='cannon_bolt').length,0);
 for(const w of warning){
  const width=308*w.scaleX,expected=w.axis==='horizontal'?710:490;
  assert.ok(Math.abs(width-expected)<.01);assert.equal(w.scaleY,.55);
 }
 for(const time of [1.6001,2.1,3.6,4.8,5.7]){
  const snap=await set({clip:'cannons',time}),guns=snap.draws.filter(d=>d.role==='perimeter_cannon'),flashes=snap.draws.filter(d=>d.role==='cannon_muzzle_flash');
  assert.equal(guns.length,8);assert.equal(flashes.length,8);
  assert.equal(flashes.filter(d=>d.axis==='horizontal').length,4);assert.equal(flashes.filter(d=>d.axis==='vertical').length,4);
  for(const gun of guns){const [x,y]=gun.muzzle;assert.ok(x===285||x===995||y===190||y===680);}
  assert.ok(snap.geometry.bolts.some(b=>b.axis==='horizontal'));assert.ok(snap.geometry.bolts.some(b=>b.axis==='vertical'));
 }
 // First volleys reach the opposite perimeter, then disappear after arrival.
 for(const axis of ['horizontal','vertical']){
  const travel=(axis==='horizontal'?710:490)/600;
  const near=await set({clip:'cannons',time:1.6+travel-.001}),first=near.geometry.bolts.filter(b=>b.axis===axis&&b.volley===0);
  assert.equal(first.length,4);
  for(const b of first)assert.ok(Math.hypot(b.to[0]-b.position[0],b.to[1]-b.position[1])<1,'shot does not reach opposite edge');
  const past=await set({clip:'cannons',time:1.6+travel+.001});assert.equal(past.geometry.bolts.filter(b=>b.axis===axis&&b.volley===0).length,0);
 }
 const drain=await set({clip:'cannons',time:6.3});assert.ok(drain.geometry.bolts.length>0);assert.equal(drain.draws.filter(d=>d.role==='cannon_muzzle_flash').length,0);
 const end=await set({clip:'cannons',time:7.2});assert.equal(end.draws.filter(d=>d.role?.startsWith('cannon')||d.role==='perimeter_cannon').length,0);
 report.checks.push({name:'Perimeter simultaneous volleys, both axes at 5 active times, full traversal, drain and cleanup',horizontalSpan:710,verticalSpan:490,guns:8,warningLanes:4});
 // Observe moving projectiles in real animation frames, not only seek snapshots.
 await set({clip:'cannons',time:1.7,playing:true});
 const live=await page.evaluate(async()=>{const frames=[],start=performance.now();while(performance.now()-start<1300){await new Promise(requestAnimationFrame);const s=artReview.snapshot();frames.push({time:s.state.time,bolts:s.geometry.bolts});}return frames;});
 assert.ok(live.length>10);assert.ok(live.some(s=>s.bolts.some(b=>b.axis==='horizontal')&&s.bolts.some(b=>b.axis==='vertical')));
 const right=live.flatMap(s=>s.bolts.filter(b=>b.axis==='horizontal'&&b.from[0]===285&&b.volley===0).map(b=>b.position[0]));assert.ok(Math.max(...right)-Math.min(...right)>300);
 report.live={observations:live.length,measuredHorizontalTravel:Math.max(...right)-Math.min(...right),bothAxesObserved:true};
 await set({clip:'thrust',dir:'right',time:.94});await page.screenshot({path:path.join(__dirname,'review_a1_v02_1x.png')});
 await set({clip:'sweep',dir:'down',time:.94});await page.screenshot({path:path.join(__dirname,'review_a2_v02_1x.png')});
 await set({clip:'cannons',dir:'down',time:2.1});await page.screenshot({path:path.join(__dirname,'review_cannon_v02_1x.png')});
 for(const [width,height]of [[1920,1080],[960,600]]){
  await page.setViewportSize({width,height});
  for(const clip of ['thrust','sweep','cannons']){const s=await set({clip,time:clip==='cannons'?2.1:.94});assert.equal(s.errors.length,0);}
  assert.equal(await page.locator('#viewport').evaluate(e=>e.getBoundingClientRect().width),width);
 }
 assert.equal(errors.length,0,JSON.stringify(errors));report.result='PASS_V02_STANDALONE_ONLY';report.elapsedSeconds=(Date.now()-start)/1000;
 await fs.writeFile(path.join(__dirname,'browser_validation_v02.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));await browser.close();
})().catch(async e=>{console.error(e);if(reviewBrowser)await reviewBrowser.close();process.exitCode=1;});
