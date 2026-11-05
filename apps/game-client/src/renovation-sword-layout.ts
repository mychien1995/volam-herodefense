import type { ReviewClip } from './animation-review-plans.js';
/** Four actual frontal strikes, registered to the retained directional hand offsets. */
export function renovatedSevenStarCues(
  hits: number,
  spacingTicks: number,
  tickRate: number,
): ReviewClip[] {
  const interval = (spacingTicks * 1000) / tickRate,
    duration = hits * interval;
  return [
    {
      asset: 'that_tinh_kiem_character',
      tag: 'cast',
      at: 0,
      end: duration,
      phase: 'sword_body',
      body: true,
    },
    ...Array.from({ length: hits }, (_, i) => ({
      asset: 'that_tinh_kiem_vfx',
      tag: i % 2 ? 'slash_b' : 'slash_a',
      at: i * interval,
      end: (i + 1) * interval,
      phase: 'registered_frontal_strike',
      from: [0, 0] as [number, number],
      to: [0, 0] as [number, number],
      scale: 1,
    })),
  ];
}
