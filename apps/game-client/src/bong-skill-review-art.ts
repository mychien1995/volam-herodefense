import type { FeedbackAnimation, FeedbackComponent } from './feedback-art.js';

export const bongPhaGiapPath = '/assets/skills/cai-bang/pha-giap-lava/';
export const bongPhaGiapBody = 'bong_review_pha_lava_body';
export const bongPhaGiapBodyScale = 0.5;
export const bongPhaGiapReachScale = 0.6;
export const bongPhaGiapEffects = 'bong_review_pha_lava_effects';
export const bongPhaGiapSwingTip = {
  right: [105, -14.5],
  left: [-105.5, -14.5],
  down: [3, 59],
  up: [20.5, -62],
} as const;
export const bongContacts = 'bong_review_contacts';
export const bongNhamChan = 'bong_review_nham_chan_ground';
export const bongNhamTrieu = 'bong_review_nham_trieu_ground';

function component(
  id: string,
  skillId: string,
  file: string,
  kind: FeedbackComponent['kind'],
  frameDimensions: [number, number],
  clips: Array<{ name: string; direction: string; durations: number[] }>,
): FeedbackComponent {
  const origin: [number, number] = [0.5, 0.5];
  const animations = clips.map(
    ({ name, direction, durations }): FeedbackAnimation => ({
      name,
      direction,
      frames: durations.map((_, index) => `${name}_${index}`),
      frameRate: 1000,
      repeat: 0,
      origin,
      frameDimensions,
      stage: name,
      placement: 'ground',
      effectPlacementOffset: [0, 0],
      durationMsTotal: durations.reduce((total, ms) => total + ms, 0),
      frameDurationsMs: durations,
      loop: false,
    }),
  );
  const path = `assets/exports/skills/cai-bang/bong-skill-review/${file}`;
  return {
    id,
    skillId,
    kind,
    role: kind,
    handoffId: 'cai_bang_bong_skill_review',
    sheet: `${path}.png`,
    atlas: `${path}.json`,
    origin,
    frameDimensions,
    displayScale: 1,
    animations,
  };
}

export const bongSkillReviewComponents = [
  component(
    bongContacts,
    'truy_phong_bong',
    'contacts',
    'character',
    [512, 448],
    ['right', 'left', 'up', 'down'].map((direction) => ({
      name: `stomp_${direction}`,
      direction,
      durations: [310],
    })),
  ),
  component(
    bongNhamChan,
    'truy_phong_bong',
    'nham-chan',
    'vfx',
    [256, 172],
    [
      {
        name: 'impact',
        direction: 'right',
        durations: [35, 40, 50, 65, 90, 110, 140, 150],
      },
    ],
  ),
  component(
    bongNhamTrieu,
    'thien_ha_vo_cau',
    'nham-trieu',
    'vfx',
    [256, 172],
    [
      {
        name: 'impact',
        direction: 'right',
        durations: [32, 42, 55, 75, 100, 135, 185, 215],
      },
    ],
  ),
];
