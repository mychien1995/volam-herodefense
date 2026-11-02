import type { World, SimulationConfig, Point } from './types.js';
import { moveCircle } from './geometry.js';
import { hasStatus, statusValue } from './status.js';
/** Soft deterministic footprint separation for private dungeon packs, never sprite teleporting. */
export function separateDungeonCreeps(
  w: World,
  c: SimulationConfig,
  starts?: Map<string, Point>,
): void {
  if (!c.dungeonAggro) return;
  const units = [...w.creeps.values()]
    .filter((e) => e.hp > 0 && !e.controlled && !e.bossEncounter)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const cell = 40;
  const speeds = new Map(
    units.map((e) => [
      e.id,
      ((e.stats ?? c.creep).speed *
        (1 - Math.min(0.85, statusValue(e, 'slow', w.tick)))) /
        c.tickRate,
    ]),
  );
  const budget = new Map(units.map((e) => [e.id, speeds.get(e.id)! * 0.4]));
  for (let pass = 0; pass < 2; pass++) {
    const bins = new Map<string, number[]>();
    units.forEach((e, i) => {
      const key = Math.floor(e.x / cell) + ',' + Math.floor(e.y / cell);
      const list = bins.get(key) ?? [];
      list.push(i);
      bins.set(key, list);
    });
    for (let i = 0; i < units.length; i++) {
      const a = units[i]!,
        gx = Math.floor(a.x / cell),
        gy = Math.floor(a.y / cell);
      for (let x = gx - 1; x <= gx + 1; x++)
        for (let y = gy - 1; y <= gy + 1; y++)
          for (const j of bins.get(x + ',' + y) ?? []) {
            if (j <= i) continue;
            const b = units[j]!,
              ar = (a.stats ?? c.creep).radius,
              br = (b.stats ?? c.creep).radius;
            const dist = Math.hypot(a.x - b.x, a.y - b.y),
              gap = Math.max(24, ar + br);
            if (dist >= gap) continue;
            const angle = (i * 31 + j * 17) * 2.399963229728653;
            const dx = dist > 0.001 ? (a.x - b.x) / dist : Math.cos(angle),
              dy = dist > 0.001 ? (a.y - b.y) / dist : Math.sin(angle);
            for (const [e, sign, r] of [
              [a, 1, ar],
              [b, -1, br],
            ] as const) {
              if (hasStatus(e, 'stun', w.tick)) continue;
              const push = Math.min((gap - dist) / 2, budget.get(e.id) ?? 0);
              if (push <= 0) continue;
              budget.set(e.id, (budget.get(e.id) ?? 0) - push);
              moveCircle(
                e,
                { x: dx * push * sign, y: dy * push * sign },
                r,
                c.width,
                c.height,
                c.collision,
              );
              const old = starts?.get(e.id),
                max = speeds.get(e.id)!;
              if (old) {
                const dx = e.x - old.x,
                  dy = e.y - old.y,
                  n = Math.hypot(dx, dy);
                if (n > max)
                  moveCircle(
                    e,
                    {
                      x: old.x + (dx / n) * max - e.x,
                      y: old.y + (dy / n) * max - e.y,
                    },
                    r,
                    c.width,
                    c.height,
                    c.collision,
                  );
              }
            }
          }
    }
  }
}
