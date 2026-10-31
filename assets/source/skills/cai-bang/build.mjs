import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../../../..');
const binary=process.env.ASEPRITE_PATH??'C:/Program Files/Aseprite/Aseprite.exe';
if(!existsSync(binary))throw Error('Aseprite executable missing');
const lock=JSON.parse(readFileSync(resolve(root,'assets/approved_cai_bang.lock.json')));
function baseline(){for(const [file,hash] of Object.entries(lock.files)){if(createHash('sha256').update(readFileSync(resolve(root,file))).digest('hex')!==hash)throw Error('Approved baseline changed: '+file);}}
function run(args){const r=spawnSync(binary,args,{cwd:root,encoding:'utf8',windowsHide:true});if(r.error)throw r.error;if(r.status!==0)throw Error(r.stdout+'\n'+r.stderr);}
baseline();
const recipe=JSON.parse(readFileSync(resolve(here,'recipe.json'),'utf8'));
function offset(a,anim){const [dx,dy]=({right:[1,0],left:[-1,0],down:[0,1],up:[0,-1],none:[0,0]})[anim.direction];switch(anim.placement){case 'character_feet':return [0,0];case 'ground':return [0,-2];case 'caster_hand':return [dx*18,dy*12-21];case 'caster_body':return [0,a.id==='thien_ha_vo_cau_vfx'?-12:-22];case 'target_above_head':return [0,-52];case 'caster_front':{const n=a.id==='cam_long_cong_vfx'?65:20;return [dx*n,dy*n-18];}case 'caster_rear':return [-dx*15,-dy*15-18];case 'caster_front_ground':return [dx*30,dy*30-4];default:return [0,-18];}}
if(process.argv.includes('--assemble'))run(['-b','--script-param','root='+root.replaceAll('\\','/'),'--script-param','recipe='+resolve(here,'recipe.json').replaceAll('\\','/'),'--script',resolve(here,'assemble.lua')]);
const exported=[];
for(const a of recipe.assets){
 const folder=resolve(root,a.exportFolder);mkdirSync(folder,{recursive:true});
 const png=a.id+'.png',json=a.id+'.json';
 run(['-b',resolve(root,a.sourceFolder,a.id+'.aseprite'),'--list-tags','--list-slices','--sheet-type','rows','--sheet-columns','8','--filename-format','{tag}_{tagframe}','--format','json-hash','--sheet',resolve(folder,png),'--data',resolve(folder,json)]);
 const atlas=JSON.parse(readFileSync(resolve(folder,json),'utf8'));atlas.meta.image=png;
 writeFileSync(resolve(folder,json),JSON.stringify(atlas,null,2)+'\n');
 const animations=a.animations.map(anim=>({
  name:anim.name,frames:anim.frames.map((_,i)=>anim.name+'_'+i),frameDimensions:a.canvas,frameCount:anim.frames.length,frameRate:1000/anim.durationMs,durationMsPerFrame:anim.durationMs,
  loop:anim.loop,repeat:anim.loop?-1:0,direction:anim.direction,origin:[a.pivot[0]/a.canvas[0],a.pivot[1]/a.canvas[1]],pivot:a.pivot,stage:anim.stage,placement:anim.placement,
  effectPlacementOffset:offset(a,anim),
  timingAuthority:'Visual cadence only. Server events control damage, impacts, buff/CC/burn lifetime. Unimplemented skill timing is provisional.',
  provenance:a.artMethod??(a.kind==='character'?'Unmodified distinct approved baseline frames reused from '+a.reusedFrom:'Original generated animation source; alpha cleanup and fixed-scale alignment in Aseprite')
 }));
 const meta={id:a.id,skillId:a.id.replace(/_(vfx|character)$/,''),status:'produced_candidate_pending_runtime_review',kind:a.kind,source:a.sourceFolder+'/'+a.id+'.aseprite',sheet:a.exportFolder+'/'+png,atlas:a.exportFolder+'/'+json,frameDimensions:a.canvas,pivot:a.pivot,origin:[a.pivot[0]/a.canvas[0],a.pivot[1]/a.canvas[1]],animations,
 provenance:{method:a.artMethod??(a.kind==='character'?'reuse_approved_raster_frames':'OpenAI built-in image_gen.imagegen; Aseprite 1.3.18.6 packing'),prompts:'assets/source/skills/cai-bang/generation_prompts_v2.json',reference:'assets/concepts/skills/cai-bang/',license:'Original AI-assisted project art and reused approved project pixels. No external asset pack. No claim of exclusive copyright or separately verified reference license.'},
 runtimeIntegrated:false,productionArtApproved:false};
 writeFileSync(resolve(folder,a.id+'.animations.json'),JSON.stringify(meta,null,2)+'\n');exported.push(meta);
}
const manifest={schemaVersion:1,createdOn:'2026-10-30',scope:'Isolated skill asset production and preview only',conceptApproval:'User approved all ten Phase A concepts',productionArtApproved:false,runtimeIntegrated:false,assets:exported};
writeFileSync(resolve(root,'assets/exports/skills/cai-bang/production_manifest_v1.json'),JSON.stringify(manifest,null,2)+'\n');
baseline();console.log('Exported '+exported.length+' animation components; approved baseline hashes unchanged.');

