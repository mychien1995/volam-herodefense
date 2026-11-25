import { expect, it } from 'vitest';
import { DungeonMatch } from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  coMoDungeon,
  kimLuanDungeon,
  creepDungeons,
} from '@volam/game-data';
import { dungeonActionSchema, PROTOCOL_VERSION } from '@volam/game-protocol';

it('M3D retains both boss destinations, separate clocks, gates and state owners', () => {
  expect(PROTOCOL_VERSION).toBe(49);
  expect(
    dungeonActionSchema.safeParse({
      protocolVersion: 17,
      sequence: 1,
      action: 'enter',
      access: 'shared',
      destination: 'co_mo',
    }).success,
  ).toBe(false);
  expect(creepDungeons.map((d) => d.id)).toEqual(
    expect.arrayContaining([
      'forest',
      'desert',
      'sea',
      'hell',
      'chu_ba_thong',
      'hong_liet',
      'co_mo',
      'kim_luan',
    ]),
  );
  const match = new DungeonMatch(m1Config, creepDungeon, 42, undefined, [
    coMoDungeon,
    kimLuanDungeon,
  ]);
  match.add('kim', 'Kim');
  match.add('co', 'Co');
  for (const [id, destination] of [
    ['kim', 'kim_luan'],
    ['co', 'co_mo'],
  ] as const) {
    expect(
      dungeonActionSchema.safeParse({
        protocolVersion: PROTOCOL_VERSION,
        sequence: 1,
        action: 'enter',
        access: 'shared',
        destination,
      }).success,
    ).toBe(true);
    expect(match.enter(id, 'shared', destination)).toBeUndefined();
  }
  const kim = match.zoneOf('kim')!,
    co = match.zoneOf('co')!;
  expect(kim.kim?.phase).toBe('disciples');
  expect(kim.world.boss).toBeUndefined();
  expect(co.world.boss?.actorId).toBeTruthy();
  expect(co.kim).toBeUndefined();
  kim.world.creeps.get('hoac_do')!.hp = 0;
  match.step();
  expect(kim.world.creeps.has('kim_luan_phap_vuong')).toBe(false);
  const coBoss = co.world.creeps.get(co.world.boss!.actorId)!;
  const coHp = coBoss.hp;
  kim.world.creeps.get('dat_nhi_ba')!.hp = 0;
  match.step();
  expect(kim.world.creeps.has('kim_luan_phap_vuong')).toBe(true);
  expect(coBoss.hp).toBe(coHp);
  match.remove('kim');
  for (let i = 0; i < 901; i++) match.step();
  expect(kim.kim?.phase).toBe('disciples');
  expect(kim.world.creeps.get('hoac_do')!.hp).toBe(3300);
  expect(co.world.boss?.actorId).toBeTruthy();
  expect(co.world.creeps.has('hoac_do')).toBe(false);
});
