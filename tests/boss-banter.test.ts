import { expect, it } from 'vitest';
import {
  addCreep,
  addHero,
  createWorld,
  DungeonMatch,
  stepWorld,
} from '@volam/game-core';
import { stepBossBanter } from '../packages/game-core/src/boss-banter.js';
import {
  bossBanterLines,
  bossBanterPools,
  m1Config,
  creepDungeon,
  coMoDungeon,
  chuBaThongDungeon,
  hongLietDungeon,
  kimLuanDungeon,
} from '@volam/game-data';

function setup(seed = 90) {
  const c = {
    ...structuredClone(m1Config),
    creepSpawns: [],
    collision: [],
    bossBanter: {
      ...structuredClone(m1Config.bossBanter!),
      openingTicks: 1,
      intervalTicks: 1,
      jitterTicks: 0,
    },
  };
  const w = createWorld(c, seed);
  addHero(w, 'p', 'P', c);
  for (const id of [...Object.keys(bossBanterPools), 'bac_cai']) {
    const a = addCreep(w, id, { x: 800, y: 616 }, c);
    a.controlled = true;
  }
  // Nam's phase belongs to its encounter, not a generic creep. Other encounter tests cover it.
  w.namDe = { phase: 'idle' } as NonNullable<typeof w.namDe>;
  return { w, c };
}
it('has exactly twenty unique original Vietnamese lines per requested boss and no Bắc Cái pool', () => {
  expect(Object.keys(bossBanterPools).sort()).toEqual([
    'boss_ly_mac_sau',
    'boss_nam_de',
    'chu_ba_thong',
    'dat_nhi_ba',
    'dong_ta',
    'hoac_do',
    'hong_liet_boss',
    'kim_luan_phap_vuong',
    'tay_doc_boss',
    'vuong_trung_duong',
  ]);
  expect(Object.keys(bossBanterLines)).toHaveLength(200);
  for (const lines of Object.values(bossBanterPools)) {
    expect(new Set(lines).size).toBe(20);
    expect(lines.every((s) => s.length > 25 && s.length < 125)).toBe(true);
  }
});
it('server-seeded decks exhaust all twenty without repetition, never repeat across decks, and synchronize stable line IDs', () => {
  const run = () => {
    const { w, c } = setup();
    const lines: Record<string, string[]> = {};
    for (let i = 0; i < 43; i++) {
      w.tick++;
      w.events = [];
      stepBossBanter(w, c);
      for (const e of w.events) {
        expect(e.stage).toBe('boss_banter');
        expect(bossBanterLines[e.abilityId]).toBeTruthy();
        (lines[e.sourceId] ??= []).push(e.abilityId);
      }
    }
    for (const pool of Object.values(lines)) {
      expect(new Set(pool.slice(0, 20)).size).toBe(20);
      expect(new Set(pool.slice(20, 40)).size).toBe(20);
      expect(pool[19]).not.toBe(pool[20]);
    }
    expect(Object.keys(lines).sort()).toEqual(
      Object.keys(bossBanterPools).sort(),
    );
    return lines;
  };
  expect(run()).toEqual(run());
});
it('defers chat during cast, suppresses dead bosses/empty fights and resets on respawn', () => {
  const { w, c } = setup();
  stepBossBanter(w, c);
  const a = w.creeps.get('dong_ta')!;
  a.pose = 'cast';
  w.tick = 5;
  stepBossBanter(w, c);
  expect(w.events.some((e) => e.sourceId === a.id)).toBe(false);
  a.pose = 'idle';
  a.hp = 0;
  stepBossBanter(w, c);
  expect(w.bossBanter!.has(a.id)).toBe(false);
  w.heroes.get('p')!.hp = 0;
  w.events = [];
  w.tick++;
  stepBossBanter(w, c);
  expect(w.events).toHaveLength(0);
  const respawn = addCreep(w, a.id, a, c);
  w.heroes.get('p')!.hp = 100;
  stepBossBanter(w, c);
  expect(w.bossBanter!.get(a.id)!.actor).toBe(respawn);
  expect(w.events).toHaveLength(0);
});
it('normal world stepping actually emits combat banter without client messages', () => {
  const c = { ...structuredClone(m1Config), creepSpawns: [], collision: [] };
  const w = createWorld(c);
  const h = addHero(w, 'p', 'P', c);
  h.hp = h.maxHp = 100000;
  const b = addCreep(w, 'dong_ta', { x: h.x, y: h.y - 200 }, c);
  b.controlled = true;
  const heard = [];
  for (let i = 0; i <= c.bossBanter!.openingTicks; i++) {
    stepWorld(w, c);
    heard.push(...w.events.filter((e) => e.stage === 'boss_banter'));
  }
  expect(heard).toHaveLength(1);
  expect(heard[0]!.sourceId).toBe(b.id);
});
it('cosmetic banter does not consume or perturb authoritative combat RNG', () => {
  const { w, c } = setup();
  const reference = createWorld(c, 90);
  for (let i = 0; i < 50; i++) {
    w.tick++;
    stepBossBanter(w, c);
  }
  expect(Array.from({ length: 20 }, () => w.random())).toEqual(
    Array.from({ length: 20 }, () => reference.random()),
  );
});

it.each([
  [coMoDungeon, 'boss_ly_mac_sau'],
  [chuBaThongDungeon, 'chu_ba_thong'],
  [hongLietDungeon, 'hong_liet_boss'],
  [kimLuanDungeon, 'hoac_do'],
] as const)(
  'emits live dungeon chatter in %s despite continuous actions',
  (dungeon, id) => {
    const config = structuredClone(m1Config);
    const match = new DungeonMatch(config, creepDungeon, 271, undefined, [
      dungeon,
    ]);
    const heroes = [match.add('a', 'A'), match.add('b', 'B')];
    for (const hero of heroes)
      expect(match.enter(hero.id, 'shared', dungeon.id)).toBeUndefined();
    const zone = match.zoneOf('a')!;
    const actor = zone.world.creeps.get(id)!;
    for (const [i, hero] of heroes.entries()) {
      hero.hp = hero.maxHp = 100_000;
      hero.x = actor.x + (dungeon.id === 'co_mo' ? 240 : 100 + i * 20);
      hero.y = actor.y + 40;
    }
    const heard = [];
    for (let i = 0; i < config.tickRate * 8; i++) {
      match.step();
      heard.push(
        ...match.events.filter(
          ({ event }) => event.sourceId === id && event.stage === 'boss_banter',
        ),
      );
    }
    expect(heard).toHaveLength(1);
    expect(heard[0]!.zoneId).toBe(zone.id);
    expect(bossBanterLines[heard[0]!.event.abilityId]).toBeTruthy();
  },
);
