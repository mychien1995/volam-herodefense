import {CATALOG,DIRS,VECTOR,buildPlan,frameAt,clamp} from './performance-plans.js';

const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
const assets=new Map(),errors=[],runs=[],seen=new Set();
let plan,time=0,playing=false,last=performance.now(),light=false,beat=0,plays=0,resolveRun;
let snapshot={},runStarted=0,triggerCount=0;
const local=p=>p.replace(/^assets\/m3d-feedback-visual\//,'');
const duration=a=>a.frameDurationsMs.reduce((x,y)=>x+y,0);
const get=(id,name)=>{const c=assets.get(id),a=c?.animations.find(a=>a.name===name);if(!a)throw Error('Missing '+id+'/'+name);return {c,a};};

function actorShift(t) {
  if(plan.actorBlink&&t>=plan.actorBlink.arrival)return VECTOR[plan.dir].map(v=>v*plan.actorBlink.distance);
  if(plan.id==='dash')return VECTOR[plan.dir].map(v=>v*60*clamp((t-300)/240,0,1));
  if(plan.id==='cb_burn'&&$('move').checked&&t>1000)return [Math.sin((t-1000)/500)*35,Math.sin((t-1000)/730)*6];
  return [0,0];
}
function actorOpacity(t) {
  const b=plan.actorBlink;if(!b)return 1;
  if(t>=b.departure&&t<b.vanishAt)return 1-(t-b.departure)/(b.vanishAt-b.departure);
  if(t>=b.vanishAt&&t<b.arrival)return 0;
  if(t>=b.arrival&&t<b.fadeInEnd)return (t-b.arrival)/(b.fadeInEnd-b.arrival);
  return 1;
}
function position(track,t) {
  const {a}=get(track.id,track.tag),fixed=track.motion==='projectile'||track.position!==undefined;
  const pos=actorShift(fixed?(track.travelStart??300):t);
  const dist=track.motion==='projectile'?track.distance*clamp((t-track.travelStart)/(track.travelEnd-track.travelStart),0,1):(track.position??0);
  const off=track.layer==='actor'?[0,0]:(track.offset??a.placementOffsetFromFeet??[0,0]);
  return [pos[0]+VECTOR[plan.dir][0]*dist+off[0],pos[1]+VECTOR[plan.dir][1]*dist+off[1]];
}
function camera() {
  const scale=Number($('zoom').value),boxes=[];
  const include=(id,tag,pos,from=0)=>{
    const {c,a}=get(id,tag);
    for(const n of a.frames.slice(from)){
      const b=c.bounds[n];if(!b)throw Error('Missing alpha bounds '+id+'/'+n);
      boxes.push([b[0]-c.pivot[0]+pos[0],b[1]-c.pivot[1]+pos[1],b[2]-c.pivot[0]+pos[0],b[3]-c.pivot[1]+pos[1]]);
    }
  };
  include(plan.actor,'idle_'+plan.dir,[0,0]);
  include(plan.actor,'idle_'+plan.dir,actorShift(plan.length));
  for(const track of plan.tracks){include(track.id,track.tag,position(track,track.start),track.fromFrame??0);include(track.id,track.tag,position(track,track.end),track.fromFrame??0);}
  if($('targets').checked&&plan.id!=='bamboo')for(const p of targetPositions())include('m3d_truc_lam_kiem_khach_character','idle_'+opposite(plan.dir),p);
  const pad=plan.id==='cb_burn'&&$('move').checked?40:5;
  const bounds=[Math.min(...boxes.map(b=>b[0]))-pad,Math.min(...boxes.map(b=>b[1]))-6,Math.max(...boxes.map(b=>b[2]))+pad,Math.max(...boxes.map(b=>b[3]))+6];
  return {scale,x:480-(bounds[0]+bounds[2])*scale/2,y:268-(bounds[1]+bounds[3])*scale/2,bounds};
}
function opposite(d){return {right:'left',left:'right',up:'down',down:'up'}[d];}
function targetPositions(){const v=VECTOR[plan.dir],cross=[-v[1],v[0]],r=plan.id==='wd_nhan_kiem'?95:Math.min(95,plan.reach);return [r,r+65].map((n,i)=>[v[0]*n+cross[0]*(i?-13:13),v[1]*n+cross[1]*(i?-13:13)]);}

function draw(id,tag,index,pos,cam,layer,opacity=1) {
  const {c,a}=get(id,tag),name=a.frames[index],r=c.atlas.frames[name].frame;
  const x=Math.round(cam.x+(pos[0]-c.pivot[0])*cam.scale),y=Math.round(cam.y+(pos[1]-c.pivot[1])*cam.scale);
  const oldAlpha=ctx.globalAlpha;ctx.globalAlpha*=opacity;
  ctx.drawImage(c.image,r.x,r.y,r.w,r.h,x,y,r.w*cam.scale,r.h*cam.scale);ctx.globalAlpha=oldAlpha;
  const b=c.bounds[name],paint=[cam.x+(pos[0]+b[0]-c.pivot[0])*cam.scale,cam.y+(pos[1]+b[1]-c.pivot[1])*cam.scale,cam.x+(pos[0]+b[2]-c.pivot[0])*cam.scale,cam.y+(pos[1]+b[3]-c.pivot[1])*cam.scale];
  seen.add(id+'/'+tag+'/'+index);
  return {id,tag,frame:index,name,world:pos,pivot:c.pivot,layer,paint,opacity};
}
function render() {
  if(!plan)return;
  const cam=camera();ctx.imageSmoothingEnabled=false;ctx.fillStyle=light?'#c1c5b1':'#263b30';ctx.fillRect(0,0,960,540);
  const active=plan.tracks.filter(tr=>time>=tr.start&&time<tr.end),effects=[];
  const effect=tr=>{const {a}=get(tr.id,tr.tag),alpha=tr.fadeOutMs?clamp((tr.end-time)/tr.fadeOutMs,0,1):1;return draw(tr.id,tr.tag,frameAt(a,(time-tr.start)*(tr.playbackRate??1),tr),position(tr,time),cam,tr.layer,alpha);};
  for(const tr of active.filter(t=>t.layer==='ground'))effects.push(effect(tr));
  const actorTrack=active.findLast(t=>t.layer==='actor');
  const actors=[];
  if($('targets').checked&&plan.id!=='bamboo'){
    for(const pos of targetPositions()){const id='m3d_truc_lam_kiem_khach_character',tag='idle_'+opposite(plan.dir),{a}=get(id,tag);actors.push({id,tag,index:frameAt(a,time,{repeat:true}),pos,target:true});}
  }
  if(actorTrack){const {a}=get(actorTrack.id,actorTrack.tag);actors.push({id:actorTrack.id,tag:actorTrack.tag,index:frameAt(a,(time-actorTrack.start)*(actorTrack.playbackRate??1),actorTrack),pos:position(actorTrack,time),target:false});}
  else{const tag='idle_'+plan.dir,{a}=get(plan.actor,tag);actors.push({id:plan.actor,tag,index:frameAt(a,time,{repeat:true}),pos:actorShift(time),target:false});}
  actors.sort((a,b)=>a.pos[1]-b.pos[1]);let actor;
  for(const item of actors){const drawn=draw(item.id,item.tag,item.index,item.pos,cam,'actor',item.target?1:actorOpacity(time));if(!item.target)actor=drawn;}
  for(const tr of active.filter(t=>t.layer!=='ground'&&t.layer!=='actor'))effects.push(effect(tr));
  const phase=plan.phases.findLast(p=>p.at<=time)?.name??'Thế đứng';
  $('caption').replaceChildren();const title=document.createElement('strong'),sub=document.createElement('span');title.textContent=plan.caption;sub.textContent=phase+' · '+plan.credit;$('caption').append(title,sub);
  $('clock').textContent=(time/1000).toFixed(2)+' / '+(plan.length/1000).toFixed(2)+'s';$('timeline').value=String(time);$('pause').textContent=playing?'Dừng · Space':'Tiếp · Space';
  snapshot={mode:plan.id,dir:plan.dir,beat:plan.beat,time,playing,phase,actor,effects,camera:cam,triggerCount};
}
function select(id,d='right',step=0,autoplay=true) {
  if(resolveRun){resolveRun({cancelled:true});resolveRun=null;}
  beat=step;plays=0;plan=buildPlan(assets,id,d,beat);time=0;
  const entry=CATALOG.find(x=>x[0]===id);$('school').value=entry[1];fillAbilities();$('ability').value=id;$('direction').value=d;
  $('timeline').max=String(plan.length);$('move').disabled=id!=='cb_burn';$('move').closest('label').style.opacity=id==='cb_burn'?'1':'.45';
  playing=autoplay;last=performance.now();seen.clear();runStarted=performance.now();if(autoplay)plays=1;render();
  return plan;
}
function begin(next=false) {
  if(next&&plays>0&&['sl_a','wd_a'].includes(plan.id))beat++;
  if(resolveRun){resolveRun({cancelled:true});resolveRun=null;}
  plan=buildPlan(assets,plan.id,plan.dir,beat);$('timeline').max=String(plan.length);time=0;playing=true;last=performance.now();runStarted=last;seen.clear();plays++;render();
  return new Promise(resolve=>resolveRun=resolve);
}
function trigger(){triggerCount++;return begin(true);}
function fillAbilities() {
  $('ability').replaceChildren();for(const row of CATALOG.filter(x=>x[1]===$('school').value))$('ability').add(new Option(row[2],row[0]));
}
function tick(now) {
  if(playing&&plan){
    time+=Math.min(now-last,100)*Number($('speed').value);
    if(time>=plan.length){
      time=plan.length;playing=false;const result={mode:plan.id,dir:plan.dir,beat:plan.beat,observedMs:now-runStarted,seen:[...seen],completed:true};runs.push(result);
      if(resolveRun){resolveRun(result);resolveRun=null;}
      if($('repeat').checked){if(['sl_a','wd_a'].includes(plan.id))beat++;plan=buildPlan(assets,plan.id,plan.dir,beat);time=0;playing=true;seen.clear();runStarted=now;}
    }
  }
  last=now;render();requestAnimationFrame(tick);
}

try {
  const [manifest,support,validation]=await Promise.all([fetch('manifest.json').then(r=>r.json()),fetch('previews/support/manifest.json').then(r=>r.json()),fetch('previews/validation.json').then(r=>r.json())]);
  for(const entry of [...manifest.components,...support.components]){
    const c={...entry,animations:entry.animations.map(a=>({...a,frameDurationsMs:a.frameDurationsMs??a.frames.map(()=>1000/a.frameRate)}))};
    c.bounds??=validation.components.find(x=>x.id===c.id)?.frameBounds;
    c.atlas=await fetch(local(c.atlas)).then(r=>r.json());c.image=new Image();c.image.src=local(c.sheet);await c.image.decode();
    for(const a of c.animations)if(!a.frames.length||a.frameDurationsMs.some(ms=>!Number.isFinite(ms)||ms<=0))throw Error('Bad animation '+c.id+'/'+a.name);
    assets.set(c.id,c);
  }
  for(const school of new Set(CATALOG.map(x=>x[1])))$('school').add(new Option(school,school));fillAbilities();
  // Validate every preset/facing against actual retained/exported named frames before enabling the viewer.
  for(const [id] of CATALOG)for(const d of DIRS){const p=buildPlan(assets,id,d);for(const tr of p.tracks)get(tr.id,tr.tag);get(p.actor,'idle_'+d);}
  $('school').onchange=()=>{fillAbilities();select($('ability').value,$('direction').value);};
  $('ability').onchange=()=>select($('ability').value,$('direction').value);
  $('direction').onchange=()=>select(plan.id,$('direction').value);
  $('play').onclick=trigger;$('pause').onclick=()=>{playing=!playing;last=performance.now();render();};
  $('background').onclick=()=>{light=!light;render();};$('hide').onclick=()=>document.body.classList.toggle('hidden-tools');
  $('timeline').oninput=()=>{playing=false;time=Number($('timeline').value);render();};
  for(const id of ['zoom','targets','move'])$(id).onchange=render;
  window.addEventListener('keydown',e=>{
    if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
    if(e.code==='KeyA'){e.preventDefault();trigger();}
    else if(e.code==='Space'){e.preventDefault();playing=!playing;last=performance.now();}
    else if(e.code==='KeyH')document.body.classList.toggle('hidden-tools');
    else if(e.code.startsWith('Arrow')){e.preventDefault();select(plan.id,e.code.slice(5).toLowerCase());}
  });
  window.performanceReview={catalog:CATALOG,dirs:DIRS,assets:[...assets.keys()],errors,runs,select,
    play:()=>begin(false),trigger,get snapshot(){return snapshot;},get plan(){return plan;},
    seek(t){playing=false;time=clamp(t,0,plan.length);render();return snapshot;},
    options(values){for(const [key,value] of Object.entries(values)){if(key==='light')light=value;else if($(key).type==='checkbox')$(key).checked=value;else $(key).value=String(value);}render();},
    png:()=>canvas.toDataURL('image/png')};
  select('sl_a','right',0,true);window.performanceReady=true;requestAnimationFrame(tick);
}catch(error){errors.push(String(error));$('error').hidden=false;$('error').textContent='Không tải được preview:\n'+error.message;console.error(error);}
