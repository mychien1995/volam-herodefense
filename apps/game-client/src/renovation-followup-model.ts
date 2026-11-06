import reachArt from './renovation-reach.generated.json' with { type: 'json' };
const directions = [
  'right',
  'down_right',
  'down',
  'down_left',
  'left',
  'up_left',
  'up',
  'up_right',
] as const;
const views = [
  'right',
  'down_right',
  'down',
  'down_right',
  'right',
  'up_right',
  'up',
  'up_right',
] as const;
const pivots: Record<string, [number, number]> = {
  right: [0.74, 0.5],
  down_right: [0.67, 0.67],
  down: [0.5, 0.73],
  up_right: [0.67, 0.34],
  up: [0.5, 0.28],
};
/** Authored camera views, never rotate a side-on raster around its centre. */
export function dragonTurnFrame(fx: number, fy: number, ageMs: number) {
  const index = (Math.round(Math.atan2(fy, fx) / (Math.PI / 4)) + 8) % 8,
    view = views[index]!,
    flip = index >= 3 && index <= 5,
    pivot = pivots[view]!;
  return {
    direction: directions[index]!,
    frame: view + '_' + (Math.floor(Math.max(0, ageMs) / 85) % 4),
    flip,
    origin: [flip ? 1 - pivot[0] : pivot[0], pivot[1]] as [number, number],
    rotation: 0,
  };
}
export function staffSlamCel(phase: string, progress: number) {
  const p = Number.isFinite(progress)
    ? Math.max(0, Math.min(0.999, progress))
    : 0;
  return /recover/.test(phase)
    ? 3
    : /strike|contact/.test(phase)
      ? 2
      : /raise|windup/.test(phase)
        ? p < 0.5
          ? 0
          : 1
        : Math.min(3, Math.floor(p * 4));
}
/** A coiling body at one endpoint; these are authored poses, never a rotating billboard. */
export function dragonCoilFrame(
  age: number,
  d: {
    forwardTicks: number;
    orbitTicks: number;
    riseTicks: number;
    diveTicks: number;
  },
) {
  if (age < d.forwardTicks) return undefined;
  const coilEnd = d.forwardTicks + d.orbitTicks,
    riseEnd = coilEnd + d.riseTicks;
  const [phase, start, duration, first, count] =
    age < coilEnd
      ? (['dragon_coil', d.forwardTicks, d.orbitTicks, 0, 8] as const)
      : age < riseEnd
        ? (['dragon_rise', coilEnd, d.riseTicks, 8, 2] as const)
        : (['dragon_dive', riseEnd, d.diveTicks, 10, 2] as const);
  return {
    phase,
    index:
      first +
      Math.min(
        count - 1,
        Math.floor((Math.max(0, age - start) / duration) * count),
      ),
  };
}
export function staffContact(fx: number, fy: number) {
  const direction =
    Math.abs(fx) > Math.abs(fy)
      ? fx < 0
        ? 'left'
        : 'right'
      : fy < 0
        ? 'up'
        : 'down';
  const socket = reachArt.contacts[direction];
  return { direction, x: socket[0]! * 0.5, y: socket[1]! * 0.5 };
}
/** A flat ground fissure starts at the feet and ends at the drawn, extended staff. */
export function staffFissureTransform(fx: number, fy: number) {
  const tip = staffContact(fx, fy);
  return {
    rotation: Math.atan2(tip.y, tip.x),
    scaleX: Math.hypot(tip.x, tip.y) / 400,
    scaleY: 0.5,
  };
}
