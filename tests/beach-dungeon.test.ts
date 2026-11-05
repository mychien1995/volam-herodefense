import { describe, it, expect } from 'vitest';
import { blocked, DungeonMatch } from '@volam/game-core';
import {
  beachDungeon as d,
  beachRoster,
  creepDungeon,
  desertDungeon,
  m1Config,
  dungeonForZone,
} from '@volam/game-data';
import { dungeonActionSchema, PROTOCOL_VERSION } from '@volam/game-protocol';
const setup = () => {
  const c = structuredClone(m1Config);
  c.creep.speed = 0;
  return new DungeonMatch(c, creepDungeon, 42, undefined, [desertDungeon, d]);
};
const steps = (m: DungeonMatch, n: number) => {
  for (let i = 0; i < n; i++) m.step();
};
describe('Beach shared map and authoritative integration', () => {
  it('keeps the renovated outer coast solid, sparse rocks blocked and gameplay markers connected', () => {
    const free = (x: number, y: number) =>
      !blocked({ x, y }, m1Config.radius, d.width, d.height, d.collision);
    expect(free(480, 800)).toBe(true);
    expect(free(480, 864)).toBe(true);
    expect(free(1328, 704)).toBe(true);
    expect(free(1408, 704)).toBe(false);
    expect(free(1472, 800)).toBe(false);
    expect(free(416, 352)).toBe(true);
    expect(free(302, 359)).toBe(false);
    const queue = [d.spawn],
      seen = new Set([`${d.spawn.x},${d.spawn.y}`]);
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i]!;
      for (const [dx, dy] of [
        [8, 0],
        [-8, 0],
        [0, 8],
        [0, -8],
      ]) {
        const x = p.x + dx!,
          y = p.y + dy!,
          key = `${x},${y}`;
        if (!seen.has(key) && free(x, y)) {
          seen.add(key);
          queue.push({ x, y });
        }
      }
    }
    for (const p of [
      d.exit,
      ...d.creepSpawns,
      { x: 480, y: 864 },
      { x: 1328, y: 704 },
      ...Array.from({ length: 6 }, (_, i) => ({
        x: d.spawn.x,
        y: d.spawn.y + i * 24,
      })),
    ])
      expect(seen.has(`${p.x},${p.y}`), JSON.stringify(p)).toBe(true);
  });
  it('uses the existing sea card ID and rejects forged destinations and stats', () => {
    const p = {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 1,
      action: 'enter',
      access: 'shared',
      destination: 'sea',
    };
    expect(dungeonActionSchema.safeParse(p).success).toBe(true);
    expect(
      dungeonActionSchema.safeParse({ ...p, destination: 'beach' }).success,
    ).toBe(false);
    expect(dungeonActionSchema.safeParse({ ...p, hp: 999 }).success).toBe(
      false,
    );
    expect(dungeonForZone('sea_shared')).toBe(d);
    expect(dungeonForZone('desert_private_a')).toBe(desertDungeon);
    expect(() => dungeonForZone('forged')).toThrow();
  });
  it('isolates Beach private/shared, forest and desert; preserves paused worlds and physical exits', () => {
    const m = setup();
    for (const id of ['a', 'b', 'c', 'f', 'd']) m.add(id, id);
    m.enter('a', 'shared', 'sea');
    m.enter('b', 'shared', 'sea');
    m.enter('c', 'private', 'sea');
    m.enter('f', 'shared', 'forest');
    m.enter('d', 'shared', 'desert');
    const z = m.zoneOf('a')!,
      privateZone = m.zoneOf('c')!;
    expect(m.zoneOf('b')).not.toBe(z);
    expect(privateZone).not.toBe(z);
    expect(m.zoneOf('f')).not.toBe(z);
    expect(m.zoneOf('d')).not.toBe(z);
    expect(m.exit('a')).toBeDefined();
    for (const id of ['a', 'b']) {
      Object.assign(m.hero(id)!, d.exit);
      expect(m.exit(id)).toBeUndefined();
    }
    const t = z.world.tick;
    steps(m, 20);
    expect(z.world.tick).toBe(t);
    expect(privateZone.world.tick).toBeGreaterThan(0);
    m.enter('a', 'shared', 'sea');
    steps(m, 1);
    expect(z.world.tick).toBe(t + 1);
  });
  it('uses unchanged common combat tuning and rotates all six identities after a full clear', () => {
    const m = setup();
    m.add('a', 'A');
    m.enter('a', 'shared', 'sea');
    const z = m.zoneOf('a')!;
    expect(z.config.creep).toEqual({
      ...m.base.creep,
      speed: m.base.speed * 0.648,
    });
    expect([...z.world.creeps.values()].map((c) => c.archetypeId)).toEqual(
      Array(d.baseCount).fill(beachRoster[0]),
    );
    steps(m, d.restTicks + 2);
    expect(z.wave).toBe(1);
    for (const c of z.world.creeps.values()) c.hp = 0;
    steps(m, d.restTicks + 1);
    expect(z.wave).toBe(2);
    expect([...z.world.creeps.values()].map((c) => c.archetypeId)).toEqual(
      Array(d.baseCount).fill(beachRoster[1]),
    );
  });
});
