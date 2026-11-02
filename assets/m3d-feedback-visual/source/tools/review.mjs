import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../..');
const dependencies=resolve(process.argv[2]??resolve(root,'../..'));
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve(dependencies,'.cache/ms-playwright');
const require=createRequire(pathToFileURL(resolve(dependencies,'package.json')));
const playwright=await import(pathToFileURL(require.resolve('@playwright/test')).href);
const chromium=playwright.chromium??playwright.default.chromium;
const server=createServer(async(req,res)=>{
 try{
 if(req.url==='/favicon.ico'){res.writeHead(204);res.end();return;}
 const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';
 const file=resolve(root,relative);if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
 const data=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.json':'application/json','.png':'image/png'})[extname(file)]??'text/plain');res.end(data);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port=server.address().port,errors=[],start=Date.now();
let browser;
try{
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1320,height:910},deviceScaleFactor:1});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:'+port);await page.waitForFunction(()=>window.reviewReady,{timeout:20000});
 const components=await page.evaluate(()=>window.reviewApi.assets);
 let n=0;
 const selected=process.argv.includes('--only')?process.argv[process.argv.indexOf('--only')+1].split(','):null;
 for(const c of components){
  if(selected&&!selected.includes(c.id))continue;
  for(const a of c.animations){
   const cycles=a.loop?2:1;
   const r=await page.evaluate(({id,tag,cycles})=>window.reviewApi.choose(id,tag,cycles),{id:c.id,tag:a.name,cycles});
   assert.equal(r.cancelled,undefined);assert.equal(r.scale,1);assert.equal(r.cycles,cycles);
   // One-frame holds are rendered on every cycle; verify actual rAF draws, not a metadata-only loop.
   assert.deepEqual(r.frameOrder,Array.from({length:cycles},()=>a.frames).flat(),c.id+'/'+a.name);
   n++;
  }
  console.log(c.id+': '+c.animations.length+' clips played');
 }
 assert.equal(n,components.filter(c=>!selected||selected.includes(c.id)).reduce((s,c)=>s+c.animations.length,0));
 // A is an edge-triggered preview control. Repeated keydown must not replay.
 await page.evaluate(()=>window.reviewApi.freeze('m3d_vo_dang_quyen_character','left_fist_right',0));
 const before=await page.evaluate(()=>window.reviewApi.observations.length);
 await page.keyboard.down('a');await page.keyboard.down('a');await page.waitForTimeout(800);await page.keyboard.up('a');
 const after=await page.evaluate(()=>window.reviewApi.observations.length);assert.equal(after,before+1);
 const captures=[
 ['shaolin_roundhouse',[{id:'m3d_thieu_lam_quyen_character',tag:'roundhouse_kick_right',frame:2},{id:'m3d_thieu_lam_quyen_vfx',tag:'roundhouse_kick_right',frame:2}]],
 ['wudang_sword',[{id:'m3d_vo_dang_kiem_character',tag:'basic_attack_right',frame:2},{id:'m3d_vo_dang_basic_vfx',tag:'sword_qi_right',frame:2}]],
 ['sword_hold',[{id:'m3d_nhan_kiem_hop_nhat_vfx',tag:'hold_right',frame:0}]],
 ['wind_dao',[{id:'m3d_thien_son_dao_character',tag:'liet_phong_cast_right',frame:1},{id:'m3d_thien_son_dao_vfx',tag:'liet_phong_gather_right',frame:4}]],
 ['burn_boundary',[{id:'m3d_khang_long_burn_vfx',tag:'burn_loop',frame:2},{id:'m3d_thieu_lam_quyen_character',tag:'left_fist_right',frame:0}]]
 ];
 for(const[name,items]of captures){
  for(const light of [false,true]){
   await page.evaluate(({items,light})=>{window.reviewApi.compose(items);window.reviewApi.background(light);},{items,light});
   await page.waitForTimeout(60);
   const png=await page.evaluate(()=>window.reviewApi.nativePng());
   await writeFile(resolve(root,'previews/'+name+(light?'_light':'_dark')+'_1x.png'),Buffer.from(png.split(',')[1],'base64'));
   if(!light)await page.locator('#stage').screenshot({path:resolve(root,'previews/'+name+'_display_2x.png')});
  }
 }
 const observations=await page.evaluate(()=>window.reviewApi.observations);
 assert.deepEqual(errors,[]);
 const report={status:'PASS',renderer:'independent Canvas2D browser; not Phaser',productionIntegrated:false,phaserProductionVerified:false,directorApproved:false,recordingsCreated:false,video:false,trace:false,logicalCanvas:[640,360],displayScale:2,clipsPlayed:n,atlasFrameReferences:components.reduce((s,c)=>s+c.animations.reduce((n,a)=>n+a.frames.length,0),0),onePressOneClipPreview:true,elapsedMs:Date.now()-start,errors,observations};
 if(selected){
  const prior=JSON.parse(await readFile(resolve(root,'previews/browser_validation.json'),'utf8'));
  report.observations=[...prior.observations.slice(0,prior.clipsPlayed).filter(o=>!selected.includes(o.id)),...observations.slice(0,n)];
  report.originalFullRunElapsedMs=prior.originalFullRunElapsedMs??prior.elapsedMs;report.lastFocusedRunElapsedMs=report.elapsedMs;
  report.retainedClips=components.filter(c=>!selected.includes(c.id)).reduce((n,c)=>n+c.animations.length,0);report.focusedClipsPlayed=n;
  report.clipsPlayed=components.reduce((n,c)=>n+c.animations.length,0);report.validationStrategy='Retained full playback of unchanged clips; reran changed components and PNG captures.';
 }
 await writeFile(resolve(root,'previews/browser_validation.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',clips:n,frames:report.atlasFrameReferences,elapsedMs:report.elapsedMs}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
