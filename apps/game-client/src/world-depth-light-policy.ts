import type Phaser from 'phaser';
import { m1Config } from '@volam/game-data';
import { impactTargetId } from './m3d-hit-art.js';

type Image = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
export interface DepthLightStyle {
  ability: string;
  tone: 'warm' | 'cool' | 'poison';
  color: number;
  strength: number;
  fire: boolean;
}
/** Authored VFX only. Body sprites, summons, physical debris and warning/UI art never emit. */
export function depthLightStyle(
  scene: Phaser.Scene,
  source: Image,
): DepthLightStyle | undefined {
  const key = source.texture.key;
  if (
    impactTargetId(source) ||
    /body|character|^hero_|walk|portrait|minions|dummy/.test(key)
  )
    return;
  const raster = scene.registry.get('world-depth:raster') as
    Record<string, { skillId: string; kind: string }> | undefined;
  const asset = raster?.[key];
  if (asset?.kind === 'character') return;
  const text =
    source.name +
    ':' +
    key +
    ':' +
    source.frame.name +
    ':' +
    (asset?.skillId ?? '');
  if (
    /khang_long_huu_hoi|kim_cang_bat_hoai|kim_quang_ho_tran|toan_phong_thoai|hoanh_tao_cuoc|ca_diep_thoai/.test(
      text,
    )
  )
    return;
  const fireIds = [
    'cai_bang_chuong',
    'hoa_van_chuong',
    'cuong_long_loan_vu',
    'phi_long_tai_thien',
    'khang_long_huu_hoi',
    'hang_long_hoa_vu',
  ];
  const fire =
    fireIds.find((id) => source.name.includes(id)) ??
    fireIds.find((id) => key.includes(id)) ??
    (key.startsWith('cai_bang_palm_')
      ? fireIds[0]
      : key.startsWith('cai_bang_cuong_long_')
        ? fireIds[2]
        : key.startsWith('cai_bang_phi_long_')
          ? fireIds[3]
          : key.startsWith('cai_bang_hang_long_')
            ? fireIds[5]
            : undefined);
  if (fire)
    return {
      ability: fire,
      tone: 'warm',
      color: 0xffba60,
      strength: 1,
      fire: true,
    };
  const native =
    /^(vdq-(effects|rim|huyen-am|fist-wave)|vdk-effects|con_luan_(spell_fx|thien_su_fx|lightning)|duong-mon-(vfx|co-quan-effects)|ngu-doc-(effects|qw|ultimate))$/.test(
      key,
    );
  const boss =
    /^(chu_(palm|dual|trap|reflect|ultimate)|nd_(palm|finger|rapid|pressure|light|ultimate|rework|rays|feedback01)|v6_nd_phat|kl_(hoac_do_fx|dat_nhi_ba_fx|kim_luan_fx|kim_stomp_fx)|wave_feedback(?:_v02)?:[^:]+|tay:fx2|dt_(maifx|fan|fx)|bac_cai_(staff|rework_vfx))$/.test(
      key,
    );
  const crescent =
    key === 'shaolin-dao-review' && source.frame.name === 'crescent';
  if (asset?.kind !== 'vfx' && !native && !boss && !crescent) return;
  if (
    /warning|telegraph|danger|safe_pattern|countdown|dust|debris|rock|boulder|pebble|blood_grub|footstep|smoke|arrow|needle|knife|kunai|bullet|weapon/.test(
      text,
    )
  )
    return;
  const ability =
    asset?.skillId ?? (source.name.replace(/^(vdq|vdk):/, '') || key);
  const school = m1Config.progression?.skills[ability]?.schoolId ?? '';
  if (/ngu.doc|poison|doc_|toxic|tay:|dt_maifx/.test(text + school))
    return {
      ability,
      tone: 'poison',
      color: 0xb3e88b,
      strength: 0.55,
      fire: false,
    };
  if (/fire|flame|hoa_|hell|hong_liet/.test(text))
    return {
      ability,
      tone: 'warm',
      color: 0xffb36c,
      strength: 0.65,
      fire: false,
    };
  if (
    /shaolin|thieu_lam|kim_luan|^kl_|gold|buddha|nam_de|nd_/.test(text + school)
  )
    return {
      ability,
      tone: 'warm',
      color: 0xffe0a0,
      strength: 0.55,
      fire: false,
    };
  if (/duong.mon/.test(text + school))
    return {
      ability,
      tone: 'cool',
      color: 0xc2b9ed,
      strength: 0.3,
      fire: false,
    };
  return {
    ability,
    tone: 'cool',
    color: /con_luan|lightning/.test(text + school) ? 0x93caff : 0xb9eceb,
    strength: 0.55,
    fire: false,
  };
}
