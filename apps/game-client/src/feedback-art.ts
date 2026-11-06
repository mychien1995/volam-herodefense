import raw from './feedback-art.generated.json' with { type: 'json' };
import { facing } from './facing.js';
import type { RasterAnimation, RasterComponent } from './skill-art-registry.js';

export interface FeedbackAnimation extends RasterAnimation {
  durationMsTotal: number;
  frameDurationsMs: number[];
  loop: boolean;
  phase?: string;
  framePhases?: string[];
  contactFrames?: number[];
  baseAttackMs?: number;
  minAcceptedAttackMs?: number;
  placementOffsetFromFeet?: [number, number];
}
export interface FeedbackComponent extends RasterComponent {
  role: string;
  handoffId: string;
  displayScale: number;
  animations: FeedbackAnimation[];
}
const original = raw.assets as unknown as FeedbackComponent[];
export const feedbackArt: FeedbackComponent[] = [
  ...original,
  ...original
    .filter((a) => /^vo_dang_hands_v2_(projectile|impact|aura)$/.test(a.id))
    .map((a) => ({ ...a, id: 'retained_m3d_' + a.id })),
];
export const feedbackComponents = new Map(feedbackArt.map((c) => [c.id, c]));
export interface ArtRef {
  asset: string;
  prefix: string;
}
export const artRef = (pack: string, role: string, prefix: string): ArtRef => ({
  asset: pack + '_' + role,
  prefix,
});
export const headings: Record<string, number> = {
  right: 0,
  down_right: Math.PI / 4,
  down: Math.PI / 2,
  down_left: Math.PI * 0.75,
  left: Math.PI,
  up_left: -Math.PI * 0.75,
  up: -Math.PI / 2,
  up_right: -Math.PI / 4,
};
export function eightFacing(x: number, y: number): string {
  return [
    'right',
    'down_right',
    'down',
    'down_left',
    'left',
    'up_left',
    'up',
    'up_right',
  ][(Math.round(Math.atan2(y, x) / (Math.PI / 4)) + 8) % 8]!;
}
export function feedbackTag(
  ref: ArtRef,
  fx = 1,
  fy = 0,
): FeedbackAnimation | undefined {
  const list = feedbackComponents.get(ref.asset)?.animations;
  return (
    list?.find((a) => a.name === ref.prefix) ??
    list?.find((a) => a.name === ref.prefix + '_' + facing(fx, fy))
  );
}
