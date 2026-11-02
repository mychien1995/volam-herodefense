import { describe, expect, it } from 'vitest';
import {
  addHero,
  characterStats,
  createWorld,
  initializeProgression,
  refreshCharacter,
  transactMerchant,
  DungeonMatch,
  type MerchantAction,
} from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  economySchema,
  economyTrial,
} from '@volam/game-data';
import { merchantActionSchema, PROTOCOL_VERSION } from '@volam/game-protocol';

const context = { inArena: true, matchTick: 0, worldTick: 0 };
function fixture() {
  const world = createWorld(m1Config, 42),
    hero = addHero(world, 'buyer', 'Buyer', m1Config);
  initializeProgression(hero, m1Config);
  hero.gold = 10000;
  const buy = (action: MerchantAction, ctx = context) =>
    transactMerchant(
      hero,
      m1Config,
      ctx,
      hero.inventory?.revision ?? 0,
      action,
    );
  return { hero, world, buy };
}
describe('trial merchant economy', () => {
  it('buys/upgrades four typed slots to5 and recalculates stats without healing or stacking', () => {
    const { hero, buy } = fixture(),
      baseline = characterStats(hero, m1Config).total;
    hero.hp = 50;
    for (const slot of ['weapon', 'armor', 'hat', 'boots'] as const) {
      const before = hero.gold;
      for (let i = 0; i < 5; i++)
        expect(buy({ action: 'buy-basic', slot })).toBeUndefined();
      expect(hero.gold).toBe(
        before - economyTrial.basics[slot].prices.reduce((a, b) => a + b),
      );
      expect(hero.inventory!.levels[slot]).toBe(5);
      expect(buy({ action: 'buy-basic', slot })).toMatch(/tối đa/);
    }
    const stats = characterStats(hero, m1Config);
    expect(stats.total.attackPower - baseline.attackPower).toBe(20);
    expect(stats.total.maxHp - baseline.maxHp).toBe(150);
    expect(stats.total.defense - baseline.defense).toBe(15);
    expect(stats.total.hpRegen - baseline.hpRegen).toBe(2.5);
    expect(stats.total.manaRegen - baseline.manaRegen).toBe(5);
    expect(stats.total.movementSpeed - baseline.movementSpeed).toBe(15);
    expect(stats.total.critChance - baseline.critChance).toBeCloseTo(0.025);
    for (let i = 0; i < 30; i++) refreshCharacter(hero, m1Config);
    expect(characterStats(hero, m1Config)).toEqual(stats);
    expect(hero.hp).toBe(50);
  });
  it('rejects insufficient funds, stale revisions, dead or outside-arena purchases atomically', () => {
    const { hero, buy } = fixture();
    hero.gold = 29;
    expect(buy({ action: 'buy-basic', slot: 'weapon' })).toMatch(/vàng/);
    expect(hero.inventory).toBeUndefined();
    hero.gold = 100;
    expect(
      buy(
        { action: 'buy-basic', slot: 'weapon' },
        { ...context, inArena: false },
      ),
    ).toMatch(/trung tâm/);
    expect(buy({ action: 'buy-basic', slot: 'weapon' })).toBeUndefined();
    const saved = structuredClone(hero.inventory),
      gold = hero.gold;
    expect(
      transactMerchant(hero, m1Config, context, 0, {
        action: 'buy-basic',
        slot: 'weapon',
      }),
    ).toMatch(/thay đổi/);
    hero.hp = 0;
    expect(
      buy({ action: 'buy-potion', potionId: 'hp_small', quantity: 1 }),
    ).toMatch(/hồi sinh/);
    expect(hero.inventory).toEqual(saved);
    expect(hero.gold).toBe(gold);
  });
  it('enforces20 total across sizes/resources and rejects invalid quantity/price payloads', () => {
    const { hero, buy } = fixture();
    expect(
      buy({ action: 'buy-potion', potionId: 'hp_small', quantity: 12 }),
    ).toBeUndefined();
    expect(
      buy({ action: 'buy-potion', potionId: 'mp_large', quantity: 8 }),
    ).toBeUndefined();
    const gold = hero.gold;
    expect(
      buy({ action: 'buy-potion', potionId: 'hp_medium', quantity: 1 }),
    ).toMatch(/20/);
    expect(
      buy({ action: 'buy-potion', potionId: 'mp_small', quantity: -1 }),
    ).toMatch(/Số lượng/);
    expect(hero.gold).toBe(gold);
    expect(
      merchantActionSchema.safeParse({
        protocolVersion: PROTOCOL_VERSION,
        sequence: 1,
        revision: 0,
        action: 'buy-basic',
        slot: 'weapon',
        price: 0,
        ownerId: 'other',
      }).success,
    ).toBe(false);
  });
  it('heals once, caps resources, shares the5s cooldown and does not consume at full HP', () => {
    const { hero, buy } = fixture();
    buy({ action: 'buy-potion', potionId: 'hp_small', quantity: 2 });
    buy({ action: 'buy-potion', potionId: 'mp_small', quantity: 1 });
    expect(buy({ action: 'use-potion', potionId: 'hp_small' })).toMatch(/đầy/);
    expect(hero.inventory!.potions.hp_small).toBe(2);
    hero.hp = hero.maxHp - 10;
    hero.mana = 0;
    expect(buy({ action: 'use-potion', potionId: 'hp_small' })).toBeUndefined();
    expect(hero.hp).toBe(hero.maxHp);
    expect(hero.inventory!.potions.hp_small).toBe(1);
    expect(
      buy(
        { action: 'use-potion', potionId: 'mp_small' },
        { ...context, matchTick: 149 },
      ),
    ).toMatch(/hồi/);
    expect(
      buy(
        { action: 'use-potion', potionId: 'mp_small' },
        { ...context, inArena: false, matchTick: 150, worldTick: 2 },
      ),
    ).toBeUndefined();
    expect(hero.mana).toBe(40);
    expect(hero.inventory!.potionReadyAt).toBe(300);
    hero.statuses = [
      {
        kind: 'stun',
        durationTicks: 30,
        magnitude: 1,
        sourceId: 'enemy',
        abilityId: 'stun',
        until: 30,
      },
    ];
    hero.hp = 10;
    expect(
      buy(
        { action: 'use-potion', potionId: 'hp_small' },
        { ...context, matchTick: 300 },
      ),
    ).toMatch(/choáng/);
  });
  it('retains inventory/cooldown on actual dungeon transfers and death recovery', () => {
    const match = new DungeonMatch(m1Config, creepDungeon);
    const h = match.add('buyer', 'Buyer');
    initializeProgression(h, m1Config);
    h.gold = 100;
    transactMerchant(h, m1Config, context, 0, {
      action: 'buy-basic',
      slot: 'weapon',
    });
    transactMerchant(h, m1Config, context, 1, {
      action: 'buy-potion',
      potionId: 'hp_small',
      quantity: 2,
    });
    h.hp = 10;
    transactMerchant(h, m1Config, context, 2, {
      action: 'use-potion',
      potionId: 'hp_small',
    });
    expect(match.enter(h.id, 'private')).toBeUndefined();
    expect(match.hero(h.id)!.inventory!.levels.weapon).toBe(1);
    expect(match.hero(h.id)!.inventory!.potionReadyAt).toBe(150);
    h.hp = 0;
    for (let i = 0; i < 170; i++) match.step();
    expect(match.zoneOf(h.id)!.access).toBe('arena');
    expect(h.inventory!.levels.weapon).toBe(1);
    expect(h.inventory!.potions.hp_small).toBe(1);
  });
  it('validates authored prices and finite item coefficients at load', () => {
    const bad = structuredClone(economyTrial);
    bad.basics.weapon.prices[0] = -10;
    expect(economySchema.safeParse(bad).success).toBe(false);
    bad.basics.weapon.prices[0] = 30;
    bad.basics.hat.perLevel.hpRegen = Infinity;
    expect(economySchema.safeParse(bad).success).toBe(false);
  });
});
