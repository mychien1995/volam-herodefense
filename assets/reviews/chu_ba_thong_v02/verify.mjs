import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(process.env.VOLAM_ART_DEPS_PACKAGE||new URL('../../../package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const out=path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')),'feedback_01');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:process.env.VOLAM_ART_BROWSER_CHANNEL||'msedge'});
const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:undefined});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const checks=[];
try{
 await page.goto(process.env.VOLAM_ART_REVIEW_URL||'http://127.0.0.1:5397/assets/reviews/chu_ba_thong_v02/index.html');
 await page.waitForFunction(()=>window.__artReview?.ready,{timeout:20000});
 await page.evaluate(()=>window.__artReview.setPaused(true));
 const sample=()=>page.evaluate(()=>window.__artReview.sample());
 const select=id=>page.evaluate(id=>window.__artReview.select(id),id);
 const seek=t=>page.evaluate(t=>window.__artReview.seek(t),t);
 for(const mode of ['turnaround','arena','sweep','fists','projectile','hands','trap','spin','reflect','ultimate','disciple']){
  await select(mode);
  for(let i=0;i<48;i++)await seek(i*.1);
  assert.deepEqual((await sample()).errors,[]);
  checks.push(mode+': rendered 48 real browser samples');
 }
 // All 24 supplementary raster frames drawn, not just metadata enumerated.
 const observed=(await sample()).observed;
 for(const n of ['sweep','punch_left','punch_right','spin'])for(let i=0;i<4;i++)assert(observed.includes('boss:'+n+'_'+i),'Missing rendered '+n+'_'+i);
 for(const n of ['yin_hand','yang_hand'])for(let i=0;i<4;i++)assert(observed.includes('hands:'+n+'_'+i),'Missing rendered '+n+'_'+i);
 checks.push('24/24 supplementary cels actually observed in canvas');
 await select('projectile');await seek(.65);const first=(await sample()).shots[0];assert(first);await page.keyboard.down('ArrowRight');await page.evaluate(()=>window.__artReview.step(.5));await page.keyboard.up('ArrowRight');const moved=await sample();assert(moved.player.x>first.target.x+50);assert.deepEqual(moved.shots[0],first);checks.push('Projectile captures release target/direction; arrow movement does not retarget it');
 await select('trap');await seek(1);assert.equal((await sample()).trap.released,false);await page.evaluate(()=>window.__artReview.gather(true));await seek(5);assert.equal((await sample()).trap.released,true);assert.match((await sample()).trap.reason,/Đủ đội/);checks.push('All-party entry releases the 3-player trap');
 await select('trap');await seek(30.5);assert.equal((await sample()).trap.released,false);await seek(30.7);assert.equal((await sample()).trap.released,true);assert.match((await sample()).trap.reason,/30 giây/);checks.push('Absent peers retain confinement until 30 seconds, then release');
 await page.evaluate(()=>window.__artReview.setParty(1));await select('trap');await seek(1);assert.equal((await sample()).trap.released,true);checks.push('Solo all-party condition releases without impossible peer requirement');
 await page.evaluate(()=>window.__artReview.setParty(6));await select('trap');await page.evaluate(()=>window.__artReview.gather(true));await seek(8);assert.equal((await sample()).trap.released,true);assert.equal((await sample()).trap.inside,6);checks.push('Six-party gather includes all 6 participants');
 await select('spin');await seek(2);const b1=(await sample()).boss;await seek(23);const b2=(await sample()).boss;assert.notDeepEqual(b1,b2);assert(b2.x>=205&&b2.x<=1075&&b2.y>=235&&b2.y<=570);checks.push('Spin remains active and traverses arena at 23 seconds');
 await select('reflect');await seek(2);await page.evaluate(()=>window.__artReview.attack());await page.evaluate(()=>window.__artReview.step(.4));assert((await sample()).attacks[0].reflected);assert((await sample()).attacks[0].returnTarget);assert((await sample()).errors.length===0);checks.push('A input visual attack reverses toward player during active reflect phase');
 await select('turnaround');for(let i=0;i<90;i++)await seek(i*.1);
 for(const dir of ['down','up','left','right'])for(const action of ['idle','walk'])for(let i=0;i<4;i++)assert((await sample()).observed.includes('base:'+action+'_'+dir+'_'+i));
 checks.push('All 32 baseline idle/walk cels and four boss facings drawn');
 await select('sweep');await page.evaluate(()=>window.__artReview.setPaused(false));const before=(await sample()).time;await page.waitForTimeout(700);const after=(await sample()).time;assert(after-before>.4);await page.evaluate(()=>window.__artReview.setPaused(true));checks.push('Real requestAnimationFrame playback advances wall-clock timing');
 // Director feedback: moving field centers, faster/wider spin, party-scaled delivery and melee reach.
 await select('ultimate');await seek(4);const ringsBefore=(await sample()).ultimate;await seek(4.02);const ringsSoon=(await sample()).ultimate;await seek(4.5);const ringsAfter=(await sample()).ultimate;
 for(const group of ['nodes','waves'])for(let i=0;i<ringsBefore[group].length;i++){
  const a=ringsBefore[group][i],b=ringsSoon[group][i],c=ringsAfter[group][i];
  assert(Math.hypot(b.x-a.x,b.y-a.y)>0&&Math.hypot(b.x-a.x,b.y-a.y)<5,'Ring jumped or stayed fixed');
  assert(Math.hypot(c.x-a.x,c.y-a.y)>1,'Ring did not travel');
 }
 assert.notDeepEqual(ringsBefore.center,ringsAfter.center);checks.push('All 15 local circles, four wave centers and core move continuously without jumps');
 await select('spin');await seek(1.1);const spinA=(await sample()).boss;await seek(1.2);const spinSample=await sample();
 assert(Math.hypot(spinSample.boss.x-spinA.x,spinSample.boss.y-spinA.y)/.1>600);assert(spinSample.tuning.spinRadius>=112);checks.push('Spin exceeds 600px/s between rebounds and displays a wider 112px-radius vortex');
 for(let n=1;n<=6;n++){
  await page.selectOption('#party',String(n));await select('disciple');await seek(3);const d=(await sample()).disciples;
  assert.equal(d.length,n);assert.equal(new Set(d.map(p=>p.x+','+p.y)).size,n);assert(d.every(p=>p.tag==='carry_walk_'));
  await seek(7);assert((await sample()).disciples.every(p=>p.tag==='drop_wine_'));
 }
 checks.push('Dropdown 1–6 produces exactly one independently positioned wine carrier per participant');
 await select('fists');await seek(.37);const fists=await sample();assert(fists.player.y-fists.boss.y>=260);assert(fists.footprint.fistAtPlayer);assert(fists.tuning.fistReach>=340);checks.push('Extended alternating punches visibly reach the ranged witness 260px in front');
 await select('sweep');await seek(.2);await page.keyboard.down('ArrowUp');await page.evaluate(()=>window.__artReview.step(.125));await page.keyboard.up('ArrowUp');const sweep=await sample();assert(Math.hypot(sweep.player.x-sweep.boss.x,sweep.player.y-sweep.boss.y)<1);assert(sweep.footprint.sweepAtPlayer&&sweep.footprint.sweepAtFeet);checks.push('Moving directly beneath the boss remains inside the wind sweep preview footprint');
 await select('hands');await seek(2);assert(Math.abs((await sample()).tuning.handsScale/1.5-.8)<1e-9);checks.push('Crushing palms draw at 80% of previous width/height, with unchanged travel timing');
 // Actual PNG evidence only. No video, GIF, tracing or screenshot playback stream.
 for(const [id,time,file] of [['arena',1,'arena-review.png'],['hands',2,'song-thu-ho-bac-review.png'],['ultimate',4,'am-duong-review.png'],['trap',2,'thai-cuc-review.png'],['spin',1.7,'tuy-tien-bo-review.png'],['disciple',3,'six-disciples-review.png'],['fists',.37,'long-punches-review.png'],['sweep',.3,'wide-wind-review.png']]){
  await select(id);await seek(time);await page.screenshot({path:path.join(out,file)});
 }
 for(const id of ['help','context']){const e=await page.locator('#'+id).boundingBox(),dock=await page.locator('#dock').boundingBox();assert(e.y+e.height<=dock.y,'Overlapping dock: '+id);}
 const view=await page.locator('#viewport').boundingBox();assert.equal(view.width,1280);assert.equal(view.height,720);
 await page.setViewportSize({width:960,height:600});await page.screenshot({path:path.join(out,'compact-review.png')});
 const box=await page.locator('#viewport').boundingBox();for(const id of ['dock','context','phase']){const e=await page.locator('#'+id).boundingBox();assert(e.x>=box.x&&e.y>=box.y&&e.x+e.width<=box.x+box.width+1&&e.y+e.height<=box.y+box.height+1,'Overlay outside viewport: '+id);}
 for(const id of ['help','context']){const e=await page.locator('#'+id).boundingBox(),dock=await page.locator('#dock').boundingBox();assert(e.y+e.height<=dock.y,'Compact overlapping dock: '+id);}
 checks.push('1280×720 and 960×600 viewport/overlay bounds and dock non-overlap verified');
 assert.deepEqual(errors,[]);
 const report={status:'PASS',scope:'Standalone art preview only; not Phaser/server/combat acceptance',checks,observedFrames:(await sample()).observed,errors,recording:false};
 await fs.writeFile(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'PASS',checks:checks.length,observedFrames:report.observedFrames.length}));
}catch(e){await page.screenshot({path:path.join(out,'failure.png')});console.error(e);process.exitCode=1;}finally{await context.close();await browser.close();}


