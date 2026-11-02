import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname,sep,extname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const deps=resolve(process.argv[2]??resolve(root,'../..'));
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve(deps,'.cache/ms-playwright');
const require=createRequire(pathToFileURL(resolve(deps,'package.json')));
const pw=await import(pathToFileURL(require.resolve('@playwright/test')).href),chromium=pw.chromium??pw.default.chromium;
const server=createServer(async(req,res)=>{
  if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}
  try{const p=resolve(root,decodeURIComponent(new URL(req.url,'http://local').pathname).slice(1)||'performance.html');
    if(!p.startsWith(root+sep))throw Error('outside root');
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'})[extname(p)]??'text/plain');res.end(await readFile(p));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;const errors=[],started=Date.now();
try{
  browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('http://127.0.0.1:'+server.address().port+'/performance.html');
  await page.waitForFunction(()=>window.performanceReady||document.querySelector('#error')?.hidden===false);
  assert.equal(await page.evaluate(()=>window.performanceReady),true,await page.locator('#error').textContent());
  if(process.argv.includes('--approval-only')){
    const label=await page.locator('.top small').textContent();assert(label.includes('VISUAL R2 ĐÃ DUYỆT'));
    const approval=await page.evaluate(()=>fetch('director_approval_r2.json').then(r=>r.json()));
    assert.equal(approval.visualApproved,true);assert.equal(approval.productionIntegrated,false);assert.equal(approval.phaserProductionVerified,false);
    await page.locator('a[href="index.html"]').click();await page.waitForFunction(()=>window.reviewReady);
    const inspectorLabel=await page.locator('header strong').textContent();assert(inspectorLabel.includes('VISUAL R2 ĐÃ DUYỆT'));
    assert.deepEqual(errors,[]);
    const report={status:'PASS',scope:'Approval labels/register only; no new art or motion acceptance claimed',labels:[label,inspectorLabel],visualApproved:true,productionIntegrated:false,phaserProductionVerified:false,errors,recordingsCreated:false};
    await writeFile(resolve(root,'previews/approval_ui_validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  }else{
  const inspection=await page.evaluate(()=>{
    const api=window.performanceReview,checks=[];api.options({repeat:false});
    for(const [id] of api.catalog)for(const d of api.dirs)for(const zoom of [1,2]){
      api.options({zoom,targets:true,move:id==='cb_burn'});const plan=api.select(id,d,0,false);
      const times=[0,plan.length,...plan.tracks.flatMap(tr=>[tr.start+1,(tr.start+tr.end)/2,tr.end-1])];
      const phases=new Set();
      for(const t of times){const s=api.seek(t);if(!s.actor)throw Error(id+' has no actor');phases.add(s.phase);
        for(const item of [s.actor,...s.effects]){
          if(item.paint.some(x=>!Number.isFinite(x)))throw Error('Nonfinite '+id);
          if(item.paint[0]<0||item.paint[1]<0||item.paint[2]>960||item.paint[3]>540)throw Error('Clipped '+id+'/'+d+'/'+zoom+'/'+item.tag+': '+item.paint);
        }
      }
      const end=api.seek(plan.length);if(end.effects.length)throw Error('FX not cleaned '+id);
      checks.push({id,d,zoom,samples:times.length,actorStatePresent:true,phaseNames:[...phases],noCanvasClipping:true,endingIdle:end.actor.tag});
    }
    // Projectile moves on a fixed heading and the hold is motionless, without a slash loop.
    api.select('wd_nhan_kiem','right',0,false);
    const a=api.seek(2400),b=api.seek(3700),hold=s=>s.effects.find(e=>e.tag==='hold_right');
    if(JSON.stringify(hold(a).world)!==JSON.stringify(hold(b).world)||hold(a).frame!==hold(b).frame)throw Error('hold moves');
    api.options({move:true});api.select('cb_burn','right',0,false);
    for(const t of [1300,1700,2100]){const s=api.seek(t),burn=s.effects.find(e=>e.tag==='burn_loop');if(JSON.stringify(burn.world)!==JSON.stringify(s.actor.world))throw Error('burn detached');}
    const feedback=[];
    const close=(a,b)=>{if(Math.abs(a-b)>1e-6)throw Error('Expected '+b+', got '+a);};
    const v={right:[1,0],left:[-1,0],down:[0,.65],up:[0,-.65]};
    for(const d of api.dirs){
      for(let step=0;step<4;step++){
        const p=api.select('sl_a',d,step,false),tr=p.tracks.find(t=>t.layer==='fx');
        if(step<3){const a=api.seek(tr.travelStart).effects[0],b=api.seek(tr.travelEnd).effects[0];for(let k=0;k<2;k++)close(b.world[k]-a.world[k],v[d][k]*32);}
        else if(tr.motion)throw Error('Fourth Shaolin strike changed');
      }
      const vi=api.select('sl_vi_da',d,0,false),burst=api.seek(vi.tracks.find(t=>t.layer==='fx').start+1).effects[0];
      const expected={right:[71.5,0],left:[-71.5,0],down:[0,46.8],up:[0,-46.8]}[d];expected.forEach((n,i)=>close(burst.world[i],n));
      const dao=api.select('sl_dao_a',d,0,false);for(const tr of dao.tracks.filter(t=>t.layer==='fx'))close((tr.baselineReach+tr.distance)/tr.baselineReach,1.2);
      const palms=api.select('sl_nhu_lai',d,0,false),palmEmissions=new Set(palms.tracks.filter(t=>t.emission!==undefined).map(t=>t.emission));
      if(palmEmissions.size!==8||api.seek(1100).effects.length<3)throw Error('Palm chain missing');
      const fistTips={left_fist:{right:[19,-24],left:[-19,-24],down:[-9,-19],up:[6,-30]},right_fist:{right:[23,-24],left:[-22,-24],down:[9,-19],up:[-6,-30]}};
      for(let step=0;step<2;step++){
        const p=api.select('wd_a',d,step,false),tr=p.tracks.find(t=>t.layer==='fx'),name=step?'right_fist':'left_fist';
        if(tr.id!=='m3d_vo_dang_sonic_vfx_r2')throw Error('Old backwards sonic');
        api.seek(tr.start);const start=api.snapshot.effects[0];fistTips[name][d].forEach((n,i)=>close(start.world[i],n));
        const end=api.seek(tr.end-1).effects[0];for(let k=0;k<2;k++)close(end.world[k]-start.world[k],v[d][k]*55*(359/360));
      }
      api.select('wd_nhan_kiem',d,0,false);const old=api.seek(2200),hidden=api.seek(2400),arrived=api.seek(2700);
      if(hidden.actor.opacity!==0||arrived.actor.opacity!==1)throw Error('Blink visibility missing');
      for(let k=0;k<2;k++)close(arrived.actor.world[k]-old.actor.world[k],v[d][k]*175);
      const liet=api.select('ts_liet_phong',d,0,false),ground=liet.tracks.find(t=>t.id==='m3d_liet_phong_ground_vfx_r2');
      if(!ground||ground.start!==1350)throw Error('Ground break not synchronized');
      const slash=liet.tracks.find(t=>t.tag==='liet_phong_slash_'+d);close(slash.reachMultiplier,1.4);
      const blades=api.select('ts_bach_liet',d,0,false),emissions=new Set(blades.tracks.filter(t=>t.emission!==undefined).map(t=>t.emission));
      if(emissions.size!==9||blades.length<=2200||api.seek(950).effects.length<3)throw Error('Continuous blade barrage missing');
      const dragon=api.select('cb_dragon',d,0,false).tracks.find(t=>t.tag==='dragon_loop_'+d);
      close(dragon.distance,200);close(dragon.travelEnd-dragon.travelStart,850);
      if(dragon.distance/(dragon.travelEnd-dragon.travelStart)<=125/1050)throw Error('Dragon not faster');
      feedback.push({d,shaolinTravel32:true,viDaMultiplier1_3:true,daoReach1_2:true,palms:8,sonicFromFist:true,actorBlinks:true,groundContact1350:true,blades:9,dragonDistance200:true,dragonTravel850:true});
    }
    return {checks,staticSwordHold:true,burnFollowsActor:true,feedback};
  });
  const playback=[];
  // Observe real rAF playback, actor/VFX phases and clean ending on each new choreography.
  const modes=await page.evaluate(()=>window.performanceReview.catalog.map(x=>x[0]));
  for(const id of modes){
    await page.evaluate(id=>{const a=window.performanceReview;a.options({repeat:false,speed:1,zoom:2,move:false});a.select(id,'right',0,false);},id);
    const result=await page.evaluate(()=>window.performanceReview.play());assert.equal(result.completed,true);assert(result.seen.length>1);playback.push(result);
    console.log(id+': actor/VFX playback complete');
  }
  // Holding/repeated A produces one basic, then the next press selects the opposite fist.
  await page.evaluate(()=>{const a=window.performanceReview;a.options({repeat:false});a.select('wd_a','right',0,false);});
  await page.locator('#scene').click();
  const before=await page.evaluate(()=>window.performanceReview.snapshot.triggerCount);
  await page.keyboard.down('a');await page.keyboard.down('a');await page.waitForTimeout(750);await page.keyboard.up('a');
  assert.equal(await page.evaluate(()=>window.performanceReview.snapshot.triggerCount),before+1);
  assert.equal(await page.evaluate(()=>window.performanceReview.snapshot.beat),0);
  await page.keyboard.press('a');assert.equal(await page.evaluate(()=>window.performanceReview.snapshot.beat),1);
  const captures=[['sl_a',540],['sl_vi_da',700],['sl_dao_a',620],['sl_nhu_lai',1250],['wd_a',545],['wd_nhan_kiem',2200],['wd_nhan_kiem',2400],['wd_nhan_kiem',2700],['ts_liet_phong',1470],['ts_bach_liet',1250],['cb_dragon',1650],['cb_burn',1700],['cb_staff',760]];
  for(const [id,t] of captures){
    await page.evaluate(({id,t})=>{const a=window.performanceReview;a.options({repeat:false,zoom:2,light:false,move:id==='cb_burn'});a.select(id,'right',0,false);a.seek(t);},{id,t});
    await page.locator('#viewport').screenshot({path:resolve(root,'previews/performance_r2_'+id+'_'+t+'.png')});
  }
  assert.deepEqual(errors,[]);
  const report={status:'PASS',scope:'Independent actor + VFX art choreography; not Phaser/gameplay integration',modes:modes.length,presetFacingZoomChecks:inspection.checks.length,inspection,playback,onePressOneBasic:true,errors,recordingsCreated:false,elapsedMs:Date.now()-started};
  await writeFile(resolve(root,'previews/performance_validation.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:'PASS',modes:modes.length,checks:inspection.checks.length,elapsedMs:report.elapsedMs}));
  }
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
