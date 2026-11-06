import { expect, it } from 'vitest';
import {
  addCreep,
  addHero,
  createWorld,
  stepCreepActor,
  stepCreepHazards,
  stepWorld,
} from '@volam/game-core';
import {
  creepCombatDefinition,
  creepProfiles,
  m1Config,
} from '@volam/game-data';
const setup = (id: string) => {
  const c = structuredClone(m1Config);
  c.collision = [];
  c.creepSpawns = [];
  c.creepRespawn = false;
  c.creepCombat = structuredClone(creepCombatDefinition);
  const w = createWorld(c, 42),
    e = addCreep(w, 'e', { x: 400, y: 400 }, c),
    h = addHero(w, 'h', 'Hero', c);
  e.archetypeId = id;
  e.stats = { ...c.creep, speed: 0, damage: 20 };
  e.hp = 500;
  e.maxHp = 1000;
  e.cooldown = 100000;
  Object.assign(h, { x: 500, y: 400, hp: 1000, maxHp: 1000 });
  stepCreepHazards(w, c);
  w.creepCombat!.actors.get('e')!.nextSpecial = 0;
  const advance = (n: number) => {
    for (let i = 0; i < n; i++) {
      w.tick++;
      stepCreepHazards(w, c);
    }
  };
  const cast = () => stepCreepActor(w, e, h, undefined, c);
  return { w, c, e, h, advance, cast };
};
it('bandit basic has no sigil; heavy burst is captured at the target feet and can be dodged', () => {
  expect(creepProfiles.wave_02!.basic.presentation!.warning).toBe('none');
  const s = setup('wave_02');
  s.cast();
  const cue = [...s.w.creepCombat!.effects.values()][0]!;
  expect(cue.kind).toBe('creep_area');
  expect(cue.x).toBe(s.h.x);
  expect(cue.y).toBe(s.h.y);
  expect(cue.spec.presentation!.style).toBe('purple_burst');
  s.h.y += 200;
  s.advance(30);
  expect(s.h.hp).toBe(1000);
  const hit = setup('wave_02');
  hit.cast();
  hit.advance(25);
  expect(hit.h.hp).toBeLessThan(1000);
});
for (const [fx, fy] of [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
])
  it(`Hoanh Tram covers exactly the captured front 180 degrees at facing ${fx}/${fy}`, () => {
    const s = setup('wave_03');
    Object.assign(s.h, { x: 400 + fx! * 100, y: 400 + fy! * 100 });
    const side = addHero(s.w, 'side', 'Side', s.c),
      back = addHero(s.w, 'back', 'Back', s.c);
    Object.assign(side, {
      x: 400 - fy! * 170,
      y: 400 + fx! * 170,
      hp: 1000,
      maxHp: 1000,
    });
    Object.assign(back, {
      x: 400 - fx! * 30,
      y: 400 - fy! * 30,
      hp: 1000,
      maxHp: 1000,
    });
    s.cast();
    const cue = [...s.w.creepCombat!.effects.values()][0]!;
    expect(cue.kind).toBe('creep_arc');
    expect(cue.maxRadius).toBeCloseTo(Math.PI / 2);
    expect(cue.spec.damage).toBe(2.4);
    s.advance(25);
    expect(s.h.hp).toBeLessThan(1000);
    expect(side.hp).toBeLessThan(1000);
    expect(back.hp).toBe(1000);
  });
it('reproduces the old narrow strip missing a side target, while the new sector hits it', () => {
  const old = setup('wave_03');
  delete old.c.creepCombat!.profiles.wave_03!.special!.geometry;
  const next = setup('wave_03');
  for (const s of [old, next]) {
    s.cast();
    s.h.x = 400;
    s.h.y = 570;
    s.advance(25);
  }
  expect(old.h.hp).toBe(1000);
  expect(next.h.hp).toBeLessThan(1000);
});
it('blood palm drains actual player HP and heals only the actual loss, with a ring at the victim', () => {
  const s = setup('wave_06');
  s.cast();
  const cue = [...s.w.creepCombat!.effects.values()][0]!;
  expect(cue.x).toBe(s.h.x);
  expect(cue.y).toBe(s.h.y);
  expect(cue.spec.presentation!.style).toBe('drain');
  s.advance(25);
  const loss = 1000 - s.h.hp;
  expect(loss).toBeGreaterThan(0);
  expect(s.e.hp - 500).toBeCloseTo(loss * 0.4);
  const miss = setup('wave_06');
  miss.cast();
  miss.h.y += 180;
  miss.advance(25);
  expect(miss.e.hp).toBe(500);
});
for (const id of ['wave_07', 'mongol_infantry', 'bc_dog'])
  it(`${id} only uses normal attacks`, () => {
    const s = setup(id);
    s.e.cooldown = 0;
    s.h.x = 430;
    expect(creepProfiles[id]!.special).toBeUndefined();
    for (let i = 0; i < 240; i++) stepWorld(s.w, s.c);
    expect(
      s.w.events.some((e) => e.kind === 'cast' && e.sourceId === 'e'),
    ).toBe(false);
    expect(s.h.hp).toBeLessThan(1000);
    expect(
      [...s.w.creepCombat!.effects.values()].every((e) => !e.special),
    ).toBe(true);
  });
it('undead archer arrows visually launch from the torso without moving authoritative ground collision', () => {
  const s = setup('wave_08');
  s.cast();
  const e = [...s.w.creepCombat!.effects.values()][0]!;
  expect(e.y).toBe(s.e.y);
  for (const a of [
    creepProfiles.wave_08!.basic,
    creepProfiles.wave_08!.special!,
  ])
    expect(a.presentation!.projectileOffsetY).toBe(-18);
});
function groundLobFixture() {
  const s = setup('wave_09');
  const field = s.c.creepCombat!.profiles.wave_09!.special!;
  s.c.creepCombat!.profiles.wave_09!.special = {
    ...field,
    mode: 'projectile',
    groundTarget: true,
    damage: 0,
    radius: 5,
    speed: 220,
    field: { ...field, range: 0, windup: 0 },
  };
  return s;
}
it('generic ground lobs land at captured points rather than early on crossing players', () => {
  const s = groundLobFixture();
  s.h.x = 550;
  const along = addHero(s.w, 'along', 'Along', s.c);
  Object.assign(along, { x: 450, y: 400, hp: 1000, maxHp: 1000 });
  s.cast();
  s.h.x = 800;
  s.h.y = 650;
  s.advance(30);
  expect(
    [...s.w.creepCombat!.effects.values()].some((e) => e.kind === 'creep_area'),
  ).toBe(false);
  s.advance(20);
  const field = [...s.w.creepCombat!.effects.values()].find(
    (e) => e.kind === 'creep_area',
  )!;
  expect(field.x).toBeCloseTo(550);
  expect(field.y).toBeCloseTo(400);
  expect(field.spec.presentation!.warning).toBe('none');
  expect(creepProfiles.wave_09!.death).toBeUndefined();
  expect(s.h.hp).toBe(1000);
});
it('generic ground lob collides with a wall and lands before it', () => {
  const s = groundLobFixture();
  s.h.x = 550;
  s.cast();
  s.c.collision = [{ x: 450, y: 350, width: 12, height: 100 }];
  s.advance(40);
  const field = [...s.w.creepCombat!.effects.values()].find(
    (e) => e.kind === 'creep_area',
  )!;
  expect(field.x).toBeLessThan(450);
  expect(s.h.hp).toBe(1000);
});
it('water demon puddle is anchored to the captured player feet', () => {
  const s = setup('thuy_quy');
  s.h.y = 460;
  s.cast();
  const cue = [...s.w.creepCombat!.effects.values()][0]!;
  expect(cue.x).toBe(s.h.x);
  expect(cue.y).toBe(s.h.y);
  s.h.y += 200;
  s.advance(25);
  expect(cue.y).toBe(460);
  expect(s.h.hp).toBe(1000);
});
it('all requested dash/strike profiles suppress the generic crimson warning without deleting their abilities', () => {
  for (const id of [
    'wave_05',
    'wave_13',
    'wave_16',
    'wave_17',
    'bo_cap_cat',
    'sa_xa',
    'xac_uop',
    'cua_khong_lo',
    'hai_tac',
    'hell_dia_nguc_khuyen',
    'hell_hac_dien_nguu_ma',
  ]) {
    const a = creepProfiles[id]!.special!;
    expect(a).toBeDefined();
    expect(a.presentation!.warning).toBe('none');
    if (a.mode === 'arc') expect(a.presentation!.style).toBe('contact');
  }
});
