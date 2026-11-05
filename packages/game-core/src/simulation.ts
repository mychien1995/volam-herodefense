import { stepBossBanter } from './boss-banter.js';
import { dungeonWaypoint } from './dungeon-navigation.js';
import { dash, blink, rechargeDash } from './mobility.js';
import { stepChu, constrainChuTrap } from './chu-ba-thong.js';
import {
  answerNamDe,
  clearNamDeHero,
  clearNamDeIfEmpty,
  finishNamDeTick,
  namDeMovement,
  stepNamDe,
} from './nam-de.js';
import { expireCombos } from './combos.js';
import { bufferComboFinisher, takeComboFinisher } from './combo-finisher.js';
import { stepBossEncounter } from './boss-encounter.js';
import { nextBasic, expireBasicChain } from './basic-attacks.js';
import { separateDungeonCreeps } from './creep-spacing.js';
import { captureConfinement, confineMovement } from './confinement.js';
import {
  equippedAbility,
  perform,
  stepSkillActions,
  stepAreas,
  stepSupports,
} from './skills.js';
import { emit, hurt, offensiveStats, expireGuardCounters } from './combat.js';
import { ownerProtection } from './protection.js';
import {
  cancelOwnedEffects,
  expireStatuses,
  hasStatus,
  applyStatus,
  statusValue,
  displace,
} from './status.js';
import { createSeededRandom } from './random.js';
import { abilityCooldown, characterStats } from './progression.js';
import {
  blocked,
  clampEllipse,
  direction,
  distance,
  moveCircle,
  segmentCircle,
  segmentRect,
} from './geometry.js';
import type {
  Command,
  Actor,
  Creep,
  Hero,
  Point,
  Projectile,
  SimulationConfig,
  World,
} from './types.js';

export function createWorld(config: SimulationConfig, seed = 42): World {
  const world: World = {
    banterSeed: seed,
    tick: 0,
    heroes: new Map(),
    creeps: new Map(),
    projectiles: new Map(),
    events: [],
    nextId: 1,
    nextEvent: 1,
    random: createSeededRandom(seed),
    pending: [],
    shots: [],
  };
  spawnCreeps(world, config);
  return world;
}
export function spawnCreeps(
  world: World,
  config: SimulationConfig,
  prefix = 'creep',
): void {
  world.creeps.clear();
  config.creepSpawns.forEach((spawn, index) =>
    world.creeps.set(
      `${prefix}_${index}`,
      makeCreep(`${prefix}_${index}`, spawn, config),
    ),
  );
}
export function addCreep(
  world: World,
  id: string,
  spawn: Point,
  config: SimulationConfig,
): Creep {
  const enemy = makeCreep(id, spawn, config);
  world.creeps.set(id, enemy);
  return enemy;
}
function makeCreep(id: string, spawn: Point, config: SimulationConfig): Creep {
  return {
    id,
    ...spawn,
    spawn: { ...spawn },
    hp: config.creep.hp,
    maxHp: config.creep.hp,
    fx: -1,
    fy: 0,
    pose: 'idle',
    actionUntil: 0,
    hurtUntil: 0,
    cooldown: 0,
    respawnAt: 0,
    hits: {},
    burnSource: '',
    burnUntil: 0,
    burnNext: 0,
    burnDamage: 0,
  };
}
export function addHero(
  world: World,
  id: string,
  nickname: string,
  config: SimulationConfig,
): Hero {
  const hero: Hero = {
    dashCharges: config.mobility?.charges ?? 0,
    schoolId: 'cai_bang',
    id,
    nickname,
    x: config.spawn.x,
    y: config.spawn.y + world.heroes.size * config.radius * 5,
    hp: config.maxHp,
    maxHp: config.maxHp,
    mana: config.maxMana,
    maxMana: config.maxMana,
    fx: 1,
    fy: 0,
    pose: 'idle',
    actionUntil: 0,
    hurtUntil: 0,
    cooldown: 0,
    xp: 0,
    gold: 0,
    level: 1,
    skillPoints: 1,
    basicId: Object.keys(config.basics)[0] ?? '',
    moveX: 0,
    moveY: 0,
    lastMoveTick: 0,
    lastSequence: 0,
    skillCooldowns: [0, 0, 0, 0],
    skillIds: config.skills.map((s) => s.id),
    abilityCooldowns: {},
    statuses: [],
  };
  world.heroes.set(id, hero);
  return hero;
}
export function removeHero(world: World, id: string): void {
  world.vuong?.participantLeft(id);
  clearNamDeHero(world, id);
  cancelOwnedEffects(world, id);
  world.heroes.delete(id);
  clearNamDeIfEmpty(world);
  for (const [key, shot] of world.projectiles)
    if (shot.ownerId === id) world.projectiles.delete(key);
  world.shots = world.shots.filter((shot) => shot.ownerId !== id);
  world.pending = world.pending.filter((item) => item.heroId !== id);
}
/** Called only with runtime-validated inputs by the authoritative transport adapter. */
export function submitInput(
  world: World,
  heroId: string,
  sequence: number,
  command: Command,
): boolean {
  const hero = world.heroes.get(heroId);
  if (!hero || !Number.isSafeInteger(sequence) || sequence <= hero.lastSequence)
    return false;
  if (
    command.kind === 'move' &&
    ![command.x, command.y].every(
      (n) => Number.isInteger(n) && Math.abs(n) <= 1,
    )
  )
    return false;
  hero.lastSequence = sequence;
  if (command.kind === 'move') {
    hero.moveX = command.x;
    hero.moveY = command.y;
    hero.lastMoveTick = world.tick;
  } else if (
    world.pending.filter((item) => item.heroId === heroId).length <
    (command.kind === 'nam-de-key' ? 16 : 8)
  )
    world.pending.push({ heroId, command });
  return true;
}
function runCommand(
  world: World,
  hero: Hero,
  command: Command,
  config: SimulationConfig,
): void {
  if (hero.hp <= 0) return;
  if (command.kind === 'nam-de-key') {
    if (command.castId.startsWith('vtd:')) {
      world.vuong?.submitKey(world, hero.id, command.castId, command.index, command.key);
      return;
    }
    answerNamDe(
      world,
      config,
      hero,
      command.castId,
      command.index,
      command.key,
    );
    return;
  }
  if (hero.namDeLocked || world.vuong?.locked(hero.id)) return;
  if (command.kind === 'dev-loadout') {
    if (hero.progression) return;
    if (
      command.ids.length !== 4 ||
      command.ids.some(
        (id) => id && !Object.hasOwn(config.skillCatalogue ?? {}, id),
      ) ||
      new Set(command.ids.filter(Boolean)).size !==
        command.ids.filter(Boolean).length
    )
      return;
    hero.abilityCooldowns ??= {};
    (hero.skillIds ?? config.skills.map((s) => s.id)).forEach((id, i) => {
      hero.abilityCooldowns![id] = Math.max(
        hero.abilityCooldowns![id] ?? 0,
        hero.skillCooldowns[i] ?? 0,
      );
    });
    const foreignStatuses = (hero.statuses ?? []).filter(
      (s) => s.sourceId !== hero.id,
    );
    cancelOwnedEffects(world, hero.id);
    hero.statuses = foreignStatuses;
    hero.skillIds = [...command.ids];
    hero.skillCooldowns = command.ids.map(
      (id) => hero.abilityCooldowns![id] ?? 0,
    );
    return;
  }
  if (command.kind === 'select-basic') {
    if (hero.progression) return;
    if (config.basics[command.id]) {
      hero.basicId = command.id;
      hero.basicChains = {};
    }
    return;
  }
  if (command.kind === 'dash') {
    dash(world, hero, config);
    return;
  }
  if (command.kind === 'basic') {
    if (
      hasStatus(hero, 'stun', world.tick) ||
      hasStatus(hero, 'disarm', world.tick) ||
      (world.actions ?? []).some((a) => a.ownerId === hero.id)
    )
      return;
    const ability = config.basics[hero.basicId];
    if (ability && world.tick >= hero.cooldown) {
      hero.cooldown =
        world.tick + abilityCooldown(hero, ability, config, world.tick, true);
      const next = nextBasic(hero, ability);
      if (ability.manualChain) {
        if (hero.basicChains?.[ability.id] === 0) {
          hero.cooldown = world.tick + ability.manualChain.cooldownTicks;
          delete hero.basicChainDeadline;
        } else
          hero.basicChainDeadline = {
            abilityId: ability.id,
            until: world.tick + ability.manualChain.idleTicks,
          };
      }
      perform(world, hero, next.ability, config, 'attack', next.stage);
    }
  }
  if (command.kind === 'cast') {
    if (!Number.isInteger(command.slot) || command.slot < 0 || command.slot > 3)
      return;
    if (
      hasStatus(hero, 'stun', world.tick) ||
      hasStatus(hero, 'silence', world.tick) ||
      (world.actions ?? []).some((a) => a.ownerId === hero.id)
    )
      return;
    const ability = equippedAbility(hero, command.slot, config);
    if (ability && blink(world, hero, ability.id, config)) return;
    const togglingOff =
      ability?.effect.mode === 'mana_shield' &&
      ability.effect.toggle &&
      hero.statuses?.some(
        (s) =>
          s.kind === 'mana_shield' &&
          s.abilityId === ability.id &&
          s.until > world.tick,
      );
    if (
      !ability ||
      (ability.effect.mode === 'guard_counter' &&
        hero.statuses?.some(
          (s) =>
            s.kind === 'guard_counter' &&
            s.abilityId === ability.id &&
            s.until > world.tick,
        )) ||
      !Number.isInteger(command.slot) ||
      command.slot < 0 ||
      command.slot > 3 ||
      world.tick < (hero.skillCooldowns[command.slot] ?? Infinity) ||
      world.tick < (hero.abilityCooldowns?.[ability.id] ?? 0) ||
      (!togglingOff && hero.mana < ability.manaCost)
    )
      return;
    if (!togglingOff) hero.mana -= ability.manaCost;
    hero.skillCooldowns[command.slot] =
      world.tick + abilityCooldown(hero, ability, config, world.tick);
    hero.abilityCooldowns ??= {};
    hero.abilityCooldowns[ability.id] = hero.skillCooldowns[command.slot]!;
    perform(
      world,
      hero,
      ability,
      config,
      'cast',
      togglingOff ? 'toggle_off' : undefined,
    );
  }
}
function advanceProjectile(
  world: World,
  shot: Projectile,
  config: SimulationConfig,
): void {
  if (shot.lingerUntil !== undefined) {
    if (world.tick >= shot.lingerUntil) world.projectiles.delete(shot.id);
    return;
  }
  const length = Math.min(
    shot.remaining,
    Math.hypot(shot.vx, shot.vy) / config.tickRate,
  );
  const dir = direction(shot.vx, shot.vy);
  const end = { x: shot.x + dir.x * length, y: shot.y + dir.y * length };
  let wallT = blocked(end, shot.effect.radius, config.width, config.height, [])
    ? 1
    : Infinity;
  for (const wall of config.collision)
    wallT = Math.min(
      wallT,
      segmentRect(shot, end, wall, shot.effect.radius) ?? Infinity,
    );
  const targets: Actor[] = shot.hostile
    ? [...world.heroes.values()]
    : [...world.creeps.values()];
  const collisions = targets
    .filter(
      (enemy) =>
        enemy.hp > 0 &&
        !(shot.hitIds ?? []).includes(enemy.id) &&
        (!shot.targetId || enemy.id === shot.targetId),
    )
    .map((enemy) => ({
      enemy,
      t: segmentCircle(
        shot,
        end,
        enemy,
        (world.creeps.get(enemy.id)?.stats?.radius ??
          (shot.hostile ? config.radius : config.creep.radius)) +
          shot.effect.radius,
      ),
    }))
    .filter(
      (hit): hit is { enemy: Actor; t: number } =>
        hit.t !== undefined && hit.t < wallT,
    )
    .sort(
      (a, b) =>
        a.t - b.t ||
        (a.enemy.id < b.enemy.id ? -1 : a.enemy.id > b.enemy.id ? 1 : 0),
    );
  const hits = shot.effect.piercing ? collisions : collisions.slice(0, 1);
  shot.hitIds ??= [];
  for (const collision of hits) {
    if (shot.effect.splashRadius > 0)
      emit(world, {
        kind: 'pulse',
        sourceId: shot.ownerId,
        targetId: collision.enemy.id,
        abilityId: shot.abilityId,
        x: collision.enemy.x,
        y: collision.enemy.y,
        fx: dir.x,
        fy: dir.y,
        radius: shot.effect.splashRadius,
        stage: 'explosion',
        damage: 0,
        critical: false,
      });
    const victims = targets.filter(
      (enemy) =>
        enemy.hp > 0 &&
        (enemy.id === collision.enemy.id ||
          (shot.effect.splashRadius > 0 &&
            distance(enemy, collision.enemy) <= shot.effect.splashRadius)),
    );
    for (const enemy of victims) {
      if (shot.hitIds.includes(enemy.id)) continue;
      shot.hitIds.push(enemy.id);
      const hit = hurt(
        world,
        enemy,
        shot.ownerId,
        shot.abilityId,
        shot.rawDamage,
        config,
        {
          ...(shot.critChance === undefined
            ? offensiveStats(world, shot.ownerId, config)
            : {
                critChance: shot.critChance,
                critMultiplier: shot.critMultiplier ?? config.critMultiplier,
              }),
          fx: dir.x,
          fy: dir.y,
          slowedBonus: shot.effect.slowedBonus,
          combo: shot.combo,
          comboTargets: shot.comboTargets,
        },
      );
      if (hit && shot.refund && !shot.refund.used) {
        shot.refund.used = true;
        const hero = world.heroes.get(shot.ownerId);
        if (hero && hero.hp > 0) {
          hero.mana = Math.min(hero.maxMana, hero.mana + shot.refund.amount);
          emit(world, {
            kind: 'pulse',
            sourceId: hero.id,
            targetId: hero.id,
            abilityId: shot.abilityId,
            x: hero.x,
            y: hero.y,
            fx: dir.x,
            fy: dir.y,
            stage: 'refund',
            damage: 0,
            critical: false,
          });
        }
      }
      if (enemy.hp > 0)
        for (const status of shot.effect.statuses ?? [])
          applyStatus(enemy, status, shot.ownerId, shot.abilityId, world.tick);
      const before = { x: enemy.x, y: enemy.y };
      if (
        enemy.hp > 0 &&
        shot.effect.knockback &&
        (shot.effect.knockbackChance === undefined ||
          world.random() < shot.effect.knockbackChance)
      )
        displace(
          enemy,
          dir.x * shot.effect.knockback,
          dir.y * shot.effect.knockback,
          (world.creeps.get(enemy.id)?.stats ?? config.creep).radius,
          config,
          world.tick,
        );
      confineMovement(world, enemy, before, config);
      const burned = world.creeps.get(enemy.id);
      if (burned && burned.hp > 0 && shot.effect.burnDamage > 0) {
        burned.burnSource = shot.ownerId;
        burned.burnDamage = shot.effect.burnDamage;
        burned.burnUntil = world.tick + shot.effect.burnTicks;
        burned.burnNext = world.tick + config.tickRate;
      }
    }
  }
  if (
    (hits.length > 0 && !shot.effect.piercing) ||
    wallT < Infinity ||
    (shot.remaining <= length &&
      (!shot.effect.boomerang || shot.leg === 'return'))
  ) {
    if (
      shot.effect.blinkWindowTicks &&
      wallT === Infinity &&
      shot.remaining <= length
    ) {
      shot.x = end.x;
      shot.y = end.y;
      shot.remaining = 0;
      shot.lingerUntil = world.tick + shot.effect.blinkWindowTicks;
      shot.stage = 'sword_linger';
    } else world.projectiles.delete(shot.id);
  } else {
    shot.x = end.x;
    shot.y = end.y;
    shot.remaining -= length;
    if (shot.remaining <= 0 && shot.effect.boomerang && shot.leg !== 'return') {
      const owner = world.heroes.get(shot.ownerId);
      if (!owner || owner.hp <= 0) {
        world.projectiles.delete(shot.id);
        return;
      }
      const aim = direction(owner.x - shot.x, owner.y - shot.y);
      shot.vx = aim.x * shot.effect.speed;
      shot.vy = aim.y * shot.effect.speed;
      shot.remaining = distance(owner, shot);
      shot.leg = 'return';
      shot.hitIds = [];
      emit(world, {
        kind: 'pulse',
        sourceId: owner.id,
        targetId: '',
        abilityId: shot.abilityId,
        x: shot.x,
        y: shot.y,
        fx: aim.x,
        fy: aim.y,
        stage: 'projectile_return',
        damage: 0,
        critical: false,
      });
    }
  }
}
export function stepWorld(world: World, config: SimulationConfig): void {
  world.tick++;
  world.events = [];
  world.bacCai?.prepare(world, config);
  expireGuardCounters(world, config);
  expireStatuses(world);
  expireCombos(world);
  for (const hero of world.heroes.values()) {
    expireBasicChain(
      hero,
      world.tick,
      config.basics[hero.basicChainDeadline?.abilityId ?? '']?.manualChain
        ?.cooldownTicks ?? 0,
    );
    rechargeDash(hero, world.tick, config);
    if (hero.hp <= 0) {
      hero.pose = 'death';
      cancelOwnedEffects(world, hero.id);
      hero.statuses = [];
      continue;
    }
    if (world.tick - hero.lastMoveTick > config.inputTimeoutTicks) {
      hero.moveX = 0;
      hero.moveY = 0;
    }
    const movement = namDeMovement(world, hero);
    const stats = characterStats(hero, config, world.tick).total;
    const runSpeedMultiplier = world.waveBossTest?.runSpeedMultiplier ?? 1;
    if (
      (movement.x || movement.y) &&
      !hero.namDeLocked &&
      !world.vuong?.locked(hero.id) &&
      !hasStatus(hero, 'root', world.tick) &&
      !hasStatus(hero, 'stun', world.tick) &&
      !hasStatus(hero, 'dash', world.tick) &&
      !(world.actions ?? []).some(
        (a) => a.ownerId === hero.id && a.effect.mode === 'projectile',
      )
    ) {
      hero.fx = movement.x;
      hero.fy = movement.y;
      moveCircle(
        hero,
        {
          x:
            (movement.x * stats.movementSpeed * runSpeedMultiplier) /
            config.tickRate,
          y:
            (movement.y * stats.movementSpeed * runSpeedMultiplier) /
            config.tickRate,
        },
        config.radius,
        config.width,
        config.height,
        config.collision,
      );
    }
    hero.mana = Math.min(
      hero.maxMana,
      hero.mana + stats.manaRegen / config.tickRate,
    );
    if (config.heroBounds) clampEllipse(hero, config.heroBounds, config.radius);
    const fieldRegen =
      (ownerProtection(world, hero)?.effect.ownerRegenFraction ?? 0) *
      hero.maxHp;
    hero.hp = Math.min(
      hero.maxHp,
      hero.hp + (stats.hpRegen + fieldRegen) / config.tickRate,
    );
    if (world.tick >= hero.actionUntil)
      hero.pose =
        !hasStatus(hero, 'stun', world.tick) && (movement.x || movement.y)
          ? 'walk'
          : 'idle';
  }
  stepChu(world, config);
  stepNamDe(world, config);
  for (const input of world.pending.splice(0)) {
    const hero = world.heroes.get(input.heroId);
    if (hero) {
      if (bufferComboFinisher(world, hero, input.command, config)) continue;
      if (input.command.kind !== 'move') delete hero.comboFinisher;
      runCommand(world, hero, input.command, config);
    }
  }
  constrainChuTrap(world, config);
  captureConfinement(world, config);
  // Resolve from the previous collision tick before stepping the new action,
  // preserving the original 18-tick spacing between finisher volleys.
  for (const hero of world.heroes.values()) {
    const command = takeComboFinisher(world, hero, config);
    if (command) runCommand(world, hero, command, config);
  }
  stepSkillActions(world, config);
  stepAreas(world, config);
  stepSupports(world, config);
  for (const scheduled of world.shots.filter(
    (item) => item.tick <= world.tick,
  )) {
    if (
      scheduled.ability.effect.mode !== 'projectile' ||
      (world.heroes.get(scheduled.ownerId)?.hp ?? 0) <= 0
    )
      continue;
    const id = `projectile_${world.nextId++}`;
    world.projectiles.set(id, {
      id,
      ownerId: scheduled.ownerId,
      abilityId: scheduled.ability.id,
      x: scheduled.x,
      y: scheduled.y,
      vx: scheduled.dx * scheduled.ability.effect.speed,
      vy: scheduled.dy * scheduled.ability.effect.speed,
      remaining: scheduled.ability.effect.range,
      rawDamage: scheduled.rawDamage,
      ...(scheduled.critChance === undefined
        ? {}
        : {
            critChance: scheduled.critChance,
            critMultiplier: scheduled.critMultiplier ?? config.critMultiplier,
          }),
      effect: scheduled.ability.effect,
      ...(scheduled.ability.combo ? { combo: scheduled.ability.combo } : {}),
      ...(scheduled.comboTargets
        ? { comboTargets: scheduled.comboTargets }
        : {}),
      ...(scheduled.ability.effect.boomerang
        ? { leg: 'outbound' as const }
        : {}),
      ...(scheduled.refund ? { refund: scheduled.refund } : {}),
      ...(scheduled.stage ? { stage: scheduled.stage } : {}),
    });
  }
  world.shots = world.shots.filter((item) => item.tick > world.tick);
  for (const shot of world.projectiles.values())
    advanceProjectile(world, shot, config);
  constrainChuTrap(world, config);
  stepBossEncounter(world, config);
  const creepStarts = config.dungeonAggro
    ? new Map([...world.creeps].map(([id, e]) => [id, { x: e.x, y: e.y }]))
    : undefined;
  for (const [id, enemy] of world.creeps) {
    if (
      enemy.summonedBy &&
      (world.tick >= (enemy.expiresAt ?? Infinity) ||
        (enemy.hp <= 0 && world.tick >= enemy.respawnAt))
    ) {
      world.creeps.delete(id);
      continue;
    }
    if (enemy.hp <= 0) {
      if (enemy.waveBossActor) continue;
      if (enemy.invasion && world.tick >= enemy.respawnAt) {
        world.creeps.delete(id);
        continue;
      }
      if (
        !enemy.invasion &&
        !enemy.neverRespawn &&
        enemy.archetypeId !== 'bac_cai' &&
        config.creepRespawn !== false &&
        world.tick >= enemy.respawnAt
      )
        world.creeps.set(id, makeCreep(id, enemy.spawn, config));
      continue;
    }
    if (
      enemy.burnDamage > 0 &&
      world.tick <= enemy.burnUntil &&
      world.tick >= enemy.burnNext
    ) {
      hurt(world, enemy, enemy.burnSource, 'burn', enemy.burnDamage, config, {
        ...offensiveStats(world, enemy.burnSource, config),
        periodic: true,
      });
      enemy.burnNext += config.tickRate;
    }
    if (
      enemy.hp <= 0 ||
      enemy.bossEncounter ||
      enemy.controlled ||
      enemy.encounterBoss
    )
      continue;
    const stats = enemy.stats ?? config.creep;
    const nearest = [...world.heroes.values()]
      .filter(
        (player) =>
          player.hp > 0 &&
          (config.dungeonAggro ||
            distance(player, enemy) < stats.detectionRange),
      )
      .sort(
        (a, b) =>
          distance(a, enemy) - distance(b, enemy) ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      )[0];
    let hero = nearest;
    if (enemy.invasion) {
      const ai = enemy.invasion;
      hero = world.heroes.get(ai.targetId);
      if (
        hero &&
        (hero.hp <= 0 ||
          distance(hero, enemy) > ai.chaseRange ||
          distance(hero, ai.chaseOrigin) > ai.chaseRange)
      )
        hero = undefined;
      if (ai.targetId && !hero) {
        ai.targetId = '';
        ai.reacquireAt = world.tick + ai.aggroRestTicks;
      }
      if (!hero && world.tick >= ai.reacquireAt && nearest) {
        hero = nearest;
        ai.targetId = hero.id;
        ai.chaseOrigin = { x: enemy.x, y: enemy.y };
      }
    }
    const objective = enemy.invasion ? world.statue : undefined;
    const target = hero ??
      objective ?? {
        x: enemy.spawn.x,
        y: enemy.spawn.y + (Math.floor(world.tick / 90) % 2 ? 32 : -32),
      };
    if (config.dungeonAggro) enemy.aggroTargetId = hero?.id ?? '';
    const waypoint =
      config.dungeonAggro && hero
        ? dungeonWaypoint(enemy, hero, world.tick, config)
        : target;
    const delta = direction(waypoint.x - enemy.x, waypoint.y - enemy.y);
    const moving =
      !(config.dungeonAggro && !hero && !objective) &&
      (distance(enemy, target) >
        (hero
          ? stats.attackRange
          : objective
            ? stats.attackRange + objective.radius
            : 2) ||
        !!(
          config.dungeonAggro &&
          hero &&
          config.collision.some(
            (w) => segmentRect(enemy, hero, w) !== undefined,
          )
        ));
    if (moving && !hasStatus(enemy, 'stun', world.tick)) {
      const before = { x: enemy.x, y: enemy.y };
      enemy.fx = delta.x;
      enemy.fy = delta.y;
      moveCircle(
        enemy,
        {
          x:
            (delta.x *
              stats.speed *
              (1 - Math.min(0.85, statusValue(enemy, 'slow', world.tick)))) /
            config.tickRate,
          y:
            (delta.y *
              stats.speed *
              (1 - Math.min(0.85, statusValue(enemy, 'slow', world.tick)))) /
            config.tickRate,
        },
        stats.radius,
        config.width,
        config.height,
        config.collision,
      );
      confineMovement(world, enemy, before, config);
    }
    const victim = hero ?? objective;
    if (
      victim &&
      !moving &&
      world.tick >= enemy.cooldown &&
      !hasStatus(enemy, 'stun', world.tick) &&
      !hasStatus(enemy, 'disarm', world.tick) &&
      !(
        config.dungeonAggro &&
        config.collision.some(
          (w) => segmentRect(enemy, victim, w) !== undefined,
        )
      )
    ) {
      enemy.cooldown =
        world.tick +
        Math.ceil(
          stats.attackCooldownTicks /
            (1 - Math.min(0.85, statusValue(enemy, 'attack_slow', world.tick))),
        );
      enemy.actionUntil = world.tick + 12;
      enemy.pose = 'basic_attack';
      emit(world, {
        kind: 'attack',
        sourceId: enemy.id,
        targetId: victim.id,
        abilityId: 'creep_strike',
        damage: 0,
        critical: false,
        x: enemy.x,
        y: enemy.y,
      });
      if (enemy.rangedAttack && hero) {
        const effect = enemy.rangedAttack,
          aim = direction(hero.x - enemy.x, hero.y - enemy.y);
        const id = `creep_projectile_${world.nextId++}`;
        world.projectiles.set(id, {
          id,
          ownerId: enemy.id,
          abilityId: 'co_mo_minion_needle',
          x: enemy.x,
          y: enemy.y,
          vx: aim.x * effect.speed,
          vy: aim.y * effect.speed,
          remaining: effect.range,
          rawDamage: effect.damage,
          hostile: true,
          effect,
          critChance: 0,
          critMultiplier: 1,
        });
      } else
        hurt(world, victim, enemy.id, 'creep_strike', stats.damage, config);
      if (world.statue?.hp === 0) break;
    }
    if (world.tick >= enemy.actionUntil)
      enemy.pose =
        !hasStatus(enemy, 'stun', world.tick) && moving ? 'walk' : 'idle';
  }
  // DOT/counters can finish the boss after its AI phase. Resolve that death and
  // unique loot in the same tick, before projecting the authoritative snapshot.
  if (world.boss && (world.creeps.get(world.boss.actorId)?.hp ?? 1) <= 0)
    stepBossEncounter(world, config);
  separateDungeonCreeps(world, config, creepStarts);
  for (const actor of [...world.heroes.values(), ...world.creeps.values()]) {
    if (actor.hp <= 0) actor.pose = 'death';
    else if (world.tick < actor.hurtUntil) actor.pose = 'hurt';
  }
  finishNamDeTick(world);
  world.bacCai?.step(world, config);
  world.vuong?.step(world, config);
  stepBossBanter(world, config);
}
