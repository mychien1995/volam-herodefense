import { describe, expect, it } from 'vitest';
import { blocked, distance, DungeonMatch } from '@volam/game-core';
import {
  creepDungeon,
  creepCombatDefinition,
  desertDungeon as d,
  desertRoster,
  m1Config,
} from '@volam/game-data';
import { dungeonActionSchema, PROTOCOL_VERSION } from '@volam/game-protocol';

function setup() {
  const config = structuredClone(m1Config);
  config.creep.speed = 0;
  config.creepCombat = creepCombatDefinition;
  return new DungeonMatch(config, creepDungeon, 42, undefined, [d]);
}
const step = (m: DungeonMatch, n: number) => {
  for (let i = 0; i < n; i++) m.step();
};
describe('desert map and authoritative destination contract', () => {
  it('connects every spawn and exit through walkable space with six clear entry seats', () => {
    const free = (x: number, y: number) =>
      !blocked({ x, y }, m1Config.radius, d.width, d.height, d.collision);
    const seen = new Set([`${d.spawn.x},${d.spawn.y}`]);
    const queue = [d.spawn];
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
      ...Array.from({ length: 6 }, (_, i) => ({
        x: d.spawn.x,
        y: d.spawn.y + 24 * i,
      })),
    ])
      expect(seen.has(`${p.x},${p.y}`), JSON.stringify(p)).toBe(true);
    expect(free(352, 448)).toBe(true); // Removed ruin cannot leave an invisible wall.
    expect(free(308, 551)).toBe(false); // Shared sparse rock footprint.
  });
  it('validates destinations and preserves the existing forest default', () => {
    const payload = {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 1,
      action: 'enter',
      access: 'shared',
    };
    expect(dungeonActionSchema.parse(payload)).toMatchObject(payload);
    expect(
      dungeonActionSchema.safeParse({ ...payload, destination: 'forged' })
        .success,
    ).toBe(false);
    expect(
      dungeonActionSchema.safeParse({
        ...payload,
        destination: 'desert',
        damage: 999,
      }).success,
    ).toBe(false);
    const m = setup();
    m.add('a', 'A');
    expect(m.enter('a', 'shared', 'sea')).toContain('chưa mở');
    expect(m.zones.size).toBe(1);
    expect(m.enter('a', 'shared')).toBeUndefined();
    expect(m.zoneOf('a')!.id).toBe('forest_private_a');
  });
  it('isolates desert private/shared and forest populations, exits and paused clocks', () => {
    const m = setup();
    for (const id of ['a', 'b', 'c', 'f']) m.add(id, id);
    m.enter('a', 'shared', 'desert');
    m.enter('b', 'shared', 'desert');
    m.enter('c', 'private', 'desert');
    m.enter('f', 'shared', 'forest');
    const z = m.zoneOf('a')!,
      privateZone = m.zoneOf('c')!,
      forest = m.zoneOf('f')!;
    expect(m.zoneOf('b')).not.toBe(z);
    expect(z.config.collision).toEqual(d.collision);
    expect(privateZone).not.toBe(z);
    expect(forest).not.toBe(z);
    expect(m.exit('a')).toContain('Space');
    for (const id of ['a', 'b']) {
      Object.assign(m.hero(id)!, d.exit);
      expect(m.exit(id)).toBeUndefined();
    }
    const t = z.world.tick,
      privateTick = privateZone.world.tick;
    step(m, 20);
    expect(z.world.tick).toBe(t);
    expect(privateZone.world.tick).toBeGreaterThan(privateTick);
    expect(m.enter('a', 'shared', 'desert')).toBeUndefined();
    step(m, 1);
    expect(z.world.tick).toBe(t + 1);
    expect(m.hero('b')).toMatchObject(d.arenaReturn);
  });
  it('rolls four safe pits on every visit to the same private instance', () => {
    const m = setup();
    m.add('a', 'A');
    expect(m.enter('a', 'private', 'desert')).toBeUndefined();
    const zone = m.zoneOf('a')!;
    const pits = () =>
      [...zone.world.creepCombat!.effects.values()]
        .filter((effect) => effect.abilityId === 'quicksand')
        .map(({ x, y, radius }) => ({ x, y, radius }));
    const roster = [...zone.world.creeps.keys()];
    for (let visit = 0; visit < 16; visit++) {
      const layout = pits();
      expect(layout).toHaveLength(4);
      for (const [i, pit] of layout.entries()) {
        expect(blocked(pit, pit.radius, d.width, d.height, d.collision)).toBe(
          false,
        );
        expect(distance(pit, d.spawn)).toBeGreaterThan(pit.radius);
        expect(distance(pit, d.exit)).toBeGreaterThan(pit.radius);
        for (const other of layout.slice(i + 1))
          expect(distance(pit, other)).toBeGreaterThanOrEqual(
            pit.radius + other.radius,
          );
      }
      step(m, 1);
      expect(pits()).toEqual(layout);
      Object.assign(m.hero('a')!, d.exit);
      expect(m.exit('a')).toBeUndefined();
      expect(m.enter('a', 'private', 'desert')).toBeUndefined();
      expect(m.zoneOf('a')).toBe(zone);
      expect([...zone.world.creeps.keys()]).toEqual(roster);
      expect(pits()).not.toEqual(layout);
    }
  });
  it('rotates all six server identities through existing scaled waves without changing combat tuning', () => {
    const m = setup();
    m.add('a', 'A');
    m.enter('a', 'shared', 'desert');
    const z = m.zoneOf('a')!;
    const first = [...z.world.creeps.values()];
    expect(first.map((c) => c.archetypeId)).toEqual(
      Array(d.baseCount).fill(desertRoster[0]),
    );
    expect(z.config.creep).toEqual({
      ...m.base.creep,
      speed: m.base.speed * 0.648,
    });
    step(m, d.restTicks + 2);
    expect(z.wave).toBe(1);
    for (const c of first) c.hp = 0;
    step(m, d.restTicks + 1);
    expect(z.wave).toBe(2);
    expect([...z.world.creeps.values()].map((c) => c.archetypeId)).toEqual(
      Array(d.baseCount).fill(desertRoster[1]),
    );
    expect(z.config.creep.hp).toBe(
      Math.round(m.base.creep.hp * (1 + d.hpPerWave)),
    );
  });
});
