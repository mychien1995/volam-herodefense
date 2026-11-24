import { conLuan } from './con-luan-ids.js';
import { rankedAbility } from './progression.js';
import { applyStatus } from './status.js';
import type { Actor, Hero, SimulationConfig, World, Ability } from './types.js';

export function lightningBlock(
  world: World,
  target: Actor,
  sourceId: string,
  abilityId: string,
  config: SimulationConfig,
) {
  const monk = world.heroes.get(target.id);
  if (monk?.basicId !== conLuan.monk) return;
  const a = monk.progression
    ? rankedAbility(monk, conLuan.stance, config)
    : config.skillCatalogue?.[conLuan.stance];
  const effect = a?.reactiveBlock;
  const source = world.heroes.get(sourceId) ?? world.creeps.get(sourceId);
  if (
    !a?.passive ||
    !effect ||
    !source ||
    source.hp <= 0 ||
    source.id === target.id
  )
    return;
  if (world.heroes.has(sourceId) && !Object.hasOwn(config.basics, abilityId))
    return;
  if (world.random() >= effect.chance) return;
  return { source, abilityId: a.id, ...effect };
}
export function recordStaffHit(
  world: World,
  sourceId: string,
  abilityId: string,
  targetId: string,
): void {
  const hero = world.heroes.get(sourceId);
  if (hero?.basicId !== 'cai_bang_bong' || abilityId !== 'cai_bang_bong')
    return;
  if (hero.staffCharges?.targetId !== targetId)
    hero.staffCharges = { targetId, count: 0 };
  hero.staffCharges.count = Math.min(4, hero.staffCharges.count + 1);
  applyStatus(
    hero,
    {
      kind: 'staff_charge',
      magnitude: hero.staffCharges.count,
      durationTicks: Number.MAX_SAFE_INTEGER - world.tick,
    },
    hero.id,
    'cai_bang_bong_charge',
    world.tick,
  );
}
export function consumeStaffCharges(hero: Hero, ability: Ability): Ability {
  if (ability.consumeStaffChargeScale === undefined) return ability;
  const count =
    hero.basicId === 'cai_bang_bong' ? (hero.staffCharges?.count ?? 0) : 0;
  delete hero.staffCharges;
  hero.statuses = (hero.statuses ?? []).filter(
    (s) => s.kind !== 'staff_charge',
  );
  if (ability.effect.mode !== 'arc') return ability;
  return {
    ...ability,
    effect: {
      ...ability.effect,
      damage:
        ability.effect.damage * (1 + count * ability.consumeStaffChargeScale),
    },
  };
}
export function revealOnAction(hero: Hero, _abilityId: string): void {
  // Only the clone creation cast grants concealment. Its autonomous hits do not call perform.
  hero.statuses = (hero.statuses ?? []).filter(
    (s) =>
      !(
        s.abilityId === 'bach_liet_thien_kich' &&
        (s.kind === 'concealed' || s.kind === 'damage_reduction')
      ),
  );
}
