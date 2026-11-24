import { it, expect } from 'vitest';
import {
  addHero,
  addCreep,
  createWorld,
  submitInput,
  stepWorld,
  dragonDiveDuration,
  dragonDivePose,
  DungeonMatch,
  type CombatEvent,
} from '@volam/game-core';
import { m1Config, creepDungeon, hongLietDungeon } from '@volam/game-data';
import { cancelOwnedEffects } from '../packages/game-core/src/status.js';
import {
  captureConfinement,
  confineMovement,
  enforceConfinement,
} from '../packages/game-core/src/confinement.js';
function setup(skill = 'hang_long_hoa_vu') {
  const c = structuredClone(m1Config);
  Object.assign(c, {
    collision: [],
    creepSpawns: [],
    creepRespawn: false,
    critChance: 0,
    manaRegen: 0,
  });
  Object.assign(c.creep, { defense: 0, speed: 0, damage: 0 });
  const w = createWorld(c, 42),
    h = addHero(w, 'h', 'h', c);
  Object.assign(h, {
    schoolId: 'cai_bang',
    x: 400,
    y: 400,
    fx: 1,
    fy: 0,
    mana: 1000,
    maxMana: 1000,
    skillIds: [skill, '', '', ''],
  });
  w.random = () => 0.99;
  const events: CombatEvent[] = [];
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      stepWorld(w, c);
      events.push(...w.events);
    }
  };
  const target = (id: string, x = 600, y = 400) => {
    const e = addCreep(w, id, { x, y }, c);
    Object.assign(e, { controlled: true, hp: 10000, maxHp: 10000 });
    return e;
  };
  const cast = () => {
    submitInput(w, h.id, h.lastSequence + 1, { kind: 'cast', slot: 0 });
    step();
  };
  return { c, w, h, step, events, target, cast };
}
it('dragon uses one landing pulse at the locked nearest target', () => {
  const s = setup(),
    e = s.target('target', 450),
    near = s.target('near', 530),
    miss = s.target('outside', 800, 650);
  s.cast();
  const effect = s.c.skillCatalogue!.hang_long_hoa_vu!.effect;
  if (effect.mode !== 'projectile' || !effect.dragonDive)
    throw Error('missing dragon definition');
  const duration = dragonDiveDuration(effect.dragonDive),
    stages = new Set<string>();
  const p = [...s.w.projectiles.values()][0]!;
  expect(p.dragonFlight!.target).toEqual({ x: 450, y: 400 });
  for (let i = 0; i < duration; i++) {
    for (const p of s.w.projectiles.values()) stages.add(p.stage!);
    s.step();
  }
  s.step(2);
  expect([...stages].sort()).toEqual([
    'dragon_coil',
    'dragon_dive',
    'dragon_forward',
    'dragon_rise',
  ]);
  expect(
    s.events.filter((event) => event.kind === 'hit' && event.targetId === e.id),
  ).toHaveLength(2);
  expect(
    s.events.filter(
      (event) => event.kind === 'hit' && event.targetId === near.id,
    ),
  ).toHaveLength(2);
  expect(miss.hp).toBe(10000);
  const impacts = s.events.filter((e) => e.stage === 'dragon_impact');
  expect(impacts).toHaveLength(1);
  expect(impacts[0]).toMatchObject({ x: 450, y: 400, radius: 128.8 });
  expect(s.w.projectiles.size).toBe(0);
  expect(s.h.mana).toBe(955);
  const d = effect.dragonDive,
    o = { x: 400, y: 400 },
    t = { x: 600, y: 400 };
  const a = dragonDivePose(o, t, 1, 0, d.forwardTicks, d),
    b = dragonDivePose(o, t, 1, 0, d.forwardTicks + d.orbitTicks, d);
  expect(a.x).toBeCloseTo(b.x);
  expect(a.y).toBeCloseTo(b.y);
  expect(a.stage).toBe('dragon_coil');
  expect(b.stage).toBe('dragon_rise');
});
it('dragon locks the target point and does not follow moving target or caster', () => {
  const s = setup(),
    e = s.target('moving');
  s.cast();
  const point = { x: e.x, y: e.y };
  e.x = 1000;
  e.y = 700;
  s.h.x += 24;
  s.h.y += 12;
  s.step(110);
  expect(e.hp).toBe(10000);
  const impacts = s.events.filter((e) => e.stage === 'dragon_impact');
  expect(impacts).toHaveLength(1);
  expect(impacts[0]).toMatchObject(point);
});

it.each(['death', 'zone'])(
  'dragon cancels without impact on %s cleanup',
  (kind) => {
    const s = setup();
    s.target('t');
    s.cast();
    s.step(30);
    if (kind === 'death') {
      s.h.hp = 0;
      s.step();
    } else cancelOwnedEffects(s.w, s.h.id);
    s.step(100);
    expect(s.w.projectiles.size).toBe(0);
    expect(s.events.some((e) => e.stage === 'dragon_impact')).toBe(false);
  },
);
it('seven sword hits retain approximately the four-hit budget after per-hit rounding, without an eighth damaging finisher', () => {
  const s = setup('that_tinh_kiem');
  s.h.schoolId = 'vo_dang';
  const e = s.target('front', 450),
    back = s.target('back', 200);
  s.cast();
  s.step(38);
  expect(
    s.events.filter(
      (e) => e.kind === 'pulse' && e.stage === 'sword_rain_impact',
    ),
  ).toHaveLength(7);
  expect(
    s.events.filter((e) => e.kind === 'hit' && e.targetId === 'front'),
  ).toHaveLength(7);
  expect(back.hp).toBe(10000);
  expect(10000 - e.hp).toBeGreaterThanOrEqual(25 * 4 - 7);
  expect(10000 - e.hp).toBeLessThanOrEqual(25 * 4);
});
it('dome confines resistant boss movement, allows ally passage, and releases at expiry', () => {
  const s = setup('thai_cuc_tran');
  s.h.schoolId = 'vo_dang';
  const boss = s.target('boss', 450);
  boss.forcedMovementImmune = true;
  boss.statuses = [
    {
      kind: 'interrupt_resist',
      durationTicks: 1000,
      magnitude: 1,
      until: 1000,
      sourceId: boss.id,
      abilityId: 'boss',
    },
  ];
  s.cast();
  s.step(24);
  captureConfinement(s.w, s.c);
  const a = s.w.areas![0]!;
  expect(a.trappedIds).toContain(boss.id);
  const from = { x: boss.x, y: boss.y };
  boss.x = 900;
  enforceConfinement(s.w, s.c, new Map([[boss.id, from]]));
  expect(Math.hypot(boss.x - a.x, boss.y - a.y)).toBeCloseTo(a.effect.radius);
  const ally = addHero(s.w, 'ally', 'ally', s.c);
  ally.x = 900;
  ally.y = 400;
  confineMovement(s.w, ally, from, s.c);
  expect(ally.x).toBe(900);
  s.w.tick = a.until;
  boss.x = 900;
  confineMovement(s.w, boss, from, s.c);
  expect(boss.x).toBe(900);
});
it('DungeonMatch clips the real Hong Liet scripted dash at the dome boundary', () => {
  const c = structuredClone(m1Config);
  c.creepSpawns = [];
  const m = new DungeonMatch(c, creepDungeon, 42, undefined, [hongLietDungeon]);
  const h = m.add('h', 'h');
  expect(m.enter(h.id, 'shared', 'hong_liet')).toBeUndefined();
  const z = m.zoneOf(h.id)!;
  z.config.collision = [];
  const w = z.world,
    e = z.encounter!,
    boss = w.creeps.get(e.bossId)!;
  Object.assign(h, {
    schoolId: 'vo_dang',
    progression: undefined,
    x: 600,
    y: 480,
    fx: 1,
    fy: 0,
    hp: 100000,
    maxHp: 100000,
    mana: 1000,
    maxMana: 1000,
    skillIds: ['thai_cuc_tran', '', '', ''],
  });
  Object.assign(boss, {
    x: 640,
    y: 480,
    hp: 100000,
    maxHp: 100000,
    forcedMovementImmune: true,
  });
  e.nextActionAt = Number.MAX_SAFE_INTEGER;
  submitInput(w, h.id, 1, { kind: 'cast', slot: 0 });
  for (let t = 0; t <= 24; t++) m.step();
  const area = w.areas![0]!;
  expect(area.trappedIds).toContain(boss.id);
  e.cast = undefined;
  e.begin(w, z.config, 'liet_diem_phong_toa', { x: 1000, y: 480 });
  let reached = false;
  for (let t = 0; t < 75; t++) {
    m.step();
    const d = Math.hypot(boss.x - area.x, boss.y - area.y);
    expect(d).toBeLessThanOrEqual(area.effect.radius + 0.001);
    if (d > area.effect.radius - 1) reached = true;
  }
  expect(reached).toBe(true);
});
