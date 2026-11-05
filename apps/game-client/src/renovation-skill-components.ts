import { feedbackArt } from './feedback-art.js';
import type { RasterComponent } from './skill-art-registry.js';
const original = feedbackArt.find(
  (a) => a.id === 'vo_dang_shield_formation_v2_aura',
)!;
/** Dedicated Toa guard avoids changing the shared Quyen mana-shield artwork. */
export const renovatedSkillComponents: RasterComponent[] = [
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
