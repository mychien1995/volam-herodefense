import { describe, expect, it } from 'vitest';
import {
  addHero,
  createWorld,
  stepWorld,
  submitInput,
  initializeProgression,
  characterStats,
  changeBuild,
  hasStatus,
  type CombatEvent,
} from '@volam/game-core';
import { abilitySchema, m1Config } from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';
import { abilityCooldown } from '../packages/game-core/src/progression.js';
import { cancelOwnedEffects } from '../packages/game-core/src/status.js';

function fixture(id = 'hoa_van_chuong') {
  const config = structuredClone(m1Config);
  Object.assign(config, {
    width: 1200,
    height: 800,
    collision: [],
    spawn: { x: 300, y: 300 },
    creepSpawns: [
      { x: 380, y: 300 },
      { x: 390, y: 320 },
    ],
    manaRegen: 0,
    critChance: 0,
  });
  Object.assign(config.creep, {
    hp: 10000,
    speed: 0,
    defense: 0,
    detectionRange: 1,
  });
  const world = createWorld(config),
    hero = addHero(world, 'a', 'A', config),
    events: CombatEvent[] = [];
  world.random = () => 0.99;
  hero.skillIds = [id, '', '', ''];
  hero.mana = hero.maxMana = 200;
  const enemies = [...world.creeps.values()];
  const input = (kind: 'basic' | 'cast') =>
    submitInput(
      world,
      hero.id,
      hero.lastSequence + 1,
      kind === 'cast' ? { kind, slot: 0 } : { kind },
    );
  const steps = (n = 1) => {
    for (let i = 0; i < n; i++) {
      stepWorld(world, config);
      events.push(...world.events);
    }
  };
  const cast = () => {
    input('cast');
    steps();
  };
  const hits = (ability = id, target = enemies[0]!.id) =>
    events.filter(
      (e) =>
        e.kind === 'hit' && e.abilityId === ability && e.targetId === target,
    );
  return { config, world, hero, enemies, events, input, steps, cast, hits };
}

describe('M3C3 feedback authoritative trial', () => {
  it('counts only accepted A, sixth palm splashes, rejected/replayed/cleave inputs never advance', () => {
    const f = fixture();
    f.hero.basicId = 'cai_bang_chuong';
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 8; j++) f.input('basic');
      f.steps();
      expect(f.events.filter((e) => e.kind === 'attack')).toHaveLength(i + 1);
      f.steps(18);
    }
    expect(
      f.events.filter((e) => e.kind === 'attack').map((e) => e.stage),
    ).toEqual(['palm', 'palm', 'palm', 'palm', 'palm', 'dragon']);
    expect(f.hits('cai_bang_chuong').map((e) => e.damage)).toEqual([
      22, 22, 22, 22, 22, 28,
    ]);
    expect(f.hits('cai_bang_chuong', f.enemies[1]!.id)).toHaveLength(1);
    expect(
      submitInput(f.world, 'a', f.hero.lastSequence, { kind: 'basic' }),
    ).toBe(false);
    cancelOwnedEffects(f.world, 'a');
    expect(f.hero.basicChains).toEqual({});
  });
  it('staff stages have distinct geometry and a stronger fourth hit; cleave does not advance stages', () => {
    const f = fixture();
    f.hero.basicId = 'cai_bang_bong';
    f.enemies[0]!.x = 365;
    for (let i = 0; i < 4; i++) {
      f.input('basic');
      f.steps(i === 3 ? 1 : 8);
    }
    expect(
      f.events.filter((e) => e.kind === 'attack').map((e) => e.stage),
    ).toEqual(['thrust', 'sweep', 'lift', 'smash']);
    expect(f.hits('cai_bang_bong').map((e) => e.damage)).toEqual([
      28, 28, 29, 34,
    ]);
    f.steps(7);
    f.input('basic');
    f.steps(15);
    expect(f.events.filter((e) => e.kind === 'attack')).toHaveLength(4);
    f.input('basic');
    f.steps(1);
    expect(f.events.filter((e) => e.kind === 'attack').at(-1)?.stage).toBe(
      'thrust',
    );
  });
  it('Hỏa Vân releases three simultaneous fixed divergent directions', () => {
    const f = fixture();
    f.cast();
    const shots = [...f.world.projectiles.values()];
    expect(shots).toHaveLength(3);
    const directions = shots.map((p) => [p.vx, p.vy]);
    expect(new Set(shots.map((p) => p.vy)).size).toBe(3);
    f.enemies[0]!.y = 500;
    f.steps(2);
    expect(shots.map((p) => [p.vx, p.vy])).toEqual(directions);
  });
  it('boomerang hits once per leg, captures owner at turnaround and never tracks afterward', () => {
    const f = fixture();
    f.hero.basicId = 'thien_son_phien';
    f.input('basic');
    f.steps(16);
    expect(f.hits('thien_son_phien')).toHaveLength(1);
    f.steps(1);
    const shot = [...f.world.projectiles.values()][0]!;
    expect(shot.leg).toBe('return');
    expect(shot.vx).toBe(-400);
    f.hero.y = 500;
    f.steps(20);
    expect(shot.vy).toBe(0);
    expect(f.hits('thien_son_phien')).toHaveLength(2);
    expect(f.world.projectiles.size).toBe(0);
  });
  it('walls block both new ranged palms and fan without through-wall splash/refund', () => {
    for (const id of [
      'luong_nghi_thu',
      'duong_khi_kich',
      'truy_hon_dao',
      'thien_son_phien',
    ]) {
      const f = fixture(id);
      f.config.collision = [{ x: 330, y: 200, width: 2, height: 200 }];
      if (id === 'thien_son_phien') {
        f.hero.basicId = id;
        f.input('basic');
        f.steps();
      } else f.cast();
      f.steps(50);
      expect(f.hits(id)).toHaveLength(0);
      expect(f.world.projectiles.size).toBe(0);
      expect(f.events.filter((e) => e.stage === 'refund')).toHaveLength(0);
    }
  });
  it('Lục Dương spin reduces damage only while active', () => {
    const f = fixture('luc_duong_chuong');
    f.cast();
    const hp = f.hero.hp;
    hurt(f.world, f.hero, f.enemies[0]!.id, 'strike', 100, f.config);
    expect(f.hero.hp).toBeCloseTo(hp - 35);
    f.steps(55);
    const after = f.hero.hp;
    hurt(f.world, f.hero, f.enemies[0]!.id, 'strike', 10, f.config);
    expect(f.hero.hp).toBeCloseTo(after - 10);
  });
  it.each(['phi_anh_tram', 'phong_anh_hoan_vi'])(
    '%s blocks direct hits on moving dash ticks, permits DOT and no post-dash immunity',
    (id) => {
      const f = fixture(id);
      f.cast();
      const hp = f.hero.hp;
      hurt(f.world, f.hero, f.enemies[0]!.id, 'strike', 10, f.config);
      expect(f.hero.hp).toBe(hp);
      hurt(f.world, f.hero, f.enemies[0]!.id, 'dot', 10, f.config, {
        critChance: 0,
        critMultiplier: 1,
        periodic: true,
      });
      expect(f.hero.hp).toBe(hp - 10);
      f.steps(12);
      const before = f.hero.hp;
      hurt(f.world, f.hero, f.enemies[0]!.id, 'strike', 10, f.config);
      expect(f.hero.hp).toBe(before - 10);
      const g = fixture(id);
      g.config.collision = [{ x: id === 'phong_anh_hoan_vi' ? 288 : 310, y: 200, width: 2, height: 200 }];
      g.cast();
      expect(hasStatus(g.hero, 'dash_guard', g.world.tick)).toBe(false);
    },
  );
  it('wind ultimate emits four eight-way bursts with independent once-per-projectile hits', () => {
    const f = fixture('bach_phien_phong_bao');
    f.cast();
    expect(f.world.projectiles.size).toBe(8);
    expect(
      new Set(
        [...f.world.projectiles.values()].map((p) =>
          Math.atan2(p.vy, p.vx).toFixed(4),
        ),
      ).size,
    ).toBe(8);
    f.steps(110);
    expect(
      f.events.filter((e) => e.kind === 'pulse' && e.stage === 'sweep'),
    ).toHaveLength(12);
    expect(f.hits().length).toBeGreaterThanOrEqual(12);
  });
  it('Chiết Mai gives bounded active CDR and preserves cooldown debt; Đao A has no cooldown', () => {
    const f = fixture('chiet_mai_thu');
    f.hero.schoolId = 'thien_son';
    initializeProgression(f.hero, f.config);
    const change = (c: Parameters<typeof changeBuild>[4]) =>
      changeBuild(f.world, f.hero, f.config, f.hero.progression!.revision, c);
    change({ action: 'loadout', ids: ['chiet_mai_thu', '', '', ''] });
    change({ action: 'upgrade', skillId: 'chiet_mai_thu' });
    const before = characterStats(f.hero, f.config).total;
    f.cast();
    const after = characterStats(f.hero, f.config, f.world.tick).total;
    expect(after.cooldownReduction).toBeCloseTo(0.2);
    expect(after.attackSpeed).toBeGreaterThan(before.attackSpeed);
    const a = f.config.basics['thien_son_dao']!;
    f.config.progression!.schools['thien_son']!.base.attackSpeed = 1000;
    expect(abilityCooldown(f.hero, a, f.config, f.world.tick, true)).toBe(0);
    const debt = f.hero.skillCooldowns[0];
    change({ action: 'reset' });
    expect(f.hero.skillCooldowns[0]).toBe(debt);
    expect(
      characterStats(f.hero, f.config, f.world.tick).total.cooldownReduction,
    ).toBe(0);
  });
  it('projectile palms refund once only on confirmed hit, including kill; two air blades apply slow', () => {
    const f = fixture('duong_khi_kich');
    f.enemies[0]!.hp = 1;
    f.cast();
    f.steps(20);
    expect(f.hero.mana).toBe(197);
    expect(f.events.filter((e) => e.stage === 'refund')).toHaveLength(1);
    const g = fixture('truy_hon_dao');
    g.cast();
    g.steps(25);
    expect(g.hits().map((e) => e.damage)).toEqual([30, 42]);
    expect(hasStatus(g.enemies[0]!, 'slow', g.world.tick)).toBe(true);
  });
  it('shield toggle has no activation cost, spends finite mana, permits lethal overflow and cannot refill by spam', () => {
    const f = fixture('thai_cuc_than_cong');
    f.cast();
    expect(f.hero.mana).toBe(200);
    const hp = f.hero.hp;
    hurt(f.world, f.hero, f.enemies[0]!.id, 'strike', 100, f.config);
    expect(f.hero.hp).toBe(hp);
    expect(f.hero.mana).toBe(75);
    for (let i = 0; i < 4; i++) {
      f.cast();
      expect(f.hero.mana).toBe(75);
    }
    f.hero.mana = 25;
    hurt(f.world, f.hero, f.enemies[0]!.id, 'strike', 100, f.config);
    expect(f.hero.mana).toBe(0);
    expect(f.hero.hp).toBe(hp - 80);
    f.cast();
    expect(hasStatus(f.hero, 'mana_shield', f.world.tick)).toBe(false);
    f.cast();
    f.steps(300);
    expect(hasStatus(f.hero, 'mana_shield', f.world.tick)).toBe(true);
    hurt(f.world, f.hero, f.enemies[0]!.id, 'strike', 1000, f.config);
    expect(f.hero.hp).toBe(0);
  });
  it('formation confines movement including resistant bosses, permits attacks inside and releases on expiry/death', () => {
    const f = fixture('thai_cuc_tran');
    f.config.creep.speed = 240;
    f.config.creep.detectionRange = 1000;
    f.cast();
    const e = f.enemies[0]!;
    f.hero.x = 800;
    f.steps(60);
    expect(e.x).toBeLessThanOrEqual(425.001);
    expect(e.x).toBeGreaterThan(380);
    e.forcedMovementImmune = true;
    f.steps(20);
    expect(e.x).toBeLessThanOrEqual(425.001);
    const g = fixture('thai_cuc_tran');
    g.config.creep.speed = 240;
    g.config.creep.detectionRange = 1000;
    g.cast();
    g.hero.x = 400;
    const hp = g.hero.hp;
    g.steps(15);
    expect(g.hero.hp).toBeLessThan(hp);
    g.hero.x = 800;
    g.steps(180);
    expect(g.enemies[0]!.x).toBeGreaterThan(425);
    cancelOwnedEffects(f.world, 'a');
    expect(f.world.areas).toEqual([]);
  });
  it('all ranks validate and Dịch Cân Kinh retains a single HP regen source', () => {
    for (const a of Object.values(m1Config.basics))
      expect(abilitySchema.safeParse(a).success).toBe(true);
    for (const s of Object.values(m1Config.progression!.skills))
      for (const a of s.ranks)
        expect(abilitySchema.safeParse(a).success).toBe(true);
    const f = fixture();
    f.hero.schoolId = 'thieu_lam';
    initializeProgression(f.hero, f.config);
    expect(characterStats(f.hero, f.config).total.hpRegen).toBeCloseTo(1.2);
    f.hero.hp = 100;
    f.steps(30);
    expect(f.hero.hp).toBeCloseTo(101.2);
  });
  it('Hoành Tảo reaches behind the owner while preserving terrain blocking', () => {
    const f = fixture('hoanh_tao_bong');
    f.enemies[0]!.x = 210;
    f.cast();
    expect(f.hits()).toHaveLength(1);
    const g = fixture('hoanh_tao_bong');
    g.enemies[0]!.x = 210;
    g.config.collision = [{ x: 250, y: 250, width: 5, height: 100 }];
    g.cast();
    expect(g.hits()).toHaveLength(0);
  });
  it('confinement clips knockback and overlapping boundaries without moving immune enemies', () => {
    const f = fixture('thai_cuc_tran');
    f.cast();
    f.hero.skillIds![0] = 'vo_dang_quyen';
    f.hero.basicId = 'vo_dang_quyen';
    f.hero.x = 360;
    f.enemies[0]!.x = 423;
    f.input('basic');
    f.steps();
    expect(f.enemies[0]!.x).toBeLessThanOrEqual(425.001);
    const area = f.world.areas![0]!;
    f.world.areas!.push({
      ...area,
      id: 'overlap',
      x: 330,
      trappedIds: [f.enemies[0]!.id],
    });
    f.config.creep.speed = 600;
    f.config.creep.detectionRange = 1000;
    f.hero.x = 800;
    f.steps(10);
    expect(f.enemies[0]!.x).toBeLessThanOrEqual(425.001);
  });
  it('new projectiles, chains, shields and formations cancel on owner removal without resource resets', () => {
    for (const id of [
      'thai_cuc_than_cong',
      'thai_cuc_tran',
      'bach_phien_phong_bao',
    ]) {
      const f = fixture(id);
      f.cast();
      const mana = f.hero.mana;
      cancelOwnedEffects(f.world, 'a');
      expect(f.world.areas ?? []).toEqual([]);
      expect(f.world.projectiles.size).toBe(0);
      expect(f.world.shots).toEqual([]);
      expect(f.world.actions ?? []).toEqual([]);
      expect(f.hero.statuses).toEqual([]);
      expect(f.hero.mana).toBe(mana);
    }
    const f = fixture();
    f.hero.basicId = 'thien_son_phien';
    f.input('basic');
    f.steps();
    expect(f.world.projectiles.size).toBe(1);
    cancelOwnedEffects(f.world, 'a');
    expect(f.world.projectiles.size).toBe(0);
  });
  it('two fan legs split Attack Power growth rather than duplicating it', () => {
    const f = fixture();
    f.hero.schoolId = 'thien_son';
    initializeProgression(f.hero, f.config);
    f.config.progression!.schools['thien_son']!.base.attackPower += 20;
    f.config.progression!.schools['thien_son']!.growth.attackPower = 20;
    f.hero.level = 2;
    f.hero.basicId = 'thien_son_phien';
    f.input('basic');
    f.steps(40);
    expect(f.hits('thien_son_phien').map((e) => e.damage)).toEqual([22, 22]);
  });
});
