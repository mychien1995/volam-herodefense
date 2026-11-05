import type { Rect } from '@volam/game-core';
/** Sparse, shared authoritative footprints for the reviewed open dungeon floors. */
export const renovationRocks: Record<string, Rect[]> = {
  forest: [
    { x: 74, y: 190, width: 44, height: 18 },
    { x: 842, y: 440, width: 44, height: 18 },
  ],
  desert: [
    { x: 286, y: 542, width: 44, height: 18 },
    { x: 1190, y: 574, width: 44, height: 18 },
  ],
  sea: [
    { x: 280, y: 350, width: 44, height: 18 },
    { x: 1132, y: 650, width: 44, height: 18 },
  ],
  hell: [
    { x: 310, y: 512, width: 44, height: 18 },
    { x: 1510, y: 800, width: 44, height: 18 },
  ],
};
export function renovationCollision(
  id: string,
  width: number,
  height: number,
  legacy: Rect[],
): Rect[] {
  const rocks = renovationRocks[id];
  if (!rocks && id !== 'co_mo') return legacy;
  // The new forest floor has no interior river or fences: their old invisible
  // banks/rails must not remain solid. Other maps retain the outer coast/lava.
  const perimeter =
    id === 'sea'
      ? [
          { x: width * 0.9, y: 0, width: width * 0.1, height },
          { x: 0, y: height * 0.9, width, height: height * 0.1 },
        ]
      : id === 'hell'
        ? [
            { x: 0, y: 0, width: width * 0.055, height },
            { x: width * 0.945, y: 0, width: width * 0.055, height },
          ]
        : id === 'co_mo'
          ? legacy.filter(
              (b) =>
                b.x === 0 ||
                b.y === 0 ||
                b.x + b.width >= width ||
                b.y + b.height >= height,
            )
          : [];
  return [...perimeter, ...(rocks ?? []).map((r) => ({ ...r }))];
}
