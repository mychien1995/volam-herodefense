import { describe, it, expect } from 'vitest';
import { DungeonMatch } from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  createInvasionDefinition,
  invasionDefinitionSchema,
} from '@volam/game-data';
import { serverInvasionDefinition } from '../apps/game-server/src/invasion-config.js';
function setup(seconds = 3, hp = 1000000) {
  const base = structuredClone(m1Config);
  base.creepSpawns = [];
  base.critChance = 0;
  const definition = createInvasionDefinition(seconds, hp),
    match = new DungeonMatch(base, creepDungeon, 42, definition);
  const hero = match.add('a', 'A');
  Object.assign(hero, { x: 1400, y: 1100 });
  return { match, hero, definition, world: match.arena.world };
}
function steps(m: DungeonMatch, n: number) {
  for (let i = 0; i < n; i++) m.step();
}
function first() {
  const s = setup();
  steps(s.match, 90);
  const enemy = [...s.world.creeps.values()][0]!;
  for (const id of s.world.creeps.keys())
    if (id !== enemy.id) s.world.creeps.delete(id);
  return { ...s, enemy };
}
describe('M2B deterministic statue defense', () => {
  it('schedules 3/6/9-minute waves with exact 60/15-second warnings and surviving waves', () => {
    const { match, definition, world } = setup(180);
    for (const w of definition.waves) w.speed = 0;
    const notices: Array<{
      kind: string;
      wave: number;
      leadTicks: number;
      atTick: number;
    }> = [];
    for (let i = 0; i < 16200; i++) {
      match.step();
      notices.push(...match.invasion!.events);
    }
    expect(
      notices.filter((e) => e.kind === 'wave').map((e) => e.atTick),
    ).toEqual([5400, 10800, 16200]);
    expect(
      notices
        .filter((e) => e.kind === 'warning')
        .map((e) => [e.wave, e.leadTicks, e.atTick]),
    ).toEqual([
      [1, 1800, 3600],
      [1, 450, 4950],
      [2, 1800, 9000],
      [2, 450, 10350],
      [3, 1800, 14400],
      [3, 450, 15750],
    ]);
    expect(match.invasion!.wave).toBe(3);
    expect(world.creeps.size).toBe(4 + 6 + 8);
    expect(
      [...world.creeps.values()].some(
        (e) => e.invasion?.wave === 1 && e.hp > 0,
      ),
    ).toBe(true);
  });
  it('uses validated development intervals and sensible warnings without allowing production override', () => {
    const { match } = setup(30);
    const log = [];
    for (let i = 0; i < 900; i++) {
      match.step();
      log.push(...match.invasion!.events);
    }
    expect(log.map((e) => [e.kind, e.atTick, e.leadTicks])).toEqual([
      ['warning', 600, 300],
      ['warning', 810, 90],
      ['wave', 900, 0],
    ]);
    expect(
      serverInvasionDefinition({
        NODE_ENV: 'production',
        VOLAM_INVASION_INTERVAL_SECONDS: '3',
      }).intervalTicks,
    ).toBe(3600);
    expect(() =>
      serverInvasionDefinition({ VOLAM_INVASION_INTERVAL_SECONDS: 'bad' }),
    ).toThrow();
    const d = createInvasionDefinition();
    expect(() =>
      invasionDefinitionSchema.parse({ ...d, warningTicks: [5400, 5400] }),
    ).toThrow();
  });
  it('spawns both lanes with player-count snapshots and retains older enemy strength/HP', () => {
    const { match, world } = setup();
    steps(match, 90);
    const old = [...world.creeps.values()][0]!;
    old.hp = 77;
    const h = match.add('b', 'B');
    Object.assign(h, { x: 1400, y: 1100 });
    steps(match, 90);
    expect(match.invasion!.spawnPlayerCount).toBe(2);
    const next = [...world.creeps.values()].filter(
      (e) => e.invasion?.wave === 2,
    );
    expect(next).toHaveLength(10);
    expect(new Set(next.map((e) => e.invasion!.lane))).toEqual(
      new Set(['west', 'east']),
    );
    expect(next.every((e) => e.maxHp === 174)).toBe(true);
    expect(old.hp).toBe(77);
    expect(old.maxHp).toBe(120);
  });
  it('heads toward the statue, sticks to acquired aggro, then returns after leash release', () => {
    const { match, hero, enemy, world } = first();
    Object.assign(enemy, { x: 600, y: 576 });
    match.step();
    expect(enemy.x).toBeGreaterThan(600);
    expect(enemy.invasion!.targetId).toBe('');
    Object.assign(hero, { x: enemy.x - 50, y: enemy.y });
    const before = enemy.x;
    match.step();
    expect(enemy.x).toBeLessThan(before);
    expect(enemy.invasion!.targetId).toBe('a');
    const closer = match.add('b', 'B');
    Object.assign(closer, { x: enemy.x - 5, y: enemy.y });
    match.step();
    expect(enemy.invasion!.targetId).toBe('a');
    Object.assign(hero, { x: 100, y: 100 });
    const release = enemy.x;
    match.step();
    expect(enemy.invasion!.targetId).toBe('');
    expect(enemy.x).toBeGreaterThan(release);
    expect(enemy.invasion!.reacquireAt).toBeGreaterThan(world.tick);
    Object.assign(closer, { x: 1400, y: 1100 });
    steps(match, 90);
    expect(enemy.x).toBeGreaterThan(release);
  });
  it('drops dead or dungeon-transferred targets and resumes its objective', () => {
    const { match, hero, enemy } = first();
    Object.assign(enemy, { x: hero.x - 20, y: hero.y });
    match.step();
    expect(enemy.invasion!.targetId).toBe(hero.id);
    expect(match.enter('a', 'private')).toBeUndefined();
    match.step();
    expect(enemy.invasion!.targetId).toBe('');
    expect(enemy.fx).toBeLessThan(0); // from southeast toward the statue, never into a dungeon
  });
  it('damages the statue through the common hit pipeline, never regenerates or resets between waves', () => {
    const { match, enemy, world } = first();
    Object.assign(enemy, { x: 738, y: 576 });
    const before = world.statue!.hp;
    match.step();
    expect(world.statue!.hp).toBe(before - 8);
    expect(
      match.events.some(
        (e) => e.event.targetId === 'statue' && e.event.damage === 8,
      ),
    ).toBe(true);
    const hp = world.statue!.hp;
    steps(match, 30);
    expect(world.statue!.hp).toBe(hp);
    steps(match, 100);
    expect(match.invasion!.wave).toBeGreaterThan(1);
    expect(world.statue!.hp).toBeLessThan(hp);
  });
  it('uses one fixed reward pool for shared kills and never respawns invasion enemies', () => {
    const { match, hero, enemy, world } = first();
    const b = match.add('b', 'B');
    Object.assign(enemy, { x: 1000, y: 900, hp: 40 });
    for (const h of [hero, b])
      Object.assign(h, { x: 976, y: 900, fx: 1, fy: 0, cooldown: 0 });
    match.input('a', 1, { kind: 'basic' });
    match.step();
    match.input('b', 1, { kind: 'basic' });
    match.step();
    expect(hero.xp).toBe(30);
    expect(b.xp).toBe(30);
    expect(hero.gold + b.gold).toBe(12);
    steps(match, 250);
    expect(world.creeps.get(enemy.id)?.hp ?? 0).toBe(0);
    expect(hero.xp + b.xp).toBe(60);
  });
  it('shows hero death and returns the same hero to the arena without losing XP/gold', () => {
    const { match, hero, enemy } = first();
    Object.assign(hero, { hp: 1, xp: 45, gold: 19 });
    Object.assign(enemy, { x: hero.x - 20, y: hero.y });
    match.step();
    expect(hero.hp).toBe(0);
    expect(hero.pose).toBe('death');
    steps(match, creepDungeon.respawnTicks);
    expect(match.hero('a')).toBe(hero);
    expect(hero.hp).toBe(hero.maxHp);
    expect(hero).toMatchObject({
      ...match.base.spawn,
      xp: 45,
      gold: 19,
    });
  });
  it('triggers defeat once and freezes all zones, inputs and future invasion processing', () => {
    const { match, enemy, world } = first();
    const b = match.add('b', 'B');
    expect(match.enter(b.id, 'private')).toBeUndefined();
    const dungeon = match.zoneOf('b')!;
    world.statue!.hp = 1;
    Object.assign(enemy, { x: 738, y: 576 });
    match.step();
    expect(match.invasion!.defeated).toBe(true);
    expect(
      match.invasion!.events.filter((e) => e.kind === 'defeat'),
    ).toHaveLength(1);
    expect(
      match.events.filter(
        (e) => e.event.kind === 'death' && e.event.targetId === 'statue',
      ),
    ).toHaveLength(1);
    const frozen = {
      tick: match.tick,
      dungeon: dungeon.world.tick,
      wave: match.invasion!.wave,
      notice: match.invasion!.notice!.id,
      hp: world.statue!.hp,
    };
    steps(match, 1000);
    expect({
      tick: match.tick,
      dungeon: dungeon.world.tick,
      wave: match.invasion!.wave,
      notice: match.invasion!.notice!.id,
      hp: world.statue!.hp,
    }).toEqual(frozen);
    expect(match.invasion!.events).toEqual([]);
    expect(match.input('a', 99, { kind: 'basic' })).toContain('kết thúc');
    expect(match.exit('b')).toContain('kết thúc');
  });
  it('keeps dungeon membership/worlds isolated while the global schedule and warnings continue', () => {
    const { match, hero } = setup();
    expect(match.enter(hero.id, 'private')).toBeUndefined();
    const zone = match.zoneOf(hero.id)!,
      position = { x: hero.x, y: hero.y };
    steps(match, 180);
    expect(match.zoneOf(hero.id)).toBe(zone);
    expect(hero).toMatchObject(position);
    expect(match.invasion!.wave).toBe(2);
    expect(
      [...zone.world.creeps.keys()].every((id) => id.startsWith('wave_')),
    ).toBe(true);
    expect(
      [...match.arena.world.creeps.keys()].every((id) =>
        id.startsWith('invasion_'),
      ),
    ).toBe(true);
  });
});
