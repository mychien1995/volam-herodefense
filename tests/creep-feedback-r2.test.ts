import { hurt } from '../packages/game-core/src/combat.js';
import { expect, it } from 'vitest';
import {
  createWorld,
  addCreep,
  addHero,
  stepWorld,
  stepCreepHazards,
  stepCreepActor,
  segmentRect,
  submitInput,
  InvasionDirector,
  distance,
} from '@volam/game-core';
import { applyStatus, hasStatus } from '../packages/game-core/src/status.js';
import {
  m1Config,
  creepCombatDefinition,
  creepProfiles,
  createInvasionDefinition,
} from '@volam/game-data';
function setup(id: string) {
  const c = structuredClone(m1Config);
  c.creepSpawns = [];
  c.collision = [];
  c.creepCombat = structuredClone(creepCombatDefinition);
  c.creepRespawn = false;
  const w = createWorld(c, 42),
    h = addHero(w, 'h', 'H', c),
    e = addCreep(w, 'e', { x: 400, y: 400 }, c);
  e.archetypeId = id;
  e.stats = { ...c.creep, speed: 0, damage: 20 };
  Object.assign(h, { x: 510, y: 400, hp: 1000, maxHp: 1000 });
  stepCreepHazards(w, c);
  w.creepCombat!.actors.get('e')!.nextSpecial = 0;
  return { w, c, h, e };
}
it('north gate and every spawn offset have a clear ingress corridor past the old wall', () => {
  const d = createInvasionDefinition(180, 2000, { portalCount: 4 });
  for (const gate of [d.lanes.north!, d.lanes.south!])
    for (const dx of [-20, 0, 20])
      expect(
        m1Config.collision.some(
          (r) =>
            segmentRect(
              { x: gate.x + dx, y: gate.y },
              d.statue.position,
              r,
              m1Config.creep.radius,
            ) !== undefined,
        ),
      ).toBe(false);
  expect(d.lanes.north!.y).toBeGreaterThan(304);
});
it('north creep actually walks into the arena and damages the statue on the real collision map', () => {
  const c = structuredClone(m1Config);
  c.creepSpawns = [];
  c.creepCombat = creepCombatDefinition;
  const w = createWorld(c, 42),
    d = createInvasionDefinition(180, 2000, { portalCount: 4 });
  new InvasionDirector(d, w);
  c.collision.push(d.statue.collision);
  const e = addCreep(w, 'north', d.lanes.north!, c);
  e.stats = { ...c.creep, speed: 46 };
  e.invasion = {
    wave: 1,
    lane: 'north',
    targetId: '',
    chaseOrigin: { ...e.spawn },
    reacquireAt: 0,
    chaseRange: 240,
    aggroRestTicks: 90,
  };
  for (let i = 0; i < 600; i++) stepWorld(w, c);
  expect(distance(e, w.statue!)).toBeLessThan(100);
  expect(w.statue!.hp).toBeLessThan(2000);
});
it('web root and ape stun are applied by real authoritative hits', () => {
  for (const [id, kind] of [
    ['doc_chu', 'root'],
    ['son_vien', 'stun'],
  ] as const) {
    const { w, c, h, e } = setup(id);
    h.x = 440;
    w.random = () => 0;
    stepCreepActor(w, e, h, undefined, c);
    for (let i = 0; i < 32; i++) {
      w.tick++;
      stepCreepHazards(w, c);
    }
    expect(hasStatus(h, kind, w.tick)).toBe(true);
  }
});
it('applies requested range and radius multipliers exactly once', () => {
  expect(creepProfiles.wave_04!.basic.range).toBe(255);
  expect(creepProfiles.wave_01!.basic.range).toBe(60);
  expect(creepProfiles.hell_dung_nham_linh!.death!.radius).toBe(144);
  expect(creepProfiles.wave_15!.special!.radius).toBe(92);
});
it('ranged forest/desert/sea identities and their slow/control definitions are real data', () => {
  for (const id of ['truc_xa', 'moc_linh', 'sa_xa', 'hai_xa'])
    expect(creepProfiles[id]!.basic.mode).toBe('projectile');
  expect(
    creepProfiles.truc_xa!.basic.statuses!.some((s) => s.kind === 'slow'),
  ).toBe(true);
  expect(creepProfiles.doc_chu!.special!.statuses![0]!.kind).toBe('root');
  expect(creepProfiles.xac_uop!.basic.cooldown).toBe(36);
  expect(creepProfiles.son_vien!.special!.statuses![0]!.kind).toBe('stun');
  expect(creepProfiles.cu_nhan_sa_thach!.basic.statuses![0]!.kind).toBe('stun');
});
it('root blocks walking and dash without silencing normal attacks, then expires', () => {
  const { w, c, h, e } = setup('wave_01');
  e.cooldown = 1e9;
  applyStatus(
    h,
    { kind: 'root', magnitude: 1, durationTicks: 30 },
    'e',
    'web',
    w.tick,
  );
  submitInput(w, 'h', 1, { kind: 'move', x: 1, y: 0 });
  submitInput(w, 'h', 2, { kind: 'dash' });
  const x = h.x;
  stepWorld(w, c);
  expect(h.x).toBe(x);
  expect(h.dashCharges).toBe(2);
  submitInput(w, 'h', 3, { kind: 'basic' });
  stepWorld(w, c);
  expect(w.events.some((e) => e.kind === 'attack' && e.sourceId === 'h')).toBe(
    true,
  );
  for (let i = 0; i < 30; i++) stepWorld(w, c);
  expect(hasStatus(h, 'root', w.tick)).toBe(false);
});
it('passive reflection rolls on seeded direct damage and cannot recurse', () => {
  const { w, c, h, e } = setup('truc_lam_kiem_khach');
  w.random = () => 0;
  const hp = h.hp;
  hurt(w, e, 'h', 'normal', 20, c, { critChance: 0, critMultiplier: 1 });
  expect(h.hp).toBeLessThan(hp);
  const after = h.hp;
  hurt(w, e, 'h', 'reflected', 20, c, {
    critChance: 0,
    critMultiplier: 1,
    reactive: true,
  });
  expect(h.hp).toBe(after);
});
it('root permits a real non-movement skill cast', () => {
  const { w, c, h } = setup('wave_01');
  applyStatus(
    h,
    { kind: 'root', magnitude: 1, durationTicks: 90 },
    'e',
    'web',
    w.tick,
  );
  submitInput(w, h.id, 1, { kind: 'cast', slot: 0 });
  stepWorld(w, c);
  expect(w.events.some((e) => e.kind === 'cast' && e.sourceId === h.id)).toBe(
    true,
  );
});
