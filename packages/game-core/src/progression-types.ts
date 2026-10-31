import type { Ability } from './types.js';

export interface CharacterStats {
  maxHp: number;
  maxMana: number;
  attackPower: number;
  defense: number;
  attackSpeed: number;
  movementSpeed: number;
  critChance: number;
  critMultiplier: number;
  manaRegen: number;
  cooldownReduction: number;
  hpRegen: number;
}
export type StatBonuses = { [K in keyof CharacterStats]?: number | undefined };
export interface SchoolStatProfile {
  passiveId: string;
  base: CharacterStats;
  growth: StatBonuses;
  innate: StatBonuses;
  surplus: StatBonuses;
  basicIds: string[];
}
export interface RankedSkill {
  id: string;
  schoolId: string;
  style: string;
  ultimate: boolean;
  descriptionVi: string;
  levelGates: number[];
  ranks: Ability[];
}
export interface ProgressionDefinition {
  skills: Record<string, RankedSkill>;
  schools: Record<string, SchoolStatProfile>;
  maxUltimates: number;
  maxCritChance: number;
  maxCooldownReduction: number;
}
export interface HeroProgression {
  revision: number;
  ranks: Record<string, number>;
}
export type BuildChange =
  | { action: 'loadout'; ids: string[] }
  | { action: 'upgrade'; skillId: string }
  | { action: 'reset' }
  | { action: 'basic'; basicId: string };
export interface PointAccounting {
  earned: number;
  allocated: number;
  available: number;
  surplus: number;
}
export interface StatCalculation {
  sources: Record<
    'base' | 'growth' | 'innate' | 'surplus' | 'equipment' | 'temporary',
    CharacterStats
  >;
  total: CharacterStats;
}
