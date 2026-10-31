import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
const here=fileURLToPath(new URL('.',import.meta.url)),root=resolve(here,'../../../..');
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve(root,'.cache/ms-playwright');
const {chromium}=await import('@playwright/test');
const evidence=resolve(here,'review');mkdirSync(evidence,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'};
const server=createServer((req,res)=>{
 try{
  const target=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!target.startsWith(root+sep))throw Error('Path outside repository');
  res.setHeader('Content-Type',mime[extname(target)]||'application/octet-stream');res.end(readFileSync(target));
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url='http://127.0.0.1:'+server.address().port,path='/sprites/creeps/arena/waves-09-12-production/';
let browser;const errors=[],observations=[],nativePlayback=[],transitionChecks=[],screenshots=[];
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 const capture=async name=>{await page.screenshot({path:resolve(evidence,name)});screenshots.push(name);};
 const load=async query=>{
  await page.goto(url+path+'review.html?'+query);
  await page.waitForFunction(()=>window.__SPRITE_REVIEW__?.ready);
 };
 for(const pose of ['idle','walk','basic_attack','hurt','death']){
  await load('pose='+pose);
  const seen=new Map();let first;
  for(let i=0;i<85;i++){
   const sample=await page.evaluate(()=>window.__SPRITE_REVIEW__.snapshot());first??=sample;
   if(sample.sprites.length!==16||sample.errors.length)throw Error('Sprite/loader failure');
   for(const s of sample.sprites){
    if(s.scale.some(v=>v!==1))throw Error('Unexpected sprite scale');
    const set=seen.get(s.animation)||new Set();set.add(s.frame);seen.set(s.animation,set);
   }
   await page.waitForTimeout(35);
  }
  for(const s of first.sprites)if(seen.get(s.animation).size!==s.total)throw Error('Unobserved '+s.animation);
  await page.evaluate(index=>window.__SPRITE_REVIEW__.showFrame(index),pose==='death'?3:pose==='basic_attack'?2:0);
  await capture(pose+'_1280x720.png');
  if(pose==='basic_attack'){
   await page.evaluate(()=>window.__SPRITE_REVIEW__.showFrame(1));
   await capture('basic_attack_windup_1280x720.png');
  }
  observations.push({pose,phaser:first.phaser,logicalCanvas:[640,360],displayCanvas:[1280,720],sprites:first.sprites,observed:Object.fromEntries([...seen].map(([k,v])=>[k,[...v]]))});
  await page.evaluate(state=>window.__SPRITE_REVIEW__.playNative(state),pose);
  await page.waitForTimeout(850);
  const held=await page.evaluate(()=>window.__SPRITE_REVIEW__.snapshot());
  for(let i=0;i<held.sprites.length;i++){
   const s=held.sprites[i],before=first.sprites[i];
   if(JSON.stringify(s.position)!==JSON.stringify(before.position)||JSON.stringify(s.origin)!==JSON.stringify(before.origin))throw Error('Position/origin changed');
   if(['idle','walk'].includes(pose)){if(!s.isPlaying)throw Error('Loop unexpectedly stopped');}
   else{
    if(s.isPlaying)throw Error('One-shot still playing');
    const a=JSON.parse(readFileSync(resolve(root,'sprites/creeps/arena/'+({creep_jiangshi_zombie:'jiangshi-zombie',creep_vengeful_spirit:'vengeful-spirit',creep_armored_skeleton:'armored-skeleton',creep_stone_golem:'stone-golem'}[s.id])+'/manifest.json'),'utf8')).animations.find(a=>a.state===pose&&a.direction===s.direction);
    if(s.frame!==a.frames.at(-1))throw Error('One-shot did not hold final frame');
   }
  }
  nativePlayback.push({state:pose,repeatPolicy:pose==='idle'||pose==='walk'?'loop':'once_then_hold',sprites:held.sprites});
 }
 for(const direction of ['down','left','up','right']){
  await page.evaluate(d=>window.__SPRITE_REVIEW__.playNative('walk',d),direction);
  await page.waitForTimeout(100);
  const sample=await page.evaluate(()=>window.__SPRITE_REVIEW__.snapshot());
  if(sample.sprites.some(s=>!s.frame.startsWith('walk_'+direction+'_')))throw Error('Facing transition failed');
  transitionChecks.push({direction,frames:sample.sprites.map(s=>s.frame)});
 }
 for(const backdrop of ['grass','stone']){
  await load('pose=idle&backdrop='+backdrop);
  await page.evaluate(()=>window.__SPRITE_REVIEW__.showFrame(0));
  await capture('idle_'+backdrop+'_1280x720.png');
 }
 await load('pose=walk&crowd=1&backdrop=stone');
 const crowded=await page.evaluate(()=>window.__SPRITE_REVIEW__.snapshot());
 if(crowded.baselineSprites!==6||crowded.sprites.length!==16)throw Error('Crowd composition failed');
 await capture('crowd_1280x720.png');
 await page.setViewportSize({width:640,height:360});await load('pose=idle&display=1');
 await page.evaluate(()=>window.__SPRITE_REVIEW__.showFrame(0));await capture('idle_640x360.png');
 await page.setViewportSize({width:1280,height:1655});await page.goto(url+path+'compare.html');
 const frame=page.frames().find(f=>f.url().includes('review.html'));
 if(!frame)throw Error('Missing comparison frame');
 await frame.waitForFunction(()=>window.__SPRITE_REVIEW__?.ready);
 await page.screenshot({path:resolve(evidence,'concept_comparison.png'),fullPage:true});screenshots.push('concept_comparison.png');
 if(errors.length)throw Error(errors.join('\n'));
 const tags=observations.reduce((n,o)=>n+o.sprites.length,0),frames=observations.reduce((n,o)=>n+o.sprites.reduce((k,s)=>k+s.total,0),0);
 const report={status:'PASS',scope:'Isolated installed Phaser renderer; PNG evidence and live observations; no match integration or network test',recording:false,errors,totalAnimationTags:tags,totalFrames:frames,observations,nativePlayback,transitionChecks,stagedCrowd:{heroes:6,enemies:16,multiplayer:false},screenshots};
 writeFileSync(resolve(evidence,'phaser_verification.json'),JSON.stringify(report,null,2)+'\n');
 const indexPath=resolve(here,'production_manifest_v1.json'),index=JSON.parse(readFileSync(indexPath,'utf8'));
 for(const asset of index.assets){
  const p=resolve(root,asset.manifest),m=JSON.parse(readFileSync(p,'utf8'));
  m.normalGameplayReview='PASS: isolated Phaser '+observations[0].phaser+', 1x logical/1x and2x display, all frames observed, native loop/one-shot/facing transitions and constant origins checked. No live-match integration or owner runtime approval.';
  m.verification='Isolated Phaser verification passed; owner animation approval pending; not integrated.';
  m.verificationEvidence=['sprites/creeps/arena/waves-09-12-production/review/phaser_verification.json','sprites/creeps/arena/waves-09-12-production/review/concept_comparison.png'];
  writeFileSync(p,JSON.stringify(m,null,2)+'\n');
 }
 Object.assign(index,{totalFrames:frames,totalAnimationTags:tags,verification:'PASS: isolated Phaser playback; owner animation review pending; not integrated'});
 writeFileSync(indexPath,JSON.stringify(index,null,2)+'\n');
 console.log('PASS: Phaser '+observations[0].phaser+', '+tags+' tags, '+frames+' frames, native playback/facing/position checks, '+screenshots.length+' PNG screenshots; no recording.');
}finally{await browser?.close();await new Promise(ok=>server.close(ok));}

