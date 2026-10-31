import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve(root,'.cache/ms-playwright');
const {chromium}=await import('@playwright/test');
const manifest=JSON.parse(readFileSync(resolve(root,'assets/exports/skills/thien-son/production_manifest_v01.json'),'utf8'));
const folder=resolve(root,'assets/reviews/skills/thien-son/all_facings');mkdirSync(folder,{recursive:true});
const peaks={lien_hoa_phien:300,luc_duong_chuong:620,luu_phong_bo:180,chiet_mai_thu:650,bach_phien_phong_bao:700,phi_anh_tram:220,truy_hon_dao:250,phong_anh_hoan_vi:500,liet_phong_dao:300,bach_liet_thien_kich:650};
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('response',r=>{if(r.status()>=400&&r.url().includes('/assets/'))errors.push(r.status()+' '+r.url());});
 await page.goto('http://127.0.0.1:5194/?artPreview=1&thienSonSkills=1');
 await page.waitForFunction(()=>window.__THIEN_SON_SKILL_REVIEW__?.snapshot().ready);
 const snapshots=[];
 for(const skill of manifest.skills.filter(s=>s.kind==='active')){
  await page.evaluate(id=>window.__THIEN_SON_SKILL_REVIEW__.choose(id,'right','four','counter'),skill.id);
  await page.waitForTimeout(peaks[skill.id]);
  await page.evaluate(()=>window.__THIEN_SON_SKILL_REVIEW__.pause());
  const s=await page.evaluate(()=>window.__THIEN_SON_SKILL_REVIEW__.snapshot());
  if(s.actors.length!==4||s.zoom!==1||s.displayZoom!==2||Math.abs(s.rotation)>1e-8||s.errors.length)throw Error('Invalid four-facing review '+skill.id);
  for(const [i,a] of s.actors.entries()){
   if(!a.tag.endsWith('_'+['down','left','right','up'][i])||a.origin[0]!==.5||a.origin[1]!==.8||a.scale.some(v=>v!==1))throw Error('Facing/foot-origin mismatch '+skill.id);
  }
  for(const e of s.effects)if(e.ownerX!==undefined){
   if(Math.abs(e.x-e.ownerX-e.offset[0])>.51||Math.abs(e.y-e.ownerY-e.offset[1])>.51||Math.abs(e.depth-e.ownerY-e.depthDelta)>.001)throw Error('Effect placement/depth mismatch '+skill.id);
  }
  const filename=skill.id+'_four_v01.png';
  await page.screenshot({path:resolve(folder,filename),type:'png',clip:{x:0,y:250,width:1280,height:290},animations:'disabled'});
  await page.evaluate(()=>window.__THIEN_SON_SKILL_REVIEW__.resume());
  await page.waitForFunction(()=>window.__THIEN_SON_SKILL_REVIEW__.snapshot().activeEffects===0,{},{timeout:4000});
  await page.waitForTimeout(200);
  const settled=await page.evaluate(()=>window.__THIEN_SON_SKILL_REVIEW__.snapshot());
  if(settled.actors.some(a=>a.asset!==(skill.style==='dao'?'hero_thien_son_dao':'hero_thien_son')))throw Error('Recovery did not return to approved idle '+skill.id);
  snapshots.push({settled,id:skill.id,screenshot:'assets/reviews/skills/thien-son/all_facings/'+filename,viewport:[1280,720],screenshotClip:[0,250,1280,290],facings:['down','left','right','up'],snapshot:s,cleaned:true});
 }
 for(const color of ['light','dark']){
  await page.getByLabel('Contrast background').selectOption(color);
  await page.evaluate(()=>window.__THIEN_SON_SKILL_REVIEW__.choose('lien_hoa_phien','right','four'));
  await page.waitForTimeout(300);await page.evaluate(()=>window.__THIEN_SON_SKILL_REVIEW__.pause());
  await page.screenshot({path:resolve(folder,'contrast_'+color+'_v01.png'),type:'png',clip:{x:0,y:250,width:1280,height:290},animations:'disabled'});
  await page.evaluate(()=>window.__THIEN_SON_SKILL_REVIEW__.resume());
 }
 if(errors.length)throw Error(errors.join('\n'));
 const state=await page.evaluate(()=>window.__VOLAM__.snapshot());
 if(state.roomId!==undefined||state.state!==undefined||state.events.length)throw Error('Art-only review joined a room');
 const report={status:'PASS',scope:'All ten active skills composed in four facing presentation-only previews; no gameplay simulation.',normalZoom:1,displayZoom:2,video:false,trace:false,errors,snapshots};
 writeFileSync(resolve(folder,'verification_v01.json'),JSON.stringify(report,null,2)+'\n');
 console.log('PASS: all ten active skills composed in all four facings, directional offsets/depth and cleanup verified; 12 native-scale PNG crops, no room connection.');
 await context.close();
}finally{await browser.close();}

