import type { Point } from './types.js';
import type { Pvp1v1Tuning } from './pvp-balance.js';

export const pvpMapIds = [
  'hong_moc',
  'rung_truc',
  'dia_nguc',
  'tuong_duong',
  'kiem_ho',
] as const;
export type PvpMapId = (typeof pvpMapIds)[number];
export type PvpTeam = 'chinh' | 'ta' | 'spectator';
export type PvpPhase =
  'lobby' | 'countdown' | 'fighting' | 'intermission' | 'series_over';
export interface PvpMapDefinition {
  id: PvpMapId;
  name: string;
  width: number;
  height: number;
  /** Authoritative walkable ground polygon, measured against the approved art. */
  floor: Point[];
  spawns: { chinh: Point[]; ta: Point[] };
}
export interface PvpDefinition {
  oneVOne?: Pvp1v1Tuning;
  maxPlayers: number;
  teamCapacity: number;
  wins: number;
  countdownTicks: number;
  roundTicks: number;
  intermissionTicks: number;
  resultTicks: number;
  historyLimit: number;
  maps: Record<PvpMapId, PvpMapDefinition>;
  hazards: {
    dartInterval: number;
    arrowInterval: number;
    swordInterval: number;
    lightningInterval: number;
    warningTicks: number;
    projectileSpeed: number;
    dartFraction: number;
    arrowFraction: number;
    swordFraction: number;
    lightningFraction: number;
    lavaFractionPerSecond: number;
    shrinkTicks: number;
    minimumSafeScale: number;
  };
}
export interface PvpMember {
  id: string;
  nickname: string;
  schoolId: string;
  branchId: string;
  team: PvpTeam;
  ready: boolean;
}
export interface PvpHazard {
  id: number;
  kind: 'dart' | 'arrow' | 'sword' | 'lightning';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  armedAt: number;
  until: number;
  nx: number;
  ny: number;
}
export interface PvpKill {
  id: number;
  tick: number;
  sourceId: string;
  targetId: string;
  killer: string;
  victim: string;
  environment: boolean;
}
export interface PvpResult {
  winner: 'chinh' | 'ta' | 'draw';
  reason: 'elimination' | 'timeout' | 'disconnect';
}
export interface PvpSnapshot {
  combatProfile: 'standard' | 'pvp_1v1';
  mapId: PvpMapId;
  hazardsEnabled: boolean;
  phase: PvpPhase;
  tick: number;
  until: number;
  roundUntil: number;
  roundNumber: number;
  score: { chinh: number; ta: number };
  alive: { chinh: number; ta: number };
  hostId: string;
  members: PvpMember[];
  hazards: PvpHazard[];
  history: PvpKill[];
  result: PvpResult | null;
  safe: { x: number; y: number; rx: number; ry: number } | null;
}
