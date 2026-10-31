import {spawnSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
const p=spawnSync(process.env.ASEPRITE_PATH??'C:/Program Files/Aseprite/Aseprite.exe',['-b','--script-param','root='+root.replaceAll('\\','/'),'--script','assets/source/skills/thien-son/make_overview_v01.lua'],{cwd:root,windowsHide:true,encoding:'utf8'});
if(p.error)throw p.error;if(p.status!==0)throw Error(p.stdout+'\n'+p.stderr);
writeFileSync(resolve(root,'assets/reviews/skills/thien-son/overview_provenance_v01.json'),JSON.stringify({scope:'Contact sheet of actual Phaser PNG screenshots; not one game scene or an animation recording',rescaling:false,normalCameraZoom:1,displayZoom:2,icons:{source:'lien_hoa_phien_combined_v01.png',crop:[166,628,948,82],cssSize:64},skills:{sourcePattern:'{skill_id}_combined_v01.png',artCrop:[460,280,360,220],captionCrop:[12,598,360,24]},output:'assets/reviews/skills/thien-son/skill_preview_overview_v01.png'},null,2)+'\n');
console.log('PASS: native-scale contact overview composed from actual Phaser PNGs');

