import { describe, expect, it } from 'vitest';
import { blocked, moveCircle } from '@volam/game-core';
import { creepDungeon as d, m1Config } from '@volam/game-data';
import { readFileSync } from 'node:fs';
const map = JSON.parse(
  readFileSync(new URL('../maps/creep_forest.tmj', import.meta.url), 'utf8'),
);
const free = (x: number, y: number) =>
  !blocked({ x, y }, m1Config.radius, d.width, d.height, d.collision);
describe('Bamboo Forest authored map contract', () => {
  it('retains all gameplay markers and leaves six entry seats clear', () => {
    expect([d.width, d.height, d.capacity]).toEqual([960, 640, 6]);
    expect(d.spawn).toEqual({ x: 240, y: 320 });
    expect(d.exit).toEqual({ x: 160, y: 320 });
    expect(d.creepSpawns).toHaveLength(12);
    for (let i = 0; i < 6; i++) expect(free(240, 320 + i * 24)).toBe(true);
    for (const p of d.creepSpawns) expect(free(p.x, p.y)).toBe(true);
  });
  it('connects entry, exit, every enemy slot, all clearings and both bridge centers', () => {
    const seen = new Set<string>(['240,320']),
      queue = [[240, 320]];
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i]!;
      for (const [dx, dy] of [
        [8, 0],
        [-8, 0],
        [0, 8],
        [0, -8],
      ]) {
        const nx = x! + dx!,
          ny = y! + dy!,
          key = nx + ',' + ny;
        if (!seen.has(key) && free(nx, ny)) {
          seen.add(key);
          queue.push([nx, ny]);
        }
      }
    }
    for (const p of [
      d.exit,
      ...d.creepSpawns,
      { x: 480, y: 336 },
      { x: 224, y: 584 },
      { x: 800, y: 584 },
    ])
      expect(seen.has(p.x + ',' + p.y), 'reachable ' + JSON.stringify(p)).toBe(
        true,
      );
  });
  it('enforces solid bamboo footprints and stream banks but allows bridge decks', () => {
    for (const [x, y] of [
      [440, 228],
      [840, 432],
      [400, 576],
    ])
      expect(free(x!, y!)).toBe(false);
    for (const x of [224, 800]) expect(free(x, 576)).toBe(true);
    const p = { x: 440, y: 280 };
    moveCircle(
      p,
      { x: 0, y: -100 },
      m1Config.radius,
      d.width,
      d.height,
      d.collision,
    );
    expect(p.y).toBeGreaterThanOrEqual(240 + m1Config.radius);
    expect(map.orientation).toBe('orthogonal');
    for (const name of ['ground', 'paving', 'details']) {
      const l = map.layers.find((v: { name: string }) => v.name === name);
      expect(l.data).toHaveLength(600);
      expect(
        l.data.every((v: number) => v >= 0 && v <= map.tilesets[0].tilecount),
      ).toBe(true);
    }
  });
});
