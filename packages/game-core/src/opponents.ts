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
    return hero ? [hero] : [];
  });
}

export function opponent(
  world: World,
  source: string,
  id: string,
): CombatTarget | undefined {
  return world.duel
    ? canDuel(world, source) && world.duel.has(id) && source !== id
      ? world.heroes.get(id)
      : undefined
    : world.creeps.get(id);
}

export function targetRadius(
  world: World,
  target: CombatTarget,
  config: SimulationConfig,
): number {
  return world.heroes.has(target.id)
    ? config.radius
    : (target.stats ?? config.creep).radius;
}
