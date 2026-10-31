import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
const here=fileURLToPath(new URL('.',import.meta.url));
const root=resolve(here,'../../../..');
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve(root,'.cache/ms-playwright');
const {chromium}=await import('@playwright/test');
const evidence=resolve(here,'review');mkdirSync(evidence,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'};
const server=createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const target=resolve(root,'.'+pathname);
  if(!target.startsWith(root+sep))throw Error('Path outside repository');
  res.setHeader('Content-Type',mime[extname(target)]||'application/octet-stream');
  res.end(readFileSync(target));
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url='http://127.0.0.1:'+server.address().port;
let browser;const errors=[];const observations=[];
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 page.on('pageerror',error=>errors.push(error.message));
 for(const pose of ['idle','walk','basic_attack','hurt','death']){
  await page.goto(url+'/sprites/creeps/arena/waves-05-08-production/review.html?pose='+pose);
  await page.waitForFunction(()=>window.__SPRITE_REVIEW__?.ready);
  const seen=new Map();let first;
  for(let i=0;i<85;i++){
   const sample=await page.evaluate(()=>window.__SPRITE_REVIEW__.snapshot());
   first??=sample;
   if(sample.sprites.length!==16)throw Error('Expected 16 rendered sprites');
   if(sample.errors.length)throw Error(sample.errors.join(','));
   for(const sprite of sample.sprites){const set=seen.get(sprite.animation)||new Set();set.add(sprite.frame);seen.set(sprite.animation,set);}
   await page.waitForTimeout(35);
  }
  for(const s of first.sprites)if(seen.get(s.animation).size!==s.total)throw Error('Unobserved frames '+s.animation);
  await page.evaluate(index=>window.__SPRITE_REVIEW__.showFrame(index),pose==='death'?3:pose==='basic_attack'?1:0);
  await page.screenshot({path:resolve(evidence,pose+'_1280x720.png')});
  observations.push({pose,phaser:first.phaser,logicalCanvas:[640,360],displayCanvas:[1280,720],sprites:first.sprites,observed:Object.fromEntries([...seen].map(([k,v])=>[k,[...v]]))});
 }
 await page.setViewportSize({width:1280,height:1655});
 await page.goto(url+'/sprites/creeps/arena/waves-05-08-production/compare.html');
 const frame=page.frames().find(f=>f.url().includes('review.html'));
 if(!frame)throw Error('Missing comparison frame');
 await frame.waitForFunction(()=>window.__SPRITE_REVIEW__?.ready);
 await page.screenshot({path:resolve(evidence,'concept_comparison.png'),fullPage:true});
 if(errors.length)throw Error(errors.join('\n'));
 writeFileSync(resolve(evidence,'phaser_verification.json'),JSON.stringify({status:'PASS',scope:'Isolated actual Phaser renderer; no match integration or multiplayer verification',errors,observations},null,2));
 await page.context().close();
 const tags=observations.reduce((sum,o)=>sum+o.sprites.length,0);
 const frames=observations.reduce((sum,o)=>sum+o.sprites.reduce((n,s)=>n+s.total,0),0);
 const indexPath=resolve(here,'production_manifest_v1.json');
 const index=JSON.parse(readFileSync(indexPath,'utf8'));
 for(const asset of index.assets){
  const path=resolve(root,asset.manifest);
  const manifest=JSON.parse(readFileSync(path,'utf8'));
  manifest.normalGameplayReview='PASS: isolated Phaser '+observations[0].phaser+', 1x logical / 2x display, all frames observed. No match integration or director runtime approval.';
  manifest.verificationEvidence=['sprites/creeps/arena/waves-05-08-production/review/phaser_verification.json','sprites/creeps/arena/waves-05-08-production/review/concept_comparison.png'];
  writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');
 }
 Object.assign(index,{totalFrames:frames,totalAnimationTags:tags,verification:'PASS: isolated Phaser; director review pending; not integrated'});
 writeFileSync(indexPath,JSON.stringify(index,null,2)+'\n');
 console.log('PASS: Phaser '+observations[0].phaser+', 16 sprites per pose, all '+tags+' tags and '+frames+' frames observed; 6 PNG screenshots captured; live frame observations saved.');
}finally{await browser?.close();await new Promise(ok=>server.close(ok));}

