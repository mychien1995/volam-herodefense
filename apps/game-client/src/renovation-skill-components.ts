import { feedbackArt } from './feedback-art.js';
import { skillArt } from '@volam/game-data';
import type { RasterComponent } from './skill-art-registry.js';
const original = feedbackArt.find(
  (a) => a.id === 'vo_dang_shield_formation_v2_aura',
)!;
/** Skill-local aliases preserve the selected artwork without changing shared users. */
export const retainedBasicPalm = {
  ...skillArt.assets.find((a) => a.id === 'hoa_van_chuong_vfx')!,
  id: 'retained_m3d_hoa_van_chuong_vfx',
};
export const renovatedSkillComponents: RasterComponent[] = [
  retainedBasicPalm,
  {
    ...original,
    id: 'renovated_toa_guard',
    sheet: 'assets/exports/renovation-v2/overrides/renovated_toa_guard.png',
    atlas: 'assets/exports/renovation-v2/overrides/renovated_toa_guard.json',
  },
];
export const renovationSkillsEnabled = () => {
  const q = new URLSearchParams(location.search);
  return (
    q.get('renovationSkills') !== 'old' && q.get('runtimeArtReview') !== '1'
  );
};
