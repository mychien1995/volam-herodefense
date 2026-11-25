import type { Rect } from '@volam/game-core';

export interface ArenaProp {
  kind: string;
  x: number;
  y: number;
  scale?: number;
}
/** Feet placements are shared by the renderer and authoritative navigation. */
export const arenaProps: Record<string, ArenaProp[]> = {
  dao_hoa_dao: [
    ...[
      [470, 450],
      [1130, 780],
      [420, 1010],
    ].map(([x, y]) => ({ kind: 'peach-large', x: x!, y: y! })),
    ...[
      [1130, 450],
      [465, 790],
      [1180, 1030],
    ].map(([x, y]) => ({ kind: 'peach-small', x: x!, y: y! })),
    { kind: 'pavilion', x: 1280, y: 290 },
    { kind: 'garden-rock', x: 330, y: 285, scale: 0.6 },
  ],
  tuong_duong: [
    { kind: 'fortress-gate', x: 800, y: 240, scale: 1.2 },
    { kind: 'watchtower', x: 460, y: 450, scale: 0.9 },
    { kind: 'watchtower', x: 1160, y: 450, scale: 0.9 },
    { kind: 'barracks', x: 400, y: 960, scale: 1.1 },
    { kind: 'barracks', x: 1260, y: 990, scale: 1.1 },
    { kind: 'war-banner', x: 470, y: 790, scale: 0.7 },
    { kind: 'war-banner', x: 1130, y: 810, scale: 0.7 },
  ],
  tu_hien_trang: [
    { kind: 'manor-hall', x: 1120, y: 170, scale: 1.2 },
    ...[
      [250, 480],
      [1350, 780],
      [390, 1080],
      [1260, 300],
    ].map(([x, y]) => ({ kind: 'willow', x: x!, y: y! })),
    { kind: 'lotus-pavilion', x: 1320, y: 1060, scale: 0.85 },
    ...[
      [370, 450],
      [1230, 450],
      [370, 620],
      [1230, 620],
    ].map(([x, y]) => ({ kind: 'bridge-railing', x: x!, y: y!, scale: 1.05 })),
  ],
};
// World footprints at scale 1. Canopies/roofs remain occluding foreground,
// while trunks, masonry, posts and the building base are solid.
const feet: Record<string, Rect[]> = {
  'peach-large': [{ x: -27, y: -27, width: 54, height: 30 }],
  'peach-small': [{ x: -20, y: -22, width: 40, height: 25 }],
  willow: [{ x: -24, y: -25, width: 48, height: 28 }],
  pavilion: [{ x: -65, y: -53, width: 130, height: 56 }],
  'garden-rock': [{ x: -62, y: -48, width: 124, height: 50 }],
  watchtower: [{ x: -49, y: -42, width: 98, height: 44 }],
  barracks: [{ x: -86, y: -57, width: 172, height: 59 }],
  'war-banner': [{ x: -23, y: -20, width: 46, height: 23 }],
  'manor-hall': [{ x: -124, y: -47, width: 248, height: 50 }],
  'lotus-pavilion': [{ x: -59, y: -46, width: 118, height: 48 }],
  'bridge-railing': [{ x: -100, y: -6, width: 200, height: 9 }],
  // Leave the actual gate opening traversable on the north road.
  'fortress-gate': [
    { x: -112, y: -43, width: 49, height: 46 },
    { x: 63, y: -43, width: 49, height: 46 },
  ],
};
export function arenaPropCollision(id: string): Rect[] {
  return (arenaProps[id] ?? []).flatMap((p) =>
    (feet[p.kind] ?? []).map((r) => {
      const s = p.scale ?? 1;
      return {
        x: p.x + r.x * s,
        y: p.y + r.y * s,
        width: r.width * s,
        height: r.height * s,
      };
    }),
  );
}
