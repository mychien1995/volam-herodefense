const {chromium}=require(process.env.VOLAM_REVIEW_PLAYWRIGHT||'@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const started=Date.now(),browser=await chromium.launch({headless:true,channel:'msedge'});
 const context=await browser.newContext({viewport:{width:1280,height:800}});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:5198/assets/reviews/bosses/hoan_nhan_hong_liet_v01/');
 await page.waitForFunction(()=>window.artReview?.ready,null,{timeout:15000});
 const manifest=JSON.parse(await fs.readFile(path.resolve(__dirname,'../../../exports/bosses/hoan_nhan_hong_liet_v01/manifest.json'),'utf8'));
 const report={scope:'Standalone Canvas art review. Six hero sprites are scale references, not network peers.',runtimeIntegrated:false,phaserVerified:false,multiplayerVerified:false,video:false,trace:false,checks:[],live:[],errors};
 // Every exported cel is submitted to the real Canvas renderer, including clearly
 // disclosed rejected/candidate cels in the atlas inspector. This is file coverage.
 for(const a of manifest.assets){
  const names=a.frames.map(f=>f.name);
  await page.evaluate(({id,names})=>{for(const name of names)artReview.inspectFrame(id,name);},{id:a.id,names});
  report.checks.push({asset:a.id,inspectorCels:names.length});
 }
 // All four boss facings at each representative animation phase.
 const samples={idle:[0,.5],walk:[0,.13,.25,.37,.6],thrust:[0,.72,.84,.95,1.1,1.7],sweep:[0,.72,.84,.95,1.1,1.7],stomp:[.2,1.05,1.3,1.7,2.3,3.2],volcano:[.3,1,1.4,2,3,4.6],lava:[.2,1.1,1.4,2,7,11.9,12.5],archers:[.4,1.4,2.5,3.2,5.8],infantry:[.4,1.4,2.5,3.2,4.8],meteors:[.5,1.3,2.3,4.6,6,8.2],cannons:[.5,1.8,3.6,4.8,6.6,7.8],overview:[0]};
 let phaseSamples=0;
 for(const [clip,times]of Object.entries(samples))for(const dir of ['down','left','right','up'])for(const time of times){
  const s=await page.evaluate(o=>artReview.set(o),{clip,dir,time});
  assert.equal(s.errors.length,0);assert.equal(s.state.time,time);phaseSamples++;
  assert.ok(s.draws.length||clip==='overview');
 }
 report.phaseSamples=phaseSamples;
 // Real requestAnimationFrame playback: both idle frames, all four walk poses,
 // one complete cycle, all cardinal facings. No encoded captures.
 for(const dir of ['down','left','right','up']){
  await page.evaluate(dir=>artReview.set({clip:'walk',dir,time:0,playing:true}),dir);
  const snapshots=await page.evaluate(async()=>{const out=[];const start=performance.now();while(performance.now()-start<2550){await new Promise(requestAnimationFrame);out.push(artReview.snapshot());}return out;});
  const frames=new Set(snapshots.flatMap(s=>s.draws.filter(d=>d.asset==='boss_locomotion').map(d=>d.frame)));
  for(const suffix of ['a','b','c','d'])assert.ok(frames.has(dir+'_walk_'+suffix));
  const times=snapshots.map(s=>s.state.time);assert.ok(times.some((t,i)=>i&&t<times[i-1]),'full cycle not observed');
  report.live.push({clip:'walk',dir,frames:[...frames],animationFrames:snapshots.length,completedCycle:true});
 }
 await page.evaluate(()=>artReview.set({clip:'cannons',dir:'down',time:1.8}));
 const before=await page.evaluate(()=>artReview.snapshot());
 assert.equal(before.draws.filter(d=>d.asset==='cannon_clean').length,8);
 await page.screenshot({path:path.join(__dirname,'review_cannon_1x.png')});
 await page.evaluate(()=>artReview.set({clip:'stomp',dir:'down',time:1.35}));
 await page.screenshot({path:path.join(__dirname,'review_stomp_1x.png')});
 await page.setViewportSize({width:1920,height:1080});
 await page.evaluate(()=>artReview.set({clip:'meteors',time:3,playing:true}));
 const wide=await page.evaluate(()=>({canvas:document.querySelector('canvas').getBoundingClientRect().toJSON(),body:[innerWidth,innerHeight]}));
 assert.equal(wide.canvas.width,1920);assert.equal(wide.canvas.height,1080);report.viewport=wide;
 await page.setViewportSize({width:1280,height:800});
 await page.selectOption('#clip','lava');await page.locator('#seek').fill('500');
 const scrub=await page.evaluate(()=>artReview.snapshot());assert.equal(scrub.state.playing,false);assert.equal(scrub.state.time,7);
 await page.selectOption('#speed','0.25');assert.equal(await page.evaluate(()=>artReview.snapshot().state.speed),.25);
 await page.click('#sheet');assert.ok(await page.locator('body').evaluate(e=>e.classList.contains('sheet')));
 await page.selectOption('#asset','cannon_clean');await page.click('#sheet');
 const final=await page.evaluate(()=>artReview.snapshot());report.observed=Object.fromEntries(Object.entries(final.observed).map(([id,frames])=>[id,frames.length]));
 assert.equal(errors.length,0,JSON.stringify(errors));report.result='PASS_STANDALONE_ONLY';report.elapsedSeconds=(Date.now()-started)/1000;
 await fs.writeFile(path.join(__dirname,'browser_validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:report.result,phaseSamples,liveCycles:report.live.length,atlasCels:manifest.assets.reduce((n,a)=>n+a.frames.length,0),errors,elapsedSeconds:report.elapsedSeconds}));
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
