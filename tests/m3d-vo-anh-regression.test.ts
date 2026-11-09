import { it, expect } from 'vitest';
import {
  createWorld,
  addHero,
  addCreep,
  submitInput,
  stepWorld,
  type CombatEvent,
} from '@volam/game-core';
import { m1Config } from '@volam/game-data';
import {
  applyStatus,
  cancelOwnedEffects,
} from '../packages/game-core/src/status.js';
function scenario() {
  const c = structuredClone(m1Config);
  c.manaRegen = 0;
  Object.assign(c, { collision: [], creepSpawns: [], creepRespawn: false });
  const w = createWorld(c, 42),
    h = addHero(w, 'h', 'h', c);
  Object.assign(h, {
    schoolId: 'thieu_lam',
    x: 400,
    y: 400,
    fx: 1,
    fy: 0,
    skillIds: [
      'toan_phong_thoai',
      'hoanh_tao_cuoc',
      'vo_anh_cuoc',
      'kim_cang_bat_hoai',
    ],
    mana: 1000,
    maxMana: 1000,
  });
  const e = addCreep(w, 'target', { x: 620, y: 400 }, c);
  e.controlled = true;
  e.hp = e.maxHp = 10000;
  const feet = new Map<string, { tick: number; y: number; x: number }>(),
    casts: string[] = [],
    events: CombatEvent[] = [];
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      stepWorld(w, c);
      events.push(...w.events);
      for (const p of w.projectiles.values())
        if (p.abilityId === 'vo_anh_cuoc' && !feet.has(p.id))
          feet.set(p.id, { tick: w.tick, y: p.y, x: p.x });
      casts.push(
        ...w.events.filter((e) => e.kind === 'cast').map((e) => e.abilityId),
      );
    }
  };
  const cast = (slot: number) => {
    submitInput(w, 'h', h.lastSequence + 1, { kind: 'cast', slot });
    step();
  };
  return { c, w, h, e, feet, casts, events, step, cast };
}
it('a miss falls back to three ordered feet, even with a buffered finisher', () => {
  const s = scenario();
  s.cast(0);
  s.step(9);
  s.cast(1);
  s.e.y = 700;
  s.step(9);
  s.cast(2);
  expect(s.h.comboFinisher).toBeDefined();
  s.step(70);
  expect([...s.feet.values()].map((x) => x.y)).toEqual([382, 400, 418]);
  expect(s.h.x).toBe(400);
  expect(s.casts.filter((x) => x === 'vo_anh_cuoc')).toHaveLength(1);
});
it('different targets cannot unlock Phát Động', () => {
  const s = scenario();
  s.cast(0);
  s.step(24);
  expect(s.w.combos![0]!.step).toBe(1);
  s.e.x = 1000;
  const other = addCreep(s.w, 'other', { x: 180, y: 400 }, s.c);
  other.hp = other.maxHp = 10000;
  other.controlled = true;
  s.h.fx = -1;
  s.cast(1);
  s.step(9);
  s.cast(2);
  s.step(70);
  expect(s.feet.size).toBe(3);
  expect(s.h.x).toBe(400);
});
for (const cancel of ['stun', 'death', 'travel', 'basic', 'other cast'])
  it(`cleans buffered finisher on ${cancel} without spending mana`, () => {
    const s = scenario();
    s.cast(0);
    s.step(9);
    s.cast(1);
    s.step(1);
    s.cast(2);
    expect(s.h.comboFinisher).toBeDefined();
    const mana = s.h.mana;
    if (cancel === 'stun')
      applyStatus(
        s.h,
        { kind: 'stun', durationTicks: 60, magnitude: 1 },
        'test',
        'test',
        s.w.tick,
      );
    if (cancel === 'death') s.h.hp = 0;
    if (cancel === 'travel') cancelOwnedEffects(s.w, s.h.id);
    if (cancel === 'basic')
      submitInput(s.w, 'h', s.h.lastSequence + 1, { kind: 'basic' });
    if (cancel === 'other cast') s.cast(3);
    s.step(80);
    expect(s.h.comboFinisher).toBeUndefined();
    expect(s.feet.size).toBe(0);
    expect(s.h.mana).toBe(mana);
  });
it('keeps the queued E through repeated Q/W during a rapid QWE sequence', () => {
  const s = scenario();
  for (const slot of [0, 1, 2, 0, 1, 2, 0, 1]) s.cast(slot);
  s.step(60);
  expect(s.casts).toEqual([
    'toan_phong_thoai',
    'hoanh_tao_cuoc',
    'vo_anh_cuoc',
  ]);
  expect(s.h.mana).toBe(950);
  expect(s.h.x).toBe(610);
  expect(
    s.events.filter((e) => e.kind === 'hit' && e.abilityId === 'vo_anh_cuoc'),
  ).toMatchObject([{ targetId: s.e.id, stage: 'empowered' }]);
});
it('releases the buffered E promptly after a nearby Ca Diệp hit', () => {
  const s = scenario();
  s.e.x = 440;
  for (const slot of [0, 1, 2]) s.cast(slot);
  s.step(12);
  expect(s.w.tick).toBe(15);
  expect(s.events).toContainEqual(
    expect.objectContaining({
      kind: 'cast',
      abilityId: 'vo_anh_cuoc',
      stage: 'empowered_dash',
    }),
  );
});
it('repeated E while queued casts once and starts one dash and spends mana once', () => {
  const s = scenario();
  s.cast(0);
  s.step(9);
  s.cast(1);
  s.step(1);
  s.cast(2);
  s.cast(2);
  s.cast(2);
  s.step(75);
  expect(s.casts.filter((x) => x === 'vo_anh_cuoc')).toHaveLength(1);
  expect(s.h.mana).toBe(950);
  expect(s.feet.size).toBe(0);
  expect(s.h.x).toBe(610);
  expect(
    s.events.filter((e) => e.kind === 'hit' && e.abilityId === 'vo_anh_cuoc'),
  ).toMatchObject([{ targetId: s.e.id, stage: 'empowered' }]);
});
for (const [dx, dy] of [
  [-1, 0],
  [0, 1],
  [0, -1],
] as const)
  it(`actual chain preserves facing ${dx},${dy} during the dash`, () => {
    const s = scenario();
    s.h.fx = dx;
    s.h.fy = dy;
    s.e.x = s.h.x + dx * 220;
    s.e.y = s.h.y + dy * 220;
    s.cast(0);
    s.step(9);
    s.cast(1);
    s.step(9);
    s.cast(2);
    s.step(65);
    expect(s.feet.size).toBe(0);
    expect(s.h.x).toBeCloseTo(400 + dx * 210);
    expect(s.h.y).toBeCloseTo(400 + dy * 210);
    expect(
      s.events.some((e) => e.kind === 'hit' && e.stage === 'empowered'),
    ).toBe(true);
  });
for (const gap of [10, 17, 32])
  it(`actual Q W E chain with ${gap}-tick finisher gap moves and hits once`, () => {
    const s = scenario();
    s.cast(0);
    s.step(9);
    s.cast(1);
    s.step(gap - 1);
    s.cast(2);
    s.step(65);
    expect(s.h.x).toBe(610);
    expect(s.feet.size).toBe(0);
    expect(
      s.events.filter((e) => e.kind === 'hit' && e.abilityId === 'vo_anh_cuoc'),
    ).toMatchObject([{ targetId: s.e.id, stage: 'empowered' }]);
  });
it('does not dash through a wall placed after the two real primer hits', () => {
  const s = scenario();
  s.cast(0);
  s.step(9);
  s.cast(1);
  s.step(30);
  expect(s.w.combos?.[0]?.step).toBe(2);
  s.c.collision = [{ x: 470, y: 350, width: 12, height: 100 }];
  s.cast(2);
  s.step(40);
  expect(s.h.x).toBe(400);
  expect(s.feet.size).toBe(3);
  expect(
    s.events.some((e) => e.kind === 'hit' && e.abilityId === 'vo_anh_cuoc'),
  ).toBe(false);
});
