import { expect, it } from 'vitest';
import {
  addCreep,
  addHero,
  createWorld,
  stepWorld,
  submitInput,
  tamLienTram,
  type Command,
} from '@volam/game-core';
import { m1Config } from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';

function fixture() {
  const config = {
    ...structuredClone(m1Config),
    collision: [],
    creepSpawns: [],
    manaRegen: 0,
  };
  const world = createWorld(config, 41);
  const hero = addHero(world, 'hero', 'Đao', config);
  Object.assign(hero, {
    x: 500,
    y: 500,
    fx: 1,
    fy: 0,
    schoolId: 'thien_son',
    basicId: 'thien_son_dao',
    mana: 120,
    maxMana: 120,
    skillIds: ['phi_anh_tram', 'phong_anh_hoan_vi', 'luu_phong_bo', ''],
  });
  const target = (id: string, x: number, y = 500) => {
    const enemy = addCreep(world, id, { x, y }, config);
    Object.assign(enemy, { hp: 10000, maxHp: 10000, controlled: true });
    return enemy;
  };
  const events: (typeof world.events)[number][] = [];
  const step = (ticks = 1) => {
    for (let i = 0; i < ticks; i++) {
      stepWorld(world, config);
      events.push(...world.events);
    }
  };
  const press = (command: Command) => {
    expect(submitInput(world, hero.id, hero.lastSequence + 1, command)).toBe(
      true,
    );
    step();
  };
  const basic = (times: number) => {
    for (let i = 0; i < times; i++) press({ kind: 'basic' });
  };
  return { config, world, hero, target, events, step, press, basic };
}

it('accepts consecutive A, exposes six confirmed hits for two seconds and applies the three passes', () => {
  const f = fixture();
  const enemy = f.target('dummy', 552);
  f.press({ kind: 'tam-lien-tram' });
  f.basic(5);
  expect(f.hero.tamLien).toMatchObject({ charges: 5, readyUntil: 0 });
  f.basic(1);
  expect(f.hero.tamLien?.readyUntil).toBe(f.world.tick + 60);
  const swings = f.events
    .filter((e) => e.kind === 'attack')
    .map((e) => e.stage);
  expect(swings).toHaveLength(6);
  expect(new Set(swings).size).toBeGreaterThan(1);
  f.press({ kind: 'tam-lien-tram' });
  const ready = f.hero.abilityCooldowns![tamLienTram.id]!;
  expect(ready - f.world.tick).toBe(300);
  f.step(15);
  const passes = f.events.filter(
    (e) => e.abilityId === tamLienTram.id && e.kind === 'pulse',
  );
  expect(passes.map((e) => e.stage)).toEqual(['cross_0', 'cross_1', 'cross_2']);
  expect(passes.map((e) => Math.sign(e.fx ?? 0))).toEqual([1, -1, 0]);
  expect(
    f.events
      .filter((e) => e.abilityId === tamLienTram.id && e.kind === 'hit')
      .map((e) => e.targetId),
  ).toEqual([enemy.id, enemy.id, enemy.id]);
  Object.assign(f.hero, { x: 500, y: 500, fx: 1, fy: 0 });
  f.basic(6);
  expect(f.hero.tamLien).toBeUndefined();
  f.step(ready - f.world.tick - 1);
  f.basic(1);
  expect(f.hero.tamLien).toMatchObject({ charges: 1, readyUntil: 0 });
  f.basic(5);
  f.step(59);
  expect(f.hero.tamLien?.charges).toBe(6);
  f.press({ kind: 'tam-lien-tram' });
  expect(f.hero.tamLien).toBeUndefined();
  expect(
    f.events.filter(
      (e) => e.abilityId === tamLienTram.id && e.kind === 'pulse',
    ),
  ).toHaveLength(3);
});

it('ignores misses, counts at most one target per cast and groups dungeon and wave creeps', () => {
  const f = fixture();
  const first = f.target('one', 545);
  const second = f.target('two', 570, 514);
  f.basic(3);
  expect(f.hero.tamLien).toMatchObject({ targetId: first.id, charges: 3 });
  first.x = 700;
  f.basic(1);
  expect(f.hero.tamLien).toMatchObject({ targetId: second.id, charges: 1 });
  second.x = 700;
  f.basic(1);
  expect(f.hero.tamLien?.charges).toBe(1);
  f.config.dungeonAggro = true;
  second.x = 545;
  f.basic(1);
  expect(f.hero.tamLien).toMatchObject({ group: 'creeps', charges: 1 });
  f.config.dungeonAggro = false;
  first.x = 545;
  second.x = 700;
  first.invasion = {
    wave: 1,
    lane: 'east',
    targetId: '',
    reacquireAt: 0,
    chaseOrigin: { x: first.x, y: first.y },
    chaseRange: 0,
    aggroRestTicks: 0,
  };
  f.basic(1);
  expect(f.hero.tamLien).toMatchObject({ targetId: first.id, charges: 2 });
  second.x = 600;
  f.press({ kind: 'cast', slot: 0 });
  f.step(10);
  expect(f.hero.tamLien).toMatchObject({ targetId: first.id, charges: 3 });
});

it('keeps one fan alive at full reach, pays for every pulse and starts cooldown on catch', () => {
  const f = fixture();
  const enemy = f.target('dummy', 720);
  const cast = () => f.press({ kind: 'cast', slot: 2 });
  submitInput(f.world, f.hero.id, 1, { kind: 'cast', slot: 2 });
  cast();
  expect(f.world.projectiles.size).toBe(1);
  f.step(32);
  const shot = [...f.world.projectiles.values()][0]!;
  expect(shot.stage).toBe('fan_hold');
  expect(shot.x).toBeCloseTo(720);
  const hp = enemy.hp;
  const mana = f.hero.mana;
  f.step(20);
  expect(enemy.hp).toBeLessThan(hp);
  expect(f.hero.mana).toBe(mana - 8);
  expect(f.hero.skillCooldowns[2]).toBeLessThanOrEqual(f.world.tick);
  cast();
  expect(shot.stage).toBe('fan_return');
  cast();
  expect(f.world.projectiles.size).toBe(1);
  while (f.world.projectiles.size) f.step();
  const ready = f.world.tick + 60;
  expect(f.hero.skillCooldowns[2]).toBe(ready);
  cast();
  expect(f.world.projectiles.size).toBe(0);
  f.step(ready - f.world.tick - 1);
  cast();
  expect(f.world.projectiles.size).toBe(1);
});

it('Phong Ảnh only charges when the counter actually lands', () => {
  const f = fixture();
  const enemy = f.target('attacker', 550);
  f.press({ kind: 'cast', slot: 1 });
  f.step(8);
  expect(f.hero.tamLien).toBeUndefined();
  enemy.x = f.hero.x + 30;
  hurt(f.world, f.hero, enemy.id, 'creep_strike', 10, f.config);
  expect(f.hero.tamLien).toMatchObject({ charges: 1, targetId: enemy.id });
  hurt(f.world, f.hero, enemy.id, 'creep_strike', 10, f.config);
  expect(f.hero.tamLien?.charges).toBe(1);
});
