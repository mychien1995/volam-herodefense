import type { Creep, Point, Rect } from './types.js';
export const tayDocAbilities = [
  'tay_doc_staff',
  'tay_doc_gas',
  'van_doc_phi_cham',
  'doc_vu_me_hon',
  'co_doc_khoan_tam',
  'hon_thien_phuc_long_chan',
  'doc_chuong',
  'cap_mo_chan_kich',
  'ngu_doc_than_chuong',
  'van_doc_bao_phat',
] as const;
export type TayDocAbility = (typeof tayDocAbilities)[number];
export interface TayDocAttack {
  nameVi: string;
  windup: number;
  recovery: number;
  cooldown: number;
  damage: number;
  range: number;
  radius: number;
  speed: number;
  duration: number;
  interval: number;
}
export interface TayDocDefinition {
  spawn: Point;
  entryEndX: number;
  bounds: Rect;
  hp: number;
  defense: number;
  speed: number;
  phase2Speed: number;
  phase2Damage: number;
  radius: number;
  xp: number;
  gold: number;
  rest: number;
  transition: number;
  controlScale: number;
  gateRest: number;
  poisonDamage: number;
  poisonDuration: number;
  poisonInterval: number;
  slow: number;
  slowDuration: number;
  stunDuration: number;
  cloudCount: number;
  cloudRadius: number;
  cloudDuration: number;
  curseDelay: number;
  curseRadius: number;
  pillarHp: number;
  pillarInterval: number;
  pillarSpeed: number;
  pillarRange: number;
  radialCount: number;
  needleCount: number;
  needleVolleys: number;
  needleSpread: number;
  jumpTicks: number;
  jumpRest: number;
  attacks: Record<TayDocAbility, TayDocAttack>;
}
export interface TayDocCast {
  id: string;
  ability: TayDocAbility;
  startedAt: number;
  activeAt: number;
  endsAt: number;
  origin: Point;
  fx: number;
  fy: number;
  targetId: string;
  fired: boolean;
  nextVolley: number;
  volley: number;
  points: Point[];
  landed: number;
}
export interface TayDocShot extends Point {
  id: string;
  ability: TayDocAbility;
  ownerId: string;
  vx: number;
  vy: number;
  remaining: number;
  radius: number;
  damage: number;
  poison: boolean;
  slow: boolean;
  startedAt: number;
}
export interface TayDocPool extends Point {
  id: string;
  activeAt: number;
  until: number;
  nextTick: number;
  radius: number;
  damage: number;
}
export interface TayDocMark {
  id: string;
  targetId: string;
  at: number;
  until: number;
}
export interface TayDocPoison {
  targetId: string;
  until: number;
  nextTick: number;
  ability: TayDocAbility;
  slow: boolean;
}
export interface TayDocPillar extends Point {
  id: string;
  heading: number;
  nextShot: number;
  at: number;
  deadAt?: number;
}
export interface TayDocView {
  tick: number;
  bossId: string;
  phase: 'waiting' | 'enter' | 'phase1' | 'transition' | 'phase2' | 'dead';
  transitionAt: number;
  deathAt: number;
  cast?: TayDocCast;
  projectiles: TayDocShot[];
  pools: TayDocPool[];
  marks: TayDocMark[];
  poisons: TayDocPoison[];
  pillars: Array<TayDocPillar & { hp: number; maxHp: number }>;
  impacts: Array<{
    id: string;
    ability: string;
    x: number;
    y: number;
    at: number;
    radius: number;
  }>;
}
export type TayDocActor = Creep;
