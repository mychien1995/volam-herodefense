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
export interface DefaultBranch {
  schoolId: string;
  style: string;
  skillIds: string[];
}
export interface FixedBranch {
  skillIds: string[];
  alternateSkillIds?: string[] | undefined;
}
export type SkillMode = 'default' | 'custom' | 'fixed';
export interface ProgressionDefinition {
  defaultBranches?: Record<string, DefaultBranch> | undefined;
  fixedBranches?: Record<string, FixedBranch> | undefined;
  skills: Record<string, RankedSkill>;
  schools: Record<string, SchoolStatProfile>;
  maxUltimates: number;
  maxCritChance: number;
  maxCooldownReduction: number;
}
export interface HeroProgression {
  revision: number;
  mode: SkillMode;
  branchId: string;
  defaultSkills: string[];
  ranks: Record<string, number>;
}
export type BuildChange =
  | { action: 'mode'; mode: Exclude<SkillMode, 'fixed'> }
  | { action: 'branch'; basicId: string }
  | { action: 'loadout'; ids: string[] }
  | { action: 'upgrade'; skillId: string }
  | { action: 'upgrade-slot'; slot: number }
  | { action: 'stance' }
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
