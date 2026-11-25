import { z } from 'zod';
import type { EconomyDefinition } from '@volam/game-core';
const positiveInt = z.number().int().positive().max(1_000_000);
const bonuses = z.strictObject({
  attackPower: z.number().finite().nonnegative().optional(),
  maxHp: z.number().finite().nonnegative().optional(),
  maxMana: z.number().finite().nonnegative().optional(),
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
const branch = <T extends string>(id: T) =>
  z.strictObject({
    id: z.literal(id),
    nameVi: z.string().min(1),
    descriptionVi: z.string().min(1),
    art: z.string().min(1),
    stats: bonuses,
  });
const recipe = <A extends string, B extends string, C extends string>(
  ids: [A, B, C],
) =>
  z.strictObject({
    bossId: z.string().regex(/^[a-z_]+$/),
    bossNameVi: z.string().min(1),
    materialNameVi: z.string().min(1),
    materialArt: z.string().min(1),
    branches: z.tuple([branch(ids[0]), branch(ids[1]), branch(ids[2])]),
  });
const ratio = z.number().finite().positive().max(1);
const positive = z.number().finite().positive();
export const economySchema = z.strictObject({
  recipes: z.strictObject({
    weapon: recipe(['cleave', 'lifesteal', 'penetration']),
    armor: recipe(['reflect', 'slow_aura', 'burn_aura']),
    hat: recipe(['recovery', 'fortitude', 'assault']),
    boots: recipe(['cleanse', 'haste', 'spring']),
  }),
  craftedCombat: z.strictObject({
    sideShotDamage: ratio,
    spreadRadians: positive.max(1),
    meleeRangeMultiplier: positive.min(1).max(2),
    meleeAngleBonus: positive.max(1),
    lifesteal: ratio,
    penetration: ratio,
    reflectChance: ratio,
    auraRadius: positive,
    auraSlow: ratio,
    auraDamage: positive,
    bootCooldownSeconds: positiveInt,
    springChance: ratio,
    springDamageThreshold: ratio,
    springHealFraction: ratio,
  }),
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
  craftedCombat: {
    sideShotDamage: 0.45,
    spreadRadians: 0.4,
    meleeRangeMultiplier: 1.18,
    meleeAngleBonus: 0.2,
    lifesteal: 0.1,
    penetration: 0.25,
    reflectChance: 0.07,
    auraRadius: 90,
    auraSlow: 0.18,
    auraDamage: 8,
    bootCooldownSeconds: 30,
    springChance: 0.1,
    springDamageThreshold: 0.05,
    springHealFraction: 0.1,
  },
  recipes: {
    weapon: {
      bossId: 'kim_luan_phap_vuong',
      bossNameVi: 'Kim Luân Pháp Vương',
      materialNameVi: 'Kim Luân',
      materialArt: 'wheel',
      branches: [
        {
          id: 'cleave',
          nameVi: 'Đánh lan',
          descriptionVi:
            'A đánh xa bắn ba tia, A cận chiến mở rộng tầm và góc lan.',
          art: 'weapon',
          stats: { attackPower: 6 },
        },
        {
          id: 'lifesteal',
          nameVi: 'Hút máu',
          descriptionVi: 'Một lần hồi trên mỗi đòn A trúng.',
          art: 'weapon',
          stats: { attackPower: 6 },
        },
        {
          id: 'penetration',
          nameVi: 'Xuyên giáp',
          descriptionVi: 'Đòn A bỏ qua một phần phòng thủ mục tiêu.',
          art: 'weapon',
          stats: { attackPower: 6 },
        },
      ],
    },
    armor: {
      bossId: 'hong_liet_boss',
      bossNameVi: 'Hoàn Nhan Hồng Liệt',
      materialNameVi: 'Đại Kim Chiến Giáp',
      materialArt: 'armor',
      branches: [
        {
          id: 'reflect',
          nameVi: 'Phản đòn',
          descriptionVi:
            'Có cơ hội phản đòn và chỉ nhận nửa sát thương đòn đó.',
          art: 'armor',
          stats: { maxHp: 45, defense: 4 },
        },
        {
          id: 'slow_aura',
          nameVi: 'Aura làm chậm',
          descriptionVi: 'Làm chậm địch xung quanh.',
          art: 'armor',
          stats: { maxHp: 45, defense: 4 },
        },
        {
          id: 'burn_aura',
          nameVi: 'Aura đốt',
          descriptionVi: 'Đốt địch xung quanh mỗi giây.',
          art: 'armor',
          stats: { maxHp: 45, defense: 4 },
        },
      ],
    },
    hat: {
      bossId: 'chu_ba_thong',
      bossNameVi: 'Chu Bá Thông',
      materialNameVi: 'Đại Hồ Lô',
      materialArt: '/assets/chu/toan_chan_tien_tuu_icon.png',
      branches: [
        {
          id: 'recovery',
          nameVi: 'Hồi phục',
          descriptionVi: 'Tăng hồi máu và hồi mana.',
          art: 'hat',
          stats: { hpRegen: 2, manaRegen: 3 },
        },
        {
          id: 'fortitude',
          nameVi: 'Bền bỉ',
          descriptionVi: 'Tăng máu, mana tối đa và phòng thủ.',
          art: 'hat',
          stats: { maxHp: 55, maxMana: 25, defense: 4 },
        },
        {
          id: 'assault',
          nameVi: 'Tấn công',
          descriptionVi: 'Tăng sát thương và tỉ lệ chí mạng.',
          art: 'hat',
          stats: { attackPower: 5, critChance: 0.025 },
        },
      ],
    },
    boots: {
      bossId: 'boss_ly_mac_sau',
      bossNameVi: 'Lý Mạc Sầu',
      materialNameVi: 'Ngọc Uyên Ương',
      materialArt: 'jade_pair',
      branches: [
        {
          id: 'cleanse',
          nameVi: 'Thanh Tâm',
          descriptionVi:
            'Tự giải hiệu ứng xấu thông thường khi nhận lần đầu, gồm choáng. Hồi 30 giây.',
          art: 'thanh_tam',
          stats: { movementSpeed: 5, critChance: 0.005 },
        },
        {
          id: 'haste',
          nameVi: 'Tốc hành',
          descriptionVi:
            'Tăng thêm 2 lượt Shift tối đa, giữ tốc độ hồi từng lượt.',
          art: 'blink',
          stats: { movementSpeed: 5, critChance: 0.005 },
        },
        {
          id: 'spring',
          nameVi: 'Phùng Xuân',
          descriptionVi:
            '10% cơ hội hồi 10% máu tối đa khi một đòn gây mất hơn 5% máu tối đa. Hồi 30 giây.',
          art: 'recovery',
          stats: { movementSpeed: 5, critChance: 0.005 },
        },
      ],
    },
  },
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
