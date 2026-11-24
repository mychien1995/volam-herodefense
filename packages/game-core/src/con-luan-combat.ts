import { conLuan } from './con-luan-ids.js';
import { hasStatus, applyStatus, movementSkillLocked } from './status.js';
import { characterStats, rankedAbility, skillCharges } from './progression.js';
import { emit } from './combat.js';
import type {
  Ability,
  CombatArea,
  Hero,
  Point,
  SimulationConfig,
  World,
} from './types.js';

export function conLuanBasic(
  hero: Hero,
  config: SimulationConfig,
  tick: number,
): Ability | undefined {
  const ability =
    hero.basicId === conLuan.monk &&
    !config.skillCatalogue?.[conLuan.stance]?.passive &&
    hasStatus(hero, 'con_luan_ranged', tick)
      ? config.skillCatalogue?.[conLuan.bolt]
      : config.basics[hero.basicId];
  if (
    hero.basicId !== conLuan.monk ||
    !ability ||
    !('damage' in ability.effect)
  )
    return ability;
  const bonus = hero.progression
    ? (rankedAbility(hero, conLuan.stance, config)?.basicDamageBonus ?? 0)
    : 0;
  return bonus
    ? {
        ...ability,
        effect: { ...ability.effect, damage: ability.effect.damage + bonus },
      }
    : ability;
}

export function syncConLuanResources(
  hero: Hero,
  config: SimulationConfig,
  tick: number,
): void {
  if (hero.schoolId !== conLuan.school || !hero.progression || hero.hp <= 0)
    return;
  const stats = characterStats(hero, config, tick).total;
  if (hero.maxHp !== stats.maxHp)
    hero.hp = Math.min(stats.maxHp, hero.hp * (stats.maxHp / hero.maxHp));
  if (hero.maxMana !== stats.maxMana)
    hero.mana = Math.min(
      stats.maxMana,
      hero.mana * (stats.maxMana / hero.maxMana),
    );
  hero.maxHp = stats.maxHp;
  hero.maxMana = stats.maxMana;
}

export function toggleConLuanStance(
  hero: Hero,
  config: SimulationConfig,
  tick: number,
): void {
  if (hasStatus(hero, 'con_luan_ranged', tick)) {
    hero.statuses = hero.statuses!.filter(
      (status) => status.kind !== 'con_luan_ranged',
    );
  } else {
    applyStatus(
      hero,
      {
        kind: 'con_luan_ranged',
        durationTicks: Number.MAX_SAFE_INTEGER - tick,
        magnitude: 1,
      },
      hero.id,
      conLuan.stance,
      tick,
    );
  }
  syncConLuanResources(hero, config, tick);
}

export function conLuanPlants(world: World, id: string): CombatArea[] {
  return (world.areas ?? []).filter(
    (a) =>
      a.ownerId === id && a.abilityId === conLuan.plant && a.until > world.tick,
  );
}

export function conLuanPlantReady(
  world: World,
  hero: Hero,
  config: SimulationConfig,
): boolean {
  const ability = config.skillCatalogue?.[conLuan.plant];
  return (
    !!ability &&
    !!skillCharges(hero, ability, world.tick)?.count &&
    conLuanPlants(world, hero.id).length < 3
  );
}

export function useConLuanPlant(
  world: World,
  hero: Hero,
  config: SimulationConfig,
  perform: (
    world: World,
    hero: Hero,
    ability: Ability,
    config: SimulationConfig,
    kind: 'cast',
  ) => void,
): void {
  const plant = config.skillCatalogue?.[conLuan.plant];
  if (
    !plant ||
    !conLuanPlantReady(world, hero, config) ||
    movementSkillLocked(hero, world.tick) ||
    (['stun', 'silence', 'dash'] as const).some((kind) =>
      hasStatus(hero, kind, world.tick),
    ) ||
    (world.actions ?? []).some((a) => a.ownerId === hero.id)
  )
    return;
  const charges = skillCharges(hero, plant, world.tick)!;
  hero.chargeCooldowns ??= {};
  hero.chargeCooldowns[plant.id] = [
    ...charges.pending,
    (charges.pending.at(-1) ?? world.tick) + plant.cooldownTicks,
  ];
  perform(
    world,
    hero,
    {
      id: conLuan.plant,
      nameVi: plant.nameVi,
      cooldownTicks: 0,
      manaCost: 0,
      effect: {
        mode: 'dash',
        distance: 36,
        speed: 240,
        radius: config.radius,
        damage: 0,
        stunTicks: 0,
        backward: true,
      },
    },
    config,
    'cast',
  );
}

export function resetConLuanDashOnEntry(
  world: World,
  hero: Hero,
  before: Point,
): void {
  if (
    hero.basicId !== conLuan.sword ||
    (hero.abilityCooldowns?.[conLuan.dash] ?? 0) <= world.tick
  )
    return;
  const contains = (area: CombatArea, point: Point) =>
    Math.hypot(
      (point.x - area.x) / area.effect.radius,
      (point.y - area.y) / area.effect.radiusY!,
    ) <= 1;
  if (
    !conLuanPlants(world, hero.id).some(
      (area) => !contains(area, before) && contains(area, hero),
    )
  )
    return;
  hero.abilityCooldowns![conLuan.dash] = 0;
  const slot = hero.skillIds?.indexOf(conLuan.dash) ?? -1;
  if (slot >= 0) hero.skillCooldowns[slot] = 0;
  emit(world, {
    kind: 'effect',
    sourceId: hero.id,
    targetId: '',
    abilityId: conLuan.dash,
    x: hero.x,
    y: hero.y,
    damage: 0,
    critical: false,
    stage: 'reset',
  });
}
