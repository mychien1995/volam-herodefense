// Browser assertions of the actual independent viewer; no gameplay verification claim.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
const base=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export async function reviewDraft(page,url=process.env.M3D_R3_REVIEW_URL||'http://127.0.0.1:5513/assets/m3d-feedback-review-r3/') {
  const errors=[],started=Date.now();
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(url);await page.waitForFunction(()=>window.reviewReady);
  const assets=await page.evaluate(()=>window.reviewApi.assets);
  const clipResults=[];
  for(const c of assets)for(const a of c.animations){
    const cycles=a.loop?2:1;
    const r=await page.evaluate(({id,tag,cycles})=>window.reviewApi.playClip(id,tag,cycles),{id:c.id,tag:a.name,cycles});
    assert.deepEqual(r.frameOrder,Array.from({length:cycles},()=>a.frames).flat(),c.id+'/'+a.name);
    assert.equal(r.scale,1);clipResults.push(r);
  }
  for(const facing of ['right','down','left','up']){
    await page.evaluate(d=>{window.reviewApi.setFacing(d);window.reviewApi.play();},facing);
    await page.waitForFunction(()=>!window.reviewApi.snapshot().active);
    const o=await page.evaluate(()=>window.reviewApi.observations.filter(o=>o.kind==='composite').at(-1));
    assert.equal(o.reason,'complete');assert.equal(o.facing,facing);
    for(const phase of ['birth','travel','impact','outro'])assert(o.path.some(p=>p.phase===phase),facing+'/'+phase);
    assert(o.path.every(p=>p.caster[0]===o.casterFeet[0]&&p.caster[1]===o.casterFeet[1]));
    const path=o.path.filter(p=>p.phase==='travel');
    const axis=['left','right'].includes(facing)?'x':'y',other=axis==='x'?'y':'x';
    assert(path.length>10);assert(path.every(p=>Math.abs(p[other]-path[0][other])<.01));
    const sign=['right','down'].includes(facing)?1:-1;
    assert(path.every((p,i)=>!i||sign*(p[axis]-path[i-1][axis])>=0));
    assert(o.frames.some(f=>f.includes('stun_loop')));
  }
  await page.evaluate(()=>window.reviewApi.setFacing('right'));
  const before=await page.evaluate(()=>window.reviewApi.snapshot().starts);
  await page.keyboard.down('a');await page.keyboard.down('a');await page.keyboard.down('a');await page.keyboard.up('a');
  assert.equal(await page.evaluate(()=>window.reviewApi.snapshot().starts),before+1);
  for(const reason of ['cancel','death','travel']){
    await page.evaluate(()=>window.reviewApi.play());
    await page.waitForFunction(()=>window.reviewApi.snapshot().effectCount>0);
    await page.evaluate(r=>window.reviewApi.cancel(r),reason);
    await page.waitForFunction(()=>window.reviewApi.snapshot().effectCount===0);
    const s=await page.evaluate(()=>window.reviewApi.snapshot());
    assert.equal(s.active,false);assert.equal(s.time,0);
  }
  await page.evaluate(()=>window.reviewApi.play());
  await page.waitForFunction(()=>window.reviewApi.snapshot().effectCount>0);
  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(()=>window.reviewApi.snapshot().effectCount===0);
  assert.equal(await page.evaluate(()=>window.reviewApi.snapshot().facing),'left');
  assert.equal(await page.evaluate(()=>window.reviewApi.snapshot().active),false);
  await page.evaluate(()=>window.reviewApi.play());
  await page.keyboard.press('Space');
  const t=await page.evaluate(()=>window.reviewApi.snapshot().time);
  await page.waitForTimeout(120);
  assert.equal(await page.evaluate(()=>window.reviewApi.snapshot().time),t);
  await page.keyboard.press('Space');
  await page.waitForFunction(t=>window.reviewApi.snapshot().time>t,t);
  await page.evaluate(()=>{window.reviewApi.cancel();window.reviewApi.setFacing('right');window.reviewApi.compare(true);window.reviewApi.scrub(410);});
  await page.waitForFunction(()=>window.reviewApi.snapshot().effectCount===1);
  await page.locator('#viewport').screenshot({path:resolve(base,'previews/ca-diep-contact-display-2x.png')});
  await page.evaluate(()=>window.reviewApi.scrub(1350));
  await page.waitForFunction(()=>window.reviewApi.snapshot().effectCount===2);
  await page.locator('#viewport').screenshot({path:resolve(base,'previews/ca-diep-impact-display-2x.png')});
  const png=await page.evaluate(()=>window.reviewApi.nativePng());
  await writeFile(resolve(base,'previews/ca-diep-impact-native-1x.png'),Buffer.from(png.split(',')[1],'base64'));
  await page.click('#boards');assert(await page.locator('#board').evaluate(d=>d.open));
  await page.click('[data-board=ground]');await page.keyboard.press('Escape');
  assert.equal(await page.locator('#board').evaluate(d=>d.open),false);
  assert.deepEqual(errors,[]);
  const observations=await page.evaluate(()=>window.reviewApi.observations);
  const report={status:'PASS',scope:'Independent key-pose viewer only',renderer:'Canvas2D',url,
    productionIntegrated:false,phaserProductionVerified:false,directorApproved:false,
    finalAcceptance:false,recordingsCreated:false,video:false,trace:false,
    logicalCanvas:[640,360],displayScale:2,clipsPlayed:clipResults.length,
    frameReferences:assets.reduce((s,c)=>s+c.animations.reduce((s,a)=>s+a.frames.length,0),0),
    oneAOneCast:true,fourFacings:true,straightTravel:true,casterStationary:true,
    cleanup:['cancel','death','travel','facing-change','complete'],pauseResume:true,scrub:true,
    errors,elapsedMs:Date.now()-started,clipResults,observations};
  await writeFile(resolve(base,'previews/browser-validation.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,clips:report.clipsPlayed,frames:report.frameReferences,elapsedMs:report.elapsedMs}));
  return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const browser=await chromium.launch({headless:true});
  try {
    const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
    await reviewDraft(await context.newPage());
  }finally{await browser.close();}
}
