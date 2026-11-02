import { describe, it, expect } from 'vitest';
import { blocked, DungeonMatch } from '@volam/game-core';
import {
  hellDungeon as d,
  hellRoster,
  creepDungeon,
  desertDungeon,
  beachDungeon,
  m1Config,
  dungeonForZone,
} from '@volam/game-data';
import { dungeonActionSchema, PROTOCOL_VERSION } from '@volam/game-protocol';
const setup = () => {
  const c = structuredClone(m1Config);
  c.creep.speed = 0;
  return new DungeonMatch(c, creepDungeon, 42, undefined, [
    desertDungeon,
    beachDungeon,
    d,
  ]);
};
const steps = (m: DungeonMatch, n: number) => {
  for (let i = 0; i < n; i++) m.step();
};
describe('Hell shared map and authoritative integration', () => {
  it('keeps lava impassable, the bridge route walkable, and connects every gameplay marker', () => {
    const free = (x: number, y: number) =>
      !blocked({ x, y }, m1Config.radius, d.width, d.height, d.collision);
    expect(free(704, 576)).toBe(false);
    expect(free(704, 720)).toBe(true);
    expect(free(640, 640)).toBe(false);
    for (let x = 256; x <= 1664; x += 8)
      expect(free(x, 720), `bridge route ${x},720`).toBe(true);
    expect(free(1664, 704)).toBe(true);
    expect(free(960, 128)).toBe(false);
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
      { x: 704, y: 720 },
      { x: 1664, y: 704 },
      ...Array.from({ length: 6 }, (_, i) => ({
        x: d.spawn.x,
        y: d.spawn.y + i * 24,
      })),
    ])
      expect(seen.has(`${p.x},${p.y}`), JSON.stringify(p)).toBe(true);
  });
  it('uses the existing Hell card ID and rejects forged destinations and stats', () => {
    const p = {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 1,
      action: 'enter',
      access: 'shared',
      destination: 'hell',
    };
    expect(dungeonActionSchema.safeParse(p).success).toBe(true);
    expect(
      dungeonActionSchema.safeParse({ ...p, destination: 'forged' }).success,
    ).toBe(false);
    expect(dungeonActionSchema.safeParse({ ...p, hp: 999 }).success).toBe(
      false,
    );
    expect(dungeonForZone('hell_shared')).toBe(d);
    expect(dungeonForZone('desert_private_a')).toBe(desertDungeon);
    expect(() => dungeonForZone('forged')).toThrow();
  });
  it('normalizes Hell to private and isolates forest/desert; preserves paused worlds and physical exits', () => {
    const m = setup();
    for (const id of ['a', 'b', 'c', 'f', 'd']) m.add(id, id);
    m.enter('a', 'shared', 'hell');
    m.enter('b', 'shared', 'hell');
    m.enter('c', 'private', 'hell');
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
    m.enter('a', 'shared', 'hell');
    steps(m, 1);
    expect(z.world.tick).toBe(t + 1);
  });
  it('uses approved creep speed and one identity per wave, changing after a clear', () => {
    const m = setup();
    m.add('a', 'A');
    m.enter('a', 'shared', 'hell');
    const z = m.zoneOf('a')!;
    expect(z.config.creep).toEqual({
      ...m.base.creep,
      speed: m.base.speed * 0.648,
    });
    expect(z.world.creeps.size).toBe(6);
    expect([
      ...new Set([...z.world.creeps.values()].map((c) => c.archetypeId)),
    ]).toEqual([hellRoster[0]]);
    steps(m, d.restTicks + 2);
    expect(z.wave).toBe(1);
    for (const c of z.world.creeps.values()) c.hp = 0;
    steps(m, d.restTicks + 1);
    expect(z.wave).toBe(2);
    expect(z.world.creeps.size).toBe(6);
    expect([
      ...new Set([...z.world.creeps.values()].map((c) => c.archetypeId)),
    ]).toEqual([hellRoster[1]]);
  });
});
