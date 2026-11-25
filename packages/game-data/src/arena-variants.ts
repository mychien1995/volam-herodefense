import { arenaPropCollision } from './arena-props.js';
import { arena } from './arena.js';
import type { Rect } from '@volam/game-core';
export const arenaIds = [
  'dao_hoa_dao',
  'tuong_duong',
  'tu_hien_trang',
] as const;
export type ArenaId = (typeof arenaIds)[number];
/** Registered to the ground raster in world units; pond water and prop feet are solid; camera remains unchanged. */
export const lotusGeometry = {
  x: 800,
  y: 535,
  innerX: 305,
  innerY: 256,
  outerX: 553,
  outerY: 424,
  bridgeHalf: 76,
  bridgeHalfX: 87,
};
function lotusCollision(): Rect[] {
  const r: Rect[] = [],
    g = lotusGeometry,
    cell = 16;
  for (let y = 0; y < arena.height; y += cell) {
    let start = -1;
    for (let x = 0; x <= arena.width; x += cell) {
      const dx = x + cell / 2 - g.x,
        dy = y + cell / 2 - g.y;
      const solid =
        x < arena.width &&
        Math.abs(dx) > g.bridgeHalfX &&
        Math.abs(dy) > g.bridgeHalf &&
        (dx / g.innerX) ** 2 + (dy / g.innerY) ** 2 > 1 &&
        (dx / g.outerX) ** 2 + (dy / g.outerY) ** 2 < 1;
      if (solid && start < 0) start = x;
      if (!solid && start >= 0) {
        r.push({ x: start, y, width: x - start, height: cell });
        start = -1;
      }
    }
  }
  return r;
}
export const arenaVariants = {
  dao_hoa_dao: {
    id: 'dao_hoa_dao',
    nameVi: 'Đào Hoa Đảo',
    concept: 'DH-B',
    collision: arenaPropCollision('dao_hoa_dao'),
    roadCenter: { x: 804, y: 512 },
    night: false,
  },
  tuong_duong: {
    id: 'tuong_duong',
    nameVi: 'Tương Dương',
    concept: 'TD-B',
    collision: arenaPropCollision('tuong_duong'),
    roadCenter: { x: 801, y: 498 },
    night: true,
  },
  tu_hien_trang: {
    id: 'tu_hien_trang',
    nameVi: 'Tụ Hiền Trang',
    concept: 'TH-B',
    collision: [...lotusCollision(), ...arenaPropCollision('tu_hien_trang')],
    roadCenter: { x: 802, y: 535 },
    night: true,
  },
} satisfies Record<
  ArenaId,
  {
    id: ArenaId;
    nameVi: string;
    concept: string;
    collision: Rect[];
    roadCenter: { x: number; y: number };
    night: boolean;
  }
>;
