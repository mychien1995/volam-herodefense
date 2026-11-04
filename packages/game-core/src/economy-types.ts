import type { StatBonuses } from './progression-types.js';
export type EquipmentSlot = 'weapon' | 'armor' | 'hat' | 'boots';
export const equipmentSlots: EquipmentSlot[] = [
  'weapon',
  'armor',
  'hat',
  'boots',
];
export type CraftBranch =
  | 'cleave'
  | 'lifesteal'
  | 'penetration'
  | 'reflect'
  | 'slow_aura'
  | 'burn_aura'
  | 'recovery'
  | 'fortitude'
  | 'assault'
  | 'cleanse'
  | 'blink'
  | 'needle';
export interface RecipeDefinition {
  bossId: string;
  bossNameVi: string;
  materialNameVi: string;
  materialArt: string;
  branches: Array<{
    id: CraftBranch;
    nameVi: string;
    descriptionVi: string;
    art: string;
    stats: StatBonuses;
  }>;
}
export type PotionId =
  'hp_small' | 'hp_medium' | 'hp_large' | 'mp_small' | 'mp_medium' | 'mp_large';
export interface EconomyDefinition {
  recipes: Record<EquipmentSlot, RecipeDefinition>;
  craftedCombat: {
    sideShotDamage: number;
    spreadRadians: number;
    meleeRangeMultiplier: number;
    meleeAngleBonus: number;
    lifesteal: number;
    penetration: number;
    reflectChance: number;
    auraRadius: number;
    auraSlow: number;
    auraDamage: number;
    auxiliaryCooldownSeconds: number;
    blinkRange: number;
    needleDamage: number;
    needleRange: number;
    needleSpeed: number;
    needleSlow: number;
    needlePoisonDamage: number;
    needlePoisonSeconds: number;
  };
  potionLimit: number;
  potionCooldownSeconds: number;
  basics: Record<
    EquipmentSlot,
    {
      nameVi: string;
      prices: number[];
      perLevel: StatBonuses;
      craftGold: number;
    }
  >;
  potions: Record<
    PotionId,
    { nameVi: string; resource: 'hp' | 'mana'; amount: number; price: number }
  >;
}
/** Shared by the arc, scheduled projectiles and both legs of one accepted A input. */
export interface EquipmentAttack {
  penetration?: number;
  lifesteal?: { fraction: number; used: boolean };
  spread?: { sideDamage: number; hitTargets: Set<string> };
}
export interface HeroInventory {
  levels: Record<EquipmentSlot, number>;
  potions: Partial<Record<PotionId, number>>;
  materials?: Partial<Record<EquipmentSlot, number>>;
  crafted?: Partial<Record<EquipmentSlot, CraftBranch>>;
  /** Zone clock translated on travel, just like Q/W/E/R/T. */
  auxiliaryReadyAt?: number;
  revision: number;
  /** Match clock, not the independently paused/translated zone clock. */
  potionReadyAt: number;
}
export type MerchantAction =
  | { action: 'craft'; slot: EquipmentSlot; branch: CraftBranch }
  | { action: 'buy-basic'; slot: EquipmentSlot }
  | { action: 'buy-potion'; potionId: PotionId; quantity: number }
  | { action: 'use-potion'; potionId: PotionId };
