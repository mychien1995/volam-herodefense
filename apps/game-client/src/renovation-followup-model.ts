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
