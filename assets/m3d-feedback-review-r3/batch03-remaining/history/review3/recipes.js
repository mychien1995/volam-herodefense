// Only independent art presentation. No game data, server events, damage or AI.
export const items=[
 ['thien_ha_vo_cau','Thiên Hạ Vô Cẩu',['Xoay → đập cuối'],'Loop +30%; đập cuối rộng hơn. Tái dùng body và art đã có.'],
 ['liet_phong_dao','Liệt Phong Đao',['Tụ đao → chém'],'Chọn đúng tag theo facing; phần đao trên đầu được định hướng theo người dùng.'],
 ['thieu_lam_a','Thiếu Lâm Quyền · A',['Chuỗi A thủ công'],'Mỗi A một nhịp: đấm / đấm / đá / roundhouse + một cước kình. CD 1s; nghỉ >2s mới bắt đầu CD.'],
 ['vi_da_quyen','Vi Đà Quyền',['Vụ nổ phía trước'],'Tâm vụ nổ xa người +50%.'],
 ['vo_anh_cuoc','Vô Ảnh Cước',['Bàn chân khí'],'Bàn chân khí mới; tầm/thời gian demo tăng, số tuning chưa chốt.'],
 ['toan_phong_thoai','Toàn Phong Thoái',['Lốc vàng xuyên'],'Lốc vàng đi thẳng xuyên mục tiêu; mỗi mục tiêu một impact trong fixture.'],
 ['nhu_lai_niet_ban','Như Lai Niết Bàn',['Phật · chưởng trời · chữ Phạn'],'Phật sau lưng; chưởng trời; ground field cố định. Minh họa impact khi mục tiêu bước vào.'],
 ['tru_ta','Tru Tà',['Đao khí xa'],'Tái dùng art, tăng quãng/scale riêng VFX; chưa chốt range gameplay.'],
 ['kim_quang_ho_tran','Kim Quang Hộ Trận',['Aura thoáng giữa'],'Aura sau nhân vật, giảm opacity, chừa trung tâm; bám feet khi di chuyển.'],
 ['su_tu_hong','Sư Tử Hống',['Đầu sư tử · sóng rộng'],'Thay Tam Giới Quy Thiền: đầu sư tử ngẩng hống, sóng AoE; giảm giáp + slow là nhãn contract.'],
 ['ly_mac_sau_normal','Lý Mạc Sầu · A',['Phất trần 360°','Độc châm xa'],'Whisk ring mới và độc châm giữ art cũ; mốc so sánh là đòn A Cái Bang Chưởng/Thiên Sơn Phiến.'],
 ['co_mo_kiem_phap','Cổ Mộ Kiếm Pháp',['4 minion','6 minion','8 minion'],'Mỗi minion có phát bắn riêng, không chỉ minion đầu. 4/6/8 là lựa chọn review, chưa RNG gameplay.'],
 ['phat_tran_cong','Phất Trần Công',['Chưởng độc rộng dài'],'Reach và width ×4 baseline, cùng camera/scale nhân vật.'],
 ['hong_liet_a1_a2','Hồng Liệt · A1 / A2',['A1 · 5 đường đao','A2 · vòng cung'],'A1 năm instance, quãng +20%; A2 minh họa mốc A Thiên Sơn Phiến +10%.'],
 ['tuy_tien_bo','Túy Tiên Bộ',['Bay + bắn chưởng'],'Rút ngắn demo bay, vẫn bắn chưởng A trong lúc bay; không biến đường demo thành teleport gameplay.'],
 ['can_khon_phan_chan','Càn Khôn Phản Chấn',['Hút toàn arena'],'Minh họa hút sáu người từ mép arena về boss; không lấy vòng art làm giới hạn range.'],
 ['am_duong_nghich_chuyen','Âm Dương Nghịch Chuyển',['Vòng ground giữ lại'],'Giữ các vòng dưới chân, bỏ large_formation trên arena khỏi selected tags.'],
 ['hoac_do_darts','Hoắc Đô · ám khí',['Phiến Trung Độc Đinh','Cuồng Phong Vạn Nhận'],'Độc đinh sáng hơn, lớn hơn; biến thể render từ art đã có, không sửa PNG khóa. Body action hiện có hướng dưới.'],
 ['dat_nhi_ba','Đạt Nhĩ Ba',['Đập liên tiếp','Bất Động Kim Cang'],'Telegraph demo ngắn; shield tắt người cũ/bật người mới, không beam chuyển. Body action hướng dưới.'],
 ['kim_luan_normal','Kim Luân · A',['Kim luân tròn nhanh','Đao khí bán nguyệt'],'Wheel tròn mới, bay nhanh; bán nguyệt dùng chung source chi vàng với cước kình, scale lớn hơn. Body chém tay mới bốn hướng; các action cũ giữ hướng dưới.'],
 ['kim_luan_truy_hon','Kim Luân Truy Hồn',['7 kim luân'],'Bảy instance tách rời, không bake bảy vòng trong atlas; đường demo không xác nhận cơ chế tracking.'],
 ['ngu_luan_ho_the','Ngũ Luân Hộ Thể',['7 kim luân'],'Giữ tên skill; bảy vòng tròn thật, orbit nằm trên ground plane, không squash sprite vòng.'],
 ['arena_backgrounds','Nền arena boss',['So sánh bốn arena'],'Lý Mạc Sầu → Hồng Liệt → Chu Bá Thông → Kim Luân. Ba concept mới, Chu Bá Thông giữ nguyên.'],
].map(([id,title,variants,note])=>({id,title,variants,note}));

export function recipe(id,variant,d,baseline=false,beat=0){
 const actors=[],effects=[],labels=[],used=[];let duration=2200;
 const dir={right:[1,0],left:[-1,0],down:[0,1],up:[0,-1]}[d],angle={right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2}[d];
 const centered=(id==='ly_mac_sau_normal'&&variant===0)||['nhu_lai_niet_ban','kim_quang_ho_tran','su_tu_hong','co_mo_kiem_phap','can_khon_phan_chan','am_duong_nghich_chuyen','dat_nhi_ba','ngu_luan_ho_the'].includes(id);
 const feet=centered?[320,212]:d==='right'?[175,211]:d==='left'?[465,211]:d==='down'?[320,130]:[320,286];
 const point=(reach,side=0)=>[feet[0]+dir[0]*reach-dir[1]*side,feet[1]+dir[1]*reach+dir[0]*side];
 const ref=(asset,tag)=>{used.push({asset,tag});return{asset,tag}};
 const body=(asset,tag,start=0,end=500,opts={})=>actors.push({...ref(asset,tag),start,end,from:feet,to:feet,role:'caster',...opts});
 const fx=(asset,tag,start,end,from=feet,to=from,opts={})=>effects.push({...ref(asset,tag),start,end,from,to,layer:'front',scale:1,...opts});
 const idle=(asset='hero',tag='idle_{d}')=>({ ...ref(asset,tag.replace('{d}',d)),from:feet,role:'caster'});
 let resting=idle();
 const targetPts=[75,135,195].map(n=>point(n));
 function targets(points=targetPts){for(const p of points)actors.push({...ref('hero','idle_down'),start:0,end:duration,from:p,to:p,role:'target'});}
 function projectile(asset,tag,start=320,end=1320,range=220,opts={}){
   fx(asset,tag,start,end,point(22),point(range),opts);
 }
 function freshProjectile(kind,start=300,end=1300,range=220,scale=1){
   const asset='r3_'+kind+'_'+d;
   fx(asset,'birth_'+d,start,start+110,point(22),point(22),{scale});
   fx(asset,'travel_'+d,start+110,end,point(22),point(range),{scale});
   fx(asset,'impact_'+d,end,end+180,point(range),point(range),{scale,fadeOut:true});
 }
 function impacts(asset,tag,start=300,end=1300,range=220,scale=1){
   for(const n of [75,135,195]){const t=start+110+(end-start-110)*(n-22)/(range-22);fx(asset,tag,t,t+180,point(n),point(n),{scale,fadeOut:true,role:'target-impact'});}
 }
 if(id==='thien_ha_vo_cau'){
  const f=baseline?1:1.3;duration=2500*f;resting=idle('vo_cau_character','opening_{d}');body('vo_cau_character','opening_'+d,0,300*f);body('vo_cau_character','whirl_'+d,300*f,duration-600*f,{loop:true});body('vo_cau_character','ending_'+d,duration-600*f,duration);fx('vo_cau_aura','whirlwind',300*f,duration-600*f,feet,feet,{layer:'back',loop:true});fx('vo_cau_ground','final_smash',duration-600*f,duration,feet,feet,{scale:baseline?1:1.45,layer:'ground'});
 }else if(id==='liet_phong_dao'){
  resting=idle('ts_dao','basic_attack_{d}');body('ts_dao','liet_phong_gather_'+d,0,300);body('ts_dao','liet_phong_gather_hold_'+d,300,750);body('ts_dao','liet_phong_slash_'+d,750,950);body('ts_dao','liet_phong_recover_'+d,950,1250);duration=1500;
  fx('ts_dao_fx','liet_phong_gather_'+d,0,300,feet,feet,{layer:'back'});fx('ts_dao_fx','liet_phong_gather_loop_'+d,300,750,feet,feet,{loop:true,layer:'back',orientationContract:baseline?'baseline-tag':'locked-facing-tag'});fx('ts_dao_fx','liet_phong_slash_'+d,750,1080);fx('ts_dao_fx','liet_phong_outro_'+d,1080,1450);
 }else if(id==='thieu_lam_a'){
  const stage=['left_fist','right_fist','front_kick','roundhouse_kick'][beat];resting=idle('shaolin_a','left_fist_{d}');duration=beat===3&&!baseline?1300:480;body('shaolin_a',stage+'_'+d,0,440);fx('shaolin_a_fx',stage+'_'+d,100,450);targets();
  if(beat===3&&!baseline){freshProjectile('crescent',300,1050,220,.8);impacts('r3_crescent_'+d,'impact_'+d,300,1050,220,.6);}
 }else if(id==='vi_da_quyen'){
  resting=idle('shaolin_a','left_fist_{d}');body('shaolin_a','left_fist_'+d,0,550);const p=point(baseline?70:105);fx('shaolin_skill_fx','vi_da_quyen_intro_'+d,0,300,p,p,{layer:'ground'});fx('shaolin_skill_fx','vi_da_quyen_impact_'+d,300,580,p,p,{layer:'ground'});fx('shaolin_skill_fx','vi_da_quyen_outro_'+d,580,820,p,p,{layer:'ground'});duration=1000;labels.push({text:baseline?'Offset 70px':'Offset 105px = +50%',at:point(105)});
 }else if(id==='vo_anh_cuoc'){
  duration=baseline?1500:2300;resting=idle('vo_anh_cuoc_character','cast_{d}');body('vo_anh_cuoc_character','cast_'+d,0,duration-250,{loop:true});targets();if(baseline)projectile('vo_anh_cuoc_vfx','release_'+d,300,1100,145);else for(let i=0;i<3;i++){freshProjectile('foot_force',200+i*310,1200+i*310,225,.9);impacts('r3_foot_force_'+d,'impact_'+d,200+i*310,1200+i*310,225,.65);}
 }else if(id==='toan_phong_thoai'){
  resting=idle('shaolin_a','front_kick_{d}');body('shaolin_a','front_kick_'+d,0,550);targets();if(baseline)fx('toan_phong_thoai_vfx','spin',300,900,feet,feet,{scale:1});else{freshProjectile('tornado',300,1450,225);impacts('r3_crescent_'+d,'impact_'+d,300,1450,225,.5);}duration=1800;
 }else if(id==='nhu_lai_niet_ban'){
  duration=3400;resting=idle('nhu_lai_niet_ban_character','cast_{d}');body('nhu_lai_niet_ban_character','cast_'+d,0,800);
  if(baseline){fx('nhu_lai_niet_ban_vfx','preparation',0,500);fx('nhu_lai_niet_ban_vfx','ground_impact',500,900,feet,feet,{layer:'ground'});fx('nhu_lai_niet_ban_vfx','aftereffect',900,2800,feet,feet,{layer:'ground',loop:true});}
  else{fx('r3_buddha','loop_billboard',0,260,[feet[0],feet[1]-22],[feet[0],feet[1]-22],{layer:'back',fadeIn:true});fx('r3_buddha','loop_billboard',260,1050,[feet[0],feet[1]-22],[feet[0],feet[1]-22],{layer:'back',loop:true,fadeOut:true});fx('r3_sky_palm','intro_billboard',300,550,[feet[0],feet[1]-60],[feet[0],feet[1]-30],{layer:'back'});fx('r3_sky_palm','loop_billboard',550,850,[feet[0],feet[1]-30],feet,{layer:'back',fadeOut:true});fx('r3_palm_impact','loop_billboard',700,1100,feet,feet,{layer:'ground',fadeOut:true});fx('r3_sanskrit','loop_billboard',800,3100,feet,feet,{layer:'ground',loop:true,fadeIn:true,fadeOut:true});
   for(let i=0;i<3;i++){const from=[180+i*130,285],to=[feet[0]-40+i*40,feet[1]+12];actors.push({...ref('hero','walk_up'),start:1100+i*350,end:3200,from,to,travelEnd:1600+i*350,role:'target'});fx('r3_palm_impact','intro_billboard',1500+i*350,1710+i*350,to,to,{scale:.3,fadeOut:true,role:'entry-impact'});}
  }
 }else if(id==='tru_ta'){
  resting=idle('tru_ta_character','cast_{d}');body('tru_ta_character','cast_'+d,0,650);targets();fx('tru_ta_vfx','preparation_'+d,0,250);projectile('tru_ta_vfx','slash_'+d,250,1050,baseline?130:210,{scale:baseline?1:1.4});fx('tru_ta_vfx','impact_'+d,1050,1400,point(baseline?130:210));duration=1600;
 }else if(id==='kim_quang_ho_tran'){
  const to=[feet[0]+90,feet[1]];duration=3000;resting=idle('kim_quang_ho_tran_character','cast_{d}');body('kim_quang_ho_tran_character','cast_'+d,0,500);actors.push({...ref('kim_quang_ho_tran_character','cast_'+d),start:500,end:duration,from:feet,to,role:'caster',loop:true});fx('kim_quang_ho_tran_vfx','activation',0,400,feet,feet,{layer:baseline?'front':'back',alpha:baseline?1:.55});fx('kim_quang_ho_tran_vfx','loop',400,2600,feet,to,{loop:true,layer:baseline?'front':'back',alpha:baseline?1:.45,openCenter:!baseline});fx('kim_quang_ho_tran_vfx','ending',2600,3000,to,to,{layer:'back',alpha:.5,fadeOut:true});
 }else if(id==='su_tu_hong'){
  resting=idle('tam_gioi_quy_thien_character','cast_{d}');body('tam_gioi_quy_thien_character','cast_'+d,0,650);duration=1800;
  if(baseline){fx('tam_gioi_quy_thien_vfx','slash_'+d,300,1000,point(60));}else{fx('r3_lion_head','intro_billboard',100,350,[320,180],[320,180],{layer:'back'});fx('r3_lion_head','roar_billboard',350,850,[320,180],[320,160],{layer:'back'});fx('r3_lion_head','outro_billboard',850,1150,[320,160],[320,160],{layer:'back',fadeOut:true});fx('r3_roar_wave','roar_billboard',350,1000,feet,feet,{layer:'ground',scale:1.25,fadeOut:true});targets([[220,215],[420,215],[320,265]]);for(const p of [[220,215],[420,215],[320,265]]){fx('tam_gioi_quy_thien_vfx','armor_break',650,1550,p,p,{scale:.55,loop:true});labels.push({text:'Giảm giáp · slow',at:[p[0],p[1]+15]});}}
 }else if(id==='ly_mac_sau_normal'){
  resting=idle('lms','idle_{d}');duration=1700;body('lms',(variant===0?'basic_attack_':'needle_cast_')+d,0,600);
  if(variant===0){if(baseline)fx('lms_fx','duster_sweep_trail',200,650,feet,feet,{rotation:angle});else{fx('r3_whisk_ring','sweep_billboard',160,700,feet,feet,{layer:'ground'});fx('r3_whisk_ring','outro_billboard',700,1050,feet,feet,{layer:'ground',fadeOut:true});}}
  else{projectile('lms_fx','needle_projectile',250,1250,baseline?165:350,{rotation:angle,scale:1.2});targets();labels.push({text:'Demo350 > A Cái Bang320 / A Phiến220 · tuning pending',at:[160,285]});}
 }else if(id==='co_mo_kiem_phap'){
  duration=2800;resting=idle('lms','idle_{d}');body('lms','summon_cast_'+d,0,650);const n=[4,6,8][variant];fx('lms_fx','co_mo_sigil',0,450,feet,feet,{layer:'ground'});
  for(let i=0;i<n;i++){const a=i*2*Math.PI/n,p=[320+Math.cos(a)*140,220+Math.sin(a)*65],q=[320+Math.cos(a)*40,220+Math.sin(a)*20];fx('lms_fx','co_mo_spawn',350,700,p,p,{layer:'ground',scale:.6});actors.push({...ref('co_mo_minion','basic_attack_'+d),start:550,end:duration,from:p,to:p,role:'minion',loop:true});if(!baseline||i===0)fx('lms_fx','needle_projectile',1000+i*65,1700+i*65,p,q,{rotation:Math.atan2(q[1]-p[1],q[0]-p[0]),scale:.85,role:'minion-shot'});}
 }else if(id==='phat_tran_cong'){
  resting=idle('lms','idle_{d}');body('lms','palm_channel_'+d,0,800);duration=2000;fx('lms_purple','palm_charge',0,400,feet,feet,{rotation:angle});const range=baseline?50:200;fx('lms_purple','palm_lane_warning',200,550,point(range/2),point(range/2),{rotation:angle,scale:baseline?.7:2.8,layer:'ground',alpha:.4});projectile('lms_purple','palm_projectile',550,1450,range,{rotation:angle,scale:baseline?.7:2.8});fx('lms_purple','palm_impact',1450,1850,point(range),point(range),{scale:baseline?.7:2.8,rotation:angle});
 }else if(id==='hong_liet_a1_a2'){
  resting=idle('hhl_boss_locomotion',d+'_idle');body('hhl_boss_basics',d+(variant===0?'_thrust':'_sweep'),0,550);if(variant===0&&(d==='up'||d==='down'))body('hhl_boss_thrust_vertical',d+'_thrust',130,350);
  duration=1700;if(variant===0){const count=baseline?1:5;for(let i=0;i<count;i++){const a=angle+(i-(count-1)/2)*.15,from=point(20),to=[feet[0]+Math.cos(a)*(baseline?170:204),feet[1]+Math.sin(a)*(baseline?170:204)];fx(baseline?'hhl_vfx_basics':'r3_hhl_blade_'+d,baseline?'thrust':'travel_'+d,250,1250,from,to,{rotation:baseline?a:a-angle,scale:baseline?.55:.7,loop:true,role:'blade-lane'});}}else{projectile('hhl_vfx_basics','sweep',250,1150,baseline?135:242,{rotation:angle,scale:baseline?.65:1});labels.push({text:'A2 demo242 = mốc A Phiến220 +10% · chưa gameplay',at:[160,290]});}
 }else if(id==='tuy_tien_bo'){
  resting=idle('cbt','idle_{d}');duration=baseline?2800:1900;const end=duration-400,to=point(150);body('cbt','dash_'+d,0,end,{from:feet,to,airborne:true,loop:true});fx('cbt_tuy_tien_bo','wind_trail',0,end,feet,to,{rotation:angle,layer:'ground',loop:true,alpha:.6});
  if(!baseline)for(let i=0;i<3;i++){const start=200+i*350,t=start/end,from=[feet[0]+(to[0]-feet[0])*t,feet[1]+(to[1]-feet[1])*t-18];body('cbt','basic_palm_'+d,start,start+280,{from,to:[from[0]+dir[0]*25,from[1]+dir[1]*25],airborne:true});fx('cbt_khong_minh_quyen','palm_wave',start+100,start+600,from,[from[0]+dir[0]*100,from[1]+dir[1]*100],{rotation:angle,scale:.65,role:'airborne-palm'});}
  fx('cbt_tuy_tien_bo','arrival',end,end+350,to,to,{layer:'ground'});
 }else if(id==='can_khon_phan_chan'){
  resting=idle('cbt','idle_{d}');body('cbt','counter_'+d,0,1000);duration=2300;fx('cbt_can_khon_phan_chan','charge_warning',0,450,feet,feet,{layer:'ground',alpha:.6});fx('cbt_can_khon_phan_chan','defensive_field',450,1450,feet,feet,{layer:'back',loop:true,alpha:.55});
  for(let i=0;i<6;i++){const a=i*Math.PI/3,p=[320+Math.cos(a)*245,205+Math.sin(a)*95],to=baseline?p:[320+Math.cos(a)*45,212+Math.sin(a)*20];actors.push({...ref('hero','walk_down'),start:0,end:2100,travelStart:500,travelEnd:1500,from:p,to,role:'pull-target'});}fx('cbt_can_khon_phan_chan','radial_shockwave',1450,1950,feet,feet,{layer:'ground',fadeOut:true});
 }else if(id==='am_duong_nghich_chuyen'){
  resting=idle('cbt','idle_{d}');body('cbt','ultimate_charge_'+d,0,750);duration=2400;
  for(let i=0;i<4;i++){const p=[235+(i%2)*165,190+Math.floor(i/2)*65];fx('cbt_am_duong_nghich_chuyen',i%2?'safe_pattern':'danger_pattern',400,2100,p,p,{layer:'ground',loop:true,scale:.75});}
  if(baseline)fx('cbt_am_duong_nghich_chuyen','large_formation',0,2100,feet,feet,{scale:1.8,alpha:.7,layer:'back',baselineOnly:true});
 }else if(id==='hoac_do_darts'){
  resting=idle('hoac_do_base','idle_{d}');body('hoac_do_actions',variant===0?'nails':'gust',0,650);duration=2000;const n=variant===0?3:7;for(let i=0;i<n;i++){const a=angle+(i-(n-1)/2)*.14;fx('hoac_do_fx','nail',300+i*55,1250+i*55,point(20),[feet[0]+Math.cos(a)*220,feet[1]+Math.sin(a)*220],{rotation:a,scale:baseline?.55:.85,brightness:baseline?1:1.6,role:'poison-dart'});}
 }else if(id==='dat_nhi_ba'){
  resting=idle('dat_nhi_ba_base','idle_{d}');duration=2500;
  if(variant===0){for(let i=0;i<(baseline?1:3);i++){const t=i*650;body('dat_nhi_ba_actions','slam',t,t+450);fx('dat_nhi_ba_fx','fissure',t,t+(baseline?650:180),point(70),point(70),{layer:'ground',alpha:.4,role:'telegraph'});fx('dat_nhi_ba_fx','shockwave',t+(baseline?650:180),t+650,point(70),point(70),{layer:'ground',fadeOut:true});}}
  else{const p=[220,220],q=[420,220];actors.push({...ref('hoac_do_base','idle_down'),start:0,end:duration,from:p,to:p,role:'ally'});actors.push({...ref('kim_luan_base','idle_down'),start:0,end:duration,from:q,to:q,role:'ally'});fx('dat_nhi_ba_fx','ward',0,1000,p,p,{layer:'back',loop:true,scale:.7});fx('dat_nhi_ba_fx','ward',1000,2300,q,q,{layer:'back',loop:true,scale:.7});labels.push({text:'OFF → ON · không beam chuyển',at:[210,285]});}
 }else if(id==='kim_luan_normal'||id==='kim_luan_truy_hon'||id==='ngu_luan_ho_the'){
  resting=idle('kim_luan_base','idle_{d}');body('kim_luan_actions',id==='ngu_luan_ho_the'?'channel':'sweep',0,600);duration=2300;
  if(id==='kim_luan_normal'&&variant===1){if(!baseline){actors.splice(0,actors.length);for(const [phase,t0,t1] of [['anticipation',0,160],['raise',160,300],['chop',300,460],['recovery',460,650]])body('r3_kim_hand_chop',phase+'_'+d,t0,t1);}freshProjectile('crescent',300,900,225,1.35);targets();}
  else{const n=id==='kim_luan_normal'?1:baseline?5:7;for(let i=0;i<n;i++){
   if(id==='ngu_luan_ho_the')fx(baseline?'kim_luan_fx':'r3_round_wheel',baseline?'chakram':'spin_billboard',300,2100,feet,feet,{orbit:{radius:95,phase:i*2*Math.PI/n},loop:true,scale:baseline?.45:.7,role:'wheel'});
   else{const side=(i-(n-1)/2)*22,from=point(20,side),to=point(225,side);fx(baseline?'kim_luan_fx':'r3_round_wheel',baseline?'chakram':'spin_billboard',250+i*60,(baseline?1550:950)+i*60,from,to,{loop:true,scale:baseline?.45:.7,role:'wheel'});}
  }}
 }else if(id==='arena_backgrounds'){duration=1000;resting=null;}
 return{id,variant,facing:d,baseline,beat,actors,effects,resting,labels,duration,feet,used,timingAuthority:'presentation-only'};
}
