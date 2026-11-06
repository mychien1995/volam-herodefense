import type {
  Actor,
  CombatEvent,
  Creep,
  SimulationConfig,
  World,
} from './types.js';
import { cancelOwnedEffects, hasStatus, statusValue } from './status.js';
import { characterStats, gainExperience } from './progression.js';
import { direction, distance, segmentRect } from './geometry.js';
import { recordsCraftDamage } from './economy.js';
import { comboHit } from './combos.js';
import { ownerProtection } from './protection.js';
import { CHU_BOSS_ID } from './chu-types.js';
import { waveBossTestArchetypes } from './wave-boss-test.js';
import type { StatusEffect } from './types.js';
import type { ComboSpec } from './types.js';
export function emit(world: World, event: Omit<CombatEvent, 'id'>): void {
  world.events.push({ id: world.nextEvent++, tick: world.tick, ...event });
}
export function hurt(
  world: World,
  target: Actor,
  sourceId: string,
  abilityId: string,
  raw: number,
  config: SimulationConfig,
  snapshot?: {
    critChance: number;
    critMultiplier: number;
    fx?: number;
    fy?: number;
    armorPenetration?: number | undefined;
    slowedBonus?: number | undefined;
    lifesteal?: { fraction: number; used: boolean } | undefined;
    reactive?: boolean | undefined;
    preserveFraction?: boolean | undefined;
    directHp?: boolean;
    periodic?: boolean | undefined;
    resolvedReflection?: boolean | undefined;
    /** Exact, server-owned curse HP settlement. */
    unavoidableHpLoss?: boolean | undefined;
    combo?: ComboSpec | undefined;
    comboTargets?: Record<string, boolean> | undefined;
  },
): boolean {
  if (world.waveBossTest && world.heroes.has(target.id)) return false;
  if (
    target.hp <= 0 ||
    (!snapshot?.unavoidableHpLoss && target.invulnerable) ||
    raw <= 0
  )
    return false;
  if (target.namDeLocked) return false;
  raw = creepGuardDamage(
    world,
    target,
    sourceId,
    raw,
    config,
    snapshot?.periodic,
  );
  if (world.creeps.get(target.id)?.rescueTargetId === sourceId) return false;
  if (!snapshot?.unavoidableHpLoss && ownerProtection(world, target))
    return false;
  // DOT remains damage; immunity exists only on actual moving dash ticks.
  if (
    !snapshot?.unavoidableHpLoss &&
    !snapshot?.periodic &&
    hasStatus(target, 'dash_guard', world.tick)
  )
    return false;
  if (
    world.bacCai &&
    !world.bacCai.interceptDamage(world, config, target.id, sourceId, abilityId)
  )
    return false;
  let empowered = false;
  if (
    snapshot?.combo &&
    world.creeps.has(target.id) &&
    world.heroes.has(sourceId)
  ) {
    const spec = snapshot.combo;
    const cached = snapshot.comboTargets;
    if (cached && Object.hasOwn(cached, target.id))
      empowered = cached[target.id]!;
    else {
      empowered = comboHit(world, sourceId, target.id, spec);
      if (cached) cached[target.id] = empowered;
      const heading = world.heroes.get(sourceId)!;
      emit(world, {
        kind: 'pulse',
        sourceId,
        targetId: target.id,
        abilityId,
        x: target.x,
        y: target.y,
        fx: snapshot.fx ?? heading.fx,
        fy: snapshot.fy ?? heading.fy,
        damage: 0,
        critical: false,
        stage: empowered ? 'combo_empowered' : 'combo_step',
      });
    }
    if (empowered) raw *= spec.multiplier;
  }
  // A timed stance evades one incoming enemy hit. Consume before retaliation,
  // so counters cannot recursively trigger each other or fire twice in a tick.
  const counter =
    !snapshot?.unavoidableHpLoss &&
    !snapshot?.reactive &&
    !snapshot?.periodic &&
    world.heroes.has(target.id) &&
    target.statuses?.find((s) => s.kind === 'counter' && s.until > world.tick);
  const attacker = world.creeps.get(sourceId);
  const retaliate = () => {
    if (!counter || !attacker || attacker.hp <= 0 || target.hp <= 0) return;
    const heading = direction(attacker.x - target.x, attacker.y - target.y);
    if (
      distance(target, attacker) >
        (counter.secondary ?? 0) + (attacker.stats ?? config.creep).radius ||
      config.collision.some(
        (w) => segmentRect(target, attacker, w) !== undefined,
      )
    )
      return;
    emit(world, {
      kind: 'pulse',
      sourceId: target.id,
      targetId: attacker.id,
      abilityId: counter.abilityId,
      x: target.x,
      y: target.y,
      fx: heading.x,
      fy: heading.y,
      stage: 'counter',
      damage: 0,
      critical: false,
    });
    hurt(
      world,
      attacker,
      target.id,
      counter.abilityId,
      counter.magnitude,
      config,
      {
        ...offensiveStats(world, target.id, config),
        reactive: true,
        fx: heading.x,
        fy: heading.y,
      },
    );
  };
  if (counter && attacker && attacker.hp > 0) {
    target.statuses = target.statuses!.filter((s) => s !== counter);
    if (counter.evade !== false) {
      retaliate();
      return false;
    }
  }
  const enemy = world.creeps.get(target.id);
  const guardCounter =
    !snapshot?.unavoidableHpLoss && world.heroes.has(target.id)
      ? target.statuses?.find(
          (s) => s.kind === 'guard_counter' && s.until > world.tick,
        )
      : undefined;
  const stats = snapshot ?? offensiveStats(world, sourceId, config);
  let critical =
    !snapshot?.unavoidableHpLoss &&
    !snapshot?.directHp &&
    world.random() < stats.critChance;
  const winePenetration =
    target.id === CHU_BOSS_ID &&
    world.heroes.has(sourceId) &&
    (world.chu?.wineDrinkers?.[sourceId] ?? 0) > world.tick
      ? (world.chu!.definition.wineArmorPenetration ?? 0.7)
      : 0;
  const defense =
    Math.max(
      0,
      world.heroes.has(target.id)
        ? characterStats(world.heroes.get(target.id)!, config, world.tick).total
            .defense
        : (enemy ? (enemy.stats ?? config.creep).defense : 0) +
            statusValue(target, 'defense_buff', world.tick) -
            statusValue(target, 'defense_break', world.tick),
    ) *
    (1 -
      Math.max(
        0,
        Math.min(1, Math.max(snapshot?.armorPenetration ?? 0, winePenetration)),
      ));
  const condition =
    statusValue(target, 'slow', world.tick) > 0
      ? 1 + (snapshot?.slowedBonus ?? 0)
      : 1;
  const reduction = world.creeps.has(sourceId)
    ? 1 -
      Math.min(
        0.85,
        statusValue(world.creeps.get(sourceId)!, 'attack_break', world.tick),
      )
    : 1;
  const adjusted =
    snapshot?.unavoidableHpLoss ||
    snapshot?.resolvedReflection ||
    snapshot?.directHp
      ? raw
      : raw *
        reduction *
        condition *
        (100 / (100 + defense)) *
        (critical ? stats.critMultiplier : 1);
  // Stored actual HP loss is already fractional after mitigation; reflection must
  // not invent an extra point through the normal attack rounding/minimum rule.
  let damage = snapshot?.preserveFraction
    ? Math.max(0, adjusted)
    : Math.max(1, Math.round(adjusted));
  const craftedDefender = world.heroes.get(target.id);
  const reflectAttacker = world.creeps.get(sourceId);
  const reflectChance = config.economy?.craftedCombat.reflectChance ?? 0;
  const reflected =
    craftedDefender?.inventory?.crafted?.armor === 'reflect' &&
    reflectAttacker &&
    !snapshot?.reactive &&
    !snapshot?.resolvedReflection &&
    !snapshot?.periodic &&
    !snapshot?.directHp &&
    !snapshot?.unavoidableHpLoss &&
    world.random() < reflectChance
      ? damage
      : 0;
  const mitigation = snapshot?.unavoidableHpLoss
    ? 0
    : Math.min(
        0.85,
        Math.max(
          statusValue(target, 'damage_reduction', world.tick),
          guardCounter?.magnitude ?? 0,
          ...(world.actions ?? [])
            .filter((a) => a.ownerId === target.id && a.until > world.tick)
            .map((a) =>
              a.effect.mode === 'multi_hit' ? (a.effect.guard ?? 0) : 0,
            ),
        ),
      );
  if (mitigation > 0 && !snapshot?.resolvedReflection && !snapshot?.directHp) {
    const before = damage;
    damage *= 1 - mitigation;
    const guard = target.statuses?.find(
      (s) =>
        s.kind === 'damage_reduction' &&
        s.until > world.tick &&
        s.magnitude === mitigation,
    );
    if (guard)
      emit(world, {
        kind: 'pulse',
        sourceId: target.id,
        targetId: target.id,
        abilityId: guard.abilityId,
        x: target.x,
        y: target.y,
        damage: before - damage,
        critical: false,
        stage: 'mitigate',
      });
  }
  if (reflected) damage *= 0.5;
  const hero = craftedDefender;
  // Strongest shield only; no additive absorption or duplicate resource spend.
  const shield = (snapshot?.unavoidableHpLoss ? [] : (hero?.statuses ?? []))
    .filter((s) => s.kind === 'mana_shield' && s.until > world.tick)
    .sort(
      (a, b) =>
        b.magnitude - a.magnitude || (a.secondary ?? 1) - (b.secondary ?? 1),
    )[0];
  if (hero && shield && hero.mana > 0 && !snapshot?.directHp) {
    const rate = shield.secondary ?? 1;
    const absorbed = Math.min(
      damage * Math.min(1, shield.magnitude),
      hero.mana / rate,
    );
    hero.mana = Math.max(0, hero.mana - absorbed * rate);
    damage = Math.max(0, damage - absorbed);
    if (absorbed > 0)
      emit(world, {
        kind: 'pulse',
        sourceId: hero.id,
        targetId: hero.id,
        abilityId: shield.abilityId,
        x: hero.x,
        y: hero.y,
        stage: 'absorb',
        damage: absorbed,
        critical: false,
      });
  }
  const beforeHp = target.hp;
  const testBossHit =
    world.waveBossTest &&
    world.heroes.has(sourceId) &&
    waveBossTestArchetypes.has(enemy?.archetypeId ?? '');
  if (testBossHit && world.waveBossTest) {
    damage = target.maxHp * world.waveBossTest.bossHitFraction;
    critical = false;
  }
  target.hp = Math.max(0, target.hp - damage);
  reflectCreepDamage(
    world,
    target,
    sourceId,
    beforeHp - target.hp,
    config,
    !!(
      snapshot?.reactive ||
      snapshot?.periodic ||
      snapshot?.resolvedReflection
    ),
  );
  // Fractional five-percent hits must not leave a floating-point sliver after hit20.
  if (testBossHit && target.hp <= Number.EPSILON * target.maxHp * 32)
    target.hp = 0;
  if (target.hp < beforeHp)
    world.bacCai?.damaged(world, config, target.id, sourceId);
  if (guardCounter) {
    const received = beforeHp - target.hp;
    guardCounter.receivedDamage = (guardCounter.receivedDamage ?? 0) + received;
    emit(world, {
      kind: 'pulse',
      sourceId: target.id,
      targetId: target.id,
      abilityId: guardCounter.abilityId,
      x: target.x,
      y: target.y,
      damage: received,
      fx: target.fx,
      fy: target.fy,
      critical: false,
      stage: 'guard_received',
    });
  }
  target.hurtUntil = world.tick + 6;
  if (enemy) {
    enemy.hits[sourceId] = world.tick;
    if (
      target.hp < beforeHp &&
      world.heroes.has(sourceId) &&
      recordsCraftDamage(config, enemy.id)
    )
      (enemy.damagedBy ??= new Set()).add(sourceId);
  }
  const heading = world.heroes.get(sourceId) ?? world.creeps.get(sourceId);
  emit(world, {
    kind: 'hit',
    sourceId,
    targetId: target.id,
    abilityId,
    damage,
    critical,
    ...(empowered ? { stage: 'empowered' } : {}),
    x: target.x,
    y: target.y,
    fx: snapshot?.fx ?? heading?.fx ?? 1,
    fy: snapshot?.fy ?? heading?.fy ?? 0,
  });
  if (
    enemy?.bossEncounter &&
    world.chu?.phase === 'reflect' &&
    !snapshot?.reactive &&
    target.hp < beforeHp
  ) {
    const attacker = world.heroes.get(sourceId);
    if (attacker && attacker.hp > 0)
      hurt(
        world,
        attacker,
        target.id,
        'can_khon_phan_chan',
        beforeHp - target.hp,
        config,
        {
          critChance: 0,
          critMultiplier: 1,
          reactive: true,
          preserveFraction: true,
          resolvedReflection: true,
        },
      );
  }
  if (target.hp === 0) {
    world.combos = (world.combos ?? []).filter(
      (c) => c.sourceId !== target.id && c.targetId !== target.id,
    );
    target.pose = 'death';
    target.statuses = [];
    cancelOwnedEffects(world, target.id);
    emit(world, {
      kind: 'death',
      sourceId,
      targetId: target.id,
      abilityId,
      damage: 0,
      critical: false,
      x: target.x,
      y: target.y,
    });
    if (enemy) {
      enemy.respawnAt = world.tick + config.creep.respawnTicks;
      if (!enemy.bossEncounter) reward(world, enemy, config);
    }
  }
  const leech = snapshot?.lifesteal;
  const owner = leech ? world.heroes.get(sourceId) : undefined;
  if (
    enemy &&
    target.hp < beforeHp &&
    leech &&
    !leech.used &&
    owner &&
    owner.hp > 0
  ) {
    leech.used = true;
    owner.hp = Math.min(
      owner.maxHp,
      owner.hp + raw * (critical ? stats.critMultiplier : 1) * leech.fraction,
    );
  }
  if (reflected && reflectAttacker)
    hurt(world, reflectAttacker, target.id, 'gear_reflect', reflected, config, {
      critChance: 0,
      critMultiplier: 1,
      reactive: true,
      preserveFraction: true,
    });
  if (counter && counter.evade === false) retaliate();
  if (
    guardCounter &&
    target.hp > 0 &&
    !snapshot?.reactive &&
    (guardCounter.receivedDamage ?? 0) >
      target.maxHp * (guardCounter.thresholdFraction ?? 0.2) +
        Number.EPSILON * Math.max(1, target.maxHp) * 8
  )
    releaseGuardCounter(world, target.id, guardCounter, config);
  return true;
}
/** Consume before emitting or hurting anything: one radial reflection, never a recursive proc. */
export function releaseGuardCounter(
  world: World,
  ownerId: string,
  guard: StatusEffect,
  config: SimulationConfig,
): void {
  const owner = world.heroes.get(ownerId);
  if (!owner || owner.hp <= 0 || !owner.statuses?.includes(guard)) return;
  owner.statuses = owner.statuses.filter((s) => s !== guard);
  const damage = guard.receivedDamage ?? 0,
    range = guard.secondary ?? 0;
  emit(world, {
    kind: 'pulse',
    sourceId: owner.id,
    targetId: '',
    abilityId: guard.abilityId,
    x: owner.x,
    y: owner.y,
    fx: owner.fx,
    fy: owner.fy,
    radius: range,
    damage,
    critical: false,
    stage: 'counter_release',
  });
  for (const enemy of world.creeps.values()) {
    if (
      enemy.hp <= 0 ||
      distance(owner, enemy) > range + (enemy.stats ?? config.creep).radius ||
      config.collision.some((w) => segmentRect(owner, enemy, w) !== undefined)
    )
      continue;
    hurt(world, enemy, owner.id, guard.abilityId, damage, config, {
      critChance: 0,
      critMultiplier: 1,
      reactive: true,
      preserveFraction: true,
      fx: owner.fx,
      fy: owner.fy,
    });
  }
}
export function expireGuardCounters(
  world: World,
  config: SimulationConfig,
): void {
  for (const hero of world.heroes.values())
    for (const guard of [...(hero.statuses ?? [])])
      if (guard.kind === 'guard_counter' && guard.until <= world.tick)
        releaseGuardCounter(world, hero.id, guard, config);
}
export function offensiveStats(
  world: World,
  sourceId: string,
  config: SimulationConfig,
) {
  const source = world.heroes.get(sourceId);
  if (source?.progression) {
    const stats = characterStats(source, config, world.tick).total;
    return {
      critChance: stats.critChance,
      critMultiplier: stats.critMultiplier,
    };
  }
  const passive =
    source?.schoolId === 'cai_bang' ? config.caiBangPassive : undefined;
  const buff = (source?.statuses ?? []).filter(
    (s) => s.kind === 'crit_buff' && s.until > world.tick,
  );
  const chance =
    config.critChance +
    (source ? statusValue(source, 'crit_buff', world.tick) : 0) +
    (source
      ? Math.max(0, source.level - 1) * (passive?.critChancePerLevel ?? 0)
      : 0);
  const multiplier =
    config.critMultiplier +
    Math.max(0, ...buff.map((s) => s.secondary ?? 0)) +
    (source
      ? Math.max(0, source.level - 1) * (passive?.critMultiplierPerLevel ?? 0)
      : 0);
  return {
    critChance: Math.max(0, Math.min(1, chance)),
    critMultiplier: multiplier,
  };
}
function reward(world: World, creep: Creep, config: SimulationConfig): void {
  const stats = creep.stats ?? config.creep;
  const eligible = [...world.heroes.values()]
    .filter(
      (hero) =>
        creep.hits[hero.id] !== undefined &&
        (creep.encounterBoss ||
          world.tick - (creep.hits[hero.id] ?? 0) <= stats.assistTicks),
    )
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  eligible.forEach((hero, i) => {
    gainExperience(
      hero,
      Math.floor(stats.xp / eligible.length) +
        (i < stats.xp % eligible.length ? 1 : 0),
      config,
    );
    hero.gold +=
      Math.floor(stats.gold / eligible.length) +
      (i < stats.gold % eligible.length ? 1 : 0);
  });
}
import { creepGuardDamage, reflectCreepDamage } from './creep-abilities.js';
