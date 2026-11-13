import { describe, expect, it } from 'vitest';
import {
  addCreep,
  addHero,
  changeBuild,
  createWorld,
  duongMon,
  duongMonFan,
  hasStatus,
  initializeProgression,
  rankedAbility,
  skillCharges,
  stepWorld,
  submitInput,
  type CombatEvent,
  type Command,
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
      hp: 100000,
    },
  };
  const world = createWorld(config, seed);
  const hero = addHero(world, 'tester', 'Đường Môn', config);
  hero.schoolId = duongMon.school;
  hero.level = level;
  expect(initializeProgression(hero, config, 'fixed', branch)).toBe(true);
  const upgrade = (slot: number) =>
    expect(
      changeBuild(world, hero, config, hero.progression!.revision, {
        action: 'upgrade-slot',
        slot,
      }),
    ).toBeUndefined();
  for (const slot of [0, 1, 2, 4]) upgrade(slot);
  const events: CombatEvent[] = [];
  let sequence = 0;
  const step = (ticks = 1) => {
    for (let i = 0; i < ticks; i++) {
      stepWorld(world, config);
      events.push(...world.events);
    }
  };
  const send = (command: Command) => {
    submitInput(world, hero.id, ++sequence, command);
    step();
  };
  const cast = (slot: number) => send({ kind: 'cast', slot });
  return { world, hero, config, events, upgrade, step, send, cast };
}

describe('Đường Môn authoritative combat', () => {
  it('keeps Thủy in the center of a five-direction fan and only adds darts with R ranks', () => {
    for (const rank of [0, 2, 4]) {
      const { hero, world, config, upgrade, send, events } = trial(
        duongMon.amKhi,
        42,
        rank > 2 ? 8 : 6,
      );
      for (let i = 0; i < rank; i++) upgrade(3);
      const target = addCreep(
        world,
        'aim',
        { x: hero.x + 180, y: hero.y },
        config,
      );
      expect(hero.dashCharges).toBe(4);
      send({ kind: 'cast', slot: 3 });
      expect(events).not.toContainEqual(
        expect.objectContaining({ abilityId: duongMon.elements, kind: 'cast' }),
      );
      send({ kind: 'basic' });
      const darts = [...world.projectiles.values()].filter(
        (p) => p.abilityId === duongMon.amKhi,
      );
      expect(darts.map((p) => p.stage)).toEqual(
        duongMonFan.slice(0, rank + 1).map((d) => d.stage),
      );
      darts.forEach((dart, i) =>
        expect(Math.atan2(dart.vy, dart.vx)).toBeCloseTo(duongMonFan[i]!.angle),
      );
      expect(target.hp).toBeGreaterThan(0);
    }
  });

  it('flies, fires iron feathers and prevents movement while protected by its wings', () => {
    const { hero, world, cast, step, send, upgrade } = trial(duongMon.coQuan);
    upgrade(3);
    cast(1);
    expect(hasStatus(hero, 'duong_mon_flight', world.tick)).toBe(true);
    const mana = hero.mana;
    step(15);
    expect(hero.mana).toBeLessThan(mana);
    send({ kind: 'basic' });
    expect([...world.projectiles.values()]).toContainEqual(
      expect.objectContaining({ stage: 'feather' }),
    );
    cast(0);
    const arrows = [...world.projectiles.values()].filter(
      (p) => p.abilityId === duongMon.arrows,
    );
    expect(arrows).toHaveLength(3);
    expect(new Set(arrows.map((p) => p.vx)).size).toBe(1);
    expect(new Set(arrows.map((p) => p.vy)).size).toBe(1);
    cast(1);
    expect(hasStatus(hero, 'duong_mon_flight', world.tick)).toBe(false);
    cast(3);
    expect(hasStatus(hero, 'duong_mon_shell', world.tick)).toBe(true);
    const x = hero.x;
    send({ kind: 'move', x: 1, y: 0 });
    step(10);
    expect(hero.x).toBe(x);
  });

  it('hits through two opponents with the laser and places 20 distinct delayed blast areas', () => {
    const { world, hero, config, cast, step, events } = trial(duongMon.coQuan);
    hero.fx = 1;
    hero.fy = 0;
    const targets = [100, 220].map((offset, i) =>
      addCreep(world, 'laser-' + i, { x: hero.x + offset, y: hero.y }, config),
    );
    cast(2);
    step(23);
    expect(
      events
        .filter((e) => e.abilityId === duongMon.laser && e.kind === 'hit')
        .map((e) => e.targetId),
    ).toEqual(targets.map((t) => t.id));
    cast(4);
    step(12);
    const flowers = world.areas!.filter(
      (a) => a.abilityId === duongMon.flowers,
    );
    expect(flowers).toHaveLength(20);
    expect(
      new Set(flowers.map((a) => Math.round(a.x) + ',' + Math.round(a.y))).size,
    ).toBe(20);
    expect(
      events.filter(
        (e) => e.abilityId === duongMon.flowers && e.kind === 'pulse',
      ),
    ).toHaveLength(0);
    step(38);
    expect(
      events.filter(
        (e) => e.abilityId === duongMon.flowers && e.kind === 'pulse',
      ),
    ).toHaveLength(20);
  });

  it.each([
    [6, 1, 27, 40],
    [12, 2, 42, 51],
    [18, 3, 69, 62],
    [24, 4, 84, 72],
  ])(
    'doubles each flower blast at level %i and ultimate rank %i',
    (level, rank, seed, damage) => {
      const { world, config, cast, step, events, upgrade } = trial(
        duongMon.coQuan,
        seed,
        level,
      );
      config.creep.defense = 0;
      for (let i = 1; i < rank; i++) upgrade(4);
      cast(4);
      step(12);
      const flowers = world.areas!.filter(
        (a) => a.abilityId === duongMon.flowers,
      );
      expect(flowers).toHaveLength(20);
      const target = addCreep(world, 'blast-target', flowers[0]!, config);
      world.random = () => 0.99;
      step(38);
      const hits = events.filter(
        (e) =>
          e.kind === 'hit' &&
          e.abilityId === duongMon.flowers &&
          e.targetId === target.id,
      );
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.map((e) => e.damage)).toEqual(hits.map(() => damage));
    },
  );

  it('uses three trap charges and stuns only after a target steps onto a trap', () => {
    const { world, hero, config, cast, step, events } = trial(duongMon.amKhi);
    expect(
      skillCharges(
        hero,
        rankedAbility(hero, duongMon.trap, config)!,
        world.tick,
      )?.count,
    ).toBe(3);
    cast(0);
    step(12);
    expect(
      events.some((e) => e.abilityId === duongMon.trap && e.kind === 'pulse'),
    ).toBe(false);
    expect(
      skillCharges(
        hero,
        rankedAbility(hero, duongMon.trap, config)!,
        world.tick,
      )?.count,
    ).toBe(2);
    const trap = world.areas!.find((a) => a.abilityId === duongMon.trap)!;
    const target = addCreep(world, 'caught', { x: trap.x, y: trap.y }, config);
    step(4);
    expect(
      events.filter((e) => e.abilityId === duongMon.trap && e.kind === 'pulse'),
    ).toHaveLength(1);
    expect(hasStatus(target, 'stun', world.tick)).toBe(true);
  });

  it('retains dash protection for two seconds and schedules three storm phases', () => {
    const { world, hero, cast, step } = trial(duongMon.amKhi);
    cast(2);
    step(8);
    expect(hasStatus(hero, 'duong_mon_evade', world.tick)).toBe(true);
    step(55);
    expect(hasStatus(hero, 'duong_mon_evade', world.tick)).toBe(true);
    step(6);
    expect(hasStatus(hero, 'duong_mon_evade', world.tick)).toBe(false);
    cast(4);
    expect(world.shots.filter((s) => s.stage === 'slow_knives')).toHaveLength(
      9,
    );
    expect(world.shots.filter((s) => s.stage === 'poison_knives')).toHaveLength(
      90,
    );
    expect(world.shots.filter((s) => s.stage === 'water')).toHaveLength(25);
  });
});
