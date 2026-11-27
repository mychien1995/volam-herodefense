import { describe, expect, it } from 'vitest';
import { DungeonMatch, InvasionDirector, createWorld } from '@volam/game-core';
import { campaignDefinition, creepDungeon, m1Config } from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';
import { serverInvasionDefinition } from '../apps/game-server/src/invasion-config.js';

describe('approved wave rest and dungeon economy', () => {
  it('starts the next 120-second rest after the 60-second stream, even with surviving creeps', () => {
    const c = {
      ...structuredClone(m1Config),
      campaign: structuredClone(campaignDefinition),
      creepSpawns: [],
    };
    const w = createWorld(c, 17);
    const d = serverInvasionDefinition({ NODE_ENV: 'production' }, 4);
    const director = new InvasionDirector(d, w);
    const notices = [];
    for (let t = 1; t <= 9000; t++) {
      director.beforeStep(w, c, t, 1);
      notices.push(...director.events);
      if (t === 3600) expect(director.nextWaveTick).toBe(9000);
      if (t === 5399) expect(director.streaming).toBe(true);
      if (t === 5400) {
        expect(director.streaming).toBe(false);
        expect(director.nextWaveTick - t).toBe(3600);
        expect(w.invasionPending?.size).toBe(0);
      }
      if (t === 8999) expect(director.wave).toBe(1);
    }
    expect(
      notices.filter((e) => e.kind === 'wave').map((e) => e.atTick),
    ).toEqual([3600, 9000]);
    expect(
      notices
        .filter((e) => e.kind === 'warning' && e.wave === 2)
        .map((e) => [e.atTick, e.leadTicks]),
    ).toEqual([
      [7200, 1800],
      [8550, 450],
    ]);
    expect(
      [...w.creeps.values()].some((e) => e.invasion?.wave === 1 && e.hp > 0),
    ).toBe(true);
  });
  it('uses 15-minute difficulty floors and 25 percent more regular dungeon rewards', () => {
    expect(campaignDefinition.chapterSeconds).toBe(900);
    expect(campaignDefinition.dungeonXp).toEqual([3.75, 6.25, 10, 13.75, 17.5]);
    expect(campaignDefinition.dungeonGold).toEqual([
      1, 1.875, 2.5, 3.125, 3.75,
    ]);
  });
});

function dungeonFixture(
  players: number,
  seconds: number,
  chapter = 0,
  seed = 17,
) {
  const c = {
    ...structuredClone(m1Config),
    campaign: structuredClone(campaignDefinition),
    creepSpawns: [],
  };
  const m = new DungeonMatch(c, structuredClone(creepDungeon), seed);
  for (let i = 0; i < players; i++) m.add('p' + i, 'Player ' + i);
  m.arenaTick = seconds * c.tickRate;
  m.arena.world.campaign!.chapter = chapter;
  return { c, m };
}

describe('dungeon floor boundaries and authoritative reward settlement', () => {
  it.each([
    [600, 0],
    [899, 0],
    [900, 1],
    [1799, 1],
    [1800, 2],
    [2700, 3],
    [3600, 4],
    [9000, 4],
  ])('snapshots the elapsed floor at %i seconds', (seconds, chapter) => {
    const { m, c } = dungeonFixture(1, seconds);
    expect(m.enter('p0', 'private', 'forest')).toBeUndefined();
    const z = m.zoneOf('p0')!;
    expect(z.config.creep.hp).toBe(
      Math.round(c.creep.hp * c.campaign.dungeonHp[chapter]!),
    );
    expect(z.config.creep.damage).toBe(
      Math.round(c.creep.damage * c.campaign.dungeonDamage[chapter]!),
    );
    expect(z.config.creep.xp * z.world.creeps.size).toBeCloseTo(
      c.campaign.dungeonXp[chapter]! * 6,
    );
  });
  it('lets actual boss progression raise the floor early, without changing an existing wave', () => {
    const { m, c } = dungeonFixture(1, 600, 2);
    m.enter('p0', 'private', 'forest');
    const z = m.zoneOf('p0')!;
    expect(z.config.creep.hp).toBe(
      Math.round(c.creep.hp * c.campaign.dungeonHp[2]!),
    );
    const hp = [...z.world.creeps.values()][0]!.maxHp;
    m.arenaTick = 3600 * c.tickRate;
    m.step();
    expect([...z.world.creeps.values()][0]!.maxHp).toBe(hp);
  });
  for (const seed of [17, 41, 89])
    for (const players of [1, 2, 6])
      for (const access of ['private', 'shared'] as const)
        it(`settles +25% once with fractional remainders: ${access} P${players} seed ${seed}`, () => {
          const { m } = dungeonFixture(players, 0, 0, seed);
          const ids = access === 'private' ? ['p0'] : [...m.membership.keys()];
          for (const id of ids)
            expect(m.enter(id, access, 'forest')).toBeUndefined();
          const z = m.zoneOf('p0')!;
          for (const e of z.world.creeps.values()) {
            for (const id of ids)
              hurt(z.world, e, id, 'assist', 1, z.config, {
                critChance: 0,
                critMultiplier: 1,
                directHp: true,
              });
            hurt(z.world, e, ids[0]!, 'kill', 100000, z.config, {
              critChance: 0,
              critMultiplier: 1,
              directHp: true,
            });
          }
          const shares = Math.ceil(6 * (1 + 0.1 * (players - 1)));
          const total = (field: 'xp' | 'gold') =>
            ids.reduce((sum, id) => {
              const h = m.hero(id)!;
              return (
                sum +
                h[field] +
                (field === 'xp'
                  ? (h.farmXpRemainder ?? 0)
                  : (h.farmGoldRemainder ?? 0))
              );
            }, 0);
          expect(total('xp')).toBeCloseTo(shares * 3 * 1.25);
          expect(total('gold')).toBeCloseTo(shares * 0.8 * 1.25);
          const gold = total('gold');
          for (const e of z.world.creeps.values())
            hurt(z.world, e, ids[0]!, 'duplicate', 100000, z.config);
          expect(total('gold')).toBeCloseTo(gold);
        });
});

it('enables resting for normal runtime and preserves explicit accelerated DEV fixtures', () => {
  expect(
    serverInvasionDefinition({
      NODE_ENV: 'production',
      VOLAM_INVASION_INTERVAL_SECONDS: '3',
    }).restAfterStream,
  ).toBe(true);
  expect(
    serverInvasionDefinition({ NODE_ENV: 'development' }).restAfterStream,
  ).toBe(true);
  expect(
    serverInvasionDefinition({
      NODE_ENV: 'development',
      VOLAM_INVASION_INTERVAL_SECONDS: '3',
    }).restAfterStream,
  ).toBe(false);
  expect(
    serverInvasionDefinition({
      NODE_ENV: 'development',
      VOLAM_DEV_CREEP_TEST: '1',
    }).restAfterStream,
  ).toBe(false);
});
