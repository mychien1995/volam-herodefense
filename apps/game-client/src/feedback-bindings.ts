import { artRef as r, type ArtRef } from './feedback-art.js';
export interface SustainBinding {
  kinds: string[];
  opening?: ArtRef;
  loop: ArtRef;
  ending?: ArtRef;
  offset?: [number, number];
}
export interface FeedbackBinding {
  cast?: ArtRef;
  release?: ArtRef[];
  impact?: ArtRef[];
  pulses?: Record<string, ArtRef[]>;
  control?: ArtRef;
  projectile?: ArtRef;
  projectileStage?: string;
  loopCharacter?: ArtRef;
  endingCharacter?: ArtRef;
  counterCharacter?: ArtRef;
  finisherCharacter?: ArtRef;
  sustain?: SustainBinding[];
  area?: Omit<SustainBinding, 'kinds'>;
  dogs?: boolean;
  releaseOnStrike?: boolean;
  empowered?: {
    cast: ArtRef;
    release: ArtRef[];
    impact: ArtRef[];
    ground: ArtRef;
  };
}
const palm = 'cai_bang_chuong_dragon_v2',
  dragon = 'hang_long_hoa_vu_dragon_v2',
  staff = 'bong_controls_v2',
  dogs = 'thien_ha_vo_cau_dogs_v2',
  fan = 'thien_son_fan_v2',
  wind = 'thien_son_wind_actions_v2',
  dao = 'thien_son_dao_v2',
  hands = 'vo_dang_hands_v2',
  shield = 'vo_dang_shield_formation_v2',
  monk = 'thieu_lam_hands_combo_v2',
  monkDao = 'thieu_lam_dao_v2';
function monkPalm(id: string): FeedbackBinding {
  const variant = (v: string) => ({
    cast: r(monk, 'character', id + '_' + v),
    release: [r(monk, 'aura', id + '_' + v + '_release')],
    impact: [
      r(monk, 'impact', id + '_' + v + '_impact'),
      r(monk, 'impact', id + '_' + v + '_ending'),
    ],
  });
  return {
    ...variant('normal'),
    releaseOnStrike: id === 'dai_luc_kim_cuong_chuong',
    empowered: {
      ...variant('empowered'),
      ground: r(monk, 'ground', 'empowered_contact'),
    },
  };
}
/** Presentation-only bindings. Numeric reach/damage never comes from this table. */
export const feedbackBindings: Record<string, FeedbackBinding> = {
  thieu_lam_quyen: { impact: [r(monk, 'impact', 'basic_contact')] },
  thieu_lam_dao: {},
  la_han_quyen: monkPalm('la_han_quyen'),
  vi_da_quyen: monkPalm('vi_da_quyen'),
  dai_luc_kim_cuong_chuong: monkPalm('dai_luc_kim_cuong_chuong'),
  tru_ta: {
    cast: r(monkDao, 'character', 'tru_ta'),
    release: ['release', 'contact', 'ending'].map((p) =>
      r(monkDao, 'aura', 'tru_ta_' + p),
    ),
    impact: [r(monkDao, 'ground', 'tru_ta_ground')],
  },
  vo_dang_quyen: { impact: [r(hands, 'impact', 'palm_contact')] },
  vo_dang_kiem: { impact: [r(hands, 'impact', 'palm_contact')] },
  luong_nghi_thu: {
    cast: r(hands, 'character', 'luong_nghi_thu_cast'),
    release: [r(hands, 'aura', 'luong_nghi_release')],
    projectile: r(hands, 'projectile', 'luong_nghi_travel'),
    impact: [
      r(hands, 'impact', 'luong_nghi_impact'),
      r(hands, 'impact', 'luong_nghi_end'),
    ],
  },
  huyen_am_chuong: {
    cast: r(hands, 'character', 'huyen_am_chuong_cast'),
    release: [r(hands, 'aura', 'huyen_am_release')],
    projectile: r(hands, 'projectile', 'huyen_am_travel'),
    impact: [
      r(hands, 'impact', 'huyen_am_impact'),
      r(hands, 'impact', 'huyen_am_end'),
    ],
  },
  duong_khi_kich: {
    cast: r(hands, 'character', 'duong_khi_kich_cast'),
    release: [r(hands, 'aura', 'duong_khi_release')],
    projectile: r(hands, 'projectile', 'duong_khi_travel'),
    impact: [
      r(hands, 'impact', 'duong_khi_impact'),
      r(hands, 'impact', 'duong_khi_end'),
    ],
    pulses: { refund: [r(hands, 'aura', 'mana_refund')] },
  },
  thai_cuc_than_cong: {
    cast: r(shield, 'character', 'thai_cuc_than_cong_cast'),
    sustain: [
      {
        kinds: ['mana_shield'],
        opening: r(shield, 'aura', 'mana_opening'),
        loop: r(shield, 'aura', 'mana_loop'),
        ending: r(shield, 'aura', 'mana_off'),
      },
    ],
  },
  thai_cuc_tran: {
    cast: r(shield, 'character', 'thai_cuc_tran_cast'),
    area: {
      opening: r(shield, 'ground', 'formation_opening'),
      loop: r(shield, 'ground', 'formation_loop'),
      ending: r(shield, 'ground', 'formation_ending'),
    },
  },
  thien_son_phien: {
    impact: [r(fan, 'impact', 'outbound_hit')],
    projectile: r(fan, 'projectile', 'outbound'),
  },
  thien_son_dao: { impact: [r(dao, 'impact', 'dash_slash')] },
  lien_hoa_phien: {
    cast: r(wind, 'character', 'lien_hoa_phien_cast'),
    loopCharacter: r(wind, 'character', 'lien_hoa_phien_rapid'),
    impact: [r(wind, 'impact', 'crossed_hit')],
    sustain: [
      {
        kinds: ['channel'],
        opening: r(wind, 'aura', 'lien_hoa_opening'),
        loop: r(wind, 'aura', 'lien_hoa_sustain'),
        ending: r(wind, 'aura', 'lien_hoa_ending'),
      },
    ],
  },
  luc_duong_chuong: {
    cast: r(wind, 'character', 'luc_duong_chuong_cast'),
    loopCharacter: r(wind, 'character', 'luc_duong_chuong_spin'),
    sustain: [
      {
        kinds: ['channel'],
        opening: r(wind, 'aura', 'guard_opening'),
        loop: r(wind, 'aura', 'guard_loop'),
        ending: r(wind, 'aura', 'guard_ending'),
      },
    ],
  },
  luu_phong_bo: {
    cast: r(wind, 'character', 'luu_phong_bo_cast'),
    impact: [r(wind, 'impact', 'crossed_hit')],
    sustain: [{ kinds: ['dash'], loop: r(wind, 'aura', 'luu_phong_trail') }],
  },
  chiet_mai_thu: {
    cast: r(wind, 'character', 'chiet_mai_thu_cast'),
    sustain: [
      {
        kinds: ['speed_buff', 'cooldown_buff'],
        opening: r(wind, 'aura', 'plum_opening'),
        loop: r(wind, 'aura', 'plum_loop'),
        ending: r(wind, 'aura', 'plum_ending'),
      },
    ],
  },
  bach_phien_phong_bao: {
    cast: r(fan, 'character', 'bach_phien_phong_bao_cast'),
    loopCharacter: r(fan, 'character', 'bach_phien_phong_bao_whirl'),
    projectile: r(fan, 'projectile', 'storm_fan'),
    sustain: [
      {
        kinds: ['channel'],
        opening: r(fan, 'aura', 'storm_opening'),
        loop: r(fan, 'aura', 'storm_loop'),
        ending: r(fan, 'aura', 'storm_ending'),
      },
    ],
  },
  phi_anh_tram: {
    cast: r(dao, 'character', 'phi_anh_tram_cast'),
    impact: [r(dao, 'impact', 'dash_slash')],
    sustain: [
      { kinds: ['dash_guard'], loop: r(dao, 'aura', 'phi_anh_tram_motion') },
      {
        kinds: ['dash_guard'],
        loop: r(dao, 'afterimage', 'moving_ghost'),
        offset: [-14, -3],
      },
    ],
  },
  phong_anh_hoan_vi: {
    cast: r(dao, 'character', 'phong_anh_hoan_vi_cast'),
    counterCharacter: r(dao, 'character', 'phong_anh_hoan_vi_counter'),
    sustain: [
      {
        kinds: ['dash_guard'],
        loop: r(dao, 'aura', 'phong_anh_hoan_vi_motion'),
      },
      {
        kinds: ['dash_guard'],
        loop: r(dao, 'afterimage', 'moving_ghost'),
        offset: [-14, -3],
      },
      {
        kinds: ['counter'],
        loop: r(dao, 'aura', 'counter_ready'),
        ending: r(dao, 'aura', 'counter_end'),
      },
    ],
  },
  truy_hon_dao: {
    cast: r(dao, 'character', 'truy_hon_dao_cast'),
    projectile: r(dao, 'projectile', 'qi_blade'),
    impact: [r(dao, 'impact', 'slow_contact')],
  },
  bach_liet_thien_kich: {
    cast: r(dao, 'character', 'bach_liet_thien_kich_cast'),
    loopCharacter: r(dao, 'character', 'bach_liet_thien_kich_flurry'),
    finisherCharacter: r(dao, 'character', 'bach_liet_thien_kich_finish'),
    release: [r(dao, 'aura', 'bach_liet_open')],
    sustain: [
      {
        kinds: ['channel'],
        loop: r(dao, 'aura', 'bach_liet_flurry'),
        ending: r(dao, 'aura', 'bach_liet_end'),
      },
    ],
    pulses: { finisher: [r(dao, 'aura', 'bach_liet_finisher')] },
  },
  cai_bang_bong: {},
  cai_bang_chuong: {
    release: [r(palm, 'aura', 'palm_release')],
    impact: [r(palm, 'impact', 'small_impact')],
    projectile: r(palm, 'projectile', 'dragon_travel'),
    projectileStage: 'dragon',
  },
  hoa_van_chuong: {
    cast: r(palm, 'character', 'hoa_van_cast'),
    release: [r(palm, 'aura', 'palm_release')],
    projectile: r(palm, 'projectile', 'hoa_van_travel'),
    impact: [r(palm, 'impact', 'small_impact')],
  },
  hang_long_hoa_vu: {
    cast: r(dragon, 'character', 'cast'),
    release: [r(dragon, 'aura', 'gather'), r(dragon, 'aura', 'release')],
    projectile: r(dragon, 'projectile', 'travel'),
    impact: [r(dragon, 'impact', 'impact'), r(dragon, 'impact', 'ending')],
  },
  hoanh_tao_bong: {
    cast: r(staff, 'character', 'hoanh_tao_bong_cast'),
    release: [r(staff, 'ground', 'radial_sweep')],
  },
  pha_giap_bong: {
    cast: r(staff, 'character', 'pha_giap_bong_cast'),
    release: [r(staff, 'ground', 'slam')],
  },
  cam_long_cong: {
    cast: r(staff, 'character', 'cam_long_cast'),
    release: [r(staff, 'projectile', 'claw_extend')],
    control: r(staff, 'projectile', 'claw_retract'),
  },
  truy_phong_bong: {
    cast: r(staff, 'character', 'truy_phong_bong_cast'),
    impact: [r(staff, 'impact', 'dash_hit')],
    sustain: [{ kinds: ['dash'], loop: r(staff, 'aura', 'dash_trail') }],
  },
  thien_ha_vo_cau: {
    cast: r(dogs, 'character', 'opening'),
    loopCharacter: r(dogs, 'character', 'whirl'),
    endingCharacter: r(dogs, 'character', 'ending'),
    sustain: [
      {
        kinds: ['channel'],
        opening: r(dogs, 'aura', 'opening'),
        loop: r(dogs, 'aura', 'whirlwind'),
        ending: r(dogs, 'aura', 'ending'),
      },
    ],
    pulses: { finisher: [r(dogs, 'ground', 'final_smash')] },
    dogs: true,
  },
};
export interface BasicArt {
  ref: ArtRef | undefined;
  effect?: ArtRef;
  effects?: ArtRef[];
  baseMs: number;
  floorMs: number;
}
export function basicFeedbackArt(
  id: string,
  stage: string,
  cut: number,
): BasicArt | undefined {
  if (id === 'thieu_lam_quyen')
    return {
      ref: ['left_fist', 'right_fist'].includes(stage)
        ? r(monk, 'character', stage)
        : undefined,
      baseMs: 28000 / 30,
      floorMs: 200,
    };
  if (id === 'thieu_lam_dao')
    return {
      ref: r(monkDao, 'character', 'basic'),
      effects: ['release', 'contact', 'ending'].map((p) =>
        r(monkDao, 'aura', 'basic_' + p),
      ),
      baseMs: 23000 / 30,
      floorMs: 1000 / 6,
    };
  if (id === 'thien_son_phien')
    return {
      ref: r(fan, 'character', 'throw'),
      baseMs: 300,
      floorMs: 1000 / 6,
    };
  if (id === 'thien_son_dao')
    return {
      ref: r(dao, 'character', 'basic'),
      effect: r(dao, 'aura', 'basic_cut'),
      baseMs: 300,
      floorMs: 1000 / 6,
    };
  if (id === 'vo_dang_quyen')
    return {
      ref: ['left_palm', 'right_palm'].includes(stage)
        ? r(hands, 'character', stage)
        : undefined,
      baseMs: 300,
      floorMs: 1000 / 6,
    };
  if (id === 'vo_dang_kiem') {
    const prefix = 'sword_cut_' + (cut % 2 ? 1 : 2);
    return {
      ref: r(hands, 'character', prefix),
      effect: r(hands, 'aura', prefix),
      baseMs: 400,
      floorMs: 1000 / 6,
    };
  }
  if (id === 'cai_bang_bong') {
    const beat: Record<string, string> = {
      thrust: 'thrust',
      sweep: 'sweep',
      lift: 'rising',
      smash: 'overhead',
    };
    const prefix = 'combo_' + (beat[stage] ?? 'thrust');
    return {
      ref: { asset: 'cai_bang_bong_combo_v2_character', prefix },
      effect: { asset: 'cai_bang_bong_combo_v2_vfx', prefix },
      baseMs: 600,
      floorMs: 1000 / 6,
    };
  }
  if (id === 'cai_bang_chuong')
    return {
      ref:
        stage === 'dragon'
          ? r(palm, 'character', 'chuong_sixth_cast')
          : undefined,
      baseMs: 600,
      floorMs: 1000 / 6,
    };
  return undefined;
}
