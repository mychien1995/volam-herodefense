import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../../..');
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve(root,'.cache/ms-playwright');
const {chromium}=await import('@playwright/test');
const evidence=resolve(root,'assets/reviews/skills/cai-bang');mkdirSync(evidence,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png'};
const server=createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const path=resolve(root,'.'+pathname);if(!path.startsWith(root+sep))throw Error('Path');res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');res.end(readFileSync(path));}catch{res.writeHead(404);res.end();}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const origin='http://127.0.0.1:'+server.address().port;
const manifest=JSON.parse(readFileSync(resolve(root,'assets/exports/skills/cai-bang/production_manifest_v1.json'),'utf8'));
const skills=[...new Set(manifest.assets.filter(a=>a.kind==='character').map(a=>a.skillId))];
const sampleTime=skill=>({hoa_van_chuong:540,cuong_long_loan_vu:800,phi_long_tai_thien:280,khang_long_huu_hoi:650,hang_long_hoa_vu:280,hoanh_tao_bong:220,pha_giap_bong:230,cam_long_cong:540,truy_phong_bong:290,thien_ha_vo_cau:620}[skill]??800);
const errors=[],observations=[];let browser;
try{
 browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const skill of skills){
  const folder=resolve(evidence,skill);mkdirSync(folder,{recursive:true});
  for(const mode of ['character','vfx','combined','arena']){
   await page.goto(origin+'/assets/source/skills/cai-bang/review.html?skill='+skill+'&mode='+mode);
   await page.waitForFunction(()=>window.__SKILL_REVIEW__?.ready);
   const seen=new Map();let first;
   for(let i=0;i<40;i++){
    const sample=await page.evaluate(()=>window.__SKILL_REVIEW__.snapshot());first??=sample;
    if(sample.errors.length)throw Error(sample.errors.join(','));
    for(const s of sample.sprites){const set=seen.get(s.asset+':'+s.animation)||new Set();set.add(s.frame);seen.set(s.asset+':'+s.animation,set);}
    await page.waitForTimeout(30);
   }
   if(['character','vfx'].includes(mode))for(const s of first.sprites)if(seen.get(s.asset+':'+s.animation).size!==s.total)throw Error('Unobserved frames '+skill+':'+s.animation);
   await page.evaluate(t=>window.__SKILL_REVIEW__.setTime(t),sampleTime(skill));
   await page.screenshot({path:resolve(folder,mode+'_1280x720.png')});
   observations.push({skill,mode,phaser:first.phaser,observed:Object.fromEntries([...seen].map(([k,v])=>[k,[...v]])),sprites:first.sprites.length,errors:first.errors});
  }
  for(const terrain of ['light','dark']){
   await page.goto(origin+'/assets/source/skills/cai-bang/review.html?skill='+skill+'&mode=combined&terrain='+terrain);
   await page.waitForFunction(()=>window.__SKILL_REVIEW__?.ready);
   await page.evaluate(t=>window.__SKILL_REVIEW__.setTime(t),sampleTime(skill));
   await page.screenshot({path:resolve(folder,terrain+'_1280x720.png')});
  }
  await page.goto(origin+'/assets/source/skills/cai-bang/review.html?skill='+skill+'&mode=six');
  await page.waitForFunction(()=>window.__SKILL_REVIEW__?.ready);await page.evaluate(t=>window.__SKILL_REVIEW__.setTime(t),skill==='cuong_long_loan_vu'?450:sampleTime(skill));
  await page.screenshot({path:resolve(folder,'six_simultaneous_1280x720.png')});
 }
 await page.goto(origin+'/assets/source/skills/cai-bang/review.html?skill='+skills[0]+'&mode=vfx&shared=1');
 await page.waitForFunction(()=>window.__SKILL_REVIEW__?.ready);
 const seen=new Map();for(let i=0;i<40;i++){const s=await page.evaluate(()=>window.__SKILL_REVIEW__.snapshot());for(const a of s.sprites){const set=seen.get(a.animation)||new Set();set.add(a.frame);seen.set(a.animation,set);if(i===39&&set.size!==a.total)throw Error('Shared frames not all observed');}await page.waitForTimeout(30);}
 observations.push({shared:true,observed:Object.fromEntries([...seen].map(([k,v])=>[k,[...v]]))});
 if(errors.length)throw Error(errors.join('\n'));
 await ctx.close();
 writeFileSync(resolve(evidence,'phaser_verification.json'),JSON.stringify({status:'PASS',scope:'Isolated actual Phaser rendering only; no production match integration, multiplayer simulation, or director runtime approval.',logicalCanvas:[640,360],displayCanvas:[1280,720],errors,observations},null,2)+'\n');
 console.log('PASS: '+skills.length+' skills, all character/VFX animation frames observed; four preview modes + light/dark + six simultaneous screenshots per skill. Actual Phaser '+observations[0].phaser+'.');
}finally{await browser?.close();await new Promise(ok=>server.close(ok));}

