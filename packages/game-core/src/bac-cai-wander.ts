import type { Point } from './types.js';
import type { EllipseBounds } from './dong-ta-types.js';
import type { BacCaiDefinition } from './bac-cai-types.js';

/** Exact approved v02 path math; seed and elapsed time come from server authority. */
export function bacCaiWander(
  seed: number,
  elapsed: number,
  bounds: EllipseBounds,
  tuning: BacCaiDefinition['vortex'],
): Point[] {
  const rx = bounds.radiusX - tuning.radius - 8,
    ry = bounds.radiusY - tuning.radius - 8;
  return Array.from({ length: tuning.cloneCount + 1 }, (_, i) => {
    let n = Math.imul(seed ^ Math.imul(i + 1, 0x9e3779b9), 0x85ebca6b) >>> 0;
    const random = () => {
      n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
      return n / 4294967296;
    };
    const angle =
      i === 0 ? 0 : ((i - 1) * Math.PI) / 4 + (random() - 0.5) * 0.35;
    const radius = i === 0 ? 0 : 0.55 + random() * 0.35;
    let p = {
      x: bounds.x + Math.cos(angle) * radius * rx,
      y: bounds.y + Math.sin(angle) * radius * ry,
    };
    let remaining = Math.max(0, Math.min(tuning.activeMs / 1000, elapsed));
    while (remaining > 0) {
      let target: Point, distance: number;
      do {
        const a = random() * Math.PI * 2,
          r = Math.sqrt(random()) * 0.97;
        target = {
          x: bounds.x + Math.cos(a) * r * rx,
          y: bounds.y + Math.sin(a) * r * ry,
        };
        distance = Math.hypot(target.x - p.x, target.y - p.y);
      } while (distance < tuning.minLeg);
      const duration = distance / tuning.moveSpeed;
      if (remaining <= duration) {
        const u = remaining / duration;
        return { x: p.x + (target.x - p.x) * u, y: p.y + (target.y - p.y) * u };
      }
      remaining -= duration;
      p = target;
    }
    return p;
  });
}
