import { emit, hurt } from './combat.js';
import {
  blocked,
  direction,
  distance,
  moveCircle,
  segmentRect,
} from './geometry.js';
import {
  nguDoc,
  nguDocSummonPrefix,
  nguDocSummonRules as rules,
} from './ngu-doc-ids.js';
import { opponents, targetRadius } from './opponents.js';
import { characterStats, skillRank } from './progression.js';
import { applyStatus, hasStatus, statusValue } from './status.js';
import type {
  Actor,
  Hero,
  NguDocSummon,
  Point,
  ProjectileEffect,
  SimulationConfig,
  World,
} from './types.js';
import type { NguDocSummonKind } from './ngu-doc-ids.js';

export function* nguDocSummons(world: World): IterableIterator<NguDocSummon> {
  for (const hero of world.heroes.values()) yield* hero.nguDocSummons ?? [];
}
export function findNguDocSummon(
  world: World,
  id: string,
): NguDocSummon | undefined {
  if (!id.startsWith(nguDocSummonPrefix)) return undefined;
  for (const summon of nguDocSummons(world))
    if (summon.id === id) return summon;
  return undefined;
}

function spawnPoint(owner: Hero, config: SimulationConfig, slot = 0): Point {
  for (const step of [0, 1, 2, 3, 4, 5, 6, 7]) {
    const angle = (Math.PI * ((slot + step) % 8)) / 4;
    const point = {
      x: owner.x + Math.cos(angle) * 48,
      y: owner.y + Math.sin(angle) * 48,
    };
    if (!blocked(point, 13, config.width, config.height, config.collision))
      return point;
  }
  return { x: owner.x, y: owner.y };
}

export function relocateNguDocSummons(
  owner: Hero,
  config: SimulationConfig,
  fromTick: number,
  toTick: number,
  keep: boolean,
): void {
  if (!owner.nguDocSummons) return;
  owner.nguDocSummons = keep
    ? owner.nguDocSummons.filter(
        (minion) => minion.kind === 'reaper' && minion.hp > 0,
      )
    : [];
  delete owner.nguDocTargetId;
  for (const minion of owner.nguDocSummons) {
    const shift = (at: number) => toTick + Math.max(0, at - fromTick);
    Object.assign(minion, spawnPoint(owner, config), {
      cooldown: shift(minion.cooldown),
      waveAt: shift(minion.waveAt),
      slamAt: shift(minion.slamAt),
      pose: 'idle',
      actionUntil: toTick,
      hurtUntil: toTick,
      statuses: [],
    });
    delete minion.castAbilityId;
  }
}

function summonStats(
  minion: NguDocSummon,
  equipment: ReturnType<typeof characterStats>['sources']['equipment'],
) {
  const base = rules[minion.kind];
  const ranks = minion.rank - 1;
  const maxHp = Math.round(
    base.hp + base.rankHp * ranks + equipment.maxHp * rules.gearShare,
  );
  minion.hp =
    minion.maxHp === maxHp
      ? minion.hp
      : Math.min(maxHp, (minion.hp * maxHp) / minion.maxHp);
  minion.maxHp = maxHp;
  minion.damage =
    base.damage +
    base.rankDamage * ranks +
    equipment.attackPower * rules.gearShare;
  minion.defense = base.defense + equipment.defense * rules.gearShare;
  return {
    speed: base.speed + equipment.movementSpeed * rules.gearShare,
    interval: Math.max(
      8,
      Math.round(base.interval / (1 + equipment.attackSpeed * rules.gearShare)),
    ),
  };
}

export function callNguDocSummon(
  world: World,
  hero: Hero,
  config: SimulationConfig,
  kind: NguDocSummonKind,
  rank: number,
  slot: number,
  abilityId: string,
): void {
  const base = rules[kind];
  hero.nguDocSummonSerial = (hero.nguDocSummonSerial ?? 0) + 1;
  const minion: NguDocSummon = {
    id: nguDocSummonPrefix + hero.id + '_' + hero.nguDocSummonSerial,
    ownerId: hero.id,
    kind,
    rank,
    ...spawnPoint(hero, config, slot),
    hp: base.hp,
    maxHp: base.hp,
    defense: base.defense,
    damage: base.damage,
    radius: 13,
    fx: hero.fx,
    fy: hero.fy,
    pose: 'idle',
    cooldown: world.tick + 13 + slot * 2,
    hurtUntil: 0,
    actionUntil: 0,
    expiresAt: base.lifetime
      ? world.tick + base.lifetime * config.tickRate
      : Infinity,
    waveAt: world.tick + rules.reaperWaveSeconds * config.tickRate,
    slamAt: world.tick + rules.reaperSlamSeconds * config.tickRate,
  };
  summonStats(
    minion,
    characterStats(hero, config, world.tick).sources.equipment,
  );
  (hero.nguDocSummons ??= []).push(minion);
  emit(world, {
    kind: 'effect',
    sourceId: hero.id,
    targetId: minion.id,
    abilityId,
    x: minion.x,
    y: minion.y,
    damage: 0,
    critical: false,
    stage: 'summoned',
  });
}

export function maybeSummonZombie(
  world: World,
  hero: Hero,
  config: SimulationConfig,
): void {
  const rank = skillRank(hero, nguDoc.zombie, config);
  const count =
    hero.nguDocSummons?.filter(
      (m) => m.kind === 'zombie' && m.hp > 0 && m.expiresAt > world.tick,
    ).length ?? 0;
  if (
    rank > 0 &&
    count < rules.zombieCap &&
    world.random() < rules.zombieChance[rank]!
  )
    callNguDocSummon(
      world,
      hero,
      config,
      'zombie',
      rank,
      count + 2,
      nguDoc.zombie,
    );
}

const nonCrit = { critChance: 0, critMultiplier: 1 };
function swing(
  world: World,
  config: SimulationConfig,
  owner: Hero,
  minion: NguDocSummon,
  target: Actor,
  radius: number,
  abilityId: string,
): void {
  const slam = abilityId === nguDoc.reaperSlam;
  const sweep = abilityId === nguDoc.reaperSweep;
  const victims = radius
    ? [...opponents(world, owner.id)].filter(
        (enemy) =>
          enemy.hp > 0 &&
          distance(enemy, target) <=
            radius + targetRadius(world, enemy, config),
      )
    : [target];
  for (const victim of victims)
    if (
      !config.collision.some(
        (w) => segmentRect(minion, victim, w) !== undefined,
      ) &&
      hurt(
        world,
        victim,
        owner.id,
        abilityId,
        minion.damage * (slam ? 1.6 : 1),
        config,
        nonCrit,
      ) &&
      victim.hp > 0
    ) {
      if (slam || sweep)
        applyStatus(
          victim,
          slam
            ? { kind: 'stun', durationTicks: 23, magnitude: 1 }
            : { kind: 'slow', durationTicks: 32, magnitude: 0.2 },
          owner.id,
          abilityId,
          world.tick,
        );
    }
}

function wave(world: World, owner: Hero, minion: NguDocSummon): void {
  const id = `projectile_${world.nextId++}`;
  const effect: ProjectileEffect = {
    mode: 'projectile',
    damage: minion.damage * 1.12,
    speed: 395,
    range: 280,
    radius: 25,
    count: 1,
    spacingTicks: 0,
    splashRadius: 0,
    burnDamage: 0,
    burnTicks: 0,
    piercing: true,
  };
  world.projectiles.set(id, {
    id,
    ownerId: owner.id,
    abilityId: nguDoc.reaperWave,
    x: minion.x,
    y: minion.y,
    vx: minion.fx * effect.speed,
    vy: minion.fy * effect.speed,
    remaining: effect.range,
    rawDamage: effect.damage,
    effect,
    spawnedAt: world.tick,
    ...nonCrit,
  });
}

export function stepNguDocSummons(
  world: World,
  config: SimulationConfig,
): void {
  for (const owner of world.heroes.values()) {
    if (!owner.nguDocSummons?.length) continue;
    owner.nguDocSummons = owner.nguDocSummons.filter(
      (minion) => minion.hp > 0 && minion.expiresAt > world.tick,
    );
    if (!owner.nguDocSummons.length) continue;
    const { equipment } = characterStats(owner, config, world.tick).sources;
    const enemies = [...opponents(world, owner.id)].filter(
      (enemy) => enemy.hp > 0 && distance(owner, enemy) <= rules.leash,
    );
    owner.nguDocSummons.forEach((minion, slot) => {
      const { speed, interval } = summonStats(minion, equipment);
      if (distance(owner, minion) > rules.catchUp)
        Object.assign(minion, spawnPoint(owner, config, slot));
      if (hasStatus(minion, 'stun', world.tick)) {
        minion.pose = 'idle';
        return;
      }
      if (world.tick < minion.actionUntil) return;
      minion.pose = 'idle';
      const target =
        distance(owner, minion) <= rules.leash
          ? (enemies.find((e) => e.id === owner.nguDocTargetId) ??
            enemies
              .filter((e) => distance(e, minion) <= rules.aggro)
              .sort(
                (a, b) =>
                  distance(a, minion) - distance(b, minion) ||
                  a.id.localeCompare(b.id),
              )[0])
          : undefined;
      const to = target ?? spawnPoint(owner, config, slot);
      const angle = direction(to.x - minion.x, to.y - minion.y);
      const reaper = minion.kind === 'reaper';
      const distanceTo = distance(minion, to);
      const line =
        target &&
        !config.collision.some(
          (w) => segmentRect(minion, target, w) !== undefined,
        );
      const inReach =
        target &&
        distanceTo <=
          rules[minion.kind].reach + targetRadius(world, target, config);
      const useWave =
        reaper && line && distanceTo <= 250 && world.tick >= minion.waveAt;
      if ((!inReach || !line) && !useWave) {
        if (!target && distanceTo <= rules.followDistance / 2) return;
        const before = { x: minion.x, y: minion.y };
        const step = Math.min(
          distanceTo,
          (speed / config.tickRate) *
            (1 - Math.min(0.85, statusValue(minion, 'slow', world.tick))),
        );
        moveCircle(
          minion,
          { x: angle.x * step, y: angle.y * step },
          minion.radius,
          config.width,
          config.height,
          config.collision,
        );
        if (distance(before, minion) > 0.01) {
          minion.fx = angle.x;
          minion.fy = angle.y;
          minion.pose = 'walk';
        }
        return;
      }
      if (
        !target ||
        world.tick < minion.cooldown ||
        hasStatus(minion, 'disarm', world.tick)
      )
        return;
      minion.fx = angle.x;
      minion.fy = angle.y;
      const slam = reaper && inReach && world.tick >= minion.slamAt;
      const abilityId = slam
        ? nguDoc.reaperSlam
        : useWave
          ? nguDoc.reaperWave
          : reaper
            ? nguDoc.reaperSweep
            : minion.kind === 'jiangshi'
              ? nguDoc.jiangshi
              : nguDoc.zombie;
      minion.castAbilityId = abilityId;
      minion.actionUntil = world.tick + (slam ? 18 : 12);
      minion.cooldown = world.tick + interval;
      minion.pose = slam || useWave ? 'cast' : 'basic_attack';
      if (slam)
        minion.slamAt = world.tick + rules.reaperSlamSeconds * config.tickRate;
      else if (useWave) {
        minion.waveAt = world.tick + rules.reaperWaveSeconds * config.tickRate;
        wave(world, owner, minion);
      }
      if (slam || !useWave)
        swing(
          world,
          config,
          owner,
          minion,
          target,
          slam ? 104 : reaper ? 69 : 0,
          abilityId,
        );
      if (reaper)
        emit(world, {
          kind: 'effect',
          sourceId: minion.id,
          targetId: target.id,
          abilityId,
          x: slam ? target.x : minion.x,
          y: slam ? target.y : minion.y,
          fx: minion.fx,
          fy: minion.fy,
          damage: 0,
          critical: false,
        });
    });
  }
}
