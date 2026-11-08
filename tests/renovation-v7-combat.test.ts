import { it, expect } from 'vitest';
import { createWorld, addHero, submitInput, stepWorld } from '@volam/game-core';
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
it('maps the legacy timing to its eight authored coil cels and rise/dive frames', () => {
  const effect = m1Config.skillCatalogue!.hang_long_hoa_vu!.effect;
  if (effect.mode !== 'projectile' || !effect.dragonDive)
    throw Error('dragon definition');
  const d = { ...effect.dragonDive, forwardTicks: 24, orbitTicks: 36 },
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
it('uses the enlarged Hàng Long radii and longer coil at every rank', () => {
  const ranks = m1Config.progression!.skills.hang_long_hoa_vu!.ranks;
  for (const { effect } of ranks) {
    expect(effect.mode).toBe('projectile');
    if (effect.mode !== 'projectile') throw Error('dragon definition');
    expect(effect.dragonDive).toMatchObject({
      orbitTicks: 57,
      coilTurns: 7,
      loopRadius: 89.7,
      impactRadius: 128.8,
    });
  }
});
it.each([
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
])(
  'accepted cast follows the caster through coil and rise (%s,%s)',
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
      d = e.dragonDive!;
    expect(h.mana).toBe(955);
    h.x += 12;
    stepWorld(w, c);
    expect(p.stage).toBe('dragon_coil');
    expect(p.x).toBeCloseTo(h.x);
    expect(p.y).toBeCloseTo(h.y);
    for (let age = 1; age < d.orbitTicks; age++) stepWorld(w, c);
    expect(p.stage).toBe('dragon_rise');
    const { target } = p.dragonFlight!;
    expect(target.x).toBeCloseTo(h.x);
    expect(target.y).toBeCloseTo(h.y);
    h.x += 12;
    stepWorld(w, c);
    expect(p.dragonFlight!.target).toEqual({ x: h.x, y: h.y });
  },
);
