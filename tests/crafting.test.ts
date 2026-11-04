import { expect, it } from 'vitest';
import {
  addCreep,
  addHero,
  characterStats,
  createWorld,
  DungeonMatch,
  emptyInventory,
  equipmentSlots,
  type SimulationConfig,
  initializeProgression,
  stepWorld,
  submitInput,
  transactMerchant,
} from '@volam/game-core';
import {
  chuBaThongDungeon,
  coMoDungeon,
  creepDungeon,
  economyTrial,
  hongLietDungeon,
  kimLuanDungeon,
  m1Config,
} from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';

const context = { inArena: true, matchTick: 0, worldTick: 0 };
const hit = { critChance: 0, critMultiplier: 1 };
function setup(basic = 'cai_bang_bong') {
  const config: SimulationConfig = {
    ...structuredClone(m1Config),
    creepSpawns: [],
    collision: [],
  };
  const world = createWorld(config, 91);
  const h = addHero(world, 'hero', 'Hero', config);
  h.schoolId = config.progression!.defaultBranches![basic]!.schoolId;
  initializeProgression(h, config, 'fixed', basic);
  h.x = 300;
  h.y = 300;
  h.fx = 1;
  h.fy = 0;
  h.inventory = emptyInventory();
  h.gold = 10_000;
  const enemy = (id: string, dx: number, dy = 0) => {
    const target = addCreep(world, id, { x: h.x + dx, y: h.y + dy }, config);
    target.hp = target.maxHp = 10_000;
    target.controlled = true;
    return target;
  };
  const step = (count: number) => {
    const events = [];
    for (let i = 0; i < count; i++) {
      stepWorld(world, config);
      events.push(...world.events);
    }
    return events;
  };
  return { config, world, h, enemy, step };
}

it.each(equipmentSlots)(
  'upgrades a level-five %s into each branch with one atomic payment',
  (slot) => {
    for (const branch of economyTrial.recipes[slot].branches) {
      const { h, config } = setup();
      const action = { action: 'craft', slot, branch: branch.id } as const;
      expect(transactMerchant(h, config, context, 0, action)).toMatch(/cấp 5/);
      for (let i = 0; i < 5; i++)
        expect(
          transactMerchant(h, config, context, i, {
            action: 'buy-basic',
            slot,
          }),
        ).toBeUndefined();
      expect(transactMerchant(h, config, context, 5, action)).toMatch(/Thiếu/);
      h.inventory!.materials = { [slot]: 2 };
      expect(
        transactMerchant(h, config, { ...context, inArena: false }, 5, action),
      ).toMatch(/trung tâm/);
      const before = characterStats(h, config).sources.equipment;
      const gold = h.gold;
      h.hp = 25;
      expect(transactMerchant(h, config, context, 5, action)).toBeUndefined();
      expect(h.inventory!.materials[slot]).toBe(1);
      expect(h.inventory!.crafted?.[slot]).toBe(branch.id);
      expect(h.gold).toBe(gold - economyTrial.basics[slot].craftGold);
      expect(h.hp).toBe(25);
      for (const [key, amount] of Object.entries(branch.stats)) {
        const stat = key as keyof typeof before;
        expect(
          characterStats(h, config).sources.equipment[stat] - before[stat],
        ).toBeCloseTo(amount!);
      }
      expect(transactMerchant(h, config, context, 5, action)).toMatch(
        /thay đổi/,
      );
      expect(transactMerchant(h, config, context, 6, action)).toMatch(/đã có/);
    }
  },
);

it.each([
  ['boots', coMoDungeon],
  ['armor', hongLietDungeon],
  ['hat', chuBaThongDungeon],
  ['weapon', kimLuanDungeon],
] as const)(
  'grants %s material once per actual boss kill to each present damage dealer',
  (slot, dungeon) => {
    const config = {
      ...structuredClone(m1Config),
      personalCraftLoot: true,
      creepSpawns: [],
    };
    const match = new DungeonMatch(config, creepDungeon, 42, undefined, [
      dungeon,
    ]);
    const heroes = ['a', 'b', 'support', 'left'].map((id) => match.add(id, id));
    for (const h of heroes)
      expect(match.enter(h.id, 'shared', dungeon.id)).toBeUndefined();
    const zone = match.zoneOf('a')!;
    if (zone.kim) {
      zone.world.creeps.get('hoac_do')!.hp = 0;
      zone.world.creeps.get('dat_nhi_ba')!.hp = 0;
      zone.kim.step(zone.world, zone.config);
    }
    const boss = zone.world.creeps.get(economyTrial.recipes[slot].bossId)!;
    expect(boss).toBeDefined();
    boss.hp = boss.maxHp = 5000;
    expect(
      hurt(zone.world, boss, 'left', 'test_hit', 10, zone.config, hit),
    ).toBe(true);
    Object.assign(heroes[3]!, dungeon.exit);
    expect(match.exit('left')).toBeUndefined();
    boss.hits['support'] = zone.world.tick;
    expect(hurt(zone.world, boss, 'a', 'test_hit', 10, zone.config, hit)).toBe(
      true,
    );
    expect(
      hurt(zone.world, boss, 'b', 'test_last_hit', 100000, zone.config, hit),
    ).toBe(true);
    expect(boss.hp).toBe(0);
    for (let i = 0; i < 5; i++) match.step();
    expect(
      heroes.map((hero) => hero.inventory?.materials?.[slot] ?? 0),
    ).toEqual([1, 1, 0, 0]);
    expect(
      heroes.every((hero) => !hero.bossItems?.length && !hero.bossLoot?.length),
    ).toBe(true);
    expect(
      zone.world.chu?.loot.length ?? zone.kim?.rewards.loot.length ?? 0,
    ).toBe(0);
  },
);

it('spread sends three straight rays but only one hits a close target per leg', () => {
  const { h, world, enemy, step } = setup('cai_bang_chuong');
  h.inventory!.crafted = { weapon: 'cleave' };
  const target = enemy('close', 32);
  submitInput(world, h.id, 1, { kind: 'basic' });
  step(1);
  expect(world.projectiles.size).toBe(3);
  const velocities = [...world.projectiles.values()].map(({ vx, vy }) => [
    vx,
    vy,
  ]);
  expect(new Set(velocities.map(String)).size).toBe(3);
  expect(
    step(12).filter(
      (event) => event.kind === 'hit' && event.targetId === target.id,
    ),
  ).toHaveLength(1);
});

it('lifesteal has one budget for an A cleaving several enemies, and penetration is confined to A', () => {
  const { h, world, enemy, step } = setup();
  h.inventory!.crafted = { weapon: 'lifesteal' };
  enemy('first', 20);
  enemy('second', 30, 10);
  h.hp = 40;
  world.random = () => 0.99;
  submitInput(world, h.id, 1, { kind: 'basic' });
  const hits = step(3).filter((e) => e.kind === 'hit');
  expect(hits).toHaveLength(2);
  expect(h.hp - 40).toBeCloseTo(
    hits[0]!.damage * economyTrial.craftedCombat.lifesteal,
    0,
  );
  const attack = (penetration: boolean) => {
    const f = setup('cai_bang_chuong');
    if (penetration) f.h.inventory!.crafted = { weapon: 'penetration' };
    f.enemy('defender', 60).stats = { ...f.config.creep, defense: 100 };
    f.world.random = () => 0.99;
    submitInput(f.world, f.h.id, 1, { kind: 'basic' });
    return f.step(18).find((e) => e.kind === 'hit')!.damage;
  };
  expect(attack(true)).toBeGreaterThan(attack(false));
});

it('armor reflects direct enemy damage only and caps burn aura to one hit per enemy per pulse', () => {
  const { h, world, config, enemy, step } = setup();
  h.inventory!.crafted = { armor: 'reflect' };
  const attacker = enemy('attacker', 30);
  world.random = () => 0;
  const hp = h.hp;
  const damageAfterDefense = Math.round(
    (50 * 100) / (100 + characterStats(h, config).total.defense),
  );
  expect(hurt(world, h, attacker.id, 'attack', 50, config, hit)).toBe(true);
  expect(h.hp).toBe(hp - damageAfterDefense * 0.5);
  expect(
    world.events.filter((e) => e.abilityId === 'gear_reflect'),
  ).toHaveLength(1);
  hurt(world, h, attacker.id, 'dot', 50, config, { ...hit, periodic: true });
  expect(h.hp).toBe(hp - damageAfterDefense * 1.5);
  h.inventory!.crafted.armor = 'burn_aura';
  const second = addHero(world, 'second', 'Second', config);
  Object.assign(second, {
    x: h.x,
    y: h.y,
    inventory: { ...emptyInventory(), crafted: { armor: 'burn_aura' } },
  });
  const slow = addHero(world, 'slow', 'Slow', config);
  Object.assign(slow, {
    x: h.x,
    y: h.y,
    inventory: { ...emptyInventory(), crafted: { armor: 'slow_aura' } },
  });
  expect(
    step(config.tickRate).filter(
      (e) => e.kind === 'hit' && e.abilityId === 'gear_burn_aura',
    ),
  ).toHaveLength(1);
  expect(attacker.statuses?.some((s) => s.abilityId === 'gear_slow_aura')).toBe(
    true,
  );
});

it('Z cleanses only slow, poison and burn, respects a wall on blink, and fires one facing needle', () => {
  const { h, world, config, enemy, step } = setup();
  h.inventory!.crafted = { boots: 'cleanse' };
  h.statuses = (['slow', 'poison', 'burn', 'defense_break'] as const).map(
    (kind) => ({
      kind,
      magnitude: 0.2,
      durationTicks: 100,
      until: 100,
      sourceId: 'test',
      abilityId: kind,
    }),
  );
  submitInput(world, h.id, 1, { kind: 'gear-skill' });
  expect(step(1).some((e) => e.abilityId === 'gear_cleanse')).toBe(true);
  expect(h.statuses.map(({ kind }) => kind)).toEqual(['defense_break']);
  const ready = h.inventory!.auxiliaryReadyAt;
  submitInput(world, h.id, 2, { kind: 'gear-skill' });
  expect(step(1).some((e) => e.abilityId === 'gear_cleanse')).toBe(false);
  expect(h.inventory!.auxiliaryReadyAt).toBe(ready);
  h.inventory!.crafted.boots = 'blink';
  h.inventory!.auxiliaryReadyAt = 0;
  config.collision = [{ x: 345, y: 260, width: 12, height: 80 }];
  submitInput(world, h.id, 3, { kind: 'gear-skill' });
  step(1);
  expect(h.x).toBeGreaterThan(300);
  expect(h.x).toBeLessThanOrEqual(345 - config.radius);
  config.collision = [];
  h.inventory!.crafted.boots = 'needle';
  h.inventory!.auxiliaryReadyAt = 0;
  const target = enemy('ahead', 85);
  enemy('behind', -20);
  submitInput(world, h.id, 4, { kind: 'gear-skill' });
  step(1);
  const shot = [...world.projectiles.values()][0]!;
  expect(shot.vx).toBeGreaterThan(0);
  expect(shot.vy).toBe(0);
  const events = step(110);
  expect(
    events
      .filter((e) => e.abilityId === 'gear_needle' && e.kind === 'hit')
      .map((e) => e.targetId),
  ).toEqual([target.id]);
  expect(
    events.filter(
      (e) => e.abilityId === 'gear_needle_poison' && e.kind === 'hit',
    ),
  ).toHaveLength(3);
});

it('Z cooldown survives travel and cannot be refreshed by recrafting', () => {
  const config = { ...structuredClone(m1Config), creepSpawns: [] };
  const match = new DungeonMatch(config, creepDungeon, 42);
  const hero = match.add('hero', 'Hero');
  hero.inventory = { ...emptyInventory(), crafted: { boots: 'cleanse' } };
  expect(match.input(hero.id, 1, { kind: 'gear-skill' })).toBeUndefined();
  for (let i = 0; i < 7; i++) match.step();
  const remaining = hero.inventory.auxiliaryReadyAt! - match.arena.world.tick;
  expect(remaining).toBeGreaterThan(0);
  expect(match.enter(hero.id, 'private', 'forest')).toBeUndefined();
  const zone = match.zoneOf(hero.id)!;
  expect(hero.inventory.auxiliaryReadyAt! - zone.world.tick).toBe(remaining);
  match.input(hero.id, 2, { kind: 'gear-skill' });
  match.step();
  expect(
    match.events.some(({ event }) => event.abilityId === 'gear_cleanse'),
  ).toBe(false);
});
