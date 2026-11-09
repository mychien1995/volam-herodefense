import { emit, hurt, offensiveStats } from './combat.js';
import {
  blocked,
  direction,
  distance,
  insideEllipse,
  segmentCircle,
  segmentRect,
} from './geometry.js';
import { applyStatus, displace, hasStatus } from './status.js';
import type {
  Creep,
  Hero,
  Point,
  SimulationConfig,
  SkillAction,
  World,
} from './types.js';

export const tamLienTram = {
  id: 'tam_lien_tram',
  basicId: 'thien_son_dao',
  charges: 6,
  windowSeconds: 2,
  cooldownSeconds: 10,
  range: 220,
  radius: 18,
  damage: 30,
  passTicks: 5,
  offsets: [
    [68, 44],
    [-68, 44],
    [0, 55],
  ],
} as const;

function creepGroup(target: Creep, config: SimulationConfig): string {
  return (target.invasion || config.dungeonAggro) &&
    !target.encounterBoss &&
    !target.bossEncounter &&
    !target.waveBossActor &&
    !config.campaign?.bosses[target.id]
    ? 'creeps'
    : target.id;
}

export function recordTamLienHit(
  world: World,
  hero: Hero,
  targetId: string,
  config: SimulationConfig,
) {
  const target = world.creeps.get(targetId);
  if (
    !target ||
    hero.hp <= 0 ||
    hero.basicId !== tamLienTram.basicId ||
    world.tick < (hero.abilityCooldowns?.[tamLienTram.id] ?? 0)
  )
    return;
  const group = creepGroup(target, config);
  const old = hero.tamLien;
  const progress =
    old?.group === group && (!old.readyUntil || old.readyUntil > world.tick)
      ? old
      : { group, targetId, charges: 0, readyUntil: 0 };
  if (target.hp > 0) progress.targetId = targetId;
  if (
    progress.charges < tamLienTram.charges &&
    ++progress.charges === tamLienTram.charges
  )
    progress.readyUntil =
      world.tick + tamLienTram.windowSeconds * config.tickRate;
  hero.tamLien = progress;
}

function passable(from: Point, to: Point, config: SimulationConfig): boolean {
  if (blocked(to, config.radius, config.width, config.height, config.collision))
    return false;
  if (config.heroBounds && !insideEllipse(to, config.heroBounds, config.radius))
    return false;
  return !config.collision.some(
    (wall) => segmentRect(from, to, wall, config.radius) !== undefined,
  );
}

export function startTamLienTram(
  world: World,
  hero: Hero,
  config: SimulationConfig,
): void {
  const ready = hero.tamLien;
  if (
    hero.basicId !== tamLienTram.basicId ||
    !ready ||
    ready.readyUntil <= world.tick ||
    world.tick < (hero.abilityCooldowns?.[tamLienTram.id] ?? 0) ||
    (world.actions ?? []).some((a) => a.ownerId === hero.id) ||
    (['stun', 'root', 'silence', 'disarm'] as const).some((kind) =>
      hasStatus(hero, kind, world.tick),
    )
  )
    return;
  const eligible = (enemy: Creep | undefined): enemy is Creep =>
    !!enemy &&
    enemy.hp > 0 &&
    distance(hero, enemy) <= tamLienTram.range &&
    !config.collision.some(
      (wall) => segmentRect(hero, enemy, wall) !== undefined,
    );
  let target = world.creeps.get(ready.targetId);
  if (!eligible(target) && ready.group === 'creeps')
    target = [...world.creeps.values()]
      .filter(
        (enemy) => creepGroup(enemy, config) === 'creeps' && eligible(enemy),
      )
      .sort((a, b) => distance(hero, a) - distance(hero, b))[0];
  if (!eligible(target)) return;
  let start: Point = hero;
  for (const [dx, dy] of tamLienTram.offsets) {
    const from = { x: target.x - dx, y: target.y - dy };
    const to = { x: target.x + dx, y: target.y + dy };
    if (!passable(start, from, config) || !passable(from, to, config)) return;
    start = to;
  }
  delete hero.tamLien;
  (hero.abilityCooldowns ??= {})[tamLienTram.id] =
    world.tick + tamLienTram.cooldownSeconds * config.tickRate;
  const until = world.tick + tamLienTram.passTicks * tamLienTram.offsets.length;
  hero.pose = 'cast';
  hero.castAbilityId = tamLienTram.id;
  hero.actionStartedAt = world.tick;
  hero.actionUntil = until;
  applyStatus(
    hero,
    { kind: 'dash', durationTicks: until - world.tick, magnitude: 1 },
    hero.id,
    tamLienTram.id,
    world.tick,
  );
  (world.actions ??= []).push({
    id: `action_${world.nextId++}`,
    ownerId: hero.id,
    abilityId: tamLienTram.id,
    kind: 'dash',
    startedAt: world.tick,
    until,
    nextTick: world.tick,
    remaining: 0,
    fx: hero.fx,
    fy: hero.fy,
    hitIds: [],
    effect: {
      mode: 'dash',
      distance: 0,
      speed: 0,
      radius: tamLienTram.radius,
      damage: tamLienTram.damage,
      stunTicks: 0,
    },
    tamLien: { targetId: target.id, center: { x: target.x, y: target.y } },
    rawDamage: tamLienTram.damage,
    finisherDamage: 0,
    ...offensiveStats(world, hero.id, config),
  });
}

export function stepTamLienTram(
  world: World,
  hero: Hero,
  action: SkillAction,
  config: SimulationConfig,
): void {
  const combo = action.tamLien!;
  const age = world.tick - action.startedAt!;
  const phase = age % tamLienTram.passTicks;
  const index = Math.floor(age / tamLienTram.passTicks);
  const [dx, dy] = tamLienTram.offsets[index]!;
  const from = { x: combo.center.x - dx, y: combo.center.y - dy };
  const to = { x: combo.center.x + dx, y: combo.center.y + dy };
  if (!phase) {
    if (!passable(hero, from, config) || !passable(from, to, config)) {
      action.until = hero.actionUntil = world.tick;
      return;
    }
    hero.x = from.x;
    hero.y = from.y;
    const heading = direction(dx, dy);
    hero.fx = action.fx = heading.x;
    hero.fy = action.fy = heading.y;
    action.hitIds = [];
    emit(world, {
      kind: 'pulse',
      sourceId: hero.id,
      targetId: combo.targetId,
      abilityId: tamLienTram.id,
      ...from,
      fx: heading.x,
      fy: heading.y,
      radius: distance(from, to),
      stage: `cross_${index}`,
      damage: 0,
      critical: false,
    });
  }
  const before = { x: hero.x, y: hero.y };
  displace(
    hero,
    (2 * dx) / tamLienTram.passTicks,
    (2 * dy) / tamLienTram.passTicks,
    config.radius,
    config,
  );
  const target = world.creeps.get(combo.targetId);
  if (
    target &&
    target.hp > 0 &&
    !action.hitIds.length &&
    segmentCircle(
      before,
      hero,
      target,
      tamLienTram.radius + (target.stats ?? config.creep).radius,
    ) !== undefined &&
    !config.collision.some(
      (wall) => segmentRect(hero, target, wall) !== undefined,
    )
  ) {
    action.hitIds.push(target.id);
    hurt(
      world,
      target,
      hero.id,
      tamLienTram.id,
      action.rawDamage,
      config,
      action,
    );
  }
}
