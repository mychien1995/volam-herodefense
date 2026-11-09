import {
  blocked,
  direction,
  distance,
  insideEllipse,
  segmentCircle,
  segmentRect,
} from './geometry.js';
import { emit, hurt, offensiveStats } from './combat.js';
import { applyStatus, displace, hasStatus } from './status.js';
import { rankedAbility, characterStats } from './progression.js';
import { captureConfinement, confineMovement } from './confinement.js';
import { dragonDiveTarget } from './dragon-dive.js';
import { startFortune } from './fortune.js';
import {
  recordTamLienHit,
  stepTamLienTram,
  tamLienTram,
} from './tam-lien-tram.js';
import type {
  Ability,
  AreaEffect,
  AllyEffect,
  Creep,
  Hero,
  MultiHitEffect,
  ProjectileEffect,
  SimulationConfig,
  SkillAction,
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
  comboTargets: Record<string, boolean> = {},
  snapshot?: { rawDamage: number; critChance: number; critMultiplier: number },
): void {
  const crit = snapshot
    ? {
        critChance: snapshot.critChance,
        critMultiplier: snapshot.critMultiplier,
      }
    : offensiveStats(world, hero.id, config);
  const refund = effect.manaRefund
    ? { amount: effect.manaRefund, used: false }
    : undefined;
  const spread = ability.equipmentAttack?.spread;
  for (let index = 0; index < effect.count; index++) {
    // Give the central ray first contact if multiple rays overlap at launch.
    const i = spread && index < 2 ? 1 - index : index;
    const angle = effect.radial
      ? (Math.PI * 2 * i) / effect.count
      : effect.spreadAngle && effect.count > 1
        ? -effect.spreadAngle / 2 +
          (effect.spreadAngle * i) / (effect.count - 1)
        : 0;
    world.shots.push({
      ...(effect.dragonDive
        ? {
            dragonTarget: dragonDiveTarget(world, hero, dx, dy, effect, config),
          }
        : {}),
      tick: world.tick + i * effect.spacingTicks,
      ownerId: hero.id,
      comboTargets,
      ability: { ...ability, effect },
      x: hero.x - dy * (effect.laneOffsets?.[i] ?? 0),
      y: hero.y + dx * (effect.laneOffsets?.[i] ?? 0),
      dx: dx * Math.cos(angle) - dy * Math.sin(angle),
      dy: dx * Math.sin(angle) + dy * Math.cos(angle),
      rawDamage:
        (snapshot?.rawDamage ??
          damageFor(
            hero,
            effect.damage,
            config,
            world.tick,
            effect.attackPowerScale ?? 1,
          )) * (spread && i !== 1 ? spread.sideDamage : 1),
      ...crit,
      ...(refund ? { refund } : {}),
      ...(effect.scatter ? { stage: `travel_${i}` } : stage ? { stage } : {}),
    });
  }
  if (effect.scatter) {
    const burst = effect.scatter;
    (world.pendingScatters ??= []).push({
      tick:
        world.tick +
        (effect.count - 1) * effect.spacingTicks +
        burst.appearanceTicks,
      ownerId: hero.id,
      abilityId: ability.id,
      effect: burst,
      rawDamage: damageFor(
        hero,
        burst.damage,
        config,
        world.tick,
        burst.attackPowerScale,
      ),
      ...crit,
    });
  }
}

export function stepScatters(world: World, config: SimulationConfig): void {
  if (!world.pendingScatters?.length) return;
  const due = world.pendingScatters.filter((burst) => burst.tick <= world.tick);
  world.pendingScatters = world.pendingScatters.filter(
    (burst) => burst.tick > world.tick,
  );
  for (const burst of due) {
    const owner = world.heroes.get(burst.ownerId);
    if (!owner || owner.hp <= 0) continue;
    const effect = burst.effect;
    const turn = world.random() * Math.PI * 2;
    for (let index = 0; index < effect.count; index++) {
      const angle =
        turn +
        index * ((Math.PI * 2) / effect.count) +
        (world.random() - 0.5) * 0.26;
      const spread =
        effect.innerRadius +
        world.random() * (effect.outerRadius - effect.innerRadius);
      let point = { x: owner.x, y: owner.y };
      // Pull a blocked marker toward the caster so the warning stays on walkable ground.
      for (let radius = spread; radius > 0; radius -= 12) {
        const candidate = {
          x: owner.x + Math.cos(angle) * radius,
          y: owner.y + Math.sin(angle) * radius,
        };
        if (
          !blocked(
            candidate,
            1,
            config.width,
            config.height,
            config.collision,
          ) &&
          (!config.heroBounds ||
            insideEllipse(candidate, config.heroBounds, 1)) &&
          !config.collision.some(
            (wall) => segmentRect(owner, candidate, wall) !== undefined,
          )
        ) {
          point = candidate;
          break;
        }
      }
      const duration = effect.delayTicks + 1;
      (world.areas ??= []).push({
        ...point,
        id: `area_${world.nextId++}`,
        ownerId: owner.id,
        abilityId: burst.abilityId,
        until: world.tick + duration,
        nextTick: world.tick + effect.delayTicks,
        effect: {
          mode: 'area',
          durationTicks: duration,
          tickInterval: duration,
          radius: effect.radius,
          damage: effect.damage,
        },
        rawDamage: burst.rawDamage,
        critChance: burst.critChance,
        critMultiplier: burst.critMultiplier,
      });
    }
  }
}

function openArea(
  world: World,
  hero: Hero,
  abilityId: string,
  effect: AreaEffect,
  config: SimulationConfig,
  rawDamage: number,
  crit: { critChance: number; critMultiplier: number },
): void {
  world.areas = (world.areas ?? []).filter(
    (a) => a.ownerId !== hero.id || a.abilityId !== abilityId,
  );
  world.areas.push({
    id: `area_${world.nextId++}`,
    ownerId: hero.id,
    abilityId,
    x: hero.x,
    y: hero.y,
    until: world.tick + effect.durationTicks,
    nextTick: world.tick,
    effect,
    rawDamage,
    critChance: crit.critChance,
    critMultiplier: crit.critMultiplier,
  });
  captureConfinement(world, config);
}

export function skyfallAiming(world: World, ownerId: string): boolean {
  return (world.areas ?? []).some(
    (area) =>
      area.ownerId === ownerId &&
      area.effect.skyfall &&
      world.tick <
        area.until - area.effect.durationTicks + area.effect.skyfall.aimTicks,
  );
}

function openSkyfall(
  world: World,
  hero: Hero,
  abilityId: string,
  effect: AreaEffect,
  config: SimulationConfig,
  rawDamage: number,
  crit: { critChance: number; critMultiplier: number },
): void {
  const sky = effect.skyfall!;
  const boss = (enemy: Creep) =>
    Number(
      !!(enemy.encounterBoss || enemy.bossEncounter || enemy.waveBossActor),
    );
  const target = [...world.creeps.values()]
    .filter((enemy) => {
      const dx = enemy.x - hero.x;
      const dy = enemy.y - hero.y;
      const range = Math.hypot(dx, dy);
      return (
        range > 0 &&
        range <= sky.range &&
        dx * hero.fx + dy * hero.fy >= range * Math.cos(sky.halfAngle) &&
        clearLine(world, hero, enemy, config)
      );
    })
    .sort(
      (a, b) =>
        boss(b) - boss(a) ||
        distance(a, hero) - distance(b, hero) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )[0];
  let point = { x: hero.x, y: hero.y };
  if (target) {
    point = { x: target.x, y: target.y };
    const aim = direction(point.x - hero.x, point.y - hero.y);
    hero.fx = aim.x;
    hero.fy = aim.y;
  } else {
    for (let range = sky.fallbackDistance; range > 0; range -= 12) {
      const candidate = {
        x: hero.x + hero.fx * range,
        y: hero.y + hero.fy * range,
      };
      if (
        !blocked(candidate, 1, config.width, config.height, config.collision) &&
        !config.collision.some(
          (wall) => segmentRect(hero, candidate, wall) !== undefined,
        )
      ) {
        point = candidate;
        break;
      }
    }
  }
  hero.actionUntil = world.tick + sky.aimTicks;
  applyStatus(
    hero,
    { kind: 'channel', durationTicks: sky.aimTicks, magnitude: 1 },
    hero.id,
    abilityId,
    world.tick,
  );
  (world.areas ??= []).push({
    ...point,
    launch: { x: hero.x, y: hero.y, fx: hero.fx, fy: hero.fy },
    id: `area_${world.nextId++}`,
    ownerId: hero.id,
    abilityId,
    until: world.tick + effect.durationTicks,
    nextTick: world.tick + sky.riseTicks + sky.quietTicks + sky.firstFallTicks,
    effect,
    rawDamage,
    ...crit,
  });
}
function queueInwardVolley(
  world: World,
  action: SkillAction,
  effect: MultiHitEffect,
  config: SimulationConfig,
): void {
  const pattern = effect.inwardBurst!;
  const shot = effect.projectileBurst!;
  const center = action.origin!;
  const index = effect.hits - action.remaining;
  const rawDamage = action.rawDamage;
  for (let row = 0; row < 4; row++) {
    const dx = row % 2 ? pattern.offsetX : -pattern.offsetX;
    const dy = row < 2 ? -pattern.offsetY : pattern.offsetY;
    const radius = Math.hypot(dx, dy);
    const ux = -dx / radius;
    const uy = -dy / radius;
    const x = center.x + dx + ux * pattern.launchOffset;
    const y = center.y + dy + uy * pattern.launchOffset;
    const origin = { x, y };
    if (
      blocked(
        origin,
        shot.radius,
        config.width,
        config.height,
        config.collision,
      ) ||
      config.collision.some(
        (wall) => segmentRect(center, origin, wall, shot.radius) !== undefined,
      )
    )
      continue;
    const variant = (index + row) % pattern.bends.length;
    world.shots.push({
      tick: world.tick,
      ownerId: action.ownerId,
      ability: { ...action.ability!, effect: shot },
      x,
      y,
      dx: ux,
      dy: uy,
      rawDamage,
      critChance: action.critChance,
      critMultiplier: action.critMultiplier,
      stage: `dao_crescent_${variant}`,
      curve: {
        origin,
        dx: ux,
        dy: uy,
        bend: pattern.bends[variant]!,
        crossing: (radius - pattern.launchOffset) / shot.range,
      },
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
  hitIndex?: number,
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
    ...(hitIndex === undefined ? {} : { hitIndex }),
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
  const origin = {
    x: hero.x + heading.fx * (effect.originOffset ?? 0),
    y: hero.y + heading.fy * (effect.originOffset ?? 0),
  };
  if (effect.windupTicks)
    for (const spec of ability.selfStatuses ?? [])
      applyStatus(hero, spec, hero.id, ability.id, world.tick);
  let targets = [...world.creeps.values()]
    .filter((enemy) => {
      const d = direction(enemy.x - hero.x, enemy.y - hero.y);
      if (effect.lineWidth !== undefined) {
        const dx = enemy.x - origin.x,
          dy = enemy.y - origin.y;
        const along = dx * heading.fx + dy * heading.fy;
        const across = Math.abs(dx * heading.fy - dy * heading.fx);
        return (
          clearLine(world, hero, enemy, config) &&
          along >= 0 &&
          along <= effect.range &&
          across <= effect.lineWidth / 2 + (enemy.stats ?? config.creep).radius
        );
      }
      return (
        clearLine(world, hero, enemy, config) &&
        distance(enemy, origin) <=
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
      const landed = hurt(
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
          armorPenetration: Math.max(
            effect.armorPenetration ?? 0,
            ability.equipmentAttack?.penetration ?? 0,
          ),
          lifesteal: ability.equipmentAttack?.lifesteal,
          slowedBonus: effect.slowedBonus,
        },
      );
      if (landed && !hit && ability.id === tamLienTram.basicId)
        recordTamLienHit(world, hero, enemy.id, config);
      hit ||= landed;
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
    if (
      effect.knockback &&
      (effect.knockbackChance === undefined ||
        world.random() < effect.knockbackChance)
    )
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
  if (effect.residualArea) {
    const field = effect.residualArea;
    world.areas ??= [];
    world.areas.push({
      id: `area_${world.nextId++}`,
      ownerId: hero.id,
      abilityId: ability.id,
      x: hero.x,
      y: hero.y,
      until: world.tick + field.durationTicks,
      nextTick: world.tick,
      effect: field,
      rawDamage: damageFor(hero, field.damage, config, world.tick),
      critChance: crit.critChance,
      critMultiplier: crit.critMultiplier,
    });
    cue(world, hero, ability.id, 'field_birth', field.radius, heading);
  }
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
  const original = ability.effect;
  if (original.mode === 'dash' && hasStatus(hero, 'root', world.tick)) return;
  const ready =
    original.mode === 'multi_hit' &&
    original.comboBurstOnly &&
    ability.combo &&
    (world.combos ?? []).some(
      (c) =>
        c.sourceId === hero.id &&
        c.id === ability.combo!.id &&
        c.step === 2 &&
        c.until > world.tick &&
        (() => {
          const e = world.creeps.get(c.targetId);
          if (!e || e.hp <= 0 || !clearLine(world, hero, e, config))
            return false;
          const dx = e.x - hero.x,
            dy = e.y - hero.y;
          return (
            dx * hero.fx + dy * hero.fy >= 0 &&
            Math.abs(dx * hero.fy - dy * hero.fx) <=
              Math.max(
                0,
                ...(original.projectileBurst?.laneOffsets ?? []).map(Math.abs),
              ) +
                (original.projectileBurst?.radius ?? 0) +
                (e.stats ?? config.creep).radius &&
            distance(e, hero) <=
              original.range + (e.stats ?? config.creep).radius
          );
        })(),
    );
  const effect =
      original.mode === 'multi_hit' &&
      original.comboBurstOnly &&
      !ready &&
      original.projectileBurst
        ? {
            ...original,
            hits: 1,
            projectileBurst: {
              ...original.projectileBurst,
              count: 1,
              laneOffsets: [0],
            },
          }
        : original,
    crit = offensiveStats(world, hero.id, config);
  if (effect.mode === 'projectile' && !effect.useFacing) {
    const aim = targetDirection(world, hero, effect.range, config);
    hero.fx = aim.x;
    hero.fy = aim.y;
  }
  hero.pose = kind === 'cast' ? 'cast' : 'basic_attack';
  hero.actionUntil =
    kind === 'attack'
      ? ability.basicPoseTicks
        ? world.tick + ability.basicPoseTicks
        : ability.id === tamLienTram.basicId
          ? world.tick + 8
          : hero.cooldown
      : world.tick + 12;
  hero.castAbilityId = ability.id;
  hero.actionStartedAt = world.tick;
  if (kind === 'attack') hero.basicStage = stage;
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
    if (effect.windupTicks) {
      const duration = effect.windupTicks + (effect.recoveryTicks ?? 0) + 1;
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
        startedAt: world.tick,
        ownerId: hero.id,
        abilityId: ability.id,
        kind: 'projectile',
        until: world.tick + duration,
        nextTick: world.tick + effect.windupTicks,
        remaining: 1,
        fx: hero.fx,
        fy: hero.fy,
        hitIds: [],
        effect,
        ability,
        rawDamage: damageFor(
          hero,
          effect.damage,
          config,
          world.tick,
          effect.attackPowerScale ?? 1,
        ),
        finisherDamage: 0,
        ...crit,
      });
    } else
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
      const duration = effect.durationTicks ?? effect.windupTicks + 1;
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
        startedAt: world.tick,
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
  } else if (effect.mode === 'guard_counter') {
    applyStatus(
      hero,
      {
        kind: 'guard_counter',
        durationTicks: effect.durationTicks,
        magnitude: effect.reduction,
        secondary: effect.range,
      },
      hero.id,
      ability.id,
      world.tick,
    );
    const guard = hero.statuses!.find(
      (s) => s.kind === 'guard_counter' && s.abilityId === ability.id,
    )!;
    guard.receivedDamage = 0;
    guard.thresholdFraction = effect.thresholdFraction;
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
  } else if (effect.mode === 'fortune') {
    startFortune(world, hero, ability.id, effect);
  } else if (effect.mode === 'area') {
    const rawDamage = damageFor(hero, effect.damage, config, world.tick);
    if (effect.skyfall) {
      openSkyfall(world, hero, ability.id, effect, config, rawDamage, crit);
    } else if (effect.windupTicks) {
      const duration = effect.windupTicks + 6;
      applyStatus(
        hero,
        { kind: 'channel', durationTicks: duration, magnitude: 1 },
        hero.id,
        ability.id,
        world.tick,
      );
      hero.actionUntil = world.tick + duration;
      (world.actions ??= []).push({
        id: `action_${world.nextId++}`,
        ownerId: hero.id,
        abilityId: ability.id,
        startedAt: world.tick,
        kind: 'area',
        until: world.tick + duration,
        nextTick: world.tick + effect.windupTicks,
        remaining: 1,
        fx: hero.fx,
        fy: hero.fy,
        hitIds: [],
        effect,
        rawDamage,
        finisherDamage: 0,
        ...crit,
      });
    } else openArea(world, hero, ability.id, effect, config, rawDamage, crit);
  } else if (effect.mode === 'buff') {
    if (effect.burnAura) {
      world.areas ??= [];
      world.areas = world.areas.filter(
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
        effect: {
          mode: 'area',
          durationTicks: effect.durationTicks,
          tickInterval: effect.burnAura.tickInterval,
          radius: effect.burnAura.radius,
          damage: effect.burnAura.damage,
          followOwner: true,
        },
        rawDamage: damageFor(
          hero,
          effect.burnAura.damage,
          config,
          world.tick,
          effect.burnAura.attackPowerScale ?? 1,
        ),
        ...crit,
      });
    }
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
        : (effect.durationTicks ?? effect.spacingTicks * effect.hits + 1);
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
    const inward = effect.mode === 'multi_hit' ? effect.inwardBurst : undefined;
    const damageEffect =
      effect.mode === 'multi_hit' && inward ? effect.projectileBurst! : effect;
    world.actions.push({
      startedAt: world.tick,
      id: `action_${world.nextId++}`,
      ownerId: hero.id,
      abilityId: ability.id,
      kind: effect.mode,
      until: world.tick + duration,
      nextTick: world.tick + (inward?.windupTicks ?? 0),
      ...(inward ? { origin: { x: hero.x, y: hero.y } } : {}),
      remaining: effect.mode === 'dash' ? effect.distance : effect.hits,
      fx: effect.mode === 'dash' && effect.backward ? -hero.fx : hero.fx,
      fy: effect.mode === 'dash' && effect.backward ? -hero.fy : hero.fy,
      hitIds: [],
      effect,
      ability,
      comboTargets: {},
      rawDamage: damageFor(
        hero,
        damageEffect.damage,
        config,
        world.tick,
        'attackPowerScale' in damageEffect
          ? (damageEffect.attackPowerScale ?? 1)
          : 1,
      ),
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
    if (area.effect.followOwner) {
      const owner = world.heroes.get(area.ownerId)!;
      area.x = owner.x;
      area.y = owner.y;
    }
    if (world.tick < area.nextTick) continue;
    area.nextTick += area.effect.tickInterval;
    const { volley } = area.effect;
    if (volley) {
      const { radius, durationTicks, tickInterval } = area.effect;
      const damage = area.rawDamage / Math.ceil(durationTicks / tickInterval);
      const effect: ProjectileEffect = {
        mode: 'projectile',
        damage,
        radius: volley.projectileRadius,
        speed: volley.speed,
        range: radius,
        count: 1,
        spacingTicks: 0,
        splashRadius: 0,
        burnDamage: 0,
        burnTicks: 0,
      };
      for (const enemy of world.creeps.values()) {
        if (
          enemy.hp <= 0 ||
          distance(area, enemy) > radius ||
          config.collision.some(
            (w) => segmentRect(area, enemy, w) !== undefined,
          )
        )
          continue;
        const aim = direction(enemy.x - area.x, enemy.y - area.y);
        const id = `projectile_${world.nextId++}`;
        world.projectiles.set(id, {
          id,
          abilityId: area.abilityId,
          ownerId: area.ownerId,
          targetId: enemy.id,
          x: area.x,
          y: area.y,
          vx: aim.x * effect.speed,
          vy: aim.y * effect.speed,
          remaining: radius,
          effect,
          rawDamage: damage,
          critChance: area.critChance,
          critMultiplier: area.critMultiplier,
          stage: 'volley',
        });
      }
      continue;
    }
    if (!area.effect.oncePerTarget)
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
        (area.effect.oncePerTarget && area.hitIds?.includes(enemy.id)) ||
        distance(area, enemy) >
          area.effect.radius + (enemy.stats ?? config.creep).radius ||
        config.collision.some((w) => segmentRect(area, enemy, w) !== undefined)
      )
        continue;
      if (area.effect.oncePerTarget) (area.hitIds ??= []).push(enemy.id);
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
    if (
      !hero ||
      hero.hp <= 0 ||
      hasStatus(hero, 'stun', world.tick) ||
      (action.effect.mode === 'dash' && hasStatus(hero, 'root', world.tick))
    ) {
      action.until = world.tick;
      world.shots = world.shots.filter(
        (s) =>
          s.ownerId !== action.ownerId || s.ability.id !== action.abilityId,
      );
      for (const [id, projectile] of world.projectiles)
        if (
          projectile.ownerId === action.ownerId &&
          projectile.abilityId === action.abilityId
        )
          world.projectiles.delete(id);
      world.areas = (world.areas ?? []).filter(
        (a) => a.ownerId !== action.ownerId || a.abilityId !== action.abilityId,
      );
      if (world.pendingScatters)
        world.pendingScatters = world.pendingScatters.filter(
          (burst) =>
            burst.ownerId !== action.ownerId ||
            burst.abilityId !== action.abilityId,
        );
      if (hero) cue(world, hero, action.abilityId, 'cancel');
      if (hero && hero.hp > 0) {
        hero.actionUntil = world.tick;
        hero.pose = 'idle';
      }
      continue;
    }
    if (action.effect.mode === 'projectile') {
      if (world.tick >= action.nextTick && action.remaining > 0) {
        queueProjectiles(
          world,
          hero,
          action.ability!,
          action.effect,
          config,
          action.fx,
          action.fy,
          'travel',
          {},
          action,
        );
        cue(
          world,
          hero,
          action.abilityId,
          'release',
          action.effect.range,
          action,
        );
        action.remaining = 0;
      }
    } else if (action.effect.mode === 'area') {
      if (world.tick >= action.nextTick && action.remaining > 0) {
        openArea(
          world,
          hero,
          action.abilityId,
          action.effect,
          config,
          action.rawDamage,
          action,
        );
        action.remaining = 0;
      }
    } else if (action.effect.mode === 'arc') {
      if (world.tick >= action.nextTick && action.remaining > 0) {
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
        action.remaining = 0;
        if (action.effect.durationTicks === undefined)
          action.until = world.tick;
      }
    } else if (action.tamLien) {
      stepTamLienTram(world, hero, action, config);
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
        const landed = hurt(
          world,
          enemy,
          hero.id,
          action.abilityId,
          action.rawDamage,
          config,
          action,
        );
        if (
          landed &&
          action.abilityId === 'phi_anh_tram' &&
          !action.tamLienCharged
        ) {
          recordTamLienHit(world, hero, enemy.id, config);
          action.tamLienCharged = true;
        }
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
      if (e.inwardBurst) {
        if (action.remaining > 0) {
          queueInwardVolley(world, action, e, config);
          action.remaining--;
          action.nextTick += e.inwardBurst.intervalTicks;
        }
        continue;
      }
      const index =
        action.abilityId === 'that_tinh_kiem' && !finish
          ? e.hits - action.remaining
          : undefined;
      cue(
        world,
        hero,
        action.abilityId,
        finish ? 'finisher' : 'sweep',
        radius,
        index === undefined ? hero : action,
        index,
      );
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
          undefined,
          action.comboTargets,
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
      action.nextTick +=
        e.durationTicks && e.finisherDamage > 0
          ? (e.durationTicks - 1) / e.hits
          : e.spacingTicks;
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
