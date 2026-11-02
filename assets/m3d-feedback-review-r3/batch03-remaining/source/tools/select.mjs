import {readFile,writeFile,access} from 'node:fs/promises';
import {items,recipe,arenaReview} from '../../recipes.js';
const base=new URL('../../',import.meta.url),manifest=JSON.parse(await readFile(new URL('manifest.json',base),'utf8'));
if(await access(new URL('approved_review6.lock.json',base)).then(()=>true,()=>false))throw Error('Review6 is approved and locked. Create a new revision; do not rewrite selected tags.');
const assets=new Map(manifest.components.map(c=>[c.id,c]));const selected=new Map(),scenes=[];
for(const item of items)for(let variant=0;variant<item.variants.length;variant++)for(const d of ['right','down','left','up'])for(let beat=0;beat<(item.id==='thieu_lam_a'?4:1);beat++){
 const scene=recipe(item.id,variant,d,false,beat);const entries=[];
 for(const {asset,tag} of scene.used){const c=assets.get(asset),a=c?.animations.find(a=>a.name===tag);if(!a)throw Error('Missing '+asset+':'+tag);if(!selected.has(asset))selected.set(asset,new Set());selected.get(asset).add(tag);entries.push({asset,tag,frames:a.frames,frameDurationsMs:a.frameDurationsMs,pivot:c.pivot,canvas:c.canvas,facing:a.facing,phase:a.phase,loop:a.loop});}
 scenes.push({id:item.id,title:item.title,variant: item.variants[variant],facing:d,beat,previewDurationMs:scene.duration,selected:entries,actors:scene.actors,effects:scene.effects});
}
manifest.availableTags=Object.fromEntries(manifest.components.map(c=>[c.id,c.animations.map(a=>a.name)]));
manifest.selectedTags=Object.fromEntries([...selected].map(([id,tags])=>[id,[...tags]]));
manifest.selectedScope='Only non-baseline recipe tags; historical/full support containers are not blanket selected';
manifest.revision='r3-batch03-review6-dart-axis-ground-only';
manifest.arena=arenaReview;
manifest.withdrawn=['phat_tran_cong'];
manifest.history='history/review5/';
manifest.renderCorrections='source/review6-render-corrections.json';
if(manifest.selectedTags.lms_purple)throw Error('Withdrawn Phat Tran art selected');
if(manifest.selectedTags.cbt_am_duong_nghich_chuyen?.includes('large_formation'))throw Error('Forbidden large YinYang');
if(manifest.selectedTags.cbt_am_duong_nghich_chuyen?.includes('rotating_waves'))throw Error('Forbidden flickering YinYang waves');
await writeFile(new URL('manifest.json',base),JSON.stringify(manifest,null,2)+'\n');
await writeFile(new URL('selected-tags.json',base),JSON.stringify({status:'candidate-awaiting-director-review',timingAuthority:'Presentation only; server states/events required after approval',scenes},null,2)+'\n');
console.log(JSON.stringify({items:items.length,scenes:scenes.length,selectedComponents:selected.size,selectedTags:[...selected.values()].reduce((s,v)=>s+v.size,0)}));
