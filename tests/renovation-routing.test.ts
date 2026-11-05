import { expect, it } from 'vitest';
import { creepDungeons } from '@volam/game-data';
import {
  renovatedActors,
  renovationActorId,
} from '../apps/game-client/src/renovation-model.js';
it('covers every original invasion wave and all actual dungeon roster identities', () => {
  expect(renovatedActors).toHaveLength(74);
  const waves = Array.from({ length: 20 }, (_, i) =>
    renovationActorId(undefined, i + 1, 'arena'),
  );
  expect(new Set(waves).size).toBe(20);
  expect(waves.every((id) => id?.startsWith('creep_'))).toBe(true);
  for (const dungeon of creepDungeons.filter((d) =>
    ['forest', 'desert', 'sea', 'hell'].includes(d.id),
  ))
    for (const archetype of dungeon.creepRoster!) {
      expect(
        renovationActorId(archetype, undefined, dungeon.id + '_private_test'),
        dungeon.id + ':' + archetype,
      ).toBeDefined();
    }
  expect(renovationActorId(undefined, 0, 'arena')).toBeUndefined();
  expect(renovationActorId(undefined, 21, 'arena')).toBeUndefined();
  expect(
    renovationActorId('unknown', 1, 'forest_private_test'),
  ).toBeUndefined();
});
it('routes bespoke encounter aliases to approved identities', () => {
  for (const [live, art] of [
    ['chu_wine_disciple', 'toan_chan_disciple'],
    ['kim_luan_phap_vuong', 'kim_luan'],
    ['enemy_ly_mac_sau', 'ly_mac_sau'],
    ['kim_hoac_do', 'hoac_do'],
    ['kim_dat_nhi_ba', 'dat_nhi_ba'],
  ])
    expect(renovationActorId(live, undefined, 'arena')).toBe(art);
  for (const actor of renovatedActors)
    expect(renovationActorId(actor.id, undefined, 'arena')).toBe(actor.id);
});
