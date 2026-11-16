import { z } from 'zod';
import raw from './skill-art.json' with { type: 'json' };
import rawIconSchools from './skill-icon-schools.json' with { type: 'json' };
import { conLuan, duongMon } from '@volam/game-core';

// Keep schema and atlas metadata out of consumers that only render skill icons.
export const skillArtSchema = /* @__PURE__ */ (() => {
  const pair = z.tuple([z.number().finite(), z.number().finite()]);
  const animation = z
    .object({
      name: z.string().min(1),
      frames: z.array(z.string()).min(1),
      frameDimensions: pair,
      frameCount: z.number().int().positive(),
      frameRate: z.number().positive(),
      repeat: z.number().int().min(-1),
      direction: z.enum(['right', 'down', 'left', 'up', 'none']),
      origin: pair,
      stage: z.string(),
      placement: z.string(),
      effectPlacementOffset: pair,
    })
    .superRefine((a, c) => {
      if (a.frames.length !== a.frameCount)
        c.addIssue({
          code: 'custom',
          message: 'Animation frame count mismatch',
        });
    });
  return z
    .object({
      assets: z
        .array(
          z.object({
            id: z.string(),
            skillId: z.string(),
            kind: z.enum(['character', 'vfx']),
            sheet: z.string().endsWith('.png'),
            atlas: z.string().endsWith('.json'),
            frameDimensions: pair,
            origin: pair,
            displayScale: z.number().int().min(1).max(4).default(1),
            animations: z.array(animation).min(1),
          }),
        )
        .min(21),
    })
    .superRefine((m, c) => {
      const keys = m.assets.flatMap((a) =>
        a.animations.map((t) => `${a.id}:${t.name}`),
      );
      if (new Set(keys).size !== keys.length)
        c.addIssue({ code: 'custom', message: 'Duplicate animation key' });
    });
})();
export const skillArt = /* @__PURE__ */ skillArtSchema.parse(raw);
export type SkillArtComponent = (typeof skillArt.assets)[number];
export type SkillAnimation = SkillArtComponent['animations'][number];
export const skillAnimationKey = (asset: string, tag: string) =>
  `skill:${asset}:${tag}`;
const caiBangIcons = new Set([
  'cai_bang_bong',
  'cai_bang_chuong',
  'hoa_van_chuong',
  'cuong_long_loan_vu',
  'phi_long_tai_thien',
  'khang_long_huu_hoi',
  'hang_long_hoa_vu',
  'hoanh_tao_bong',
  'pha_giap_bong',
  'cam_long_cong',
  'truy_phong_bong',
  'thien_ha_vo_cau',
  'tieu_dieu_cong',
]);
const conLuanIcons = new Set<string>(
  Object.values(conLuan).filter((id) => id !== conLuan.school),
);
const duongMonIcons = new Set<string>(
  Object.values(duongMon).filter((id) => id !== duongMon.school),
);
const nguDocIcons = new Set([
  'ngu_doc_ta_hiep',
  'ngu_doc_co_su',
  'ngu_doc_tam_kinh',
  'ngu_doc_chuong',
  'doc_sa_chuong',
  'am_ta_hap_hon_khi',
  'vo_hinh_doc',
  'am_phong_thuc_cot',
  'van_co_thuc_thien',
  'yeu_co',
  'tam_hinh_co',
  'vo_hinh_ma_co',
  'thi_quy_phong_tan',
]);
export function skillIcon(id: string): string {
  if (nguDocIcons.has(id)) return `/assets/ngu-doc-feedback-v1/icons/${id}.png`;
  if (duongMonIcons.has(id))
    return `/assets/skills/duong-mon-icons-v1/${id}.png`;
  if (conLuanIcons.has(id))
    return `/assets/characters/con_luan_hac_thiet_v04/icons/${id}.png`;
  const iconSchools: Readonly<Record<string, string>> = rawIconSchools;
  if (id === 'luu_phong_bo')
    return '/assets/skills/thien-son/skill-review-2026-11-09/bao-vu-cuong-phong-icon.png';
  if (caiBangIcons.has(id))
    return '/assets/skills/cai-bang-icons-v2/' + id + '.png';
  if (id === 'tam_gioi_quy_thien')
    return '/assets/m3d_followup/su_tu_hong-icon.png';
  if (id === 'thieu_lam_quyen')
    return '/assets/skills/thieu-lam/la_han_quyen/icon.png';
  if (id === 'thieu_lam_dao') return '/assets/skills/thieu-lam/tru_ta/icon.png';
  if (
    id.startsWith('thieu_lam_') ||
    id === 'dich_can_kinh' ||
    iconSchools[id] === 'thieu-lam'
  )
    return `/assets/skills/thieu-lam/${id}/icon.png`;
  if (
    id.startsWith('vo_dang_') ||
    id === 'thai_cuc_tam_phap' ||
    iconSchools[id] === 'vo-dang'
  )
    return `/assets/skills/vo-dang/${id}/icon.png`;
  const school =
    iconSchools[id] === 'thien-son' ||
    id.startsWith('thien_son_') ||
    id === 'bac_minh_than_cong'
      ? 'thien-son'
      : 'cai-bang';
  return `/assets/skills/${school}/${id}/icon.png`;
}
const palmRelease = { asset: 'shared_fire_vfx', animation: 'palm_flash' };
export const basicSkillVisualAliases: Record<string, string> = {
  cai_bang_chuong: 'hoa_van_chuong',
  thieu_lam_quyen: 'la_han_quyen',
  thieu_lam_dao: 'tru_ta',
  vo_dang_kiem: 'nhan_kiem_hop_nhat',
  vo_dang_quyen: 'luong_nghi_thu',
};
export const statusVisuals: Record<string, { asset: string; prefix: string }> =
  {
    crit_buff: { asset: '', prefix: 'buff' },
    burn: { asset: 'shared_fire_vfx', prefix: 'burn_flecks' },
    defense_break: { asset: 'pha_giap_bong_vfx', prefix: 'defense_break' },
    stun: { asset: 'truy_phong_bong_vfx', prefix: 'stun' },
    dash: { asset: '', prefix: 'speed' },
    channel: { asset: '', prefix: 'whirlwind' },
    defense_buff: { asset: 'nhu_lai_thien_diep_vfx', prefix: 'ally_defense' },
    attack_break: { asset: 'luong_nghi_thu_vfx', prefix: 'weakening' },
  };
export const skillVisualStages: Record<
  string,
  {
    travel?: string;
    impact?: string;
    release?: string;
    persistent?: string;
    areaImpact?: string;
    finisherImpact?: string;
    sharedRelease?: { asset: string; animation: string };
    control?: string;
    pulse?: string;
    repeatPulse?: string;
    counter?: string;
    expiry?: string;
    extraPersistent?: string;
    characterLoop?: string;
    area?: string;
    areaPulse?: string;
    absorption?: string;
    refund?: string;
    received?: string;
    empoweredImpact?: string;
    empoweredRelease?: string;
    strike?: string;
    supportPulse?: string;
  }
> = {
  la_han_quyen: {
    release: 'release',
    impact: 'impact',
    persistent: 'guard',
    expiry: 'ending',
  },
  vi_da_quyen: {
    release: 'release',
    impact: 'impact',
    persistent: 'armor_break',
    expiry: 'ending',
  },
  dai_luc_kim_cuong_chuong: {
    strike: 'release',
    impact: 'impact',
    empoweredImpact: 'empowered_impact',
    empoweredRelease: 'empowered_release',
  },
  toan_phong_thoai: {
    release: 'windup',
    sharedRelease: { asset: 'toan_phong_thoai_vfx', animation: 'spin' },
    impact: 'impact',
  },
  hoanh_tao_cuoc: {
    release: 'preparation',
    sharedRelease: { asset: 'hoanh_tao_cuoc_vfx', animation: 'sweep' },
    impact: 'impact',
  },
  vo_anh_cuoc: {
    pulse: 'release',
    repeatPulse: 'release',
    impact: 'impact',
    empoweredImpact: 'empowered_impact',
    empoweredRelease: 'empowered_release',
  },
  kim_cang_bat_hoai: {
    release: 'activation',
    persistent: 'loop',
    absorption: 'hit_response',
    expiry: 'ending',
  },
  nhu_lai_niet_ban: {
    release: 'preparation',
    strike: 'ground_impact',
    persistent: 'aftereffect',
    expiry: 'ending',
  },
  tru_ta: {
    release: 'preparation',
    sharedRelease: { asset: 'tru_ta_vfx', animation: 'slash' },
    impact: 'impact',
    persistent: 'slow',
  },
  kim_quang_ho_tran: {
    release: 'activation',
    persistent: 'loop',
    supportPulse: 'pulse',
    expiry: 'ending',
  },
  tam_gioi_quy_thien: {
    release: 'preparation',
    sharedRelease: { asset: 'tam_gioi_quy_thien_vfx', animation: 'slash' },
    impact: 'impact',
    persistent: 'armor_break',
  },
  bat_dong_minh_vuong: { release: 'activation', supportPulse: 'healing_pulse' },
  nhu_lai_thien_diep: {
    release: 'release',
    travel: 'travel',
    impact: 'impact',
    persistent: 'ally_defense',
  },
  luong_nghi_thu: { release: 'release', travel: 'release', impact: 'impact' },
  huyen_am_chuong: {
    release: 'release',
    travel: 'travel',
    impact: 'impact',
    persistent: 'slow',
  },
  duong_khi_kich: {
    release: 'release',
    travel: 'release',
    impact: 'impact',
    refund: 'mana_return',
  },
  thai_cuc_than_cong: {
    release: 'activation',
    persistent: 'loop',
    absorption: 'absorption',
    expiry: 'ending',
  },
  thai_cuc_tran: {
    release: 'activation',
    area: 'loop',
    areaPulse: 'pulse',
    expiry: 'ending',
  },
  that_tinh_kiem: {
    pulse: 'slash_a',
    repeatPulse: 'slash_b',
    impact: 'impact',
  },
  nhan_kiem_hop_nhat: {
    release: 'release',
    travel: 'travel',
    impact: 'impact',
  },
  bat_quai_kiem_tran: {
    release: 'activation',
    area: 'loop',
    areaPulse: 'pulse',
    expiry: 'ending',
  },
  toa_sat_bac_do: {
    persistent: 'readiness',
    counter: 'counter',
    received: 'received',
    expiry: 'ending',
    characterLoop: 'ready',
  },
  van_kiem_quy_tong: {
    release: 'preparation',
    sharedRelease: { asset: 'van_kiem_quy_tong_vfx', animation: 'release' },
    travel: 'travel',
    impact: 'impact',
  },
  hoa_van_chuong: {
    travel: 'projectile',
    impact: 'impact',
    sharedRelease: palmRelease,
  },
  cuong_long_loan_vu: {
    travel: 'projectile',
    areaImpact: 'impact',
    sharedRelease: palmRelease,
  },
  phi_long_tai_thien: {
    travel: 'wave',
    impact: 'impact',
    sharedRelease: palmRelease,
  },
  hang_long_hoa_vu: {
    travel: 'wave',
    impact: 'impact',
    sharedRelease: palmRelease,
  },
  khang_long_huu_hoi: { release: 'activation', persistent: 'buff' },
  hoanh_tao_bong: { release: 'sweep', impact: 'impact' },
  pha_giap_bong: {
    release: 'impact',
    impact: 'impact',
    persistent: 'defense_break',
  },
  cam_long_cong: { release: 'extend', control: 'retract' },
  truy_phong_bong: { persistent: 'speed' },
  thien_ha_vo_cau: { persistent: 'whirlwind', finisherImpact: 'impact' },
  lien_hoa_phien: {
    persistent: 'sweep',
    characterLoop: 'rapid',
    impact: 'contact',
  },
  luc_duong_chuong: {
    release: 'gather',
    persistent: 'spin',
    characterLoop: 'spin',
    expiry: 'expiry',
  },
  luu_phong_bo: { persistent: 'trail', impact: 'settle', expiry: 'settle' },
  chiet_mai_thu: {
    release: 'wrist_activation',
    sharedRelease: { asset: 'chiet_mai_thu_vfx', animation: 'heel_activation' },
    persistent: 'wrist_loop',
    extraPersistent: 'heel_loop',
    expiry: 'wrist_expiry',
  },
  bach_phien_phong_bao: {
    release: 'gather',
    persistent: 'whirlwind',
    characterLoop: 'whirl',
    expiry: 'expiry',
  },
  phi_anh_tram: { persistent: 'trail', impact: 'slash' },
  truy_hon_dao: {
    release: 'first_cut',
    travel: 'first_cut',
    impact: 'second_cut',
  },
  phong_anh_hoan_vi: {
    release: 'step',
    persistent: 'ready',
    counter: 'step',
    expiry: 'expiry',
  },
  liet_phong_dao: { release: 'strike', impact: 'contact' },
  bach_liet_thien_kich: {
    release: 'coil',
    persistent: 'flurry',
    characterLoop: 'flurry',
    finisherImpact: 'finisher',
  },
};
