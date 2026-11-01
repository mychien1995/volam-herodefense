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
import { comboHit } from './combos.js';
import type { ComboSpec } from './types.js';
export function emit(world: World, event: Omit<CombatEvent, 'id'>): void {
  world.events.push({ id: world.nextEvent++, ...event });
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
    reactive?: boolean | undefined;
    periodic?: boolean | undefined;
    combo?: ComboSpec | undefined;
    comboTargets?: Record<string, boolean> | undefined;
  },
): boolean {
  if (target.hp <= 0 || raw <= 0) return false;
  // DOT remains damage; immunity exists only on actual moving dash ticks.
  if (!snapshot?.periodic && hasStatus(target, 'dash_guard', world.tick))
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
  const stats = snapshot ?? offensiveStats(world, sourceId, config);
  const critical = world.random() < stats.critChance;
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
    (1 - Math.max(0, Math.min(1, snapshot?.armorPenetration ?? 0)));
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
  let damage = Math.max(
    1,
    Math.round(
      raw *
        reduction *
        condition *
        (100 / (100 + defense)) *
        (critical ? stats.critMultiplier : 1),
    ),
  );
  const mitigation = Math.min(
    0.85,
    Math.max(
      statusValue(target, 'damage_reduction', world.tick),
      ...(world.actions ?? [])
        .filter((a) => a.ownerId === target.id && a.until > world.tick)
        .map((a) =>
          a.effect.mode === 'multi_hit' ? (a.effect.guard ?? 0) : 0,
        ),
    ),
  );
  if (mitigation > 0) {
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
  const hero = world.heroes.get(target.id);
  // Strongest shield only; no additive absorption or duplicate resource spend.
  const shield = (hero?.statuses ?? [])
    .filter((s) => s.kind === 'mana_shield' && s.until > world.tick)
    .sort(
      (a, b) =>
        b.magnitude - a.magnitude || (a.secondary ?? 1) - (b.secondary ?? 1),
    )[0];
  if (hero && shield && hero.mana > 0) {
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
  target.hp = Math.max(0, target.hp - damage);
  target.hurtUntil = world.tick + 6;
  if (enemy) enemy.hits[sourceId] = world.tick;
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
      reward(world, enemy, config);
    }
  }
  if (counter && counter.evade === false) retaliate();
  return true;
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
