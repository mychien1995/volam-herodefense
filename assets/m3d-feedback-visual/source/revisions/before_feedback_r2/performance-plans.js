// Art choreography only. No combat state, hits, cooldowns, AI, or production imports.
export const CATALOG = [
  ['sl_a','Thiếu Lâm Quyền','A · bốn thức, mỗi lần phát một thức','hero_thieu_lam','Sprite + VFX mới'],
  ['sl_la_han','Thiếu Lâm Quyền','La Hán Quyền','hero_thieu_lam','Pose cũ + VFX mới'],
  ['sl_vi_da','Thiếu Lâm Quyền','Vi Đà Quyền','hero_thieu_lam','Pose cũ + VFX mới'],
  ['sl_nhu_lai','Thiếu Lâm Quyền','Như Lai Niết Bàn','hero_thieu_lam','Pose cũ + VFX mới'],
  ['sl_dao_a','Thiếu Lâm Đao','A · chém đao','hero_thieu_lam_dao','Sprite + VFX mới'],
  ['sl_tam_gioi','Thiếu Lâm Đao','Tam Giới Quy Thiền','hero_thieu_lam_dao','Sprite + VFX mới'],
  ['wd_a','Võ Đang Quyền','A · quyền trái / phải','hero_vo_dang','Sprite + VFX mới'],
  ['wd_sword_a','Võ Đang Kiếm','A · kiếm khí','hero_vo_dang_kiem','Sprite + VFX mới'],
  ['wd_nhan_kiem','Võ Đang Kiếm','Nhân Kiếm Hợp Nhất','hero_vo_dang','Sprite + VFX mới'],
  ['ts_a','Thiên Sơn Đao','A · chém đao','hero_thien_son_dao','Sprite + VFX mới'],
  ['ts_liet_phong','Thiên Sơn Đao','Liệt Phong Đao','hero_thien_son_dao','Sprite + VFX mới'],
  ['ts_bach_liet','Thiên Sơn Đao','Bách Liệt Thiên Kích','hero_thien_son_dao','Pose cũ + VFX mới'],
  ['cb_dragon','Cái Bang Chưởng','Kháng Long Hữu Hối','hero_cai_bang_chuong','Pose cũ + VFX mới'],
  ['cb_burn','Cái Bang Chưởng','Kháng Long Hữu Hối · vùng đốt cấp 4','hero_cai_bang_chuong','Pose cũ + VFX mới'],
  ['cb_staff','Cái Bang Bổng','Phá Giáp Bổng','hero_cai_bang','Pose cũ + VFX mới'],
  ['dash','Lướt chung','Lướt ngắn · không miễn sát thương','hero_vo_dang','Pose đi cũ + VFX mới'],
  ['bamboo','Bamboo','Trúc Lâm Kiếm Khách · idle / walk','m3d_truc_lam_kiem_khach_character','Sprite mới'],
];
export const DIRS = ['right','down','left','up'];
export const VECTOR = {right:[1,0],left:[-1,0],down:[0,.65],up:[0,-.65]};
export const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

export function buildPlan(assets, mode, d='right', beat=0) {
  const entry=CATALOG.find(x=>x[0]===mode);if(!entry)throw Error('Unknown preview '+mode);
  const tracks=[], phases=[{at:0,name:'Thế đứng'}];
  const clip=(id,tag)=>{const a=assets.get(id)?.animations.find(a=>a.name===tag);if(!a)throw Error('Missing '+id+'/'+tag);return a;};
  const duration=(id,tag)=>clip(id,tag).frameDurationsMs.reduce((x,y)=>x+y,0);
  const add=(id,tag,start,options={})=>{
    const a=clip(id,tag),natural=duration(id,tag);
    const track={id,tag,start,end:start+(options.duration??natural),layer:'fx',...options};
    tracks.push(track);return track;
  };
  const body=(id,tag,start=300,options={})=>add(id,tag,start,{layer:'actor',...options});
  const fx=(id,tag,start,options={})=>add(id,tag,start,options);
  const phase=(at,name)=>phases.push({at,name});
  const gold='m3d_thieu_lam_skill_vfx',wind='m3d_thien_son_dao_vfx';
  const split=(id,prefix,start)=>{let t=start;for(const name of ['intro','impact','outro']){const a=fx(id,prefix+'_'+name+'_'+d,t);phase(t,{intro:'Tụ / xuất chiêu',impact:'Đỉnh hiệu ứng',outro:'Tan'}[name]);t=a.end;}return t;};
  let length=1350,reach=120,caption=entry[2];
  if(mode==='sl_a'){
    const beats=['left_fist','right_fist','front_kick','roundhouse_kick'],names=['Đấm trái','Đấm phải','Đá chân trước','Xoay đá chân sau'],b=beat%4;
    body('m3d_thieu_lam_quyen_character',beats[b]+'_'+d);fx('m3d_thieu_lam_quyen_vfx',beats[b]+'_'+d,370);
    caption=names[b]+' · thức '+(b+1)+'/4';phase(300,caption);phase(700,'Hồi thế');
  }else if(['sl_la_han','sl_vi_da','sl_nhu_lai'].includes(mode)){
    const [actor,prefix]=({sl_la_han:['retained_la_han','la_han_quyen'],sl_vi_da:['retained_vi_da','vi_da_quyen'],sl_nhu_lai:['retained_nhu_lai','nhu_lai_niet_ban']})[mode];
    body(actor,'cast_'+d);split(gold,prefix,430);length=1550;
  }else if(mode==='sl_dao_a'||mode==='sl_tam_gioi'){
    const basic=mode==='sl_dao_a';body('m3d_thieu_lam_dao_character',(basic?'basic_attack':'tam_gioi_quy_thien')+'_'+d);
    split(gold,basic?'dao_basic':'tam_gioi_quy_thien',410);length=1550;
  }else if(mode==='wd_a'){
    const name=beat%2?'right_fist':'left_fist';caption=beat%2?'Quyền phải':'Quyền trái';
    body('m3d_vo_dang_quyen_character',name+'_'+d);fx('m3d_vo_dang_basic_vfx',name+'_wave_'+d,390);phase(300,caption+' → sóng âm');
  }else if(mode==='wd_sword_a'){
    body('m3d_vo_dang_kiem_character','basic_attack_'+d);fx('m3d_vo_dang_basic_vfx','sword_qi_'+d,400);phase(300,'Đâm kiếm → kiếm khí từ giữa thân');
  }else if(mode==='wd_nhan_kiem'){
    const id='m3d_nhan_kiem_hop_nhat_vfx';reach=175;
    body('m3d_vo_dang_kiem_character','nhan_kiem_launch_'+d,300);
    fx(id,'blink_departure',510);fx(id,'launch_'+d,550);
    fx(id,'flight_loop_'+d,790,{duration:1500,repeat:true,motion:'projectile',travelStart:790,travelEnd:2290,distance:175,offset:[0,-24]});
    fx(id,'hold_'+d,2290,{duration:1500,position:175,offset:[0,-24]});
    fx(id,'blink_arrival',2290,{position:175,offset:[0,-24]});
    fx(id,'recall_outro_'+d,3790,{position:175,offset:[0,-24]});
    phase(300,'Phóng một thanh kiếm');phase(790,'Kiếm bay thẳng · chuyển động minh hoạ');phase(2290,'Kiếm lưu tĩnh · 1,5 giây');phase(3790,'Thu / tan kiếm');length=4700;
  }else if(mode==='ts_a'){
    body('m3d_thien_son_dao_character','basic_attack_'+d);fx(wind,'basic_slash_'+d,390);phase(300,'Chém đao');
  }else if(mode==='ts_liet_phong'){
    const id='m3d_thien_son_dao_character';
    body(id,'liet_phong_gather_'+d,300,{duration:600,holdLast:true});
    body(id,'liet_phong_gather_hold_'+d,900,{duration:300,repeat:true});
    body(id,'liet_phong_slash_'+d,1200);body(id,'liet_phong_recover_'+d,1330);
    fx(wind,'liet_phong_gather_'+d,300);fx(wind,'liet_phong_gather_loop_'+d,900,{duration:300,repeat:true});
    fx(wind,'liet_phong_slash_'+d,1200);
    // Start the authored ending at its residual-wind cels, avoiding re-summoning a full upright blade after the slash.
    fx(wind,'liet_phong_outro_'+d,1650,{fromFrame:3,duration:240});
    phase(300,'Tụ đại đao trên đầu');phase(900,'Giữ tụ');phase(1200,'Chém xuống phía trước');phase(1650,'Gió tàn');length=2450;
  }else if(mode==='ts_bach_liet'){
    body('retained_bach_liet','cast_'+d);body('retained_bach_liet','flurry_'+d,560,{duration:850,repeat:true});body('retained_bach_liet','finish_'+d,1410);
    fx(wind,'bach_liet_intro_'+d,450);fx(wind,'bach_liet_loop_'+d,630,{duration:850,repeat:true});fx(wind,'bach_liet_outro_'+d,1480);
    phase(300,'Xuất đao');phase(630,'Vệt đao dài');phase(1480,'Tan');length=2200;
  }else if(mode==='cb_dragon'||mode==='cb_burn'){
    const id='m3d_khang_long_huu_hoi_vfx';body('retained_khang_long','cast_'+d);
    fx(id,'dragon_intro_'+d,450);fx(id,'dragon_loop_'+d,930,{duration:1050,repeat:true,motion:'projectile',travelStart:930,travelEnd:1980,distance:125});
    fx(id,'dragon_outro_'+d,1980,{position:125});
    phase(450,'Xuất chưởng');phase(930,'Rồng lửa vươn ra');phase(1980,'Rồng tan');length=3000;reach=170;
    if(mode==='cb_burn'){
      const burn='m3d_khang_long_burn_vfx';fx(burn,'burn_intro',650,{layer:'ground'});fx(burn,'burn_loop',1190,{duration:1400,repeat:true,layer:'ground'});fx(burn,'burn_outro',2590,{layer:'ground'});
      phase(1190,'Vùng đốt bám chân · có thể bật di chuyển minh hoạ');phase(2590,'Tắt vùng đốt');length=3550;
    }
  }else if(mode==='cb_staff'){
    const id='m3d_pha_giap_bong_vfx';body('retained_staff','pha_giap_bong_cast_'+d);
    fx(id,'reach_intro_'+d,400);fx(id,'reach_loop_'+d,580,{duration:720,repeat:true});fx(id,'reach_outro_'+d,1300);fx(id,'foot_explosion',700,{layer:'ground'});
    phase(400,'Vệt bổng vươn ra');phase(700,'Nổ tại chân nhân vật');phase(1300,'Tan');length=2050;
  }else if(mode==='dash'){
    body('hero_vo_dang','walk_'+d,300,{duration:240,repeat:true});fx('m3d_dash_vfx','dash_'+d,300);
    phase(300,'Lướt ngắn · không biểu tượng miễn sát thương');phase(540,'Dừng');length=1250;reach=90;
  }else if(mode==='bamboo'){
    body('m3d_truc_lam_kiem_khach_character','walk_'+d,800,{duration:1440,repeat:true});phase(800,'Đi bộ tại chỗ · xem chu kỳ chân');length=2900;
  }
  phases.sort((a,b)=>a.at-b.at);
  return {id:mode,dir:d,beat,actor:entry[3],credit:entry[4],caption,tracks,phases,length,reach};
}

export function frameAt(animation, elapsed, track={}) {
  const from=track.fromFrame??0,durations=animation.frameDurationsMs.slice(from),total=durations.reduce((a,b)=>a+b,0);
  let t=track.repeat?elapsed%total:Math.min(elapsed,total-.001);
  for(let i=0;i<durations.length;i++){if(t<durations[i])return i+from;t-=durations[i];}
  return animation.frames.length-1;
}
