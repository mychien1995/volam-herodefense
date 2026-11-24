// Authoring-only timelines. These events never enter game-core or create damage.
export const directions={right:[1,0],down_right:[Math.SQRT1_2,Math.SQRT1_2],down:[0,1],down_left:[-Math.SQRT1_2,Math.SQRT1_2],left:[-1,0],up_left:[-Math.SQRT1_2,-Math.SQRT1_2],up:[0,-1],up_right:[Math.SQRT1_2,-Math.SQRT1_2]};
export const actions=[
 ['monk-combo','Thiền Sư · đủ 4 thức A'],['monk-thrust','Thiền Sư · chọc'],['monk-rising','Thiền Sư · hất'],['monk-sweep','Thiền Sư · quạt'],['monk-slam','Thiền Sư · đập'],
 ['fire-dash','Hỏa Long Xuyên Sơn'],['wind-retreat','Phong Quyển · option sóng'],['wind-crescent','Phong Quyển · option bán nguyệt'],['sonic-ink','Huyền Âm Chưởng'],['seven-swords','Thất Tinh Kiếm'],
 ['lightning-parry','Ngũ Lôi · phản sét khi bị đánh'],['five-swords','Thần Long Cửu Hiện'],['air-feathers','Cơ Quan · A ba lông vũ'],['air-bombs','Cơ Quan · Q bom băng'],['air-laser','Cơ Quan · E laze lướt'],['fan-three','Bạo Vũ · phóng, dừng, thu'],['eight-darts','Nhiếp Hồn · lướt và 8 hướng']
].map(([id,label])=>({id,label}));
const clamp=v=>Math.max(0,Math.min(1,v));
const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const moved=(a,b,start,end,arc=0)=>t=>{const u=clamp((t-start)/(end-start));const p=mix(a,b,u);return {...p,y:p.y-Math.sin(u*Math.PI)*arc,groundY:p.y}};
const at=(x,y)=>({x,y});
const air=p=>({...p,y:p.y-55,groundY:p.y});
const compact=new Set(['travel','sword','impact','parry','bolt','bomb','blast','feather','beam','contact']);
const frames=(prefix,n,d)=>Array.from({length:n},(_,i)=>prefix+(compact.has(prefix)?'':'_')+i+(d?'_'+d:''));
export function createComposition(id,direction='right',seed=1){
 if(!directions[direction])throw Error('Unknown direction');
 const [dx,dy]=directions[direction],origin=at(650,460),point=(distance,side=0)=>at(origin.x+dx*distance-dy*side,origin.y+dy*distance+dx*side);
 const cardinal=Math.abs(dx)>=Math.abs(dy)?dx>=0?'right':'left':dy>=0?'down':'up';
 const plan={id,direction,label:actions.find(a=>a.id===id)?.label,nodes:[],cues:[],duration:1800,note:'Thời lượng minh hoạ • không tính damage hoặc CC thật.'};
 if(!plan.label)throw Error('Unknown action');
 let serial=0;
 let randomState=seed>>>0;const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296};
 const add=(kind,texture,names,start,end,position,options={})=>{const node={id:kind+'-'+serial++,kind,texture,frames:names,start,end,position:typeof position==='function'?position:()=>position,frameMs:100,loop:false,...options};plan.nodes.push(node);return node};
 const cue=(at,label,type='phase',data={})=>plan.cues.push({at,label,type,...data});
 const body=(texture,names,start,end,pos=origin,options={})=>add('actor',texture,names,start,end,pos,options);
 const idle=(texture,start,end,pos=origin)=>body(texture,texture==='thien-su'?frames('idle',4,direction):['idle_0_'+direction],start,end,pos,{loop:true,frameMs:250});
 const effect=(texture,names,start,end,pos,options={})=>add('effect',texture,names,start,end,pos,{scale:.5,...options});
 const dummy=(pos,start=0,end=100000)=>add('dummy','bandit',['idle_down_0'],start,end,pos,{scale:.5});
 const impact=(texture,p,start,options={})=>effect(texture,texture==='fire-impact'?['ignite','rise','open','peak','break','fade1','fade2','end']:texture==='ink-impact'?['start','rise','spread','peak','scatter','fade1','fade2','end']:frames('impact',8),start,start+640,p,{frameMs:80,origin:[.5,.72],...options});
 const groundImpact=(p,start)=>effect('monk-fx',frames('slam',4),start,start+240,p,{frameMs:60,scale:.4});
 const travel=(texture,names,a,b,start,end,options={})=>effect(texture,names,start,end,moved(a,b,start,end),{loop:true,frameMs:65,...options});
 const raised=p=>at(p.x,p.y-22);
 const finish=(texture,t,p=origin)=>{idle(texture,t,t+500,p);plan.duration=t+500;cue(t,'Thu hồi hiệu ứng · về thế nghỉ','cleanup');cue(t+450,'Kết thúc','complete')};
 if(id.startsWith('monk-')){
  const beats=id==='monk-combo'?['thrust','rising','sweep','slam']:[id.slice(5)];
  const labels={thrust:'Chọc',rising:'Hất',sweep:'Quạt',slam:'Đập'};
  dummy(point(53));
  beats.forEach((beat,i)=>{
   const start=i*900;cue(start,labels[beat]+' · lấy đà');
   body(beat==='sweep'?'sweep-v3':'thien-su-v2',frames(beat,6,direction),start,start+600,origin,{frameMs:100});
   const trail=beat==='slam'?'overhead':beat;
   effect('monk-fx',frames('trail_'+trail+'_'+cardinal,4),start+270,start+470,origin,{scale:.34,frameMs:50});
   cue(start+300,labels[beat]+' · tiếp xúc','contact',{beat});
   if(beat==='slam')groundImpact(point(44),start+300);
   idle('thien-su',start+600,start+900);cue(start+600,labels[beat]+' · hồi thế');
  });
  finish('thien-su',beats.length*900);plan.note='Chọc / hất / quạt ngang phải → trái / đập · hai tay, cùng tỷ lệ idle.';
 }else if(id==='fire-dash'){
  [75,130,185].forEach(n=>dummy(point(n)));
  const end=point(185);cue(0,'Tụ chưởng');body('cai-bang-fire-body',['gather_'+direction,'palm_'+direction],0,260,origin,{frameMs:130});
  body('cai-bang-fire-body',['dash_'+direction],260,840,moved(origin,end,260,840));cue(260,'Đầu rồng dẫn đường · lướt xuyên','release');
  travel('fire-dragon',frames('travel',4,direction).map(n=>n.replace('travel_','travel')),raised(point(28)),raised(at(end.x+dx*28,end.y+dy*28)),260,840,{scale:.45});
  for(let i=0;i<6;i++){const s=280+i*75;effect('fire-trail',['start','flow','break','fade'],s,s+520,point(i*29),{frameMs:130,scale:.3,rotation:Math.atan2(dy,dx),depthOffset:-3})}
  impact('fire-impact',end,840);cue(840,'Nổ đúng cuối đường lướt','impact',{point:end});
  body('cai-bang-fire-body',['recover_'+direction],840,1480,end);body('cai-bang-fire-body',['gather_'+direction],1480,1980,end);plan.duration=1980;cue(1480,'Vệt lửa tắt · hồi thế','cleanup');cue(1900,'Kết thúc','complete');plan.note='Đi xuyên các mục tiêu; vệt lửa chỉ trang trí; nổ tại điểm cuối, không dừng ở địch đầu tiên.';
 }else if(id==='wind-retreat'||id==='wind-crescent'){
  const destination=point(-78),gather=point(245);
  [-65,0,65].forEach((side,i)=>dummy(t=>moved(point(185+i*80,side),point(245,(i-1)*10),50,330)(t)));
  cue(0,'Nhịp 1 · giật lùi và hút nhanh, xa hơn');body('thien-son-retreat-body',['brace_'+direction,'pushback_'+direction,'retreat_'+direction,'plant_'+direction],0,420,moved(origin,destination,50,330),{frameMs:105});
  effect('wind-gather',['start','inward1','inward2','gather','tight','break','fade','end'],50,530,gather,{scale:1,frameMs:60,depthOffset:-2});
  cue(420,'Nhịp 2 · phất quạt sau khi đã lùi','release');body('thien-son-gust-body',['fanback_'+direction,'sweep_'+direction,'release_'+direction,'recover_'+direction],420,900,destination,{frameMs:120});
  travel(id==='wind-crescent'?'wind-crescent-v2':'wind-wave-v2',frames('travel',4,direction),raised(destination),raised(point(315)),660,1370,{scale:.65});cue(1240,'Gió xuyên qua vùng đã gom','impact',{point:gather});
  idle('phien',900,1750,destination);plan.duration=1750;cue(1420,'Gió tan · về thế nghỉ','cleanup');cue(1670,'Kết thúc','complete');plan.note='Hai thiết kế projectile chờ chọn; hút trong 280 ms từ vùng xa hơn. Thông số minh hoạ, chưa cân bằng combat.';
 }else if(id==='sonic-ink'){
  const target=point(185);dummy(target);cue(0,'Lấy đà song chưởng');body('vdq',['charge_'+direction,'palm_release_'+direction,'recover_'+direction],0,600,origin,{frameMs:200});
  cue(200,'Phóng sóng âm rộng','release');travel('sonic-wave',frames('travel',4,direction).map(n=>n.replace('travel_','travel')),raised(point(20)),raised(target),200,800,{scale:.65});
  const spots=[];for(let i=0;i<5;i++){const angle=(i+random()*.55)*Math.PI*2/5,radius=50+random()*40,p=at(target.x+Math.cos(angle)*radius,target.y+Math.sin(angle)*radius*.7);spots.push(p);impact('ink-impact',p,800);cue(800,'Bãi mực '+(i+1)+' quanh target','ink-impact',{index:i,point:p})}cue(800,'Nổ 5 bãi mực ngẫu nhiên quanh target','impact',{point:target,spots});idle('vdq',600,1500);finish('vdq',1500);plan.note='Năm bãi mực đổi vị trí mỗi lượt phát, quanh target; RNG/CC thật chờ server tích hợp.';
 }else if(id==='seven-swords'){
  const target=point(160);dummy(target);cue(0,'Gọi kiếm');body('vdk',['charge_'+direction,'sword_raise_'+direction,'channel_'+direction],0,1000,origin,{frameMs:180});
  const offsets=[[-30,-14],[17,18],[-4,0],[35,-8],[-24,20],[8,-20],[23,3]];
  offsets.forEach(([x,y],i)=>{const p=at(target.x+x,target.y+y),s=220+i*55;travel('sword-rain-impact',frames('sword',4),at(p.x,p.y-150),p,s,s+430,{scale:.48});impact('sword-rain-impact',p,s+430,{scale:.55});cue(s+430,'Kiếm '+(i+1)+' chạm đất','sword-impact',{index:i,point:p})});
  idle('vdk',1000,1700);finish('vdk',1700);plan.note='Bảy kiếm rơi dồn dập lần lượt; không có vòng khoá/báo vùng trước.';
 }else if(id==='lightning-parry'){
  const enemy=point(100),contact=raised(point(19));dummy(enemy);idle('thien-su',0,430);cue(0,'Đòn địch đang tới');
  travel('dm-fx',['arrow'],raised(enemy),contact,120,430,{scale:.55,rotation:Math.atan2(-dy,-dx)});
  body('thien-su',['parry_'+direction],430,850);cue(430,'Chặn đòn trực tiếp · phản sét','negate',{point:contact});
  effect('lightning-parry',frames('parry',4),430,750,contact,{frameMs:80});
  effect('lightning-parry',frames('bolt',4),510,830,contact,{frameMs:80,beam:{from:()=>contact,to:()=>raised(enemy)}});
  finish('thien-su',850);plan.note='Minh hoạ Q nội tại kích hoạt khi bị đánh; không phải động tác bấm Q chủ động, chưa tính xác suất/negate thật.';
 }else if(id==='five-swords'){
  body('cls',['star_raise_'+direction,'star_hold_'+direction],0,2150,origin,{frameMs:200});cue(0,'Dựng năm kiếm · mở trận');
  const starLayout={scaleX:1.75,scaleY:1.05,origin:[.5,148/256],depthOffset:-100};
  effect('lightning-star',['open0','open1','hold0','hold1'],250,1900,origin,{frameMs:140,loop:true,...starLayout});
  // Sockets measured on hold0's actual raster, rather than an unrelated regular pentagon.
  [[128,98],[187,130],[166,188],[89,188],[70,130]].forEach(([x,y],i)=>{const p=at(origin.x+(x-128)*1.75,origin.y+(y-148)*1.05);effect('kunlun-fx',['anchor_0'],250,1900,p,{scale:.56,origin:[.5,.5]});effect('kunlun-fx',['violet_impact_0'],1900,2300,p,{scale:.58,fade:true,origin:[.5,.5]});cue(1900,'Kiếm '+(i+1)+' nổ cuối trận','formation-impact',{index:i,point:p,stun:false})});
  cue(250,'Năm đỉnh nối thành ngôi sao năm cánh');effect('lightning-star',['end0','end1','fade0','fade1'],1900,2300,origin,{frameMs:100,...starLayout});idle('cls',2150,2300);finish('cls',2300);plan.note='Năm kiếm bố trí rộng, nối ngôi sao; năm vụ nổ đồng thời, không có stun cuối trận.';
 }else if(['air-feathers','air-bombs','air-laser'].includes(id)){
  const target=point(180);dummy(target);const oldpos=air(origin);
  if(id==='air-feathers'){
   body('co-quan-air-body',['hover_'+direction,'bombthrow_'+direction,'hover_'+direction],0,1100,oldpos,{frameMs:200});cue(200,'Phóng ba lông vũ hình nón','release');
   [-.23,0,.23].forEach((angle,i)=>{const a=Math.atan2(dy,dx)+angle,p=at(origin.x+Math.cos(a)*215,origin.y+Math.sin(a)*215-31);travel('dm-fx',['feather'],at(oldpos.x+dx*18,oldpos.y-20),p,200,1000,{scale:.55,rotation:a});cue(1000,'Lông vũ '+(i+1)+' hết hành trình','projectile-end',{index:i})});
   body('co-quan-air-body',['hover_'+direction],1100,1600,oldpos);plan.duration=1600;cue(1100,'Về tư thế bay','cleanup');
  }else if(id==='air-bombs'){
   body('co-quan-air-q',['ready_'+direction,'windup_'+direction,'throw_'+direction,'recover_'+direction],0,600,oldpos,{frameMs:150});cue(300,'Ném ba bom quanh target','release');
   [[-26,18],[23,-13],[8,29]].forEach(([x,y],i)=>{const p=at(target.x+x,target.y+y),s=300+i*70;effect('ice-bomb',frames('bomb',4),s,s+570,moved(raised(oldpos),p,s,s+570,42),{loop:true,frameMs:90,scale:.175});effect('ice-bomb',frames('blast',8),s+570,s+1210,p,{frameMs:80,origin:[.5,.72],scale:.6});cue(s+570,'Bom '+(i+1)+' nổ băng','bomb-impact',{index:i,point:p})});
   body('co-quan-air-body',['hover_'+direction],600,2200,oldpos);plan.duration=2200;cue(1720,'Băng tan · giữ tư thế bay','cleanup');plan.note='Ba vị trí minh hoạ cố định để duyệt; RNG quanh target sẽ do server quyết định khi tích hợp.';
  }else{
   const end=point(170),moving=t=>air(moved(origin,end,380,1050)(t));
   body('co-quan-air-e',['aimdown_'+direction,'lean_'+direction,'dash_'+direction,'brake_'+direction],0,1250,moving,{frameMs:310});cue(180,'Chiếu laze xuống đất','release');
   const hand=t=>{const p=moving(t);return at(p.x+dx*16,p.y-20)},contact=t=>{const p=moved(origin,end,380,1050)(t);return at(p.x+dx*35,p.y+dy*35)};
   effect('laser-ground',frames('beam',4),180,1100,hand,{loop:true,frameMs:60,beam:{from:hand,to:contact}});
   effect('laser-ground',frames('contact',4),180,1100,contact,{loop:true,frameMs:80,scale:.55,depthOffset:-1});
   effect('laser-ground',frames('beam',4),380,1100,origin,{loop:true,beam:{from:()=>point(35),to:contact},beamWidth:.6,depthOffset:-2});
   cue(380,'Lướt trên không · kéo đường laze','dash');cue(1050,'Kết thúc đường lướt','impact',{point:end});body('co-quan-air-body',['hover_'+direction],1250,1750,air(end));plan.duration=1750;cue(1250,'Tắt laze · về tư thế bay','cleanup');
  }
  cue(plan.duration-80,'Kết thúc','complete');
 }else if(id==='fan-three'){
  const end=point(165);dummy(end);body('phien',['windup_'+direction,'fan_throw_'+direction],0,120,origin,{frameMs:60});body('phien',['fan_throw_'+direction],120,2550);body('phien',['fan_catch_'+direction],2550,2800);cue(0,'E lần 1 · phóng quạt','release');
  travel('fan',frames('spin',4),raised(point(15)),raised(end),120,720,{scale:1,frameMs:75});effect('fan',frames('spin',4),720,1970,raised(end),{scale:1,loop:true,frameMs:75});cue(720,'E lần 2 · dừng, tiếp tục xoay','stop');
  travel('fan',frames('spin',4),raised(end),raised(origin),1970,2550,{scale:1,frameMs:75});cue(1970,'E lần 3 · thu quạt','recall');finish('phien',2800);plan.note='Ba lần E được dàn dựng tự động để xem trọn nhịp. Điều khiển/mana thật chờ tích hợp.';
 }else if(id==='eight-darts'){
  const end=point(110);cue(0,'Lấy đà');body('dma',['ready_'+direction],0,160);body('dma',['dash_'+direction],160,570,moved(origin,end,160,570));cue(160,'Lướt','dash');
  body('dma',['release_'+direction,'recover_'+direction],570,850,end,{frameMs:140});
  for(let i=0;i<8;i++){const a=i*Math.PI/4,p=at(end.x+Math.cos(a)*150,end.y+Math.sin(a)*150-20);travel('dm-fx',['knife'],raised(end),p,570,1110,{scale:.55,rotation:a});cue(570,'Ám khí hướng '+(i+1),'dart-release',{index:i})}
  idle('dma',850,1200,end);finish('dma',1200,end);plan.note='Tám ám khí bắt đầu sau khi lướt xong; body/ám khí tái sử dụng, không phát trước khi lướt.';
 }
 if(!plan.cues.some(c=>c.type==='complete'))cue(plan.duration-50,'Kết thúc','complete');
 plan.cues.sort((a,b)=>a.at-b.at);return plan;
}
