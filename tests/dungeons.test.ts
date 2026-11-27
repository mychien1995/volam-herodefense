import { describe, expect, it } from 'vitest';
import { DungeonMatch, type MatchZone, type Hero } from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  creepDungeonSchema,
  forestRoster,
  desertDungeon,
  beachDungeon,
  hellDungeon,
  campaignDefinition,
} from '@volam/game-data';

function setup() {
  const config = structuredClone(m1Config);
  config.critChance = 0;
  config.creep.speed = 0;
  config.creep.damage = 0;
  return new DungeonMatch(config, structuredClone(creepDungeon), 42);
}
function ready(
  match: DungeonMatch,
  id: string,
  access: 'private' | 'shared' = 'private',
) {
  const hero = match.hero(id) ?? match.add(id, id);
  expect(match.enter(id, access)).toBeUndefined();
  return { hero, zone: match.zoneOf(id)! };
}
function leave(match: DungeonMatch, id: string) {
  Object.assign(match.hero(id)!, match.dungeon.exit);
  expect(match.exit(id)).toBeUndefined();
}
function hit(
  match: DungeonMatch,
  zone: MatchZone,
  hero: Hero,
  enemyId: string,
) {
  const enemy = zone.world.creeps.get(enemyId)!;
  Object.assign(hero, {
    x: enemy.x - 24,
    y: enemy.y,
    fx: 1,
    fy: 0,
    cooldown: zone.world.tick,
  });
  match.input(hero.id, hero.lastSequence + 1, { kind: 'basic' });
  match.step();
}
function clear(match: DungeonMatch, zone: MatchZone, hero: Hero) {
  for (const enemy of zone.world.creeps.values()) {
    while (enemy.hp > 0) hit(match, zone, hero, enemy.id);
  }
}
const steps = (match: DungeonMatch, n: number) => {
  for (let i = 0; i < n; i++) match.step();
};

describe('M2A deterministic creep instances', () => {
  it('uses the authorized Forest roster across ten-creep private waves and keeps private cursors independent', () => {
    expect(forestRoster).toEqual([
      'truc_xa',
      'doc_chu',
      'son_vien',
      'truc_lam_kiem_khach',
      'moc_linh',
      'truc_yeu',
    ]);
    expect(creepDungeon.creepRoster).toEqual(forestRoster);
    expect(desertDungeon.creepRoster).not.toEqual(forestRoster);
    const match = setup(),
      a = ready(match, 'a'),
      b = ready(match, 'b');
    const types = (z: MatchZone) =>
      [...z.world.creeps.values()].map((c) => c.archetypeId);
    expect(types(a.zone)).toEqual(Array(10).fill(forestRoster[0]));
    clear(match, a.zone, a.hero);
    steps(match, creepDungeon.restTicks);
    expect(a.zone.wave).toBe(2);
    expect(a.zone.world.creeps.size).toBe(10);
    expect(types(a.zone)).toEqual(Array(10).fill(forestRoster[1]));
    expect(b.zone.wave).toBe(1);
    expect(types(b.zone)).toEqual(Array(10).fill(forestRoster[0]));
    clear(match, a.zone, a.hero);
    steps(match, creepDungeon.restTicks);
    expect(types(a.zone)).toEqual(Array(10).fill(forestRoster[2]));
  });
  it.each([1, 2, 6])(
    'keeps ten unique spawns and the campaign clear budget with %i room players',
    (players) => {
      const config = {
        ...structuredClone(m1Config),
        campaign: campaignDefinition,
        creepSpawns: [],
      };
      config.creep.damage = 0;
      for (const dungeon of [
        creepDungeon,
        desertDungeon,
        beachDungeon,
        hellDungeon,
      ]) {
        const match = new DungeonMatch(config, dungeon, 42);
        for (let i = 1; i < players; i++) match.add('peer' + i, 'Peer');
        const { hero, zone } = ready(match, 'a');
        const enemies = [...zone.world.creeps.values()];
        expect(enemies).toHaveLength(10);
        expect(new Set(enemies.map((c) => `${c.x},${c.y}`)).size).toBe(10);
        for (const enemy of enemies) enemy.hp = 1;
        clear(match, zone, hero);
        const oldCount = Math.ceil(6 * (1 + 0.1 * (players - 1)));
        expect(hero.xp + (hero.farmXpRemainder ?? 0)).toBeCloseTo(
          3.75 * oldCount,
        );
        expect(hero.gold + (hero.farmGoldRemainder ?? 0)).toBeCloseTo(oldCount);
      }
    },
  );
  it.each([1, 2, 6])(
    'keeps private wave counts, RNG and rewards with %i independent players',
    (players) => {
      const match = setup();
      const generic = structuredClone(creepDungeon);
      delete generic.creepRoster;
      const before = new DungeonMatch(structuredClone(match.base), generic, 42);
      for (const m of [match, before]) {
        for (let i = 0; i < players; i++) ready(m, 'p' + i, 'shared');
      }
      const z = match.zoneOf('p0')!,
        old = before.zoneOf('p0')!;
      const withoutArt = (zone: MatchZone) =>
        JSON.stringify(
          [...zone.world.creeps.values()].map(
            ({ archetypeId: _art, ...creep }) => creep,
          ),
        );
      expect(withoutArt(z)).toBe(withoutArt(old));
      for (const [m, zone] of [
        [match, z],
        [before, old],
      ] as const) {
        clear(m, zone, m.hero('p0')!);
        steps(m, creepDungeon.restTicks);
      }
      const count = creepDungeon.baseCount;
      expect(z.wave).toBe(2);
      expect(z.world.creeps.size).toBe(count);
      expect(z.config).toEqual(old.config);
      expect(withoutArt(z)).toBe(withoutArt(old));
      expect(z.world.random()).toBe(old.world.random());
      expect(match.hero('p0')).toEqual(before.hero('p0'));
      expect([...z.world.creeps.values()].map((c) => c.archetypeId)).toEqual(
        Array(count).fill(forestRoster[1]),
      );
    },
  );
  it('allows menu entry anywhere in the arena, requires a live hero and retains the physical exit', () => {
    const match = setup(),
      hero = match.add('a', 'Hero');
    hero.hp = 0;
    expect(match.enter('a', 'private')).toContain('còn sống');
    expect(match.zones.size).toBe(1);
    hero.hp = hero.maxHp;
    const { zone } = ready(match, 'a');
    expect(match.exit('a')).toContain('Space');
    expect(match.zoneOf('a')).toBe(zone);
    expect(match.enter('a', 'shared')).toContain('đấu trường');
    hero.hp = 0;
    Object.assign(hero, match.dungeon.exit);
    expect(match.exit('a')).toContain('Space');
  });
  it('gives all six players independent private instances even when legacy access says shared', () => {
    const match = setup();
    const first = ready(match, 'a', 'shared');
    const hp = first.zone.world.creeps.values().next().value!.maxHp;
    for (const id of ['b', 'c', 'd', 'e', 'f'])
      expect(ready(match, id, 'shared').zone).not.toBe(first.zone);
    expect(first.zone.world.heroes.size).toBe(1);
    expect(first.zone.spawnPlayerCount).toBe(1);
    expect(first.zone.world.creeps.size).toBe(10);
    expect(first.zone.world.creeps.values().next().value!.maxHp).toBe(hp);
    expect(new Set(match.membership.values()).size).toBe(6);
  });
  it('isolates identical coordinates, entity IDs, damage, gold and EXP between private instances', () => {
    const match = setup(),
      a = ready(match, 'a'),
      b = ready(match, 'b');
    expect(a.zone.id).not.toBe(b.zone.id);
    expect(a.zone.ownerId).toBe('a');
    const id = [...a.zone.world.creeps.keys()][0]!;
    a.zone.world.creeps.get(id)!.hp = 1;
    hit(match, a.zone, a.hero, id);
    expect(a.hero.gold).toBeGreaterThan(0);
    expect(a.hero.xp).toBeGreaterThan(0);
    expect(b.hero.gold).toBe(0);
    expect(b.hero.xp).toBe(0);
    expect(b.zone.world.creeps.get(id)!.hp).toBe(b.zone.config.creep.hp);
  });
  it.each(['enter', 'exit'] as const)(
    'keeps the remaining hammer beat when zone clocks differ (%s)',
    (direction) => {
      const match = setup(),
        hero = match.add('hammer', 'Thiền Sư');
      hero.schoolId = 'con_luan';
      hero.basicId = 'con_luan_thien_su';
      if (direction === 'exit') {
        expect(match.enter(hero.id, 'private')).toBeUndefined();
        match.zoneOf(hero.id)!.world.tick = 100;
      } else match.arena.world.tick = 100;
      hero.lastBasicTick = 98;
      hero.cooldown = 110;
      if (direction === 'exit') leave(match, hero.id);
      else expect(match.enter(hero.id, 'private')).toBeUndefined();
      const destination = match.zoneOf(hero.id)!;
      expect(destination.world.tick).toBe(0);
      expect(hero.cooldown).toBe(10);
      const accepted: number[] = [];
      for (let i = 1; i <= 25; i++) {
        match.input(hero.id, i, { kind: 'basic' });
        match.step();
        if (
          match.events.some(
            ({ event }) =>
              event.kind === 'attack' && event.sourceId === hero.id,
          )
        )
          accepted.push(destination.world.tick);
      }
      expect(accepted).toEqual([10, 22]);
    },
  );
  it('keeps the hero identity, progression, school, normal style and remaining cooldowns on transfer', () => {
    const match = setup(),
      hero = match.add('a', 'Hero');
    Object.assign(hero, {
      xp: 120,
      gold: 55,
      level: 3,
      skillPoints: 3,
      schoolId: 'vo_dang',
      basicId: 'cai_bang_chuong',
      cooldown: 90,
      skillCooldowns: [60, 90, 0, 0],
      moveX: 1,
    });
    match.input('a', 1, { kind: 'cast', slot: 0 });
    expect(match.enter('a', 'private')).toBeUndefined();
    expect(match.hero('a')).toBe(hero);
    expect(hero.moveX).toBe(0);
    expect(match.arena.world.pending).toEqual([]);
    expect(match.arena.world.shots).toEqual([]);
    steps(match, 30);
    leave(match, 'a');
    expect(hero.cooldown - match.arena.world.tick).toBe(60);
    expect(hero.skillCooldowns[0]! - match.arena.world.tick).toBe(30);
    expect(hero).toMatchObject({
      xp: 120,
      gold: 55,
      level: 3,
      skillPoints: 3,
      schoolId: 'vo_dang',
      basicId: 'cai_bang_chuong',
    });
    expect(
      match.input('a', hero.lastSequence + 1, {
        kind: 'select-basic',
        id: 'cai_bang_bong',
      }),
    ).toBeUndefined();
  });
  it('prevents style changes inside a dungeon', () => {
    const match = setup(),
      { hero } = ready(match, 'a');
    expect(
      match.input('a', 1, { kind: 'select-basic', id: 'cai_bang_chuong' }),
    ).toContain('đấu trường');
    match.step();
    expect(hero.basicId).toBe('cai_bang_bong');
  });
  it('cancels owned missiles, queued shots and held movement when leaving or disconnecting', () => {
    const match = setup(),
      { hero, zone } = ready(match, 'a');
    // Controlled paced projectile data exercises generic queued-shot cleanup.
    // Vạn Kiếm now schedules radial bursts in an authoritative channel.
    const paced = structuredClone(
      zone.config.skillCatalogue!['nhan_kiem_hop_nhat']!,
    );
    if (paced.effect.mode !== 'projectile')
      throw Error('Expected projectile fixture');
    paced.effect.count = 3;
    paced.effect.spacingTicks = 4;
    zone.config.skillCatalogue!['nhan_kiem_hop_nhat'] = paced;
    Object.assign(hero, {
      x: 340,
      y: 240,
      schoolId: 'vo_dang',
      skillIds: ['nhan_kiem_hop_nhat', '', '', ''],
    });
    match.input('a', 1, { kind: 'cast', slot: 0 });
    match.step();
    expect(zone.world.projectiles.size).toBeGreaterThan(0);
    expect(zone.world.shots.length).toBeGreaterThan(0);
    match.input('a', 2, { kind: 'move', x: 1, y: 0 });
    leave(match, 'a');
    expect(zone.world.projectiles.size).toBe(0);
    expect(zone.world.shots).toHaveLength(0);
    expect(zone.world.pending).toHaveLength(0);
    expect(hero.moveX).toBe(0);
    ready(match, 'a');
    match.remove('a');
    const frozen = zone.world.tick;
    steps(match, 100);
    expect(zone.world.tick).toBe(frozen);
    expect(match.membership.has('a')).toBe(false);
  });
  it('freezes HP, position, burn timers, RNG and wave time when empty and resumes the same instance', () => {
    const match = setup(),
      { zone } = ready(match, 'a');
    const enemy = [...zone.world.creeps.values()][0]!;
    enemy.hp = 77;
    enemy.burnDamage = 4;
    enemy.burnUntil = 150;
    enemy.burnNext = 30;
    enemy.burnSource = 'a';
    leave(match, 'a');
    const before = JSON.stringify([...zone.world.creeps]),
      tick = zone.world.tick;
    steps(match, 1000);
    expect(zone.world.tick).toBe(tick);
    expect(JSON.stringify([...zone.world.creeps])).toBe(before);
    const again = ready(match, 'a');
    expect(again.zone).toBe(zone);
    expect(enemy.hp).toBe(77);
    steps(match, 30);
    expect(zone.world.tick).toBe(tick + 30);
    expect(enemy.hp).toBe(73);
  });
  it('advances only after a full clear, pauses the private rest timer and snapshots stronger waves', () => {
    const match = setup(),
      { hero, zone } = ready(match, 'a', 'shared');
    ready(match, 'b', 'shared');
    const first = [...zone.world.creeps.values()][0]!;
    hit(match, zone, hero, first.id);
    steps(match, 100);
    expect(zone.wave).toBe(1);
    clear(match, zone, hero);
    expect(zone.nextWaveAt).toBeDefined();
    leave(match, 'a');
    leave(match, 'b');
    const remaining = zone.nextWaveAt! - zone.world.tick;
    steps(match, 1000);
    expect(zone.wave).toBe(1);
    expect(zone.nextWaveAt! - zone.world.tick).toBe(remaining);
    ready(match, 'a', 'shared');
    ready(match, 'b', 'shared');
    steps(match, remaining - 1);
    expect(zone.wave).toBe(1);
    match.step();
    expect(zone.wave).toBe(2);
    expect(zone.spawnPlayerCount).toBe(1);
    expect(zone.world.creeps.size).toBe(10);
    expect(
      [...zone.world.creeps.values()].every((c) => c.maxHp > m1Config.creep.hp),
    ).toBe(true);
    expect(
      [...zone.world.creeps.keys()].every((id) => id.startsWith('wave_2_')),
    ).toBe(true);
  });
  it('awards one fixed pool in each private instance without cross-instance contributions', () => {
    const match = setup(),
      a = ready(match, 'a', 'shared'),
      b = ready(match, 'b', 'shared');
    const enemies = [...a.zone.world.creeps.values()];
    for (const other of enemies.slice(1))
      Object.assign(other, { x: 900, y: 600 });
    const enemy = enemies[0]!;
    enemy.hp = 40;
    hit(match, a.zone, a.hero, enemy.id);
    hit(match, a.zone, a.hero, enemy.id);
    expect(a.hero.xp).toBe(36);
    expect(a.hero.gold).toBe(7);
    expect(b.hero.xp).toBe(0);
    const bEnemy = b.zone.world.creeps.get(enemy.id)!;
    bEnemy.hp = 40;
    hit(match, b.zone, b.hero, bEnemy.id);
    hit(match, b.zone, b.hero, bEnemy.id);
    expect(b.hero.xp).toBe(36);
    const next = enemies[1]!;
    Object.assign(next, { x: 600, y: 240, hp: 40 });
    hit(match, a.zone, a.hero, next.id);
    leave(match, 'a');
    const old = a.hero.xp;
    b.zone.world.creeps.get(next.id)!.hp = 1;
    hit(match, b.zone, b.hero, next.id);
    expect(a.hero.xp).toBe(old);
    expect(b.hero.xp).toBe(72);
  });
  it('returns a dead hero to the arena after the configured delay with no XP/gold penalty', () => {
    const match = setup(),
      { hero, zone } = ready(match, 'a');
    Object.assign(hero, { hp: 0, xp: 45, gold: 19 });
    match.step();
    steps(match, match.dungeon.respawnTicks - 1);
    expect(match.zoneOf('a')).toBe(zone);
    match.step();
    expect(match.zoneOf('a')!.id).toBe('arena');
    expect(hero.hp).toBe(hero.maxHp);
    expect(hero).toMatchObject({
      xp: 45,
      gold: 19,
      ...match.base.spawn,
    });
    expect(zone.world.heroes.size).toBe(0);
  });
  it('validates provisional dungeon tuning at load and repeats seeded runs exactly', () => {
    expect(() =>
      creepDungeonSchema.parse({ ...creepDungeon, restTicks: 0 }),
    ).toThrow();
    const run = () => {
      const match = setup(),
        { zone, hero } = ready(match, 'a');
      clear(match, zone, hero);
      steps(match, 90);
      return JSON.stringify({
        hero,
        creeps: [...zone.world.creeps],
        wave: zone.wave,
        tick: zone.world.tick,
      });
    };
    expect(run()).toBe(run());
  });
});
