import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../../..');
const binary=process.env.ASEPRITE_PATH??'C:/Program Files/Aseprite/Aseprite.exe';
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const hash=p=>createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex');
const write=(p,data)=>writeFileSync(resolve(root,p),JSON.stringify(data,null,2)+'\n');
const before=read('assets/source/skills/thien-son/inventory_before_v01.json');
function guard(){for(const [file,expected] of Object.entries(before.protectedAndConceptFiles))if(hash(file)!==expected)throw Error('Protected art changed: '+file);}
function run(args){const r=spawnSync(binary,args,{cwd:root,encoding:'utf8',windowsHide:true});if(r.error)throw r.error;if(r.status!==0)throw Error(r.stdout+'\n'+r.stderr);}
guard();
const recipe=read('assets/source/skills/thien-son/recipe_v01.json');
if(process.argv.includes('--assemble'))run(['-b','--script-param','root='+root.replaceAll('\\','/'),'--script-param','recipe='+resolve(here,'recipe_v01.json').replaceAll('\\','/'),'--script',resolve(here,'assemble_v01.lua')]);
const assets=[];
for(const a of recipe.assets){
 const folder=resolve(root,a.exportFolder);mkdirSync(folder,{recursive:true});
 const sheet=a.exportFolder+'/'+a.id+'.png',atlas=a.exportFolder+'/'+a.id+'.json',source=a.sourceFolder+'/'+a.id+'.aseprite';
 run(['-b',resolve(root,source),'--list-tags','--list-slices','--sheet-type','rows','--sheet-columns','8','--filename-format','{tag}_{tagframe}','--format','json-hash','--sheet',resolve(root,sheet),'--data',resolve(root,atlas)]);
 const raw=read(atlas);raw.meta.image=a.id+'.png';write(atlas,raw);
 const animations=a.animations.map(t=>({name:t.name,frames:t.frames.map((_,i)=>t.name+'_'+i),frameDimensions:a.canvas,frameCount:t.frames.length,frameRate:1000/t.durationMs,durationMsPerFrame:t.durationMs,loop:t.loop,repeat:t.loop?-1:0,direction:t.direction,origin:a.pivot.map((n,i)=>n/a.canvas[i]),pivot:a.pivot,stage:t.stage,placement:t.placement,effectPlacementOffset:t.effectPlacementOffset??[0,-18],timingAuthority:'Presentation-only provisional cadence; no cooldown, movement, hitbox or authoritative hit timing.',provenance:a.artMethod,sourceStageReuse:t.sourceStageReuse??null}));
 const meta={id:a.id,skillId:a.skillId,kind:a.kind,status:'prototype_pending_final_art_approval',source,sheet,atlas,frameDimensions:a.canvas,pivot:a.pivot,origin:a.pivot.map((n,i)=>n/a.canvas[i]),displayScale:1,animations,canvasReason:a.canvasReason??'Effect-specific transparent canvas',approvedFrameReuse:a.animations.flatMap(t=>t.frames.filter(f=>f.reusedFrame).map(f=>({tag:t.name,frame:f.reusedFrame,atlas:f.reusedFrom}))),approvedConcept:'assets/concepts/skills/thien-son/'+a.skillId+'-concept-v01.png',provenance:{method:a.artMethod,prompts:'assets/source/skills/thien-son/generation_prompts_v01.json',recipe:'assets/source/skills/thien-son/recipe_v01.json',license:'Original AI-assisted project art from approved project references. No external asset pack or exclusive-rights claim.'},runtimeIntegrated:false,visualPreviewVerified:false,productionArtApproved:false,hashes:{source:hash(source),sheet:hash(sheet),atlas:hash(atlas)}};
 write(a.exportFolder+'/'+a.id+'.animations.json',meta);assets.push(meta);
}
const icons=[];
for(const a of recipe.icons){
 const source=a.sourceFolder+'/icon.aseprite',file=a.exportFolder+'/icon.png';
 run(['-b',resolve(root,source),'--save-as',resolve(root,file)]);
 const meta={id:a.id,nameVi:a.name,file,source,size:[64,64],status:'prototype_pending_final_art_approval',approvedConcept:a.approvedConcept,method:'Approved generated icon concept raster reduced exactly 4-to-1 with nearest sampling in Aseprite; editable 64px source, opaque ink-teal icon ground intentional; no names or hotkeys baked in.',hashes:{source:hash(source),png:hash(file)},productionArtApproved:false};
 write(a.exportFolder+'/icon.provenance.json',meta);icons.push(meta);
}
const concepts=read('assets/concepts/skills/thien-son/concept_manifest_v01.json');
const skills=concepts.entries.map(e=>({id:e.id,nameVi:e.name,kind:e.kind,style:e.style==='dao'?'dao':'fan',ultimate:e.ultimate??false,characterId:e.kind==='active'?e.id+'_character':(e.style==='dao'?'hero_thien_son_dao':'hero_thien_son'),vfxId:e.kind==='active'?e.id+'_vfx':null,icon:'assets/exports/skills/thien-son/'+e.id+'/icon.png',approvedConcept:e.conceptPath,approvedIconConcept:e.iconConceptPath}));
const manifest={skills,schemaVersion:1,schoolId:'thien_son',createdOn:'2026-10-31',status:'prototype_pending_final_art_approval',scope:'Skill visual assets and presentation-only Phaser preview. No gameplay implementation.',conceptApproval:'assets/concepts/skills/thien-son/concept_approval_v01.json',expectedActiveSkills:10,complete:assets.filter(a=>a.kind==='character').length===10&&assets.filter(a=>a.kind==='vfx').length===10&&icons.length===13,productionArtApproved:false,runtimeIntegrated:false,assets,icons,basics:[{id:'thien_son_phien',character:'assets/exports/characters/hero_thien_son.json',tags:'basic_attack_{direction}',method:'existing approved basic attacks reused unchanged'},{id:'thien_son_dao',character:'assets/exports/characters/hero_thien_son_dao.json',tags:'basic_attack_{direction}',method:'existing approved basic attacks reused unchanged'}],passive:{id:'bac_minh_than_cong',vfx:null,reason:'Icon only; no new persistent aura.'}};
write('assets/exports/skills/thien-son/production_manifest_v01.json',manifest);
const iconAtlas=existsSync(resolve(root,'assets/exports/skills/thien-son/thien_son_icons_v01.json'))?{sheet:'assets/exports/skills/thien-son/thien_son_icons_v01.png',data:'assets/exports/skills/thien-son/thien_son_icons_v01.json',source:'assets/source/skills/thien-son/icons/thien_son_icons_v01.aseprite',frameSize:[64,64]}:null;
write('assets/exports/skills/thien-son/icons_manifest_v01.json',{schemaVersion:1,status:'prototype',icons,...(iconAtlas?{atlas:iconAtlas}:{})});
write('assets/exports/skills/thien-son/preview_plan_v01.json',read('assets/source/skills/thien-son/preview_plan_v01.json'));
guard();console.log(JSON.stringify({components:assets.length,tags:assets.reduce((n,a)=>n+a.animations.length,0),frames:assets.reduce((n,a)=>n+a.animations.reduce((m,t)=>m+t.frameCount,0),0),icons:icons.length,complete:manifest.complete,protectedUnchanged:Object.keys(before.protectedAndConceptFiles).length}));

