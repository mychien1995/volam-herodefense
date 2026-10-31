import { direction, distance, segmentCircle, segmentRect } from './geometry.js';
import { emit, hurt, offensiveStats } from './combat.js';
import { applyStatus, displace, hasStatus } from './status.js';
import { rankedAbility, characterStats } from './progression.js';
import { captureConfinement, confineMovement } from './confinement.js';
import type {
  Ability,
  AllyEffect,
  Creep,
  Hero,
  ProjectileEffect,
  SimulationConfig,
  World,
} from './types.js';

export function equippedAbility(
  hero: Hero,
  slot: number,
  config: SimulationConfig,
): Ability | undefined {
  const id = hero.skillIds?.[slot];
  if (hero.progression) return id ? rankedAbility(hero, id, config) : undefined;
  return id === undefined
    ? config.skills[slot]
    : ((Object.hasOwn(config.skillCatalogue ?? {}, id)
        ? config.skillCatalogue?.[id]
        : undefined) ?? config.skills.find((s) => s.id === id));
}
function clearLine(
  world: World,
  hero: Hero,
  enemy: Creep,
  config: SimulationConfig,
): boolean {
  return (
    enemy.hp > 0 &&
    world.heroes.has(hero.id) &&
    !config.collision.some((w) => segmentRect(hero, enemy, w) !== undefined)
  );
}
export function targetDirection(
  world: World,
  hero: Hero,
  range: number,
  config?: SimulationConfig,
) {
  const enemy = [...world.creeps.values()]
    .filter(
      (e) =>
        e.hp > 0 &&
        distance(e, hero) <= range &&
        !config?.collision.some((w) => segmentRect(hero, e, w) !== undefined),
    )
    .sort(
      (a, b) =>
        distance(a, hero) - distance(b, hero) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )[0];
  return enemy
    ? direction(enemy.x - hero.x, enemy.y - hero.y)
    : { x: hero.fx, y: hero.fy };
}
function damageFor(
  hero: Hero,
  raw: number,
  config: SimulationConfig,
  tick: number,
  growthScale = 1,
): number {
  if (hero.progression)
    return raw <= 0
      ? 0
      : Math.max(
          1,
          raw +
            (characterStats(hero, config, tick).total.attackPower -
              config.progression!.schools[hero.schoolId]!.base.attackPower) *
              growthScale,
        );
  return raw <= 0
    ? 0
    : raw +
        growthScale *
          Math.max(0, hero.level - 1) *
          (config.attackPerLevel +
            (hero.schoolId === 'cai_bang'
              ? (config.caiBangPassive?.damagePerLevel ?? 0)
              : 0));
}
/** Capture origin/direction/offense once. Delayed and spread shots never retarget. */
function queueProjectiles(
  world: World,
  hero: Hero,
  ability: Ability,
  effect: ProjectileEffect,
  config: SimulationConfig,
  dx: number,
  dy: number,
  stage?: string,
): void {
  const crit = offensiveStats(world, hero.id, config);
  const refund = effect.manaRefund
    ? { amount: effect.manaRefund, used: false }
    : undefined;
  for (let i = 0; i < effect.count; i++) {
    const angle = effect.radial
      ? (Math.PI * 2 * i) / effect.count
      : effect.spreadAngle && effect.count > 1
        ? -effect.spreadAngle / 2 +
          (effect.spreadAngle * i) / (effect.count - 1)
        : 0;
    world.shots.push({
      tick: world.tick + i * effect.spacingTicks,
      ownerId: hero.id,
      ability: { ...ability, effect },
      x: hero.x,
      y: hero.y,
      dx: dx * Math.cos(angle) - dy * Math.sin(angle),
      dy: dx * Math.sin(angle) + dy * Math.cos(angle),
      rawDamage: damageFor(
        hero,
        effect.damage,
        config,
        world.tick,
        effect.attackPowerScale ?? 1,
      ),
      ...crit,
      ...(refund ? { refund } : {}),
      ...(stage ? { stage } : {}),
    });
  }
}
function cue(
  world: World,
  hero: Hero,
  abilityId: string,
  stage: string,
  radius = 0,
  heading: Pick<Hero, 'fx' | 'fy'> = hero,
): void {
  emit(world, {
    kind: 'pulse',
    sourceId: hero.id,
    targetId: '',
    abilityId,
    x: hero.x,
    y: hero.y,
    fx: heading.fx,
    fy: heading.fy,
    radius,
    stage,
    damage: 0,
    critical: false,
  });
}
function strikeArc(
  world: World,
  hero: Hero,
  ability: Ability,
  config: SimulationConfig,
  heading: { fx: number; fy: number },
  crit: { critChance: number; critMultiplier: number },
  raw?: number,
): void {
  const effect = ability.effect;
  if (effect.mode !== 'arc') return;
  if (effect.windupTicks)
    for (const spec of ability.selfStatuses ?? [])
      applyStatus(hero, spec, hero.id, ability.id, world.tick);
  let targets = [...world.creeps.values()]
    .filter((enemy) => {
      const d = direction(enemy.x - hero.x, enemy.y - hero.y);
      return (
        clearLine(world, hero, enemy, config) &&
        distance(enemy, hero) <=
          effect.range + (enemy.stats ?? config.creep).radius &&
        d.x * heading.fx + d.y * heading.fy >= Math.cos(effect.halfAngle)
      );
    })
    .sort((a, b) => {
      const da = direction(a.x - hero.x, a.y - hero.y),
        db = direction(b.x - hero.x, b.y - hero.y);
      return (
        db.x * heading.fx +
          db.y * heading.fy -
          (da.x * heading.fx + da.y * heading.fy) ||
        distance(a, hero) - distance(b, hero) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
      );
    });
  if (effect.singleTarget) targets = targets.slice(0, 1);
  const rawDamage = raw ?? damageFor(hero, effect.damage, config, world.tick);
  let hit = false;
  targets.forEach((enemy, i) => {
    if (effect.damage > 0) {
      hit =
        hurt(
          world,
          enemy,
          hero.id,
          ability.id,
          rawDamage * (i === 0 ? 1 : effect.cleave),
          config,
          {
            ...crit,
            fx: heading.fx,
            fy: heading.fy,
            combo: ability.combo,
            armorPenetration: effect.armorPenetration,
            slowedBonus: effect.slowedBonus,
          },
        ) || hit;
    }
    if (enemy.hp <= 0) return;
    const before = { x: enemy.x, y: enemy.y };
    for (const status of effect.statuses ?? [])
      applyStatus(enemy, status, hero.id, ability.id, world.tick);
    if (effect.pull) {
      const d = direction(hero.x - enemy.x, hero.y - enemy.y),
        n = Math.min(effect.pull, Math.max(0, distance(enemy, hero) - 26));
      displace(
        enemy,
        d.x * n,
        d.y * n,
        (enemy.stats ?? config.creep).radius,
        config,
        world.tick,
      );
    }
    if (effect.knockback)
      displace(
        enemy,
        heading.fx * effect.knockback,
        heading.fy * effect.knockback,
        (enemy.stats ?? config.creep).radius,
        config,
        world.tick,
      );
    confineMovement(world, enemy, before, config);
    if (effect.statuses?.length || effect.pull) {
      enemy.hits[hero.id] = world.tick;
      emit(world, {
        kind: 'effect',
        sourceId: hero.id,
        targetId: enemy.id,
        abilityId: ability.id,
        x: enemy.x,
        y: enemy.y,
        fx: heading.fx,
        fy: heading.fy,
        damage: 0,
        critical: false,
        stage: 'control',
      });
    }
  });
  if (hit && effect.manaRefund) {
    const refund = Math.min(effect.manaRefund, hero.maxMana - hero.mana);
    hero.mana += refund;
    cue(world, hero, ability.id, 'refund');
  }
  if (effect.projectileProc && world.random() < effect.projectileProc.chance) {
    const aim = targetDirection(
      world,
      hero,
      effect.projectileProc.effect.range,
      config,
    );
    queueProjectiles(
      world,
      hero,
      ability,
      effect.projectileProc.effect,
      config,
      aim.x,
      aim.y,
    );
    cue(world, hero, ability.id, 'proc');
  }
}
export function perform(
  world: World,
  hero: Hero,
  ability: Ability,
  config: SimulationConfig,
  kind: 'attack' | 'cast',
  stage?: string,
): void {
  const effect = ability.effect,
    crit = offensiveStats(world, hero.id, config);
  if (effect.mode === 'projectile' && !effect.useFacing) {
    const aim = targetDirection(world, hero, effect.range, config);
    hero.fx = aim.x;
    hero.fy = aim.y;
  }
  hero.pose = kind === 'cast' ? 'cast' : 'basic_attack';
  hero.actionUntil = kind === 'attack' ? hero.cooldown : world.tick + 12;
  hero.castAbilityId = ability.id;
  emit(world, {
    kind,
    sourceId: hero.id,
    targetId: '',
    abilityId: ability.id,
    damage: 0,
    critical: false,
    x: hero.x,
    y: hero.y,
    fx: hero.fx,
    fy: hero.fy,
    radius: 'range' in effect ? effect.range : 0,
    ...(stage ? { stage } : {}),
  });
  if (!(effect.mode === 'arc' && effect.windupTicks))
    for (const spec of ability.selfStatuses ?? [])
      applyStatus(hero, spec, hero.id, ability.id, world.tick);
  if (ability.allies)
    supportAllies(world, hero, ability.id, ability.allies, config);
  if (effect.mode === 'projectile') {
    queueProjectiles(
      world,
      hero,
      ability,
      effect,
      config,
      hero.fx,
      hero.fy,
      stage,
    );
  } else if (effect.mode === 'arc') {
    if (effect.windupTicks) {
      const duration = effect.windupTicks + 1;
      applyStatus(
        hero,
        { kind: 'channel', durationTicks: duration, magnitude: 1 },
        hero.id,
        ability.id,
        world.tick,
      );
      hero.actionUntil = world.tick + duration;
      world.actions ??= [];
      world.actions.push({
        id: `action_${world.nextId++}`,
        ownerId: hero.id,
        abilityId: ability.id,
        kind: 'arc',
        until: world.tick + duration,
        nextTick: world.tick + effect.windupTicks,
        remaining: 1,
        fx: hero.fx,
        fy: hero.fy,
        hitIds: [],
        effect,
        ability,
        rawDamage: damageFor(hero, effect.damage, config, world.tick),
        finisherDamage: 0,
        ...crit,
      });
    } else strikeArc(world, hero, ability, config, hero, crit);
  } else if (effect.mode === 'support') {
    if (effect.durationTicks > 1)
      applyStatus(
        hero,
        {
          kind: 'support_aura',
          durationTicks: effect.durationTicks,
          magnitude: effect.radius,
        },
        hero.id,
        ability.id,
        world.tick,
      );
    world.supports = (world.supports ?? []).filter(
      (s) => s.ownerId !== hero.id || s.abilityId !== ability.id,
    );
    world.supports.push({
      ownerId: hero.id,
      abilityId: ability.id,
      until: world.tick + effect.durationTicks,
      nextTick: world.tick,
      effect,
    });
  } else if (effect.mode === 'mana_shield') {
    const active = hero.statuses?.some(
      (s) =>
        s.kind === 'mana_shield' &&
        s.abilityId === ability.id &&
        s.until > world.tick,
    );
    if (effect.toggle && active) {
      hero.statuses = hero.statuses!.filter(
        (s) => !(s.kind === 'mana_shield' && s.abilityId === ability.id),
      );
      cue(world, hero, ability.id, 'toggle_off');
      return;
    }
    applyStatus(
      hero,
      {
        kind: 'mana_shield',
        durationTicks: effect.toggle
          ? Number.MAX_SAFE_INTEGER - world.tick
          : effect.durationTicks,
        magnitude: effect.absorbFraction,
        secondary: effect.manaPerDamage,
        toggle: effect.toggle,
      },
      hero.id,
      ability.id,
      world.tick,
    );
  } else if (effect.mode === 'counter') {
    applyStatus(
      hero,
      {
        kind: 'counter',
        durationTicks: effect.durationTicks,
        magnitude: damageFor(hero, effect.damage, config, world.tick),
        secondary: effect.range,
        evade: effect.evade,
      },
      hero.id,
      ability.id,
      world.tick,
    );
  } else if (effect.mode === 'area') {
    world.areas = (world.areas ?? []).filter(
      (a) => a.ownerId !== hero.id || a.abilityId !== ability.id,
    );
    world.areas.push({
      id: `area_${world.nextId++}`,
      ownerId: hero.id,
      abilityId: ability.id,
      x: hero.x,
      y: hero.y,
      until: world.tick + effect.durationTicks,
      nextTick: world.tick,
      effect,
      rawDamage: damageFor(hero, effect.damage, config, world.tick),
      ...crit,
    });
    captureConfinement(world, config);
  } else if (effect.mode === 'buff') {
    if (effect.cooldownReduction)
      applyStatus(
        hero,
        {
          kind: 'cooldown_buff',
          durationTicks: effect.durationTicks,
          magnitude: effect.cooldownReduction,
        },
        hero.id,
        ability.id,
        world.tick,
      );
    if (effect.movementSpeed || effect.attackSpeed)
      applyStatus(
        hero,
        {
          kind: 'speed_buff',
          durationTicks: effect.durationTicks,
          magnitude: effect.movementSpeed ?? 0,
          secondary: effect.attackSpeed ?? 0,
        },
        hero.id,
        ability.id,
        world.tick,
      );
    if (effect.critChance || effect.critMultiplier)
      applyStatus(
        hero,
        {
          kind: 'crit_buff',
          durationTicks: effect.durationTicks,
          magnitude: effect.critChance,
          secondary: effect.critMultiplier,
        },
        hero.id,
        ability.id,
        world.tick,
      );
  } else {
    if (effect.mode === 'dash' && effect.counter)
      applyStatus(
        hero,
        {
          kind: 'counter',
          durationTicks: effect.counter.durationTicks,
          magnitude: damageFor(hero, effect.counter.damage, config, world.tick),
          secondary: effect.counter.range,
          evade: false,
        },
        hero.id,
        ability.id,
        world.tick,
      );
    world.actions ??= [];
    const duration =
      effect.mode === 'dash'
        ? Math.ceil((effect.distance / effect.speed) * config.tickRate)
        : effect.spacingTicks * effect.hits + 1;
    applyStatus(
      hero,
      {
        kind: effect.mode === 'dash' ? 'dash' : 'channel',
        durationTicks: duration,
        magnitude: effect.mode === 'multi_hit' ? effect.range : 1,
      },
      hero.id,
      ability.id,
      world.tick,
    );
    hero.actionUntil = world.tick + Math.max(12, duration);
    world.actions.push({
      id: `action_${world.nextId++}`,
      ownerId: hero.id,
      abilityId: ability.id,
      kind: effect.mode,
      until: world.tick + duration,
      nextTick: world.tick,
      remaining: effect.mode === 'dash' ? effect.distance : effect.hits,
      fx: hero.fx,
      fy: hero.fy,
      hitIds: [],
      effect,
      ability,
      comboTargets: {},
      rawDamage: damageFor(hero, effect.damage, config, world.tick),
      finisherDamage:
        effect.mode === 'multi_hit'
          ? damageFor(hero, effect.finisherDamage, config, world.tick)
          : 0,
      ...crit,
    });
  }
}
/** Stationary zones use current target positions, one hit per target per scheduled tick. */
export function stepAreas(world: World, config: SimulationConfig): void {
  world.areas = (world.areas ?? []).filter(
    (a) => a.until > world.tick && (world.heroes.get(a.ownerId)?.hp ?? 0) > 0,
  );
  for (const area of world.areas) {
    if (world.tick < area.nextTick) continue;
    area.nextTick += area.effect.tickInterval;
    emit(world, {
      kind: 'pulse',
      sourceId: area.ownerId,
      targetId: '',
      abilityId: area.abilityId,
      x: area.x,
      y: area.y,
      radius: area.effect.radius,
      stage: 'area_tick',
      damage: 0,
      critical: false,
    });
    for (const enemy of world.creeps.values()) {
      if (
        enemy.hp <= 0 ||
        distance(area, enemy) >
          area.effect.radius + (enemy.stats ?? config.creep).radius ||
        config.collision.some((w) => segmentRect(area, enemy, w) !== undefined)
      )
        continue;
      hurt(
        world,
        enemy,
        area.ownerId,
        area.abilityId,
        area.rawDamage,
        config,
        area,
      );
      if (enemy.hp > 0)
        for (const status of area.effect.statuses ?? [])
          applyStatus(enemy, status, area.ownerId, area.abilityId, world.tick);
    }
  }
}
export function stepSkillActions(world: World, config: SimulationConfig): void {
  for (const action of world.actions ?? []) {
    if (action.until <= world.tick) continue;
    const hero = world.heroes.get(action.ownerId);
    if (!hero || hero.hp <= 0 || hasStatus(hero, 'stun', world.tick)) {
      action.until = world.tick;
      if (hero && hero.hp > 0) {
        hero.actionUntil = world.tick;
        hero.pose = 'idle';
      }
      continue;
    }
    if (action.effect.mode === 'arc') {
      if (world.tick >= action.nextTick) {
        strikeArc(
          world,
          hero,
          action.ability!,
          config,
          action,
          action,
          action.rawDamage,
        );
        cue(
          world,
          hero,
          action.abilityId,
          'strike',
          action.effect.range,
          action,
        );
        action.until = world.tick;
      }
    } else if (action.effect.mode === 'dash') {
      const e = action.effect,
        old = { x: hero.x, y: hero.y },
        n = Math.min(action.remaining, e.speed / config.tickRate);
      displace(hero, action.fx * n, action.fy * n, config.radius, config);
      if (e.invulnerable && distance(old, hero) > 0.01)
        applyStatus(
          hero,
          { kind: 'dash_guard', durationTicks: 1, magnitude: 1 },
          hero.id,
          action.abilityId,
          world.tick,
        );
      action.remaining -= n;
      for (const enemy of world.creeps.values()) {
        if (
          e.damage <= 0 ||
          action.hitIds.includes(enemy.id) ||
          (enemy.x - old.x) * action.fx + (enemy.y - old.y) * action.fy < 0 ||
          !clearLine(world, hero, enemy, config) ||
          segmentCircle(
            old,
            hero,
            enemy,
            e.radius + (enemy.stats ?? config.creep).radius,
          ) === undefined
        )
          continue;
        action.hitIds.push(enemy.id);
        hurt(
          world,
          enemy,
          hero.id,
          action.abilityId,
          action.rawDamage,
          config,
          action,
        );
        if (enemy.hp > 0 && e.stunTicks > 0)
          applyStatus(
            enemy,
            { kind: 'stun', durationTicks: e.stunTicks, magnitude: 1 },
            hero.id,
            action.abilityId,
            world.tick,
          );
      }
      if (action.remaining <= 0 || distance(old, hero) < 0.01)
        action.until = world.tick;
    } else if (
      action.effect.mode === 'multi_hit' &&
      world.tick >= action.nextTick
    ) {
      const e = action.effect,
        finish = action.remaining === 0,
        radius = finish ? e.finisherRange : e.range;
      cue(world, hero, action.abilityId, finish ? 'finisher' : 'sweep', radius);
      if (
        !finish &&
        e.projectileBurst &&
        (e.hits - action.remaining) % (e.projectileBurstEvery ?? 1) === 0
      )
        queueProjectiles(
          world,
          hero,
          action.ability!,
          e.projectileBurst,
          config,
          action.fx,
          action.fy,
        );
      for (const enemy of world.creeps.values())
        if (
          (!finish || e.finisherDamage > 0) &&
          (e.halfAngle === undefined ||
            (() => {
              const d = direction(enemy.x - hero.x, enemy.y - hero.y);
              return d.x * action.fx + d.y * action.fy >= Math.cos(e.halfAngle);
            })()) &&
          clearLine(world, hero, enemy, config) &&
          distance(hero, enemy) <= radius + (enemy.stats ?? config.creep).radius
        )
          hurt(
            world,
            enemy,
            hero.id,
            action.abilityId,
            finish ? action.finisherDamage : action.rawDamage,
            config,
            {
              ...action,
              slowedBonus: e.slowedBonus,
              combo: action.ability?.combo,
              comboTargets: action.comboTargets,
            },
          );
      action.remaining--;
      action.nextTick += e.spacingTicks;
      if (finish) action.until = world.tick;
    }
  }
  const finished = (world.actions ?? []).filter((a) => a.until <= world.tick);
  for (const a of finished) {
    const h = world.heroes.get(a.ownerId);
    if (h)
      h.statuses = (h.statuses ?? []).filter(
        (s) =>
          !(
            (s.kind === 'dash' || s.kind === 'channel') &&
            s.abilityId === a.abilityId
          ),
      );
  }
  world.actions = (world.actions ?? []).filter((a) => a.until > world.tick);
}

/** Allies are living heroes in this authoritative zone; never creeps or the statue. */
function supportAllies(
  world: World,
  hero: Hero,
  abilityId: string,
  effect: AllyEffect,
  config: SimulationConfig,
): void {
  for (const ally of world.heroes.values()) {
    if (
      ally.hp <= 0 ||
      distance(hero, ally) > effect.radius ||
      config.collision.some((w) => segmentRect(hero, ally, w) !== undefined)
    )
      continue;
    for (const spec of effect.statuses ?? [])
      applyStatus(ally, spec, hero.id, abilityId, world.tick);
    if (effect.heal) {
      const amount = Math.min(effect.heal, ally.maxHp - ally.hp);
      ally.hp += amount;
      if (amount > 0)
        emit(world, {
          kind: 'pulse',
          sourceId: hero.id,
          targetId: ally.id,
          abilityId,
          x: ally.x,
          y: ally.y,
          damage: amount,
          critical: false,
          stage: 'heal',
        });
    }
  }
}
export function stepSupports(world: World, config: SimulationConfig): void {
  world.supports = (world.supports ?? []).filter(
    (s) => s.until > world.tick && (world.heroes.get(s.ownerId)?.hp ?? 0) > 0,
  );
  for (const support of world.supports) {
    if (world.tick < support.nextTick) continue;
    support.nextTick += support.effect.tickInterval;
    const hero = world.heroes.get(support.ownerId)!;
    supportAllies(world, hero, support.abilityId, support.effect, config);
    cue(world, hero, support.abilityId, 'support_tick', support.effect.radius);
  }
}
