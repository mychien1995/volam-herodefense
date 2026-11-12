import { describe, expect, it } from 'vitest';
import {
  addHero,
  createWorld,
  stepWorld,
  submitInput,
  removeHero,
  segmentCircle,
  distance,
  type Command,
  type SimulationConfig,
} from '@volam/game-core';
import {
  m1Config,
  simulationConfigSchema,
  abilitySchema,
} from '@volam/game-data';
const setup = () => {
  const config: SimulationConfig = structuredClone(m1Config);
  config.collision = [];
  config.spawn = { x: 200, y: 200 };
  config.creepSpawns = [{ x: 900, y: 900 }];
  config.critChance = 0;
  config.creep.speed = 0;
  config.creep.detectionRange = 0.1;
  const world = createWorld(config, 42);
  const hero = addHero(world, 'a', 'Hero', config);
  const enemy = world.creeps.get('creep_0')!;
  const input = (command: Command) =>
    submitInput(world, hero.id, hero.lastSequence + 1, command);
  const steps = (n: number) => {
    for (let i = 0; i < n; i++) stepWorld(world, config);
  };
  return { config, world, hero, enemy, input, steps };
};
describe('M1 deterministic movement and input', () => {
  it('normalizes diagonals and preserves eight-way facing', () => {
    const a = setup();
    const b = setup();
    a.input({ kind: 'move', x: 1, y: 0 });
    b.input({ kind: 'move', x: 1, y: -1 });
    a.steps(10);
    b.steps(10);
    expect(distance(a.hero, { x: 200, y: 200 })).toBeCloseTo(160 / 3, 8);
    expect(distance(b.hero, { x: 200, y: 200 })).toBeCloseTo(160 / 3, 8);
    expect(b.hero.fx).toBeCloseTo(Math.SQRT1_2);
    expect(b.hero.fy).toBeCloseTo(-Math.SQRT1_2);
  });
  it('blocks small footprints, slides along them and never tunnels through walls', () => {
    const a = setup();
    a.config.collision = [{ x: 220, y: 180, width: 12, height: 80 }];
    a.input({ kind: 'move', x: 1, y: 1 });
    a.steps(10);
    expect(a.hero.x).toBeLessThanOrEqual(210);
    expect(a.hero.y).toBeGreaterThan(220);
  });
  it('times out stale movement and rejects replayed sequence/invalid directions', () => {
    const a = setup();
    a.input({ kind: 'move', x: 1, y: 0 });
    a.steps(20);
    const x = a.hero.x;
    a.steps(20);
    expect(a.hero.x).toBe(x);
    expect(submitInput(a.world, 'a', 1, { kind: 'move', x: -1, y: 0 })).toBe(
      false,
    );
    expect(a.input({ kind: 'move', x: 999, y: 0 })).toBe(false);
  });
  it('uses one fixed step regardless of how many inputs arrived', () => {
    const a = setup();
    for (let i = 0; i < 60; i++) a.input({ kind: 'move', x: 1, y: 0 });
    expect(a.hero.x).toBe(200);
    a.steps(1);
    expect(a.hero.x).toBeCloseTo(200 + 160 / 30);
  });
});
describe('M1 manual attacks and the two data-driven abilities', () => {
  it('selects a frontal primary, reduces secondary cleave and excludes enemies behind', () => {
    const a = setup();
    a.enemy.x = 240;
    a.enemy.y = 200;
    const secondary = structuredClone(a.enemy);
    secondary.id = 'side';
    secondary.x = 235;
    secondary.y = 220;
    const behind = structuredClone(a.enemy);
    behind.id = 'behind';
    behind.x = 170;
    a.world.creeps.set(secondary.id, secondary);
    a.world.creeps.set(behind.id, behind);
    a.input({ kind: 'basic' });
    a.steps(1);
    expect(a.enemy.hp).toBe(93);
    expect(secondary.hp).toBe(107);
    expect(behind.hp).toBe(120);
    expect(a.enemy.hits['a']).toBe(1);
    expect(secondary.hits['a']).toBe(1);
    expect(
      a.world.events
        .filter((event) => event.kind === 'hit')
        .map(({ targetId, hitIndex }) => [targetId, hitIndex ?? 0]),
    ).toEqual([
      [a.enemy.id, 0],
      [secondary.id, 1],
    ]);
  });
  it('enforces cadence across attack-style swaps and input spam', () => {
    const a = setup();
    a.enemy.x = 240;
    a.enemy.y = 200;
    a.input({ kind: 'basic' });
    a.input({ kind: 'basic' });
    a.steps(1);
    const hp = a.enemy.hp;
    a.input({ kind: 'select-basic', id: 'cai_bang_chuong' });
    a.input({ kind: 'basic' });
    a.steps(1);
    expect(a.enemy.hp).toBe(hp);
    expect(a.world.projectiles.size).toBe(0);
    a.steps(17);
    a.input({ kind: 'basic' });
    a.steps(1);
    expect(a.world.projectiles.size).toBe(1);
  });
  it('samples nearest-at-fire, flies straight and misses a dodging enemy', () => {
    const a = setup();
    a.hero.basicId = 'cai_bang_chuong';
    a.enemy.x = 280;
    a.enemy.y = 200;
    a.input({ kind: 'basic' });
    a.steps(1);
    const shot = [...a.world.projectiles.values()][0]!;
    expect(shot.vx).toBe(360);
    expect(shot.vy).toBe(0);
    a.enemy.y = 280;
    a.steps(10);
    expect(shot.y).toBe(200);
    expect(shot.vy).toBe(0);
    expect(a.enemy.hp).toBe(120);
    a.steps(30);
    expect(a.world.projectiles.size).toBe(0);
  });
  it('uses facing without a target and hits small targets swept between ticks', () => {
    expect(
      segmentCircle({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 0 }, 2),
    ).toBeCloseTo(0.48);
    const a = setup();
    a.hero.basicId = 'cai_bang_chuong';
    a.hero.fx = 0;
    a.hero.fy = -1;
    a.input({ kind: 'basic' });
    a.steps(1);
    expect([...a.world.projectiles.values()][0]?.vy).toBe(-360);
  });
  it('blocks projectiles at scenery collision rather than flying through a trunk', () => {
    const a = setup();
    a.hero.basicId = 'cai_bang_chuong';
    a.enemy.x = 300;
    a.enemy.y = 200;
    a.config.collision = [{ x: 230, y: 180, width: 10, height: 40 }];
    a.input({ kind: 'basic' });
    a.steps(10);
    expect(a.enemy.hp).toBe(120);
    expect(a.world.projectiles.size).toBe(0);
  });
  it('Hỏa Vân Chưởng emits three simultaneous divergent straight shots, spends mana once and respects cooldown', () => {
    const a = setup();
    a.input({ kind: 'cast', slot: 0 });
    a.input({ kind: 'cast', slot: 0 });
    a.steps(1);
    expect(a.hero.mana).toBe(82);
    expect(a.world.projectiles.size).toBe(3);
    a.steps(7);
    expect(a.world.projectiles.size).toBe(3);
    expect(
      [...a.world.projectiles.values()].every(
        (shot) =>
          shot.vx > 0 && Math.abs(Math.hypot(shot.vx, shot.vy) - 360) < 0.001,
      ),
    ).toBe(true);
  });
  it('Cuồng Long Loạn Vũ explodes in an area, burns three times, then expires', () => {
    const a = setup();
    a.enemy.x = 260;
    a.enemy.y = 200;
    a.enemy.hp = 1000;
    const side = structuredClone(a.enemy);
    side.id = 'side';
    side.y = 225;
    a.world.creeps.set('side', side);
    a.input({ kind: 'cast', slot: 1 });
    let burns = 0;
    for (let i = 0; i < 130; i++) {
      a.steps(1);
      burns += a.world.events.filter(
        (event) => event.kind === 'hit' && event.abilityId === 'burn',
      ).length;
    }
    expect(burns).toBe(6);
    expect(a.enemy.hp).toBe(958);
    expect(side.hp).toBe(958);
  });
  it('rejects empty E/R slots, insufficient mana and dead-hero actions', () => {
    const a = setup();
    a.hero.mana = 0;
    for (const slot of [0, 1, 2, 3]) a.input({ kind: 'cast', slot });
    a.steps(1);
    expect(a.world.projectiles.size).toBe(0);
    expect(a.hero.skillCooldowns).toEqual([0, 0, 0, 0]);
    a.hero.hp = 0;
    a.input({ kind: 'basic' });
    a.steps(1);
    expect(a.world.events).toEqual([]);
    expect(a.hero.pose).toBe('death');
  });
});
describe('M1 fixed-pool progression and replay', () => {
  it('splits one XP/gold pool among damaging assists, never awards twice', () => {
    const a = setup();
    a.enemy.x = 240;
    a.enemy.y = 200;
    a.enemy.hp = 40;
    const b = addHero(a.world, 'b', 'Second', a.config);
    b.x = 200;
    b.y = 200;
    const inactive = addHero(a.world, 'c', 'Inactive', a.config);
    a.input({ kind: 'basic' });
    submitInput(a.world, 'b', 1, { kind: 'basic' });
    a.steps(1);
    expect(a.enemy.hp).toBe(0);
    expect([a.hero.xp, b.xp, inactive.xp]).toEqual([30, 30, 0]);
    expect(a.hero.gold + b.gold).toBe(12);
    a.steps(20);
    a.input({ kind: 'basic' });
    a.steps(1);
    expect(a.hero.xp + b.xp).toBe(60);
  });
  it('excludes expired assists and caps level at 30 with one earned point per level', () => {
    const a = setup();
    a.enemy.x = 240;
    a.enemy.y = 200;
    a.enemy.hp = 1;
    a.world.tick = 500;
    const b = addHero(a.world, 'b', 'Expired', a.config);
    a.enemy.hits['b'] = 1;
    a.hero.xp = 60 * 29;
    a.hero.level = 30;
    a.hero.skillPoints = 30;
    a.input({ kind: 'basic' });
    a.steps(1);
    expect(b.xp).toBe(0);
    expect(a.hero.level).toBe(30);
    expect(a.hero.skillPoints).toBe(30);
  });
  it('removes departing hero projectiles and delayed shots', () => {
    const a = setup();
    a.input({ kind: 'cast', slot: 0 });
    a.steps(1);
    removeHero(a.world, 'a');
    expect(a.world.projectiles.size).toBe(0);
    expect(a.world.shots).toEqual([]);
  });
  it('replays the same seed and inputs into identical positions, HP and rewards', () => {
    const run = () => {
      const a = setup();
      for (let i = 0; i < 300; i++) {
        if (i % 30 === 0) a.input({ kind: 'cast', slot: i % 60 ? 0 : 1 });
        if (i % 10 === 0) a.input({ kind: 'move', x: i < 150 ? 1 : -1, y: 0 });
        a.steps(1);
      }
      return JSON.stringify({
        heroes: [...a.world.heroes],
        creeps: [...a.world.creeps],
        shots: [...a.world.projectiles],
        tick: a.world.tick,
      });
    };
    expect(run()).toBe(run());
  });
  it('validates M1 tuning and canonical skill definitions', () => {
    expect(
      simulationConfigSchema.safeParse({ ...m1Config, speed: NaN }).success,
    ).toBe(false);
    expect(
      abilitySchema.safeParse({ ...m1Config.skills[0], manaCost: -1 }).success,
    ).toBe(false);
    expect(m1Config.skills.map((skill) => skill.nameVi)).toEqual([
      'Hỏa Vân Chưởng',
      'Cuồng Long Loạn Vũ',
    ]);
  });
});

describe('M1 edge regressions', () => {
  it('keeps a dead, present recent assist eligible without reviving it on level-up', () => {
    const a = setup();
    const b = addHero(a.world, 'b', 'Alive', a.config);
    b.x = 200;
    b.y = 200;
    a.hero.hp = 0;
    a.hero.xp = 40;
    a.enemy.hp = 1;
    a.enemy.x = 240;
    a.enemy.y = 200;
    a.enemy.hits['a'] = 0;
    submitInput(a.world, 'b', 1, { kind: 'basic' });
    a.steps(1);
    expect(a.hero.xp).toBe(70);
    expect(a.hero.hp).toBe(0);
    expect(a.hero.level).toBe(2);
    expect(b.xp).toBe(30);
  });
  it('snapshots one melee hit before any victim grants a level-up', () => {
    const a = setup();
    a.enemy.hp = 1;
    a.enemy.x = 240;
    a.enemy.y = 200;
    const side = structuredClone(a.enemy);
    side.id = 'side';
    side.hp = 120;
    side.x = 235;
    side.y = 220;
    a.world.creeps.set('side', side);
    a.input({ kind: 'basic' });
    a.steps(1);
    expect(a.hero.level).toBe(2);
    expect(side.hp).toBe(107);
  });
  it('snapshots projectile damage at cast before later level changes', () => {
    const a = setup();
    a.hero.basicId = 'cai_bang_chuong';
    a.enemy.x = 300;
    a.enemy.y = 200;
    a.input({ kind: 'basic' });
    a.steps(1);
    a.hero.level = 30;
    a.steps(10);
    expect(a.enemy.hp).toBe(99);
  });
  it.each([
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ])('moves in direction (%s,%s) at the same speed', (x, y) => {
    const a = setup();
    a.input({ kind: 'move', x, y });
    a.steps(5);
    expect(distance(a.hero, { x: 200, y: 200 })).toBeCloseTo(160 / 6, 8);
  });
});

it('prevents melee damage through solid scenery', () => {
  const a = setup();
  a.enemy.x = 240;
  a.enemy.y = 200;
  a.config.collision = [{ x: 220, y: 180, width: 8, height: 40 }];
  a.input({ kind: 'basic' });
  a.steps(1);
  expect(a.enemy.hp).toBe(120);
});

it('enforces creep attack cadence and preserves progress when a hero falls', () => {
  const a = setup();
  a.config.creep.detectionRange = 160;
  a.enemy.x = 220;
  a.enemy.y = 200;
  a.hero.xp = 40;
  a.hero.gold = 12;
  a.steps(1);
  expect(a.hero.hp).toBe(154);
  expect(a.hero.pose).toBe('hurt');
  a.steps(44);
  expect(a.hero.hp).toBe(154);
  a.steps(1);
  expect(a.hero.hp).toBe(148);
  a.hero.hp = 6;
  a.steps(45);
  expect(a.hero.hp).toBe(0);
  expect(a.hero.pose).toBe('death');
  expect(a.hero.xp).toBe(40);
  expect(a.hero.gold).toBe(12);
});
it('refreshes a training creep only after its configured death interval', () => {
  const a = setup();
  a.enemy.x = 240;
  a.enemy.y = 200;
  a.enemy.hp = 1;
  a.input({ kind: 'basic' });
  a.steps(1);
  expect(a.enemy.hp).toBe(0);
  a.steps(239);
  expect(a.world.creeps.get('creep_0')?.hp).toBe(0);
  a.steps(1);
  expect(a.world.creeps.get('creep_0')?.hp).toBe(120);
  expect(a.hero.xp).toBe(60);
  expect(a.hero.skillPoints).toBe(2);
});
