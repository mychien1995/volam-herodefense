import { findNguDocSummon } from './ngu-doc-summons.js';
import type { Actor, Creep, SimulationConfig, World } from './types.js';

type CombatTarget = Actor &
  Pick<Creep, 'stats' | 'encounterBoss' | 'bossEncounter' | 'waveBossActor'> &
  Partial<Pick<Creep, 'hits'>>;

export function canDuel(world: World, id: string): boolean {
  return world.duel?.size === 2 && world.duel.has(id);
}

export function opponents(world: World, id: string): Iterable<CombatTarget> {
  if (!world.duel) return world.creeps.values();
  if (!canDuel(world, id)) return [];
  return [...world.duel].flatMap((other) => {
    const hero = other === id ? undefined : world.heroes.get(other);
    return hero ? [hero, ...(hero.nguDocSummons ?? [])] : [];
  });
}

export function opponent(
  world: World,
  source: string,
  id: string,
): CombatTarget | undefined {
  if (!world.duel) return world.creeps.get(id);
  if (!canDuel(world, source)) return;
  const minion = findNguDocSummon(world, id);
  const ownerId = minion?.ownerId ?? id;
  return ownerId !== source && world.duel.has(ownerId)
    ? (minion ?? world.heroes.get(id))
    : undefined;
}

export function targetRadius(
  world: World,
  target: CombatTarget,
  config: SimulationConfig,
): number {
  return world.heroes.has(target.id)
    ? config.radius
    : (findNguDocSummon(world, target.id)?.radius ??
        (target.stats ?? config.creep).radius);
}
