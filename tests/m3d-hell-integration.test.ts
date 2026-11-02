import { expect, it } from 'vitest';
import { DungeonMatch } from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  creepDungeons,
  hellDungeon,
  hellRoster,
  dungeonForZone,
} from '@volam/game-data';
import { dungeonActionSchema, PROTOCOL_VERSION } from '@volam/game-protocol';

it('M3D combines Hell with every existing destination and keeps encounter worlds independent', () => {
  expect(PROTOCOL_VERSION).toBe(19);
  const destinations = [
    'forest',
    'desert',
    'sea',
    'hell',
    'chu_ba_thong',
    'hong_liet',
    'kim_luan',
    'co_mo',
  ];
  expect(creepDungeons.map((d) => d.id)).toEqual(
    expect.arrayContaining(destinations),
  );
  for (const destination of destinations) {
    expect(
      dungeonActionSchema.safeParse({
        protocolVersion: PROTOCOL_VERSION,
        sequence: 1,
        action: 'enter',
        access: 'private',
        destination,
      }).success,
    ).toBe(true);
    expect(dungeonForZone(`${destination}_shared`).id).toBe(destination);
  }
  const match = new DungeonMatch(
    m1Config,
    creepDungeon,
    42,
    undefined,
    creepDungeons.slice(1),
  );
  const party = [
    'hell',
    'hong_liet',
    'chu_ba_thong',
    'kim_luan',
    'co_mo',
    'sea',
  ];
  for (const id of party) {
    match.add(id, id);
    expect(match.enter(id, 'private', id)).toBeUndefined();
  }
  const hell = match.zoneOf('hell')!;
  expect(hell.dungeon).toBe(hellDungeon);
  expect(hell.config.creep).toEqual(m1Config.creep);
  expect([...hell.world.creeps.values()].map((c) => c.archetypeId)).toEqual(
    hellRoster.slice(0, 3),
  );
  expect(hell.world.boss).toBeUndefined();
  expect(hell.kim).toBeUndefined();
  for (const id of party.slice(1))
    expect(match.zoneOf(id)!.world).not.toBe(hell.world);
  const tick = hell.world.tick;
  match.remove('hell');
  match.step();
  expect(hell.world.tick).toBe(tick);
  match.add('hell', 'Hell');
  expect(match.enter('hell', 'private', 'hell')).toBeUndefined();
  match.step();
  expect(hell.world.tick).toBe(tick + 1);
});
