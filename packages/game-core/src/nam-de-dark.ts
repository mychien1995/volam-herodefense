import { emit, hurt } from './combat.js';
import { announceBossSkill } from './boss-skill-announcement.js';
import { direction, distance, segmentCircle } from './geometry.js';
import { applyStatus, hasStatus } from './status.js';
import { NAM_DE_ID } from './nam-de-types.js';
import type { Hero, Point, SimulationConfig, World } from './types.js';

export const namDeDarkSkills = {
  shield: 'tien_thien_canh_khi',
  blade: 'tien_thien_bang_dao',
  fist: 'dai_ly_hoang_quyen',
} as const;
export interface NamDeDarkDefinition {
  hpFraction: number;
  handSide: number;
  handHeight: number;
  shieldMultiplier: number;
  slow: number;
  slowTicks: number;
  transitionTicks: number;
  bladeWarningTicks: number;
  bladeGapTicks: number;
  bladeSpeed: number;
  bladeRange: number;
  bladeRadius: number;
  bladeDamage: number;
  reflectedHpFraction: number;
  reflectionsRequired: number;
  guardTicks: number;
  guardCooldownTicks: number;
  fistWarningTicks: number;
  fistGapTicks: number;
  fistRadius: number;
  fistRadiusY: number;
  fistDamage: number;
  fistStunTicks: number;
}
export interface NamDeIceBlade extends Point {
  id: number;
  fx: number;
  fy: number;
  startedAt: number;
  traveled: number;
  ownerId: string;
  reflected: boolean;
}
export interface NamDeRoyalFist extends Point {
  id: number;
  startedAt: number;
  activeAt: number;
  until: number;
  resolved: boolean;
}
export interface NamDeDarkState {
  enteredAt: number;
  transitionUntil: number;
  shield: boolean;
  reflections: number;
  shatterAt: number;
  nextBlade: number;
  nextFist: number;
  serial: number;
  cast?: {
    kind: 'blade' | 'fist';
    start: number;
    releaseAt: number;
    until: number;
    fx: number;
    fy: number;
    released: boolean;
  };
  guards: Map<
    string,
    { until: number; cooldownUntil: number; parryAt: number }
  >;
  blades: NamDeIceBlade[];
  fists: NamDeRoyalFist[];
}
export function namDeDarkView(w: World) {
  const s = w.namDe?.dark;
  if (!s) return null;
  const d = w.namDe!.definition.dark;
  return {
    enteredAt: s.enteredAt,
    transitionUntil: s.transitionUntil,
    shield: s.shield,
    reflections: s.reflections,
    reflectionsRequired: d.reflectionsRequired,
    shatterAt: s.shatterAt,
    cast: s.cast ? { ...s.cast } : null,
    guards: [...s.guards].map(([id, guard]) => ({ id, ...guard })),
    blades: s.blades.map((b) => ({ ...b })),
    fists: s.fists.map((f) => ({
      ...f,
      radius: d.fistRadius,
      radiusY: d.fistRadiusY,
    })),
  };
}
export type NamDeDarkView = NonNullable<ReturnType<typeof namDeDarkView>>;
function cue(w: World, stage: string, targetId = '', p?: Point) {
  const b = w.creeps.get(NAM_DE_ID);
  if (!b) return;
  emit(w, {
    kind: 'effect',
    sourceId: NAM_DE_ID,
    targetId,
    abilityId: namDeDarkSkills.shield,
    x: p?.x ?? b.x,
    y: p?.y ?? b.y,
    damage: 0,
    critical: false,
    stage,
  });
}
/** The phase-one floor prevents a single overkill from skipping the requested transformation. */
export function limitNamDeDamage(
  w: World,
  targetId: string,
  damage: number,
  reflected = false,
): number {
  const runtime = w.namDe,
    b = w.creeps.get(NAM_DE_ID);
  if (!runtime || !b || targetId !== NAM_DE_ID || !runtime.spawnCount)
    return damage;
  const d = runtime.definition.dark;
  if (!runtime.dark)
    return Math.min(
      damage,
      Math.max(0, b.hp - Math.ceil(b.maxHp * d.hpFraction)),
    );
  return damage * (runtime.dark.shield && !reflected ? d.shieldMultiplier : 1);
}
export function enterNamDeDark(w: World, c: SimulationConfig): boolean {
  const s = w.namDe,
    b = w.creeps.get(NAM_DE_ID);
  if (
    !s ||
    !b ||
    !s.spawnCount ||
    s.dark ||
    b.hp <= 0 ||
    b.hp > Math.ceil(b.maxHp * s.definition.dark.hpFraction) ||
    ['waiting', 'rest', 'enter', 'defeated'].includes(s.phase)
  )
    return false;
  const d = s.definition.dark;
  s.effects.clear();
  delete s.cast;
  delete s.smallCast;
  for (const [id] of s.controls) {
    const h = w.heroes.get(id);
    if (h) {
      h.namDeLocked = false;
      h.statuses = (h.statuses ?? []).filter(
        (effect) => effect.sourceId !== NAM_DE_ID,
      );
    }
  }
  s.controls.clear();
  s.phase = 'idle';
  s.rotationIndex = 0;
  s.nextActionAt = w.tick + d.transitionTicks + s.definition.actionRestTicks;
  s.nextSmallAt = s.nextActionAt;
  s.dark = {
    enteredAt: w.tick,
    transitionUntil: w.tick + d.transitionTicks,
    shield: true,
    reflections: 0,
    shatterAt: 0,
    nextBlade: w.tick + d.transitionTicks + 24,
    nextFist: w.tick + d.transitionTicks + 54,
    serial: 0,
    guards: new Map(),
    blades: [],
    fists: [],
  };
  b.stats = { ...(b.stats ?? c.creep), radius: s.definition.stats.radius * 2 };
  b.castAbilityId = namDeDarkSkills.shield;
  b.pose = 'cast';
  announceBossSkill(w, NAM_DE_ID, namDeDarkSkills.shield);
  cue(w, 'dark_transform');
  return true;
}
export function namDeFrostContact(
  w: World,
  targetId: string,
  sourceId: string,
  reflected: boolean,
): void {
  const s = w.namDe;
  const h = w.heroes.get(sourceId);
  if (
    targetId !== NAM_DE_ID ||
    !s?.dark?.shield ||
    !h ||
    h.hp <= 0 ||
    reflected
  )
    return;
  applyStatus(
    h,
    {
      kind: 'slow',
      magnitude: s.definition.dark.slow,
      durationTicks: s.definition.dark.slowTicks,
    },
    NAM_DE_ID,
    namDeDarkSkills.shield,
    w.tick,
  );
}
export function clearNamDeDarkTransient(w: World): void {
  const s = w.namDe?.dark;
  if (!s) return;
  s.blades = [];
  s.fists = [];
  s.guards.clear();
  delete s.cast;
}
export function guardNamDeBlade(w: World, h: Hero): boolean {
  const s = w.namDe?.dark,
    b = w.creeps.get(NAM_DE_ID),
    d = w.namDe?.definition.dark;
  if (
    !s ||
    !d ||
    !b ||
    b.hp <= 0 ||
    h.hp <= 0 ||
    h.bossSpectator ||
    w.tick < s.transitionUntil ||
    h.namDeLocked ||
    hasStatus(h, 'stun', w.tick) ||
    hasStatus(h, 'dash', w.tick) ||
    (s.guards.get(h.id)?.cooldownUntil ?? 0) > w.tick
  )
    return false;
  s.guards.set(h.id, {
    until: w.tick + d.guardTicks,
    cooldownUntil: w.tick + d.guardCooldownTicks,
    parryAt: 0,
  });
  h.moveX = h.moveY = 0;
  delete h.moveDestination;
  cue(w, 'ice_guard', h.id, h);
  return true;
}
export function beginNamDeDarkCast(
  w: World,
  ability: string,
  target: Hero,
): boolean {
  const runtime = w.namDe,
    s = runtime?.dark,
    b = w.creeps.get(NAM_DE_ID);
  if (
    !runtime ||
    !s ||
    !b ||
    b.hp <= 0 ||
    target.hp <= 0 ||
    w.tick < s.transitionUntil
  )
    return false;
  const d = runtime.definition.dark;
  const aim = direction(target.x - b.x, target.y - b.y);
  if (ability === namDeDarkSkills.blade) {
    if (runtime.cast || s.cast) return false;
    s.cast = {
      kind: 'blade',
      start: w.tick,
      releaseAt: w.tick + d.bladeWarningTicks,
      until: w.tick + d.bladeWarningTicks + 12,
      fx: aim.x,
      fy: aim.y,
      released: false,
    };
    s.nextBlade = w.tick + d.bladeGapTicks;
  } else if (ability === namDeDarkSkills.fist) {
    const activeAt = w.tick + d.fistWarningTicks;
    s.fists.push({
      id: ++s.serial,
      x: target.x,
      y: target.y,
      startedAt: w.tick,
      activeAt,
      until: activeAt + 21,
      resolved: false,
    });
    s.nextFist = w.tick + d.fistGapTicks;
    if (!runtime.cast && !s.cast)
      s.cast = {
        kind: 'fist',
        start: w.tick,
        releaseAt: w.tick + 9,
        until: w.tick + 15,
        fx: aim.x,
        fy: aim.y,
        released: false,
      };
  } else return false;
  b.fx = aim.x;
  b.fy = aim.y;
  if (s.cast) {
    b.pose = 'cast';
    b.castAbilityId = ability;
  }
  announceBossSkill(w, NAM_DE_ID, ability);
  return true;
}
/** Ground-space straight travel and collision stay authoritative; Z reports intent only. */
export function stepNamDeDark(w: World, c: SimulationConfig): boolean {
  const runtime = w.namDe,
    s = runtime?.dark,
    b = w.creeps.get(NAM_DE_ID);
  if (!s || !runtime || !b || b.hp <= 0) return false;
  const d = runtime.definition.dark;
  const heroes = [...w.heroes.values()]
    .filter((h) => h.hp > 0 && !h.bossSpectator)
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const [id] of s.guards)
    if (!heroes.some((h) => h.id === id)) s.guards.delete(id);
  if (!heroes.length) {
    clearNamDeDarkTransient(w);
    return false;
  }
  if (w.tick < s.transitionUntil) {
    b.pose = 'cast';
    return true;
  }
  if (
    w.tick >= s.nextFist &&
    !hasStatus(b, 'stun', w.tick) &&
    !hasStatus(b, 'silence', w.tick)
  )
    beginNamDeDarkCast(
      w,
      namDeDarkSkills.fist,
      heroes[Math.floor(w.random() * heroes.length)]!,
    );
  const target = heroes
    .filter((h) => !hasStatus(h, 'concealed', w.tick))
    .sort((a, z) => distance(a, b) - distance(z, b))[0];
  if (
    target &&
    w.tick >= s.nextBlade &&
    !hasStatus(b, 'stun', w.tick) &&
    !hasStatus(b, 'silence', w.tick)
  )
    beginNamDeDarkCast(w, namDeDarkSkills.blade, target);
  if (s.cast) {
    const cast = s.cast;
    b.pose = 'cast';
    b.fx = cast.fx;
    b.fy = cast.fy;
    if (!cast.released && w.tick >= cast.releaseAt) {
      cast.released = true;
      if (cast.kind === 'blade')
        s.blades.push({
          id: ++s.serial,
          x: b.x + cast.fx * 48,
          y: b.y + cast.fy * 48,
          fx: cast.fx,
          fy: cast.fy,
          startedAt: w.tick,
          traveled: 0,
          ownerId: NAM_DE_ID,
          reflected: false,
        });
    }
    if (w.tick >= cast.until) {
      delete s.cast;
      b.castAbilityId = '';
    }
  }
  const remaining: NamDeIceBlade[] = [];
  for (const blade of s.blades) {
    const from = { x: blade.x, y: blade.y };
    const step = d.bladeSpeed / c.tickRate;
    blade.x += blade.fx * step;
    blade.y += blade.fy * step;
    blade.traveled += step;
    let ended = blade.traveled >= d.bladeRange;
    if (blade.reflected) {
      if (
        segmentCircle(
          from,
          blade,
          b,
          d.bladeRadius + (b.stats?.radius ?? runtime.definition.stats.radius),
        ) !== undefined
      ) {
        ended = true;
        const hit = hurt(
          w,
          b,
          blade.ownerId,
          namDeDarkSkills.blade,
          b.maxHp * d.reflectedHpFraction,
          c,
          {
            critChance: 0,
            critMultiplier: 1,
            resolvedReflection: true,
            preserveFraction: true,
            fx: blade.fx,
            fy: blade.fy,
          },
        );
        if (hit && s.shield) {
          s.reflections++;
          cue(w, 'ice_reflected_hit', blade.ownerId);
          if (s.reflections >= d.reflectionsRequired) {
            s.shield = false;
            s.shatterAt = w.tick;
            cue(w, 'ice_shatter', blade.ownerId);
          }
        }
      }
    } else {
      const candidates = heroes
        .map((h) => ({
          h,
          t: segmentCircle(from, blade, h, d.bladeRadius + c.radius),
        }))
        .filter((v) => v.t !== undefined)
        .sort((a, z) => a.t! - z.t! || a.h.id.localeCompare(z.h.id));
      const h = candidates[0]?.h;
      if (h) {
        const guard = s.guards.get(h.id);
        if (guard && guard.until > w.tick && !hasStatus(h, 'stun', w.tick)) {
          guard.until = w.tick;
          guard.parryAt = w.tick;
          const aim = direction(b.x - h.x, b.y - h.y);
          blade.fx = aim.x;
          blade.fy = aim.y;
          blade.x = h.x;
          blade.y = h.y;
          blade.ownerId = h.id;
          blade.reflected = true;
          blade.traveled = 0;
          blade.startedAt = w.tick;
          cue(w, 'ice_parry', h.id, h);
        } else {
          ended = true;
          hurt(w, h, NAM_DE_ID, namDeDarkSkills.blade, d.bladeDamage, c, {
            critChance: 0,
            critMultiplier: 1,
            fx: blade.fx,
            fy: blade.fy,
          });
        }
      }
    }
    if (!ended) remaining.push(blade);
  }
  s.blades = remaining;
  for (const fist of s.fists)
    if (!fist.resolved && w.tick >= fist.activeAt) {
      fist.resolved = true;
      for (const h of heroes)
        if (
          ((h.x - fist.x) / (d.fistRadius + c.radius)) ** 2 +
            ((h.y - fist.y) / (d.fistRadiusY + c.radius)) ** 2 <=
          1
        ) {
          const landed = hurt(
            w,
            h,
            NAM_DE_ID,
            namDeDarkSkills.fist,
            d.fistDamage,
            c,
            { critChance: 0, critMultiplier: 1 },
          );
          if (landed && h.hp > 0)
            applyStatus(
              h,
              { kind: 'stun', magnitude: 1, durationTicks: d.fistStunTicks },
              NAM_DE_ID,
              namDeDarkSkills.fist,
              w.tick,
            );
        }
    }
  s.fists = s.fists.filter((f) => w.tick < f.until);
  return !!s.cast;
}
