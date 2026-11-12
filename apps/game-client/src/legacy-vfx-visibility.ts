import type Phaser from 'phaser';
import {
  renovationFeedbackEnabled,
  renovationFollowupEnabled,
  renovationRevisionEnabled,
} from './renovation-policy.js';

type View = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
const viewsByScene = new WeakMap<Phaser.Scene, Set<View>>();
const replacedFeedback = new Set([
  'that_tinh_kiem_vfx',
  'tru_ta_vfx',
  'review3_tru_ta_vfx',
  'vi_da_quyen_vfx',
  'm3d_liet_phong_ground_vfx_r2',
  'review3_ts_ground',
]);
const sharedWind = new Set(['m3d_thien_son_dao_vfx', 'review3_ts_dao_fx']);
const sharedShaolin = new Set([
  'm3d_thieu_lam_skill_vfx',
  'review3_shaolin_skill_fx',
]);
const replacedProjectiles = new Set([
  'feedback-v2:hoa_van_chuong',
  'feedback-v2:phi_long_tai_thien',
  'feedback-v2:hang_long_hoa_vu',
  'feedback-v2:truy_hon_dao',
]);
const viDaLayer = (name: string) =>
  name === 'feedback-v2:vi_da_quyen' || name === 'm3d-r2:vi_da_quyen';
const crescentPrefix = 'review3_r3_crescent_';
const replacedFollowup = (key: string, name: string) =>
  key === 'khang_long_huu_hoi_vfx' ||
  key === 'm3d_khang_long_huu_hoi_vfx' ||
  /b3_pha_giap_vfx|m3d_pha_giap_bong_vfx/.test(key) ||
  (key === 'bong_controls_v2_ground' && name.includes('pha_giap'));

/** Register only providers that can emit a replaced layer, including reused sprites. */
export function trackLegacyVfx(view: View): void {
  const key = view.texture.key;
  if (
    !replacedFeedback.has(key) &&
    !sharedWind.has(key) &&
    !sharedShaolin.has(key) &&
    key !== 'nhu_lai_thien_diep_vfx' &&
    key !== 'la_han_quyen_vfx' &&
    !key.startsWith(crescentPrefix) &&
    !viDaLayer(view.name) &&
    !replacedProjectiles.has(view.name) &&
    !replacedFollowup(key, view.name)
  )
    return;
  const scene = view.scene;
  let views = viewsByScene.get(scene);
  if (!views) {
    views = new Set();
    viewsByScene.set(scene, views);
  }
  if (views.has(view)) return;
  views.add(view);
  view.once('destroy', () => views.delete(view));
}

/** Some providers reuse one sprite across visible and replaced animation phases. */
export function hideReplacedLegacyVfx(scene: Phaser.Scene): void {
  const views = viewsByScene.get(scene);
  if (!views?.size) return;
  const feedback = renovationFeedbackEnabled();
  const revision = renovationRevisionEnabled();
  const followup = renovationFollowupEnabled();
  for (const view of views) {
    const key = view.texture.key;
    const frame = String(view.frame.name);
    const name = view.name;
    if (
      (feedback &&
        !key.startsWith('renovated-v4-') &&
        (replacedFeedback.has(key) ||
          (sharedWind.has(key) && /liet_phong|bach_liet/.test(frame)) ||
          (sharedShaolin.has(key) && frame.includes('vi_da')) ||
          (key === 'nhu_lai_thien_diep_vfx' && frame.startsWith('travel')) ||
          viDaLayer(name))) ||
      (revision &&
        ((key.endsWith('_projectile') &&
          replacedProjectiles.has(name) &&
          (!followup || name !== 'feedback-v2:hoa_van_chuong')) ||
          key.startsWith(crescentPrefix) ||
          (key === 'la_han_quyen_vfx' && /^(guard|ending)/.test(frame)))) ||
      (followup && replacedFollowup(key, name))
    )
      view.setVisible(false);
  }
}
