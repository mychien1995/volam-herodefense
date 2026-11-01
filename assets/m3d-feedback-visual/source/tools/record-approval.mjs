// Run --record only following explicit director approval. Verification never grants approval.
import {readFile,writeFile,access} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {CATALOG,DIRS,buildPlan} from '../../performance-plans.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),repo=resolve(root,'../..');
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const hash=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
const save=(p,j)=>writeFile(p,JSON.stringify(j,null,2)+'\n');
const rel=p=>relative(repo,p).replaceAll('\\','/');
const recordPath=resolve(root,'director_approval_r2.json'),lockPath=resolve(root,'approved_visual_r2.lock.json');
if(process.argv.includes('--verify')){
  const record=await read(recordPath),lock=await read(lockPath);
  assert.equal(record.lockSha256,await hash(lockPath));
  assert.equal(record.userStatement,'duyệt visual');assert.equal(record.visualApproved,true);
  assert.equal(record.productionIntegrated,false);assert.equal(record.phaserProductionVerified,false);
  for(const [path,sha] of Object.entries(lock.files))assert.equal(await hash(resolve(repo,path)),sha,path);
  console.log(JSON.stringify({status:'PASS',approvedFiles:Object.keys(lock.files).length,selectedComponents:lock.components.length,visualApproved:true,productionIntegrated:false,phaserProductionVerified:false}));
}else if(process.argv.includes('--record')){
  let exists=false;try{await access(recordPath);exists=true;}catch{}
  assert(!exists,'Approval already exists. Use --verify; changed artwork needs a separately approved revision.');
  const m=await read(resolve(root,'manifest.json')),support=await read(resolve(root,'previews/support/manifest.json')),validation=await read(resolve(root,'previews/validation.json')),plan=await read(resolve(root,'source/plan.json'));
  const assets=new Map(),newIds=new Set(m.components.map(c=>c.id)),selected=new Map(),retained=new Map();
  for(const c of [...m.components,...support.components])assets.set(c.id,{...c,bounds:c.bounds??validation.components.find(x=>x.id===c.id)?.frameBounds,
    animations:c.animations.map(a=>({...a,frameDurationsMs:a.frameDurationsMs??a.frames.map(()=>1000/a.frameRate)}))});
  const select=(id,tag,from=0)=>{
    const a=assets.get(id).animations.find(a=>a.name===tag);assert(a,id+'/'+tag);
    const target=newIds.has(id)?selected:retained;
    if(!target.has(id))target.set(id,new Map());if(!target.get(id).has(tag))target.get(id).set(tag,new Set());
    for(const frame of a.frames.slice(from))target.get(id).get(tag).add(frame);
  };
  for(const [id] of CATALOG)for(const d of DIRS)for(let beat=0;beat<(id==='sl_a'?4:id==='wd_a'?2:1);beat++){
    const p=buildPlan(assets,id,d,beat);select(p.actor,'idle_'+d);
    for(const tr of p.tracks)select(tr.id,tr.tag,tr.fromFrame??0);
  }
  for(const a of assets.get('m3d_dash_icon').animations)select('m3d_dash_icon',a.name);
  const files={},components=[],sourceIds=new Set();
  const pin=async p=>{files[rel(p)]=await hash(p);};
  for(const c of m.components){
    const tags=selected.get(c.id);assert(tags?.size,'Unselected component '+c.id);
    const source=plan.components.find(x=>x.id===c.id);
    const selection=[...tags].map(([name,frames])=>({name,frames:[...frames]}));
    components.push({id:c.id,approvedTags:selection,excludedTags:c.animations.filter(a=>!tags.has(a.name)).map(a=>a.name),containerFrameCount:c.animations.reduce((n,a)=>n+a.frames.length,0)});
    for(const p of [c.sourceFile,c.sheet,c.atlas,c.sheet.replace(/\.png$/,'.animations.json')])await pin(resolve(repo,p));
    for(const [tag,names] of tags){
      for(const name of names)await pin(resolve(repo,c.individualDirectory,name+'.png'));
      const clip=source.clips.find(a=>a.name===tag);for(const s of clip.selections)sourceIds.add(s.source);
    }
  }
  for(const id of sourceIds)await pin(resolve(root,'source/generated',id+'.png'));
  const associated=['manifest.json','provenance.json','frame_inventory.csv','feedback-r2.js','feedback-r2-handoff.json','performance-plans.js','performance.js','performance.html','performance.css','index.html','source/plan.json','source/generation_records.json','source/character_measurements.json','source/effect_measurements.json','previews/browser_validation.json','previews/performance_validation.json','previews/validation.json','previews/overview_1x.png','previews/overview_2x.png','previews/support/manifest.json'];
  for(const p of associated)await pin(resolve(root,p));
  for(const f of support.files)await pin(resolve(root,f.copy));
  const inventory=await read(resolve(root,'file_inventory.json'));
  for(const f of inventory.files)if(f.path.includes('/previews/performance_r2_')&&f.path.endsWith('.png'))await pin(resolve(repo,f.path));
  const lock={revision:2,approvedOn:'2026-11-02',userStatement:'duyệt visual',visualApproved:true,
    scope:'Selected delivered r2 sprite/VFX/icon and preview choreography. Tag/frame selection below is authoritative; hashing whole containers or references does not approve unused cels/tags.',
    exclusions:['Production integration/Phaser verification/runtime director approval','Gameplay, damage, hitboxes, cooldowns, AI, balance and authoritative teleport timing','Superseded backwards sonic tags, unused full-sequence convenience tags and unused/raw rejected source cels','Unrelated animations contained in retained actor atlases'],
    components,retainedActorTags:[...retained].map(([id,tags])=>({id,tags:[...tags.keys()],scope:'exact retained support as used in r2; not new approval of unrelated atlas tags'})),files};
  await save(lockPath,lock);
  await save(recordPath,{revision:2,approvedOn:'2026-11-02',timezone:'Asia/Saigon',userStatement:'duyệt visual',authority:'Explicit game-director approval in this chat after r2 preview delivery',
    visualApproved:true,directorApproved:true,approvalScope:'Selected visual r2 and art-preview choreography',
    productionIntegrated:false,phaserProductionVerified:false,runtimeDirectorApproved:false,
    lock:'assets/m3d-feedback-visual/approved_visual_r2.lock.json',lockSha256:await hash(lockPath),
    containerComponents:m.components.length,containerFrameReferences:m.frameReferences,
    selectedTags:components.reduce((n,c)=>n+c.approvedTags.length,0),selectedFrameReferences:components.reduce((n,c)=>n+c.approvedTags.reduce((n,a)=>n+a.frames.length,0),0),
    historicalMetadata:'Existing source/export manifests, per-component approval flags, provenance and test reports remain export-time snapshots. This record plus validated lock is the current visual approval authority.',
    nextGate:'Integrate with the committed tech changes, verify real Phaser/multiplayer/normal-zoom presentation, then request runtime review.'});
  console.log(JSON.stringify({recorded:true,approvedFiles:Object.keys(files).length,components:components.length,visualApproved:true,productionIntegrated:false}));
}else throw Error('Choose --record after explicit approval, or --verify.');
