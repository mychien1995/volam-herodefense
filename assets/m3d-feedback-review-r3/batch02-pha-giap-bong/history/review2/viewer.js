const $=id=>document.getElementById(id),canvas=$('stage'),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
const root=new URL('../../../',location.href),get=async url=>{const r=await fetch(url);if(!r.ok)throw Error(String(url));return r.json();};
const image=url=>new Promise((r,j)=>{const im=new Image();im.onload=()=>r(im);im.onerror=j;im.src=url;});
const manifest=await get('manifest.json');
const assets=await Promise.all(manifest.components.map(async c=>({...c,data:await get(new URL(c.atlas,root)),image:await image(new URL(c.sheet,root))})));
const [body,vfx]=assets,baseline=await image(new URL('previews/support/hero_cai_bang_idle.png',location.href));
let facing='right',active=false,paused=false,dead=false,time=0,last=performance.now(),speed=1,starts=0,effects=0,compare=false,clip=null,activeBodyFrame=null,groundRender=null;
const observations=[],seen=new Set(),poses=[],placements=[];
const origin=()=>[320,210],total=1420;
function frame(c,name,x,y){const f=c.data.frames[name].frame;ctx.drawImage(c.image,f.x,f.y,f.w,f.h,Math.round(x-c.pivot[0]),Math.round(y-c.pivot[1]),f.w,f.h);seen.add(c.id+'/'+name);}
function sample(c,tag,t=0){const a=c.animations.find(a=>a.name===tag);let ms=a.loop?t%a.durationMsTotal:Math.min(t,a.durationMsTotal-.001),sum=0,index=0;for(;index<a.frames.length-1;index++){sum+=a.frameDurationsMs[index];if(ms<sum)break;}return{a,name:a.frames[index]};}
function phase(c,tag,x,y,t=0){const s=sample(c,tag,t),offset=s.a.placementOffsetFromFeet;frame(c,s.name,x+offset[0],y+offset[1]);return{name:s.name,x:x+offset[0],y:y+offset[1],offset};}
function text(s,x,y,color='#c9d2c1'){ctx.fillStyle=color;ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText(s,x,y);}
function complete(reason){observations.push({kind:'composite',facing,reason,frames:[...seen],phaseOrder:[...poses],placements:placements.splice(0),casterFeet:origin()});seen.clear();poses.length=0;}
function cancel(reason='cancel'){if(active)complete(reason);if(clip){clip.resolve({cancelled:reason});clip=null;}active=false;paused=false;time=0;effects=0;dead=reason==='death';$('scrub').value='0';}
function play(){cancel('restart');seen.clear();poses.length=0;placements.length=0;dead=false;active=true;starts++;}
function setFacing(d){cancel('facing-change');facing=d;$('facing').value=d;}
function render(){
  ctx.fillStyle='#293831';ctx.fillRect(0,0,640,360);effects=0;activeBodyFrame=null;groundRender=null;
  if(clip){const s=sample(clip.asset,clip.a.name,clip.elapsed);frame(clip.asset,s.name,320,210);const key=Math.floor(clip.elapsed/clip.a.durationMsTotal)+'/'+s.name;if(key!==clip.lastKey){clip.order.push(s.name);clip.lastKey=key;}text(clip.asset.id+' / '+clip.a.name,320,285);return;}
  const [x,y]=origin();if(compare){ctx.drawImage(baseline,65-40,155-64);text('R2 · giữ nguyên',65,178);}
  let pose='idle';if(active||paused)pose=time<320?'spin':time<620?'raise':time<920?'elongate':time<1140?'strike':'recovery';
  const fx=(active||paused)?time<320?'spin':time<620?null:time<920?'charge':time<1140?'impact':'outro':null;
  if(fx&&(fx==='impact'||fx==='outro')){groundRender=phase(vfx,fx+'_'+facing,x,y,time);effects++;if(active)placements.push({phase:fx,x:groundRender.x,y:groundRender.y,feet:[x,y],offset:groundRender.offset});}
  if(!dead){if(pose==='idle')ctx.drawImage(baseline,x-40,y-64);else{activeBodyFrame=phase(body,pose+'_'+facing,x,y,time).name;if(active&&poses.at(-1)!==pose)poses.push(pose);}}
  if(fx&&(fx==='spin'||fx==='charge')){phase(vfx,fx+'_'+facing,x,y,time);effects++;}
  text('Phá Giáp Bổng · '+facing,x,y+25);$('status').textContent=`${pose} · ${Math.round(time)}ms · ${effects}FX · range/damage/cooldown không lấy từ preview`;
}
function raf(now){const dt=now-last;last=now;
  if(clip&&!paused){clip.elapsed+=dt*speed;if(clip.elapsed>=clip.a.durationMsTotal*clip.cycles){const c=clip;clip=null;const r={id:c.asset.id,tag:c.a.name,frameOrder:c.order,cycles:c.cycles,scale:1};observations.push(r);c.resolve(r);}}
  if(active&&!paused){time+=dt*speed;$('scrub').value=String(Math.min(time,total));if(time>=total){complete('complete');active=false;time=0;if($('loop').checked)play();}}
  render();requestAnimationFrame(raf);
}
$('play').onclick=play;$('pause').onclick=()=>paused=!paused;$('cancel').onclick=()=>cancel();$('death').onclick=()=>cancel('death');$('travel').onclick=()=>cancel('travel');
$('facing').onchange=e=>setFacing(e.target.value);$('speed').onchange=e=>speed=Number(e.target.value);$('compare').onclick=()=>compare=!compare;
function scrub(t){cancel('scrub');paused=true;dead=false;time=t;$('scrub').value=String(t);}
$('scrub').oninput=e=>scrub(Number(e.target.value));
$('boards').onclick=()=>{$('board-image').src='source/generated/pha_giap_body_v02.png';$('board').show();};$('close').onclick=()=>$('board').close();
for(const b of document.querySelectorAll('[data-board]'))b.onclick=()=>{$('board-image').src='source/generated/'+({body:'pha_giap_body_v02',spin:'pha_giap_spin_v03',vfx:'pha_giap_vfx_v01'}[b.dataset.board])+'.png';};
document.addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea'))return;if(e.code==='Escape'){$('board').close();return;}if($('board').open)return;if(['KeyA','KeyC','Space','ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='KeyA')play();else if(e.code==='KeyC')cancel();else if(e.code==='Space')paused=!paused;else if(e.code.startsWith('Arrow'))setFacing(e.code.slice(5).toLowerCase());});
window.reviewApi={assets:manifest.components,observations,play,cancel,setFacing,scrub,compare:v=>compare=v,
  snapshot:()=>({active,paused,time,effects,starts,facing,casterFeet:origin(),scale:1,activeBodyFrame,groundRender}),
  playClip:(id,tag,cycles=1)=>{cancel('clip-change');const asset=assets.find(a=>a.id===id),a=asset.animations.find(a=>a.name===tag);return new Promise(resolve=>clip={asset,a,cycles,resolve,elapsed:0,order:[],lastKey:null});},nativePng:()=>canvas.toDataURL('image/png')};
window.reviewReady=true;requestAnimationFrame(raf);
