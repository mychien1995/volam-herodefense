import { describe, expect, it } from 'vitest';
import {
  addHero,
  addCreep,
  createWorld,
  stepWorld,
  submitInput,
  hasStatus,
  removeHero,
  emptyInventory,
  transactMerchant,
  type Command,
} from '@volam/game-core';
import { m1Config, abilitySchema } from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';
import { cancelOwnedEffects } from '../packages/game-core/src/status.js';

function fixture(id = 'toa_sat_bac_do') {
  const config = structuredClone(m1Config);
  Object.assign(config, {
    width: 1600,
    height: 1200,
    spawn: { x: 500, y: 500 },
    collision: [],
    creepSpawns: [],
    critChance: 0,
    manaRegen: 0,
  });
  Object.assign(config.creep, {
    hp: 10000,
    defense: 0,
    speed: 0,
    damage: 0,
    detectionRange: 0,
  });
  const world = createWorld(config),
    hero = addHero(world, 'owner', 'Owner', config),
    enemy = addCreep(world, 'enemy', { x: 540, y: 500 }, config);
  hero.hp = hero.maxHp = 1500;
  hero.mana = hero.maxMana = 1000;
  hero.skillIds = [id, '', '', ''];
  world.random = () => 0.99;
  const cast = () => {
    submitInput(world, hero.id, hero.lastSequence + 1, {
      kind: 'cast',
      slot: 0,
    });
    stepWorld(world, config);
  };
  const step = (n: number) => {
    for (let i = 0; i < n; i++) stepWorld(world, config);
  };
  const damage = (raw: number, extra = {}) =>
    hurt(world, hero, enemy.id, 'enemy_attack', raw, config, {
      critChance: 0,
      critMultiplier: 1,
      ...extra,
    });
  return { config, world, hero, enemy, cast, step, damage };
}

describe('approved animation change authoritative mechanics', () => {
  it('plants an owner-only flower with zero enemy damage; immunity includes DOT and exact edge/reentry', () => {
    const f = fixture('lien_hoa_phien');
    f.cast();
    const field = f.world.areas![0]!;
    expect(field).toMatchObject({ x: 500, y: 500, rawDamage: 0 });
    expect(f.enemy.hp).toBe(10000);
    const hp = f.hero.hp;
    expect(f.damage(100)).toBe(false);
    expect(f.damage(100, { periodic: true })).toBe(false);
    expect(f.hero.hp).toBe(hp);
    f.hero.x = field.x + field.effect.radius;
    expect(f.damage(100)).toBe(false);
    f.hero.x += 0.01;
    expect(f.damage(100)).toBe(true);
    expect(f.hero.hp).toBe(hp - 100);
    f.hero.x = 500;
    expect(f.damage(100)).toBe(false);
    const ally = addHero(f.world, 'ally', 'Ally', f.config);
    ally.x = ally.y = 500;
    expect(hurt(f.world, ally, f.enemy.id, 'enemy_attack', 10, f.config)).toBe(
      true,
    );
    expect(field.x).toBe(500);
    expect(field.y).toBe(500);
  });
  it('heals once per tick only inside; full caps, refresh, expiry and cancellation never duplicate regen', () => {
    const f = fixture('lien_hoa_phien');
    f.hero.hp = 500;
    f.cast();
    f.step(30);
    expect(f.hero.hp).toBeCloseTo(620);
    f.hero.x = 800;
    f.step(30);
    expect(f.hero.hp).toBeCloseTo(620);
    f.hero.x = 500;
    f.step(30);
    expect(f.hero.hp).toBeCloseTo(740);
    f.hero.abilityCooldowns = {};
    f.hero.skillCooldowns = [0, 0, 0, 0];
    f.cast();
    expect(f.world.areas).toHaveLength(1);
    const h = f.hero.hp;
    f.step(30);
    expect(f.hero.hp).toBeCloseTo(h + 120);
    f.hero.hp = f.hero.maxHp - 1;
    f.step(1);
    expect(f.hero.hp).toBe(f.hero.maxHp);
    f.step(180);
    expect(f.world.areas).toHaveLength(0);
    expect(f.damage(10)).toBe(true);
    const g = fixture('lien_hoa_phien');
    g.cast();
    cancelOwnedEffects(g.world, g.hero.id);
    expect(g.damage(10)).toBe(true);
    expect(g.world.areas).toHaveLength(0);
  });
  it.each(['death', 'remove', 'travel'] as const)(
    'cancels planted protection on %s',
    (mode) => {
      const f = fixture('lien_hoa_phien');
      f.cast();
      if (mode === 'death') {
        f.hero.hp = 0;
        f.step(1);
      } else if (mode === 'remove') removeHero(f.world, f.hero.id);
      else cancelOwnedEffects(f.world, f.hero.id);
      expect(f.world.areas).toHaveLength(0);
    },
  );
  it.each([
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ])(
    'retreats opposite facing %s/%s as far as Phi Anh without turning',
    (fx, fy) => {
      const f = fixture('phong_anh_hoan_vi');
      f.hero.fx = fx;
      f.hero.fy = fy;
      f.cast();
      f.step(12);
      expect([f.hero.fx, f.hero.fy]).toEqual([fx, fy]);
      const g = fixture('phi_anh_tram');
      g.hero.fx = fx;
      g.hero.fy = fy;
      g.cast();
      g.step(12);
      expect(g.hero.x).toBeCloseTo(500 + fx * 150);
      expect(g.hero.y).toBeCloseTo(500 + fy * 150);
      expect(f.hero.x - 500).toBeCloseTo(500 - g.hero.x);
      expect(f.hero.y - 500).toBeCloseTo(500 - g.hero.y);
    },
  );
  it('reflects fractional actual loss exactly, without rounding it up to a full damage point', () => {
    const f = fixture();
    f.cast();
    f.damage(1);
    f.step(150);
    const release = f.world.events.filter((e) => e.stage === 'counter_release');
    expect(f.enemy.hp).toBeCloseTo(9999.7);
    expect(
      f.world.events
        .filter((e) => e.kind === 'hit' && e.abilityId === 'toa_sat_bac_do')
        .reduce((n, e) => n + e.damage, 0),
    ).toBeCloseTo(0.3);
    expect(release).toHaveLength(1);
  });
  it('retreat respects terrain and does not grant immunity when blocked', () => {
    const f = fixture('phong_anh_hoan_vi');
    f.config.collision = [{ x: 450, y: 440, width: 25, height: 120 }];
    f.cast();
    f.step(5);
    expect(f.hero.x).toBeGreaterThanOrEqual(475 + f.config.radius);
    expect(hasStatus(f.hero, 'dash_guard', f.world.tick)).toBe(false);
    const hp = f.hero.hp;
    f.damage(10);
    expect(f.hero.hp).toBeLessThan(hp);
  });
  it.each([999, 1000, 1001])(
    'uses a strict 20%% max-HP threshold after 70%% mitigation (raw %s)',
    (raw) => {
      const f = fixture();
      f.cast();
      const before = f.hero.hp;
      f.damage(raw);
      const received = before - f.hero.hp;
      expect(received).toBeCloseTo(raw * 0.3);
      const released = f.world.events.filter(
        (e) => e.stage === 'counter_release',
      );
      expect(released).toHaveLength(raw > 1000 ? 1 : 0);
      expect(hasStatus(f.hero, 'guard_counter', f.world.tick)).toBe(
        raw <= 1000,
      );
      if (raw > 1000) {
        expect(released[0]!.damage).toBe(received);
        submitInput(f.world, f.hero.id, f.hero.lastSequence + 1, {
          kind: 'move',
          x: 0,
          y: 1,
        });
        f.step(1);
        expect(f.hero.y).toBeGreaterThan(500);
      }
    },
  );
  it('accumulates actual shield/defense/DOT-adjusted HP loss and reflects it radially without crit/growth or a second 70% reduction', () => {
    const f = fixture();
    f.cast();
    f.damage(600);
    f.damage(300, { periodic: true });
    f.damage(100);
    expect(
      f.hero.statuses!.find((s) => s.kind === 'guard_counter')!.receivedDamage,
    ).toBeCloseTo(300);
    expect(f.enemy.hp).toBe(10000);
    const behind = addCreep(f.world, 'behind', { x: 470, y: 500 }, f.config);
    const far = addCreep(f.world, 'far', { x: 900, y: 500 }, f.config);
    f.damage(10);
    const release = f.world.events.find((e) => e.stage === 'counter_release')!;
    expect(release.damage).toBeCloseTo(303);
    expect(f.enemy.hp).toBeCloseTo(9697);
    expect(behind.hp).toBeCloseTo(9697);
    expect(far.hp).toBe(10000);
    f.damage(1);
    expect(
      f.world.events.filter((e) => e.stage === 'counter_release'),
    ).toHaveLength(1);
    const g = fixture();
    g.hero.statuses = [
      {
        kind: 'mana_shield',
        durationTicks: 300,
        until: 300,
        magnitude: 1,
        secondary: 1,
        sourceId: g.hero.id,
        abilityId: 'thai_cuc_than_cong',
      },
    ];
    g.cast();
    g.damage(100);
    expect(
      g.hero.statuses!.find((s) => s.kind === 'guard_counter')!.receivedDamage,
    ).toBe(0);
  });
  it('does not refresh or discard stored loss when a reduced cooldown allows a repeat input during guard', () => {
    const f = fixture();
    f.cast();
    f.damage(100);
    const guard = f.hero.statuses!.find((s) => s.kind === 'guard_counter')!,
      until = guard.until,
      mana = f.hero.mana;
    f.hero.skillCooldowns = [0, 0, 0, 0];
    f.hero.abilityCooldowns = {};
    f.cast();
    expect(f.hero.statuses!.find((s) => s.kind === 'guard_counter')).toBe(
      guard,
    );
    expect(guard.until).toBe(until);
    expect(guard.receivedDamage).toBeCloseTo(30);
    expect(f.hero.mana).toBe(mana);
  });
  it.each(['hp_small', 'mp_small'] as const)(
    'locks movement and combat through guard expiry while allowing %s',
    (potionId) => {
      const f = fixture();
      f.hero.skillIds![1] = 'nhan_kiem_hop_nhat';
      f.hero.inventory = emptyInventory();
      f.hero.inventory.potions[potionId] = 1;
      f.hero.hp -= 100;
      f.hero.mana -= 100;
      f.cast();
      const origin = { x: f.hero.x, y: f.hero.y, fx: f.hero.fx, fy: f.hero.fy };
      const input = (command: Command) =>
        submitInput(f.world, f.hero.id, f.hero.lastSequence + 1, command);
      const attemptCombat = () => {
        input({ kind: 'move', x: 0, y: 1 });
        input({ kind: 'basic' });
        input({ kind: 'dash' });
        input({ kind: 'cast', slot: 1 });
        f.step(1);
      };
      const potion = f.config.economy!.potions[potionId];
      const resource = potion.resource === 'hp' ? 'hp' : 'mana';
      const before = f.hero[resource];
      expect(
        transactMerchant(
          f.hero,
          f.config,
          {
            inArena: false,
            matchTick: f.world.tick,
            worldTick: f.world.tick,
          },
          0,
          { action: 'use-potion', potionId },
        ),
      ).toBeUndefined();
      expect(f.hero[resource]).toBe(before + potion.amount);
      expect(f.hero.inventory.potions[potionId]).toBe(0);

      const mana = f.hero.mana;
      attemptCombat();
      expect(f.hero).toMatchObject(origin);
      expect(f.hero.mana).toBe(mana);
      expect(f.world.events).toEqual([]);
      const until = f.hero.statuses!.find(
        (s) => s.kind === 'guard_counter',
      )!.until;
      f.step(until - f.world.tick - 2);
      attemptCombat();
      expect(f.hero).toMatchObject(origin);
      expect(f.world.events).toEqual([]);

      input({ kind: 'cast', slot: 1 });
      f.step(1);
      expect(f.hero.y).toBeGreaterThan(origin.y);
      expect(f.world.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ stage: 'counter_release' }),
          expect.objectContaining({
            kind: 'cast',
            abilityId: 'nhan_kiem_hop_nhat',
          }),
        ]),
      );
    },
  );
  it('waits exactly five seconds and releases once even with no incoming damage', () => {
    const f = fixture();
    f.cast();
    f.damage(100);
    f.step(149);
    expect(hasStatus(f.hero, 'guard_counter', f.world.tick)).toBe(true);
    f.step(1);
    expect(
      f.world.events.filter((e) => e.stage === 'counter_release'),
    ).toHaveLength(1);
    expect(f.enemy.hp).toBeCloseTo(9970);
    f.step(1);
    expect(
      f.world.events.filter((e) => e.stage === 'counter_release'),
    ).toHaveLength(0);
    const g = fixture();
    g.cast();
    g.step(150);
    expect(
      g.world.events.find((e) => e.stage === 'counter_release')!.damage,
    ).toBe(0);
  });
  it.each(['death', 'cancel', 'remove'] as const)(
    'never reflects on %s cleanup or later expiry',
    (mode) => {
      const f = fixture();
      f.cast();
      f.damage(100);
      if (mode === 'death') {
        f.hero.hp = 1;
        f.damage(100);
      } else if (mode === 'cancel') cancelOwnedEffects(f.world, f.hero.id);
      else removeHero(f.world, f.hero.id);
      f.step(151);
      expect(f.enemy.hp).toBe(10000);
      expect(f.world.events.some((e) => e.stage === 'counter_release')).toBe(
        false,
      );
    },
  );
  it('does not recursively release on reactive damage; terrain blocks radial victims', () => {
    const f = fixture();
    f.cast();
    f.damage(1100, { reactive: true });
    expect(hasStatus(f.hero, 'guard_counter', f.world.tick)).toBe(true);
    f.config.collision = [{ x: 520, y: 450, width: 2, height: 100 }];
    f.step(150);
    expect(f.enemy.hp).toBe(10000);
  });
  it('skyfall falls back to facing, keeps the mark on walkable ground and cancels on death', () => {
    const f = fixture('van_kiem_quy_tong');
    f.world.creeps.clear();
    const origin = { x: f.hero.x, y: f.hero.y };
    f.config.collision = [
      { x: origin.x + 100, y: origin.y - 50, width: 8, height: 100 },
    ];
    f.cast();
    expect(f.world.areas).toHaveLength(1);
    expect(f.world.areas![0]!.x).toBeGreaterThan(origin.x);
    expect(f.world.areas![0]!.x).toBeLessThan(origin.x + 100);
    expect(hasStatus(f.hero, 'channel', f.world.tick)).toBe(true);
    f.step(36);
    expect(hasStatus(f.hero, 'channel', f.world.tick)).toBe(false);
    f.hero.hp = 0;
    f.step(84);
    expect(f.world.areas).toEqual([]);
    expect(f.world.projectiles.size).toBe(0);
    expect(f.world.shots).toHaveLength(0);
  });
  it('validates zero-damage protection/channel definitions and rejects missing intent or invalid guard tuning', () => {
    const flower = structuredClone(m1Config.skillCatalogue!['lien_hoa_phien']!);
    expect(abilitySchema.safeParse(flower).success).toBe(true);
    if (flower.effect.mode === 'area') flower.effect.protectOwner = false;
    expect(abilitySchema.safeParse(flower).success).toBe(false);
    const stance = structuredClone(m1Config.skillCatalogue!['toa_sat_bac_do']!);
    if (stance.effect.mode === 'guard_counter') stance.effect.reduction = 1;
    expect(abilitySchema.safeParse(stance).success).toBe(false);
  });
});
