import type { StatBonuses } from './progression-types.js';
export type EquipmentSlot = 'weapon' | 'armor' | 'hat' | 'boots';
export const equipmentSlots: EquipmentSlot[] = [
  'weapon',
  'armor',
  'hat',
  'boots',
];
export type PotionId =
  'hp_small' | 'hp_medium' | 'hp_large' | 'mp_small' | 'mp_medium' | 'mp_large';
export interface EconomyDefinition {
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
export interface HeroInventory {
  levels: Record<EquipmentSlot, number>;
  potions: Partial<Record<PotionId, number>>;
  revision: number;
  /** Match clock, not the independently paused/translated zone clock. */
  potionReadyAt: number;
}
export type MerchantAction =
  | { action: 'buy-basic'; slot: EquipmentSlot }
  | { action: 'buy-potion'; potionId: PotionId; quantity: number }
  | { action: 'use-potion'; potionId: PotionId };
