import type { Point, Rect } from './types.js';
import type { EllipseBounds } from './dong-ta-types.js';

export function insideEllipse(
  p: Point,
  b: EllipseBounds,
  padding = 0,
): boolean {
  return (
    Math.hypot(
      (p.x - b.x) / (b.radiusX - padding),
      (p.y - b.y) / (b.radiusY - padding),
    ) <=
    1 + 1e-9
  );
}
/** A convex court boundary also clips diagonal and swept forced movement. */
export function clampEllipse(p: Point, b: EllipseBounds, padding = 0): void {
  const x = (p.x - b.x) / (b.radiusX - padding),
    y = (p.y - b.y) / (b.radiusY - padding),
    n = Math.hypot(x, y);
  if (n > 1) {
    p.x = b.x + (x / n) * (b.radiusX - padding);
    p.y = b.y + (y / n) * (b.radiusY - padding);
  }
}
export const distance = (a: Point, b: Point): number =>
  Math.hypot(a.x - b.x, a.y - b.y);
export function direction(x: number, y: number): Point {
  const length = Math.hypot(x, y);
  return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
}
export function blocked(
  point: Point,
  radius: number,
  width: number,
  height: number,
  walls: Rect[],
): boolean {
  if (
    point.x < radius ||
    point.y < radius ||
    point.x > width - radius ||
    point.y > height - radius
  )
    return true;
  return walls.some(
    (r) =>
      Math.hypot(
        point.x - Math.max(r.x, Math.min(point.x, r.x + r.width)),
        point.y - Math.max(r.y, Math.min(point.y, r.y + r.height)),
      ) < radius,
  );
}
/** First intersection along a segment, including small targets between simulation steps. */
export function segmentCircle(
  a: Point,
  b: Point,
  center: Point,
  radius: number,
): number | undefined {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const ox = a.x - center.x;
  const oy = a.y - center.y;
  const c = ox * ox + oy * oy - radius * radius;
  if (c <= 0) return 0;
  const length2 = dx * dx + dy * dy;
  const dot = ox * dx + oy * dy;
  const discriminant = dot * dot - length2 * c;
  if (!length2 || discriminant < 0) return undefined;
  const t = (-dot - Math.sqrt(discriminant)) / length2;
  return t >= 0 && t <= 1 ? t : undefined;
}
export function moveCircle(
  point: Point,
  delta: Point,
  radius: number,
  width: number,
  height: number,
  walls: Rect[],
): void {
  const steps = Math.max(
    1,
    Math.ceil(Math.hypot(delta.x, delta.y) / Math.max(1, radius / 2)),
  );
  for (let i = 0; i < steps; i++) {
    const nx = { x: point.x + delta.x / steps, y: point.y };
    if (!blocked(nx, radius, width, height, walls)) point.x = nx.x;
    const ny = { x: point.x, y: point.y + delta.y / steps };
    if (!blocked(ny, radius, width, height, walls)) point.y = ny.y;
  }
}

/** Slab intersection for scenery occlusion; padding sweeps a projectile footprint. */
export function segmentRect(
  a: Point,
  b: Point,
  rect: Rect,
  padding = 0,
): number | undefined {
  let near = 0;
  let far = 1;
  for (const [start, delta, min, max] of [
    [a.x, b.x - a.x, rect.x - padding, rect.x + rect.width + padding],
    [a.y, b.y - a.y, rect.y - padding, rect.y + rect.height + padding],
  ] as const) {
    if (Math.abs(delta) < 1e-12) {
      if (start < min || start > max) return undefined;
      continue;
    }
    const first = (min - start) / delta;
    const last = (max - start) / delta;
    near = Math.max(near, Math.min(first, last));
    far = Math.min(far, Math.max(first, last));
    if (near > far) return undefined;
  }
  return near;
}
