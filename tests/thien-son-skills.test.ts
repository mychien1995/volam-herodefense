import { describe, it, expect } from 'vitest';
import {
  addHero,
  createWorld,
  stepWorld,
  submitInput,
  hasStatus,
  characterStats,
  initializeProgression,
  gainExperience,
  changeBuild,
  pointAccounting,
  DungeonMatch,
  type CombatEvent,
  type BuildChange,
} from '@volam/game-core';
import { m1Config, creepDungeon, thienSonSkills } from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';
import { applyStatus } from '../packages/game-core/src/status.js';

function fixture(id = 'lien_hoa_phien') {
  const config = structuredClone(m1Config);
  Object.assign(config, {
    width: 1000,
    height: 800,
    collision: [],
    spawn: { x: 300, y: 300 },
    critChance: 0,
    manaRegen: 0,
    creepSpawns: [
      { x: 340, y: 300 },
      { x: 345, y: 330 },
      { x: 260, y: 300 },
    ],
  });
  Object.assign(config.creep, {
    hp: 10000,
    defense: 0,
    speed: 0,
    detectionRange: 1,
  });
  const world = createWorld(config),
    hero = addHero(world, 'a', 'A', config),
    events: CombatEvent[] = [];
  hero.schoolId = 'thien_son';
  hero.basicId = 'thien_son_phien';
  hero.skillIds = [id, '', '', ''];
  const enemies = [...world.creeps.values()];
  const steps = (n: number) => {
    for (let i = 0; i < n; i++) {
      stepWorld(world, config);
      events.push(...world.events);
    }
  };
  const input = (command: Parameters<typeof submitInput>[3]) =>
    submitInput(world, hero.id, hero.lastSequence + 1, command);
  const cast = () => {
    input({ kind: 'cast', slot: 0 });
    steps(1);
  };
  const hits = (target = enemies[0]!.id) =>
    events.filter((e) => e.kind === 'hit' && e.targetId === target);
  return { config, world, hero, enemies, events, steps, input, cast, hits };
}
describe('M3C1 authoritative wind mechanics', () => {
  it.each(['bach_phien_phong_bao', 'bach_liet_thien_kich'])(
    '%s uses ultimate rank gates/cap with no weapon requirement',
    (id) => {
      const f = fixture(id);
      initializeProgression(f.hero, f.config);
      const change = (c: BuildChange) =>
        changeBuild(f.world, f.hero, f.config, f.hero.progression!.revision, c);
      gainExperience(f.hero, 300, f.config);
      expect(
        change({ action: 'loadout', ids: [id, 'truy_hon_dao', '', ''] }),
      ).toBeUndefined();
      expect(change({ action: 'upgrade', skillId: id })).toBeUndefined();
      expect(change({ action: 'upgrade', skillId: id })).toBeTruthy();
      gainExperience(f.hero, 240, f.config);
      expect(change({ action: 'upgrade', skillId: id })).toBeUndefined();
      expect(change({ action: 'upgrade', skillId: id })).toBeTruthy();
      gainExperience(f.hero, 240, f.config);
      expect(change({ action: 'upgrade', skillId: id })).toBeUndefined();
      expect(change({ action: 'upgrade', skillId: id })).toBeTruthy();
      expect(
        change({ action: 'basic', basicId: 'thien_son_phien' }),
      ).toBeUndefined();
      expect(
        characterStats(f.hero, f.config).sources.equipment.attackPower,
      ).toBe(0);
    },
  );
  it.each(thienSonSkills.map((a) => a.id))(
    '%s enforces mana, cooldown, life, silence and replay protection',
    (id) => {
      const f = fixture(id),
        a = m1Config.skillCatalogue![id]!;
      f.cast();
      expect(f.hero.mana).toBe(100 - a.manaCost);
      expect(
        submitInput(f.world, 'a', f.hero.lastSequence, {
          kind: 'cast',
          slot: 0,
        }),
      ).toBe(false);
      for (let i = 0; i < 8; i++) f.input({ kind: 'cast', slot: 0 });
      f.steps(1);
      expect(f.events.filter((e) => e.kind === 'cast')).toHaveLength(1);
      const g = fixture(id);
      g.hero.mana = 0;
      g.cast();
      expect(g.events).toEqual([]);
      g.hero.mana = 100;
      g.hero.hp = 0;
      g.cast();
      expect(g.events).toEqual([]);
      const h = fixture(id);
      applyStatus(
        h.hero,
        { kind: 'silence', durationTicks: 30, magnitude: 1 },
        'enemy',
        'silence',
        0,
      );
      h.cast();
      expect(h.hero.mana).toBe(100);
    },
  );
  it('Phiến is a two-leg ranged fan; Đao retains narrow melee and reduced cleave', () => {
    const f = fixture();
    f.input({ kind: 'basic' });
    f.steps(40);
    expect(f.hits().map((e) => e.damage)).toEqual([12, 12]);
    expect(f.hits(f.enemies[1]!.id)).toHaveLength(0);
    expect(f.enemies[2]!.hp).toBe(10000);
    expect(f.world.projectiles.size).toBe(0);
    const g = fixture();
    g.hero.basicId = 'thien_son_dao';
    g.input({ kind: 'basic' });
    g.steps(1);
    expect(g.hits()[0]!.damage).toBe(30);
    expect(g.hits(g.enemies[1]!.id)[0]!.damage).toBe(9);
    expect(g.config.basics['thien_son_dao']!.cooldownTicks).toBe(9);
    g.enemies[0]!.x = 500;
    g.enemies[1]!.y = 370;
    g.steps(15);
    g.input({ kind: 'basic' });
    g.steps(1);
    expect(g.hits()).toHaveLength(1);
    expect(g.world.projectiles.size).toBe(0);
  });
  it('Liên Hoa plants a non-damaging owner protection field and expires on server ticks', () => {
    const f = fixture();
    f.cast();
    expect(f.world.areas).toHaveLength(1);
    expect(f.world.areas![0]).toMatchObject({ x: 300, y: 300, rawDamage: 0 });
    expect(f.hits()).toHaveLength(0);
    const hp = f.hero.hp;
    hurt(f.world, f.hero, f.enemies[0]!.id, 'strike', 10, f.config);
    expect(f.hero.hp).toBe(hp);
    f.hero.x = 386;
    hurt(f.world, f.hero, f.enemies[0]!.id, 'strike', 10, f.config);
    expect(f.hero.hp).toBe(hp - 10);
    expect(f.world.areas![0]!.x).toBe(300);
    f.steps(180);
    expect(f.world.areas).toHaveLength(0);
    expect(f.enemies.every((e) => e.hp === 10000)).toBe(true);
  });
  it('Lục Dương pulses around the current moving owner, with exactly six hits per stationary overlap', () => {
    const f = fixture('luc_duong_chuong');
    f.cast();
    f.steps(50);
    expect(f.hits()).toHaveLength(6);
    expect(f.hits(f.enemies[2]!.id)).toHaveLength(6);
    const g = fixture('luc_duong_chuong');
    g.enemies[0]!.x = 490;
    g.cast();
    expect(g.hits()).toHaveLength(0);
    for (let i = 0; i < 40; i++) {
      g.input({ kind: 'move', x: 1, y: 0 });
      g.steps(1);
    }
    expect(g.hero.x).toBeGreaterThan(450);
    expect(g.hits().length).toBeGreaterThan(0);
    expect(g.hits().length).toBeLessThan(6);
  });
  it('Lưu Phong damages crossed targets once, stops at thin terrain and stays in zone bounds', () => {
    const f = fixture('luu_phong_bo');
    f.cast();
    f.steps(10);
    expect(f.hero.x).toBeCloseTo(440);
    expect(f.hits().map((e) => e.damage)).toEqual([30]);
    const g = fixture('luu_phong_bo');
    g.config.collision = [{ x: 330, y: 250, width: 1, height: 100 }];
    g.cast();
    g.steps(12);
    expect(g.hero.x).toBeLessThanOrEqual(320);
    const h = fixture('luu_phong_bo');
    h.hero.x = 980;
    h.cast();
    h.steps(12);
    expect(h.hero.x).toBeLessThanOrEqual(990);
    const v = fixture('luu_phong_bo');
    v.hero.fx = 0;
    v.hero.fy = -1;
    v.cast();
    v.steps(10);
    expect(v.hero.y).toBeCloseTo(160);
    expect(v.hero.x).toBe(300);
  });
  it('Chiết Mai increases movement and A cadence only for its owner, does not stack, and expires exactly', () => {
    const f = fixture('chiet_mai_thu'),
      partner = addHero(f.world, 'b', 'B', f.config);
    const before = characterStats(f.hero, f.config).total;
    f.cast();
    expect(
      characterStats(f.hero, f.config, f.world.tick).total.movementSpeed,
    ).toBeCloseTo(before.movementSpeed * 1.3);
    expect(
      characterStats(f.hero, f.config, f.world.tick).total.attackSpeed,
    ).toBeCloseTo(before.attackSpeed * 1.35);
    expect(
      characterStats(partner, f.config, f.world.tick).total.movementSpeed,
    ).toBe(before.movementSpeed);
    f.cast();
    expect(
      f.hero.statuses?.filter((s) => s.kind === 'speed_buff'),
    ).toHaveLength(1);
    f.steps(179);
    expect(hasStatus(f.hero, 'speed_buff', f.world.tick)).toBe(false);
    expect(characterStats(f.hero, f.config, f.world.tick).total).toEqual(
      before,
    );
  });
  it('Bách Phiến has twelve radial pulses plus eight-way projectiles', () => {
    const f = fixture('bach_phien_phong_bao');
    f.enemies[0]!.x = 410;
    f.cast();
    f.steps(120);
    expect(f.hits().filter((e) => e.damage === 22)).toHaveLength(12);
    expect(
      f.hits(f.enemies[2]!.id).filter((e) => e.damage === 22),
    ).toHaveLength(12);
    expect(f.world.actions).toHaveLength(0);
    expect(f.world.projectiles.size).toBe(0);
  });
  it('Phi Ảnh slashes each crossed enemy exactly once without stun or forbidden-terrain hits', () => {
    const f = fixture('phi_anh_tram');
    f.cast();
    f.steps(12);
    expect(f.hero.x).toBeCloseTo(450);
    expect(f.hits().map((e) => e.damage)).toEqual([58]);
    expect(hasStatus(f.enemies[0]!, 'stun', f.world.tick)).toBe(false);
    const g = fixture('phi_anh_tram');
    g.config.collision = [{ x: 325, y: 200, width: 2, height: 200 }];
    g.cast();
    g.steps(12);
    expect(g.hits()).toHaveLength(0);
  });
  it('Truy Hồn lands exactly two cuts, evaluating the slow bonus on each hit', () => {
    const f = fixture('truy_hon_dao');
    applyStatus(
      f.enemies[0]!,
      { kind: 'slow', durationTicks: 4, magnitude: 0.4 },
      'b',
      'slow',
      0,
    );
    f.cast();
    f.steps(12);
    expect(f.hits().map((e) => e.damage)).toEqual([42, 42]);
    expect(f.enemies[2]!.hp).toBe(10000);
  });
  it('Phong Ảnh counters once after its dash without extending dash damage immunity', () => {
    const f = fixture('phong_anh_hoan_vi');
    f.cast();
    f.steps(4);
    const hp = f.hero.hp,
      enemy = f.enemies[0]!;
    enemy.x = f.hero.x + 25;
    hurt(f.world, f.hero, enemy.id, 'enemy_basic', 10, f.config);
    expect(f.hero.hp).toBe(hp - 10);
    expect(enemy.hp).toBe(9940);
    expect(hasStatus(f.hero, 'counter', f.world.tick)).toBe(false);
    hurt(f.world, f.hero, enemy.id, 'enemy_basic', 10, f.config);
    expect(f.hero.hp).toBe(hp - 20);
    const g = fixture('phong_anh_hoan_vi');
    g.cast();
    g.steps(30);
    const hp2 = g.hero.hp;
    hurt(g.world, g.hero, g.enemies[0]!.id, 'enemy_basic', 10, g.config);
    expect(g.hero.hp).toBe(hp2 - 10);
    expect(g.enemies[0]!.hp).toBe(10000);
  });
  it('Liệt Phong penetrates 50% defense for its strike without changing target armor', () => {
    const f = fixture('liet_phong_dao');
    f.config.creep.defense = 100;
    f.cast();
    f.steps(18);
    expect(f.hits()[0]!.damage).toBe(50);
    expect(f.enemies[0]!.statuses ?? []).toHaveLength(0);
    f.steps(15);
    f.hero.basicId = 'thien_son_dao';
    f.input({ kind: 'basic' });
    f.steps(1);
    expect(f.hits().at(-1)!.damage).toBe(15);
  });
  it('Bách Liệt is ten fast forward hits plus a finisher, with no rear damage or network-driven extra hits', () => {
    const f = fixture('bach_liet_thien_kich');
    f.cast();
    for (let i = 0; i < 45; i++) {
      f.input({ kind: 'cast', slot: 0 });
      f.steps(1);
    }
    expect(f.hits().map((e) => e.damage)).toEqual([...Array(10).fill(13), 45]);
    expect(f.enemies[2]!.hp).toBe(10000);
    expect(f.events.filter((e) => e.kind === 'cast')).toHaveLength(1);
  });
  it.each([
    'luc_duong_chuong',
    'chiet_mai_thu',
    'phong_anh_hoan_vi',
    'phi_anh_tram',
  ])(
    '%s cancels on death and zone transition, retaining cooldown debt',
    (id) => {
      const f = fixture(id);
      f.cast();
      f.hero.hp = 0;
      f.steps(80);
      expect(f.world.actions).toHaveLength(0);
      expect(f.hero.statuses).toEqual([]);
      const match = new DungeonMatch(m1Config, creepDungeon),
        h = match.add('a', 'A');
      h.schoolId = 'thien_son';
      h.skillIds = [id, '', '', ''];
      match.input('a', 1, { kind: 'cast', slot: 0 });
      match.step();
      const remaining = h.skillCooldowns[0]! - match.arena.world.tick;
      expect(match.enter('a', 'private')).toBeUndefined();
      expect(match.arena.world.actions ?? []).toHaveLength(0);
      expect(h.statuses).toEqual([]);
      expect(h.skillCooldowns[0]).toBe(remaining);
    },
  );
  it('uses M3B ownership, rank gates, mixed styles, optional single ultimate and automatic nonduplicating surplus', () => {
    const f = fixture();
    initializeProgression(f.hero, f.config);
    expect(f.hero.hp).toBe(135);
    const change = (c: BuildChange) =>
      changeBuild(f.world, f.hero, f.config, f.hero.progression!.revision, c);
    expect(
      change({ action: 'loadout', ids: ['hoa_van_chuong', '', '', ''] }),
    ).toBeTruthy();
    expect(change({ action: 'basic', basicId: 'cai_bang_bong' })).toBeTruthy();
    expect(
      change({ action: 'loadout', ids: ['bach_phien_phong_bao', '', '', ''] }),
    ).toBeTruthy();
    gainExperience(f.hero, 1740, f.config);
    expect(
      change({
        action: 'loadout',
        ids: ['bach_phien_phong_bao', 'bach_liet_thien_kich', '', ''],
      }),
    ).toBeTruthy();
    const ids = [
      'lien_hoa_phien',
      'truy_hon_dao',
      'chiet_mai_thu',
      'bach_liet_thien_kich',
    ];
    expect(change({ action: 'loadout', ids })).toBeUndefined();
    for (const id of ids)
      for (let i = 0; i < f.config.progression!.skills[id]!.ranks.length; i++)
        expect(change({ action: 'upgrade', skillId: id })).toBeUndefined();
    expect(pointAccounting(f.hero, f.config)).toEqual({
      earned: 30,
      allocated: 15,
      available: 0,
      surplus: 15,
    });
    const stats = characterStats(f.hero, f.config);
    expect(stats.sources.innate.movementSpeed).toBeCloseTo(31.9);
    expect(stats.sources.innate.attackSpeed).toBeCloseTo(0.348);
    expect(stats.sources.equipment.attackPower).toBe(0);
    expect(
      change({ action: 'basic', basicId: 'thien_son_dao' }),
    ).toBeUndefined();
    const snapshot = characterStats(f.hero, f.config).total;
    expect(change({ action: 'reset' })).toBeUndefined();
    for (const id of ids)
      for (let i = 0; i < f.config.progression!.skills[id]!.ranks.length; i++)
        change({ action: 'upgrade', skillId: id });
    expect(characterStats(f.hero, f.config).total).toEqual(snapshot);
  });
});
