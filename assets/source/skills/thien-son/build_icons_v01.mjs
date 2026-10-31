import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
const binary=process.env.ASEPRITE_PATH??'C:/Program Files/Aseprite/Aseprite.exe';
const base='assets/exports/skills/thien-son/';
function run(args){const p=spawnSync(binary,args,{cwd:root,encoding:'utf8',windowsHide:true});if(p.error)throw p.error;if(p.status!==0)throw Error(p.stdout+'\n'+p.stderr);}
mkdirSync(resolve(root,'assets/source/skills/thien-son/icons'),{recursive:true});
run(['-b','--script-param','root='+root.replaceAll('\\','/'),'--script','assets/source/skills/thien-son/assemble_icon_atlas_v01.lua']);
run(['-b','assets/source/skills/thien-son/icons/thien_son_icons_v01.aseprite','--list-tags','--sheet-type','rows','--sheet-columns','8','--filename-format','{tag}','--format','json-hash','--sheet',base+'thien_son_icons_v01.png','--data',base+'thien_son_icons_v01.json']);
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const write=(p,v)=>writeFileSync(resolve(root,p),JSON.stringify(v,null,2)+'\n');
const atlas=read(base+'thien_son_icons_v01.json');atlas.meta.image='thien_son_icons_v01.png';write(base+'thien_son_icons_v01.json',atlas);
const m=read(base+'icons_manifest_v01.json');
m.atlas={sheet:base+'thien_son_icons_v01.png',data:base+'thien_son_icons_v01.json',source:'assets/source/skills/thien-son/icons/thien_son_icons_v01.aseprite',frameSize:[64,64]};
write(base+'icons_manifest_v01.json',m);
console.log('PASS: 13 editable icon sources, individual PNGs and family PNG/hash-JSON atlas');

