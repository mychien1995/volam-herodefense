const $=s=>document.querySelector(s),canvas=$('canvas'),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
const base='/assets/exports/bosses/hoan_nhan_hong_liet_v01/';
const clips=[
['idle','Boss · đứng yên',2],['walk','Boss · đi bộ',2.4],['thrust','A1 · chọc đao tầm dài',2],
['sweep','A2 · chém 180° phía trước',2.2],['stomp','Dung Nham Liệt Địa',3.6],
['volcano','Hỏa Sơn Bạo Phát',5],['lava','Liệt Diễm Phong Tỏa',14],
['archers','Hỏa Tiễn Tề Phát',6],['infantry','Thiết Kỵ Triệu Binh',5],
['meteors','Vạn Lý Nham Hỏa',8.4],['cannons','Hỏa Pháo Thiên La',8],['overview','Arena · tổng quan',2]];
const state={clip:'idle',dir:'down',time:0,playing:true,speed:1,zoom:1,sheet:false,heroes:true,asset:'boss_locomotion'};
const assets=new Map(),seen=new Map(),errors=[],history=[];let previous=0,ready=false;
const directions={down:[0,1],left:[-1,0],right:[1,0],up:[0,-1]};
for(const [id,name]of clips)$('#clip').add(new Option(name,id));
function img(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Không tải được '+src));im.src=src;});}
function label(text,x,y,color='#f9dfaa'){ctx.font='12px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#17100be8';ctx.strokeText(text,Math.round(x),Math.round(y));ctx.fillStyle=color;ctx.fillText(text,Math.round(x),Math.round(y));}
function command(list,id,frame,x,y,scale=1,depth=y,angle=0,alpha=1){
 const a=assets.get(id);if(!a||!a.frames[frame])throw Error('Thiếu frame '+id+':'+frame);
 list.push({a,id,frame,x,y,scale,depth,angle,alpha});
}
function drawCommand(o){const f=o.a.frames[o.frame].frame,s=o.scale,origin=o.a.origin;
 ctx.save();ctx.translate(Math.round(o.x),Math.round(o.y));ctx.rotate(o.angle);ctx.globalAlpha=o.alpha;
 ctx.drawImage(o.a.image,f.x,f.y,f.w,f.h,Math.round(-f.w*origin[0]*s),Math.round(-f.h*origin[1]*s),Math.round(f.w*s),Math.round(f.h*s));ctx.restore();
 if(!seen.has(o.id))seen.set(o.id,new Set());seen.get(o.id).add(o.frame);
}
const flat=(id,i)=>{const a=assets.get(id);return Object.keys(a.frames)[Math.min(Object.keys(a.frames).length-1,Math.max(0,i))];};
function fx(list,id,i,x,y,s=1,depth=0,angle=0,alpha=1){command(list,id,flat(id,i),x,y,s,depth,angle,alpha);}
function boss(list,id,tag,x,y){command(list,id,tag,x,y);}
function lerp(a,b,t){return a+(b-a)*Math.max(0,Math.min(1,t));}
function phase(t,warn,active,end){return t<warn?'CẢNH BÁO':t<active?'RA ĐÒN':t<end?'TỒN TẠI / HỒI PHỤC':'KẾT THÚC';}
function eruption(list,id,t,x,y,scale=1,meteor=false){
 if(t<0||t>2.5)return;
 let n=t<.85?Math.min(1,Math.floor(t/.43)):t<1.2?2+Math.min(1,Math.floor((t-.85)/.175)):t<1.6?4+Math.min(1,Math.floor((t-1.2)/.2)):t<2?6:7;
 if(meteor&&n>=2&&n<=3&&assets.has('vfx_meteor_safe'))fx(list,'vfx_meteor_safe',n-2,x,y,scale,y+160);
 else fx(list,id,n,x,y,scale,n<2||n===7?0:y+140);
}
function scene(t){
 const list=[],dir=state.dir,[dx,dy]=directions[dir],clip=state.clip;
 let bx=640,by=430,stage='NGHỈ',note='Mỹ thuật thử nghiệm · chưa có hitbox/damage thật';
 let poseId='boss_locomotion',pose=dir+'_idle_'+(Math.floor(t/.4)%2?'b':'a');
 if(clip==='walk'){const n=Math.floor(t/.12)%4;pose=dir+'_walk_'+['a','b','c','d'][n];bx+=Math.round(Math.sin(t*Math.PI/1.2)*65);by+=Math.round(Math.cos(t*Math.PI/1.2)*22);stage='ĐI BỘ';note='4 hướng · chân trụ cố định · plume / áo choàng chuyển động';}
 if(['thrust','sweep'].includes(clip)){
  stage=phase(t,.7,1.05,1.45);const local=t-.7,n=local<0?0:Math.min(3,Math.floor(local/.105));
  poseId=clip==='thrust'&&['up','down'].includes(dir)&&assets.has('boss_thrust_vertical')?'boss_thrust_vertical':'boss_basics';
  pose=dir+'_'+clip+'_'+n;
  if(poseId==='boss_thrust_vertical'&&(n===0||n===3))poseId='boss_basics';
  if(t<1.4){const fi=t<.7?0:Math.min(3,1+Math.floor((t-.7)/.13));const angle=clip==='thrust'?Math.atan2(dy,dx):({down:0,left:Math.PI/2,right:-Math.PI/2,up:Math.PI})[dir];
   fx(list,'vfx_basics',(clip==='sweep'?4:0)+fi,bx+dx*(clip==='thrust'?110:0),by+dy*(clip==='thrust'?110:0),clip==='thrust'?1.15:1.05,by+10,angle);}
  note=clip==='thrust'?'Chọc đao: vươn xa, làn hẹp · khóa hướng khi lấy đà':'Chém: 180° trước mặt · phía sau không có vệt sát thương';
 }
 if(clip==='stomp'){
  stage=phase(t,1,1.3,2.7);note='Dẫm đất · sóng chấn động rộng · minh họa choáng quanh boss';
  poseId='boss_casts';pose=dir+'_stomp_'+(t<1?0:t<1.3?1:2);
  if(t<2.7){const n=t<1?Math.min(1,Math.floor(t/.5)):Math.min(7,2+Math.floor((t-1)/.2));fx(list,'vfx_stomp',n,bx,by,1.9,0);}
 }
 if(['volcano','meteors','archers','infantry','cannons'].includes(clip)){
  if(t<1.5){poseId='boss_casts';pose=dir+'_command_'+(t<.4?0:t<1.05?1:2);}
 }
 if(clip==='volcano'){
  stage=t<1.15?'CẢNH BÁO CÁC ĐIỂM':t<3.3?'NÚI DUNG NHAM TRỒI LÊN':'NGUỘI / KẾT THÚC';
  note='5 điểm · cảnh báo có dấu X · núi mọc từ đất';
  [[470,420],[735,400],[850,540],[515,620],[735,660]].forEach(([x,y],i)=>eruption(list,'vfx_volcano',t-.15-i*.16,x,y,.9));
 }
 if(clip==='lava'){
  bx=dir==='right'?390:dir==='left'?900:640;by=dir==='down'?320:dir==='up'?640:475;
  stage=t<1?'CẢNH BÁO LÀN':t<1.8?'VẨY NHAM THẠCH':t<12?'NHAM THẠCH ĐANG TỒN TẠI':'ĐÃ NGUỘI';
  note='Đường rộng / dài · giữ 10 giây trong bản thử · đi qua là vùng nguy hiểm';
  poseId='boss_basics';pose=dir+'_sweep_'+(t<1?0:t<1.15?1:t<1.4?2:3);
  let n=t<1?0:t<1.25?1:t<1.5?2:t<1.8?3:t<12?4+Math.floor(t/.18)%3:7;
  fx(list,'vfx_lava_lane',n,bx+dx*275,by+dy*275,1.55,0,Math.atan2(dy,dx));
 }
 if(clip==='archers'||clip==='infantry'){
  const ar=clip==='archers';stage=t<.9?'HIỆU LỆNH':t<2?'QUÂN TIẾN VÀO':ar?'CUNG THỦ BẮN LOẠT':'THIẾT BINH ÁP SÁT';
  note=ar?'Cung thủ triệu hồi · tên bay thẳng tới điểm đã khóa':'Quân Mông Cổ đi bộ theo concept · chưa có ngựa';
  for(let i=0;i<4;i++){if(t<.8)continue;const sign=i<2?-1:1,sy=420+(i%2)*95,ex=ar?(sign<0?400:880):(sign<0?570:710),x=lerp(sign<0?260:1020,ex,(t-.8)/1.2),d=sign<0?'right':'left';
   let tag=d+'_'+(t<2?'walk_'+Math.floor(t/.12)%4:t<2.4?'idle_'+Math.floor(t/.4)%2:'attack_'+Math.floor((t-2.4)/.22)%2);
   command(list,ar?'minion_archer':'minion_infantry',tag,x,sy);
   if(ar&&t>2.4){const p=((t-2.4)+i*.15)%.85,u=p/.85;const sx=ex,tx=sign<0?750:530;fx(list,'vfx_arrows',Math.floor(t/.08)%4,lerp(sx,tx,u),sy-21,0.6,sy+5,sign<0?0:Math.PI);}
  }
 }
 if(clip==='meteors'){
  stage=t<1.1?'CẢNH BÁO ĐỢT ĐẦU':t<6.2?'THIÊN THẠCH DỒN DẬP':'TÀN LỬA';
  note='12 điểm / 3 đợt · AOE lớn hơn Hỏa Sơn · từng điểm báo trước';
  const pts=[[410,400],[660,530],[870,650],[820,400],[480,630],[650,720],[520,420],[820,590],[380,690],[720,400],[510,580],[900,690]];
  pts.forEach(([x,y],i)=>eruption(list,'vfx_meteor',t-.3-i*.38,x,y,1.1,true));
 }
 if(clip==='cannons'){
  stage=t<1.6?'CẢNH BÁO HAI LÀN NGANG':t<3.3?'PHÁO BẮN NGANG':t<4.5?'CẢNH BÁO HAI LÀN DỌC':t<6.2?'PHÁO BẮN DỌC':'THU PHÁO';
  note='Hỏa Pháo Thiên La · 2 ngang + 2 dọc = ô cửa sổ · bắn so le';
  const activeH=t>=1.6&&t<3.3,activeV=t>=4.5&&t<6.2;
  if(t<6.8){
   const cannonPose=active=>active?'fire_0':t>6.2?'recover_0':'charge_0';
   function hardware(direction,active,x,y){
    if(assets.has('cannon_clean')){
     // Select observed side direction. Side rest/recoil source rows disagree;
     // retain the valid side pose while separately animated VFX fire.
     const col=direction==='left'?'right':direction==='right'?'left':direction;
     const tag=['left','right'].includes(direction)?'recoil_'+col:(active&&Math.floor(t/.12)%2?'recoil_':'rest_')+direction;
     command(list,'cannon_clean',tag,x,y);
     if(active)fx(list,'vfx_basics',1,x+directions[direction][0]*36,y-20+directions[direction][1]*30,.20,y+6,Math.atan2(directions[direction][1],directions[direction][0]));
    }else command(list,'cannon',direction+'_'+cannonPose(active),x,y);
   }
   [450,650].forEach(y=>{hardware('right',activeH,340,y);hardware('left',activeH,940,y);});
   [500,780].forEach(x=>{hardware('down',activeV,x,330);hardware('up',activeV,x,735);});
   if(t<3.3){[450,650].forEach(y=>{if(t<1.6)fx(list,'vfx_lava_lane',0,640,y,1.48,0);else for(let j=0;j<4;j++){let u=((t-1.6)*1.1+j*.25)%1;fx(list,'vfx_basics',1,lerp(370,910,u),y-12,.35,y+5);}});}
   if(t>=3.3&&t<6.2){[500,780].forEach(x=>{if(t<4.5)fx(list,'vfx_lava_lane',0,x,535,1.1,0,Math.PI/2);else for(let j=0;j<4;j++){let u=((t-4.5)*1.3+j*.25)%1;fx(list,'vfx_basics',1,x,lerp(360,705,u),.35,740,Math.PI/2);}});}
  }
 }
 if(clip==='overview'){stage='ĐẠI BẢN DOANH MÔNG CỔ';note='Concept arena có sẵn · sân giữa thoáng · dung nham ngoài hàng rào';}
 if(clip!=='overview')boss(list,poseId,pose,bx,by);
 if(state.heroes&&clip!=='overview'){
  const pts=[[545,505],[645,590],[755,500],[815,650],[465,620],[580,685]];
  pts.forEach(([x,y],i)=>{const f='idle_down_'+(Math.floor(t/.4)%2);command(list,'hero',f,x,y,1,y);});
 }
 list.sort((a,b)=>a.depth-b.depth).forEach(drawCommand);
 if(clip!=='overview'){label('Hoàn Nhan Hồng Liệt',bx,by-80);if(state.heroes){label('Hero 44px',545,521,'#deecdd');if(clip==='stomp'&&t>=1&&t<2){label('CHOÁNG · minh họa',545,470,'#ffdc79');label('CHOÁNG · minh họa',755,465,'#ffdc79');}}}
 $('#stage strong').textContent=stage;$('#stage small').textContent=note;
 return {stage,note,boss:[bx,by],draws:list.map(o=>({asset:o.id,frame:o.frame,x:Math.round(o.x),y:Math.round(o.y)}))};
}
let lastRender={};
function render(){
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,1280,800);ctx.imageSmoothingEnabled=false;
 if(!ready)return;
 if(state.sheet){
  ctx.fillStyle='#58baa9';ctx.fillRect(0,0,1280,800);const a=assets.get(state.asset);
  const s=Math.min(1180/a.image.width,620/a.image.height);ctx.drawImage(a.image,0,0,a.image.width,a.image.height,50,140,Math.round(a.image.width*s),Math.round(a.image.height*s));label(state.asset+' · '+Object.keys(a.frames).length+' cels',640,120);
 }else{
  const overview=state.clip==='overview',z=overview?.6:state.zoom;ctx.save();ctx.translate(640,400);ctx.scale(z,z);ctx.translate(-640,-400);
  ctx.drawImage(assets.get('arena').image,13,-220);lastRender=scene(state.time);ctx.restore();
 }
 $('#seek').value=String(state.time/clips.find(c=>c[0]===state.clip)[2]*1000);
 $('#time').textContent=state.time.toFixed(2)+' / '+clips.find(c=>c[0]===state.clip)[2].toFixed(1)+'s';
}
function selectClip(id){if(!clips.some(c=>c[0]===id))throw Error('unknown clip '+id);state.clip=id;state.time=0;$('#clip').value=id;if(id==='lava')selectDir('right');render();}
function selectDir(d){state.dir=d;document.querySelectorAll('[data-dir]').forEach(b=>b.classList.toggle('active',b.dataset.dir===d));render();}
$('#clip').onchange=e=>selectClip(e.target.value);$('#directions').onclick=e=>{if(e.target.dataset.dir)selectDir(e.target.dataset.dir);};
$('#play').onclick=()=>{state.playing=!state.playing;$('#play').textContent=state.playing?'Tạm dừng':'Chạy';};
$('#restart').onclick=()=>{state.time=0;render();};$('#speed').onchange=e=>state.speed=Number(e.target.value);
$('#zoom').onchange=e=>{state.zoom=Number(e.target.value);render();};$('#heroes').onchange=e=>{state.heroes=e.target.checked;render();};
$('#seek').oninput=e=>{state.playing=false;$('#play').textContent='Chạy';state.time=Number(e.target.value)/1000*clips.find(c=>c[0]===state.clip)[2];render();};
$('#info').onclick=()=>$('#details').classList.toggle('visible');
$('#sheet').onclick=()=>{state.sheet=!state.sheet;document.body.classList.toggle('sheet',state.sheet);$('#sheet').classList.toggle('active',state.sheet);render();};
$('#asset').onchange=e=>{state.asset=e.target.value;render();};
function tick(ts){if(ready&&state.playing){const dt=Math.min(.1,(ts-previous)/1000)*state.speed,period=clips.find(c=>c[0]===state.clip)[2];state.time=(state.time+dt)%period;}previous=ts;render();requestAnimationFrame(tick);}
try{
 const manifest=await fetch(base+'manifest.json').then(r=>r.json());
 await Promise.all(manifest.assets.map(async a=>{const atlas=await fetch('/'+a.atlas).then(r=>r.json()),image=await img('/'+a.sheet);assets.set(a.id,{...a,frames:atlas.frames,image});$('#asset').add(new Option(a.nameVi||a.id,a.id));}));
 const heroAtlas=await fetch('/assets/exports/characters/hero_vo_dang.json').then(r=>r.json());
 assets.set('hero',{frames:heroAtlas.frames,image:await img('/assets/exports/characters/hero_vo_dang.png'),origin:[.5,.8]});
 assets.set('arena',{image:await img('/assets/concepts/arenas/mongolian-headquarters/arena_overview.png')});
 ready=true;$('#hint').textContent='Kéo thanh để xem từng pha';render();
 window.artReview={ready:true,clips:clips.map(c=>c[0]),assets:[...assets.keys()],set({clip,dir,time,playing=false,zoom=1,heroes=true}={}){
  state.playing=playing;state.zoom=zoom;state.heroes=heroes;state.sheet=false;document.body.classList.remove('sheet');if(clip)selectClip(clip);if(dir)selectDir(dir);if(time!==undefined)state.time=time;render();return this.snapshot();},
 snapshot(){return {state:{...state},...lastRender,observed:Object.fromEntries([...seen].map(([k,v])=>[k,[...v]])),errors:[...errors],canvas:[canvas.width,canvas.height],runtimeIntegrated:false};},
 inspectFrame(id,frame){const a=assets.get(id);state.sheet=false;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#58baa9';ctx.fillRect(0,0,1280,800);drawCommand({a,id,frame,x:640,y:560,scale:2,depth:0,angle:0,alpha:1});return this.snapshot();}};
}catch(e){errors.push(String(e));$('#error').textContent=String(e);$('#details').classList.add('visible');console.error(e);}
requestAnimationFrame(tick);
