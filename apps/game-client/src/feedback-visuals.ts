import {
  cuongLongFlightArt,
  cuongLongEnabled,
  cuongLongId,
  phiLongArt,
  phiLongEnabled,
  phiLongId,
} from './cai-bang-palm-art.js';

/** Temporary reuse of retained raster assets. No new-art or animation approval implied. */
export function feedbackProjectile(abilityId: string, stage: string) {
  if (abilityId === phiLongId && phiLongEnabled())
    return {
      asset: phiLongArt.id,
      prefix: 'breaking_wave',
      scale: 1,
      centered: false,
    };
  if (abilityId === cuongLongId && cuongLongEnabled())
    return {
      asset: cuongLongFlightArt().id,
      prefix: 'dragon_flight',
      scale: 1,
      centered: false,
    };
  if (abilityId === 'cai_bang_chuong' && stage === 'dragon')
    return {
      asset: 'phi_long_tai_thien_vfx',
      prefix: 'wave',
      scale: 0.6,
      centered: false,
    };
  if (abilityId === 'thien_son_phien' || abilityId === 'bach_phien_phong_bao')
    return {
      asset: 'lien_hoa_phien_vfx',
      prefix: 'sweep',
      scale: 0.8,
      centered: true,
    };
  if (abilityId === 'luong_nghi_thu')
    return {
      asset: 'luong_nghi_thu_vfx',
      prefix: 'release',
      scale: 2,
      centered: true,
    };
  if (abilityId === 'duong_khi_kich')
    return {
      asset: 'duong_khi_kich_vfx',
      prefix: 'release',
      scale: 3,
      centered: true,
    };
  if (abilityId === 'truy_hon_dao')
    return {
      asset: 'truy_hon_dao_vfx',
      prefix: 'first_cut',
      scale: 1.4,
      centered: true,
    };
  return undefined;
}

export function feedbackScale(asset: string, prefix: string): number {
  if (asset === 'chiet_mai_thu_vfx') return 1.6;
  if (/^(la_han_quyen|vi_da_quyen|dai_luc_kim_cuong_chuong)_vfx$/.test(asset))
    return prefix.startsWith('empowered') ? 2.4 : 1.8;
  return 1;
}
