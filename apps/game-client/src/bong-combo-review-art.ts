import { caiBangBongBeatTicks, m1Config } from '@volam/game-data';
import type {
  ArtRef,
  FeedbackAnimation,
  FeedbackComponent,
} from './feedback-art.js';
import { renovationFollowupEnabled } from './renovation-policy.js';

export const caiBangBongArtEnabled = renovationFollowupEnabled();
export const bongReviewMs = (1000 * caiBangBongBeatTicks) / m1Config.tickRate;
export const bongReviewBody = 'bong_review_body';
export const bongReviewTrail = 'bong_review_trail';
export const bongReviewGround: ArtRef = {
  asset: 'bong_review_ground',
  prefix: 'impact',
};

const path = 'assets/exports/skills/cai-bang/bong-combo-review/';
const directions = ['right', 'left', 'down', 'up'];
const beats = ['thrust', 'sweep', 'rising', 'overhead'];

// Striking-tip coordinates relative to the feet pivot in the contact cel.
export const bongContactOffset: Record<string, [number, number]> = {
  right: [34, 1],
  left: [-35, 1],
  down: [16, 5],
  up: [18, -66],
};

// Opaque leading edge of each retained directional trail from its caster pivot.
const trailReach: Record<string, number> = {
  combo_thrust_right: 69,
  combo_sweep_right: 52,
  combo_rising_right: 60,
  combo_overhead_right: 43,
  combo_thrust_left: 70,
  combo_sweep_left: 53,
  combo_rising_left: 61,
  combo_overhead_left: 45,
  combo_thrust_down: 30,
  combo_sweep_down: 18,
  combo_rising_down: 11,
  combo_overhead_down: 5,
  combo_thrust_up: 84,
  combo_sweep_up: 35,
  combo_rising_up: 64,
  combo_overhead_up: 115,
};

const basicEffect = m1Config.basics['cai_bang_bong']!.effect;
const bongReach = basicEffect.mode === 'arc' ? basicEffect.range : 105;

export function bongTrailPlacement(tag: FeedbackAnimation) {
  const authored = trailReach[tag.name];
  if (authored === undefined) return;
  const [x, y] = tag.effectPlacementOffset;
  const scale = Math.min(2.5, bongReach / authored);
  const shift = bongReach - scale * authored;
  if (tag.direction === 'right' || tag.direction === 'left')
    return { x: x * scale, y, scaleX: scale, scaleY: 1 };
  return {
    x,
    y: y * scale + (tag.direction === 'up' ? -shift : shift),
    scaleX: 1,
    scaleY: scale,
  };
}

export function bongGroundOffset(direction: string): [number, number] {
  const [x, y] = bongContactOffset[direction]!;
  const distance = bongReach - 31;
  if (direction === 'right' || direction === 'left')
    return [direction === 'right' ? distance : -distance, y];
  return [x, direction === 'up' ? -distance : distance];
}

function component(
  id: string,
  file: string,
  kind: FeedbackComponent['kind'],
  dimensions: [number, number],
  pivot: [number, number],
  clips: Array<{
    name: string;
    direction: string;
    durations: number[];
    offset?: [number, number] | undefined;
  }>,
): FeedbackComponent {
  const origin: [number, number] = [
    pivot[0] / dimensions[0],
    pivot[1] / dimensions[1],
  ];
  const animations = clips.map(
    ({ name, direction, durations, offset }): FeedbackAnimation => ({
      name,
      direction,
      frames: durations.map((_, i) => `${name}_${i}`),
      frameRate: 1000,
      repeat: 0,
      origin,
      frameDimensions: dimensions,
      stage: name,
      placement: 'ground',
      effectPlacementOffset: offset ?? [0, 0],
      durationMsTotal: durations.reduce((total, ms) => total + ms, 0),
      frameDurationsMs: durations,
      loop: false,
    }),
  );
  return {
    id,
    skillId: 'cai_bang_bong',
    kind,
    role: kind,
    handoffId: 'cai_bang_bong_combo_review',
    sheet: `${path}${file}.png`,
    atlas: `${path}${file}.json`,
    origin,
    frameDimensions: dimensions,
    displayScale: 1,
    animations,
  };
}

const clips = directions.flatMap((direction) =>
  beats.map((beat) => ({
    name: `combo_${beat}_${direction}`,
    direction,
    beat,
    durations: beat === 'overhead' ? [100, 50, 50, 67] : [67, 67, 67, 66],
  })),
);
const flameOffsets: Record<string, [number, number]> = {
  thrust: [44, -20],
  sweep: [17, -5],
  rising: [25, -9],
};

export const bongReviewComponents = [
  component(bongReviewBody, 'body', 'character', [128, 144], [64, 104], clips),
  component(
    bongReviewTrail,
    'trail',
    'vfx',
    [128, 112],
    [64, 76],
    clips.flatMap((clip) => {
      if (clip.beat === 'overhead')
        return [{ ...clip, offset: bongContactOffset[clip.direction] }];
      if (clip.direction === 'up' || clip.direction === 'down') return [];
      const [x, y] = flameOffsets[clip.beat]!;
      const offset: [number, number] = [
        clip.direction === 'left' ? -x : x,
        y + 12,
      ];
      return [{ ...clip, offset }];
    }),
  ),
  component(
    bongReviewGround.asset,
    'ground',
    'vfx',
    [112, 84],
    [56, 44],
    [
      {
        name: bongReviewGround.prefix,
        direction: 'right',
        durations: [35, 45, 50, 65, 80, 90, 105, 110],
      },
    ],
  ),
];
