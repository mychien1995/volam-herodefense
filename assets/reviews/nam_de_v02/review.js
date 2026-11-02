/* Standalone visual choreography. No imports from game-core/protocol and no network. */
const data=await (await fetch('./data.json')).json();
const $=id=>document.getElementById(id);
const directions=['up','right','down','left'];
const vectors={up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]};
const glyphs={ArrowUp:'↑',ArrowRight:'→',ArrowDown:'↓',ArrowLeft:'←'};
const arrowKeys=Object.keys(glyphs);
// Presentation proposals only; the production encounter remains server-owned.
const feedback={backlashStunSeconds:2,smallRelease:0,barrageShots:16,barrageDirections:4,barrageInterval:.8,barrageWarningSeconds:.9,barrageStart:2.1,barrageBeamSeconds:.28};
const modes=[['entrance','Từ hướng nam',6],['palm','Chưởng shockwave',4],['aura','Phật Quang',4],['small','Tiểu nhất dương chỉ',4],['dash','Lướt sau lưng',4],['beam','Nhất Dương Chỉ',5],['barrage','Liên Hoàn Nhất Dương Chỉ',16],['pressure','Đại Lý Phong Huyệt',8],['confuse','Phật Quang Phổ Chiếu',13],['sky','Nhất Dương Quy Tông',7],['gallery','Pose / 4 hướng',29]];
const ACTIONS=['idle','walk','palm_attack','finger_charge','finger_release','rapid_fingers','pressure_point','defensive_stance','healing_meditation','ultimate_charge','ultimate_release','hurt','death'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*clamp(t,0,1);
const angle=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
const facing=a=>Math.abs(Math.cos(a))>Math.abs(Math.sin(a))?(Math.cos(a)>0?'right':'left'):(Math.sin(a)>0?'down':'up');
function random(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
let rng=random(32011),cast=0;
const state={ready:false,mode:'entrance',t:0,duration:6,paused:false,speed:1,party:2,zoom:2,dir:'right',boss:{x:740,y:650},player:{x:925,y:680,dir:'left',hp:100},bossHp:70,shots:[],rain:[],observed:[],errors:[],qte:null,permutation:{},phase:'',hit:false};
let scene,keys=new Set(),seen=new Set(),walking=false,attackUntil=-1;
function peers(){return [state.player,{x:800,y:668,dir:'right'},{x:855,y:715,dir:'up'},{x:690,y:720,dir:'up'},{x:1005,y:605,dir:'left'},{x:635,y:590,dir:'right'}].slice(0,state.party);}
function targetFarthest(){return peers().map((p,id)=>({...p,id})).sort((a,b)=>Math.hypot(b.x-740,b.y-650)-Math.hypot(a.x-740,a.y-650))[0];}
function origin(b,dir,charge=false){const offsets=charge?{right:[37,-41],left:[-25,-41],up:[18,-42],down:[13,-27]}:{right:[42,-39],left:[-32,-35],up:[4,-60],down:[27,-41]};const p=offsets[dir];return{x:b.x+p[0],y:b.y+p[1]};}
function choose(mode){
 const entry=modes.find(m=>m[0]===mode);if(!entry)return;
 state.mode=mode;state.duration=entry[2];state.t=0;state.shots=[];state.hit=false;state.bossHp=70;
 state.player={x:925,y:680,dir:'left',hp:100};state.boss={x:740,y:650};keys.clear();attackUntil=-1;
 rng=random(32011+(++cast)*7919);
 state.qte={sequence:Array.from({length:10},()=>arrowKeys[Math.floor(rng()*4)]),index:0,result:'pending',locked:false,failedAt:null,stunUntil:null};
 state.player.stunned=false;state.barrageOffset=rng()*Math.PI*2;state.barrage=null;
 const perm=[...arrowKeys];do{for(let i=3;i>0;i--){const j=Math.floor(rng()*(i+1));[perm[i],perm[j]]=[perm[j],perm[i]];}}while(perm.some((k,i)=>k===arrowKeys[i]));
 state.permutation=Object.fromEntries(arrowKeys.map((k,i)=>[k,perm[i]]));
 state.rain=Array.from({length:32},(_,i)=>({x:525+rng()*550,y:550+rng()*205,start:2+i*.075,warning:.28}));
 state.dashTarget=null;state.beamTarget={x:state.player.x,y:state.player.y-26};state.barrageAngles=[];
 $('timeline').max=state.duration;$('duration').textContent=state.duration.toFixed(1)+'s';
 document.querySelectorAll('#clips button').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
 launchEvents();
 if(scene)scene.draw();
}
function launchEvents(){
 const {t,mode}=state;
 if(mode==='small'&&!state.shots.length){const target=targetFarthest();state.shots.push({start:feedback.smallRelease,target,angle:angle({x:740,y:620},target),kind:'small'});}
 if(mode==='barrage')for(let i=0;i<feedback.barrageShots;i++)for(let direction=0;direction<feedback.barrageDirections;direction++){
  const start=feedback.barrageStart+i*feedback.barrageInterval;
  const warningStart=start-feedback.barrageWarningSeconds;
  const index=i*feedback.barrageDirections+direction;
  if(t>=warningStart&&!state.shots[index]){
   const a=state.barrageOffset+i*Math.PI*2/feedback.barrageShots+direction*Math.PI*2/feedback.barrageDirections;
   state.shots.push({start,warningStart,target:null,angle:a,index,volley:i,direction,kind:'barrage'});
  }
 }
 if(['dash','pressure'].includes(mode)&&t>=.6&&!state.dashTarget){
  const p=state.player,v=vectors[p.dir];state.dashTarget={x:p.x-v[0]*24,y:p.y-v[1]*24,player:{...p}};
 }
}
function qteActive(){return state.mode==='pressure'&&state.t>=.9&&state.t<5.9&&state.qte.result==='pending';}
function playerStunned(){return state.mode==='pressure'&&state.qte.result==='wrong'&&state.t>=state.qte.failedAt&&state.t<state.qte.stunUntil;}
function inputArrow(key){
 if(playerStunned())return true;
 if(qteActive()){
  if(key!==state.qte.sequence[state.qte.index]){state.qte.result='wrong';state.qte.failedAt=state.t;state.qte.stunUntil=state.t+feedback.backlashStunSeconds;state.player.hp=30;state.bossHp=80;keys.clear();attackUntil=-1;}
  else if(++state.qte.index===10)state.qte.result='success';
  scene.draw();return true;
 }
 return false;
}
function previewDamage(percent){if(!qteActive())state.player.hp=Math.max(0,state.player.hp-percent);scene.draw();}
function step(dt){
 if(!state.ready)return;
 const before=state.t;state.t=Math.min(state.duration,state.t+dt);
 if(before<5.9&&state.t>=5.9&&state.mode==='pressure'&&state.qte.result==='pending')state.qte.result='timeout';
 launchEvents();
 walking=false;
 if(!qteActive()&&!playerStunned()&&$('sheets').hidden){
  let x=0,y=0;
  for(let key of keys){if(state.mode==='confuse'&&state.t>=.8&&state.t<10.8)key=state.permutation[key];const d={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[key];if(d){x+=vectors[d][0];y+=vectors[d][1];}}
  const n=Math.hypot(x,y);if(n){walking=true;state.player.x=clamp(state.player.x+x/n*85*dt,505,1095);state.player.y=clamp(state.player.y+y/n*85*dt,540,795);state.player.dir=facing(Math.atan2(y,x));}
 }
 scene.draw();
 if(state.t>=state.duration&&!state.paused&&$('loop').checked)choose(state.mode);
}
function seek(t){state.t=clamp(t,0,state.duration);launchEvents();if(state.mode==='pressure'&&state.t>=5.9&&state.qte.result==='pending')state.qte.result='timeout';scene.draw();}
function phase(text){state.phase=text;$('phase').textContent=text;}
class Review extends Phaser.Scene {
 constructor(){super('NamDeReview');this.pool=[];this.used=0;this.registered=new Map();}
 preload(){
  for(const p of data.packages)this.load.atlas(p.key,p.base+'.png',p.base+'.json');
  this.load.image('ground','/assets/exports/arena_v2/ground.png');
  this.load.atlas('world','/assets/exports/arena_art01/world.png','/assets/exports/arena_art01/world.json');
  this.load.atlas('ambient','/assets/exports/arena_art01/ambient.png','/assets/exports/arena_art01/ambient.json');
  for(const school of ['cai_bang_chuong','vo_dang','thien_son','thieu_lam'])this.load.atlas(school,'/assets/exports/characters/hero_'+school+'.png','/assets/exports/characters/hero_'+school+'.json');
  this.load.on('loaderror',f=>state.errors.push('load: '+f.key));
 }
 create(){
  scene=this;
  this.add.image(0,0,'ground').setOrigin(0).setDepth(-10000);
  const prop=(id,x,y)=>this.add.image(x,y,'world',id).setOrigin(.5,184/192).setDepth(y);
  prop('statue_male',800,576);prop('tree_jade',480,330);prop('tree_blossom',1220,870);
  for(const [x,y]of [[744,578],[856,578],[470,792],[1145,790]])this.add.sprite(x,y,'ambient','lantern_glow_0').setOrigin(.5,216/224).setDepth(y);
  for(const [x,y]of [[452,830],[1146,835]])prop('red_banner',x,y);
  this.cameras.main.setZoom(2).centerOn(800,650).setRoundPixels(true);
  for(const p of data.packages)for(const clip of p.clips){
   const key=p.key+':'+clip.name;
   this.anims.create({key,frames:clip.frames.map(frame=>({key:p.key,frame})),frameRate:1000/clip.durationMs,repeat:clip.repeat});
   this.registered.set(key,clip);
  }
  this.game.events.on('postrender',()=>{
   for(const s of this.pool)if(s.visible&&s.alpha>0)seen.add(s.texture.key+':'+s.frame.name);
   state.observed=[...seen];
  });
  state.ready=true;$('loading').hidden=true;choose('entrance');
  window.__namDeReview={ready:true,select:choose,seek,step,previewDamage,sample:()=>structuredClone(state),pause:v=>{state.paused=v;$('pause').textContent=v?'Tiếp tục':'Tạm dừng';},setParty:n=>{state.party=n;$('party').value=String(n);this.draw();},setPlayer:p=>{Object.assign(state.player,p);this.draw();},setFacing:d=>{state.dir=d;$('facing').value=d;this.draw();},setZoom:z=>{state.zoom=z;this.cameras.main.setZoom(z).centerOn(800,650);this.draw();},playClip:key=>this.playClip(key)};
  this.draw();
 }
 sprite(tex,frame,x,y,sx=1,sy=sx,rotation=0,depth=y,alpha=1,originY=.5){
  const s=this.pool[this.used]??(this.pool[this.used]=this.add.sprite(0,0,tex,frame));this.used++;
  s.setVisible(true).setTexture(tex,frame).setPosition(Math.round(x),Math.round(y)).setScale(sx,sy).setRotation(rotation).setDepth(depth).setAlpha(alpha).setOrigin(.5,originY);
  return s;
 }
 actor(action,dir,t,x,y){return this.sprite('boss',action+'_'+dir+'_'+(Math.floor(Math.max(0,t)/(action==='idle'?.3:action==='walk'?.14:.1))%4),x,y,1,1,0,y,1,88/112);}
 fx(tex,name,t,x,y,sx=1,sy=sx,rot=0,depth=y+.1,alpha=1){const clip=this.registered.get(tex+':'+name);const index=Math.floor(Math.max(0,t)/(clip.durationMs/1000))%clip.frames.length;return this.sprite(tex,clip.frames[index],x,y,sx,sy,rot,depth,alpha);}
 ray(tex,name,t,a,b,width=1,warning=false){
  const r=angle(a,b),length=Math.hypot(b.x-a.x,b.y-a.y);
  if(!warning){tex='rays';name='beam';}
  if(!warning&&state.mode==='barrage'){tex='feedback01';name='thin_beam';}
  if(warning&&state.mode==='barrage'){tex='feedback02';name='line_warning';}
  const clip=this.registered.get(tex+':'+name),frame=this.textures.getFrame(tex,clip.frames[0]);
  const s=this.fx(tex,name,t,(a.x+b.x)/2,(a.y+b.y)/2,length/frame.width,width,r,warning?500:Math.max(a.y,b.y)+4,warning?.9:1);
  state.ray={from:a,to:b,length,drawnLength:s.displayWidth,texture:tex};
 }
 playClip(key){
  state.paused=true;this.manualClip=key;this.used=0;
  for(const s of this.pool)s.setVisible(false).anims.stop();
  const clip=this.registered.get(key);if(!clip)throw new Error('Unknown clip '+key);
  const tex=key.split(':')[0],s=this.sprite(tex,clip.frames[0],740,650,1,1,0,650,1,tex==='boss'?88/112:.5);
  s.play(key);s.on('animationupdate',()=>seen.add(s.texture.key+':'+s.frame.name));
  return clip.frames.length*clip.durationMs;
 }
 draw(){
  this.manualClip=null;for(const s of this.pool){s.setVisible(false);s.anims.stop();s.removeAllListeners('animationupdate');}this.used=0;
  const {t,mode}=state,b={x:740,y:650};let action='idle',dir=state.dir,at=t;
  if(mode==='entrance'){b.x=800;b.y=lerp(900,695,t/4.8);action=t<4.8?'walk':'idle';dir='up';phase(t<4.8?'Từ hướng nam tiến vào · Chỉ truy người chơi':'Nam Đế · Sẵn sàng giao chiến');}
  if(mode==='gallery'){
   const index=Math.min(51,Math.floor(t/.55));dir=['down','up','left','right'][Math.floor(index/13)];action=ACTIONS[index%13];at=t%.55;
   phase(action+' · '+dir+' · Giữ nguyên sprite gốc');
  }
  if(mode==='palm'){
   action=t<.5?'palm_attack':'idle';at=t;
   const v=vectors[dir],r=Math.atan2(v[1],v[0]),d=clamp((t-.45)*210,0,350);
   if(t>=.45&&t<2.25)this.fx('palm','palm_trail',t,b.x+v[0]*d,b.y-24+v[1]*d,1.25,.85,r,b.y+d+1);
   phase(t<.45?'Chưởng · Xuất chưởng':'Shockwave rộng, bay thẳng và xa');
  }
  if(mode==='aura'){
   action=t<.7?'defensive_stance':'idle';
   if(t>.55&&t<2){const s=lerp(.35,2.5,(t-.55)/1.1);this.fx('feedback01','plain_ring',Math.min(t-.55,.399),b.x,b.y,s,s,0,501,1-clamp((t-1.5)*2,0,.9));}
   phase('Phật Quang · Một vòng sáng phát từ tâm Nam Đế');
  }
  if(mode==='small'){
   action=t<.32?'finger_release':'idle';at=Math.min(t,.2);
   for(const shot of state.shots){const age=t-shot.start;if(age>=0&&age<1.1){dir=facing(shot.angle);const a=origin(b,dir);this.fx('rapid','rapid_projectile',age,a.x+Math.cos(shot.angle)*age*420,a.y+Math.sin(shot.angle)*age*420,.55,.3,shot.angle,700);}}
   phase('Tiểu nhất dương chỉ · Phẩy tay bắn ngay, không tụ lực');
  }
  if(mode==='dash'||mode==='pressure'){
   const dest=state.dashTarget??{x:949,y:680};const progress=clamp((t-.6)/.3,0,1);
   b.x=lerp(740,dest.x,progress);b.y=lerp(650,dest.y,progress);dir=facing(angle(b,state.player));
   if(t>.6&&t<1.1){action='pressure_point';this.fx('rework','dash_wake',t-.6,b.x-32,b.y-20,.7,.45,angle({x:740,y:650},dest),b.y-.1);}
   if(mode==='dash'){phase(t<.6?'Bộ pháp chậm · Bất chợt áp sát':'Lướt vào phía sau theo hướng nhìn của mục tiêu');}
   else {
    action=t<.9?'pressure_point':'finger_release';
    if(t>=.9&&t<1.45)this.fx('rework','pressure_contact',t-.9,state.player.x,state.player.y-27,.5);
    state.qte.locked=qteActive();
    if(state.qte.locked)this.fx('pressure','immobilization_symbol',t,state.player.x,state.player.y-28,.55,.55,0,900,.8);
    if(state.qte.result==='wrong'){
     const age=t-state.qte.failedAt;
     if(age>=0&&age<.4)this.fx('pressure','pressure_impact',age,state.player.x,state.player.y-24,.9,.9,0,1000);
     if(playerStunned())this.fx('pressure','stun_status',age,state.player.x,state.player.y-48,.55,.55,0,1001);
    }
    phase(t<.9?'Đại Lý Phong Huyệt · Lao đến và điểm huyệt':state.qte.result==='success'?'Giải huyệt thành công':state.qte.result==='wrong'?(playerStunned()?'Phản phệ · Nổ và choáng · −70% HP / Boss +10% HP':'Hết choáng · Có thể di chuyển lại'):state.qte.result==='timeout'?'Hết 5 giây · Kết thúc minh họa':'Phong huyệt · Bấm đúng chuỗi mũi tên');
   }
  }
  if(mode==='beam'){
   const a0={x:b.x,y:b.y-30};dir=facing(angle(a0,state.beamTarget));const a=origin(b,dir),r=angle(a,state.beamTarget),end={x:a.x+Math.cos(r)*850,y:a.y+Math.sin(r)*850};
   if(t<1.5){action='finger_charge';at=Math.min(t,.2);const hand=origin(b,dir,true);this.fx('finger','fingertip_charge',t,hand.x,hand.y,.27);this.ray('finger','line_warning',t,a,end,.65,true);phase('Nhất Dương Chỉ · Tụ lực đầu ngón tay · Né đường cảnh báo');}
   else if(t<2.15){action='finger_release';at=.2;this.ray('ultimate','ultimate_beam',t-1.5,a,end,.6);this.fx('rapid','fingertip_flash',t-1.5,a.x,a.y,.38);phase('Nhất Dương Chỉ · Xuyên màn hình · Trúng mất 90% HP');
    const p=state.player,dist=Math.abs((p.x-a.x)*Math.sin(r)-(p.y-26-a.y)*Math.cos(r));if(!state.hit&&dist<16){state.hit=true;state.player.hp=10;}
   }else phase('Nhất Dương Chỉ · Thu chỉ');
  }
  if(mode==='barrage'){
   const progress=clamp((t-feedback.barrageStart)/feedback.barrageInterval,0,feedback.barrageShots);
   const rotation=state.barrageOffset+progress*Math.PI*2/feedback.barrageShots;
   const endTime=feedback.barrageStart+feedback.barrageShots*feedback.barrageInterval;
   dir=facing(rotation);action=t<endTime?'finger_charge':'idle';at=Math.min(t,.2);
   let warningCount=0,activeCount=0,released=0;
   for(const shot of state.shots){
    const age=t-shot.start,shotDir=facing(shot.angle),a=origin(b,shotDir),end={x:a.x+Math.cos(shot.angle)*700,y:a.y+Math.sin(shot.angle)*700};
    if(age>=0)released++;
    if(t>=shot.warningStart&&age<0){warningCount++;this.ray('finger','line_warning',t-shot.warningStart,a,end,.7,true);}
    if(age>=0&&age<feedback.barrageBeamSeconds){activeCount++;action='finger_release';at=Math.min(age,.2);this.ray('finger','concentrated_beam',age,a,end,.4);this.fx('rapid','fingertip_flash',age,a.x,a.y,.3);}
   }
   if(t<1.2){const a=origin(b,dir,true);this.fx('finger','fingertip_charge',t,a.x,a.y,.3);}
   state.barrage={rotation,warningCount,activeCount,released,directionsPerVolley:feedback.barrageDirections,warningSeconds:feedback.barrageWarningSeconds,interval:feedback.barrageInterval};
   phase(t<1.2?'Liên Hoàn · Tụ chỉ':t>=endTime?'Liên Hoàn · Thu thế':activeCount?'Liên Hoàn · Bắn 4 hướng cùng lúc · Xoay chậm':'Liên Hoàn · Cảnh báo 4 hướng trước mỗi đợt');
  }
  if(mode==='confuse'){
   action=t<1?'finger_release':'idle';
   if(t>=.8&&t<10.8){const p=state.player;this.fx('light','rising_light',t,p.x,p.y+4,.65,.85,0,p.y+.1,.65).setOrigin(.5,.95);this.fx('rework','dizzy_halo',t,p.x,p.y-58,.55,.55,0,p.y+2);}
   phase(t<.8?'Phật Quang Phổ Chiếu · Chọn một mục tiêu':t<10.8?'Phật Quang Phổ Chiếu · Hoa mắt / đảo phím 10 giây':'Phật Quang Phổ Chiếu · Điều khiển trở lại bình thường');
  }
  if(mode==='sky'){
   action=t<1.2?'ultimate_charge':t<1.8?'ultimate_release':'idle';at=t<1.2?t:t-1.2;
   if(t<1.2)this.fx('ultimate','ultimate_gather',t,b.x+7,b.y-53,.35);
   if(t>=1.2&&t<1.65){const a={x:b.x+7,y:b.y-52};this.ray('finger','concentrated_beam',t-1.2,a,{x:a.x,y:a.y-500},.45);}
   for(const strike of state.rain){const age=t-strike.start;
    if(age>=-strike.warning&&age<0)this.fx('light','healing_warning',t,strike.x,strike.y,.4,.4,0,500);
    if(age>=0&&age<.4){const s=this.fx('rework','sky_ray',age,strike.x,strike.y,.43,1.65,0,strike.y+2);s.setOrigin(.5,.94);this.fx('ultimate','sequential_impact',age,strike.x,strike.y,.38,.3,0,strike.y+3);}
   }
   phase(t<1.2?'Nhất Dương Quy Tông · Tụ chỉ':t<1.8?'Bắn một tia lên trời':'Nhất Dương Quy Tông · 32 tia giáng xuống · Cảnh báo cực nhanh');
  }
  state.boss={...b,dir,action};this.actor(action,dir,at,b.x,b.y);
  state.player.stunned=playerStunned();
  const schools=['cai_bang_chuong','vo_dang','thien_son','thieu_lam','vo_dang','thien_son'];
  peers().forEach((p,i)=>{const stunned=i===0&&state.player.stunned,move=i===0&&walking&&!stunned,hit=i===0&&t<attackUntil&&!stunned;const name=(hit?'basic_attack':move?'walk':'idle')+'_'+p.dir+'_'+(Math.floor(t/(move?.12:.35))%(move||hit?4:2));this.sprite(schools[i],name,p.x,p.y,1,1,0,p.y,stunned?.6+.4*Math.abs(Math.sin((t-state.qte.failedAt)*18)):1,.8);});
  if(t<attackUntil)this.fx('palm','palm_trail',t,state.player.x-35,state.player.y-20,.4,.4,Math.PI,state.player.y+.1);
  state.drawn=this.pool.filter(s=>s.visible).map(s=>({texture:s.texture.key,frame:s.frame.name,x:s.x,y:s.y,alpha:s.alpha}));
  this.updateHud();
 }
 updateHud(){
  $('time').textContent=state.t.toFixed(1)+'s';$('timeline').value=state.t;
  $('bossHp').style.width=state.bossHp+'%';$('playerStatus').textContent='HP minh họa '+state.player.hp+'% · Chưa tích hợp combat/server';
  $('qte').hidden=!qteActive();
  if(!$('qte').hidden){const q=state.qte;$('arrows').replaceChildren(...q.sequence.map((k,i)=>{const e=document.createElement('span');e.textContent=glyphs[k];e.className='arrow'+(i<q.index?' done':i===q.index?' next':'')+(q.result==='wrong'&&i===q.index?' wrong':'');return e;}));$('qteTime').style.width=clamp((5.9-state.t)/5*100,0,100)+'%';$('qteResult').textContent=q.result==='success'?'Đã giải huyệt':q.result==='wrong'?(state.player.stunned?'Phản phệ: nổ và choáng '+(q.stunUntil-state.t).toFixed(1)+'s · −70% HP / Boss +10% HP':'Hết choáng'):q.result==='timeout'?'Hết giờ · Quy tắc phạt khi hết giờ còn chờ xác định':q.index+'/10';}
  const confused=state.mode==='confuse'&&state.t>=.8&&state.t<10.8;$('mapping').hidden=!confused;
  if(confused)$('mapping').innerHTML='<strong>HOA MẮT · '+(10.8-state.t).toFixed(1)+'s</strong><br>'+arrowKeys.map(k=>'Bấm '+glyphs[k]+' → đi '+glyphs[state.permutation[k]]).join('<br>');
 }
 update(_,delta){if(!state.ready||this.manualClip)return;if(!state.paused)step(Math.min(delta/1000,.1)*state.speed);}
}
for(const [id,label]of modes){const b=document.createElement('button');b.dataset.mode=id;b.textContent=label;b.onclick=()=>choose(id);$('clips').append(b);}
$('pause').onclick=()=>window.__namDeReview.pause(!state.paused);
$('replay').onclick=()=>choose(state.mode);
$('speed').onchange=e=>state.speed=Number(e.target.value);
$('party').onchange=e=>window.__namDeReview.setParty(Number(e.target.value));
$('facing').onchange=e=>window.__namDeReview.setFacing(e.target.value);
$('zoom').onchange=e=>window.__namDeReview.setZoom(Number(e.target.value));
$('timeline').oninput=e=>{window.__namDeReview.pause(true);chooseSameTime(Number(e.target.value));};
function chooseSameTime(t){state.shots=[];state.hit=false;state.qte.result='pending';state.qte.index=0;state.qte.failedAt=null;state.qte.stunUntil=null;state.player.hp=100;state.bossHp=70;seek(t);}
$('sprite').onclick=()=>{$('sheets').hidden=!$('sheets').hidden;keys.clear();};
$('closeSheets').onclick=()=>$('sheets').hidden=true;
$('gallery').onclick=()=>{$('sheets').hidden=true;choose('gallery');window.__namDeReview.pause(false);};
window.addEventListener('blur',()=>keys.clear());
window.addEventListener('keydown',e=>{
 if(!state.ready)return;
 const tag=document.activeElement?.tagName;
 if(['INPUT','SELECT','TEXTAREA'].includes(tag)||!$('sheets').hidden){if(e.key==='Escape')$('sheets').hidden=true;return;}
 if(arrowKeys.includes(e.key)){e.preventDefault();if(!e.repeat&&!inputArrow(e.key))keys.add(e.key);return;}
 if(e.repeat)return;
 if(e.code==='Space'){e.preventDefault();window.__namDeReview.pause(!state.paused);}
 if(e.key.toLowerCase()==='h')document.body.classList.toggle('clean');
 if(e.key.toLowerCase()==='a'&&!qteActive()&&!playerStunned()){attackUntil=state.t+.4;scene.draw();}
});
window.addEventListener('keyup',e=>keys.delete(e.key));
new Phaser.Game({type:Phaser.AUTO,parent:'world',width:1280,height:720,pixelArt:true,roundPixels:true,backgroundColor:'#243c2c',banner:false,scene:Review,render:{antialias:false,roundPixels:true},fps:{target:60}});
