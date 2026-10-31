import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)).replaceAll('\\','/'),out=root+'assets/exports/effects/arena_creep_impacts/',source=root+'assets/source/effects/arena_creep_impacts/';
mkdirSync(out+'frames',{recursive:true});
const exe='C:/Program Files/Aseprite/Aseprite.exe';
execFileSync(exe,['-b','--script-param','root='+root.replace(/\/$/,''),'--script',source+'export.lua'],{stdio:'inherit'});
execFileSync(exe,['-b',source+'arena_creep_impacts.aseprite','--list-tags','--list-slices','--sheet-type','rows','--sheet-columns','4','--filename-format','{tag}_{tagframe}','--format','json-hash','--sheet',out+'spritesheet.png','--data',out+'atlas.json'],{stdio:'inherit'});
const atlas=JSON.parse(readFileSync(out+'atlas.json'));atlas.meta.image='spritesheet.png';writeFileSync(out+'atlas.json',JSON.stringify(atlas,null,2)+'\n');
const hash=p=>createHash('sha256').update(readFileSync(root+p)).digest('hex');
const ids=['undead_contact','spectral_contact','metal_contact','stone_contact'];
const concepts=['cuong_thi','oan_linh','thiet_giap_kho_lau','thach_nhan'].map(n=>'assets/concepts/arena-creeps/waves-09-12/'+n+'_concept.png');
for(const id of ids)for(let i=0;i<4;i++)if(!atlas.frames[id+'_'+i])throw Error('Missing impact pose');
writeFileSync(out+'manifest.json',JSON.stringify({id:'arena_creep_impacts',status:'prototype',phase:'1F',source:'assets/source/effects/arena_creep_impacts/arena_creep_impacts.aseprite',generatedSource:'assets/source/effects/arena_creep_impacts/generated_v1.png',generationPrompt:'assets/source/effects/arena_creep_impacts/generation_prompt_v1.json',originalGeneratedFilename:'exec-bce4861d-ba06-4996-b6e6-af1c736f9a9f.png',sourceHash:hash('assets/source/effects/arena_creep_impacts/generated_v1.png'),concepts:concepts.map(path=>({path,sha256:hash(path)})),canvas:[64,64],origin:[.5,.5],animations:ids.map(id=>({id,frames:Array.from({length:4},(_,i)=>id+'_'+i),frameRate:1000/75})),provenance:'Original AI-assisted contact VFX generated with approved concepts supplied directly; Aseprite grid extraction, alpha cleanup and nearest scaling. Existing confirmed hits only; no new mechanics, projectile, block or slam ability.'},null,2)+'\n');
console.log('Exported16 contact-effect frames and4 animation tags.');

