import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const base=new URL('../../',import.meta.url);
test('Phá Giáp Bổng: all native cels, four facings, ordered phases and cleanup',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:5513/assets/m3d-feedback-review-r3/batch02-pha-giap-bong/');await page.waitForFunction(()=>window.reviewReady);
  const assets=await page.evaluate(()=>window.reviewApi.assets),clips=[];
  const geometry=await (await page.request.get('http://127.0.0.1:5513/assets/m3d-feedback-review-r3/batch02-pha-giap-bong/previews/static-validation.json')).json();
  expect(assets.flatMap(c=>c.animations).some(a=>['spin','charge','elongate'].includes(a.phase))).toBe(false);
  for(const c of assets)for(const a of c.animations){const cycles=a.loop?2:1;const r=await page.evaluate(({id,tag,cycles})=>window.reviewApi.playClip(id,tag,cycles),{id:c.id,tag:a.name,cycles});expect(r.frameOrder).toEqual(Array.from({length:cycles},()=>a.frames).flat());clips.push(r);}
  for(const d of ['right','down','left','up']){
    await page.evaluate(d=>{window.reviewApi.setFacing(d);window.reviewApi.play();},d);await page.waitForFunction(()=>!window.reviewApi.snapshot().active);
    const o=await page.evaluate(()=>window.reviewApi.observations.filter(o=>o.kind==='composite').at(-1));
    expect(o.reason).toBe('complete');expect(o.phaseOrder).toEqual(['raise','strike','recovery']);
    expect(o.frames.some(f=>f.includes('/spin_')||f.includes('/charge_')||f.includes('/elongate_'))).toBe(false);
    expect(o.frames.filter(f=>f.startsWith(assets[0].id+'/raise_'+d+'_')).length).toBe(2);
    expect(o.placements.some(p=>p.phase==='impact')).toBe(true);expect(o.placements.some(p=>p.phase==='outro')).toBe(true);
    expect(o.placements.every(p=>p.x===o.casterFeet[0]+p.offset[0]&&p.y===o.casterFeet[1]+p.offset[1])).toBe(true);
    if(d==='left'||d==='right')expect(o.placements.every(p=>p.y>=o.casterFeet[1]+4)).toBe(true);
    if(d==='left')expect(o.placements.every(p=>p.x<o.casterFeet[0])).toBe(true);
    const g=geometry.forwardExtent.find(g=>g.facing===d);expect(g.ratio).toBeGreaterThanOrEqual(1.45);
    const [l,t,r,b]=g.relativeOpaqueBounds,[x,y]=o.casterFeet;
    expect(x+l).toBeGreaterThanOrEqual(0);expect(x+r).toBeLessThanOrEqual(640);
    expect(y+t).toBeGreaterThanOrEqual(45);expect(y+b).toBeLessThanOrEqual(310);
  }
  await page.evaluate(()=>window.reviewApi.setFacing('right'));
  const before=await page.evaluate(()=>window.reviewApi.snapshot().starts);
  await page.keyboard.down('a');await page.keyboard.down('a');await page.keyboard.up('a');expect(await page.evaluate(()=>window.reviewApi.snapshot().starts)).toBe(before+1);
  for(const reason of ['cancel','death','travel']){
    await page.evaluate(()=>window.reviewApi.play());await page.waitForFunction(()=>window.reviewApi.snapshot().effects>0);await page.evaluate(r=>window.reviewApi.cancel(r),reason);await page.waitForFunction(()=>window.reviewApi.snapshot().effects===0);expect(await page.evaluate(()=>window.reviewApi.snapshot().active)).toBe(false);
  }
  await page.evaluate(()=>window.reviewApi.play());await page.keyboard.press('ArrowUp');expect(await page.evaluate(()=>window.reviewApi.snapshot().active)).toBe(false);
  await page.evaluate(()=>window.reviewApi.play());await page.keyboard.press('Space');const t=await page.evaluate(()=>window.reviewApi.snapshot().time);await page.waitForTimeout(100);expect(await page.evaluate(()=>window.reviewApi.snapshot().time)).toBe(t);await page.keyboard.press('Space');await page.waitForFunction(t=>window.reviewApi.snapshot().time>t,t);
  await page.evaluate(()=>{window.reviewApi.setFacing('right');window.reviewApi.compare(true);window.reviewApi.scrub(180);});await page.waitForFunction(()=>window.reviewApi.snapshot().activeBodyFrame==='raise_right_1');
  expect(await page.evaluate(()=>window.reviewApi.snapshot().effects)).toBe(0);
  await page.locator('#viewport').screenshot({path:fileURLToPath(new URL('previews/review3-raise-right-display-2x.png',base))});
  await page.evaluate(()=>window.reviewApi.scrub(350));await page.waitForFunction(()=>window.reviewApi.snapshot().effects===1);
  await page.locator('#viewport').screenshot({path:fileURLToPath(new URL('previews/review3-strike-right-display-2x.png',base))});
  await page.evaluate(()=>{window.reviewApi.setFacing('left');window.reviewApi.scrub(350);});await page.waitForFunction(()=>window.reviewApi.snapshot().groundRender?.y>window.reviewApi.snapshot().casterFeet[1]);
  await page.locator('#viewport').screenshot({path:fileURLToPath(new URL('previews/review3-strike-left-display-2x.png',base))});
  const png=await page.evaluate(()=>window.reviewApi.nativePng());await writeFile(new URL('previews/review3-strike-left-native-1x.png',base),Buffer.from(png.split(',')[1],'base64'));
  await page.click('#boards');expect(await page.locator('#board').evaluate(d=>d.open)).toBe(true);expect(await page.locator('[data-board=spin]').count()).toBe(0);await page.click('[data-board=vfx]');await page.waitForFunction(()=>document.querySelector('#board-image').complete&&document.querySelector('#board-image').naturalWidth>0);expect(await page.locator('#board-image').getAttribute('src')).toContain('b3_pha_giap_vfx');await page.keyboard.press('Escape');expect(await page.locator('#board').evaluate(d=>d.open)).toBe(false);
  expect(errors).toEqual([]);
  const report={status:'PASS',revision:'review3',scope:'Independent Canvas2D review only',productionIntegrated:false,phaserProductionVerified:false,directorApproved:false,video:false,trace:false,recordingsCreated:false,clipsPlayed:clips.length,frameReferences:assets.reduce((s,c)=>s+c.animations.reduce((s,a)=>s+a.frames.length,0),0),noSpinSelected:true,previewReachMultiplier:1.5,longStrikeFitsViewport:true,oneAOneCast:true,fourFacings:true,phaseOrder:true,stationaryCaster:true,groundRegisteredFromFeet:true,leftGroundBelowFeet:true,cleanup:['cancel','death','travel','facing-change','complete'],clips,observations:await page.evaluate(()=>window.reviewApi.observations),errors};
  await writeFile(new URL('previews/browser-validation.json',base),JSON.stringify(report,null,2)+'\n');
});
