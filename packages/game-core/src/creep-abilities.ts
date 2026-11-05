import { emit, hurt } from './combat.js';
import {
  direction,
  distance,
  moveCircle,
  segmentCircle,
  segmentRect,
  blocked,
} from './geometry.js';
import { applyStatus, displace, hasStatus, statusValue } from './status.js';
import { dungeonWaypoint } from './dungeon-navigation.js';
import type {
  Actor,
  Creep,
  Hero,
  Point,
  Rect,
  SimulationConfig,
  World,
} from './types.js';
import type {
  CreepAttack,
  CreepCue,
  CreepProfile,
  CreepActorRuntime,
} from './creep-abilities-types.js';

const neutral = { critChance: 0, critMultiplier: 1 };
export function creepProfile(
  enemy: Creep,
  config: SimulationConfig,
): CreepProfile | undefined {
  const data = config.creepCombat;
  if (!data) return;
  const id = enemy.invasion
    ? data.waveIds[enemy.invasion.wave - 1]
    : enemy.archetypeId;
  return id ? data.profiles[id] : undefined;
}
function runtime(world: World) {
  return (world.creepCombat ??= { actors: new Map(), effects: new Map() });
}
function actorState(world: World, enemy: Creep): CreepActorRuntime {
  const state = runtime(world);
  let a = state.actors.get(enemy.id);
  if (!a) {
    const hash = [...enemy.id].reduce(
      (n, c) => (n * 31 + c.charCodeAt(0)) >>> 0,
      0,
    );
    a = {
      nextSpecial: world.tick + 30 + (hash % 90),
      busyUntil: 0,
      deathHandled: false,
      guardUntil: 0,
      counterUntil: 0,
    };
    state.actors.set(enemy.id, a);
  }
  return a;
}
const clear = (
  from: Point,
  to: Point,
  config: SimulationConfig,
  ignored?: Rect,
) =>
  !config.collision.some(
    (w) => w !== ignored && segmentRect(from, to, w) !== undefined,
  );
function cue(
  world: World,
  enemy: Creep,
  spec: CreepAttack,
  abilityId: string,
  origin: Point,
  aim: Point,
  special: boolean,
  allowStatue = false,
  delay = 0,
  persistent = false,
): CreepCue {
  const activeAt = world.tick + spec.windup + delay;
  const duration =
    spec.mode === 'projectile'
      ? Math.ceil((spec.range / (spec.speed ?? 240)) * 30) + 1
      : spec.mode === 'dash'
        ? Math.ceil((spec.range / (spec.speed ?? 360)) * 30) + 1
        : (spec.duration ?? 1);
  const id = `creep_fx_${world.nextId++}`;
  const e: CreepCue = {
    id,
    castId: id,
    ownerId: enemy.id,
    abilityId,
    kind: `creep_${spec.mode}`,
    x: origin.x,
    y: origin.y,
    fx: aim.x,
    fy: aim.y,
    length: spec.range,
    radius: spec.radius,
    speed: spec.speed ?? 0,
    startedAt: world.tick,
    activeAt,
    expiresAt: activeAt + Math.max(6, duration),
    damageUntil: activeAt + duration,
    maxRadius: spec.halfAngle ?? Math.PI,
    previousRadius: 0,
    spec,
    damage: (enemy.stats?.damage ?? 0) * spec.damage,
    nextHit: activeAt,
    remaining: spec.range,
    hitIds: new Set(),
    special,
    released: persistent,
    allowStatue,
  };
  runtime(world).effects.set(id, e);
  return e;
}
function attack(
  world: World,
  enemy: Creep,
  profile: CreepProfile,
  spec: CreepAttack,
  target: Point,
  config: SimulationConfig,
  slot: 'basic' | 'special' | 'death',
  delay = 0,
  persistent = false,
) {
  const id = `creep_${profile.id}_${slot}`;
  const aim = direction(target.x - enemy.x, target.y - enemy.y);
  if (!aim.x && !aim.y) {
    aim.x = enemy.fx;
    aim.y = enemy.fy;
  }
  const origin = { x: enemy.x, y: enemy.y };
  const special = slot !== 'basic';
  const a = actorState(world, enemy);
  if (slot !== 'death') {
    a.busyUntil = Math.max(
      a.busyUntil,
      world.tick +
        spec.windup +
        (spec.mode === 'dash'
          ? Math.ceil((spec.range / (spec.speed ?? 360)) * config.tickRate)
          : 8) +
        (spec.hits ?? 1) * (spec.spacing ?? 0),
    );
    enemy.castAbilityId = id;
    enemy.encounterAction = {
      startedAt: world.tick,
      activeAt: world.tick + spec.windup,
      endsAt: a.busyUntil,
    };
    enemy.pose = special ? 'cast' : 'basic_attack';
    enemy.actionUntil = a.busyUntil;
    enemy.fx = aim.x;
    enemy.fy = aim.y;
    emit(world, {
      kind: special ? 'cast' : 'attack',
      sourceId: enemy.id,
      targetId: '',
      abilityId: id,
      x: enemy.x,
      y: enemy.y,
      fx: aim.x,
      fy: aim.y,
      damage: 0,
      critical: false,
    });
  }
  const make = (s: CreepAttack, p: Point, v = aim, d = delay) =>
    cue(world, enemy, s, id, p, v, special, slot === 'basic', d, persistent);
  if (spec.mode === 'projectile') {
    const count = spec.count ?? 1;
    for (let i = 0; i < count; i++) {
      const angle =
        Math.atan2(aim.y, aim.x) + (i - (count - 1) / 2) * (spec.spread ?? 0);
      make(spec, origin, { x: Math.cos(angle), y: Math.sin(angle) });
    }
  } else if (spec.mode === 'area' && spec.pattern === 'line') {
    for (let i = 1; i <= 4; i++)
      make(
        spec,
        { x: origin.x + aim.x * i * 45, y: origin.y + aim.y * i * 45 },
        aim,
        delay + (i - 1) * 7,
      );
  } else if (spec.mode === 'area' && spec.pattern === 'fan') {
    for (const angle of [-0.55, 0, 0.55])
      for (let i = 1; i <= 3; i++) {
        const t = Math.atan2(aim.y, aim.x) + angle;
        make(
          spec,
          {
            x: origin.x + Math.cos(t) * i * 46,
            y: origin.y + Math.sin(t) * i * 46,
          },
          aim,
          delay + (i - 1) * 9,
        );
      }
  } else if (spec.pattern === 'cross') {
    for (let i = 0; i < 2; i++) {
      const t = Math.atan2(aim.y, aim.x) + (i === 0 ? 0.55 : -0.55);
      const v = { x: Math.cos(t), y: Math.sin(t) };
      make(
        { ...spec, range: 180, pattern: undefined, hits: 1 },
        { x: target.x - v.x * 90, y: target.y - v.y * 90 },
        v,
        delay + i * (spec.spacing ?? 18),
      ).kind = 'creep_line';
    }
  } else {
    const point = spec.mode === 'area' && spec.range > 0 ? target : origin;
    if (spec.burrow)
      spec = { ...spec, range: Math.min(spec.range, distance(enemy, target)) };
    const count = spec.hits ?? 1;
    for (let i = 0; i < count; i++)
      make({ ...spec, hits: 1 }, point, aim, delay + i * (spec.spacing ?? 14));
  }
}
function victims(world: World, e: CreepCue): Actor[] {
  return [
    ...world.heroes.values(),
    ...(e.allowStatue && world.statue ? [world.statue] : []),
  ].filter((h) => h.hp > 0);
}
function hit(
  world: World,
  e: CreepCue,
  h: Actor,
  config: SimulationConfig,
  periodic = false,
) {
  const hp = h.hp;
  const valid =
    e.damage <= 0 ||
    hurt(world, h, e.ownerId, e.abilityId, e.damage, config, {
      ...neutral,
      periodic,
      fx: e.fx,
      fy: e.fy,
    });
  if (!valid || (e.damage > 0 && h.hp === hp)) return;
  if (world.heroes.has(h.id))
    for (const s of e.spec.statuses ?? []) {
      // The strongest DOT per element ticks once per second. More attackers cannot multiply its budget.
      applyStatus(h, s, e.ownerId, e.abilityId, world.tick);
    }
  if (e.spec.knockback && h.hp > 0 && world.heroes.has(h.id))
    displace(
      h,
      e.fx * e.spec.knockback,
      e.fy * e.spec.knockback,
      config.radius,
      config,
      world.tick,
    );
  const owner = world.creeps.get(e.ownerId);
  if (e.spec.lifesteal && owner && owner.hp > 0 && world.heroes.has(h.id))
    owner.hp = Math.min(
      owner.maxHp,
      owner.hp + Math.max(0, hp - h.hp) * e.spec.lifesteal,
    );
}
function field(
  world: World,
  e: CreepCue,
  spec: CreepAttack,
  point: Point,
  config: SimulationConfig,
) {
  const owner = world.creeps.get(e.ownerId);
  if (!owner) return;
  const child = cue(
    world,
    owner,
    spec,
    e.abilityId,
    point,
    { x: e.fx, y: e.fy },
    false,
    false,
    0,
    true,
  );
  child.damage = (owner.stats ?? config.creep).damage * spec.damage;
}
function inside(e: CreepCue, h: Actor, config: SimulationConfig) {
  const d = distance(e, h),
    r = worldRadius(h, config);
  if (e.kind === 'creep_line') {
    const end = { x: e.x + e.fx * e.length, y: e.y + e.fy * e.length };
    return segmentCircle(e, end, h, e.radius + r) !== undefined;
  }
  if (e.spec.pattern === 'ring') {
    const progress = Math.max(
      0,
      (e.nextHit - e.activeAt) / (e.expiresAt - e.activeAt),
    );
    return Math.abs(d - e.radius * progress) <= 16 + r;
  }
  if (e.spec.mode === 'arc')
    return (
      d <= e.length + r &&
      (d === 0 ||
        ((h.x - e.x) * e.fx + (h.y - e.y) * e.fy) / d >=
          Math.cos(e.spec.halfAngle ?? Math.PI / 3))
    );
  return d <= e.radius + r;
}
function worldRadius(h: Actor, config: SimulationConfig) {
  return 'nickname' in h
    ? config.radius
    : 'radius' in h
      ? Number(h.radius)
      : config.creep.radius;
}

/** Authoritative casts, swept missiles, collision-respecting dashes and persistent fields. */
export function stepCreepHazards(world: World, config: SimulationConfig): void {
  if (!config.creepCombat) return;
  const state = runtime(world);
  for (const enemy of world.creeps.values()) {
    const p = creepProfile(enemy, config);
    if (!p) continue;
    const a = actorState(world, enemy);
    enemy.stats ??= { ...config.creep };
    if (enemy.hp <= 0 && !a.deathHandled) {
      a.deathHandled = true;
      for (const [id, e] of state.effects)
        if (e.ownerId === enemy.id && !e.released) state.effects.delete(id);
      if (p.death)
        attack(world, enemy, p, p.death, enemy, config, 'death', 0, true);
    }
    if (enemy.hp > 0 && a.deathHandled) {
      state.actors.delete(enemy.id);
      actorState(world, enemy);
    }
  }
  for (const id of state.actors.keys())
    if (!world.creeps.has(id)) {
      state.actors.delete(id);
      for (const [key, e] of state.effects)
        if (e.ownerId === id) state.effects.delete(key);
    }
  if (world.tick % config.tickRate === 0)
    for (const h of world.heroes.values()) {
      if (h.hp <= 0) continue;
      for (const kind of ['poison', 'burn'] as const) {
        const s = h.statuses
          ?.filter(
            (s) =>
              s.kind === kind &&
              s.until > world.tick &&
              s.abilityId.startsWith('creep_'),
          )
          .sort(
            (a, b) =>
              b.magnitude - a.magnitude || a.sourceId.localeCompare(b.sourceId),
          )[0];
        if (s)
          hurt(
            world,
            h,
            s.sourceId,
            s.abilityId,
            Math.min(s.magnitude, h.maxHp * config.creepCombat.dotCapFraction),
            config,
            { ...neutral, periodic: true },
          );
      }
    }
  for (const [id, e] of state.effects) {
    const owner = world.creeps.get(e.ownerId);
    if (
      world.tick >= e.expiresAt ||
      (!e.released &&
        (!owner ||
          owner.hp <= 0 ||
          hasStatus(owner, 'stun', world.tick) ||
          (e.special && hasStatus(owner, 'silence', world.tick)) ||
          (!e.special && hasStatus(owner, 'disarm', world.tick))))
    ) {
      state.effects.delete(id);
      continue;
    }
    if (world.tick < e.activeAt) continue;
    if (!e.released) {
      e.released = true;
      emit(world, {
        kind: 'effect',
        sourceId: e.ownerId,
        targetId: '',
        abilityId: e.abilityId,
        x: e.x,
        y: e.y,
        fx: e.fx,
        fy: e.fy,
        radius: e.radius,
        stage: 'release',
        damage: 0,
        critical: false,
      });
    }
    const spec = e.spec;
    if (world.tick >= e.damageUntil) continue;
    if (
      spec.mode === 'guard' ||
      spec.mode === 'counter' ||
      spec.mode === 'buff'
    ) {
      if (owner && owner.hp > 0 && world.tick === e.activeAt) {
        const a = actorState(world, owner);
        if (spec.mode === 'guard') a.guardUntil = e.expiresAt;
        else if (spec.mode === 'counter') {
          a.counterUntil = e.expiresAt;
          a.counter = spec;
        } else
          for (const ally of world.creeps.values())
            if (
              ally.hp > 0 &&
              creepProfile(ally, config) &&
              distance(ally, owner) <= spec.radius
            ) {
              // strongest-only attack acceleration, consumed by the common attack cadence below
              applyStatus(
                ally,
                {
                  kind: 'speed_buff',
                  magnitude: 0.2,
                  secondary: 1,
                  durationTicks: spec.duration ?? 75,
                },
                owner.id,
                e.abilityId,
                world.tick,
              );
            }
      }
      continue;
    }
    if (spec.mode === 'projectile') {
      const start = { x: e.x, y: e.y };
      const n = Math.min(e.remaining, e.speed / config.tickRate),
        end = { x: e.x + e.fx * n, y: e.y + e.fy * n };
      let wall = blocked(end, e.radius, config.width, config.height, [])
        ? 0
        : Infinity;
      for (const w of config.collision)
        if (!(e.allowStatue && w === world.statue?.collision))
          wall = Math.min(
            wall,
            segmentRect(start, end, w, e.radius) ?? Infinity,
          );
      const crossed = victims(world, e)
        .filter((h) => !e.hitIds.has(h.id))
        .map((h) => ({
          h,
          t: segmentCircle(start, end, h, e.radius + worldRadius(h, config)),
        }))
        .filter(
          (v): v is { h: Actor; t: number } => v.t !== undefined && v.t < wall,
        )
        .sort((a, b) => a.t - b.t || a.h.id.localeCompare(b.h.id));
      for (const { h } of spec.piercing ? crossed : crossed.slice(0, 1)) {
        e.hitIds.add(h.id);
        hit(world, e, h, config);
      }
      e.x = end.x;
      e.y = end.y;
      e.remaining -= n;
      if (
        wall !== Infinity ||
        (!spec.piercing && crossed.length > 0) ||
        e.remaining <= 0
      ) {
        if (spec.field)
          field(world, e, spec.field, crossed[0]?.h ?? end, config);
        state.effects.delete(id);
      }
      continue;
    }
    if (spec.mode === 'dash') {
      if (!owner || owner.hp <= 0 || hasStatus(owner, 'stun', world.tick)) {
        state.effects.delete(id);
        continue;
      }
      const start = { x: owner.x, y: owner.y },
        n = Math.min(e.remaining, e.speed / config.tickRate);
      moveCircle(
        owner,
        { x: e.fx * n, y: e.fy * n },
        (owner.stats ?? config.creep).radius,
        config.width,
        config.height,
        config.collision,
      );
      e.x = owner.x;
      e.y = owner.y;
      e.remaining -= n;
      if (spec.trail && world.tick % 6 === 0)
        field(world, e, spec.trail, owner, config);
      for (const h of victims(world, e))
        if (
          !e.hitIds.has(h.id) &&
          (!spec.burrow || e.remaining <= 0) &&
          segmentCircle(
            spec.burrow ? owner : start,
            owner,
            h,
            e.radius + worldRadius(h, config),
          ) !== undefined
        ) {
          e.hitIds.add(h.id);
          hit(world, e, h, config);
        }
      if (e.remaining <= 0 || distance(start, owner) < n * 0.1)
        state.effects.delete(id);
      continue;
    }
    if (world.tick < e.nextHit) continue;
    const periodic = (spec.duration ?? 1) > 1 && spec.pattern !== 'ring';
    for (const h of victims(world, e))
      if (
        (periodic || !e.hitIds.has(h.id)) &&
        inside(e, h, config) &&
        clear(e, h, config)
      ) {
        e.hitIds.add(h.id);
        hit(world, e, h, config, periodic);
      }
    if (spec.suicide && owner && owner.hp > 0)
      hurt(
        world,
        owner,
        owner.id,
        e.abilityId,
        owner.hp * 10000,
        config,
        neutral,
      );
    e.nextHit = world.tick + (spec.interval ?? 1);
  }
}

/** Reuses the existing leash/target selection. Returns false for legacy fixtures and boss-owned AI. */
export function stepCreepActor(
  world: World,
  enemy: Creep,
  hero: Hero | undefined,
  objective: Actor | undefined,
  config: SimulationConfig,
): boolean {
  const p = creepProfile(enemy, config);
  if (!p || enemy.controlled || enemy.encounterBoss || enemy.bossEncounter)
    return false;
  const a = actorState(world, enemy),
    stats = enemy.stats ?? config.creep;
  if (enemy.hp <= 0) return true;
  const target = hero ?? objective;
  if (!target || hasStatus(enemy, 'stun', world.tick)) {
    enemy.pose = 'idle';
    return true;
  }
  if (world.tick < a.busyUntil) return true;
  enemy.castAbilityId = '';
  delete enemy.encounterAction;
  const range =
    hero || p.basic.mode === 'projectile'
      ? p.basic.range
      : stats.attackRange + ('radius' in target ? Number(target.radius) : 0);
  const inRange =
    distance(enemy, target) <= range + (hero ? config.radius : 0) &&
    clear(
      enemy,
      target,
      config,
      target === objective ? world.statue?.collision : undefined,
    );
  const dir = direction(target.x - enemy.x, target.y - enemy.y);
  enemy.fx = dir.x;
  enemy.fy = dir.y;
  if (
    hero &&
    p.special &&
    world.tick >= a.nextSpecial &&
    !hasStatus(enemy, 'silence', world.tick) &&
    distance(enemy, hero) <= Math.max(p.special.range, 150) + config.radius &&
    clear(enemy, hero, config)
  ) {
    const busy = [...runtime(world).effects.values()]
      .filter(
        (e) =>
          e.special &&
          world.tick < e.activeAt &&
          distance(e, enemy) < config.creepCombat!.castGroupRadius,
      )
      .map((e) => e.ownerId);
    if (new Set(busy).size < config.creepCombat!.maxNearbyCasts) {
      attack(world, enemy, p, p.special, hero, config, 'special');
      a.nextSpecial = world.tick + p.special.cooldown;
      enemy.cooldown = Math.max(enemy.cooldown, a.busyUntil + 12);
      return true;
    }
  }
  if (!inRange) {
    const waypoint = dungeonWaypoint(enemy, target, world.tick, config);
    const v = direction(waypoint.x - enemy.x, waypoint.y - enemy.y);
    moveCircle(
      enemy,
      {
        x:
          (v.x *
            stats.speed *
            (1 - Math.min(0.85, statusValue(enemy, 'slow', world.tick)))) /
          config.tickRate,
        y:
          (v.y *
            stats.speed *
            (1 - Math.min(0.85, statusValue(enemy, 'slow', world.tick)))) /
          config.tickRate,
      },
      stats.radius,
      config.width,
      config.height,
      config.collision,
    );
    enemy.pose = 'walk';
    return true;
  }
  if (world.tick >= enemy.cooldown && !hasStatus(enemy, 'disarm', world.tick)) {
    if (
      hero &&
      p.basic.mode === 'projectile' &&
      distance(enemy, hero) < p.basic.range * 0.35
    )
      moveCircle(
        enemy,
        {
          x: (-dir.x * stats.speed * 0.6) / config.tickRate,
          y: (-dir.y * stats.speed * 0.6) / config.tickRate,
        },
        stats.radius,
        config.width,
        config.height,
        config.collision,
      );
    const buff = statusValue(enemy, 'speed_buff', world.tick);
    enemy.cooldown =
      world.tick +
      Math.ceil(
        (p.basic.cooldown *
          (1 + statusValue(enemy, 'attack_slow', world.tick))) /
          (1 + buff),
      );
    if (!hero && objective) {
      // Statue pressure is deliberately normal damage only. No DOT, self-heal, explosion or special.
      if (p.basic.mode === 'projectile') {
        attack(
          world,
          enemy,
          p,
          { ...p.basic, damage: 1, statuses: [], lifesteal: 0 },
          objective,
          config,
          'basic',
        );
      } else {
        emit(world, {
          kind: 'attack',
          sourceId: enemy.id,
          targetId: objective.id,
          abilityId: 'creep_strike',
          x: enemy.x,
          y: enemy.y,
          damage: 0,
          critical: false,
        });
        hurt(
          world,
          objective,
          enemy.id,
          'creep_strike',
          stats.damage,
          config,
          neutral,
        );
        enemy.pose = 'basic_attack';
        enemy.actionUntil = world.tick + 12;
      }
    } else attack(world, enemy, p, p.basic, target, config, 'basic');
  } else enemy.pose = 'idle';
  return true;
}

/** Boss support actors retain their encounter steering and normal attacks. */
export function stepControlledCreepSpecial(
  world: World,
  enemy: Creep,
  target: Hero,
  config: SimulationConfig,
): boolean {
  const p = creepProfile(enemy, config);
  if (
    !p?.special ||
    enemy.hp <= 0 ||
    hasStatus(enemy, 'stun', world.tick) ||
    hasStatus(enemy, 'silence', world.tick)
  )
    return false;
  const a = actorState(world, enemy);
  if (world.tick < a.busyUntil) return true;
  if (
    world.tick < a.nextSpecial ||
    distance(enemy, target) > Math.max(150, p.special.range) ||
    !clear(enemy, target, config)
  )
    return false;
  const busy = new Set(
    [...runtime(world).effects.values()]
      .filter(
        (e) =>
          e.special &&
          world.tick < e.activeAt &&
          distance(e, enemy) < config.creepCombat!.castGroupRadius,
      )
      .map((e) => e.ownerId),
  );
  if (busy.size >= config.creepCombat!.maxNearbyCasts) return false;
  attack(world, enemy, p, p.special, target, config, 'special');
  a.nextSpecial = world.tick + p.special.cooldown;
  return true;
}

/** Front-only defense/counter, resolved before the normal armor/crit/shield pipeline. */
export function creepGuardDamage(
  world: World,
  target: Actor,
  sourceId: string,
  raw: number,
  config: SimulationConfig,
  periodic = false,
): number {
  if (periodic || !world.heroes.has(sourceId)) return raw;
  const enemy = world.creeps.get(target.id),
    a = world.creepCombat?.actors.get(target.id),
    source = world.heroes.get(sourceId);
  if (!enemy || !a || !source) return raw;
  const v = direction(source.x - target.x, source.y - target.y);
  if (v.x * target.fx + v.y * target.fy < 0.25) return raw;
  if (a.counterUntil > world.tick && a.counter) {
    a.counterUntil = 0;
    const p = creepProfile(enemy, config);
    if (p)
      attack(
        world,
        enemy,
        p,
        { ...a.counter, mode: 'arc', windup: 24, duration: 1 },
        source,
        config,
        'special',
      );
    return raw * 0.5;
  }
  return a.guardUntil > world.tick ? raw * 0.5 : raw;
}
