// Art choreography only. No combat state, hits, cooldowns, AI, or production imports.
import {FEEDBACK_R2 as R} from './feedback-r2.js';
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
  const outbound=(start,end,distance,extra={})=>({motion:'projectile',travelStart:start,travelEnd:end,distance,...extra});
  const forwardExtent=(id,tags)=>{
    const c=assets.get(id),v=VECTOR[d];let edge=0;
    for(const name of tags){const a=clip(id,name),off=a.placementOffsetFromFeet??[0,0];
      for(const n of a.frames){const b=c.bounds[n];
        const forward=d==='right'?b[2]-c.pivot[0]+off[0]:d==='left'?c.pivot[0]-b[0]-off[0]:d==='down'?(b[3]-c.pivot[1]+off[1])/v[1]:(b[1]-c.pivot[1]+off[1])/v[1];
        edge=Math.max(edge,forward);
      }
    }return edge;
  };
  const split=(id,prefix,start)=>{let t=start;for(const name of ['intro','impact','outro']){const a=fx(id,prefix+'_'+name+'_'+d,t);phase(t,{intro:'Tụ / xuất chiêu',impact:'Đỉnh hiệu ứng',outro:'Tan'}[name]);t=a.end;}return t;};
  let length=1350,reach=120,caption=entry[2];
  if(mode==='sl_a'){
    const beats=['left_fist','right_fist','front_kick','roundhouse_kick'],names=['Đấm trái','Đấm phải','Đá chân trước','Xoay đá chân sau'],b=beat%4;
    body('m3d_thieu_lam_quyen_character',beats[b]+'_'+d);
    fx('m3d_thieu_lam_quyen_vfx',beats[b]+'_'+d,370,b<3?outbound(370,570,R.shaolinBasicTravel):{});
    caption=names[b]+' · thức '+(b+1)+'/4';phase(300,caption);phase(700,'Hồi thế');
  }else if(['sl_la_han','sl_vi_da','sl_nhu_lai'].includes(mode)){
    const [actor,prefix]=({sl_la_han:['retained_la_han','la_han_quyen'],sl_vi_da:['retained_vi_da','vi_da_quyen'],sl_nhu_lai:['retained_nhu_lai','nhu_lai_niet_ban']})[mode];
    if(mode==='sl_nhu_lai'){
      body(actor,'cast_'+d,300,{duration:R.palmCount*R.palmIntervalMs,repeat:true,playbackRate:duration(actor,'cast_'+d)/R.palmIntervalMs});
      for(let i=0;i<R.palmCount;i++){
        const start=430+i*R.palmIntervalMs,travel=outbound(start,start+R.palmLifetimeMs,R.palmTravel,{emission:i});
        fx(gold,prefix+'_intro_'+d,start,travel);
        fx(gold,prefix+'_intro_'+d,start+140,{...travel,fromFrame:1,repeat:true,duration:180});
        fx(gold,prefix+'_impact_'+d,start+320,travel);fx(gold,prefix+'_outro_'+d,start+480,travel);
      }
      phase(300,'Liên tục ấn chưởng');phase(430,'Tám chưởng kình bay nối tiếp');phase(2200,'Chưởng kình tiếp tục vươn xa');length=3150;reach=210;
    }else{
      body(actor,'cast_'+d);const first=tracks.length;split(gold,prefix,430);length=1550;
      if(mode==='sl_vi_da')for(const tr of tracks.slice(first))tr.offset=clip(gold,tr.tag).placementOffsetFromFeet.map(n=>n*R.viDaOffsetMultiplier);
    }
  }else if(mode==='sl_dao_a'||mode==='sl_tam_gioi'){
    const basic=mode==='sl_dao_a';body('m3d_thieu_lam_dao_character',(basic?'basic_attack':'tam_gioi_quy_thien')+'_'+d);
    const first=tracks.length;split(gold,basic?'dao_basic':'tam_gioi_quy_thien',410);length=1550;
    if(basic){const selected=tracks.slice(first),baseReach=forwardExtent(gold,selected.map(t=>t.tag));
      for(const tr of selected)Object.assign(tr,outbound(410,550,baseReach*(R.shaolinDaoReachMultiplier-1)),{baselineReach:baseReach,reachMultiplier:R.shaolinDaoReachMultiplier});
    }
  }else if(mode==='wd_a'){
    const name=beat%2?'right_fist':'left_fist';caption=beat%2?'Quyền phải':'Quyền trái';
    body('m3d_vo_dang_quyen_character',name+'_'+d);
    const start=beat%2?410:385;
    fx('m3d_vo_dang_sonic_vfx_r2',name+'_wave_'+d,start,{...outbound(start,start+R.sonicTravelMs,R.sonicTravel),offset:R.fistTips[name][d],duration:R.sonicTravelMs,playbackRate:duration('m3d_vo_dang_sonic_vfx_r2',name+'_wave_'+d)/R.sonicTravelMs});
    phase(300,caption+' → sóng âm từ đầu nắm đấm');
  }else if(mode==='wd_sword_a'){
    body('m3d_vo_dang_kiem_character','basic_attack_'+d);fx('m3d_vo_dang_basic_vfx','sword_qi_'+d,400);phase(300,'Đâm kiếm → kiếm khí từ giữa thân');
  }else if(mode==='wd_nhan_kiem'){
    const id='m3d_nhan_kiem_hop_nhat_vfx';reach=175;
    body('m3d_vo_dang_kiem_character','nhan_kiem_launch_'+d,300);
    fx(id,'launch_'+d,550);
    fx(id,'flight_loop_'+d,790,{duration:1500,repeat:true,motion:'projectile',travelStart:790,travelEnd:2290,distance:175,offset:[0,-24]});
    fx(id,'hold_'+d,2290,{duration:1500,position:175,offset:[0,-24]});
    fx(id,'blink_departure',R.blink.departure,{position:0,offset:[0,-24]});
    fx(id,'blink_arrival',R.blink.arrival,{position:175,offset:[0,-24]});
    fx(id,'recall_outro_'+d,3790,{position:175,offset:[0,-24]});
    phase(300,'Phóng một thanh kiếm');phase(790,'Kiếm bay thẳng · chuyển động minh hoạ');phase(2290,'Blink rời vị trí cũ · kiếm lưu tĩnh 1,5 giây');phase(R.blink.arrival,'Nhân vật xuất hiện tại vị trí kiếm');phase(3790,'Thu / tan kiếm');length=4700;
  }else if(mode==='ts_a'){
    body('m3d_thien_son_dao_character','basic_attack_'+d);fx(wind,'basic_slash_'+d,390);phase(300,'Chém đao');
  }else if(mode==='ts_liet_phong'){
    const id='m3d_thien_son_dao_character';
    body(id,'liet_phong_gather_'+d,300,{duration:600,holdLast:true});
    body(id,'liet_phong_gather_hold_'+d,900,{duration:300,repeat:true});
    body(id,'liet_phong_slash_'+d,1200);body(id,'liet_phong_recover_'+d,1330);
    fx(wind,'liet_phong_gather_'+d,300);fx(wind,'liet_phong_gather_loop_'+d,900,{duration:300,repeat:true});
    const slashReach=forwardExtent(wind,['liet_phong_slash_'+d]);
    fx(wind,'liet_phong_slash_'+d,1200,{...outbound(1275,1425,slashReach*(R.lietPhongReachMultiplier-1)),baselineReach:slashReach,reachMultiplier:R.lietPhongReachMultiplier});
    fx('m3d_liet_phong_ground_vfx_r2','ground_break_'+d,R.groundContact,{position:R.groundOffset,layer:'ground',fadeOutMs:160});
    // Start the authored ending at its residual-wind cels, avoiding re-summoning a full upright blade after the slash.
    fx(wind,'liet_phong_outro_'+d,1650,{fromFrame:3,duration:240});
    phase(300,'Tụ đại đao trên đầu');phase(900,'Giữ tụ');phase(1200,'Chém đường dài');phase(R.groundContact,'Đao chạm đất → vỡ đất phía trước');phase(1650,'Gió tàn');length=2450;
  }else if(mode==='ts_bach_liet'){
    body('retained_bach_liet','cast_'+d);body('retained_bach_liet','flurry_'+d,560,{duration:1940,repeat:true});body('retained_bach_liet','finish_'+d,2500);
    for(let i=0;i<R.bladeCount;i++){
      const start=450+i*R.bladeIntervalMs,travel=outbound(start,start+R.bladeLifetimeMs,R.bladeTravel,{emission:i});
      fx(wind,'bach_liet_intro_'+d,start,{...travel,duration:120,playbackRate:1.5});
      fx(wind,'bach_liet_loop_'+d,start+120,{...travel,duration:200,repeat:true});fx(wind,'bach_liet_outro_'+d,start+320,travel);
    }
    phase(300,'Xuất đao');phase(630,'Liên tục chém chín đợt đao khí');phase(2500,'Thu đao');length=3200;reach=210;
  }else if(mode==='cb_dragon'||mode==='cb_burn'){
    const id='m3d_khang_long_huu_hoi_vfx';body('retained_khang_long','cast_'+d);
    const arrival=930+R.dragonTravelMs;
    fx(id,'dragon_intro_'+d,450);fx(id,'dragon_loop_'+d,930,{duration:R.dragonTravelMs,repeat:true,...outbound(930,arrival,R.dragonDistance)});
    fx(id,'dragon_outro_'+d,arrival,{position:R.dragonDistance});
    phase(450,'Xuất chưởng');phase(930,'Rồng lửa bay xa và nhanh hơn');phase(arrival,'Rồng tan');length=2790;reach=R.dragonDistance;
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
  return {id:mode,dir:d,beat,actor:entry[3],credit:entry[4],caption,tracks,phases,length,reach,revision:2,actorBlink:mode==='wd_nhan_kiem'?R.blink:null};
}

export function frameAt(animation, elapsed, track={}) {
  const from=track.fromFrame??0,durations=animation.frameDurationsMs.slice(from),total=durations.reduce((a,b)=>a+b,0);
  let t=track.repeat?elapsed%total:Math.min(elapsed,total-.001);
  for(let i=0;i<durations.length;i++){if(t<durations[i])return i+from;t-=durations[i];}
  return animation.frames.length-1;
}
