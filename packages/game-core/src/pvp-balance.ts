import type { Ability, SimulationConfig, StatusKind, World } from './types.js';

const copyData = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export interface PvpAbilityOverride {
  basicMinimumSeconds?: number;
  manaCostMultiplier?: number;
  cooldownSeconds?: number;
  maxSelfStatusSeconds?: number;
  reactiveBlockChanceMultiplier?: number;
  selfStatusMagnitudeMultipliers?: Partial<Record<StatusKind, number>>;
  projectileSpeed?: number;
  targetAreaRadius?: number;
}

export interface Pvp1v1Tuning {
  damageMultiplier: number;
  branchDamageMultipliers: Record<string, number>;
  control: {
    durationMultiplier: number;
    stunRootMaxSeconds: number;
    silenceDisarmMaxSeconds: number;
  };
  abilities: Record<string, PvpAbilityOverride>;
}

/** Copy only the combat data owned by this profile; never mutate the PvE catalogue. */
export function createPvp1v1Config(
  base: SimulationConfig,
  tuning: Pvp1v1Tuning,
): SimulationConfig {
  const rules = copyData(tuning);
  const revise = (original: Ability): Ability => {
    const o = rules.abilities[original.id];
    if (!o) return original;
    const a = copyData(original);
    if (o.basicMinimumSeconds !== undefined) {
      const ticks = Math.ceil(o.basicMinimumSeconds * base.tickRate);
      a.cooldownTicks = Math.max(a.cooldownTicks, ticks);
      a.minIntervalTicks = Math.max(a.minIntervalTicks ?? 0, ticks);
      if (a.manualChain)
        a.manualChain.cooldownTicks = Math.max(
          a.manualChain.cooldownTicks,
          ticks,
        );
    }
    if (o.manaCostMultiplier !== undefined)
      a.manaCost = Math.ceil(a.manaCost * o.manaCostMultiplier);
    if (o.cooldownSeconds !== undefined)
      a.cooldownTicks = Math.ceil(o.cooldownSeconds * base.tickRate);
    if (o.maxSelfStatusSeconds !== undefined)
      for (const s of a.selfStatuses ?? [])
        s.durationTicks = Math.min(
          s.durationTicks,
          Math.ceil(o.maxSelfStatusSeconds * base.tickRate),
        );
    if (o.reactiveBlockChanceMultiplier !== undefined && a.reactiveBlock)
      a.reactiveBlock.chance *= o.reactiveBlockChanceMultiplier;
    for (const s of a.selfStatuses ?? []) {
      const multiplier = o.selfStatusMagnitudeMultipliers?.[s.kind];
      if (multiplier !== undefined) s.magnitude *= multiplier;
    }
    if (o.projectileSpeed !== undefined) {
      if (a.effect.mode !== 'projectile')
        throw Error('PvP projectile override requires a projectile: ' + a.id);
      a.effect.speed = o.projectileSpeed;
    }
    if (o.targetAreaRadius !== undefined) {
      if (a.effect.mode !== 'multi_hit' || !a.effect.targetArea)
        throw Error('PvP target-area override requires a target area: ' + a.id);
      a.effect.targetArea.radius = o.targetAreaRadius;
    }
    return a;
  };
  return {
    ...base,
    pvp1v1: rules,
    basics: Object.fromEntries(
      Object.entries(base.basics).map(([id, a]) => [id, revise(a)]),
    ),
    skills: base.skills.map(revise),
    ...(base.skillCatalogue
      ? {
          skillCatalogue: Object.fromEntries(
            Object.entries(base.skillCatalogue).map(([id, a]) => [
              id,
              revise(a),
            ]),
          ),
        }
      : {}),
    ...(base.progression
      ? {
          progression: {
            ...base.progression,
            skills: Object.fromEntries(
              Object.entries(base.progression.skills).map(([id, s]) => [
                id,
                rules.abilities[id] ? { ...s, ranks: s.ranks.map(revise) } : s,
              ]),
            ),
          },
        }
      : {}),
  };
}

/** The round owner installs this policy on fighters, never on summons or PvE actors. */
export function pvpControlPolicy(tuning: Pvp1v1Tuning, tickRate: number) {
  const hard = {
    durationMultiplier: tuning.control.durationMultiplier,
    maxTicks: Math.ceil(tuning.control.stunRootMaxSeconds * tickRate),
  };
  const lock = {
    durationMultiplier: tuning.control.durationMultiplier,
    maxTicks: Math.ceil(tuning.control.silenceDisarmMaxSeconds * tickRate),
  };
  return { stun: hard, root: hard, silence: lock, disarm: lock };
}

/** Environment, summon targets and already-resolved reflected HP loss are handled by the caller. */
export function pvpDamageMultiplier(
  world: World,
  sourceId: string,
  targetId: string,
): number {
  const rules = world.pvp1v1;
  const source = world.heroes.get(sourceId);
  if (
    !rules ||
    !source ||
    !world.heroes.has(targetId) ||
    !world.duel?.has(sourceId) ||
    !world.duel.has(targetId)
  )
    return 1;
  return (
    rules.damageMultiplier *
    (rules.branchDamageMultipliers[source.basicId] ?? 1)
  );
}
