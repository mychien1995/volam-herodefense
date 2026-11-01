const compareId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
import { addCreep } from './simulation.js';
import { emit, hurt } from './combat.js';
import { cancelOwnedEffects, hasStatus, statusValue } from './status.js';
import {
  blocked,
  direction,
  distance,
  moveCircle,
  segmentRect,
} from './geometry.js';
import type {
  BossAbilityId,
  BossAttackDefinition,
  BossCast,
} from './boss-types.js';
import type { Creep, Hero, SimulationConfig, World } from './types.js';

export function spawnBossEncounter(
  world: World,
  config: SimulationConfig,
  instanceId = '',
): void {
  const d = config.bossEncounter;
  if (!d) throw Error('Missing boss encounter definition');
  if (world.boss) cancelOwnedEffects(world, world.boss.actorId);
  world.creeps.clear();
  world.projectiles.clear();
  const boss = addCreep(world, 'boss_ly_mac_sau', d.spawn, config);
  boss.archetypeId = 'ly_mac_sau';
  boss.encounterBoss = true;
  boss.stats = { ...d.stats };
  boss.hp = boss.maxHp = d.stats.hp;
  boss.forcedMovementImmune = true;
  boss.controlResistance = d.controlResistance;
  world.boss = {
    actorId: boss.id,
    instanceId: instanceId || world.boss?.instanceId || d.id,
    killSerial: world.boss?.killSerial ?? 0,
    rewarded: false,
    rotation: 0,
    nextActionAt: world.tick + d.openingTicks,
  };
}

function cue(world: World, boss: Creep, cast: BossCast, stage: string) {
  emit(world, {
    kind: 'cast',
    sourceId: boss.id,
    targetId: cast.targetId,
    abilityId: cast.id,
    ...cast.origin,
    fx: cast.fx,
    fy: cast.fy,
    stage,
    damage: 0,
    critical: false,
  });
}
function begin(
  world: World,
  config: SimulationConfig,
  boss: Creep,
  attack: BossAttackDefinition,
  target: Hero,
) {
  const runtime = world.boss!;
  const aim = direction(target.x - boss.x, target.y - boss.y);
  boss.fx = aim.x;
  boss.fy = aim.y;
  runtime.cast = {
    id: attack.id,
    startedAt: world.tick,
    releaseAt: world.tick + attack.windupTicks,
    until: world.tick + attack.windupTicks + attack.recoveryTicks,
    targetId: target.id,
    fx: aim.x,
    fy: aim.y,
    origin: { x: boss.x, y: boss.y },
    released: false,
  };
  boss.castAbilityId = attack.id;
  boss.pose = attack.id === 'ly_mac_sau_basic' ? 'basic_attack' : 'cast';
  boss.actionUntil = runtime.cast.until;
  runtime.nextActionAt =
    runtime.cast.until + config.bossEncounter!.intervalTicks;
  cue(world, boss, runtime.cast, 'warning');
}
function release(
  world: World,
  config: SimulationConfig,
  boss: Creep,
  cast: BossCast,
  attack: BossAttackDefinition,
) {
  const d = config.bossEncounter!;
  if (cast.id === 'bang_phach_ngan_cham') {
    const target = world.heroes.get(cast.targetId);
    if (target && target.hp > 0) {
      const aim = direction(target.x - boss.x, target.y - boss.y);
      boss.fx = cast.fx = aim.x;
      boss.fy = cast.fy = aim.y;
    }
  }
  cue(world, boss, cast, 'release');
  const missile = (
    x: number,
    y: number,
    fx: number,
    fy: number,
    targetId?: string,
  ) => {
    const id = `boss_projectile_${world.nextId++}`;
    world.projectiles.set(id, {
      id,
      ownerId: boss.id,
      abilityId: cast.id,
      x,
      y,
      vx: fx * attack.speed,
      vy: fy * attack.speed,
      remaining: attack.range,
      rawDamage: attack.damage,
      hostile: true,
      ...(targetId ? { targetId } : {}),
      critChance: 0,
      critMultiplier: 1,
      effect: {
        mode: 'projectile',
        damage: attack.damage,
        speed: attack.speed,
        range: attack.range,
        radius: attack.radius,
        count: 1,
        spacingTicks: 0,
        splashRadius: 0,
        burnDamage: 0,
        burnTicks: 0,
      },
    });
  };
  if (cast.id === 'bang_phach_ngan_cham') {
    // One selected living target, sampled once at actual release. Never re-aim in flight.
    const target = world.heroes.get(cast.targetId);
    if (!target || target.hp <= 0) return;
    const aim = direction(target.x - boss.x, target.y - boss.y);
    missile(boss.x + aim.x * 24, boss.y + aim.y * 24, aim.x, aim.y, target.id);
  } else if (cast.id === 'xich_luyen_chuong') {
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      missile(boss.x, boss.y, Math.cos(angle), Math.sin(angle));
    }
  } else if (cast.id === 'ngu_doc_chuong') {
    for (const p of d.edgeEmitters) missile(p.x, p.y, p.fx, p.fy);
  } else if (cast.id === 'co_mo_kiem_phap') {
    const living = [...world.creeps.values()].filter(
      (c) => c.summonedBy === boss.id && c.hp > 0,
    ).length;
    for (const p of d.summonSpawns.slice(
      0,
      Math.min(d.summonCount, d.summonLimit - living),
    )) {
      if (
        blocked(
          p,
          d.summonStats.radius,
          config.width,
          config.height,
          config.collision,
        )
      )
        continue;
      const summon = addCreep(world, `am_binh_${world.nextId++}`, p, config);
      summon.archetypeId = 'co_mo_am_binh';
      summon.summonedBy = boss.id;
      summon.expiresAt = world.tick + d.summonLifetimeTicks;
      summon.stats = { ...d.summonStats };
      summon.hp = summon.maxHp = d.summonStats.hp;
      emit(world, {
        kind: 'effect',
        sourceId: boss.id,
        targetId: summon.id,
        abilityId: cast.id,
        ...p,
        stage: 'summon_spawn',
        damage: 0,
        critical: false,
      });
    }
  } else {
    const victims = [...world.heroes.values()]
      .filter((h) => {
        if (h.hp <= 0 || distance(h, boss) > attack.range + config.radius)
          return false;
        const aim = direction(h.x - boss.x, h.y - boss.y);
        return (
          aim.x * cast.fx + aim.y * cast.fy >= Math.cos(attack.halfAngle) &&
          !config.collision.some(
            (wall) => segmentRect(boss, h, wall) !== undefined,
          )
        );
      })
      .sort(
        (a, b) =>
          distance(a, boss) - distance(b, boss) || compareId(a.id, b.id),
      );
    for (const [i, target] of victims.entries())
      hurt(
        world,
        target,
        boss.id,
        cast.id,
        attack.damage * (i === 0 ? 1 : 0.65),
        config,
        { critChance: 0, critMultiplier: 1, fx: cast.fx, fy: cast.fy },
      );
  }
}

export function stepBossEncounter(
  world: World,
  config: SimulationConfig,
): void {
  const d = config.bossEncounter,
    runtime = world.boss;
  if (!d || !runtime) return;
  const boss = world.creeps.get(runtime.actorId);
  if (!boss) return;
  if (boss.hp <= 0) {
    if (!runtime.rewarded) {
      runtime.rewarded = true;
      runtime.killSerial++;
      runtime.cast = undefined;
      boss.castAbilityId = '';
      cancelOwnedEffects(world, boss.id);
      for (const c of world.creeps.values())
        if (c.summonedBy === boss.id) {
          c.hp = 0;
          c.pose = 'death';
          c.respawnAt = world.tick + config.tickRate;
        }
      const eligible = [...world.heroes.values()]
        .filter((h) => Object.hasOwn(boss.hits, h.id))
        .sort((a, b) => compareId(a.id, b.id));
      // Exactly one item per kill; preserve it as a match-only pending claim until M4 inventory exists.
      const item =
        d.loot[
          Math.min(
            d.loot.length - 1,
            Math.floor(world.random() * d.loot.length),
          )
        ]!;
      const rolls = eligible.map((h) => ({
        playerId: h.id,
        roll: 1 + Math.floor(world.random() * 100),
      }));
      const winning = [...rolls].sort(
        (a, b) => b.roll - a.roll || compareId(a.playerId, b.playerId),
      )[0];
      const winner = winning && world.heroes.get(winning.playerId);
      if (winner) {
        const claim = {
          id: `${runtime.instanceId}:kill:${runtime.killSerial}`,
          itemId: item.id,
          nameVi: item.nameVi,
          winnerId: winner.id,
          rolls,
        };
        (winner.bossLoot ??= []).push(claim);
        emit(world, {
          kind: 'effect',
          sourceId: boss.id,
          targetId: winner.id,
          abilityId: 'ly_mac_sau_loot',
          x: boss.x,
          y: boss.y,
          stage: item.id,
          damage: 0,
          critical: false,
        });
      }
    }
    return;
  }
  const cast = runtime.cast;
  if (cast) {
    if (
      hasStatus(boss, 'stun', world.tick) ||
      (cast.id !== 'ly_mac_sau_basic' && hasStatus(boss, 'silence', world.tick))
    ) {
      runtime.cast = undefined;
      boss.castAbilityId = '';
      boss.actionUntil = world.tick;
      boss.pose = 'idle';
      return;
    }
    if (!cast.released && world.tick >= cast.releaseAt) {
      cast.released = true;
      release(
        world,
        config,
        boss,
        cast,
        d.attacks.find((a) => a.id === cast.id)!,
      );
    }
    if (world.tick < cast.until) {
      boss.pose = cast.id === 'ly_mac_sau_basic' ? 'basic_attack' : 'cast';
      return;
    }
    runtime.cast = undefined;
    boss.castAbilityId = '';
  }
  if (hasStatus(boss, 'stun', world.tick)) {
    boss.pose = 'idle';
    return;
  }
  const target = [...world.heroes.values()]
    .filter((h) => h.hp > 0)
    .sort(
      (a, b) => distance(a, boss) - distance(b, boss) || compareId(a.id, b.id),
    )[0];
  if (!target) {
    boss.pose = 'idle';
    return;
  }
  const next: BossAbilityId = d.rotation[runtime.rotation % d.rotation.length]!;
  const attack = d.attacks.find((a) => a.id === next)!;
  if (
    world.tick >= runtime.nextActionAt &&
    !hasStatus(boss, 'silence', world.tick) &&
    (next !== 'phat_tran_cong' || distance(target, boss) <= attack.range + 30)
  ) {
    runtime.rotation++;
    begin(world, config, boss, attack, target);
    return;
  }
  const basic = d.attacks.find((a) => a.id === 'ly_mac_sau_basic')!;
  if (
    distance(target, boss) <= basic.range + config.radius &&
    world.tick >= boss.cooldown &&
    !hasStatus(boss, 'disarm', world.tick)
  ) {
    boss.cooldown = world.tick + d.stats.attackCooldownTicks;
    const nextAt = runtime.nextActionAt;
    begin(world, config, boss, basic, target);
    runtime.nextActionAt = Math.max(nextAt, runtime.cast!.until);
    return;
  }
  if (distance(target, boss) > basic.range) {
    const aim = direction(target.x - boss.x, target.y - boss.y);
    boss.fx = aim.x;
    boss.fy = aim.y;
    const amount =
      (d.stats.speed *
        (1 - Math.min(0.85, statusValue(boss, 'slow', world.tick)))) /
      config.tickRate;
    moveCircle(
      boss,
      { x: aim.x * amount, y: aim.y * amount },
      d.stats.radius,
      config.width,
      config.height,
      config.collision,
    );
    boss.pose = 'walk';
  } else boss.pose = 'idle';
}
