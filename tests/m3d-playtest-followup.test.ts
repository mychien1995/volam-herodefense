import { describe, it, expect } from 'vitest';
import {
  createWorld,
  addHero,
  addCreep,
  stepWorld,
  submitInput,
  spawnChu,
  characterStats,
  chuView,
  drinkChuWine,
  DungeonMatch,
  HongLietEncounter,
} from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  hongLietDungeon,
  hongLietDefinition,
  chuBaThongTuning,
  bossCadence,
} from '@volam/game-data';
import { separateDungeonCreeps } from '../packages/game-core/src/creep-spacing.js';
import { hurt } from '../packages/game-core/src/combat.js';
function setup(skill = 'vo_anh_cuoc') {
  const c = structuredClone(m1Config);
  Object.assign(c, { collision: [], creepSpawns: [], creepRespawn: false });
  const w = createWorld(c, 42),
    h = addHero(w, 'h', 'h', c);
  Object.assign(h, {
    schoolId: 'thieu_lam',
    x: 400,
    y: 400,
    fx: 1,
    fy: 0,
    skillIds: [skill, '', '', ''],
    mana: 1000,
    maxMana: 1000,
  });
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) stepWorld(w, c);
  };
  return { c, w, h, step };
}
describe('M3D next playtest feedback', () => {
  it('wine bypasses 70% Chu defense for12s only for drinker; refresh does not stack and death clears', () => {
    const s = setup();
    spawnChu(s.w, s.c, structuredClone(chuBaThongTuning));
    const boss = s.w.creeps.get('chu_ba_thong')!;
    boss.hp = 10000;
    const hit = () => {
      const before = boss.hp;
      hurt(s.w, boss, 'h', 'probe', 100, s.c, {
        critChance: 0,
        critMultiplier: 1,
      });
      return before - boss.hp;
    };
    expect(hit()).toBe(36);
    s.w.chu!.wine = [{ id: 'b', x: s.h.x, y: s.h.y, until: 100 }];
    expect(drinkChuWine(s.w, 'h')).toBe(true);
    expect(hit()).toBe(65);
    const other = addHero(s.w, 'other', 'other', s.c);
    const before = boss.hp;
    hurt(s.w, boss, other.id, 'probe', 100, s.c, {
      critChance: 0,
      critMultiplier: 1,
    });
    expect(before - boss.hp).toBe(36);
    s.w.tick = 100;
    s.w.chu!.wine = [{ id: 'b2', x: s.h.x, y: s.h.y, until: 200 }];
    drinkChuWine(s.w, 'h');
    expect(s.w.chu!.wineDrinkers!['h']).toBe(460);
    expect(hit()).toBe(65);
    s.w.tick = 460;
    expect(hit()).toBe(36);
    s.w.chu!.wineDrinkers!['h'] = 800;
    const creep = addCreep(s.w, 'other_target', { x: 500, y: 400 }, s.c);
    creep.hp = 1000;
    creep.stats = { ...s.c.creep, defense: 180 };
    hurt(s.w, creep, 'h', 'probe', 100, s.c, {
      critChance: 0,
      critMultiplier: 1,
    });
    expect(creep.hp).toBe(964);
    hurt(s.w, s.h, boss.id, 'fatal', 1e6, s.c, {
      critChance: 0,
      critMultiplier: 1,
    });
    expect(s.w.chu!.wineDrinkers!['h']).toBeUndefined();
  });
  it('validates editable cadence and gives LMS real needle cooldown/rest', () => {
    expect(bossCadence.ly_mac_sau.restSeconds).toBe(1.2);
    expect(
      bossCadence.ly_mac_sau.attacks['bang_phach_ngan_cham']!.cooldownSeconds,
    ).toBe(4);
  });
  it('uses72% owner speed, not another absolute20 percentage-point subtraction', () => {
    const m = new DungeonMatch(m1Config, creepDungeon);
    const h = m.add('a', 'a');
    const speed = characterStats(h, m.base, 0).total.movementSpeed;
    m.enter('a', 'shared', 'forest');
    expect(m.zoneOf('a')!.config.creep.speed).toBeCloseTo(speed * 0.72);
  });
  it('separates identical pursuing footprints deterministically without consuming RNG', () => {
    const run = () => {
      const s = setup();
      s.c.dungeonAggro = true;
      s.c.creep.speed = 120;
      for (let i = 0; i < 6; i++)
        addCreep(s.w, 'c' + i, { x: 500, y: 400 }, s.c);
      s.w.random = () => {
        throw Error('spacing must not consume combat RNG');
      };
      for (let i = 0; i < 120; i++) separateDungeonCreeps(s.w, s.c);
      return [...s.w.creeps.values()].map((e) => [e.x, e.y]);
    };
    const p = run();
    expect(p).toEqual(run());
    for (let i = 0; i < p.length; i++)
      for (let j = i + 1; j < p.length; j++)
        expect(
          Math.hypot(p[i]![0]! - p[j]![0]!, p[i]![1]! - p[j]![1]!),
        ).toBeGreaterThan(18);
  });
  it('combined chasing and separation never exceed configured movement per tick', () => {
    const s = setup();
    s.c.dungeonAggro = true;
    s.c.creep.speed = 120;
    for (let i = 0; i < 6; i++) addCreep(s.w, 'c' + i, { x: 650, y: 400 }, s.c);
    for (let tick = 0; tick < 60; tick++) {
      const before = new Map(
        [...s.w.creeps].map(([id, e]) => [id, { x: e.x, y: e.y }]),
      );
      s.step();
      for (const [id, e] of s.w.creeps) {
        const p = before.get(id)!;
        expect(Math.hypot(e.x - p.x, e.y - p.y)).toBeLessThanOrEqual(
          120 / s.c.tickRate + 1e-7,
        );
      }
    }
  });
  it('auto exits solo on second death, retains exhaustion until actual reset', () => {
    const m = new DungeonMatch(m1Config, creepDungeon, 42, undefined, [
      structuredClone(hongLietDungeon),
    ]);
    const h = m.add('a', 'a');
    m.enter('a', 'shared', 'hong_liet');
    const z = m.zoneOf('a')!;
    h.hp = 0;
    m.step();
    for (let i = 0; i < 150; i++) m.step();
    expect(h.hp).toBe(h.maxHp);
    h.hp = 0;
    m.step();
    expect(m.zoneOf('a')!.id).toBe('arena');
    expect(h.hp).toBe(h.maxHp);
    expect(m.respawns.has('a')).toBe(false);
    expect(m.party.life(z, 'a').eliminated).toBe(true);
    expect(m.enter('a', 'shared', 'hong_liet')).toContain('reset');
  });
  it('keeps artillery firing while HHL alternates A1/A2 and moves during rests', () => {
    const s = setup();
    Object.assign(s.c, { width: 1600, height: 1400 });
    Object.assign(s.h, { x: 1000, y: 850, hp: 1e6, maxHp: 1e6 });
    const e = new HongLietEncounter(structuredClone(hongLietDefinition));
    e.initialize(s.w, s.c);
    e.begin(s.w, s.c, 'hoa_phao_thien_la', s.h);
    const attacks = new Set<string>();
    let simultaneous = false;
    for (let i = 0; i < 220; i++) {
      s.w.tick++;
      s.w.events = [];
      e.step(s.w, s.c);
      for (const ev of s.w.events)
        if (ev.kind === 'cast' && ev.abilityId.startsWith('hong_liet_a')) {
          attacks.add(ev.abilityId);
          if (
            [...e.effects.values()].some(
              (v) => v.abilityId === 'hoa_phao_thien_la',
            )
          )
            simultaneous = true;
        }
    }
    expect([...attacks].sort()).toEqual(['hong_liet_a1', 'hong_liet_a2']);
    expect(simultaneous).toBe(true);
  });
  it('Vô Ảnh without same-target chain emits only one centered foot', () => {
    const s = setup();
    submitInput(s.w, 'h', 1, { kind: 'cast', slot: 0 });
    s.step();
    expect(s.w.projectiles.size + s.w.shots.length).toBe(1);
    expect([...s.w.projectiles.values()][0]!.y).toBe(400);
    s.step(40);
    expect(s.w.shots).toHaveLength(0);
  });
  it('prepared same-target Phát Động keeps six staggered feet; unrelated/expired chains cannot unlock it', () => {
    for (const valid of [true, false]) {
      const s = setup();
      const e = addCreep(s.w, 'target', { x: 500, y: 400 }, s.c);
      e.controlled = true;
      e.hp = 10000;
      s.w.combos = [
        {
          sourceId: 'h',
          targetId: valid ? 'target' : 'other',
          id: 'phat_dong_b',
          step: 2,
          until: 100,
        },
      ];
      submitInput(s.w, 'h', 1, { kind: 'cast', slot: 0 });
      s.step();
      expect(s.w.projectiles.size + s.w.shots.length).toBe(valid ? 3 : 1);
    }
  });
  it('has real damageable wine disciples; one dropped bottle, proximity/atomic drink and cleanup', () => {
    const s = setup();
    addHero(s.w, 'peer', 'peer', s.c);
    spawnChu(s.w, s.c, structuredClone(chuBaThongTuning));
    const k = s.w.chu!;
    k.phaseIndex = k.definition.phases.findIndex((p) => p.id === 'drink') - 1;
    k.until = 0;
    s.step();
    const ds = [...s.w.creeps.values()].filter(
      (e) => e.archetypeId === 'chu_wine_disciple',
    );
    expect(ds).toHaveLength(2);
    const d = ds[0]!;
    hurt(s.w, d, 'h', 'test', 100, s.c, { critChance: 0, critMultiplier: 1 });
    s.step();
    expect(k.wine).toHaveLength(1);
    s.step();
    expect(k.wine).toHaveLength(1);
    s.h.x = 100;
    s.h.y = 100;
    expect(drinkChuWine(s.w, 'h')).toBe(false);
    Object.assign(s.h, { x: k.wine![0]!.x, y: k.wine![0]!.y });
    expect(drinkChuWine(s.w, 'h')).toBe(true);
    expect(drinkChuWine(s.w, 'peer')).toBe(false);
    expect(chuView(s.w, s.c)!.wineDrinkers).toHaveLength(1);
    s.w.creeps.get('chu_ba_thong')!.hp = 0;
    s.step();
    expect(k.wine).toHaveLength(0);
    expect(chuView(s.w, s.c)!.wineDrinkers).toHaveLength(0);
  });
  it('reflect pull doubles and rejects Shift without consuming a charge', () => {
    const s = setup();
    spawnChu(s.w, s.c, structuredClone(chuBaThongTuning));
    s.w.chu!.phase = 'reflect';
    s.w.chu!.until = 100;
    const charge = s.h.dashCharges;
    submitInput(s.w, 'h', 1, { kind: 'dash' });
    s.step();
    expect(s.h.dashCharges).toBe(charge);
    expect(s.w.actions ?? []).toHaveLength(0);
    expect(chuBaThongTuning.pullSpeed).toBe(120);
  });
});
