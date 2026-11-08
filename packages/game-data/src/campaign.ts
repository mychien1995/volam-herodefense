import { z } from 'zod';
import { campaignBossIds, type CampaignDefinition } from '@volam/game-core';
import { economyTrial } from './economy.js';
const positive = z.number().finite().positive();
const count = z.number().int().nonnegative();
const chapters = z.array(positive).length(5);
export const campaignSchema = z.strictObject({
  creepCountPerPlayer: positive,
  creepHpPerPlayer: positive,
  privateCountPerPlayer: positive,
  privateHpPerPlayer: positive,
  privateDamagePerPlayer: positive,
  invasionBaseCount: positive,
  invasionChapterCount: positive,
  chapterSeconds: positive,
  xpThresholds: z
    .array(count)
    .length(30)
    .refine(
      (xp) =>
        xp[0] === 0 &&
        xp
          .slice(1)
          .every((total, i) => total - xp[i]! > xp[i]! - (xp[i - 1] ?? 0)),
      'The XP curve must start at zero and increase the cost of each level.',
    ),
  startingPotions: z
    .strictObject({ hp_small: count, mp_small: count })
    .refine(
      ({ hp_small, mp_small }) =>
        hp_small + mp_small <= economyTrial.potionLimit,
      'Starting potions must fit within the inventory limit.',
    ),
  targets: chapters,
  farmOverflowRatio: positive.max(1),
  invasionXp: chapters,
  invasionGold: chapters,
  dungeonXp: chapters,
  dungeonGold: chapters,
  dungeonHp: chapters,
  dungeonDamage: chapters,
  bossHpPerPlayer: positive,
  damagePerPlayer: positive,
  wavePearl: positive.max(1),
  dungeonPearl: positive.max(1),
  revivals: z.number().int().min(1).max(10),
  revivalSeconds: positive,
  voteSeconds: positive,
  finalRestSeconds: positive,
  bosses: z.record(
    z.enum(campaignBossIds),
    z.strictObject({
      hp: positive,
      xp: positive.int(),
      gold: positive.int(),
      wave: z.boolean(),
    }),
  ),
});
/** Director-approved campaign v1. Numeric pacing remains measurable, configurable tuning. */
export const campaignDefinition: CampaignDefinition = campaignSchema.parse({
  creepCountPerPlayer: 0.6,
  creepHpPerPlayer: 0.2,
  privateCountPerPlayer: 0.1,
  privateHpPerPlayer: 0.08,
  privateDamagePerPlayer: 0.04,
  invasionBaseCount: 120,
  invasionChapterCount: 20,
  chapterSeconds: 900,
  // Cumulative thresholds for levels 1–30. The curve rejoins v1 at level 18.
  xpThresholds: [
    0, 45, 135, 270, 450, 670, 970, 1330, 1750, 2230, 2750, 3310, 3910, 4550,
    5230, 5950, 6700, 7480, 8280, 9120, 10000, 10920, 11880, 12880, 13920,
    15000, 16120, 17280, 18480, 19720,
  ],
  startingPotions: { hp_small: 5, mp_small: 5 },
  targets: [6, 12, 18, 24, 28],
  farmOverflowRatio: 0.25,
  invasionXp: [100, 300, 450, 650, 650],
  invasionGold: [70, 100, 130, 160, 160],
  dungeonXp: [3, 5, 8, 11, 14],
  dungeonGold: [0.8, 1.5, 2, 2.5, 3],
  dungeonHp: [1, 1.5, 2.2, 3, 3.8],
  dungeonDamage: [1, 1.2, 1.45, 1.7, 2],
  bossHpPerPlayer: 1.1,
  damagePerPlayer: 0.06,
  wavePearl: 0.08,
  dungeonPearl: 0.04,
  revivals: 3,
  revivalSeconds: 5,
  voteSeconds: 30,
  finalRestSeconds: 60,
  bosses: {
    dong_ta: { hp: 6200, xp: 300, gold: 180, wave: true },
    tay_doc_boss: { hp: 14000, xp: 400, gold: 250, wave: true },
    boss_nam_de: { hp: 26000, xp: 600, gold: 350, wave: true },
    bac_cai: { hp: 38000, xp: 1400, gold: 450, wave: true },
    vuong_trung_duong: { hp: 48000, xp: 350, gold: 800, wave: true },
    boss_ly_mac_sau: { hp: 7200, xp: 150, gold: 140, wave: false },
    hong_liet_boss: { hp: 17000, xp: 300, gold: 200, wave: false },
    chu_ba_thong: { hp: 12000, xp: 500, gold: 300, wave: false },
    kim_luan_phap_vuong: { hp: 45000, xp: 1700, gold: 400, wave: false },
  },
});
