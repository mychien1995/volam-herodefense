import { expect, it } from 'vitest';
import { addCreep, addHero, createWorld, stepWorld } from '@volam/game-core';
import {
  creepCombatDefinition,
  creepProfiles,
  m1Config,
} from '@volam/game-data';
import { creepBodyVisible } from '../apps/game-client/src/creep-combat-visual.js';

it('melee hits, charges, defensive skills and stomps have no generic caster explosion', () => {
  for (const p of Object.values(creepProfiles)) {
    if (p.basic.mode === 'arc')
      expect(creepBodyVisible('creep_arc', 'basic', p.basic)).toBe(false);
    const s = p.special;
    if (s && ['arc', 'dash', 'guard', 'counter', 'buff'].includes(s.mode))
      expect(creepBodyVisible(`creep_${s.mode}`, 'special', s)).toBe(false);
  }
  for (const id of ['son_vien', 'wave_12', 'cu_nhan_sa_thach']) {
    const p = creepProfiles[id]!;
    const s = p.special!;
    expect(creepBodyVisible(`creep_${s.mode}`, 'special', s)).toBe(false);
  }
});

it('real missiles, target fields and deliberate death/self-destruction explosions remain visible', () => {
  for (const id of ['wave_02', 'wave_06', 'wave_09', 'thuy_quy', 'wave_14']) {
    const s = creepProfiles[id]!.special!;
    expect(creepBodyVisible('creep_area', 'special', s)).toBe(true);
  }
  const p = creepProfiles.truc_xa!;
  expect(creepBodyVisible('creep_projectile', 'basic', p.basic)).toBe(true);
  const death = creepProfiles.hell_dung_nham_linh!.death!;
  expect(creepBodyVisible('creep_area', 'death', death)).toBe(true);
});

it('Son Tac Dao only uses normal sword attacks, including when its signature would be ready', () => {
  expect(creepProfiles.wave_03!.special).toBeUndefined();
  const c = structuredClone(m1Config);
  c.creepSpawns = [];
  c.creepRespawn = false;
  c.collision = [];
  c.creepCombat = structuredClone(creepCombatDefinition);
  const w = createWorld(c, 42);
  const e = addCreep(w, 'swordsman', { x: 740, y: 740 }, c);
  e.archetypeId = 'wave_03';
  e.stats = { ...c.creep, speed: 0, damage: 20 };
  const h = addHero(w, 'target', 'Target', c);
  Object.assign(h, { x: 780, y: 740, hp: 1000, maxHp: 1000 });
  const abilities = new Set<string>();
  for (let i = 0; i < 300; i++) {
    stepWorld(w, c);
    for (const v of w.events)
      if (v.sourceId === e.id) abilities.add(v.abilityId);
  }
  expect(h.hp).toBeLessThan(1000);
  expect([...abilities]).toEqual(['creep_wave_03_basic']);
});
