import {
  changeBuild,
  equipmentSlots,
  experienceAtLevel,
  pointAccounting,
  refreshCharacter,
  type Hero,
  type HeroInventory,
  type SimulationConfig,
  type WaveBossTestStage,
  type World,
} from '@volam/game-core';

/** Explicit server-only test fixtures, never grants in the normal campaign. */
export const bossProgressionPresets: Partial<
  Record<
    WaveBossTestStage,
    {
      level: number;
      earnedGold: number;
      levels: HeroInventory['levels'];
      crafted: NonNullable<HeroInventory['crafted']>;
      dragonBonus: number;
    }
  >
> = {
  dong_ta: {
    level: 6,
    earnedGold: 550,
    levels: { weapon: 2, armor: 2, hat: 2, boots: 2 },
    crafted: {},
    dragonBonus: 0,
  },
  tay_doc: {
    level: 12,
    earnedGold: 1650,
    levels: { weapon: 3, armor: 3, hat: 3, boots: 5 },
    crafted: { boots: 'cleanse' },
    dragonBonus: 0.12,
  },
  nam_de: {
    level: 18,
    earnedGold: 2900,
    levels: { weapon: 4, armor: 5, hat: 4, boots: 5 },
    crafted: { boots: 'cleanse', armor: 'slow_aura' },
    dragonBonus: 0.24,
  },
  bac_cai: {
    level: 24,
    earnedGold: 4300,
    levels: { weapon: 5, armor: 5, hat: 5, boots: 5 },
    crafted: { boots: 'cleanse', armor: 'slow_aura', hat: 'recovery' },
    dragonBonus: 0.36,
  },
  vuong_trung_duong: {
    level: 27,
    earnedGold: 5300,
    levels: { weapon: 5, armor: 5, hat: 5, boots: 5 },
    crafted: {
      boots: 'cleanse',
      armor: 'slow_aura',
      hat: 'recovery',
      weapon: 'penetration',
    },
    dragonBonus: 0.48,
  },
};

/** Called once per character/stage; retry and reconnect never refill the preset. */
export function prepareBossProgressionHero(
  hero: Hero,
  world: World,
  config: SimulationConfig,
  stage: WaveBossTestStage,
): boolean {
  const preset = bossProgressionPresets[stage];
  if (
    !world.waveBossTest?.progression ||
    !config.campaign ||
    !config.economy ||
    !preset
  )
    return false;
  hero.level = preset.level;
  hero.xp = experienceAtLevel(preset.level, config);
  hero.dragonBonus = preset.dragonBonus;
  hero.campaignClears = [
    'dong_ta',
    'boss_ly_mac_sau',
    'tay_doc_boss',
    'hong_liet_boss',
    'boss_nam_de',
    'chu_ba_thong',
    'bac_cai',
    'kim_luan_phap_vuong',
  ].slice(0, Math.round(preset.dragonBonus / 0.12) * 2);
  const previous = hero.inventory;
  hero.inventory = {
    levels: { ...preset.levels },
    crafted: { ...preset.crafted },
    potions: { ...config.campaign.startingPotions },
    revision: (previous?.revision ?? 0) + 1,
    potionReadyAt: previous?.potionReadyAt ?? 0,
    auxiliaryReadyAt: previous?.auxiliaryReadyAt ?? 0,
  };
  const cost = equipmentSlots.reduce((sum, slot) => {
    const basic = config.economy!.basics[slot];
    return (
      sum +
      basic.prices.slice(0, preset.levels[slot]).reduce((a, b) => a + b, 0) +
      (preset.crafted[slot] ? basic.craftGold : 0)
    );
  }, 0);
  hero.gold = Math.max(0, preset.earnedGold - cost);
  // Spend only legal points, prioritizing T, then distributing Q/W/E/R.
  for (let pass = 0; pass < 4; pass++)
    for (const slot of [4, 0, 1, 2, 3]) {
      if (pointAccounting(hero, config).available <= 0) break;
      changeBuild(world, hero, config, hero.progression!.revision, {
        action: 'upgrade-slot',
        slot,
      });
    }
  refreshCharacter(hero, config, world.tick);
  hero.hp = hero.maxHp;
  hero.mana = hero.maxMana;
  return true;
}
