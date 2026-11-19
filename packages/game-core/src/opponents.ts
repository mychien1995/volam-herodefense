import { findNguDocSummon } from './ngu-doc-summons.js';
import type { Actor, Creep, SimulationConfig, World } from './types.js';

type CombatTarget = Actor &
  Pick<Creep, 'stats' | 'encounterBoss' | 'bossEncounter' | 'waveBossActor'> &
  Partial<Pick<Creep, 'hits'>>;

export function canDuel(world: World, id: string): boolean {
  return world.duelTeams ? !!world.duel?.has(id) : world.duel?.size === 2 && world.duel.has(id);
}

export function opponents(world: World, id: string): Iterable<CombatTarget> {
  if (!world.duel) return world.creeps.values();
  if (!canDuel(world, id)) return [];
  return [...world.duel].flatMap((other) => {
    const sameTeam = world.duelTeams && world.duelTeams.get(other) === world.duelTeams.get(id);
    const hero = other === id || sameTeam ? undefined : world.heroes.get(other);
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
  return ownerId !== source && world.duel.has(ownerId) &&
    (!world.duelTeams || world.duelTeams.get(ownerId) !== world.duelTeams.get(source))
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
