import { opponents, targetRadius } from './opponents.js';
import { emit, hurt, offensiveStats } from './combat.js';
import { distance, segmentRect } from './geometry.js';
import { applyStatus } from './status.js';
import type {
  FortuneEffect,
  Hero,
  SimulationConfig,
  StatusKind,
  World,
} from './types.js';

export const fortuneReadings = [
  'can',
  'khon',
  'doai',
  'ton',
  'kham',
  'can-nui',
  'chan',
  'ly',
] as const;

export function startFortune(
  world: World,
  hero: Hero,
  id: string,
  effect: FortuneEffect,
): void {
  const offset = Math.floor(world.random() * fortuneReadings.length);
  hero.fortune = { id, start: world.tick, offset, effect };
  applyStatus(
    hero,
    {
      kind: 'fortune_roll',
      durationTicks: effect.durationTicks + 1,
      magnitude: offset,
    },
    hero.id,
    id,
    world.tick,
  );
}

export function settleFortune(
  world: World,
  hero: Hero,
  config: SimulationConfig,
): boolean {
  const roll = hero.fortune;
  if (!roll) return false;
  const { id, offset, effect } = roll;
  // Select the last published glyph, including on the tick the deadline expires.
  const index =
    hero.statuses?.find((status) => status.kind === 'fortune_roll')
      ?.magnitude ?? offset;
  const reading = fortuneReadings[index]!;
  delete hero.fortune;
  hero.statuses = (hero.statuses ?? []).filter(
    (status) => status.kind !== 'fortune_roll',
  );
  if (hero.hp <= 0) return true;
  applyStatus(
    hero,
    {
      kind: 'fortune_result',
      durationTicks: Math.round(config.tickRate * 1.3),
      magnitude: index,
    },
    hero.id,
    id,
    world.tick,
  );
  const buff = (kind: StatusKind, magnitude: number, secondary?: number) =>
    applyStatus(
      hero,
      { kind, magnitude, secondary, durationTicks: effect.buffTicks },
      hero.id,
      id,
      world.tick,
    );
  emit(world, {
    kind: 'pulse',
    stage: `fortune:${reading}`,
    sourceId: hero.id,
    targetId: '',
    abilityId: id,
    x: hero.x,
    y: hero.y,
    radius: reading === 'doai' ? effect.blastRadius : 0,
    damage: 0,
    critical: false,
  });
  switch (reading) {
    case 'can':
      hero.hp = Math.min(
        hero.maxHp,
        hero.hp + hero.maxHp * effect.healFraction,
      );
      buff('hp_regen_buff', effect.hpRegen);
      break;
    case 'khon':
      buff('attack_buff', effect.damageMultiplier);
      buff('crit_buff', 0, effect.critMultiplier);
      break;
    case 'doai': {
      const stats = offensiveStats(world, hero.id, config);
      for (const enemy of opponents(world, hero.id))
        if (
          enemy.hp > 0 &&
          distance(hero, enemy) <=
            effect.blastRadius + targetRadius(world, enemy, config) &&
          !config.collision.some(
            (wall) => segmentRect(hero, enemy, wall) !== undefined,
          )
        )
          hurt(world, enemy, hero.id, id, effect.blastDamage, config, stats);
      break;
    }
    case 'ton':
      hero.mana = Math.min(
        hero.maxMana,
        hero.mana + hero.maxMana * effect.manaFraction,
      );
      buff('mana_regen_buff', effect.manaRegen);
      break;
    case 'kham':
      buff('speed_buff', effect.movementSpeed);
      break;
    case 'chan':
      applyStatus(
        hero,
        { kind: 'stun', magnitude: 1, durationTicks: effect.stunTicks },
        hero.id,
        id,
        world.tick,
      );
      break;
    case 'ly':
      hurt(
        world,
        hero,
        hero.id,
        id,
        Math.min(hero.hp - 1, hero.maxHp * effect.lossFraction),
        config,
        {
          critChance: 0,
          critMultiplier: 1,
          preserveFraction: true,
          unavoidableHpLoss: true,
        },
      );
      break;
  }
  return true;
}

export function stepFortune(
  world: World,
  hero: Hero,
  config: SimulationConfig,
): void {
  const roll = hero.fortune;
  if (!roll) return;
  const elapsed = world.tick - roll.start;
  if (elapsed >= roll.effect.durationTicks) {
    settleFortune(world, hero, config);
    return;
  }
  const status = hero.statuses?.find(
    (candidate) => candidate.kind === 'fortune_roll',
  );
  if (status)
    status.magnitude =
      (roll.offset + Math.floor(elapsed / roll.effect.cycleTicks)) %
      fortuneReadings.length;
}
