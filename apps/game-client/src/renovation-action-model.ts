export type ActionCel = { sheet: string; index: number; phase: string };
/** Map the retained action phase to an authored pose; never infer damage from a frame. */
export function renovationActionCel(
  actor: string,
  ability: string,
  clip: string,
  progress: number,
): ActionCel {
  const text = (ability + ' ' + clip).toLowerCase(),
    p = Number.isFinite(progress)
      ? Math.max(0, Math.min(0.999, progress))
      : 0.45;
  let sheet = actor + '_actions',
    index = 1,
    phase = 'strike';
  const charge = /gather|charge|anticipation|windup|raise|opening|intro/.test(
    text,
  );
  const recover = /recover|ending|outro|catch/.test(text);
  const channel =
    /channel|meditat|guard|ward|sustain|loop|buff|than_cong|thai_cuc|kim_quang|bat_hoai|minh_vuong|nhu_lai|support|heal/.test(
      text,
    );
  if (actor === 'hero_vo_dang_kiem') {
    if (/van_kiem|bat_quai/.test(text))
      return { sheet: 'v2:vo_dang_cast', index: 2, phase: 'channel' };
    if (/nhan_kiem|swordless/.test(text))
      return { sheet: 'v2:vo_dang_cast', index: 1, phase: 'empty-hand' };
    if (/toa_sat/.test(text) && !/counter|release/.test(text))
      return { sheet: 'v2:vo_dang_cast', index: 3, phase: 'guard' };
    return {
      sheet: 'v2:vo_dang_attack',
      index: Math.min(3, Math.floor(p * 4)),
      phase: 'sword-strike',
    };
  }
  if (actor === 'hero_thien_son') {
    if (/throw|catch|basic_attack/.test(text))
      return {
        sheet: 'v2:thien_son_throw',
        index: Math.min(3, Math.floor(p * 4)),
        phase: 'throw-catch',
      };
    return {
      sheet: 'v2:thien_son_cast',
      index: /luu_phong/.test(text)
        ? 1
        : /chiet_mai/.test(text)
          ? 2
          : /luc_duong|bach_phien/.test(text)
            ? 3
            : 0,
      phase: 'fan-cast',
    };
  }
  if (actor === 'hero_thieu_lam') {
    if (/ca_diep|hoanh_tao_cuoc|stomp/.test(text)) {
      sheet = 'hero_thieu_lam_special';
      index = 0;
      phase = 'stationary-stomp';
    } else if (/dai_luc|nhu_lai/.test(text)) {
      sheet = 'hero_thieu_lam_special';
      index = /nhu_lai/.test(text) ? 2 : charge ? 3 : 1;
      phase = /nhu_lai/.test(text) ? 'guard' : 'palm';
    } else if (/kim_cang|guard|heal|meditat/.test(text)) {
      sheet = 'hero_thieu_lam_special';
      index = 2;
      phase = 'guard';
    } else
      index = /roundhouse|toan_phong/.test(text)
        ? 3
        : /front_kick|vo_anh|kick/.test(text)
          ? 2
          : /right_fist|vi_da/.test(text)
            ? 1
            : 0;
  } else if (actor === 'hero_cai_bang')
    index = /cam_long/.test(text)
      ? 3
      : /hoanh_tao|whirl|vo_cau|sweep/.test(text)
        ? 2
        : charge
          ? 0
          : 1;
  else if (actor === 'hero_cai_bang_chuong')
    index = channel ? 3 : /hang_long|phi_long/.test(text) ? 2 : charge ? 0 : 1;
  else if (actor === 'hero_thien_son_dao')
    index = /phi_anh|phong_anh|dash/.test(text)
      ? 2
      : /bach_liet|spin|flurry/.test(text)
        ? 3
        : charge
          ? 0
          : 1;
  else if (actor === 'hero_vo_dang')
    index = channel
      ? 3
      : /luong_nghi|yin_yang/.test(text)
        ? 2
        : /left_fist/.test(text)
          ? 0
          : 1;
  else if (actor === 'hero_thieu_lam_dao')
    index = channel ? 3 : /roar|tam_gioi/.test(text) ? 2 : charge ? 0 : 1;
  else if (actor === 'dong_ta')
    index = /flute|tieu/.test(text)
      ? 2
      : /finger|dan_chi/.test(text)
        ? 1
        : /summon|trieu_hon/.test(text)
          ? 3
          : 0;
  else if (actor === 'mai_sieu_phong')
    index = /pull|hap_luc/.test(text)
      ? 2
      : /skull|poison|doc_cot|ma_anh/.test(text)
        ? 3
        : charge
          ? 0
          : 1;
  else if (actor === 'hoang_dung')
    index = /evade|linh_xa|dash/.test(text)
      ? 2
      : /heal|support|thanh_am/.test(text)
        ? 3
        : charge
          ? 0
          : 1;
  else if (actor === 'tay_doc')
    index = /staff|sweep/.test(text)
      ? charge
        ? 0
        : 1
      : /summon|pillar|phuc_long/.test(text)
        ? 3
        : 2;
  else if (actor === 'tay_doc_cap_mo')
    index = /chan_kich|slam|jump|bao_phat/.test(text)
      ? 3
      : /burst|ngu_doc_than_chuong/.test(text)
        ? 2
        : charge
          ? 0
          : 1;
  else if (actor === 'nam_de')
    index = /heal|meditat/.test(text)
      ? 2
      : /sky|ultimate|quy_tong/.test(text)
        ? 3
        : /palm|aura|phat_quang_pho/.test(text)
          ? 1
          : 0;
  else if (actor === 'bac_cai')
    index = /palm|dragon|beam|hang_long/.test(text)
      ? 2
      : /summon|clone|vortex|ultimate|field|dogs|tether|spiral/.test(text)
        ? 3
        : charge
          ? 0
          : 1;
  else if (actor === 'vuong_trung_duong_p1')
    index = /channel|guard|star|lightning|counter|charge/.test(text)
      ? 3
      : /slash|crescent/.test(text)
        ? 2
        : charge
          ? 0
          : 1;
  else if (actor === 'vuong_trung_duong_p2')
    index = /meditat|shield/.test(text)
      ? 3
      : /pulse|rain|element|channel|stars|swords|notes/.test(text)
        ? 2
        : /finger|sword/.test(text)
          ? 1
          : 0;
  else if (actor === 'chu_ba_thong')
    index = /drink|wine/.test(text)
      ? 3
      : /palm|hands/.test(text)
        ? 1
        : /trap|reflect|ultimate|spin/.test(text)
          ? 2
          : 0;
  else if (actor === 'hoan_nhan_hong_liet')
    index = /summon|trieu_binh|command|arrow/.test(text)
      ? 2
      : /lava|dung_nham|hoa_son|van_ly/.test(text)
        ? 3
        : charge
          ? 0
          : 1;
  else if (actor === 'kim_luan')
    index = /ground|slam|long_tuong|hand_chop/.test(text)
      ? 3
      : /ward|channel|ngu_luan/.test(text)
        ? 2
        : charge
          ? 0
          : 1;
  else if (actor === 'hoac_do')
    index = /nail|doc_dinh/.test(text)
      ? 3
      : /spin|storm|van_nhan/.test(text)
        ? 2
        : charge
          ? 0
          : 1;
  else if (actor === 'dat_nhi_ba')
    index = /ward|guard|bat_dong/.test(text)
      ? 3
      : /sweep/.test(text)
        ? 2
        : charge
          ? 0
          : 1;
  else if (actor === 'ly_mac_sau')
    index = /needle|ngan_cham/.test(text)
      ? 3
      : /palm|chuong|summon|co_mo_kiem/.test(text)
        ? 2
        : charge
          ? 0
          : 1;
  else index = charge ? 0 : channel ? 2 : recover ? 3 : 1;
  // Use the authored ready pose around contact; held guards/meditation and the
  // monk's specialised stomp/palm sheet keep their own semantic pose.
  if (actor.startsWith('hero_') && sheet === actor + '_actions' && !channel) {
    if (charge || p < 0.18) {
      index = 0;
      phase = 'anticipation';
    } else if (recover || p > 0.82) {
      index = 0;
      phase = 'recover';
    }
  }
  if (recover && !channel) phase = 'recover';
  else if (charge) phase = 'anticipation';
  else if (channel) phase = 'channel';
  return { sheet, index, phase };
}
