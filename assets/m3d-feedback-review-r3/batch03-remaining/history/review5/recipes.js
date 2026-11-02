// Only independent art presentation. No game data, server events, damage or AI.
export const items=[
 ['thien_ha_vo_cau','Thiên Hạ Vô Cẩu',['Chó lửa · xoay · đập'],'Khôi phục bốn chó lửa runtime; vòng xoay rộng hơn, loop +30%, điểm đập neo đúng mặt đất tại feet.'],
 ['liet_phong_dao','Liệt Phong Đao',['Đao trên đầu → chém xuống đất'],'Chuôi bắt đầu trên đầu; trái dùng phản chiếu ngang của đao phải, giữ lưỡi xuống/sống lên. Ground-break runtime giữ lại.'],
 ['thieu_lam_a','Thiếu Lâm Quyền · A',['Chuỗi A thủ công'],'Mỗi A một nhịp: đấm / đấm / đá / roundhouse + một cước kình. CD 1s; nghỉ >2s mới bắt đầu CD.'],
 ['vi_da_quyen','Vi Đà Quyền',['Vụ nổ phía trước'],'Tâm vụ nổ xa người +50%.'],
 ['vo_anh_cuoc','Vô Ảnh Cước',['Ba làn chân bậc thang'],'Gốc giữa thân; phát lần lượt làn trên / giữa / dưới, ba đường thẳng song song. Hướng dọc dùng ba làn ngang tương ứng.'],
 ['toan_phong_thoai','Toàn Phong Thoái',['Lốc vàng xuyên'],'Lốc vàng đi thẳng xuyên mục tiêu; mỗi mục tiêu một impact trong fixture.'],
 ['nhu_lai_niet_ban','Như Lai Niết Bàn',['Phật · chưởng trời · chữ Phạn'],'Phật sau lưng; chưởng trời; ground field cố định. Minh họa impact khi mục tiêu bước vào.'],
 ['tru_ta','Tru Tà',['Rút đao · một nhát chém rộng'],'Một nhát chém tại chỗ; phóng đại vệt chém, không projectile/bán nguyệt bay.'],
 ['kim_quang_ho_tran','Kim Quang Hộ Trận',['Aura thoáng giữa'],'Aura sau nhân vật, giảm opacity, chừa trung tâm; bám feet khi di chuyển.'],
 ['su_tu_hong','Sư Tử Hống',['Đầu sư tử · sóng rộng'],'Thay Tam Giới Quy Thiền: đầu sư tử ngẩng hống, sóng AoE; giảm giáp + slow là nhãn contract.'],
 ['ly_mac_sau_normal','Lý Mạc Sầu · A',['Phất trần 360°','Độc châm xa'],'Whisk ring mới và độc châm giữ art cũ; mốc so sánh là đòn A Cái Bang Chưởng/Thiên Sơn Phiến.'],
 ['co_mo_kiem_phap','Cổ Mộ Kiếm Pháp',['4 minion','6 minion','8 minion'],'Mỗi minion có phát bắn riêng, không chỉ minion đầu. 4/6/8 là lựa chọn review, chưa RNG gameplay.'],
 ['hong_liet_a1_a2','Hồng Liệt · A1 / A2',['A1 · 5 đường đao','A2 · vòng cung'],'A1 năm instance, quãng +20%; A2 minh họa mốc A Thiên Sơn Phiến +10%.'],
 ['tuy_tien_bo','Túy Tiên Bộ',['Xoay lướt runtime + chưởng'],'Giữ sprite spin, bóng lưu, vòng xoay và wind runtime. Chỉ bổ sung chưởng nhắm vị trí player lúc phát; không thay body thành bay/đánh chưởng.'],
 ['can_khon_phan_chan','Càn Khôn Phản Chấn',['Hút toàn arena'],'Minh họa hút sáu người từ mép arena về boss; không lấy vòng art làm giới hạn range.'],
 ['am_duong_nghich_chuyen','Âm Dương Nghịch Chuyển',['Vòng âm dương di chuyển'],'Khôi phục rotating_ring/rotating_waves runtime, các tâm liên tục đổi vị trí không lưới cố định; chỉ bỏ core large_formation to mờ.'],
 ['hoac_do_darts','Hoắc Đô · ám khí',['Phiến Trung Độc Đinh','Cuồng Phong Vạn Nhận'],'Khôi phục đúng raster, scale0.25 và pattern runtime; chỉ tăng brightness projectile. Giữ spin/whirlwind của Vạn Nhận.'],
 ['dat_nhi_ba','Đạt Nhĩ Ba',['Đập liên tiếp','Bất Động Kim Cang'],'Telegraph demo ngắn; shield tắt người cũ/bật người mới, không beam chuyển. Body action hướng dưới.'],
 ['kim_luan_normal','Kim Luân · A',['Kim luân tròn nhanh','Đao khí bán nguyệt'],'Wheel tròn mới, bay nhanh; bán nguyệt dùng chung source chi vàng với cước kình, scale lớn hơn. Body chém tay mới bốn hướng; các action cũ giữ hướng dưới.'],
 ['kim_luan_truy_hon','Kim Luân Truy Hồn',['7 luân bật quanh arena'],'Giữ mô tả gốc: luân đập quanh arena rất lâu; 5→7. Bay tỏa360°, phản xạ ở biên, không thành các đường song song hoặc đuổi mục tiêu.'],
 ['ngu_luan_ho_the','Ngũ Luân Hộ Thể',['7 luân xoay → bắn 7 phía'],'Giữ cơ chế gốc: xoay quanh boss rồi bắn tỏa ra; chỉ 5→7. Radius145, xoay3s và release680 là mốc runtime đã có, không tuning mới.'],
 ['arena_backgrounds','Nền arena boss',['So sánh bốn arena'],'Mới nhất: rộng×1.1 và dài×1.1 so với game hiện tại, diện tích×1.21. Thay quyết định thu nhỏ, không cộng10% trên bản0.8.'],
].map(([id,title,variants,note])=>({id,title,variants,note}));

export const arenaReview={current:{x:70,y:100,width:500,height:190},proposed:{x:45,y:90.5,width:550,height:209},linearMultiplier:1.1,areaMultiplier:1.21,basis:'Current in-game arena before the unimplemented0.8 proposal; viewer rectangles are presentation only'};
// Measured mid-stance soles in retained channel cels; the source's global pivot follows one foot.
export const kimChannelFeet={channel_0:[79.5,133],channel_1:[89.5,128],channel_2:[94.5,128],channel_3:[97,128]};

// Presentation trajectories only; these must never be imported by game-core/server.
export function positionAt(e,time){
 const t=Math.max(0,time+(e.timeOffset??0));
 const p=Math.max(0,Math.min(1,(t-(e.travelStart??e.start))/((e.travelEnd??e.end)-(e.travelStart??e.start)||1)));
 let x=e.from[0]+(e.to?.[0]-e.from[0]||0)*p,y=e.from[1]+(e.to?.[1]-e.from[1]||0)*p;
 if(e.motion==='arena-bounce'){
  const age=Math.max(0,t-e.start)/1000,b=e.bounds,r=e.wheelRadius??14;
  const reflect=(v,a,z)=>{const s=z-a,n=((v-a)%(2*s)+2*s)%(2*s);return a+(n<s?n:2*s-n);};
  x=reflect(e.from[0]+Math.cos(e.heading)*e.speed*age,b.x+r,b.x+b.width-r);y=reflect(e.from[1]+Math.sin(e.heading)*e.speed*age,b.y+r,b.y+b.height-r);
 }
 if(e.motion==='runtime-spin'){
  const tri=(v,a,b)=>{const s=b-a,n=((v%(2*s))+2*s)%(2*s);return a+(n<s?n:2*s-n);};
  x=tri(e.from[0]-120+t*.22,120,520);y=tri(e.from[1]-140+t*.14,140,270);
 }
 if(e.motion==='free-yin-yang'){
  const s=t/1000,i=e.motionIndex;x=320+230*Math.sin(s*(.53+i*.013)+i*1.9);y=205+78*Math.sin(s*(.67+i*.011)+i*2.2);
 }
 if(e.motion==='runtime-wave'){
  const s=t/1000,i=e.motionIndex;x=320+135*Math.sin(s*.57+i*1.7);y=205+67.5*Math.sin(s*.69+i*1.3);
 }
 if(e.orbit){const a=e.orbit.phase+(t-e.start)*(e.orbit.speed??.0025);x+=Math.cos(a)*e.orbit.radius;y+=Math.sin(a)*e.orbit.radius*(e.orbit.aspect??.45);}
 if(e.airborne)y-=Math.sin(p*Math.PI)*23;
 return[x,y];
}

export function recipe(id,variant,d,baseline=false,beat=0){
 const actors=[],effects=[],labels=[],used=[];let duration=2200;
 const dir={right:[1,0],left:[-1,0],down:[0,1],up:[0,-1]}[d],angle={right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2}[d];
 const centered=(id==='ly_mac_sau_normal'&&variant===0)||['nhu_lai_niet_ban','kim_quang_ho_tran','su_tu_hong','co_mo_kiem_phap','can_khon_phan_chan','am_duong_nghich_chuyen','dat_nhi_ba','ngu_luan_ho_the','kim_luan_truy_hon','tuy_tien_bo'].includes(id);
 const feet=centered?[320,212]:d==='right'?[175,211]:d==='left'?[465,211]:d==='down'?[320,130]:[320,286];
 const point=(reach,side=0)=>[feet[0]+dir[0]*reach-dir[1]*side,feet[1]+dir[1]*reach+dir[0]*side];
 const center=(height=44)=>[feet[0],feet[1]-height/2];
 const ref=(asset,tag)=>{used.push({asset,tag});return{asset,tag}};
 const body=(asset,tag,start=0,end=500,opts={})=>actors.push({...ref(asset,tag),start,end,from:feet,to:feet,role:'caster',kind:'actor',...opts});
 const fx=(asset,tag,start,end,from=feet,to=from,opts={})=>effects.push({...ref(asset,tag),start,end,from,to,layer:'front',scale:1,kind:'effect',...opts});
 const idle=(asset='hero',tag='idle_{d}')=>({ ...ref(asset,tag.replace('{d}',d)),from:feet,role:'caster'});
 let resting=idle();
 const targetPts=[75,135,195].map(n=>point(n));
 function targets(points=targetPts){for(const p of points)actors.push({...ref('hero','idle_down'),start:0,end:duration,from:p,to:p,role:'target'});}
 function projectile(asset,tag,start=320,end=1320,range=220,opts={}){
   fx(asset,tag,start,end,point(22),point(range),opts);
 }
 function freshProjectile(kind,start=300,end=1300,range=220,scale=1){
   projectileFrom(kind,start,end,point(22),point(range),scale);
 }
 function projectileFrom(kind,start,end,from,to,scale=1,opts={}){
   const asset='r3_'+kind+'_'+d;
   fx(asset,'birth_'+d,start,start+110,from,from,{scale,...opts});
   fx(asset,'travel_'+d,start+110,end,from,to,{scale,...opts});
   fx(asset,'impact_'+d,end,end+180,to,to,{scale,fadeOut:true,...opts});
 }
 function impacts(asset,tag,start=300,end=1300,range=220,scale=1){
   for(const n of [75,135,195]){const t=start+110+(end-start-110)*(n-22)/(range-22);fx(asset,tag,t,t+180,point(n),point(n),{scale,fadeOut:true,role:'target-impact'});}
 }
 if(id==='thien_ha_vo_cau'){
  const f=baseline?1:1.3;duration=2500*f;const a=300*f,b=duration-600*f;resting=idle('vo_cau_character','opening_{d}');body('vo_cau_character','opening_'+d,0,a);body('vo_cau_character','whirl_'+d,a,b,{loop:true});body('vo_cau_character','ending_'+d,b,duration);
  fx('vo_cau_aura','whirlwind',a,b,feet,feet,{layer:'back',loop:true,scale:baseline?1:1.35});
  for(const face of ['right','down','left','up'])ref('vo_cau_projectile','dog_run_'+face);
  for(let i=0;i<4;i++)fx('vo_cau_projectile','dog_run_right',a,b,feet,feet,{layer:'world',loop:true,role:'fire-dog',tangentFacing:true,orbit:{radius:baseline?90:120,aspect:.6,speed:.0018,phase:i*Math.PI/2}});
  fx('vo_cau_ground','final_smash',b,duration,feet,feet,{scale:baseline?1:1.45,layer:'ground',pivot:baseline?undefined:[128,174],contactAnchor:baseline?'old canvas centre':'measured ground contact at128,174'});
 }else if(id==='liet_phong_dao'){
  resting=idle('ts_dao','basic_attack_{d}');body('ts_dao','liet_phong_gather_'+d,0,300);body('ts_dao','liet_phong_gather_hold_'+d,300,750);body('ts_dao','liet_phong_slash_'+d,750,950);body('ts_dao','liet_phong_recover_'+d,950,1250);duration=1500;
  const source=d==='left'&&!baseline?'right':d,mirrorX=d==='left'&&!baseline;
  const blade={layer:'back',usePlacement:true,mirrorX,renderFacing:d,orientationContract:'hilt starts above head; horizontal reflection only, never 180-degree reversal'};
  fx('ts_dao_fx','liet_phong_gather_'+source,0,300,feet,feet,blade);fx('ts_dao_fx','liet_phong_gather_loop_'+source,300,750,feet,feet,{...blade,loop:true});
  fx('ts_dao_fx','liet_phong_slash_'+source,750,1080,feet,feet,{...blade,layer:'front'});fx('ts_dao_fx','liet_phong_outro_'+source,1080,1450,feet,feet,blade);
  const ground=point(28);fx('ts_ground','ground_break_'+d,820,1300,ground,ground,{layer:'ground',usePlacement:true,fadeOut:true});
 }else if(id==='thieu_lam_a'){
  const stage=['left_fist','right_fist','front_kick','roundhouse_kick'][beat];resting=idle('shaolin_a','left_fist_{d}');duration=beat===3&&!baseline?1300:480;body('shaolin_a',stage+'_'+d,0,440);fx('shaolin_a_fx',stage+'_'+d,100,450);targets();
  if(beat===3&&!baseline){freshProjectile('crescent',300,1050,220,.8);impacts('r3_crescent_'+d,'impact_'+d,300,1050,220,.6);}
 }else if(id==='vi_da_quyen'){
  resting=idle('shaolin_a','left_fist_{d}');body('shaolin_a','left_fist_'+d,0,550);const p=point(baseline?70:105);fx('shaolin_skill_fx','vi_da_quyen_intro_'+d,0,300,p,p,{layer:'ground'});fx('shaolin_skill_fx','vi_da_quyen_impact_'+d,300,580,p,p,{layer:'ground'});fx('shaolin_skill_fx','vi_da_quyen_outro_'+d,580,820,p,p,{layer:'ground'});duration=1000;labels.push({text:baseline?'Offset 70px':'Offset 105px = +50%',at:point(105)});
 }else if(id==='vo_anh_cuoc'){
  duration=baseline?1500:2300;resting=idle('vo_anh_cuoc_character','cast_{d}');body('vo_anh_cuoc_character','cast_'+d,0,duration-250,{loop:true});
  if(baseline){projectile('vo_anh_cuoc_vfx','release_'+d,300,1100,145);targets();}
  else for(let i=0;i<3;i++){
   const lane=(i-1)*18,c=center(),offset=(d==='right'||d==='left')?[0,lane]:[lane,0];
   const from=[c[0]+offset[0],c[1]+offset[1]],to=[from[0]+dir[0]*225,from[1]+dir[1]*225];
   projectileFrom('foot_force',200+i*310,1200+i*310,from,to,.9,{role:'foot-lane-'+i,laneIndex:i,emissionCenter:c});
  }
 }else if(id==='toan_phong_thoai'){
  resting=idle('shaolin_a','front_kick_{d}');body('shaolin_a','front_kick_'+d,0,550);targets();if(baseline)fx('toan_phong_thoai_vfx','spin',300,900,feet,feet,{scale:1});else{freshProjectile('tornado',300,1450,225);impacts('r3_crescent_'+d,'impact_'+d,300,1450,225,.5);}duration=1800;
 }else if(id==='nhu_lai_niet_ban'){
  duration=3400;resting=idle('nhu_lai_niet_ban_character','cast_{d}');body('nhu_lai_niet_ban_character','cast_'+d,0,800);
  if(baseline){fx('nhu_lai_niet_ban_vfx','preparation',0,500);fx('nhu_lai_niet_ban_vfx','ground_impact',500,900,feet,feet,{layer:'ground'});fx('nhu_lai_niet_ban_vfx','aftereffect',900,2800,feet,feet,{layer:'ground',loop:true});}
  else{fx('r3_buddha','loop_billboard',0,260,[feet[0],feet[1]-22],[feet[0],feet[1]-22],{layer:'back',fadeIn:true});fx('r3_buddha','loop_billboard',260,1050,[feet[0],feet[1]-22],[feet[0],feet[1]-22],{layer:'back',loop:true,fadeOut:true});fx('r3_sky_palm','intro_billboard',300,550,[feet[0],feet[1]-60],[feet[0],feet[1]-30],{layer:'back'});fx('r3_sky_palm','loop_billboard',550,850,[feet[0],feet[1]-30],feet,{layer:'back',fadeOut:true});fx('r3_palm_impact','loop_billboard',700,1100,feet,feet,{layer:'ground',fadeOut:true});fx('r3_sanskrit','loop_billboard',800,3100,feet,feet,{layer:'ground',loop:true,fadeIn:true,fadeOut:true});
   for(let i=0;i<3;i++){const from=[180+i*130,285],to=[feet[0]-40+i*40,feet[1]+12];actors.push({...ref('hero','walk_up'),start:1100+i*350,end:3200,from,to,travelEnd:1600+i*350,role:'target'});fx('r3_palm_impact','intro_billboard',1500+i*350,1710+i*350,to,to,{scale:.3,fadeOut:true,role:'entry-impact'});}
  }
 }else if(id==='tru_ta'){
  resting=idle('tru_ta_character','cast_{d}');body('tru_ta_character','cast_'+d,0,650);duration=1100;
  fx('tru_ta_vfx','preparation_'+d,0,250,feet,feet,{usePlacement:true});
  const p=point(18);p[1]-=22;const pivot={right:[32,64],left:[96,64],down:[64,32],up:[64,96]}[d];
  fx('tru_ta_vfx','slash_'+d,250,900,p,p,{scale:baseline?1:2.4,pivot,fadeOut:true,role:'melee-slash',loop:false});
 }else if(id==='kim_quang_ho_tran'){
  const to=[feet[0]+90,feet[1]],motion={travelStart:1200,travelEnd:2200};duration=3000;resting=idle('school_dao','idle_{d}');body('kim_quang_ho_tran_character','cast_'+d,0,400);
  body('school_dao','idle_'+d,400,1200,{loop:true});body('school_dao','walk_'+d,1200,2200,{to,loop:true,...motion});body('school_dao','idle_'+d,2200,3000,{from:to,to,loop:true});
  const aura={layer:baseline?'front':'back',alpha:baseline?1:.45,pivot:baseline?undefined:[128,120],ownerAnchor:'caster feet shared trajectory; ground ring center128,120'};
  fx('kim_quang_ho_tran_vfx','activation',0,400,feet,feet,aura);fx('kim_quang_ho_tran_vfx','loop',400,2600,feet,to,{...aura,...motion,loop:true,openCenter:!baseline});fx('kim_quang_ho_tran_vfx','ending',2600,3000,to,to,{...aura,fadeOut:true});
 }else if(id==='su_tu_hong'){
  resting=idle('tam_gioi_quy_thien_character','cast_{d}');body('tam_gioi_quy_thien_character','cast_'+d,0,650);duration=1800;
  if(baseline){fx('tam_gioi_quy_thien_vfx','slash_'+d,300,1000,point(60));}else{fx('r3_lion_head','intro_billboard',100,350,[320,180],[320,180],{layer:'back'});fx('r3_lion_head','roar_billboard',350,850,[320,180],[320,160],{layer:'back'});fx('r3_lion_head','outro_billboard',850,1150,[320,160],[320,160],{layer:'back',fadeOut:true});fx('r3_roar_wave','roar_billboard',350,1000,feet,feet,{layer:'ground',scale:1.25,fadeOut:true});targets([[220,215],[420,215],[320,265]]);for(const p of [[220,215],[420,215],[320,265]]){fx('tam_gioi_quy_thien_vfx','armor_break',650,1550,p,p,{scale:.55,loop:true});labels.push({text:'Giảm giáp · slow',at:[p[0],p[1]+15]});}}
 }else if(id==='ly_mac_sau_normal'){
  resting=idle('lms','idle_{d}');duration=1700;body('lms',(variant===0?'basic_attack_':'needle_cast_')+d,0,600);
  if(variant===0){if(baseline)fx('lms_fx','duster_sweep_trail',200,650,feet,feet,{rotation:angle});else{fx('r3_whisk_ring','sweep_billboard',160,700,feet,feet,{layer:'ground',scale:1.2});fx('r3_whisk_ring','outro_billboard',700,1050,feet,feet,{layer:'ground',scale:1.2,fadeOut:true});}}
  else{const from=center(56),reach=baseline?350:400,to=[from[0]+dir[0]*reach,from[1]+dir[1]*reach];fx('lms_fx','needle_projectile',250,1450,from,to,{rotation:angle,scale:1.2,role:'poison-needle',emissionCenter:from});targets();labels.push({text:'Demo400 > A Cái Bang320 / A Phiến220 · tuning pending',at:[160,285]});}
 }else if(id==='co_mo_kiem_phap'){
  duration=2800;resting=idle('lms','idle_{d}');body('lms','summon_cast_'+d,0,650);const n=[4,6,8][variant];fx('lms_fx','co_mo_sigil',0,450,feet,feet,{layer:'ground'});
  for(let i=0;i<n;i++){const a=i*2*Math.PI/n,p=[320+Math.cos(a)*140,220+Math.sin(a)*65],q=[320+Math.cos(a)*40,220+Math.sin(a)*20];fx('lms_fx','co_mo_spawn',350,700,p,p,{layer:'ground',scale:.6});actors.push({...ref('co_mo_minion','basic_attack_'+d),start:550,end:duration,from:p,to:p,role:'minion',loop:true});if(!baseline||i===0)fx('lms_fx','needle_projectile',1000+i*65,1700+i*65,p,q,{rotation:Math.atan2(q[1]-p[1],q[0]-p[0]),scale:.85,role:'minion-shot'});}
 }else if(id==='hong_liet_a1_a2'){
  resting=idle('hhl_boss_locomotion',d+'_idle');body('hhl_boss_basics',d+(variant===0?'_thrust':'_sweep'),0,550);if(variant===0&&(d==='up'||d==='down'))body('hhl_boss_thrust_vertical',d+'_thrust',130,350);
  const origin=center(56);duration=1700;
  if(variant===0){const count=baseline?1:5;for(let i=0;i<count;i++){const a=angle+(i-(count-1)/2)*.15,reach=baseline?170:204,to=[origin[0]+Math.cos(a)*reach,origin[1]+Math.sin(a)*reach];fx(baseline?'hhl_vfx_basics':'r3_hhl_blade_'+d,baseline?'thrust':'travel_'+d,250,1250,origin,to,{rotation:baseline?a:a-angle,scale:baseline?.55:.7,loop:true,role:'blade-lane',emissionCenter:origin});}}
  else{const radius=baseline?220:242;fx('hhl_vfx_basics','sweep',200,850,origin,origin,{rotation:angle-Math.PI/2,pivot:[160,140],scaleX:radius/112,scaleY:radius/82,groundProjection:.6,frontHalf:true,faceAngle:angle,role:'melee-sweep',fadeOut:true});labels.push({text:'Một nhát chém 180° trước mặt · không projectile',at:[160,290]});}
 }else if(id==='tuy_tien_bo'){
  resting=idle('cbt','idle_{d}');duration=2800;const end=2400,movement={motion:'runtime-spin'};
  body('cbt_runtime_actions','spin',0,end,{loop:true,...movement});
  for(let i=5;i>=1;i--)fx('cbt_runtime_actions','spin',0,end,feet,feet,{layer:'world',loop:true,alpha:.04+(5-i)*.025,timeOffset:-i*45,...movement,role:'spin-afterimage'});
  fx('cbt_khong_minh_quyen','shockwave',0,end,feet,feet,{layer:'ground',loop:true,scale:2.2,alpha:.72,...movement});fx('cbt_tuy_tien_bo','wind_trail',0,end,feet,feet,{layer:'ground',loop:true,scale:1.4,alpha:.7,...movement});
  if(!baseline)for(let i=0;i<3;i++){
   const start=250+i*600,from=positionAt({from:feet,start:0,end,...movement},start);from[1]-=26;
   const target=[[500,165],[145,265],[470,270]][i],a=Math.atan2(target[1]-from[1],target[0]-from[0]);
   fx('cbt_khong_minh_quyen','palm_wave',start,start+620,from,target,{rotation:a,scale:.75,role:'moving-palm',capturedTarget:target});
   actors.push({...ref('hero','idle_down'),start:0,end:duration,from:target,to:target,role:'target',kind:'actor'});
  }
 }else if(id==='can_khon_phan_chan'){
  resting=idle('cbt','idle_{d}');body('cbt','counter_'+d,0,1000);duration=2300;fx('cbt_can_khon_phan_chan','charge_warning',0,450,feet,feet,{layer:'ground',alpha:.6});fx('cbt_can_khon_phan_chan','defensive_field',450,1450,feet,feet,{layer:'back',loop:true,alpha:.55});
  for(let i=0;i<6;i++){const a=i*Math.PI/3,p=[320+Math.cos(a)*245,205+Math.sin(a)*95],to=baseline?p:[320+Math.cos(a)*45,212+Math.sin(a)*20];actors.push({...ref('hero','walk_down'),start:0,end:2100,travelStart:500,travelEnd:1500,from:p,to,role:'pull-target'});}fx('cbt_can_khon_phan_chan','radial_shockwave',1450,1950,feet,feet,{layer:'ground',fadeOut:true});
 }else if(id==='am_duong_nghich_chuyen'){
  resting=idle('cbt','idle_{d}');body('cbt','ultimate_charge_'+d,0,750);duration=4600;
  for(let i=0;i<15;i++){
   const spec={motion:'free-yin-yang',motionIndex:i};fx('cbt_trap','rotating_ring',0,4300,feet,feet,{...spec,layer:'ground',loop:true,scale:1.2,alpha:.55,role:'moving-yin-yang'});
  }
  for(let i=0;i<4;i++)fx('cbt_am_duong_nghich_chuyen','rotating_waves',0,4300,feet,feet,{layer:'ground',loop:true,motion:'runtime-wave',motionIndex:i,runtimeWave:true,role:'expanding-yin-yang'});
  if(baseline)fx('cbt_am_duong_nghich_chuyen','large_formation',0,4300,feet,feet,{scale:4,alpha:.48,layer:'ground',baselineOnly:true,motion:'runtime-wave',motionIndex:0});
 }else if(id==='hoac_do_darts'){
  resting=idle('hoac_do_base','idle_{d}');const start=300,brightness=baseline?1:1.6;duration=variant===0?2800:5400;
  body('hoac_do_actions',variant===0?'nails':'spin',0,variant===0?700:3300,{loop:variant===1});
  function nail(a,t,life){const to=[feet[0]+Math.cos(a)*620*life,feet[1]+Math.sin(a)*620*life];fx('hoac_do_fx','nail',t,t+life*1000,feet,to,{rotation:a,scale:.25,brightness,brightnessOnly:true,loop:true,role:'poison-dart',runtimePattern:true});}
  if(variant===0)for(const offset of [0,Math.PI])for(let i=0;i<5;i++)nail(angle+offset+(i-2)*Math.PI/5,start,2.2);
  else{fx('hoac_do_fx','whirlwind',start,start+3000,feet,feet,{scale:.9,loop:true,role:'runtime-whirlwind'});for(let pulse=0;pulse<10;pulse++)for(let i=0;i<8;i++)nail(angle+pulse*.22+i*Math.PI/4,start+pulse*300,1.8);}
 }else if(id==='dat_nhi_ba'){
  resting=idle('dat_nhi_ba_base','idle_{d}');duration=2500;
  if(variant===0){for(let i=0;i<(baseline?1:3);i++){const t=i*650;body('dat_nhi_ba_actions','slam',t,t+450);fx('dat_nhi_ba_fx','fissure',t,t+(baseline?650:180),point(70),point(70),{layer:'ground',alpha:.4,role:'telegraph'});fx('dat_nhi_ba_fx','shockwave',t+(baseline?650:180),t+650,point(70),point(70),{layer:'ground',fadeOut:true});}}
  else{const p=[220,220],q=[420,220];actors.push({...ref('hoac_do_base','idle_down'),start:0,end:duration,from:p,to:p,role:'ally'});actors.push({...ref('kim_luan_base','idle_down'),start:0,end:duration,from:q,to:q,role:'ally'});fx('dat_nhi_ba_fx','ward',0,1000,p,p,{layer:'back',loop:true,scale:.7});fx('dat_nhi_ba_fx','ward',1000,2300,q,q,{layer:'back',loop:true,scale:.7});labels.push({text:'OFF → ON · không beam chuyển',at:[210,285]});}
 }else if(id==='kim_luan_truy_hon'){
  resting=idle('kim_luan_base','idle_{d}');body('kim_luan_actions','channel',0,800,{framePivots:kimChannelFeet});duration=20600;
  const n=baseline?5:7,origin=center(60),bounds=baseline?arenaReview.current:arenaReview.proposed;
  for(let i=0;i<n;i++)fx(baseline?'kim_luan_fx':'r3_round_wheel',baseline?'chakram':'spin_billboard',300,20300,origin,origin,{motion:'arena-bounce',heading:angle+i*Math.PI*2/n,speed:260,bounds,wheelRadius:14,scale:baseline?.45:.7,loop:true,role:'wheel',wheelId:i,phase:'ricochet',runtimeLifeSeconds:20});
 }else if(id==='ngu_luan_ho_the'){
  resting=idle('kim_luan_base','idle_{d}');body('kim_luan_actions','channel',0,3300,{framePivots:kimChannelFeet});duration=5600;
  const n=baseline?5:7,origin=center(60),radius=145,aspect=.45,start=300,release=start+3000;
  for(let i=0;i<n;i++){
   const phase=i*Math.PI*2/n,asset=baseline?'kim_luan_fx':'r3_round_wheel',tag=baseline?'chakram':'spin_billboard';
   fx(asset,tag,start,release,origin,origin,{orbit:{radius,aspect,speed:.006,phase},scale:baseline?.45:.7,loop:true,role:'wheel',wheelId:i,phase:'orbit',ownerCenter:origin});
   const a=phase+3*6,from=[origin[0]+Math.cos(a)*radius,origin[1]+Math.sin(a)*radius*aspect],to=[from[0]+Math.cos(a)*680*2,from[1]+Math.sin(a)*680*2*aspect];
   fx(asset,tag,release,release+2000,from,to,{scale:baseline?.45:.7,loop:true,role:'wheel',wheelId:i,phase:'radial-release',heading:a,releaseSpeed:680,ownerCenter:origin});
  }
 }else if(id==='kim_luan_normal'){
  resting=idle('kim_luan_base','idle_{d}');body('kim_luan_actions','sweep',0,600);duration=2300;
  if(variant===1){if(!baseline){actors.splice(0,actors.length);for(const [phase,t0,t1] of [['anticipation',0,160],['raise',160,300],['chop',300,460],['recovery',460,650]])body('r3_kim_hand_chop',phase+'_'+d,t0,t1);}const from=center(60);projectileFrom('crescent',300,900,from,[from[0]+dir[0]*225,from[1]+dir[1]*225],1.35,{emissionCenter:from});targets();}
  else{const from=center(60),to=[from[0]+dir[0]*225,from[1]+dir[1]*225];fx(baseline?'kim_luan_fx':'r3_round_wheel',baseline?'chakram':'spin_billboard',250,baseline?1550:950,from,to,{loop:true,scale:baseline?.45:.7,role:'wheel'});}
 }else if(id==='arena_backgrounds'){duration=1000;resting=null;}
 return{id,variant,facing:d,baseline,beat,actors,effects,resting,labels,duration,feet,used,timingAuthority:'presentation-only'};
}
