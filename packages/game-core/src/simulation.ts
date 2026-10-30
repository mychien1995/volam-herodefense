import { createSeededRandom } from './random.js';
import {
  blocked,
  direction,
  distance,
  moveCircle,
  segmentCircle,
  segmentRect,
} from './geometry.js';
import type {
  Ability,
  Actor,
  Command,
  CombatEvent,
  Creep,
  Hero,
  Point,
  Projectile,
  SimulationConfig,
  World,
} from './types.js';

export function createWorld(config: SimulationConfig, seed = 42): World {
  const world: World = {
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
  };
  world.heroes.set(id, hero);
  return hero;
}
export function removeHero(world: World, id: string): void {
  world.heroes.delete(id);
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
  } else if (world.pending.filter((item) => item.heroId === heroId).length < 8)
    world.pending.push({ heroId, command });
  return true;
}
function emit(world: World, event: Omit<CombatEvent, 'id'>): void {
  world.events.push({ id: world.nextEvent++, ...event });
}
function hurt(
  world: World,
  target: Actor,
  sourceId: string,
  abilityId: string,
  raw: number,
  config: SimulationConfig,
): void {
  if (target.hp <= 0) return;
  const enemy = world.creeps.get(target.id);
  const critical = world.random() < config.critChance;
  const damage = Math.max(
    1,
    Math.round(
      raw *
        (100 / (100 + (enemy ? (enemy.stats ?? config.creep).defense : 0))) *
        (critical ? config.critMultiplier : 1),
    ),
  );
  target.hp = Math.max(0, target.hp - damage);
  target.hurtUntil = world.tick + 6;
  if (enemy) enemy.hits[sourceId] = world.tick;
  emit(world, {
    kind: 'hit',
    sourceId,
    targetId: target.id,
    abilityId,
    damage,
    critical,
    x: target.x,
    y: target.y,
  });
  if (target.hp === 0) {
    target.pose = 'death';
    emit(world, {
      kind: 'death',
      sourceId,
      targetId: target.id,
      abilityId,
      damage: 0,
      critical: false,
      x: target.x,
      y: target.y,
    });
    if (enemy) {
      enemy.respawnAt = world.tick + config.creep.respawnTicks;
      reward(world, enemy, config);
    }
  }
}
function reward(world: World, creep: Creep, config: SimulationConfig): void {
  const stats = creep.stats ?? config.creep;
  const eligible = [...world.heroes.values()]
    .filter(
      (hero) =>
        creep.hits[hero.id] !== undefined &&
        world.tick - (creep.hits[hero.id] ?? 0) <= stats.assistTicks,
    )
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  eligible.forEach((hero, i) => {
    hero.xp +=
      Math.floor(stats.xp / eligible.length) +
      (i < stats.xp % eligible.length ? 1 : 0);
    hero.gold +=
      Math.floor(stats.gold / eligible.length) +
      (i < stats.gold % eligible.length ? 1 : 0);
    const nextLevel = Math.min(
      config.maxLevel,
      Math.floor(hero.xp / config.xpPerLevel) + 1,
    );
    const growth = nextLevel - hero.level;
    const alive = hero.hp > 0;
    hero.level = nextLevel;
    hero.skillPoints = nextLevel;
    hero.maxHp += growth * config.hpPerLevel;
    if (alive)
      hero.hp = Math.min(hero.maxHp, hero.hp + growth * config.hpPerLevel);
  });
}
function targetDirection(world: World, hero: Hero, range: number): Point {
  const nearest = [...world.creeps.values()]
    .filter((enemy) => enemy.hp > 0 && distance(hero, enemy) <= range)
    .sort(
      (a, b) =>
        distance(hero, a) - distance(hero, b) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )[0];
  return nearest
    ? direction(nearest.x - hero.x, nearest.y - hero.y)
    : { x: hero.fx, y: hero.fy };
}
function perform(
  world: World,
  hero: Hero,
  ability: Ability,
  config: SimulationConfig,
  kind: 'attack' | 'cast',
): void {
  const effect = ability.effect;
  hero.pose = kind === 'cast' ? 'cast' : 'basic_attack';
  hero.actionUntil = world.tick + 12;
  emit(world, {
    kind,
    sourceId: hero.id,
    targetId: '',
    abilityId: ability.id,
    damage: 0,
    critical: false,
    x: hero.x,
    y: hero.y,
  });
  const rawDamage = effect.damage + (hero.level - 1) * config.attackPerLevel;
  if (effect.mode === 'arc') {
    const targets = [...world.creeps.values()]
      .filter((enemy) => {
        const delta = direction(enemy.x - hero.x, enemy.y - hero.y);
        return (
          enemy.hp > 0 &&
          !config.collision.some(
            (wall) => segmentRect(hero, enemy, wall) !== undefined,
          ) &&
          distance(hero, enemy) <=
            effect.range + (enemy.stats ?? config.creep).radius &&
          delta.x * hero.fx + delta.y * hero.fy >= Math.cos(effect.halfAngle)
        );
      })
      .sort((a, b) => {
        const da = direction(a.x - hero.x, a.y - hero.y);
        const db = direction(b.x - hero.x, b.y - hero.y);
        return (
          db.x * hero.fx + db.y * hero.fy - (da.x * hero.fx + da.y * hero.fy) ||
          distance(hero, a) - distance(hero, b) ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
        );
      });
    targets.forEach((enemy, i) =>
      hurt(
        world,
        enemy,
        hero.id,
        ability.id,
        rawDamage * (i === 0 ? 1 : effect.cleave),
        config,
      ),
    );
  } else {
    const aim = targetDirection(world, hero, effect.range);
    hero.fx = aim.x;
    hero.fy = aim.y;
    for (let i = 0; i < effect.count; i++)
      world.shots.push({
        tick: world.tick + i * effect.spacingTicks,
        ownerId: hero.id,
        ability,
        x: hero.x,
        y: hero.y,
        dx: aim.x,
        dy: aim.y,
        rawDamage,
      });
  }
}
function runCommand(
  world: World,
  hero: Hero,
  command: Command,
  config: SimulationConfig,
): void {
  if (hero.hp <= 0) return;
  if (command.kind === 'select-basic') {
    if (config.basics[command.id]) hero.basicId = command.id;
    return;
  }
  if (command.kind === 'basic') {
    const ability = config.basics[hero.basicId];
    if (ability && world.tick >= hero.cooldown) {
      hero.cooldown = world.tick + ability.cooldownTicks;
      perform(world, hero, ability, config, 'attack');
    }
  }
  if (command.kind === 'cast') {
    const ability = config.skills[command.slot];
    if (
      !ability ||
      !Number.isInteger(command.slot) ||
      command.slot < 0 ||
      world.tick < (hero.skillCooldowns[command.slot] ?? Infinity) ||
      hero.mana < ability.manaCost
    )
      return;
    hero.mana -= ability.manaCost;
    hero.skillCooldowns[command.slot] = world.tick + ability.cooldownTicks;
    perform(world, hero, ability, config, 'cast');
  }
}
function advanceProjectile(
  world: World,
  shot: Projectile,
  config: SimulationConfig,
): void {
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
  const collision = [...world.creeps.values()]
    .filter((enemy) => enemy.hp > 0)
    .map((enemy) => ({
      enemy,
      t: segmentCircle(
        shot,
        end,
        enemy,
        (enemy.stats ?? config.creep).radius + shot.effect.radius,
      ),
    }))
    .filter(
      (hit): hit is { enemy: Creep; t: number } =>
        hit.t !== undefined && hit.t < wallT,
    )
    .sort(
      (a, b) =>
        a.t - b.t ||
        (a.enemy.id < b.enemy.id ? -1 : a.enemy.id > b.enemy.id ? 1 : 0),
    )[0];
  if (collision) {
    shot.x += (end.x - shot.x) * collision.t;
    shot.y += (end.y - shot.y) * collision.t;
    const victims = [...world.creeps.values()].filter(
      (enemy) =>
        enemy.hp > 0 &&
        (enemy.id === collision.enemy.id ||
          (shot.effect.splashRadius > 0 &&
            distance(enemy, collision.enemy) <= shot.effect.splashRadius)),
    );
    for (const enemy of victims) {
      hurt(world, enemy, shot.ownerId, shot.abilityId, shot.rawDamage, config);
      if (enemy.hp > 0 && shot.effect.burnDamage > 0) {
        enemy.burnSource = shot.ownerId;
        enemy.burnDamage = shot.effect.burnDamage;
        enemy.burnUntil = world.tick + shot.effect.burnTicks;
        enemy.burnNext = world.tick + config.tickRate;
      }
    }
    world.projectiles.delete(shot.id);
  } else if (wallT < Infinity || shot.remaining <= length)
    world.projectiles.delete(shot.id);
  else {
    shot.x = end.x;
    shot.y = end.y;
    shot.remaining -= length;
  }
}
export function stepWorld(world: World, config: SimulationConfig): void {
  world.tick++;
  world.events = [];
  for (const hero of world.heroes.values()) {
    if (hero.hp <= 0) {
      hero.pose = 'death';
      continue;
    }
    if (world.tick - hero.lastMoveTick > config.inputTimeoutTicks) {
      hero.moveX = 0;
      hero.moveY = 0;
    }
    const movement = direction(hero.moveX, hero.moveY);
    if (movement.x || movement.y) {
      hero.fx = movement.x;
      hero.fy = movement.y;
      moveCircle(
        hero,
        {
          x: (movement.x * config.speed) / config.tickRate,
          y: (movement.y * config.speed) / config.tickRate,
        },
        config.radius,
        config.width,
        config.height,
        config.collision,
      );
    }
    hero.mana = Math.min(
      hero.maxMana,
      hero.mana + config.manaRegen / config.tickRate,
    );
    if (world.tick >= hero.actionUntil)
      hero.pose = movement.x || movement.y ? 'walk' : 'idle';
  }
  for (const input of world.pending.splice(0)) {
    const hero = world.heroes.get(input.heroId);
    if (hero) runCommand(world, hero, input.command, config);
  }
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
      effect: scheduled.ability.effect,
    });
  }
  world.shots = world.shots.filter((item) => item.tick > world.tick);
  for (const shot of world.projectiles.values())
    advanceProjectile(world, shot, config);
  for (const [id, enemy] of world.creeps) {
    if (enemy.hp <= 0) {
      if (enemy.invasion && world.tick >= enemy.respawnAt) {
        world.creeps.delete(id);
        continue;
      }
      if (
        !enemy.invasion &&
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
      hurt(world, enemy, enemy.burnSource, 'burn', enemy.burnDamage, config);
      enemy.burnNext += config.tickRate;
    }
    if (enemy.hp <= 0) continue;
    const stats = enemy.stats ?? config.creep;
    const nearest = [...world.heroes.values()]
      .filter(
        (player) =>
          player.hp > 0 && distance(player, enemy) < stats.detectionRange,
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
    const delta = direction(target.x - enemy.x, target.y - enemy.y);
    const moving =
      distance(enemy, target) >
      (hero
        ? stats.attackRange
        : objective
          ? stats.attackRange + objective.radius
          : 2);
    if (moving) {
      enemy.fx = delta.x;
      enemy.fy = delta.y;
      moveCircle(
        enemy,
        {
          x: (delta.x * stats.speed) / config.tickRate,
          y: (delta.y * stats.speed) / config.tickRate,
        },
        stats.radius,
        config.width,
        config.height,
        config.collision,
      );
    }
    const victim = hero ?? objective;
    if (victim && !moving && world.tick >= enemy.cooldown) {
      enemy.cooldown = world.tick + stats.attackCooldownTicks;
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
      hurt(world, victim, enemy.id, 'creep_strike', stats.damage, config);
      if (world.statue?.hp === 0) break;
    }
    if (world.tick >= enemy.actionUntil) enemy.pose = moving ? 'walk' : 'idle';
  }
  for (const actor of [...world.heroes.values(), ...world.creeps.values()]) {
    if (actor.hp <= 0) actor.pose = 'death';
    else if (world.tick < actor.hurtUntil) actor.pose = 'hurt';
  }
}
