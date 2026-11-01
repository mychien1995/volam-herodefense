const {chromium}=require(process.env.VOLAM_REVIEW_PLAYWRIGHT||'@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
let browser;
(async()=>{
 const start=Date.now();browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:5198/assets/reviews/bosses/hoan_nhan_hong_liet_v01/?v=4');await page.waitForFunction(()=>window.artReview?.ready,null,{timeout:15000});
 const set=o=>page.evaluate(o=>artReview.set(o),o);
 // Independently measure opaque tip coordinates from actual retained PNG cels.
 const tips=await page.evaluate(async()=>{
  const base='/assets/exports/bosses/hoan_nhan_hong_liet_v01/',atlas=await fetch(base+'vfx_basics.json').then(r=>r.json()),im=new Image();await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=reject;im.src=base+'vfx_basics.png';});
  const out={};
  for(const name of ['thrust_0','thrust_1','thrust_2','thrust_3']){
   const f=atlas.frames[name].frame,c=document.createElement('canvas');c.width=f.w;c.height=f.h;const x=c.getContext('2d');x.drawImage(im,f.x,f.y,f.w,f.h,0,0,f.w,f.h);const a=x.getImageData(0,0,f.w,f.h).data;let max=-1;
   for(let y=0;y<f.h;y++)for(let px=0;px<f.w;px++)if(a[(y*f.w+px)*4+3]>180)max=Math.max(max,px);out[name]=max+1;
  }return out;
 });
 const dirs={down:Math.PI/2,left:Math.PI,right:0,up:-Math.PI/2},samples=[];
 for(const [dir,angle]of Object.entries(dirs))for(const time of [.2,.69,.72,.94,1.2]){
  const s=await set({clip:'thrust',dir,time}),rays=s.draws.filter(d=>d.role==='a1_forward_blade');assert.equal(rays.length,3);
  assert.deepEqual(rays.map(r=>Math.round((r.angle-angle)*180/Math.PI)),[-18,0,18]);
  for(const r of rays){const measured=(tips[r.frame]-r.pivot[0])*r.scaleX;assert.ok(Math.abs(measured-600)<1e-6);assert.equal(r.scaleY,1.15);assert.equal(r.frontClip.dir,dir);}
  const boss=s.draws.find(d=>d.role==='boss');assert.equal(boss.scaleX,1);assert.equal(boss.scaleY,1);
  assert.equal(s.geometry.reachPx,600);assert.ok(600/s.geometry.previousPeakReachPx>1.75);
  samples.push({dir,time,stage:s.stage,frame:rays[0].frame,measuredReach:600});
 }
 assert.equal((await set({clip:'thrust',time:1.5})).draws.filter(d=>d.role==='a1_forward_blade').length,0);
 await set({clip:'thrust',dir:'right',time:.02,playing:true});
 const live=await page.evaluate(async()=>{const out=[],start=performance.now();while(performance.now()-start<1550){await new Promise(requestAnimationFrame);const s=artReview.snapshot();out.push({time:s.state.time,rays:s.draws.filter(d=>d.role==='a1_forward_blade').map(d=>d.frame)});}return out;});
 const frames=[...new Set(live.flatMap(s=>s.rays))];assert.equal(frames.length,4);assert.ok(live.every(s=>s.rays.length===(s.time<1.4?3:0)));assert.ok(live.some(s=>s.time>=1.4&&s.rays.length===0));
 await set({clip:'thrust',dir:'right',time:.94});await page.screenshot({path:path.join(__dirname,'review_a1_v04_1x.png')});
 await set({clip:'thrust',dir:'right',time:.4});await page.screenshot({path:path.join(__dirname,'review_a1_warning_v04_1x.png')});
 // Regression of the immediately preceding director changes.
 assert.equal((await set({clip:'cannons',time:2.1})).draws.filter(d=>d.role==='perimeter_cannon').length,16);
 const lava=await set({clip:'lava',dir:'right',time:1.4});assert.ok(Math.abs(lava.boss[0]-665)<.001);assert.equal(lava.geometry.effectId,'vfx_lava_lane_v03');
 assert.equal((await set({clip:'sweep',time:.94})).geometry.reachMultiplier,1.5);
 for(const [width,height]of [[1920,1080],[960,600]]){await page.setViewportSize({width,height});for(const dir of Object.keys(dirs))assert.equal((await set({clip:'thrust',dir,time:.94})).errors.length,0);}
 assert.equal(errors.length,0,JSON.stringify(errors));
 const report={result:'PASS_V04_STANDALONE_ONLY',scope:'A1 visual reach only; no server or Phaser balance proof',reachPx:600,previousPeakReachPx:341,increaseRatio:600/341,tipPixels:tips,samples,live:{observations:live.length,frames},errors,video:false,trace:false,elapsedSeconds:(Date.now()-start)/1000};
 await fs.writeFile(path.join(__dirname,'browser_validation_v04.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({result:report.result,reachPx:600,increaseRatio:report.increaseRatio,samples:samples.length,live:report.live,errors}));await browser.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1;});
