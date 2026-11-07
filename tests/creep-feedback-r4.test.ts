import { expect, it } from 'vitest';
import {
  addCreep,
  addHero,
  createWorld,
  stepWorld,
  stepCreepHazards,
} from '@volam/game-core';
import { creepCombatDefinition, m1Config } from '@volam/game-data';
function setup() {
  const c = structuredClone(m1Config);
  c.creepSpawns = [];
  c.creepRespawn = false;
  c.creepCombat = structuredClone(creepCombatDefinition);
  const w = createWorld(c, 42),
    e = addCreep(w, 'zombie', { x: 740, y: 740 }, c),
    h = addHero(w, 'h', 'Target', c);
  e.archetypeId = 'wave_09';
  e.stats = { ...c.creep, speed: 0, damage: 20, detectionRange: 1000 };
  e.cooldown = 100000;
  e.invasion = {
    wave: 9,
    lane: 'west',
    targetId: h.id,
    chaseOrigin: { ...e.spawn },
    reacquireAt: 0,
    chaseRange: 1000,
    aggroRestTicks: 90,
  };
  Object.assign(h, { x: 980, y: 740, hp: 1000, maxHp: 1000 });
  stepCreepHazards(w, c);
  w.creepCombat!.actors.get(e.id)!.nextSpecial = 0;
  stepWorld(w, c);
  return { w, c, e, h };
}
it('Thi Doc creates a delayed target-foot field directly, with no caster-origin missile', () => {
  const { w, c, e, h } = setup();
  const field = [...w.creepCombat!.effects.values()][0]!;
  expect(field.kind).toBe('creep_area');
  expect(field.x).toBe(h.x);
  expect(field.y).toBe(h.y);
  expect(field.x - e.x).toBeGreaterThan(field.radius * 2);
  expect(h.hp).toBe(1000);
  for (let i = 0; i < 30; i++) stepWorld(w, c);
  expect(h.hp).toBeLessThan(1000);
  expect(
    [...w.creepCombat!.effects.values()].some(
      (v) => v.kind === 'creep_projectile',
    ),
  ).toBe(false);
});
it('the target field stays at captured feet even if its caster moves during windup', () => {
  const { w, c, e, h } = setup();
  e.x = 600;
  e.y = 800;
  for (let i = 0; i < 26; i++) stepWorld(w, c);
  const field = [...w.creepCombat!.effects.values()].find(
    (v) => v.kind === 'creep_area',
  )!;
  expect(field.x).toBe(980);
  expect(field.y).toBe(740);
  expect(h.hp).toBeLessThan(1000);
});
it('a player can leave the captured poison field before it activates', () => {
  const { w, c, h } = setup();
  Object.assign(h, { x: 1100, y: 900 });
  for (let i = 0; i < 30; i++) stepWorld(w, c);
  expect(h.hp).toBe(1000);
});
