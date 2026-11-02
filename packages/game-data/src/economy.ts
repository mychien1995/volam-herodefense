import { z } from 'zod';
import type { EconomyDefinition } from '@volam/game-core';
const positiveInt = z.number().int().positive().max(1_000_000);
const bonuses = z.strictObject({
  attackPower: z.number().finite().nonnegative().optional(),
  maxHp: z.number().finite().nonnegative().optional(),
  defense: z.number().finite().nonnegative().optional(),
  hpRegen: z.number().finite().nonnegative().optional(),
  manaRegen: z.number().finite().nonnegative().optional(),
  movementSpeed: z.number().finite().nonnegative().optional(),
  critChance: z.number().finite().min(0).max(0.05).optional(),
});
const basic = z.strictObject({
  nameVi: z.string().min(1),
  prices: z.array(positiveInt).length(5),
  perLevel: bonuses,
  craftGold: positiveInt,
});
const potion = z.strictObject({
  nameVi: z.string().min(1),
  resource: z.enum(['hp', 'mana']),
  amount: positiveInt,
  price: positiveInt,
});
export const economySchema = z.strictObject({
  potionLimit: z.literal(20),
  potionCooldownSeconds: z.literal(5),
  basics: z.strictObject({
    weapon: basic,
    armor: basic,
    hat: basic,
    boots: basic,
  }),
  potions: z.strictObject({
    hp_small: potion,
    hp_medium: potion,
    hp_large: potion,
    mp_small: potion,
    mp_medium: potion,
    mp_large: potion,
  }),
});
/** Director-authorized trial tuning, editable independently from transaction mechanics. */
export const economyTrial: EconomyDefinition = economySchema.parse({
  potionLimit: 20,
  potionCooldownSeconds: 5,
  basics: {
    weapon: {
      nameVi: 'Vũ khí',
      prices: [30, 60, 100, 160, 240],
      perLevel: { attackPower: 4 },
      craftGold: 600,
    },
    armor: {
      nameVi: 'Giáp',
      prices: [30, 60, 100, 160, 240],
      perLevel: { maxHp: 30, defense: 3 },
      craftGold: 600,
    },
    hat: {
      nameVi: 'Mũ',
      prices: [20, 40, 70, 110, 160],
      perLevel: { hpRegen: 0.5, manaRegen: 1 },
      craftGold: 500,
    },
    boots: {
      nameVi: 'Giày',
      prices: [25, 50, 80, 120, 180],
      perLevel: { movementSpeed: 3, critChance: 0.005 },
      craftGold: 450,
    },
  },
  potions: {
    hp_small: { nameVi: 'Bình máu nhỏ', resource: 'hp', amount: 60, price: 4 },
    hp_medium: {
      nameVi: 'Bình máu vừa',
      resource: 'hp',
      amount: 150,
      price: 10,
    },
    hp_large: {
      nameVi: 'Bình máu lớn',
      resource: 'hp',
      amount: 330,
      price: 22,
    },
    mp_small: {
      nameVi: 'Bình mana nhỏ',
      resource: 'mana',
      amount: 40,
      price: 4,
    },
    mp_medium: {
      nameVi: 'Bình mana vừa',
      resource: 'mana',
      amount: 100,
      price: 10,
    },
    mp_large: {
      nameVi: 'Bình mana lớn',
      resource: 'mana',
      amount: 220,
      price: 22,
    },
  },
});
