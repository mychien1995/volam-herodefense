import type { Creep, Hero, SimulationConfig, World } from './types.js';
import { gainExperience, refreshCharacter } from './progression.js';

export interface CampaignDefinition {
  creepCountPerPlayer: number;
  creepHpPerPlayer: number;
  privateCountPerPlayer: number;
  privateHpPerPlayer: number;
  privateDamagePerPlayer: number;
  invasionBaseCount: number;
  invasionChapterCount: number;
  invasionHpMultiplier: number;
  invasionDamageMultiplier: number;
  chapterSeconds: number;
  xpThresholds: number[];
  startingPotions: { hp_small: number; mp_small: number };
  targets: number[];
  farmOverflowRatio: number;
  invasionXp: number[];
  invasionGold: number[];
  dungeonXp: number[];
  dungeonGold: number[];
  dungeonHp: number[];
  dungeonDamage: number[];
  dungeonEnemyDamageMultiplier: number;
  meleeSustain: {
    branchIds: string[];
    maxHpBonus: number;
    hpRegenBonus: number;
    minHpRegen: number;
  };
  bossHpPerPlayer: number;
  bossDamageMultiplier: number;
  damagePerPlayer: number;
  wavePearl: number;
  dungeonPearl: number;
  revivals: number;
  revivalSeconds: number;
  voteSeconds: number;
  finalRestSeconds: number;
  bosses: Record<
    string,
    { hp: number; xp: number; gold: number; wave: boolean }
  >;
}
export interface CampaignRuntime {
  chapter: number;
  players: number;
  elapsedTicks: number;
  cleared: Set<string>;
}
export function experienceAtLevel(
  level: number,
  config: SimulationConfig,
): number {
  const n = Math.max(0, Math.min(config.maxLevel, level) - 1);
  const c = config.campaign;
  return c ? c.xpThresholds[n]! : n * config.xpPerLevel;
}
export const campaignBossIds = [
  'dong_ta',
  'tay_doc_boss',
  'boss_nam_de',
  'bac_cai',
  'vuong_trung_duong',
  'boss_ly_mac_sau',
  'hong_liet_boss',
  'chu_ba_thong',
  'kim_luan_phap_vuong',
] as const;

/** Rewards are settled at the actual damaging death, before encounter cleanup. */
export function awardCampaignBoss(
  world: World,
  config: SimulationConfig,
  boss: Creep,
): boolean {
  const rule = config.campaign?.bosses[boss.id];
  if (!rule) return false;
  const eligible = [...world.heroes.values()].filter((h) =>
    boss.damagedBy?.has(h.id),
  );
  if (!eligible.length) return true;
  world.campaign?.cleared.add(boss.id);
  const first = eligible
    .filter((h) => !h.campaignClears?.includes(boss.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  // A fixed authored pool, scaled at encounter start; never one full pool per recipient.
  const players = boss.campaignPlayers ?? world.campaign?.players ?? 1;
  for (const [i, h] of first.entries()) {
    (h.campaignClears ??= []).push(boss.id);
    const split = (value: number) =>
      Math.floor((value * players) / eligible.length) +
      Number(i < (value * players) % eligible.length);
    gainExperience(h, split(rule.xp), config);
    h.gold += split(rule.gold);
    if (boss.id !== 'vuong_trung_duong') {
      h.dragonBonus =
        (h.dragonBonus ?? 0) +
        (rule.wave
          ? config.campaign!.wavePearl
          : config.campaign!.dungeonPearl);
      refreshCharacter(h, config);
    }
  }
  return true;
}
export function grantFarmReward(
  hero: Hero,
  xp: number,
  gold: number,
  config: SimulationConfig,
  chapter: number,
): void {
  const c = config.campaign;
  const ratio =
    c &&
    hero.level >= (c.targets[Math.min(chapter, c.targets.length - 1)] ?? 30) + 2
      ? c.farmOverflowRatio
      : 1;
  hero.farmXpRemainder = (hero.farmXpRemainder ?? 0) + xp * ratio;
  hero.farmGoldRemainder = (hero.farmGoldRemainder ?? 0) + gold;
  const earnedXp = Math.floor(hero.farmXpRemainder + 1e-8),
    earnedGold = Math.floor(hero.farmGoldRemainder + 1e-8);
  hero.farmXpRemainder -= earnedXp;
  hero.farmGoldRemainder -= earnedGold;
  gainExperience(hero, earnedXp, config);
  hero.gold += earnedGold;
}
