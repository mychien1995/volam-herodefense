import { describe, expect, it } from 'vitest';
import {
  addCreep,
  addHero,
  changeBuild,
  characterStats,
  conLuan,
  createWorld,
  fiveSwordPoints,
  hasStatus,
  initializeProgression,
  skillCharges,
  statusValue,
  stepWorld,
  submitInput,
  type Command,
  type CombatEvent,
  type SimulationConfig,
} from '@volam/game-core';
import { m1Config } from '@volam/game-data';

function trial(branch: string, seed = 42, level = 6) {
  const config: SimulationConfig = {
    ...m1Config,
    collision: [],
    creepSpawns: [],
    spawn: { x: 700, y: 600 },
    creep: {
      ...m1Config.creep,
      speed: 0,
      detectionRange: 0,
      damage: 0,
      hp: 1000,
    },
  };
  const world = createWorld(config, seed);
  const hero = addHero(world, 'tester', 'Côn Luân', config);
  hero.schoolId = conLuan.school;
  hero.level = level;
  expect(initializeProgression(hero, config, 'fixed', branch)).toBe(true);
  for (let slot = 0; slot < 5; slot++)
    expect(
      changeBuild(world, hero, config, hero.progression!.revision, {
        action: 'upgrade-slot',
        slot,
      }),
    ).toBeUndefined();
  const events: Array<CombatEvent & { tick: number }> = [];
  let sequence = 0;
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      stepWorld(world, config);
      events.push(...world.events.map((e) => ({ ...e, tick: world.tick })));
    }
  };
  const send = (command: Command) => {
    submitInput(world, hero.id, ++sequence, command);
    step();
  };
  const enemy = (id: string, x: number, y = 0) =>
    addCreep(world, id, { x: hero.x + x, y: hero.y + y }, config);
  return { config, world, hero, events, step, send, enemy };
}

describe('Côn Luân server inputs', () => {
  it.each([false, true])(
    'adds four points of A damage per Q rank (ranged: %s)',
    (ranged) => {
      const damage = (rank: number) => {
        const { hero, config, world, send, step, enemy, events } = trial(
          conLuan.monk,
        );
        hero.level = 8;
        world.random = () => 0.99;
        config.creep.defense = 0;
        for (let i = 1; i < rank; i++)
          expect(
            changeBuild(world, hero, config, hero.progression!.revision, {
              action: 'upgrade-slot',
              slot: 0,
            }),
          ).toBeUndefined();
        if (ranged) {
          send({ kind: 'cast', slot: 0 });
          step(6);
        }
        const victim = enemy('target', 45);
        send({ kind: 'basic' });
        step(10);
        const impact = events.find(
          (e) => e.kind === 'hit' && e.targetId === victim.id,
        );
        expect(impact).toBeDefined();
        return impact!.damage;
      };
      const ranks = [1, 2, 3, 4].map(damage);
      for (let i = 1; i < ranks.length; i++)
        expect(ranks[i]! - ranks[i - 1]!).toBe(4);
    },
  );
  it('accepts four melee beats, changes stats without spending mana and rate limits target lightning to 1s', () => {
    const { hero, world, config, send, step, enemy, events } = trial(
      conLuan.monk,
    );
    const close = enemy('close', 55),
      other = enemy('other', 68, 17);
    const original = characterStats(hero, config, 0).total;
    for (let i = 0; i < 4; i++) {
      send({ kind: 'basic' });
    }
    expect(
      events.filter((e) => e.kind === 'attack').map((e) => e.stage),
    ).toEqual(['thrust', 'sweep', 'rising', 'overhead']);
    expect(
      events.filter((e) => e.kind === 'attack').map((e) => e.tick),
    ).toEqual([1, 2, 3, 4]);
    expect(close.hp).toBeLessThan(1000);
    expect(
      events.some(
        (e) => e.abilityId === conLuan.monk && e.stage === 'area_tick',
      ),
    ).toBe(true);
    const mana = hero.mana;
    send({ kind: 'cast', slot: 0 });
    expect(hero.mana).toBe(mana);
    const ranged = characterStats(hero, config, world.tick).total;
    expect(hero.maxHp).toBeLessThan(original.maxHp);
    expect(ranged.hpRegen).toBeLessThan(original.hpRegen);
    expect(ranged.attackPower).toBeLessThan(original.attackPower);
    const hp = other.hp;
    send({ kind: 'basic' });
    const first = world.tick;
    step(9);
    expect(other.hp).toBeLessThan(hp);
    send({ kind: 'basic' });
    step(19);
    send({ kind: 'basic' });
    expect(
      events
        .filter((e) => e.kind === 'attack' && e.abilityId === conLuan.bolt)
        .map((e) => e.tick),
    ).toEqual([first, first + 30]);
  });

  it('expands the ring, slows once, and expires Chaos stats while retaining cooldown', () => {
    const { hero, world, config, send, step, enemy, events } = trial(
      conLuan.monk,
      17,
    );
    const edge = enemy('edge', 142),
      outside = enemy('outside', 153);
    send({ kind: 'cast', slot: 2 });
    step(15);
    expect(
      events
        .filter((e) => e.kind === 'hit' && e.abilityId === conLuan.ring)
        .map((e) => e.targetId),
    ).toEqual([edge.id]);
    expect(hasStatus(edge, 'slow', world.tick)).toBe(true);
    expect(outside.hp).toBe(1000);
    const base = characterStats(hero, config, world.tick).total;
    send({ kind: 'cast', slot: 4 });
    expect(hero.maxHp).toBeGreaterThan(base.maxHp);
    expect(hero.maxMana).toBeGreaterThan(base.maxMana);
    const buffed = characterStats(hero, config, world.tick).total;
    for (const key of [
      'maxHp',
      'maxMana',
      'hpRegen',
      'manaRegen',
      'attackPower',
      'defense',
      'critChance',
      'critMultiplier',
      'attackSpeed',
      'movementSpeed',
      'cooldownReduction',
    ] as const)
      expect(buffed[key]).toBeGreaterThan(base[key]);
    step(299);
    expect(hasStatus(hero, 'con_luan_chaos', world.tick)).toBe(true);
    step();
    expect(hero.maxHp).toBeCloseTo(base.maxHp);
    expect(hero.maxMana).toBeCloseTo(base.maxMana);
    expect(hero.skillCooldowns[4]).toBeGreaterThan(world.tick);
  });

  it('keeps ranged recovery when returning to ranged stance after a melee attack', () => {
    const { hero, world, send, step, events } = trial(conLuan.monk);
    const cast = { kind: 'cast', slot: 0 } as const;
    const attack = { kind: 'basic' } as const;
    send(cast);
    send(attack);
    const first = world.tick;
    step(9);
    send(cast);
    expect(hasStatus(hero, 'con_luan_ranged', world.tick)).toBe(false);
    send(attack);
    expect(
      events.some(
        (event) =>
          event.tick === world.tick &&
          event.kind === 'attack' &&
          event.abilityId === conLuan.monk,
      ),
    ).toBe(true);
    step(5);
    send(cast);
    expect(hasStatus(hero, 'con_luan_ranged', world.tick)).toBe(true);
    send(attack);
    expect(
      events.filter(
        (event) => event.kind === 'attack' && event.abilityId === conLuan.bolt,
      ),
    ).toHaveLength(1);
    step(first + 30 - world.tick - 1);
    send(attack);
    expect(
      events.filter(
        (event) => event.kind === 'attack' && event.abilityId === conLuan.bolt,
      ),
    ).toHaveLength(2);
  });

  it('uses a four-stage búa set with distinct W/R impact points and actual crowd control', () => {
    const { hero, world, send, step, enemy, events } = trial(conLuan.monk, 91);
    const near = enemy('near', 55);
    const splash = enemy('splash', 45, 50);
    const outside = enemy('outside', 45, 95);
    send({ kind: 'cast', slot: 1 });
    step(5);
    const contact = events.find(
      (e) => e.abilityId === conLuan.slam && e.stage === 'hammer_contact',
    );
    expect(contact).toMatchObject({ kind: 'pulse', x: hero.x + 35, y: hero.y });
    for (const target of [near, splash])
      expect(
        target.statuses?.find((status) => status.kind === 'stun')?.until,
      ).toBe(contact!.tick + 60);
    expect(hasStatus(outside, 'stun', world.tick)).toBe(false);
    for (const target of [near, splash, outside])
      world.creeps.delete(target.id);
    step(6);
    const landing = enemy('landing', 180, 32);
    send({ kind: 'cast', slot: 3 });
    step(18);
    const impact = events.find(
      (event) =>
        event.abilityId === conLuan.hammer &&
        event.targetId === landing.id &&
        event.kind === 'hit',
    );
    expect(
      landing.statuses?.find((status) => status.kind === 'stun')?.until,
    ).toBe(impact!.tick + 60);
    expect(
      events.some(
        (e) =>
          e.abilityId === conLuan.hammer &&
          e.stage === 'explosion' &&
          e.x > hero.x + 170,
      ),
    ).toBe(true);
  });

  it('plants up to three swords, resets W on entry, then detonates owned swords together', () => {
    const { hero, world, config, send, step, events, enemy } = trial(
      conLuan.sword,
    );
    send({ kind: 'cast', slot: 0 });
    expect(hero.skillCooldowns[0]).toBe(0);
    send({ kind: 'tam-lien-tram' });
    step(8);
    expect(hero.x).toBeLessThan(700);
    send({ kind: 'tam-lien-tram' });
    step(8);
    send({ kind: 'tam-lien-tram' });
    step(8);
    send({ kind: 'tam-lien-tram' });
    expect(
      world.areas?.filter((a) => a.abilityId === conLuan.plant),
    ).toHaveLength(3);
    expect(
      skillCharges(hero, config.skillCatalogue![conLuan.plant]!, world.tick)
        ?.count,
    ).toBe(0);
    send({ kind: 'move', x: -1, y: 0 });
    step(11);
    send({ kind: 'move', x: 0, y: 0 });
    hero.fx = 1;
    send({ kind: 'cast', slot: 1 });
    step(7);
    expect(
      events.some((e) => e.abilityId === conLuan.dash && e.stage === 'reset'),
    ).toBe(true);
    expect(hero.skillCooldowns[1]).toBe(0);
    const target = enemy('center', 0);
    send({ kind: 'cast', slot: 0 });
    expect(
      events.filter(
        (e) => e.abilityId === conLuan.detonate && e.kind === 'pulse',
      ),
    ).toHaveLength(3);
    expect(world.areas?.some((a) => a.abilityId === conLuan.plant)).toBe(false);
    expect(target.hp).toBeLessThan(1000);
  });

  it('fires six orbs and a sword, aims the dragon once, and pulses a fixed pentagon for 7.5 seconds', () => {
    const { hero, world, send, step, enemy, events } = trial(conLuan.sword, 19);
    const victim = enemy('victim', 90);
    for (let i = 0; i < 7; i++) {
      send({ kind: 'basic' });
      step(20);
    }
    expect(
      events.filter((e) => e.kind === 'attack').map((e) => e.stage),
    ).toEqual(['orb', 'orb', 'orb', 'orb', 'orb', 'orb', 'sword']);
    expect(
      events.some(
        (e) => e.abilityId === conLuan.sword && e.stage === 'explosion',
      ),
    ).toBe(true);
    send({ kind: 'cast', slot: 3 });
    const dragon = [...world.projectiles.values()].find(
      (p) => p.abilityId === conLuan.dragon,
    )!;
    const vy = dragon.vy;
    victim.y += 80;
    step(3);
    expect(dragon.vy).toBe(vy);
    victim.y -= 80;
    step(9);
    expect(
      events.some((e) => e.kind === 'hit' && e.abilityId === conLuan.dragon),
    ).toBe(true);
    const inside = enemy('inside', 12),
      outside = enemy('outside', 90, -45);
    const center = { x: hero.x, y: hero.y };
    send({ kind: 'cast', slot: 4 });
    step(15);
    const area = world.areas!.find((a) => a.abilityId === conLuan.star)!;
    expect({ x: area.x, y: area.y }).toEqual(center);
    expect(area.effect.radius * area.effect.radiusY!).toBeCloseTo(
      69 * 44 * 1.2 * 1.2,
    );
    expect(
      fiveSwordPoints(area.x, area.y, area.effect.radius, area.effect.radiusY!),
    ).toHaveLength(5);
    expect(hasStatus(inside, 'stun', world.tick)).toBe(true);
    const start = world.tick;
    send({ kind: 'move', x: -1, y: 0 });
    step(223);
    expect(
      world.areas?.find((a) => a.abilityId === conLuan.star),
    ).toBeDefined();
    step();
    const pulses = events.filter(
      (e) => e.abilityId === conLuan.star && e.kind === 'pulse',
    );
    expect(pulses.map((e) => e.tick)).toEqual([
      start,
      start + 30,
      start + 60,
      start + 90,
      start + 120,
      start + 150,
      start + 180,
      start + 210,
    ]);
    expect(pulses.every((e) => e.x === center.x && e.y === center.y)).toBe(
      true,
    );
    expect(
      world.areas?.find((a) => a.abilityId === conLuan.star),
    ).toBeUndefined();
    expect(outside.hp).toBe(1000);
  });

  it.each([1, 2, 3, 4])(
    'applies ranked Q/E/R stun and boosted Q damage at rank %i',
    (rank) => {
      for (const [slot, abilityId, duration] of [
        [0, conLuan.detonate, 60],
        [2, conLuan.fan, 30],
        [3, conLuan.dragon, 60],
      ] as const) {
        const { hero, world, config, send, step, enemy, events } = trial(
          conLuan.sword,
          42,
          8,
        );
        world.random = () => 0.99;
        config.creep.defense = 0;
        for (let i = 1; i < rank; i++)
          expect(
            changeBuild(world, hero, config, hero.progression!.revision, {
              action: 'upgrade-slot',
              slot,
            }),
          ).toBeUndefined();
        const mark = { x: hero.x, y: hero.y };
        if (slot === 0) {
          send({ kind: 'tam-lien-tram' });
          step(9);
        }
        const hit = enemy('hit', slot === 0 ? mark.x - hero.x : 55);
        const miss = enemy('miss', -90, 85);
        const powerBonus =
          characterStats(hero, config, world.tick).total.attackPower -
          config.progression!.schools[conLuan.school]!.base.attackPower;
        send({ kind: 'cast', slot });
        step(14);
        const hits = events.filter(
          (event) =>
            event.abilityId === abilityId &&
            event.kind === 'hit' &&
            event.targetId === hit.id,
        );
        expect(hits).toHaveLength(slot === 2 ? 5 : 1);
        const until = hits[0]!.tick + duration + 3 * (rank - 1);
        expect(
          hit.statuses?.find((status) => status.kind === 'stun')?.until,
        ).toBe(until);
        expect(hasStatus(miss, 'stun', world.tick)).toBe(false);
        if (slot === 0)
          expect(hits[0]!.damage).toBe(
            Math.round((34 + 5 * (rank - 1)) * 1.3 + powerBonus),
          );
        step(until - world.tick - 1);
        expect(hasStatus(hit, 'stun', world.tick)).toBe(true);
        step();
        expect(hasStatus(hit, 'stun', world.tick)).toBe(false);
      }
    },
  );

  it('slows a late entrant in the star, blocks Shift, W and S, and lets them walk out', () => {
    const { hero, world, config, send, step, events } = trial(conLuan.sword);
    world.random = () => 0.99;
    const opponent = addHero(world, 'opponent', 'Kiếm Tôn', config);
    opponent.schoolId = conLuan.school;
    opponent.level = 6;
    expect(
      initializeProgression(opponent, config, 'fixed', conLuan.sword),
    ).toBe(true);
    expect(
      changeBuild(world, opponent, config, opponent.progression!.revision, {
        action: 'upgrade-slot',
        slot: 1,
      }),
    ).toBeUndefined();
    world.duel = new Set([hero.id, opponent.id]);
    opponent.x = hero.x + 100;
    opponent.y = hero.y;
    const command = (input: Command) => {
      submitInput(world, opponent.id, opponent.lastSequence + 1, input);
      step();
    };
    send({ kind: 'cast', slot: 4 });
    step(15);
    expect(hasStatus(opponent, 'dash_lock', world.tick)).toBe(false);
    opponent.x = hero.x + 20;
    step();
    expect(statusValue(opponent, 'slow', world.tick)).toBe(0.6);
    expect(hasStatus(opponent, 'stun', world.tick)).toBe(false);
    expect(hasStatus(hero, 'dash_lock', world.tick)).toBe(false);
    const charges = opponent.dashCharges;
    for (const input of [
      { kind: 'dash' },
      { kind: 'cast', slot: 1 },
      { kind: 'tam-lien-tram' },
    ] as const)
      command(input);
    expect(opponent.dashCharges).toBe(charges);
    expect(opponent.skillCooldowns[1]).toBe(0);
    expect(
      skillCharges(opponent, config.skillCatalogue![conLuan.plant]!, world.tick)
        ?.count,
    ).toBe(3);
    expect(
      events.some(
        (event) => event.sourceId === opponent.id && event.kind === 'cast',
      ),
    ).toBe(false);
    const before = opponent.x;
    command({ kind: 'move', x: 1, y: 0 });
    expect(opponent.x - before).toBeCloseTo((160 * 0.4) / config.tickRate);
    for (let i = 0; i < 70 && hasStatus(opponent, 'dash_lock', world.tick); i++)
      command({ kind: 'move', x: 1, y: 0 });
    expect(hasStatus(opponent, 'dash_lock', world.tick)).toBe(false);
    expect(statusValue(opponent, 'slow', world.tick)).toBe(0);
    expect(world.areas?.some((area) => area.abilityId === conLuan.star)).toBe(
      true,
    );
    command({ kind: 'dash' });
    expect(opponent.dashCharges).toBe(charges! - 1);
  });

  it('dashes 132 units at the normal speed', () => {
    const { hero, send, step } = trial(conLuan.sword);
    const before = hero.x;
    send({ kind: 'cast', slot: 1 });
    step(12);
    expect(hero.x - before).toBeCloseTo(132);
  });

  it.each([12, 18, 24])(
    'extends Chaos in two-second steps at level %i',
    (level) => {
      const { hero, config, world, send, step } = trial(conLuan.monk);
      hero.level = level;
      const rank = level / 6;
      for (let i = 1; i < rank; i++)
        expect(
          changeBuild(world, hero, config, hero.progression!.revision, {
            action: 'upgrade-slot',
            slot: 4,
          }),
        ).toBeUndefined();
      send({ kind: 'cast', slot: 4 });
      step(300 + 60 * (rank - 1) - 1);
      expect(hasStatus(hero, 'con_luan_chaos', world.tick)).toBe(true);
      step();
      expect(hasStatus(hero, 'con_luan_chaos', world.tick)).toBe(false);
    },
  );
});
