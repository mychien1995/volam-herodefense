import { emit, hurt, offensiveStats } from './combat.js';
import { blocked, direction, distance, segmentRect } from './geometry.js';
import { nguDoc, nguDocPoisonRules as rules } from './ngu-doc-ids.js';
import {
  callNguDocSummon,
  maybeSummonZombie,
  nguDocSummons,
} from './ngu-doc-summons.js';
import { opponent, opponents } from './opponents.js';
import { characterStats, skillRank } from './progression.js';
import { applyStatus, hasStatus } from './status.js';
import type {
  Ability,
  Actor,
  Hero,
  Point,
  SimulationConfig,
  World,
} from './types.js';

const nonCrit = { critChance: 0, critMultiplier: 1 };
const held = Number.MAX_SAFE_INTEGER;

export function canCastNguDoc(
  world: World,
  hero: Hero,
  abilityId: string,
): boolean {
  if (abilityId === nguDoc.counter || abilityId === nguDoc.zombie) return false;
  return (
    abilityId !== nguDoc.reaper ||
    !hero.nguDocSummons?.some(
      (minion) =>
        minion.kind === 'reaper' &&
        minion.hp > 0 &&
        minion.expiresAt > world.tick,
    )
  );
}

function nearestEnemy(
  world: World,
  hero: Hero,
  range: number,
  config: SimulationConfig,
  preferBoss: boolean,
) {
  const boss = (enemy: ReturnType<typeof opponent> & {}) =>
    Number(
      preferBoss &&
        !!(enemy.encounterBoss || enemy.bossEncounter || enemy.waveBossActor),
    );
  return [...opponents(world, hero.id)]
    .filter(
      (enemy) =>
        enemy.hp > 0 &&
        distance(hero, enemy) <= range &&
        !config.collision.some(
          (w) =>
            w !== world.statue?.collision &&
            segmentRect(hero, enemy, w) !== undefined,
        ),
    )
    .sort(
      (a, b) =>
        boss(b) - boss(a) ||
        distance(hero, a) - distance(hero, b) ||
        a.id.localeCompare(b.id),
    )[0];
}
export function aimNguDocWorms(
  world: World,
  hero: Hero,
  ability: Ability,
  config: SimulationConfig,
): Point | undefined {
  if (ability.id !== nguDoc.worms || ability.effect.mode !== 'projectile')
    return;
  const target = nearestEnemy(world, hero, ability.effect.range, config, true);
  if (!target) return;
  hero.nguDocTargetId = target.id;
  return direction(target.x - hero.x, target.y - hero.y);
}
function toggle(
  world: World,
  hero: Hero,
  kind: 'ngu_doc_palm' | 'ngu_doc_aura',
  id: string,
): boolean {
  if (hasStatus(hero, kind, world.tick)) {
    hero.statuses =
      hero.statuses?.filter((status) => status.kind !== kind) ?? [];
    return false;
  }
  applyStatus(
    hero,
    { kind, durationTicks: held - world.tick, magnitude: 1 },
    hero.id,
    id,
    world.tick,
  );
  return true;
}

export function executeNguDocAbility(
  world: World,
  hero: Hero,
  ability: Ability,
  config: SimulationConfig,
): boolean {
  if (hero.schoolId !== nguDoc.school) return false;
  const { id, effect } = ability;
  if (id === nguDoc.coSu) {
    maybeSummonZombie(world, hero, config);
    return false; // The accepted normal attack still launches its projectile.
  }
  if (id === nguDoc.palm) {
    toggle(world, hero, 'ngu_doc_palm', id);
    return true;
  }
  if (id === nguDoc.jiangshi || id === nguDoc.reaper) {
    const rank = Math.max(1, skillRank(hero, id, config));
    if (id === nguDoc.jiangshi) {
      hero.nguDocSummons = (hero.nguDocSummons ?? []).filter(
        (minion) => minion.kind !== 'jiangshi',
      );
      for (let i = 0; i < rank; i++)
        callNguDocSummon(world, hero, config, 'jiangshi', rank, i, id);
    } else callNguDocSummon(world, hero, config, 'reaper', rank, 0, id);
    return true;
  }
  if (
    effect.mode !== 'area' ||
    ![nguDoc.pool, nguDoc.aura, nguDoc.hands].some((key) => key === id)
  )
    return false;
  const following = id === nguDoc.aura;
  if (following && !toggle(world, hero, 'ngu_doc_aura', id)) {
    world.areas =
      world.areas?.filter(
        (area) => area.ownerId !== hero.id || area.abilityId !== id,
      ) ?? [];
    return true;
  }
  const target =
    !following &&
    nearestEnemy(world, hero, effect.nearestRange!, config, id === nguDoc.pool);
  const offset = effect.forwardOffset ?? 0;
  const fallback = {
    x: hero.x + hero.fx * offset,
    y: hero.y + hero.fy * offset,
  };
  const center =
    target ||
    (!following &&
    !blocked(fallback, 2, config.width, config.height, config.collision) &&
    !config.collision.some((w) => segmentRect(hero, fallback, w) !== undefined)
      ? fallback
      : hero);
  const durationTicks = following ? held - world.tick : effect.durationTicks;
  const { attackPower } = characterStats(hero, config, world.tick).total;
  (world.areas ??= []).push({
    id: 'ngu_doc_area_' + world.nextId++,
    ownerId: hero.id,
    abilityId: id,
    x: center.x,
    y: center.y,
    until: world.tick + durationTicks,
    nextTick: world.tick + (effect.windupTicks ?? 0),
    effect: { ...effect, durationTicks },
    rawDamage:
      effect.damage + attackPower * (id === nguDoc.hands ? 0.48 : 0.05),
    ...offensiveStats(world, hero.id, config),
  });
  return true;
}

function venom(
  world: World,
  config: SimulationConfig,
  target: Actor,
  source: Hero,
  id: string,
  spec: typeof rules.palm | typeof rules.counter | typeof rules.hands,
): void {
  if (target.hp <= 0) return;
  const rank = skillRank(source, id, config);
  if (!rank) return;
  const until = world.tick + spec.seconds * config.tickRate;
  const prior = target.nguDocVenom?.find(
    (dot) => dot.ownerId === source.id && dot.abilityId === id,
  );
  if (prior) prior.until = until;
  else
    (target.nguDocVenom ??= []).push({
      ownerId: source.id,
      abilityId: id,
      next: world.tick + config.tickRate,
      until,
      damage: spec.damage + (rank - 1) * spec.rankDamage,
    });
  if (spec.slow > 0)
    applyStatus(
      target,
      {
        kind: 'slow',
        durationTicks: Math.round(config.tickRate * 1.2),
        magnitude: spec.slow,
      },
      source.id,
      id,
      world.tick,
    );
}

export function nguDocDamage(
  world: World,
  config: SimulationConfig,
  defender: Actor,
  sourceId: string,
  abilityId: string,
  stage: string | undefined,
  directHit: boolean,
): void {
  const source = world.heroes.get(sourceId);
  if (
    source?.schoolId === nguDoc.school &&
    abilityId.startsWith('ngu_doc_') &&
    abilityId === source.basicId
  )
    source.nguDocTargetId = defender.id;
  if (source && stage === 'ngu_doc_toxic' && abilityId === nguDoc.taiHiep)
    venom(world, config, defender, source, nguDoc.palm, rules.palm);
  if (source && directHit && abilityId === nguDoc.hands)
    venom(world, config, defender, source, nguDoc.hands, rules.hands);
  const counter = world.heroes.get(defender.id);
  if (
    !directHit ||
    counter?.basicId !== nguDoc.taiHiep ||
    !skillRank(counter, nguDoc.counter, config)
  )
    return;
  const attacker = opponent(world, counter.id, sourceId);
  if (attacker)
    venom(world, config, attacker, counter, nguDoc.counter, rules.counter);
}

export function attachNguDocMark(
  world: World,
  config: SimulationConfig,
  target: Actor,
  ownerId: string,
): void {
  const owner = world.heroes.get(ownerId);
  if (!owner || target.hp <= 0) return;
  const rank = skillRank(owner, nguDoc.mark, config);
  if (!rank) return;
  owner.nguDocTargetId = target.id;
  const durationTicks = rules.mark.delaySeconds * config.tickRate;
  (world.nguDocMarks ??= []).push({
    ownerId,
    targetId: target.id,
    rank,
    until: world.tick + durationTicks,
  });
  applyStatus(
    target,
    { kind: 'ngu_doc_mark', durationTicks, magnitude: 1 },
    ownerId,
    nguDoc.mark,
    world.tick,
  );
}

export function stepNguDocEffects(
  world: World,
  config: SimulationConfig,
): void {
  if (world.nguDocMarks?.length) {
    const active: NonNullable<World['nguDocMarks']> = [];
    for (const mark of world.nguDocMarks) {
      const owner = world.heroes.get(mark.ownerId);
      const target = opponent(world, mark.ownerId, mark.targetId);
      if (!owner || !target) continue;
      if (world.tick < mark.until) {
        active.push(mark);
        continue;
      }
      const snap = rules.mark;
      const damage =
        snap.damage +
        (mark.rank - 1) * snap.rankDamage +
        characterStats(owner, config, world.tick).total.attackPower *
          snap.attackScale;
      let healed = 0;
      emit(world, {
        kind: 'pulse',
        sourceId: owner.id,
        targetId: target.id,
        abilityId: nguDoc.mark,
        stage: 'detonate',
        x: target.x,
        y: target.y,
        radius: snap.radius,
        damage: 0,
        critical: false,
      });
      for (const victim of opponents(world, owner.id)) {
        if (
          victim.hp <= 0 ||
          distance(victim, target) > snap.radius ||
          config.collision.some(
            (w) => segmentRect(target, victim, w) !== undefined,
          )
        )
          continue;
        const before = victim.hp;
        if (
          hurt(world, victim, owner.id, nguDoc.mark, damage, config, nonCrit) &&
          victim.hp > 0
        )
          applyStatus(
            victim,
            { kind: 'stun', durationTicks: snap.stunTicks, magnitude: 1 },
            owner.id,
            nguDoc.mark,
            world.tick,
          );
        healed += (before - victim.hp) * snap.heal;
      }
      if (owner.hp > 0 && healed > 0)
        owner.hp = Math.min(owner.maxHp, owner.hp + healed);
    }
    world.nguDocMarks = active;
  }
  for (const actor of [
    ...world.heroes.values(),
    ...world.creeps.values(),
    ...nguDocSummons(world),
  ]) {
    if (!actor.nguDocVenom?.length) continue;
    if (actor.hp <= 0) {
      delete actor.nguDocVenom;
      continue;
    }
    actor.nguDocVenom = actor.nguDocVenom.filter(
      (dot) => world.heroes.has(dot.ownerId) && dot.until >= world.tick,
    );
    for (const dot of actor.nguDocVenom) {
      if (world.tick < dot.next) continue;
      dot.next += config.tickRate;
      hurt(world, actor, dot.ownerId, dot.abilityId, dot.damage, config, {
        ...nonCrit,
        periodic: true,
      });
    }
  }
}
