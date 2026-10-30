import { expect, it } from 'vitest';
import { blocked } from '@volam/game-core';
import { arena, m1Config, mapObjects } from '@volam/game-data';
import { readFileSync } from 'node:fs';

it('removes the courtyard obstruction on the authoritative map and keeps moved trunks aligned', () => {
  expect(arena.scenery.some((t) => t.name === 'tree_west')).toBe(false);
  expect(mapObjects('collision').some((t) => t.name === 'trunk_west')).toBe(
    false,
  );
  for (const point of [
    { x: 680, y: 642 },
    { x: 680, y: 650 },
    { x: 840, y: 411 },
  ])
    expect(
      blocked(
        point,
        m1Config.radius,
        arena.width,
        arena.height,
        arena.collision,
      ),
    ).toBe(false);
  for (const tree of arena.scenery) {
    const rect = mapObjects('collision').find(
      (o) => o.name === tree.name.replace('tree', 'trunk'),
    )!;
    expect(rect).toBeDefined();
    expect(rect.x + rect.width / 2).toBe(tree.x);
    expect(rect.y + rect.height).toBe(tree.y);
  }
  for (let x = 64; x <= 1536; x += 16)
    expect(
      blocked(
        { x, y: 672 },
        m1Config.radius,
        arena.width,
        arena.height,
        arena.collision,
      ),
    ).toBe(false);
  expect(mapObjects('statue')[0]).toMatchObject({ x: 800, y: 576 });
});
it('authors expanded paving and both broad approach routes in Tiled data', () => {
  const map = JSON.parse(readFileSync('maps/arena.tmj', 'utf8'));
  const ground = map.layers.find((l: { name: string }) => l.name === 'ground')
    .data as number[];
  const at = (x: number, y: number) =>
    ground[Math.floor(y / 32) * map.width + Math.floor(x / 32)]!;
  for (const p of [
    { x: 540, y: 616 },
    { x: 1060, y: 616 },
    { x: 800, y: 376 },
    { x: 800, y: 856 },
    { x: 64, y: 552 },
    { x: 1536, y: 680 },
  ])
    expect(at(p.x, p.y)).toBeGreaterThanOrEqual(5);
});
