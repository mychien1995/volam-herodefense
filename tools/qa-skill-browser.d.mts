import type { Page } from '@playwright/test';
import type { QaObservationOptions } from './qa-browser.mjs';
export interface QaSkillActor {
  roomId: string;
  sourceId: string;
  zoneId: string;
  basicId: string;
  sequence: number;
}
export interface QaSkillOptions extends QaObservationOptions {
  kind?: 'cast' | 'attack' | 'effect';
  key?: string;
}
export interface QaSummon {
  roomId: string;
  sourceId: string;
  summonId: string;
  zoneId: string;
  hp: number;
  maxHp: number;
}
export function ensureQaSkillLearned(
  page: Page,
  slot: number,
  abilityId: string,
  options?: QaSkillOptions,
): Promise<{ rank: number; revision: number; points: number }>;
export function qaSkillActor(
  page: Page,
  options?: QaSkillOptions,
): Promise<QaSkillActor>;
export function castQaSkill(
  page: Page,
  key: string,
  abilityId: string,
  options?: QaSkillOptions,
): Promise<{ actor: QaSkillActor; event: Record<string, unknown> }>;
export function ensureQaKinhLoi(
  page: Page,
  options?: QaSkillOptions,
): Promise<{
  sourceId: string;
  zoneId: string;
  areaIds: string[];
  charges: number;
}>;
export function placeQaOwnerOnlyArea(
  page: Page,
  peers: Page[],
  options: QaSkillOptions & {
    key: string;
    abilityId: string;
    absenceMilliseconds?: number;
  },
): Promise<{
  areaIds: string[];
  observations: Array<{ samples: number; firstTick: number; lastTick: number }>;
  receipt: unknown;
}>;
export function captureQaSummon(
  page: Page,
  summonId: string,
  options?: QaSkillOptions,
): Promise<QaSummon>;
export function waitQaSummonTransfer(
  page: Page,
  before: QaSummon,
  options?: QaSkillOptions & {
    zonePattern?: string;
    texture?: string;
    peers?: Page[];
  },
): Promise<QaSummon & { texture: string }>;
