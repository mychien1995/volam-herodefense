import { it, expect } from 'vitest';
import {
  createWorld,
  addHero,
  submitInput,
  stepWorld,
  dragonDivePose,
} from '@volam/game-core';
import { m1Config } from '@volam/game-data';
import {
  dragonCoilFrame,
  staffContact,
} from '../apps/game-client/src/renovation-followup-model.js';
it('keeps diagonal staff FX on the same authored facing as the native body', () => {
  expect(staffContact(1, 1).direction).toBe('down');
  expect(staffContact(-1, -1).direction).toBe('up');
  expect(staffContact(1, 0).x).toBeGreaterThan(0);
  expect(staffContact(-1, 0).x).toBeLessThan(0);
});
it('consumes the eight authored body-coil cels once before rise/dive instead of looping a rotated picture', () => {
  const effect = m1Config.skillCatalogue!.hang_long_hoa_vu!.effect;
  if (effect.mode !== 'projectile' || !effect.dragonDive)
    throw Error('dragon definition');
  const d = effect.dragonDive,
    indices = [];
  for (let age = 0; age < 87; age++) {
    const p = dragonCoilFrame(age, d);
    if (age < 24) expect(p).toBeUndefined();
    else indices.push(p!.index);
  }
  expect([...new Set(indices)]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  expect(dragonCoilFrame(60, d)?.phase).toBe('dragon_rise');
  expect(dragonCoilFrame(75, d)?.phase).toBe('dragon_dive');
});
it('reduces every Hàng Long rank maximum flight distance by exactly thirty percent', () => {
  const ranks = m1Config.progression!.skills.hang_long_hoa_vu!.ranks;
  expect(
    ranks.map((a) => (a.effect.mode === 'projectile' ? a.effect.range : 0)),
  ).toEqual(ranks.map((_, i) => (440 + 30 * i) * 0.7));
});
it.each([
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
])(
  'accepted cast ends its forward flight at the shortened locked point (%s,%s), then coils in place',
  (fx, fy) => {
    const c = structuredClone(m1Config);
    Object.assign(c, {
      collision: [],
      creepSpawns: [],
      creepRespawn: false,
      manaRegen: 0,
    });
    const w = createWorld(c, 42),
      h = addHero(w, 'h', 'h', c);
    Object.assign(h, {
      schoolId: 'cai_bang',
      x: 600,
      y: 600,
      fx,
      fy,
      mana: 1000,
      maxMana: 1000,
      skillIds: ['hang_long_hoa_vu', '', '', ''],
    });
    submitInput(w, h.id, 1, { kind: 'cast', slot: 0 });
    stepWorld(w, c);
    const p = [...w.projectiles.values()][0]!,
      e = p.effect,
      d = e.dragonDive!,
      target = p.dragonFlight!.target;
    expect(target.x).toBeCloseTo(h.x + fx * 308);
    expect(target.y).toBeCloseTo(h.y + fy * 308);
    expect(h.mana).toBe(955);
    for (let age = d.forwardTicks; age < d.forwardTicks + d.orbitTicks; age++) {
      const pose = dragonDivePose(
        p.dragonFlight!.origin,
        target,
        fx,
        fy,
        age,
        d,
      );
      expect(pose.stage).toBe('dragon_coil');
      expect(pose.x).toBeCloseTo(target.x);
      expect(pose.y).toBeCloseTo(target.y);
    }
    const end = dragonDivePose(
      p.dragonFlight!.origin,
      target,
      fx,
      fy,
      d.forwardTicks,
      d,
    );
    expect(end.x).toBeCloseTo(target.x);
    expect(end.y).toBeCloseTo(target.y);
  },
);
