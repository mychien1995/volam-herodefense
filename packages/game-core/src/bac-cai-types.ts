import type { Point, SimulationConfig } from './types.js';

export const bacCaiAbilities = [
  'staff',
  'palms',
  'beam',
  'dogs',
  'clones',
  'vortex',
  'tether',
  'field',
  'spiral',
] as const;
export type BacCaiAbility = (typeof bacCaiAbilities)[number];
export interface BacCaiDefinition {
  entry: Point;
  center: Point;
  cloneRadius: Point;
  hp: number;
  hpPerAdditionalPlayer: number;
  defense: number;
  speed: number;
  radius: number;
  actionGapMs: number;
  basicGapMs: number;
  specialCooldownMs: number;
  restMs: number;
  damage: Record<BacCaiAbility | 'cloneExplosion', number>;
  staff: {
    range: number;
    dash: number;
    durationMs: number;
    cadenceMs: number;
    halfAngle: number;
  };
  palms: {
    speed: number;
    range: number;
    radius: number;
    releaseMs: number;
    recoveryMs: number;
  };
  beam: {
    length: number;
    radius: number;
    warningMs: number;
    activeMs: number;
    recoveryMs: number;
  };
  dogs: {
    hp: number;
    speed: number;
    radius: number;
    range: number;
    cadenceMs: number;
    lifetimeMs: number;
    corpseMs: number;
    releaseMs: number;
    recoveryMs: number;
  };
  clones: {
    splitMs: number;
    moveMs: number;
    staggerMs: number;
    settleMs: number;
    pairs: number[][][];
  };
  vortex: {
    channelMs: number;
    pullSpeed: number;
    slamRadius: number;
    stunMs: number;
    recoveryMs: number;
  };
  tether: {
    pullDistance: number;
    breakDistance: number;
    cadenceMs: number;
    lifetimeMs: number;
    releaseMs: number;
    recoveryMs: number;
  };
  field: {
    halfSize: number;
    halfHeight: number;
    lineWidth: number;
    impactMs: number;
    recoveryMs: number;
    activeMs: number;
  };
  spiral: {
    releaseMs: number;
    recoveryMs: number;
    flightMs: number;
    radius: number;
    startRadius: number;
    yScale: number;
    turns: number;
    hitRadius: number;
    cadenceMs: number;
  };
  preferences: {
    changeMs: number;
    voteEveryMs: number;
    voteMs: number;
    zoneSize: number;
    zoneHeight: number;
    sleepMs: number;
    drinkMs: number;
    healFraction: number;
    quotes: string[];
    names: string[];
  };
  reward: { xp: number; gold: number; assistMs: number };
}
export interface BacCaiCast extends Point {
  id: string;
  ability: BacCaiAbility;
  start: number;
  release: number;
  end: number;
  fx: number;
  fy: number;
  released: boolean;
  nextHit: number;
  targetId: string;
  origin: Point;
}
export interface BacCaiEffect extends Point {
  id: string;
  kind: 'beam' | 'palm' | 'field' | 'spiral' | 'tether' | 'explosion';
  start: number;
  end: number;
  fx: number;
  fy: number;
  origin: Point;
  targetIds: string[];
  hits: Record<string, number>;
  previous: Point;
}
export interface BacCaiForm extends Point {
  key: string;
  fx: number;
  fy: number;
}
export interface BacCaiView {
  tick: number;
  tickRate: number;
  phase: 'entering' | 'combat' | 'sleep' | 'drink' | 'defeated' | 'cleared';
  hp: number;
  maxHp: number;
  boss:
    | (Point & { fx: number; fy: number; pose: string; poseStart: number })
    | null;
  action: BacCaiCast | null;
  forms: BacCaiForm[];
  clonePhase: string;
  swaps: number;
  immune: boolean;
  effects: Omit<BacCaiEffect, 'hits' | 'previous'>[];
  dogs: Array<
    Point & {
      id: string;
      hp: number;
      maxHp: number;
      fx: number;
      pose: string;
      age: number;
    }
  >;
  dialogue: string;
  preference: number;
  vote: {
    options: Array<Point & { preference: number }>;
    deadline: number;
    counts: number[];
    outcome: string;
  } | null;
  outcomeUntil: number;
  tuning: Pick<
    BacCaiDefinition,
    'beam' | 'field' | 'spiral' | 'preferences' | 'vortex'
  >;
}
/** Called at server startup; malformed tuning never enters a live room. */
export function validateBacCai(d: BacCaiDefinition, c: SimulationConfig): void {
  const visit = (v: unknown, path: string) => {
    if (typeof v === 'number' && (!Number.isFinite(v) || v < 0))
      throw Error('Invalid Bắc Cái tuning: ' + path);
    if (v && typeof v === 'object')
      for (const [k, value] of Object.entries(v)) visit(value, path + '.' + k);
  };
  visit(d, 'bacCai');
  if (
    d.hp <= 0 ||
    d.radius <= 0 ||
    d.speed <= 0 ||
    d.dogs.cadenceMs <= 0 ||
    d.tether.cadenceMs <= 0 ||
    d.spiral.cadenceMs <= 0 ||
    d.preferences.changeMs <= 0 ||
    d.clones.moveMs <= 0 ||
    d.beam.length !== 768 ||
    d.preferences.sleepMs !== 10000 ||
    d.preferences.healFraction !== 0.1 ||
    d.preferences.quotes.length !== 6 ||
    d.preferences.names.length !== 6
  )
    throw Error('Invalid Bắc Cái contract');
  if (
    d.clones.pairs.length !== 5 ||
    d.clones.pairs.some(
      (r) =>
        r.length !== 4 ||
        r.some((p) => p.length !== 2) ||
        new Set(r.flat()).size !== 8 ||
        r.flat().some((i) => !Number.isInteger(i) || i < 0 || i > 7),
    )
  )
    throw Error('Bắc Cái requires five bijective pair swaps');
  for (const group of [
    d.staff,
    d.palms,
    d.beam,
    d.dogs,
    d.clones,
    d.vortex,
    d.tether,
    d.field,
    d.spiral,
    d.preferences,
  ])
    for (const [key, value] of Object.entries(group))
      if (typeof value === 'number' && value <= 0)
        throw Error('Bắc Cái requires positive ' + key);
  for (const p of [d.entry, d.center])
    if (
      p.x < d.radius ||
      p.y < d.radius ||
      p.x > c.width - d.radius ||
      p.y > c.height - d.radius
    )
      throw Error('Bắc Cái marker outside arena');
}
