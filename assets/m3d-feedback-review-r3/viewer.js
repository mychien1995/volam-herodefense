const $ = (id) => document.getElementById(id);
const canvas = $('stage'), ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const repo = new URL('../../', location.href);
const json = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); };
const loadImage = (url) => new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => reject(new Error(`Image ${url}`)); im.src = url; });
const manifest = await json('manifest.json');
const assets = await Promise.all(manifest.components.map(async (c) => ({ ...c, data: await json(new URL(c.atlas, repo)), image: await loadImage(new URL(c.sheet, repo)) })));
const [body, ground, stun] = assets;
const retainedPath = 'assets/m3d-feedback-visual/previews/support/';
const baseline = { image: await loadImage(new URL(retainedPath + 'hero_thieu_lam.png', repo)), data: await json(new URL(retainedPath + 'hero_thieu_lam.json', repo)), pivot: [40, 64] };
let facing = 'right', time = 0, active = false, paused = false, dead = false, compare = false, last = performance.now(), speed = 1, starts = 0, serial = 0, effectCount = 0, clip = null;
const observations = [], paths = [], seen = new Set();
const total = 1900;
function origin() { return facing === 'right' ? [160,205] : facing === 'left' ? [480,205] : facing === 'down' ? [320,100] : [320,270]; }
function vector() { return ({right:[1,0],left:[-1,0],down:[0,1],up:[0,-1]})[facing]; }
function length() { return facing === 'left' || facing === 'right' ? 260 : 155; }
function drawFrame(c, name, x, y, bucket) {
  const f = c.data.frames[name]?.frame;
  if (!f) throw new Error(`Missing ${c.id}/${name}`);
  ctx.drawImage(c.image, f.x,f.y,f.w,f.h,Math.round(x-c.pivot[0]),Math.round(y-c.pivot[1]),f.w,f.h);
  if (bucket) bucket.push(name);
  seen.add(c.id + '/' + name);
}
function phase(c, tag, x, y, ms = 0) {
  const a = c.animations.find((a) => a.name === tag);
  const elapsed = a.loop ? ms % a.durationMsTotal : Math.min(ms, a.durationMsTotal - 0.001);
  let sum = 0, i = 0;
  for (; i < a.frames.length - 1; i++) { sum += a.frameDurationsMs[i]; if (elapsed < sum) break; }
  drawFrame(c, a.frames[i], x, y);
  return a.frames[i];
}
function label(text,x,y,color='#c9d4c9') { ctx.fillStyle=color;ctx.font='9px system-ui';ctx.textAlign='center';ctx.fillText(text,x,y); }
function finish(reason) {
  const o = {kind:'composite',serial,facing,reason,frames:[...seen],path:paths.splice(0),casterFeet:origin(),statsAuthority:'presentation fixture only'};
  observations.push(o); seen.clear();
}
function cancel(reason='cancel') {
  if (active) finish(reason);
  if (clip) { clip.resolve({cancelled:reason}); clip = null; }
  active=false;paused=false;time=0;effectCount=0;serial++;dead=reason==='death';
  $('scrub').value='0';
}
function play() { cancel('restart'); dead=false;time=0;active=true;starts++; }
function setFacing(dir) { cancel('facing-change');facing=dir;$('facing').value=dir; }
function draw() {
  effectCount=0;
  ctx.fillStyle='#273832';ctx.fillRect(0,0,640,360);
  if (clip) {
    const {asset,a,elapsed,order} = clip;
    const name=phase(asset,a.name,320,205,elapsed);
    if(order.at(-1)!==name)order.push(name);
    label(`${asset.id} / ${a.name}`,320,260);
    return;
  }
  const [cx,cy]=origin(), [vx,vy]=vector(), dist=length(), tx=cx+vx*dist, ty=cy+vy*dist;
  label('Ca Diệp Thoái · key-pose draft',cx,cy+19);
  label('Mục tiêu minh họa',tx,ty+19);
  if (compare) { drawFrame(baseline,'idle_'+facing+'_0',85,155);label('R2 giữ nguyên · 44px',85,177); }
  drawFrame(baseline,'idle_'+({right:'left',left:'right',down:'up',up:'down'})[facing]+'_0',tx,ty);
  let state='idle', effect;
  if (active || paused) {
    state=time<180?'anticipation':time<360?'raise':time<540?'contact':'recovery';
    if(time>=360 && time<470) effect={phase:'birth',x:cx+vx*12,y:cy+vy*12};
    else if(time>=470 && time<1270){const f=(time-470)/800;effect={phase:'travel',x:cx+vx*(12+(dist-12)*f),y:cy+vy*(12+(dist-12)*f)};}
    else if(time>=1270 && time<1450)effect={phase:'impact',x:tx,y:ty};
    else if(time>=1450 && time<1600)effect={phase:'outro',x:tx,y:ty};
  }
  const drawGround=()=>{if(effect){phase(ground,effect.phase+'_'+facing,effect.x,effect.y,Math.max(0,time-470));effectCount++;if(active)paths.push({phase:effect.phase,x:effect.x,y:effect.y,t:Math.round(time),caster:[cx,cy]});}};
  if (facing==='up') drawGround();
  if(!dead) { if(state==='idle')drawFrame(baseline,'idle_'+facing+'_0',cx,cy);else phase(body,state+'_'+facing,cx,cy); }
  if(facing!=='up')drawGround();
  if((active||paused)&&time>=1270&&time<1780) { phase(stun,'stun_loop',tx,ty-52,time-1270);effectCount++;label('STUN · fixture',tx,ty-65,'#f1d776'); }
  $('status').textContent=`${facing} · ${state} · ${Math.round(time)} ms · ${effectCount} FX\nStats pending · A một cast · không auto hit từ frame`;
}
function raf(now) {
  const dt=now-last;last=now;
  if(clip&&!paused){clip.elapsed+=dt*speed;if(clip.elapsed>=clip.a.durationMsTotal*clip.cycles){const done=clip;clip=null;const report={id:done.asset.id,tag:done.a.name,frameOrder:done.order,cycles:done.cycles,elapsedMs:done.elapsed,scale:1};observations.push(report);done.resolve(report);}}
  if(active&&!paused){time+=dt*speed;$('scrub').value=String(Math.min(time,total));if(time>=total){finish('complete');active=false;time=0;if($('loop').checked)play();}}
  draw();requestAnimationFrame(raf);
}
$('play').onclick=play;$('cancel').onclick=()=>cancel();$('pause').onclick=()=>{paused=!paused;};
$('death').onclick=()=>cancel('death');$('travel').onclick=()=>cancel('travel');
$('facing').onchange=(e)=>setFacing(e.target.value);$('speed').onchange=(e)=>speed=Number(e.target.value);
$('scrub').oninput=(e)=>{active=false;paused=true;dead=false;time=Number(e.target.value);};
$('compare').onclick=()=>compare=!compare;
$('boards').onclick=()=>{$('board-image').src='source/generated/ca_diep_body_keyposes_v01.png';$('board').show();};
$('close').onclick=()=>$('board').close();
for(const b of document.querySelectorAll('[data-board]'))b.onclick=()=>{$('board-image').src=`source/generated/ca_diep_${b.dataset.board}_keyposes_v01.png`;};
document.addEventListener('keydown',(e)=>{
  if(e.target.closest('input,select,textarea'))return;
  if(e.code==='Escape'){$('board').close();return;}
  if($('board').open)return;
  if(['KeyA','KeyC','Space','ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
  if(e.repeat)return;
  if(e.code==='KeyA')play();else if(e.code==='KeyC')cancel();else if(e.code==='Space')paused=!paused;
  else if(e.code.startsWith('Arrow'))setFacing(e.code.slice(5).toLowerCase());
});
window.reviewApi={assets:manifest.components,observations,play,cancel,setFacing,
  snapshot:()=>({facing,time,active,paused,starts,effectCount,dead,scale:1,serial}),
  scrub:(t)=>{cancel('scrub');paused=true;dead=false;time=t;$('scrub').value=String(t);},
  compare:(value)=>compare=value,
  playClip:(id,tag,cycles=1)=>{cancel('clip-change');const asset=assets.find(a=>a.id===id),a=asset.animations.find(a=>a.name===tag);return new Promise(resolve=>clip={asset,a,cycles,elapsed:0,order:[],resolve});},
  nativePng:()=>canvas.toDataURL('image/png')};
window.reviewReady=true;
requestAnimationFrame(raf);
