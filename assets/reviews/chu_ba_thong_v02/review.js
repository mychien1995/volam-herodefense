/* Standalone art choreography. No Phaser/game imports, combat, rewards or network. */
'use strict';
const $=id=>document.getElementById(id), D=window.ART_DATA;
const canvas=$('world'), ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
const T=window.ART_TUNING;
const ROOT='../../../', images=new Map(), observed=new Set(), errors=[];
const scenes=[
 ['turnaround','4 hướng',9,'Boss idle/walk và tiểu đồng mang rượu · bốn hướng ở tỉ lệ 1×'],
 ['arena','Arena / Idle',12,'Sân đấu Toàn Chân Trúc Lâm · giữ khoảng trống cho 6 người'],
 ['sweep','Quạt phong kình',3.2,'Phong kình phủ cả sát chân boss và rộng phía trước'],
 ['fists','Quyền trái / phải',3.2,'Quyền trái/phải kèm phong quyền vươn xa tới người chơi tầm xa'],
 ['projectile','Bắn chưởng',8,'Chưởng chốt vị trí player lúc bắn · di chuyển để né đường thẳng'],
 ['hands','Song Thủ Hỗ Bác',6,'Bàn tay âm dương lớn từ bốn rìa màn hình ép vào vị trí player'],
 ['trap','Thái Cực Âm Dương Trận',32,'Tất cả player trong dungeon phải đứng trong trận · tối đa 30 giây'],
 ['spin','Túy Tiên Bộ',26,'Con quay nhanh hơn · vòng xoáy rộng quanh boss · liên tục 24 giây'],
 ['reflect','Càn Khôn Phản Chấn',12,'Phản 100% đòn thử · hút player ở gần · chạy khỏi vùng hút'],
 ['ultimate','Âm Dương Nghịch Chuyển',16,'Các vòng âm dương liên tục di chuyển và đổi tâm khắp sân'],
 ['disciple','Tiểu đồng đưa rượu',10,'Mỗi người trong dungeon có một tiểu đồng đưa rượu vào sân']
];
let mode='arena', t=0, paused=false, speed=1, party=3, keys=new Set(), gathering=false, last=0, attacks=[], projectiles=[], shots=[], handTarget=null, trap=null;
let player={x:640,y:510,facing:'down',moving:false}, peers=[], boss={x:640,y:330}, nextShot=.6, damageFlash=0, escaped=false;
const info=()=>scenes.find(s=>s[0]===mode);
function reset(){t=0;player={x:640,y:510,facing:'down',moving:false};peers=Array.from({length:party-1},(_,i)=>({x:430+i*115,y:570+(i%2)*28}));boss={x:640,y:330};attacks=[];projectiles=[];shots=[];nextShot=.6;handTarget=null;trap=null;damageFlash=0;escaped=false;if(mode==='sweep')player.y=350;if(mode==='fists'){boss.y=260;player.y=540;}}
function select(id){mode=id;gathering=false;$('gather').checked=false;reset();$('timeline').max=info()[2];$('duration').textContent=info()[2]+'s';$('help').innerHTML=info()[3]+'<br>← ↑ ↓ → Di chuyển · A thử đánh · Space dừng';$('gatherWrap').style.display=id==='trap'?'inline':'none';for(const b of $('scenes').children)b.classList.toggle('active',b.dataset.scene===id);render();}
for(const [id,title] of scenes){const b=document.createElement('button');b.textContent=title;b.dataset.scene=id;b.onclick=()=>select(id);$('scenes').append(b);}
function asset(path){return images.get(path);}
function sprite(path,x,y,origin=[.5,.8],scale=1,alpha=1,angle=0){const im=asset(path);if(!im)return;ctx.save();ctx.globalAlpha=alpha;ctx.translate(Math.round(x),Math.round(y));if(angle)ctx.rotate(angle);ctx.drawImage(im,Math.round(-im.width*origin[0]*scale),Math.round(-im.height*origin[1]*scale),im.width*scale,im.height*scale);ctx.restore();}
function cel(key,name,x,y,time=t,opts={}){const b=D.bundles[key], anim=b.animations.find(a=>a.name===name);if(!anim)throw Error('Missing clip '+key+'/'+name);const index=opts.frame??Math.floor(Math.max(0,time)*(anim.frameRate||10))%anim.frames.length, fn=anim.frames[index], entry=b.frames[fn]||b.frames[fn+'.png'];if(!entry)throw Error('Missing cel '+fn);const f=entry.frame, im=asset(b.image);if(!im)return;const origin=opts.origin||b.origin,s=opts.scale||1;ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.globalAlpha=opts.alpha??1;if(opts.angle)ctx.rotate(opts.angle);ctx.drawImage(im,f.x,f.y,f.w,f.h,Math.round(-origin[0]*f.w*s),Math.round(-origin[1]*f.h*s),f.w*s,f.h*s);ctx.restore();observed.add(key+':'+fn);}
function label(text,x,y,color='#fff0ca'){ctx.save();ctx.font='600 13px Segoe UI';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#13201d';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();}
function approach(a,b,d){const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(len>d){a.x+=dx/len*d;a.y+=dy/len*d;}else{a.x=b.x;a.y=b.y;}}
function spinPosition(time){
 const triangle=(v,a,b)=>{const span=b-a,n=((v%(2*span))+2*span)%(2*span);return a+(n<span?n:2*span-n);};
 const elapsed=Math.max(0,time-1);
 return {x:triangle(435+elapsed*T.spinSpeedX,205,1075),y:triangle(95+elapsed*T.spinSpeedY,235,570)};
}
function ultimateLayout(time){
 const e=Math.max(0,time-1);
 return {
  center:{x:640+220*Math.sin(e*.73),y:410+90*Math.sin(e*.65)},
  waves:Array.from({length:4},(_,i)=>({x:640+270*Math.sin(e*.57+i*1.7),y:410+135*Math.sin(e*.69+i*1.3)})),
  nodes:Array.from({length:15},(_,i)=>({x:240+(i%5)*200+60*Math.sin(e*(.8+i*.017)+i*1.9),y:250+Math.floor(i/5)*160+40*Math.sin(e*(.93+i*.011)+i*1.2)}))
 };
}
function disciples(){
 if(mode!=='disciple')return [];
 const starts=[[170,260],[1110,260],[1000,220],[200,540],[1110,540],[400,220]];
 const ends=[[-80,0],[80,0],[46,-45],[-55,55],[55,55],[-46,-45]];
 const progress=Math.min(1,t/6.5);
 return starts.slice(0,party).map(([sx,sy],i)=>{
  const [ox,oy]=ends[i],ex=boss.x+ox,ey=boss.y+oy,dx=ex-sx,dy=ey-sy;
  const direction=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';
  return {who:'disciple',index:i,x:sx+(ex-sx)*progress,y:sy+(ey-sy)*progress,direction,tag:progress<1?'carry_walk_':t<8?'drop_wine_':'idle_'};
 });
}
function sweepContains(point){
 return Math.hypot(point.x-boss.x,point.y-boss.y)<=T.sweepFootRadius||Math.hypot(point.x-boss.x,point.y-boss.y-T.sweepFrontOffset)<=T.sweepFrontRadius;
}
function fistContains(point){return Math.abs(point.x-boss.x)<=T.fistHalfWidth&&point.y>=boss.y-20&&point.y<=boss.y+T.fistReach;}
function attack(){if(mode!=='reflect'||t<1||t>=10)return;attacks.push({x:player.x,y:player.y,start:t,from:{x:player.x,y:player.y},to:{...boss},reflected:false});}
function update(dt){
 t+=dt;
 const dx=(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0),dy=(keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0),len=Math.hypot(dx,dy);
 player.moving=!!len;if(len){const old={...player};player.x+=dx/len*160*dt;player.y+=dy/len*160*dt;player.facing=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';if(mode==='trap'&&trap&&!trap.released){const r=Math.hypot(player.x-trap.x,player.y-trap.y);if(r>48){player.x=trap.x+(player.x-trap.x)/r*48;player.y=trap.y+(player.y-trap.y)/r*48;}}}
 player.x=Math.max(150,Math.min(1130,player.x));player.y=Math.max(220,Math.min(600,player.y));
 if(mode==='projectile'){
  while(t>=nextShot){const target={x:player.x,y:player.y}, from={x:boss.x,y:boss.y-20},l=Math.hypot(target.x-from.x,target.y-from.y);const p={from,target,release:nextShot,dx:(target.x-from.x)/l,dy:(target.y-from.y)/l};shots.push(p);projectiles.push(p);nextShot+=2.2;}
  projectiles=projectiles.filter(p=>t-p.release<3);
 }
 if(mode==='hands'&&t>=.75&&!handTarget)handTarget={x:player.x,y:player.y};
 if(mode==='trap'&&t>=.6&&!trap)trap={x:player.x,y:player.y,start:.6,released:false,reason:null,inside:1};
 if(mode==='trap'&&trap&&!trap.released){
  if(gathering)for(const p of peers)approach(p,trap,120*dt);
  trap.inside=[player,...peers].filter(p=>Math.hypot(p.x-trap.x,p.y-trap.y)<62).length;
  if(trap.inside===party||t-trap.start>=30){trap.released=true;trap.reason=trap.inside===party?'Đủ đội — phá trận':'Đủ 30 giây — giải phóng';trap.releaseAt=t;}
 }
 if(mode==='spin'&&t>1&&t<25)Object.assign(boss,spinPosition(t));
 if(mode==='reflect'&&t>=1&&t<10){const dist=Math.hypot(player.x-boss.x,player.y-boss.y);if(dist<210&&dist>35)approach(player,boss,60*dt);escaped=dist>210;}
 for(const a of attacks)if(!a.reflected&&t-a.start>=.35){a.reflected=true;a.returnAt=t;a.returnTarget={x:player.x,y:player.y};damageFlash=t;}
 attacks=attacks.filter(a=>t-a.start<1.4);
}
function actors(){
 const all=[{who:'boss',...boss},{who:'player',...player},...peers.map((p,i)=>({who:'peer',index:i,...p})),...disciples()].sort((a,b)=>a.y-b.y);
 for(const a of all){
  if(a.who==='disciple'){cel('disciple',a.tag+a.direction,a.x,a.y,t);label('Tiểu đồng '+(a.index+1),a.x,a.y-59);}
  else if(a.who==='boss'){
   if(mode==='turnaround'){const dir=['down','right','up','left'][Math.floor(t/2)%4],walk=t%2>1;cel('base',(walk?'walk_':'idle_')+dir,a.x,a.y,t);}
   else if(mode==='sweep')cel('boss','sweep',a.x,a.y,t%1.6);
   else if(mode==='fists')cel('boss',Math.floor(t/.5)%2?'punch_right':'punch_left',a.x,a.y,t%.5);
   else if(mode==='spin'&&t>1&&t<25)cel('boss','spin',a.x,a.y,t);
   else{let tag='idle_down';if(mode==='projectile'&&t%2.2<1)tag='basic_palm_down';if(mode==='hands')tag='dual_hand_down';if(mode==='trap'&&t<1.2)tag='yin_yang_cast_down';if(mode==='reflect'&&t>=1&&t<10)tag='counter_down';if(mode==='ultimate')tag='ultimate_charge_down';if(mode==='disciple'&&t>6.5&&t<8.5)tag='drink_down';cel('base',tag,a.x,a.y);}
   label('Chu Bá Thông',a.x,a.y-73);
  }else{const i=a.who==='player'?0:a.index+1,path=D.heroes[i%D.heroes.length];if(a.who==='player'&&player.moving){const walk=path.replace('idle_down_0','walk_'+player.facing+'_'+Math.floor(t*10)%4);sprite(walk,a.x,a.y,[.5,.8]);}else sprite(path,a.x,a.y,[.5,.8]);label(a.who==='player'?'Bạn':'Đồng đội '+(a.index+2),a.x,a.y-53,a.who==='player'?'#abffff':'#f1e7cb');}
 }
}
function groundEffects(){
 if(mode==='sweep'){const p=t%1.6;if(p>.14&&p<.68){cel('palm','shockwave',boss.x,boss.y+8,p,{scale:2.2,alpha:.68});cel('palm','shockwave',boss.x,boss.y+T.sweepFrontOffset,p,{scale:3,alpha:.85});}}
 if(mode==='trap'&&trap&&!trap.released)cel('trap','rotating_ring',trap.x,trap.y+2,t,{scale:1.4});
 if(mode==='reflect'&&t>=1&&t<10){cel('reflect','defensive_field',boss.x,boss.y+3,t,{scale:2.4,alpha:.8});cel('reflect','charge_warning',boss.x,boss.y,t,{scale:3.6,alpha:.4});}
 if(mode==='spin'&&t>1&&t<25){
  cel('palm','shockwave',boss.x,boss.y+3,t,{scale:T.spinRadius/45,alpha:.72});
  for(let i=3;i>0;i--){const age=Math.max(1,t-i*.05),{x,y}=spinPosition(age);cel('boss','spin',x,y,age,{alpha:.18/i});cel('spinfx','wind_trail',x,y,age,{alpha:.28/i,scale:1.4});}
  if(Math.min(boss.x-205,1075-boss.x,boss.y-235,570-boss.y)<26)cel('spinfx','arrival',boss.x,boss.y,t,{alpha:.8,scale:1.4});
 }
 if(mode==='ultimate'&&t>1){
  const elapsed=t-1,layout=ultimateLayout(t);cel('ultimate','large_formation',layout.center.x,layout.center.y,elapsed,{scale:4,alpha:.48});
  for(let ring=0;ring<4;ring++){const age=(elapsed+ring*.7)%2.8,sc=.5+age*3.8,{x,y}=layout.waves[ring];cel('ultimate','rotating_waves',x,y,elapsed,{scale:sc,alpha:.68*(1-age/2.8)});}
  const phase=elapsed%1.4;
  for(const {x,y} of layout.nodes){cel('trap','rotating_ring',x,y,t,{scale:1.2,alpha:phase<.7?.4:.7});if(phase>.7)cel('ultimate','ultimate_impact',x,y,phase-.7,{scale:1.3,alpha:.65});}
 }
}
function aboveEffects(){
 if(mode==='sweep'&&t%1.6>.14&&t%1.6<.68&&sweepContains(player))label('Trong phong kình',player.x,player.y-65,'#ffd88a');
 if(mode==='fists'){
  const p=t%.5,side=Math.floor(t/.5)%2?1:-1;
  if(p>.1&&p<.46){const reach=Math.min(1,(p-.1)/.3)*T.fistReach;
   for(let i=3;i>=0;i--){const distance=Math.max(20,reach-i*48);cel('palm','palm_wave',boss.x+side*20,boss.y+distance,p-i*.025,{scale:.8,angle:Math.PI/2,alpha:1-i*.2});}
   cel('palm','impact',boss.x+side*20,boss.y+reach,p,{scale:1.1});
   if(fistContains(player))label('Trong tầm phong quyền',player.x,player.y-65,'#ffd88a');
  }
 }
 if(mode==='projectile')for(const p of projectiles){const age=t-p.release,x=p.from.x+p.dx*300*age,y=p.from.y+p.dy*300*age;cel('palm','palm_wave',x,y,age,{angle:Math.atan2(p.dy,p.dx),scale:1});if(age<.6)cel('trap','rotating_ring',p.target.x,p.target.y,age,{scale:.6,alpha:.5});}
 if(mode==='hands'&&handTarget){
  const p=t-.75,progress=Math.min(1,p/2),ease=progress*progress,tar=handTarget;
  const entries=[[-150,tar.y,0,'yin_hand'],[1430,tar.y,Math.PI,'yang_hand'],[tar.x,-150,Math.PI/2,'yin_hand'],[tar.x,870,-Math.PI/2,'yang_hand']];
  if(p<3.8)for(const [sx,sy,angle,name] of entries){const x=sx+(tar.x-sx)*ease,y=sy+(tar.y-sy)*ease;const frame=p<.3?0:p<1.9?1:p<2.6?2:3;cel('hands',name,x,y,p,{angle,scale:T.handsScale,frame,alpha:p>2.8?Math.max(0,1-(p-2.8)):1});}
 }
 if(mode==='trap'&&trap){if(!trap.released){cel('trap','formation',trap.x,trap.y-22,t,{scale:1.25,alpha:.58});label(trap.inside+'/'+party+' người trong trận · '+Math.max(0,30-(t-trap.start)).toFixed(1)+'s',trap.x,trap.y+80,'#b7fcff');}else if(t-trap.releaseAt<1)cel('trap','eruption',trap.x,trap.y,t-trap.releaseAt,{scale:1.6});}
 if(mode==='reflect'){
  if(t>=1&&t<10)for(let i=0;i<6;i++){const age=(t+i*.18)%1.2,r=210*(1-age/1.2),ang=i*Math.PI/3;cel('spinfx','wind_trail',boss.x+Math.cos(ang)*r,boss.y+Math.sin(ang)*r,t,{scale:.6,angle:ang+Math.PI,alpha:.5});}
  for(const a of attacks){const age=t-a.start;if(age<.35){const u=age/.35;cel('palm','palm_wave',a.from.x+(a.to.x-a.from.x)*u,a.from.y+(a.to.y-a.from.y)*u,age,{scale:.6,angle:Math.atan2(a.to.y-a.from.y,a.to.x-a.from.x)});}else if(age<.8){const u=(age-.35)/.45;cel('reflect','counter_impact',a.to.x+(a.returnTarget.x-a.to.x)*u,a.to.y+(a.returnTarget.y-a.to.y)*u,age,{scale:1});label('Phản 100% · thử hình ảnh',a.returnTarget.x,a.returnTarget.y-85,'#ffd88a');}}
 }
 if(mode==='turnaround'){const dir=['down','right','up','left'][Math.floor(t/2)%4];cel('disciple','carry_walk_'+dir,450,330,t);label('Tiểu đồng',450,263);}

}
function render(){
 ctx.clearRect(0,0,1280,720);sprite(D.arena,0,0,[0,0]);groundEffects();actors();aboveEffects();
 let phase=info()[3];if(mode==='disciple')phase=party+' người · '+disciples().length+' tiểu đồng đưa rượu';if(mode==='trap'&&trap)phase=trap.released?trap.reason:'Nhốt '+Math.max(0,30-(t-trap.start)).toFixed(1)+'s · '+trap.inside+'/'+party+' người';if(mode==='reflect')phase=t<1?'Chuẩn bị phản chấn':t<10?'PHẢN TOÀN BỘ SÁT THƯƠNG · '+(escaped?'Đã ra khỏi vùng hút':'Chạy ra xa · A để xem phản đòn'):'Kết thúc phản chấn';if(mode==='spin')phase=t>1&&t<25?'TÚY TIÊN BỘ · còn '+(25-t).toFixed(1)+'s':t<=1?'Lấy đà…':'Hồi thế';$('phase').textContent=phase;$('time').textContent=t.toFixed(1)+'s';$('timeline').value=t;
}
function seek(value){const target=Math.max(0,Math.min(info()[2]-.001,value));const k=keys;keys=new Set();reset();while(t+.02<target)update(.02);update(target-t);keys=k;render();}
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Tiếp tục':'Tạm dừng';};$('reset').onclick=()=>{reset();render();};$('speed').onchange=e=>speed=Number(e.target.value);$('party').onchange=e=>{party=Number(e.target.value);reset();render();};$('gather').onchange=e=>gathering=e.target.checked;$('timeline').oninput=e=>{paused=true;$('pause').textContent='Tiếp tục';seek(Number(e.target.value));};$('atlas').onclick=()=>{$('sheets').style.display=$('sheets').style.display==='block'?'none':'block';};
window.addEventListener('keydown',e=>{if(['INPUT','SELECT'].includes(document.activeElement.tagName))return;if(e.code==='Space'){e.preventDefault();if(!e.repeat)$('pause').click();}if(e.code==='KeyH'&&!e.repeat)document.body.classList.toggle('clean');if(e.code==='KeyA'&&!e.repeat)attack();if(e.key.startsWith('Arrow')){e.preventDefault();keys.add(e.key);}});window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>keys.clear());
function frame(now){const dt=Math.min(.05,(now-last)/1000||0);last=now;if(!paused){update(dt*speed);if(t>info()[2])reset();}try{render();}catch(e){errors.push(e.message);$('phase').textContent=e.message;paused=true;}requestAnimationFrame(frame);}
const paths=new Set([D.arena,...D.heroes,...Object.values(D.bundles).map(b=>b.image)]);
for(const hero of D.heroes)for(const dir of ['down','left','up','right'])for(let i=0;i<4;i++)paths.add(hero.replace('idle_down_0','walk_'+dir+'_'+i));
window.__artReview={select,seek,attack,reset,setPaused:v=>{paused=v;},gather:v=>{gathering=v;$('gather').checked=v;},setParty:v=>{party=v;$('party').value=v;reset();},step:dt=>{update(dt);render();},sample:()=>({mode,time:t,tuning:{...T},ultimate:mode==='ultimate'?ultimateLayout(t):null,disciples:disciples(),footprint:{sweepAtFeet:sweepContains(boss),sweepAtPlayer:sweepContains(player),fistAtPlayer:fistContains(player),spinAtPlayer:Math.hypot(player.x-boss.x,player.y-boss.y)<=T.spinRadius},player:{...player},boss:{...boss},party,peers:peers.map(p=>({...p})),trap:trap?{...trap}:null,shots:shots.map(p=>({...p})),attacks:attacks.map(p=>({...p})),handTarget,observed:[...observed],errors:[...errors],paused}),ready:false};
Promise.all([...paths].map(path=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images.set(path,im);resolve();};im.onerror=()=>reject(Error('Cannot load '+path));im.src=ROOT+path;}))).then(()=>{select('arena');window.__artReview.ready=true;$('loading').remove();requestAnimationFrame(frame);}).catch(e=>{errors.push(e.message);$('loading').textContent=e.message;});
