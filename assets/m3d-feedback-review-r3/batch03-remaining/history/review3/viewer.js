import {items,recipe} from './recipes.js';
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
const manifest=await fetch('./manifest.json').then(r=>r.json()),assets=new Map(),observations=[];
const url=p=>'/'+p;
async function image(p){const im=new Image();im.src=url(p);await im.decode();return im;}
await Promise.all(manifest.components.map(async c=>{const [im,atlas]=await Promise.all([image(c.sheet),fetch(url(c.atlas)).then(r=>r.json())]);assets.set(c.id,{...c,im,frames:atlas.frames,clips:new Map(c.animations.map(a=>[a.name,a]))});}));
const folder='assets/m3d-feedback-review-r3/batch03-remaining/';
const backgrounds=await Promise.all(['arena_ly_mac_sau','arena_hong_liet','arena_chu_ba_thong','arena_kim_luan'].map(id=>image(folder+'source/generated/'+id+'.png')));
const refs=await Promise.all(['reference_shaolin','reference_world','baseline_lms','baseline_hong_liet'].map(id=>image(folder+'support/references/'+id+'.png')));
let item=items[0],variant=0,facing='right',baseline=false,time=0,active=false,paused=false,hold=false,beat=0,chain=0,lastBeatEnd=0,cooldownEnd=0,castCount=0,reason='idle',scene=recipe(item.id,variant,facing),last=performance.now(),diagnostic=null,seen=new Set(),drawn=[],bodyFrame=null,phaseOrder=[];
for(const x of items)$('item').add(new Option(x.title,x.id));
function variantOptions(){ $('variant').replaceChildren(...item.variants.map((s,i)=>new Option(s,String(i))));$('variant').value=String(variant);$('note').textContent=item.note;}
variantOptions();
function clip(asset,tag){const c=assets.get(asset);if(!c)throw Error('Missing asset '+asset);const a=c.clips.get(tag);if(!a)throw Error('Missing selected tag '+asset+':'+tag);return[c,a];}
function frameAt(c,a,t,loop=true){let at=Math.max(0,t);const total=a.frameDurationsMs.reduce((s,n)=>s+n,0);if(loop)at%=total;else at=Math.min(at,total-1);let i=0;for(;i<a.frames.length-1&&at>=a.frameDurationsMs[i];i++)at-=a.frameDurationsMs[i];return a.frames[i];}
function at(e,t){let p=Math.max(0,Math.min(1,(t-(e.travelStart??e.start))/((e.travelEnd??e.end)-(e.travelStart??e.start)||1)));let x=e.from[0]+(e.to?.[0]-e.from[0]||0)*p,y=e.from[1]+(e.to?.[1]-e.from[1]||0)*p;if(e.orbit){const a=e.orbit.phase+(t-e.start)*.0025;x+=Math.cos(a)*e.orbit.radius;y+=Math.sin(a)*e.orbit.radius*.45;}if(e.airborne)y-=Math.sin(p*Math.PI)*23;return[x,y];}
function drawSprite(e,t,{preview=false,forceFrame=null}={}){
 const [c,a]=clip(e.asset,e.tag),name=forceFrame??frameAt(c,a,t-(e.start||0),e.loop??a.loop),f=c.frames[name].frame,p=e.pivot??c.pivot,point=preview?e.from:at(e,t),scale=e.scale??1;
 let alpha=e.alpha??1;if(e.fadeOut)alpha*=Math.min(1,Math.max(0,(e.end-t)/220));if(e.fadeIn)alpha*=Math.min(1,Math.max(0,(t-e.start)/160));
 ctx.save();ctx.translate(Math.round(point[0]),Math.round(point[1]));if(e.rotation)ctx.rotate(e.rotation);ctx.scale(scale,scale);ctx.globalAlpha=alpha;ctx.filter=e.brightness?`brightness(${e.brightness}) saturate(1.25)`:'none';
 if(e.openCenter){ctx.beginPath();ctx.rect(-300,-300,600,600);ctx.ellipse(0,-22,20,28,0,0,Math.PI*2,true);ctx.clip('evenodd');}
 const offset=e.usePlacement?a.placementOffsetFromFeet||[0,0]:[0,0];ctx.drawImage(c.im,f.x,f.y,f.w,f.h,Math.round(-p[0]+offset[0]),Math.round(-p[1]+offset[1]),f.w,f.h);ctx.restore();
 drawn.push({asset:e.asset,tag:e.tag,frame:name,at:point,role:e.role||'effect',layer:e.layer||'body',alpha,scale});
 if(e.role==='caster')bodyFrame=name;
 if(active&&!diagnostic){seen.add(e.asset+':'+name);const phase=e.asset+':'+e.tag;if(!phaseOrder.includes(phase))phaseOrder.push(phase);}
 return name;
}
function backdrop(index=0){ctx.fillStyle='#263133';ctx.fillRect(0,0,640,360);const im=backgrounds[index];ctx.globalAlpha=.73;ctx.drawImage(im,0,0,im.width,im.height,0,0,640,360);ctx.globalAlpha=1;}
function board(){ctx.fillStyle='#182124';ctx.fillRect(0,0,640,360);const names=['Lý Mạc Sầu · mới','Hồng Liệt · mới','Chu Bá Thông · giữ','Kim Luân · mới'];for(let i=0;i<4;i++){const x=12+i*157,y=135,w=145,h=130;ctx.drawImage(backgrounds[i],x,y,w,h);ctx.fillStyle='#edddb3';ctx.font='9px system-ui';ctx.fillText(names[i],x,125);ctx.strokeStyle='#eee4be';ctx.setLineDash([3,2]);ctx.strokeRect(x+12,y+21,w-24,h-35);ctx.setLineDash([]);ctx.strokeStyle='#bade97';ctx.strokeRect(x+24,y+31,(w-24)*.8,(h-35)*.8);}ctx.fillStyle='#e3ce98';ctx.font='11px system-ui';ctx.fillText('Footprint: rộng ×0.8, cao ×0.8 · cùng zoom · concept, chưa collision',55,290);}
function render(){
 drawn=[];bodyFrame=null;ctx.imageSmoothingEnabled=false;
 if(diagnostic){backdrop();drawSprite({...diagnostic,role:'diagnostic'},time,{forceFrame:diagnostic.frame});}
 else if(item.id==='arena_backgrounds')board();
 else{
  const bg=item.id.startsWith('hong')?1:['tuy_tien_bo','can_khon_phan_chan','am_duong_nghich_chuyen'].includes(item.id)?2:['hoac_do_darts','dat_nhi_ba','kim_luan_normal','kim_luan_truy_hon','ngu_luan_ho_the'].includes(item.id)?3:0;backdrop(bg);
  const enabled=active||reason==='scrub';const visible=enabled?scene.effects.filter(e=>time>=e.start&&time<e.end):[];
  const bodies=enabled?scene.actors.filter(e=>time>=e.start&&time<e.end):[];
  if($('vfx').checked)for(const e of visible.filter(e=>e.layer==='ground'||e.layer==='back'))drawSprite(e,time);
  if($('body').checked){const caster=bodies.filter(e=>e.role==='caster').at(-1);const rest=bodies.filter(e=>e.role!=='caster');if(caster)rest.push(caster);else if(scene.resting)rest.push({...scene.resting,start:0,end:scene.duration,to:scene.resting.from});for(const e of rest.sort((a,b)=>at(a,time)[1]-at(b,time)[1]))drawSprite(e,time);}
  if($('vfx').checked)for(const e of visible.filter(e=>!['ground','back'].includes(e.layer)))drawSprite(e,time);
  if(enabled){ctx.font='8px system-ui';ctx.fillStyle='#f6e6a6';for(const l of scene.labels)ctx.fillText(l.text,l.at[0],l.at[1]);}
  // Discrete entry impacts/status captions are presentation examples only.
  if(enabled&&item.id==='su_tu_hong'&&!baseline&&time>650&&time<1550){ctx.fillStyle='#e9d39c';ctx.font='9px system-ui';ctx.fillText('AoE · damage / giảm giáp / slow — contract, chưa gameplay',170,307);}
 }
 const activeEffects=drawn.filter(e=>e.role!=='caster'&&e.role!=='target'&&e.role!=='minion'&&e.role!=='ally'&&e.role!=='pull-target');
 $('status').textContent=`${item.title} | ${facing} | ${baseline?'BASELINE':'R3 CANDIDATE'} | ${Math.round(time)}ms / ${scene.duration}ms\n${bodyFrame||'—'} | layer ${activeEffects.length} | ${reason}${item.id==='thieu_lam_a'?` | nhịp ${beat+1}/4 · CD ${Math.max(0,Math.ceil((cooldownEnd-performance.now())/100)/10)}s`:''}`;
 $('scrub').max=String(scene.duration);$('scrub').value=String(time);
}
function stop(why='cancel'){if(active)observations.push({kind:'cast',item:item.id,variant,facing,baseline,beat,reason:why,frameOrder:[...seen],phaseOrder:[...phaseOrder],castCount});active=false;hold=false;diagnostic=null;reason=why;seen.clear();phaseOrder=[];time=0;render();observations.push({kind:'cleanup',reason:why,item:item.id,effects:0,remainingTravel:0});}
function rebuild(){scene=recipe(item.id,variant,facing,baseline,beat);}
function select(id,v=0){stop('selection-change');item=items.find(x=>x.id===id);if(!item)throw Error(id);variant=v;beat=0;chain=0;cooldownEnd=0;$('item').value=id;variantOptions();rebuild();render();}
function cast(){
 const now=performance.now();if(active)return false;
 if(item.id==='thieu_lam_a'){
  if(chain>0&&now-lastBeatEnd>2000){cooldownEnd=Math.max(cooldownEnd,lastBeatEnd+3000);chain=0;}
  if(now<cooldownEnd){reason='cooldown-fixture';render();return false;}beat=chain;chain=(chain+1)%4;
 }else beat=0;
 rebuild();time=0;active=true;paused=false;reason='playing';seen.clear();phaseOrder=[];castCount++;last=performance.now();render();return true;
}
function scrub(ms){active=false;hold=false;diagnostic=null;time=Math.max(0,Math.min(scene.duration-1,ms));reason='scrub';render();}
function tick(now){const dt=Math.min(80,now-last);last=now;if(active&&!paused&&!hold){time+=dt*Number($('speed').value);if(time>=scene.duration){lastBeatEnd=now;if(item.id==='thieu_lam_a'&&beat===3)cooldownEnd=now+1000;stop('complete');if($('loop').checked&&item.id!=='thieu_lam_a')cast();}else render();}requestAnimationFrame(tick);}
function details(){const selection=scene.used.map(({asset,tag})=>{const[c,a]=clip(asset,tag);return{asset,tag,frames:a.frames,pivot:c.pivot,canvas:c.canvas,facing:a.facing,phase:a.phase,loop:a.loop,frameDurationsMs:a.frameDurationsMs};});$('info-text').textContent=JSON.stringify({item:item.id,note:item.note,scope:'Candidate independent art viewer; no production Phaser/gameplay',timing:'All times, offsets, speed and unspecified multipliers are preview fixtures',limitation:'Kim/Hoac Do/Dat Nhi Ba action bodies retained DOWN only; four-direction idle available, projectile heading independently previewed',bodyHeight:'School bodies native44px; bosses56-60px; canvas640x360 at display2x',cleanup:'Cancel/death/zone/facing/selection/complete clears all transient layers; ground fixed, aura follows actor',selected:selection,recipe:scene},null,2);$('info').showModal();}
function gallery(){const names=['Lý Mạc Sầu · mới','Hoàn Nhan Hồng Liệt · mới','Chu Bá Thông · giữ nguyên','Kim Luân Pháp Vương · mới','Identity Thiếu Lâm · reference','World · reference','Lý Mạc Sầu · baseline','Hồng Liệt · baseline'];$('grid').replaceChildren(...[...backgrounds,...refs].map((im,i)=>{const f=document.createElement('figure'),pic=im.cloneNode(),c=document.createElement('figcaption');c.textContent=names[i];f.append(pic,c);return f;}));$('boards').showModal();}
function key(e){if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName)&&e.code!=='Escape')return;if($('boards').open||$('info').open)return;if(e.repeat)return;if(e.code==='KeyA'){e.preventDefault();cast();}else if(e.code==='Space'){e.preventDefault();paused=!paused;}else if(e.code==='Escape')stop('cancel');else if(e.code.startsWith('Arrow')){e.preventDefault();const d={ArrowRight:'right',ArrowLeft:'left',ArrowUp:'up',ArrowDown:'down'}[e.code];stop('facing-change');facing=d;$('facing').value=d;rebuild();render();}}
window.addEventListener('keydown',key);$('item').onchange=()=>select($('item').value);$('variant').onchange=()=>select(item.id,Number($('variant').value));$('facing').onchange=()=>{stop('facing-change');facing=$('facing').value;rebuild();render();};$('baseline').onchange=()=>{stop('baseline-change');baseline=$('baseline').checked;rebuild();render();};$('cast').onclick=()=>{cast();$('cast').blur();};$('pause').onclick=()=>{paused=!paused;};$('prev').onclick=()=>scrub(time-110);$('next').onclick=()=>scrub(time+110);$('scrub').oninput=()=>scrub(Number($('scrub').value));$('body').onchange=render;$('vfx').onchange=render;$('hold').onclick=()=>{if(active){hold=true;reason='hold-presentation';render();}};$('release').onclick=()=>{hold=false;reason=active?'playing':'release-idle';};for(const id of ['cancel','death','zone'])$(id).onclick=()=>stop(id);$('gallery').onclick=gallery;$('details').onclick=details;$('close-board').onclick=()=>$('boards').close();$('close-info').onclick=()=>$('info').close();
function snapshot(){return{item:item.id,variant,facing,baseline,beat,chain,castCount,time,duration:scene.duration,active,paused,hold,reason,bodyFrame,effects:drawn.filter(x=>x.role==='effect'||['target-impact','entry-impact','blade-lane','wheel','airborne-palm','minion-shot','poison-dart','telegraph'].includes(x.role)).length,drawn:structuredClone(drawn),selected:scene.used,phaseOrder:[...phaseOrder],cooldownRemaining:Math.max(0,cooldownEnd-performance.now())};}
window.reviewApi={items,manifest,observations,assets:[...assets.values()].map(({im,frames,clips,...c})=>c),select,play:cast,scrub,stop,snapshot,recipe,
 setFacing(d){stop('facing-change');facing=d;$('facing').value=d;rebuild();render();},compare(v){stop('baseline-change');baseline=v;$('baseline').checked=v;rebuild();render();},speed(v){$('speed').value=String(v);},nativePng:()=>canvas.toDataURL('image/png'),gallery,details,
 async playClip(asset,tag,cycles=1){stop('diagnostic');const[c,a]=clip(asset,tag),order=[];for(let n=0;n<cycles;n++)for(const frame of a.frames){await new Promise(requestAnimationFrame);diagnostic={asset,tag,frame,from:[320,240],to:[320,240],start:0,end:1e9};render();order.push(frame);}diagnostic=null;render();return{asset,tag,frameOrder:order,cycles,method:'one actual requestAnimationFrame paint per selected cel'};},
 showFrame(asset,tag,index=0){const[c,a]=clip(asset,tag);diagnostic={asset,tag,frame:a.frames[index],from:[320,240],to:[320,240],start:0,end:1e9};render();},
 selectedRefs(){const refs=new Map();for(const it of items)for(let v=0;v<it.variants.length;v++)for(const d of ['right','down','left','up'])for(let b=0;b<(it.id==='thieu_lam_a'?4:1);b++)for(const x of recipe(it.id,v,d,false,b).used)refs.set(x.asset+':'+x.tag,x);return[...refs.values()];},
 validateRecipes(){let count=0;for(const it of items)for(let v=0;v<it.variants.length;v++)for(const d of ['right','down','left','up'])for(const base of [false,true])for(let b=0;b<(it.id==='thieu_lam_a'?4:1);b++){const r=recipe(it.id,v,d,base,b);for(const x of r.used)clip(x.asset,x.tag);count++;}return{recipes:count,items:items.length};}
};
window.reviewApi.validateRecipes();render();requestAnimationFrame(tick);window.reviewReady=true;
