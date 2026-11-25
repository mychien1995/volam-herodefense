import { nguDoc } from './ngu-doc-ids.js';
import { executeNguDocAbility, aimNguDocWorms } from './ngu-doc-combat.js';
import { duongMon, duongMonFan } from './duong-mon-ids.js';
import { opponent, opponents, targetRadius } from './opponents.js';
import { conLuan, fiveSwordPoints } from './con-luan-ids.js';
import { conLuanPlants, resetConLuanDashOnEntry } from './con-luan-combat.js';
import {
  blocked,
  direction,
  distance,
  insideEllipse,
  segmentCircle,
  segmentRect,
  moveCircle,
} from './geometry.js';
import { emit, hurt, offensiveStats } from './combat.js';
import {
  applyStatus,
  displace,
  hasStatus,
  movementSkillLocked,
  selectableTarget,
} from './status.js';
import { rankedAbility, characterStats, skillRank } from './progression.js';
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
  ComboSpec,
  Actor,
  Creep,
  Hero,
  MultiHitEffect,
  Point,
  ProjectileEffect,
  SimulationConfig,
  SkillAction,
  StatusSpec,
  World,
} from './types.js';
import {
  consumeStaffCharges,
  revealOnAction,
} from './skill-revise-passives.js';

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
  enemy: Actor,
  config: SimulationConfig,
  projectile = false,
): boolean {
  return (
    enemy.hp > 0 &&
    world.heroes.has(hero.id) &&
    !(config.combatCollision ?? config.collision).some(
      (w) =>
        (!projectile || w !== world.statue?.collision) &&
        segmentRect(hero, enemy, w) !== undefined,
    )
  );
}
export function basicTargetInRange(
  world: World,
  hero: Hero,
  target: Actor,
  ability: Ability,
  config: SimulationConfig,
): boolean {
  const effect = ability.effect;
  const projectile = effect.mode === 'projectile';
  if (!projectile && effect.mode !== 'arc') return false;
  const reach =
    effect.range + (projectile ? 0 : targetRadius(world, target, config));
  return (
    selectableTarget(target, world.tick) &&
    distance(hero, target) <= reach &&
    clearLine(world, hero, target, config, projectile)
  );
}

export function targetDirection(
  world: World,
  hero: Hero,
  range: number,
  config?: SimulationConfig,
  preferredCombo?: ComboSpec['id'],
) {
  const primed =
    preferredCombo === undefined
      ? undefined
      : new Set(
          (world.combos ?? [])
            .filter(
              (step) =>
                step.sourceId === hero.id &&
                step.id === preferredCombo &&
                step.step === 2 &&
                step.until > world.tick,
            )
            .map((step) => step.targetId),
        );
  const isPrimedAhead = (enemy: Actor) => {
    if (!primed?.has(enemy.id)) return false;
    const heading = direction(enemy.x - hero.x, enemy.y - hero.y);
    return heading.x * hero.fx + heading.y * hero.fy >= 0.5;
  };
  const enemy = [...opponents(world, hero.id)]
    .filter(
      (e) =>
        selectableTarget(e, world.tick) &&
        distance(e, hero) <= range &&
        !config?.collision.some(
          (w) =>
            w !== world.statue?.collision &&
            segmentRect(hero, e, w) !== undefined,
        ),
    )
    .sort(
      (a, b) =>
        Number(isPrimedAhead(b)) - Number(isPrimedAhead(a)) ||
        distance(a, hero) - distance(b, hero) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )[0];
  const aim = enemy
    ? direction(enemy.x - hero.x, enemy.y - hero.y)
    : { x: hero.fx, y: hero.fy };
  return aim.x || aim.y
    ? aim
    : hero.fx || hero.fy
      ? { x: hero.fx, y: hero.fy }
      : { x: 1, y: 0 };
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
  snapshot?: {
    rawDamage: number;
    critChance: number;
    critMultiplier: number;
    areaCenter?: Point;
  },
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
  for (
    let index = 0;
    index < (effect.scatter?.replaceProjectiles ? 0 : effect.count);
    index++
  ) {
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
            dragonTarget: dragonDiveTarget(
              world,
              hero,
              dx,
              dy,
              effect,
              config,
              hero.id,
            ),
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
      ...(burst.centerOnTarget
        ? {
            center:
              snapshot?.areaCenter ??
              castAreaCenter(
                world,
                hero,
                {
                  mode: 'area',
                  durationTicks: 1,
                  tickInterval: 1,
                  radius: burst.radius,
                  damage: 0,
                  nearestRange: ability.focusRange ?? effect.range,
                },
                config,
              ),
          }
        : {}),
      ...(burst.stage === 'ice_bomb'
        ? { launch: { x: hero.x, y: hero.y, fx: dx, fy: dy } }
        : {}),
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
      const center = burst.center ?? owner;
      let point = { x: center.x, y: center.y };
      // Pull a blocked marker toward the caster so the warning stays on walkable ground.
      for (let radius = spread; radius > 0; radius -= 12) {
        const candidate = {
          x: center.x + Math.cos(angle) * radius,
          y: center.y + Math.sin(angle) * radius,
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
          !(config.combatCollision ?? config.collision).some(
            (wall) => segmentRect(center, candidate, wall) !== undefined,
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
        ...(effect.stage ? { stage: effect.stage } : {}),
        ...(burst.launch ? { launch: burst.launch } : {}),
        ...(burst.abilityId === duongMon.flowers
          ? { launch: { x: owner.x, y: owner.y, fx: owner.fx, fy: owner.fy } }
          : {}),
        until: world.tick + duration,
        nextTick: world.tick + effect.delayTicks,
        effect: {
          mode: 'area',
          durationTicks: duration,
          tickInterval: duration,
          radius: effect.radius,
          damage: effect.damage,
          ...(effect.statuses ? { statuses: effect.statuses } : {}),
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
  center: Point = hero,
): void {
  world.areas ??= [];
  if (
    !effect.passiveField &&
    abilityId !== conLuan.detonate &&
    abilityId !== duongMon.trap
  )
    world.areas = world.areas.filter(
      (a) => a.ownerId !== hero.id || a.abilityId !== abilityId,
    );
  world.areas.push({
    id: `area_${world.nextId++}`,
    ownerId: hero.id,
    abilityId,
    x: center.x,
    y: center.y,
    until: world.tick + effect.durationTicks,
    nextTick: world.tick + (abilityId === duongMon.trap ? 8 : 0),
    effect,
    rawDamage,
    critChance: crit.critChance,
    critMultiplier: crit.critMultiplier,
    ...(effect.expireBurst
      ? {
          expireRawDamage: damageFor(
            hero,
            effect.expireBurst.damage,
            config,
            world.tick,
          ),
        }
      : {}),
  });
  if (abilityId === duongMon.trap) {
    const traps = world.areas.filter(
      (a) =>
        a.ownerId === hero.id &&
        a.abilityId === abilityId &&
        a.until > world.tick,
    );
    if (traps.length > 5) {
      const removed = new Set(traps.slice(0, traps.length - 5));
      world.areas = world.areas.filter((a) => !removed.has(a));
    }
  }
  captureConfinement(world, config);
}

function castAreaCenter(
  world: World,
  hero: Hero,
  effect: AreaEffect,
  config: SimulationConfig,
): Point {
  if (effect.nearestRange !== undefined) {
    const target = [...opponents(world, hero.id)]
      .filter(
        (enemy) =>
          selectableTarget(enemy, world.tick) &&
          distance(hero, enemy) <= effect.nearestRange! &&
          clearLine(world, hero, enemy, config),
      )
      .sort(
        (a, b) =>
          distance(hero, a) - distance(hero, b) || a.id.localeCompare(b.id),
      )[0];
    if (target) return { x: target.x, y: target.y };
    const point = { x: hero.x, y: hero.y };
    moveCircle(
      point,
      { x: hero.fx * effect.nearestRange, y: hero.fy * effect.nearestRange },
      1,
      config.width,
      config.height,
      config.collision,
    );
    return point;
  }
  return {
    x: hero.x + hero.fx * (effect.forwardOffset ?? 0),
    y: hero.y + hero.fy * (effect.forwardOffset ?? 0),
  };
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
  const boss = (
    enemy: Pick<Creep, 'encounterBoss' | 'bossEncounter' | 'waveBossActor'>,
  ) =>
    Number(
      !!(enemy.encounterBoss || enemy.bossEncounter || enemy.waveBossActor),
    );
  const target = [...opponents(world, hero.id)]
    .filter((enemy) => {
      const dx = enemy.x - hero.x;
      const dy = enemy.y - hero.y;
      const range = Math.hypot(dx, dy);
      return (
        range > 0 &&
        range <= sky.range &&
        dx * hero.fx + dy * hero.fy >= range * Math.cos(sky.halfAngle) &&
        clearLine(world, hero, enemy, config, true)
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
        !(config.combatCollision ?? config.collision).some(
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
      (config.combatCollision ?? config.collision).some(
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
  strikePhase?: string,
): void {
  const effect = ability.effect;
  if (effect.mode !== 'arc') return;
  const origin = {
    x: hero.x + heading.fx * (effect.originOffset ?? 0),
    y: hero.y + heading.fy * (effect.originOffset ?? 0),
  };
  const start =
    effect.originStartOffset === undefined
      ? origin
      : {
          x: hero.x + heading.fx * effect.originStartOffset,
          y: hero.y + heading.fy * effect.originStartOffset,
        };
  if (effect.windupTicks)
    for (const spec of ability.selfStatuses ?? [])
      applyStatus(hero, spec, hero.id, ability.id, world.tick);
  let targets = [...opponents(world, hero.id)]
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
          across <= effect.lineWidth / 2 + targetRadius(world, enemy, config)
        );
      }
      return (
        clearLine(world, hero, enemy, config) &&
        segmentCircle(
          start,
          origin,
          enemy,
          effect.range + targetRadius(world, enemy, config),
        ) !== undefined &&
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
  // Vi Đà's hand contact ends before its 189-unit ground eruption.
  const viDaContactReach = 120;
  let hit = false;
  let damageDealt = 0;
  targets.forEach((enemy, i) => {
    let contacted = effect.damage <= 0;
    if (effect.damage > 0) {
      const hpBefore = enemy.hp;
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
          cleaveIndex: i,
          hitPhase:
            ability.id === 'vi_da_quyen'
              ? (enemy.x - hero.x) * heading.fx +
                  (enemy.y - hero.y) * heading.fy <=
                viDaContactReach
                ? 'near'
                : 'far'
              : strikePhase,
          armorPenetration: Math.max(
            effect.armorPenetration ?? 0,
            ability.equipmentAttack?.penetration ?? 0,
          ),
          lifesteal: ability.equipmentAttack?.lifesteal,
          slowedBonus: effect.slowedBonus,
        },
      );
      contacted = landed;
      if (landed && !hit && ability.id === tamLienTram.basicId)
        recordTamLienHit(world, hero, enemy.id, config);
      if (landed && effect.lifesteal)
        damageDealt += Math.max(0, hpBefore - enemy.hp);
      hit ||= landed;
    }
    if (!contacted) return;
    if (effect.manaSteal && world.random() < (effect.knockbackChance ?? 1)) {
      const victim = world.heroes.get(enemy.id);
      const drained = victim
        ? Math.min(victim.mana, effect.manaSteal.amount)
        : effect.manaSteal.manaLessRefund;
      if (victim) victim.mana -= drained;
      hero.mana = Math.min(hero.maxMana, hero.mana + drained);
      const before = { x: enemy.x, y: enemy.y };
      if (effect.knockback)
        displace(
          enemy,
          heading.fx * effect.knockback,
          heading.fy * effect.knockback,
          targetRadius(world, enemy, config),
          config,
          world.tick,
        );
      confineMovement(world, enemy, before, config);
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
        targetRadius(world, enemy, config),
        config,
        world.tick,
      );
    }
    if (
      effect.knockback &&
      !effect.manaSteal &&
      (effect.knockbackChance === undefined ||
        world.random() < effect.knockbackChance)
    )
      displace(
        enemy,
        heading.fx * effect.knockback,
        heading.fy * effect.knockback,
        targetRadius(world, enemy, config),
        config,
        world.tick,
      );
    confineMovement(world, enemy, before, config);
    if (effect.statuses?.length || effect.pull) {
      if (enemy.hits) enemy.hits[hero.id] = world.tick;
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
  if (effect.lifesteal && damageDealt > 0 && hero.hp > 0)
    hero.hp = Math.min(hero.maxHp, hero.hp + damageDealt * effect.lifesteal);
  if (effect.residualArea) {
    const field = effect.residualArea;
    world.areas ??= [];
    world.areas.push({
      id: `area_${world.nextId++}`,
      ownerId: hero.id,
      abilityId: ability.id,
      x: hero.x + heading.fx * (field.forwardOffset ?? 0),
      y: hero.y + heading.fy * (field.forwardOffset ?? 0),
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
  basicTarget?: Point,
): void {
  revealOnAction(hero, ability.id);
  ability = consumeStaffCharges(hero, ability);
  if (
    ability.airborneEffect &&
    hasStatus(hero, 'duong_mon_flight', world.tick)
  ) {
    ability = { ...ability, effect: ability.airborneEffect };
    stage = ability.effect.mode === 'dash' ? 'air_laser' : 'air_bombs';
  }
  if (
    ability.id === duongMon.coQuan &&
    hasStatus(hero, 'duong_mon_flight', world.tick) &&
    ability.effect.mode === 'projectile'
  )
    ability = {
      ...ability,
      effect: { ...ability.effect, count: 3, spreadAngle: 0.46 },
    };
  if (ability.id === duongMon.shell)
    hero.statuses = (hero.statuses ?? []).filter(
      (s) => s.abilityId !== duongMon.flight,
    );
  const original = ability.effect;
  const focusRange =
    ability.focusRange ??
    ('range' in original
      ? original.range
      : original.mode === 'dash'
        ? original.distance
        : 0);
  const lockedTarget =
    ability.targeting === 'nearestEnemyAtCast' ||
    (original.mode === 'multi_hit' && original.targetArea)
      ? castAreaCenter(
          world,
          hero,
          {
            mode: 'area',
            durationTicks: 1,
            tickInterval: 1,
            radius: 1,
            damage: 0,
            nearestRange:
              original.mode === 'multi_hit' && original.targetArea
                ? original.targetArea.range
                : focusRange,
          },
          config,
        )
      : undefined;
  let gatherCenter: Point | undefined;
  const gatherIds: string[] = [];
  if (ability.targeting === 'nearestEnemyAtCast') {
    const aim = targetDirection(world, hero, focusRange, config);
    hero.fx = aim.x;
    hero.fy = aim.y;
  }
  if (ability.id === duongMon.elements) return;
  if (original.mode === 'dash' && movementSkillLocked(hero, world.tick)) return;
  const dash = original.mode === 'projectile' ? original.comboDash : undefined;
  const empoweredDash =
    dash &&
    !movementSkillLocked(hero, world.tick) &&
    (world.combos ?? []).some((step) => {
      if (
        step.sourceId !== hero.id ||
        step.id !== ability.combo?.id ||
        step.step !== 2 ||
        step.until <= world.tick
      )
        return false;
      const target = opponent(world, hero.id, step.targetId);
      const end = {
        x: hero.x + hero.fx * dash.distance,
        y: hero.y + hero.fy * dash.distance,
      };
      return (
        target !== undefined &&
        clearLine(world, hero, target, config) &&
        (target.x - hero.x) * hero.fx + (target.y - hero.y) * hero.fy >= 0 &&
        segmentCircle(
          hero,
          end,
          target,
          dash.radius + (target.stats ?? config.creep).radius,
        ) !== undefined
      );
    });
  const effect = empoweredDash ? dash : original;
  if (
    ability.id === nguDoc.taiHiep &&
    hasStatus(hero, 'ngu_doc_palm', world.tick)
  )
    stage = 'ngu_doc_toxic';
  if (empoweredDash) stage = 'empowered_dash';
  const crit = offensiveStats(world, hero.id, config);
  if (basicTarget) {
    const aim = direction(basicTarget.x - hero.x, basicTarget.y - hero.y);
    if (aim.x || aim.y) {
      hero.fx = aim.x;
      hero.fy = aim.y;
    }
  } else if (
    effect.mode === 'projectile' &&
    !effect.useFacing &&
    ability.targeting !== 'nearestEnemyAtCast'
  ) {
    const aim =
      aimNguDocWorms(world, hero, ability, config) ??
      targetDirection(
        world,
        hero,
        effect.range,
        config,
        effect.comboEmpoweredRadius === undefined
          ? undefined
          : ability.combo?.id,
      );
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
  if (executeNguDocAbility(world, hero, ability, config)) return;
  if (effect.mode === 'dash' && effect.gather) {
    const center = {
      x: hero.x + hero.fx * effect.gather.centerOffset,
      y: hero.y + hero.fy * effect.gather.centerOffset,
    };
    gatherCenter = center;
    for (const enemy of opponents(world, hero.id)) {
      const toward = direction(enemy.x - hero.x, enemy.y - hero.y);
      if (
        enemy.hp <= 0 ||
        distance(hero, enemy) > effect.gather.range ||
        toward.x * hero.fx + toward.y * hero.fy <
          Math.cos(effect.gather.halfAngle) ||
        !clearLine(world, hero, enemy, config)
      )
        continue;
      gatherIds.push(enemy.id);
    }
    emit(world, {
      kind: 'pulse',
      sourceId: hero.id,
      targetId: '',
      abilityId: ability.id,
      stage: 'wind_gather',
      x: center.x,
      y: center.y,
      radius: effect.gather.range,
      fx: hero.fx,
      fy: hero.fy,
      damage: 0,
      critical: false,
    });
  }
  if (ability.id === duongMon.flight) {
    if (hasStatus(hero, 'duong_mon_flight', world.tick)) {
      hero.statuses =
        hero.statuses?.filter((status) => status.abilityId !== ability.id) ??
        [];
    } else {
      hero.statuses =
        hero.statuses?.filter((status) => status.kind !== 'slow') ?? [];
      const durationTicks = Number.MAX_SAFE_INTEGER - world.tick;
      applyStatus(
        hero,
        { kind: 'duong_mon_flight', durationTicks, magnitude: 1 },
        hero.id,
        ability.id,
        world.tick,
      );
      if (effect.mode === 'buff') {
        applyStatus(
          hero,
          {
            kind: 'speed_buff',
            durationTicks,
            magnitude: effect.movementSpeed ?? 0,
          },
          hero.id,
          ability.id,
          world.tick,
        );
      }
      for (const spec of ability.selfStatuses ?? [])
        applyStatus(
          hero,
          { ...spec, durationTicks },
          hero.id,
          ability.id,
          world.tick,
        );
    }
    return;
  }
  if (!(effect.mode === 'arc' && effect.windupTicks))
    for (const spec of ability.selfStatuses ?? [])
      applyStatus(hero, spec, hero.id, ability.id, world.tick);
  if (ability.allies)
    supportAllies(world, hero, ability.id, ability.allies, config);
  if (effect.mode === 'projectile') {
    if (ability.id === duongMon.amKhi) {
      const rank = config.progression
        ? skillRank(hero, duongMon.elements, config)
        : 0;
      for (const { stage: element, angle } of duongMonFan.slice(0, rank + 1)) {
        const elemental: ProjectileEffect =
          element === 'water'
            ? effect
            : {
                ...effect,
                damage: effect.damage * 0.55,
                attackPowerScale: 0.3,
                statuses:
                  element === 'earth'
                    ? [{ kind: 'stun', durationTicks: 15, magnitude: 1 }]
                    : undefined,
                burnDamage: element === 'wood' ? 5 : 0,
                burnTicks: element === 'wood' ? 90 : 0,
                splashRadius: element === 'fire' ? 39 : 0,
              };
        const fx = hero.fx * Math.cos(angle) - hero.fy * Math.sin(angle);
        const fy = hero.fx * Math.sin(angle) + hero.fy * Math.cos(angle);
        queueProjectiles(
          world,
          hero,
          ability,
          elemental,
          config,
          fx,
          fy,
          element,
          {},
          {
            ...crit,
            rawDamage: damageFor(
              hero,
              elemental.damage,
              config,
              world.tick,
              elemental.attackPowerScale,
            ),
            critChance:
              element === 'metal'
                ? Math.min(1, crit.critChance + 0.25)
                : crit.critChance,
          },
        );
      }
    } else if (ability.id === duongMon.storm) {
      // Keep the original direction across all three authoritative volleys.
      const batches = [
        {
          after: 9,
          count: 9,
          effect: {
            ...effect,
            statuses: [
              { kind: 'slow', durationTicks: 36, magnitude: 0.3 },
            ] as StatusSpec[],
          },
          stage: 'slow_knives',
        },
        ...Array.from({ length: 6 }, (_, i) => ({
          after: 25 + 2 * i,
          count: 15,
          effect: {
            ...effect,
            damage: effect.damage * 0.12,
            attackPowerScale: 0,
            burnDamage: 4,
            burnTicks: 90,
          },
          stage: 'poison_knives',
        })),
        {
          after: 48,
          count: 25,
          effect: { ...effect, speed: 880, damage: effect.damage * 0.35 },
          stage: 'water',
        },
      ];
      for (const batch of batches) {
        const from = world.shots.length;
        queueProjectiles(
          world,
          hero,
          ability,
          { ...batch.effect, count: batch.count },
          config,
          hero.fx,
          hero.fy,
          batch.stage,
        );
        for (const shot of world.shots.slice(from)) shot.tick += batch.after;
      }
      hero.actionUntil = world.tick + 57;
    } else if (ability.id === duongMon.flowers && effect.scatter) {
      const scatter = effect.scatter;
      (world.pendingScatters ??= []).push({
        tick: world.tick + scatter.appearanceTicks,
        ownerId: hero.id,
        abilityId: ability.id,
        effect: scatter,
        rawDamage: damageFor(
          hero,
          scatter.damage,
          config,
          world.tick,
          scatter.attackPowerScale,
        ),
        ...crit,
      });
      hero.actionUntil = world.tick + 20;
    } else if (effect.windupTicks) {
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
        ...(lockedTarget ? { areaCenter: lockedTarget } : {}),
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
        dash ? { ...ability, combo: undefined } : ability,
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
        strikePhase: stage,
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
    } else
      strikeArc(world, hero, ability, config, hero, crit, undefined, stage);
  } else if (effect.mode === 'support') {
    if (effect.selfHeal)
      healHero(world, hero, hero, ability.id, effect.selfHeal);
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
    const customCenter =
      effect.nearestRange !== undefined ||
      effect.forwardOffset !== undefined ||
      effect.pentagon;
    const center = customCenter
      ? castAreaCenter(world, hero, effect, config)
      : undefined;
    if (ability.id === conLuan.detonate) {
      const markers = conLuanPlants(world, hero.id);
      world.areas = world.areas!.filter((marker) => !markers.includes(marker));
      for (const marker of markers)
        openArea(
          world,
          hero,
          ability.id,
          effect,
          config,
          rawDamage,
          crit,
          marker,
        );
      return;
    }
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
        ...(center ? { areaCenter: center } : {}),
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
    } else
      openArea(
        world,
        hero,
        ability.id,
        effect,
        config,
        rawDamage,
        crit,
        center,
      );
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
    if (ability.id === conLuan.plant) {
      const plant = config.skillCatalogue?.[ability.id]?.effect;
      if (plant?.mode === 'area')
        openArea(world, hero, ability.id, plant, config, 0, crit);
    }
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
        ? Math.ceil((effect.distance / effect.speed) * config.tickRate) +
          (effect.windupTicks ?? 0) +
          (effect.afterProjectile?.delayTicks ?? 0)
        : (effect.durationTicks ?? effect.spacingTicks * effect.hits + 1);
    if (!(effect.mode === 'multi_hit' && effect.detached))
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
    if (ability.id === duongMon.evade)
      applyStatus(
        hero,
        {
          kind: 'duong_mon_evade',
          durationTicks: duration + 2 * config.tickRate,
          magnitude: 1,
        },
        hero.id,
        ability.id,
        world.tick,
      );
    hero.actionUntil =
      world.tick +
      (effect.mode === 'multi_hit' && effect.detached
        ? (effect.inwardBurst?.windupTicks ?? 9)
        : Math.max(12, duration));
    const inward = effect.mode === 'multi_hit' ? effect.inwardBurst : undefined;
    const damageEffect =
      effect.mode === 'multi_hit' && inward ? effect.projectileBurst! : effect;
    const rain = effect.mode === 'multi_hit' ? effect.targetArea : undefined;
    const impactPoints = rain
      ? Array.from(
          { length: effect.mode === 'multi_hit' ? effect.hits : 0 },
          () => {
            const center = lockedTarget ?? hero,
              angle = world.random() * Math.PI * 2,
              dist = Math.sqrt(world.random()) * rain.scatterRadius;
            const p = {
              x: center.x + Math.cos(angle) * dist,
              y: center.y + Math.sin(angle) * dist,
            };
            return blocked(p, 1, config.width, config.height, config.collision)
              ? { x: center.x, y: center.y }
              : p;
          },
        )
      : undefined;
    if (impactPoints)
      for (const [index, p] of impactPoints.entries())
        emit(world, {
          kind: 'pulse',
          sourceId: hero.id,
          targetId: '',
          abilityId: ability.id,
          stage: 'sword_rain_fall',
          hitIndex: index,
          x: p.x,
          y: p.y,
          radius: rain!.radius,
          fx: hero.fx,
          fy: hero.fy,
          damage: 0,
          critical: false,
        });
    world.actions.push({
      startedAt: world.tick,
      id: `action_${world.nextId++}`,
      ownerId: hero.id,
      abilityId: ability.id,
      kind: effect.mode,
      until: world.tick + duration,
      nextTick:
        world.tick +
        (rain?.fallTicks ??
          inward?.windupTicks ??
          (effect.mode === 'dash' ? (effect.windupTicks ?? 0) : 0)),
      ...(impactPoints ? { impactPoints } : {}),
      ...(effect.mode === 'multi_hit' && effect.detached
        ? { detached: true }
        : {}),
      ...(gatherCenter ? { gatherCenter, gatherIds } : {}),
      ...(inward || effect.mode === 'dash'
        ? { origin: { x: hero.x, y: hero.y } }
        : {}),
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
  for (const area of world.areas ?? []) {
    if (
      area.until > world.tick ||
      !area.effect.expireBurst ||
      (world.heroes.get(area.ownerId)?.hp ?? 0) <= 0
    )
      continue;
    const burst = area.effect.expireBurst;
    for (const p of fiveSwordPoints(
      area.x,
      area.y,
      area.effect.radius,
      area.effect.radiusY ?? area.effect.radius,
    )) {
      emit(world, {
        kind: 'pulse',
        sourceId: area.ownerId,
        targetId: '',
        abilityId: area.abilityId,
        stage: 'formation_burst',
        x: p.x,
        y: p.y,
        radius: burst.radius,
        damage: 0,
        critical: false,
      });
      for (const enemy of opponents(world, area.ownerId))
        if (
          enemy.hp > 0 &&
          distance(p, enemy) <=
            burst.radius + targetRadius(world, enemy, config) &&
          !(config.combatCollision ?? config.collision).some(
            (w) => segmentRect(p, enemy, w) !== undefined,
          )
        )
          hurt(
            world,
            enemy,
            area.ownerId,
            area.abilityId,
            area.expireRawDamage ?? burst.damage,
            config,
            area,
          );
    }
  }
  world.areas = (world.areas ?? []).filter(
    (a) => a.until > world.tick && (world.heroes.get(a.ownerId)?.hp ?? 0) > 0,
  );
  for (const area of world.areas) {
    if (area.effect.passiveField) continue;
    if (area.abilityId === duongMon.trap) {
      if (world.tick < area.nextTick) continue;
      const triggered = [...opponents(world, area.ownerId)].some(
        (enemy) =>
          enemy.hp > 0 &&
          distance(area, enemy) <= 20 + targetRadius(world, enemy, config) &&
          !(config.combatCollision ?? config.collision).some(
            (wall) => segmentRect(area, enemy, wall) !== undefined,
          ),
      );
      if (!triggered) continue;
      // Resolve once using the ordinary area pipeline, then remove the marker.
      area.until = world.tick + 1;
    }
    if (area.effect.followOwner) {
      const owner = world.heroes.get(area.ownerId)!;
      area.x = owner.x;
      area.y = owner.y;
    }
    const pulse = world.tick >= area.nextTick;
    if (!pulse && !area.effect.occupantStatuses) continue;
    if (pulse) area.nextTick += area.effect.tickInterval;
    const elapsed = world.tick - (area.until - area.effect.durationTicks);
    const progress = area.effect.expandTicks
      ? Math.min(1, (elapsed + 1) / area.effect.expandTicks)
      : 1;
    const vertices = area.effect.pentagon
      ? fiveSwordPoints(
          area.x,
          area.y,
          area.effect.radius,
          area.effect.radiusY!,
        )
      : undefined;
    const { volley } = area.effect;
    if (pulse && volley) {
      const { radius, durationTicks, tickInterval } = area.effect;
      const damage =
        (area.rawDamage / Math.ceil(durationTicks / tickInterval)) *
        (area.effect.volleyDamageMultiplier ?? 1);
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
      for (const enemy of opponents(world, area.ownerId)) {
        if (
          !selectableTarget(enemy, world.tick) ||
          distance(area, enemy) > radius ||
          (config.combatCollision ?? config.collision).some(
            (w) =>
              w !== world.statue?.collision &&
              segmentRect(area, enemy, w) !== undefined,
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
    if (
      pulse &&
      (!area.effect.oncePerTarget ||
        (area.abilityId === nguDoc.hands &&
          elapsed === (area.effect.windupTicks ?? 0)))
    )
      emit(world, {
        kind: 'pulse',
        sourceId: area.ownerId,
        targetId: '',
        abilityId: area.abilityId,
        x: area.x,
        y: area.y,
        radius: area.effect.radius,
        stage:
          area.abilityId === conLuan.slam
            ? 'hammer_contact'
            : (area.effect.pentagon && elapsed === 0) ||
                area.abilityId === nguDoc.hands
              ? 'area_open'
              : 'area_tick',
        damage: 0,
        critical: false,
      });
    for (const enemy of opponents(world, area.ownerId)) {
      if (
        enemy.hp <= 0 ||
        (vertices
          ? vertices.some((p, i) => {
              const q = vertices[(i + 1) % vertices.length]!;
              return (
                (q.x - p.x) * (enemy.y - p.y) - (q.y - p.y) * (enemy.x - p.x) <
                0
              );
            })
          : area.effect.radiusY !== undefined
            ? Math.hypot(
                (enemy.x - area.x) / area.effect.radius,
                (enemy.y - area.y) / area.effect.radiusY,
              ) > progress
            : distance(area, enemy) >
              area.effect.radius + targetRadius(world, enemy, config)) ||
        (config.combatCollision ?? config.collision).some(
          (w) => segmentRect(area, enemy, w) !== undefined,
        )
      )
        continue;
      for (const status of area.effect.occupantStatuses ?? [])
        applyStatus(
          enemy,
          {
            ...status,
            durationTicks: Math.min(
              status.durationTicks,
              area.until - world.tick,
            ),
          },
          area.ownerId,
          area.abilityId,
          world.tick,
        );
      if (
        !pulse ||
        (area.effect.oncePerTarget && area.hitIds?.includes(enemy.id))
      )
        continue;
      if (area.effect.oncePerTarget) (area.hitIds ??= []).push(enemy.id);
      const landed = hurt(
        world,
        enemy,
        area.ownerId,
        area.abilityId,
        area.rawDamage,
        config,
        area.abilityId === nguDoc.pool ||
          area.abilityId === nguDoc.aura ||
          (area.effect.tickInterval < area.effect.durationTicks &&
            !area.effect.oncePerTarget &&
            !area.effect.expandTicks)
          ? { ...area, periodic: true }
          : area,
      );
      if (landed && enemy.hp > 0)
        for (const status of area.effect.statuses ?? [])
          applyStatus(enemy, status, area.ownerId, area.abilityId, world.tick);
      if (
        landed &&
        enemy.hp > 0 &&
        elapsed === 0 &&
        area.effect.stunOnOpenTicks
      )
        applyStatus(
          enemy,
          {
            kind: 'stun',
            durationTicks: area.effect.stunOnOpenTicks,
            magnitude: 1,
          },
          area.ownerId,
          area.abilityId,
          world.tick,
        );
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
      (!action.detached && hasStatus(hero, 'stun', world.tick)) ||
      ((action.effect.mode === 'dash' || action.tamLien) &&
        movementSkillLocked(hero, world.tick)) ||
      (action.effect.mode === 'dash' &&
        hero.statuses?.some(
          (status) =>
            status.kind === 'dash_lock' &&
            status.abilityId === 'quicksand' &&
            status.until > world.tick,
        ))
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
        const effect = action.effect;
        const ability = action.ability!;
        const radius = effect.comboEmpoweredRadius;
        const end = {
          x: hero.x + action.fx * effect.range,
          y: hero.y + action.fy * effect.range,
        };
        const empowered =
          radius !== undefined &&
          (world.combos ?? []).some((step) => {
            if (
              step.sourceId !== hero.id ||
              step.id !== ability.combo?.id ||
              step.step !== 2 ||
              step.until <= world.tick
            )
              return false;
            const target = opponent(world, hero.id, step.targetId);
            return (
              target !== undefined &&
              clearLine(world, hero, target, config) &&
              (target.x - hero.x) * action.fx +
                (target.y - hero.y) * action.fy >=
                0 &&
              segmentCircle(
                hero,
                end,
                target,
                radius + (target.stats ?? config.creep).radius,
              ) !== undefined
            );
          });
        const beamRange =
          ability.id === duongMon.laser
            ? effect.range *
              (config.combatCollision ?? config.collision).reduce(
                (fraction, wall) =>
                  wall === world.statue?.collision
                    ? fraction
                    : Math.min(
                        fraction,
                        segmentRect(hero, end, wall, effect.radius) ?? 1,
                      ),
                1,
              )
            : effect.range;
        const released = empowered
          ? { ...effect, count: 1, laneOffsets: [0], radius }
          : effect;
        queueProjectiles(
          world,
          hero,
          ability,
          released,
          config,
          action.fx,
          action.fy,
          empowered ? 'empowered_travel' : 'travel',
          {},
          action,
        );
        cue(
          world,
          hero,
          action.abilityId,
          empowered ? 'empowered_release' : 'release',
          beamRange,
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
          action.areaCenter,
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
          action.strikePhase,
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
      if (world.tick < action.nextTick || action.endTriggered) continue;
      const e = action.effect,
        old = { x: hero.x, y: hero.y },
        n = Math.min(action.remaining, e.speed / config.tickRate);
      displace(hero, action.fx * n, action.fy * n, config.radius, config);
      resetConLuanDashOnEntry(world, hero, old);
      if (action.abilityId === 'universal_dash' && distance(old, hero) > 0.01)
        hero.lastUniversalDashTick = world.tick;
      if (e.invulnerable && distance(old, hero) > 0.01)
        applyStatus(
          hero,
          { kind: 'dash_guard', durationTicks: 1, magnitude: 1 },
          hero.id,
          action.abilityId,
          world.tick,
        );
      action.remaining -= n;
      if (action.gatherCenter)
        for (const id of action.gatherIds ?? []) {
          const enemy = opponent(world, hero.id, id);
          if (!enemy || enemy.hp <= 0) continue;
          const before = { x: enemy.x, y: enemy.y },
            left = Math.max(
              1,
              Math.ceil((action.remaining + n) / (e.speed / config.tickRate)),
            );
          displace(
            enemy,
            (action.gatherCenter.x - enemy.x) / left,
            (action.gatherCenter.y - enemy.y) / left,
            targetRadius(world, enemy, config),
            config,
            world.tick,
          );
          confineMovement(world, enemy, before, config);
        }
      const damageStart = {
          x: old.x + action.fx * (e.damageOffset ?? 0),
          y: old.y + action.fy * (e.damageOffset ?? 0),
        },
        damageEnd = {
          x: hero.x + action.fx * (e.damageOffset ?? 0),
          y: hero.y + action.fy * (e.damageOffset ?? 0),
        };
      for (const enemy of opponents(world, action.ownerId)) {
        if (
          e.damage <= 0 ||
          action.hitIds.includes(enemy.id) ||
          (enemy.x - old.x) * action.fx + (enemy.y - old.y) * action.fy < 0 ||
          !clearLine(world, hero, enemy, config) ||
          segmentCircle(
            damageStart,
            damageEnd,
            enemy,
            e.radius + targetRadius(world, enemy, config),
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
          { ...action, combo: action.ability?.combo },
        );
        if (
          landed &&
          action.abilityId === 'phi_anh_tram' &&
          !action.tamLienCharged
        ) {
          recordTamLienHit(world, hero, enemy.id, config);
          action.tamLienCharged = true;
        }
        if (landed && enemy.hp > 0 && e.stunTicks > 0)
          applyStatus(
            enemy,
            { kind: 'stun', durationTicks: e.stunTicks, magnitude: 1 },
            hero.id,
            action.abilityId,
            world.tick,
          );
      }
      if (action.remaining <= 0 || distance(old, hero) < 0.01) {
        action.endTriggered = true;
        action.until = world.tick;
        if (e.endBlast) {
          const blast: AreaEffect = {
            mode: 'area',
            damage: e.endBlast.damage,
            radius: e.endBlast.radius,
            durationTicks: 1,
            tickInterval: 1,
          };
          openArea(
            world,
            hero,
            action.abilityId,
            blast,
            config,
            damageFor(hero, blast.damage, config, world.tick),
            action,
          );
          cue(
            world,
            hero,
            action.abilityId,
            'dash_impact',
            blast.radius,
            action,
          );
        }
        if (e.afterProjectile) {
          const follow = e.afterProjectile;
          const projectile: ProjectileEffect = {
            mode: 'projectile',
            damage: follow.damage,
            range: follow.range,
            speed: follow.speed,
            radius: follow.radius,
            count: follow.count,
            spacingTicks: 0,
            splashRadius: 0,
            burnDamage: 0,
            burnTicks: 0,
            piercing: true,
            useFacing: true,
            radial: follow.radial,
            attackPowerScale: follow.attackPowerScale,
          };
          const first = world.shots.length,
            sign = e.backward ? -1 : 1;
          queueProjectiles(
            world,
            hero,
            action.ability!,
            projectile,
            config,
            action.fx * sign,
            action.fy * sign,
            follow.stage,
          );
          for (const shot of world.shots.slice(first))
            shot.tick += follow.delayTicks;
          if (follow.delayTicks)
            action.until = world.tick + follow.delayTicks + 1;
          cue(world, hero, action.abilityId, 'dash_end', 0, action);
        }
        const immunity = hero.statuses?.find(
          (status) => status.kind === 'duong_mon_evade',
        );
        if (action.abilityId === duongMon.evade && immunity)
          immunity.until = world.tick + 2 * config.tickRate;
      }
    } else if (
      action.effect.mode === 'multi_hit' &&
      world.tick >= action.nextTick
    ) {
      const e = action.effect,
        finish = action.remaining === 0,
        radius = finish ? e.finisherRange : e.range;
      if (e.targetArea && action.impactPoints) {
        const index = e.hits - action.remaining,
          p = action.impactPoints[index];
        if (!p) {
          action.until = world.tick;
          continue;
        }
        emit(world, {
          kind: 'pulse',
          sourceId: hero.id,
          targetId: '',
          abilityId: action.abilityId,
          stage: 'sword_rain_impact',
          hitIndex: index,
          x: p.x,
          y: p.y,
          radius: e.targetArea.radius,
          damage: 0,
          critical: false,
        });
        for (const enemy of opponents(world, hero.id))
          if (
            enemy.hp > 0 &&
            distance(p, enemy) <=
              e.targetArea.radius + targetRadius(world, enemy, config) &&
            !(config.combatCollision ?? config.collision).some(
              (w) => segmentRect(p, enemy, w) !== undefined,
            )
          )
            hurt(
              world,
              enemy,
              hero.id,
              action.abilityId,
              action.rawDamage,
              config,
              action,
            );
        action.remaining--;
        action.nextTick += e.spacingTicks;
        if (action.remaining === 0) action.until = world.tick;
        continue;
      }
      if (e.inwardBurst) {
        if (action.remaining > 0) {
          queueInwardVolley(world, action, e, config);
          action.remaining--;
          action.nextTick += e.inwardBurst.intervalTicks;
        }
        continue;
      }
      const index =
        (action.abilityId === 'that_tinh_kiem' ||
          action.abilityId === conLuan.fan) &&
        !finish
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
      for (const enemy of opponents(world, action.ownerId))
        if (
          (!finish || e.finisherDamage > 0) &&
          (e.halfAngle === undefined ||
            (() => {
              const d = direction(enemy.x - hero.x, enemy.y - hero.y);
              return d.x * action.fx + d.y * action.fy >= Math.cos(e.halfAngle);
            })()) &&
          clearLine(world, hero, enemy, config) &&
          distance(hero, enemy) <= radius + targetRadius(world, enemy, config)
        ) {
          const landed = hurt(
            world,
            enemy,
            hero.id,
            action.abilityId,
            finish ? action.finisherDamage : action.rawDamage,
            config,
            {
              ...action,
              hitPhase:
                action.abilityId === 'thien_ha_vo_cau'
                  ? finish
                    ? 'finisher'
                    : 'sweep'
                  : undefined,
              slowedBonus: e.slowedBonus,
              combo: action.ability?.combo,
              comboTargets: action.comboTargets,
            },
          );
          if (landed && finish && enemy.hp > 0)
            for (const spec of e.finisherStatuses ?? [])
              applyStatus(enemy, spec, hero.id, action.abilityId, world.tick);
          if (
            landed &&
            enemy.hp > 0 &&
            e.statuses?.length &&
            !action.hitIds.includes(enemy.id)
          ) {
            action.hitIds.push(enemy.id);
            for (const status of e.statuses)
              applyStatus(enemy, status, hero.id, action.abilityId, world.tick);
          }
        }
      action.remaining--;
      action.nextTick +=
        e.durationTicks && e.finisherDamage > 0
          ? (e.durationTicks - 1) / e.hits
          : e.spacingTicks;
      if (finish) {
        if (e.finisherHealFraction)
          healHero(
            world,
            hero,
            hero,
            action.abilityId,
            hero.maxHp * e.finisherHealFraction,
          );
        action.until = world.tick;
      }
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

function healHero(
  world: World,
  source: Hero,
  target: Hero,
  abilityId: string,
  heal: number,
): void {
  const amount = Math.min(heal, target.maxHp - target.hp);
  if (amount <= 0) return;
  target.hp += amount;
  emit(world, {
    kind: 'pulse',
    sourceId: source.id,
    targetId: target.id,
    abilityId,
    x: target.x,
    y: target.y,
    damage: amount,
    critical: false,
    stage: 'heal',
  });
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
      (world.duel &&
        ally.id !== hero.id &&
        (!world.duelTeams ||
          world.duelTeams.get(ally.id) !== world.duelTeams.get(hero.id))) ||
      ally.hp <= 0 ||
      distance(hero, ally) > effect.radius ||
      (config.combatCollision ?? config.collision).some(
        (w) => segmentRect(hero, ally, w) !== undefined,
      )
    )
      continue;
    for (const spec of effect.statuses ?? [])
      applyStatus(ally, spec, hero.id, abilityId, world.tick);
    if (effect.heal) healHero(world, hero, ally, abilityId, effect.heal);
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
