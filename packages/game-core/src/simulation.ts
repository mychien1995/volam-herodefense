import { invasionApproach } from './invasion-route.js';
import { bossFightReady } from './boss-provocation.js';
import { nguDoc } from './ngu-doc-ids.js';
import {
  attachNguDocMark,
  canCastNguDoc,
  returnNguDocGrub,
  stepNguDocEffects,
} from './ngu-doc-combat.js';
import { nguDocSummons, stepNguDocSummons } from './ngu-doc-summons.js';
import { duongMon } from './duong-mon-ids.js';
import { canDuel, opponent, opponents, targetRadius } from './opponents.js';
import { stepEquipmentCombat, withBasicEquipment } from './equipment-combat.js';
import { stepBossBanter } from './boss-banter.js';
import { advanceDragonDive } from './dragon-dive.js';
import { dungeonWaypoint, findWalkPath } from './dungeon-navigation.js';
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
import { conLuan } from './con-luan-ids.js';
import {
  conLuanBasic,
  conLuanPlants,
  resetConLuanDashOnEntry,
  syncConLuanResources,
  toggleConLuanStance,
  useConLuanPlant,
} from './con-luan-combat.js';
import { startTamLienTram, tamLienTram } from './tam-lien-tram.js';
import {
  recallSpinningProjectile,
  stepSpinningProjectile,
} from './spinning-projectile.js';
import { separateDungeonCreeps } from './creep-spacing.js';
import {
  captureConfinement,
  confineMovement,
  enforceConfinement,
} from './confinement.js';
import {
  equippedAbility,
  basicTargetInRange,
  perform,
  stepSkillActions,
  stepAreas,
  stepSupports,
  stepScatters,
  skyfallAiming,
} from './skills.js';
import { settleFortune, stepFortune } from './fortune.js';
import { emit, hurt, offensiveStats, expireGuardCounters } from './combat.js';
import { ownerProtection } from './protection.js';
import {
  cancelOwnedEffects,
  expireStatuses,
  hasStatus,
  applyStatus,
  statusValue,
  displace,
  movementSkillLocked,
  selectableTarget,
} from './status.js';
import { createSeededRandom } from './random.js';
import {
  abilityCooldown,
  characterStats,
  skillCharges,
} from './progression.js';
import {
  blocked,
  clampEllipse,
  insideEllipse,
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
function setMoveDestination(hero: Hero, { x, y }: Point): void {
  hero.moveX = hero.moveY = 0;
  hero.moveDestination = { point: { x, y } };
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
  if (
    command.kind === 'move-to' &&
    ![command.x, command.y].every(Number.isFinite)
  )
    return false;
  hero.lastSequence = sequence;
  if (command.kind === 'move' || command.kind === 'move-to') {
    world.pending = world.pending.filter(
      (item) => item.heroId !== heroId || item.command.kind !== 'move-to',
    );
  }
  if (command.kind === 'auto-basic') {
    hero.autoBasic = command.enabled;
  } else if (command.kind === 'move-to' && !command.targetId) {
    if (hero.hp > 0) setMoveDestination(hero, command);
  } else if (command.kind === 'move') {
    delete hero.moveDestination;
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
  automatic = false,
): void {
  if (hero.hp <= 0) return;
  if (command.kind === 'move-to') {
    const target = command.targetId
      ? opponent(world, hero.id, command.targetId)
      : undefined;
    if (!target || target.hp <= 0) {
      setMoveDestination(hero, command);
    } else {
      delete hero.comboFinisher;
      runCommand(world, hero, { kind: 'basic', targetId: target.id }, config);
    }
    return;
  }
  if (world.duel && !canDuel(world, hero.id)) return;
  if (command.kind === 'nam-de-key') {
    if (command.castId.startsWith('vtd:')) {
      world.vuong?.submitKey(
        world,
        hero.id,
        command.castId,
        command.index,
        command.key,
      );
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
  if (
    hero.namDeLocked ||
    world.vuong?.locked(hero.id) ||
    hasStatus(hero, 'guard_counter', world.tick) ||
    hasStatus(hero, 'duong_mon_shell', world.tick)
  )
    return;
  if (command.kind === 'tam-lien-tram') {
    if (hero.basicId === conLuan.sword)
      useConLuanPlant(world, hero, config, perform);
    else startTamLienTram(world, hero, config);
    return;
  }
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
  const raisingSwords = skyfallAiming(world, hero.id);
  if (command.kind === 'dash') {
    if (raisingSwords) return;
    dash(world, hero, config);
    return;
  }
  if (command.kind === 'basic') {
    if (
      (automatic && world.tick < hero.actionUntil) ||
      hasStatus(hero, 'stun', world.tick) ||
      hasStatus(hero, 'disarm', world.tick) ||
      raisingSwords ||
      (world.actions ?? []).some((a) => a.ownerId === hero.id && !a.detached)
    )
      return;
    const ability = conLuanBasic(hero, config, world.tick);
    const conLuanMelee = ability?.id === conLuan.monk;
    const instantConLuanMelee = conLuanMelee && !ability.minIntervalTicks;
    const conLuanBeatReady =
      !conLuanMelee ||
      hero.lastBasicTick === undefined ||
      world.tick >= hero.lastBasicTick + (ability.minIntervalTicks ?? 0);
    if (
      ability &&
      conLuanBeatReady &&
      (instantConLuanMelee || world.tick >= hero.cooldown) &&
      ((!automatic && ability.cooldownTicks !== 0) ||
        hero.lastBasicTick !== world.tick)
    ) {
      const aimed =
        command.targetId && opponent(world, hero.id, command.targetId);
      const target = automatic
        ? nearestBasicEnemy(world, hero, ability, config)
        : aimed || undefined;
      if (
        (automatic || command.targetId !== undefined) &&
        (!target || !basicTargetInRange(world, hero, target, ability, config))
      )
        return;
      if (command.targetId) {
        delete hero.moveDestination;
        hero.moveX = hero.moveY = 0;
      }
      const dao = ability.id === tamLienTram.basicId;
      hero.lastBasicTick = world.tick;
      if (!instantConLuanMelee)
        hero.cooldown =
          world.tick +
          (ability.id === conLuan.bolt
            ? config.tickRate
            : abilityCooldown(hero, ability, config, world.tick, true));
      const next = nextBasic(hero, ability, world.random);
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
      perform(
        world,
        hero,
        withBasicEquipment(next.ability, hero, config),
        config,
        'attack',
        dao
          ? `dao_swing_${Math.floor(world.random() * 3)}`
          : ability.id === duongMon.coQuan &&
              hasStatus(hero, 'duong_mon_flight', world.tick)
            ? 'feather'
            : next.stage,
        target,
      );
      if (next.stage && hero.basicChains?.[ability.id] === 0)
        hero.cooldown += ability.basicComboEndRecoveryTicks ?? 0;
    }
  }
  if (command.kind === 'cast') {
    if (!Number.isInteger(command.slot) || command.slot < 0 || command.slot > 4)
      return;
    if (
      hasStatus(hero, 'stun', world.tick) ||
      hasStatus(hero, 'silence', world.tick)
    )
      return;
    const ability = equippedAbility(hero, command.slot, config);
    if (
      (ability && !canCastNguDoc(world, hero, ability.id)) ||
      ability?.id === duongMon.elements ||
      ability?.passive ||
      (ability?.id === duongMon.flight &&
        hero.mana < 1 &&
        !hasStatus(hero, 'duong_mon_flight', world.tick))
    )
      return;
    if (
      ability?.effect.mode === 'fortune' &&
      hero.fortune?.id === ability.id &&
      settleFortune(world, hero, config)
    )
      return;
    if (
      raisingSwords ||
      (world.actions ?? []).some((a) => a.ownerId === hero.id && !a.detached)
    )
      return;
    if (
      (ability?.effect.mode === 'dash' ||
        (ability?.airborneEffect?.mode === 'dash' &&
          hasStatus(hero, 'duong_mon_flight', world.tick))) &&
      (movementSkillLocked(hero, world.tick) || inQuicksand(world, hero))
    )
      return;
    if (
      ability?.id === conLuan.detonate &&
      !conLuanPlants(world, hero.id).length
    )
      return;
    if (ability?.effect.mode === 'projectile' && ability.effect.recallDrain) {
      const shot = [...world.projectiles.values()].find(
        (p) => p.ownerId === hero.id && p.abilityId === ability.id,
      );
      if (shot) {
        if (shot.leg !== 'return') {
          if (shot.remaining > 0) {
            shot.remaining = 0;
            shot.vx = shot.vy = 0;
            shot.stage = 'fan_hold';
          } else recallSpinningProjectile(shot);
        }
        return;
      }
      if (
        world.shots.some(
          (s) => s.ownerId === hero.id && s.ability.id === ability.id,
        )
      )
        return;
    }
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
    const charges = ability && skillCharges(hero, ability, world.tick);
    if (
      !ability ||
      charges?.count === 0 ||
      world.tick < (hero.skillCooldowns[command.slot] ?? Infinity) ||
      world.tick < (hero.abilityCooldowns?.[ability.id] ?? 0) ||
      (!togglingOff && hero.mana < ability.manaCost)
    )
      return;
    if (!togglingOff) hero.mana -= ability.manaCost;
    const cooldown = abilityCooldown(hero, ability, config, world.tick);
    if (charges) {
      hero.chargeCooldowns ??= {};
      hero.chargeCooldowns[ability.id] = [
        ...charges.pending,
        (charges.pending.at(-1) ?? world.tick) + cooldown,
      ];
    }
    hero.skillCooldowns[command.slot] =
      world.tick +
      (charges ||
      (ability.effect.mode === 'projectile' && ability.effect.recallDrain)
        ? 0
        : cooldown);
    hero.abilityCooldowns ??= {};
    hero.abilityCooldowns[ability.id] = hero.skillCooldowns[command.slot]!;
    if (ability.id === conLuan.stance && !ability.passive)
      toggleConLuanStance(hero, config, world.tick);
    perform(
      world,
      hero,
      ability,
      config,
      'cast',
      togglingOff ? 'toggle_off' : undefined,
    );
    if (ability.id === conLuan.chaos)
      syncConLuanResources(hero, config, world.tick);
  }
}
function advanceProjectile(
  world: World,
  shot: Projectile,
  config: SimulationConfig,
): void {
  if (shot.effect.recallDrain) {
    stepSpinningProjectile(world, shot, config);
    return;
  }
  if (shot.effect.dragonDive) {
    advanceDragonDive(world, shot, config);
    return;
  }
  if (shot.lingerUntil !== undefined) {
    if (world.tick >= shot.lingerUntil) world.projectiles.delete(shot.id);
    return;
  }
  const length = Math.min(
    shot.remaining,
    (shot.curve ? shot.effect.speed : Math.hypot(shot.vx, shot.vy)) /
      config.tickRate,
  );
  let dir = direction(shot.vx, shot.vy);
  let end = { x: shot.x + dir.x * length, y: shot.y + dir.y * length };
  if (shot.curve) {
    const { origin, dx, dy, bend, crossing } = shot.curve;
    const advance = shot.effect.range - shot.remaining + length;
    const progress = advance / shot.effect.range;
    const lateral = bend * Math.sin(Math.PI * progress) * (progress - crossing);
    end = {
      x: origin.x + dx * advance - dy * lateral,
      y: origin.y + dy * advance + dx * lateral,
    };
    dir = direction(end.x - shot.x, end.y - shot.y);
    shot.vx = dir.x * shot.effect.speed;
    shot.vy = dir.y * shot.effect.speed;
  }
  let wallT = blocked(end, shot.effect.radius, config.width, config.height, [])
    ? 1
    : Infinity;
  for (const wall of config.combatCollision ?? config.collision)
    if (shot.hostile || wall !== world.statue?.collision)
      wallT = Math.min(
        wallT,
        segmentRect(shot, end, wall, shot.effect.radius) ?? Infinity,
      );
  const targets: Actor[] = shot.hostile
    ? [...world.heroes.values(), ...nguDocSummons(world)]
    : [...opponents(world, shot.ownerId)];
  const traveled = shot.effect.range - shot.remaining;
  const launch = { x: shot.x - dir.x * traveled, y: shot.y - dir.y * traveled };
  const collisions = targets
    .filter(
      (enemy) =>
        enemy.hp > 0 &&
        !(shot.hitIds ?? []).includes(enemy.id) &&
        (!shot.effect.forwardOnly ||
          (enemy.x - launch.x) * dir.x + (enemy.y - launch.y) * dir.y >= 0) &&
        (!shot.targetId || enemy.id === shot.targetId),
    )
    .map((enemy) => ({
      enemy,
      t: segmentCircle(
        shot,
        end,
        enemy,
        targetRadius(world, enemy, config) + shot.effect.radius,
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
  let grubAttached = false;
  for (const collision of hits) {
    if (shot.effect.comboEmpoweredRadius !== undefined)
      emit(world, {
        kind: 'pulse',
        sourceId: shot.ownerId,
        targetId: collision.enemy.id,
        abilityId: shot.abilityId,
        x: shot.x + (end.x - shot.x) * collision.t + dir.x * shot.effect.radius,
        y: shot.y + (end.y - shot.y) * collision.t + dir.y * shot.effect.radius,
        fx: dir.x,
        fy: dir.y,
        stage:
          shot.stage === 'empowered_travel' ? 'empowered_impact' : 'impact',
        damage: 0,
        critical: false,
      });
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
      const spreadKey = (shot.leg ?? 'outbound') + ':' + enemy.id;
      const spread = shot.equipmentAttack?.spread;
      if (
        spread?.hitTargets.has(spreadKey) ||
        (shot.effect.oncePerCast &&
          Object.hasOwn(shot.comboTargets ?? {}, enemy.id))
      )
        continue;
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
          hitPhase:
            shot.abilityId === 'huyen_am_chuong' ||
            shot.abilityId === duongMon.amKhi ||
            shot.abilityId === duongMon.storm
              ? shot.stage
              : shot.abilityId === nguDoc.taiHiep
                ? shot.stage
                : shot.abilityId === 'thieu_lam_quyen'
                  ? 'roundhouse_kick'
                  : undefined,
          slowedBonus: shot.effect.slowedBonus,
          armorPenetration: shot.equipmentAttack?.penetration,
          lifesteal: shot.equipmentAttack?.lifesteal,
          combo: shot.combo,
          comboTargets: shot.comboTargets,
        },
      );
      if (hit) {
        if (shot.abilityId === nguDoc.mark)
          grubAttached = attachNguDocMark(world, config, enemy, shot.ownerId);
        spread?.hitTargets.add(spreadKey);
        if (shot.effect.oncePerCast && shot.comboTargets)
          shot.comboTargets[enemy.id] ??= false;
      }
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
      if (enemy.hp > 0 && (hit || !shot.hostile))
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
          targetRadius(world, enemy, config),
          config,
          world.tick,
        );
      confineMovement(world, enemy, before, config);
      if (
        shot.effect.burnDamage > 0 &&
        (shot.abilityId === duongMon.amKhi || shot.abilityId === duongMon.storm)
      ) {
        if (hit && enemy.hp > 0) {
          const existing = enemy.duongMonPoison;
          enemy.duongMonPoison = {
            sourceId: shot.ownerId,
            abilityId: shot.abilityId,
            damage: shot.effect.burnDamage,
            next:
              existing && existing.until > world.tick
                ? existing.next
                : world.tick + config.tickRate,
            until: world.tick + shot.effect.burnTicks,
          };
        }
        continue;
      }
      const rival = world.duel && world.heroes.get(enemy.id);
      if (rival && rival.hp > 0 && shot.effect.burnDamage > 0)
        rival.duelBurn = {
          sourceId: shot.ownerId,
          abilityId: shot.abilityId,
          damage: shot.effect.burnDamage,
          next: world.tick + config.tickRate,
          until: world.tick + shot.effect.burnTicks,
        };
      const burned = world.creeps.get(enemy.id);
      if (burned && burned.hp > 0 && shot.effect.burnDamage > 0) {
        burned.burnSource = shot.ownerId;
        burned.burnAbilityId = shot.abilityId;
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
    if (shot.abilityId === nguDoc.mark && !grubAttached) {
      const contact = hits[0]?.t ?? Math.min(1, wallT);
      returnNguDocGrub(world, shot.ownerId, {
        x: shot.x + (end.x - shot.x) * contact,
        y: shot.y + (end.y - shot.y) * contact,
      });
    }
    if (!hits.length && shot.effect.explodeAtEnd && !shot.hostile) {
      const contact = Math.min(1, wallT);
      const center = {
        x: shot.x + (end.x - shot.x) * contact,
        y: shot.y + (end.y - shot.y) * contact,
      };
      emit(world, {
        kind: 'pulse',
        sourceId: shot.ownerId,
        targetId: '',
        abilityId: shot.abilityId,
        ...center,
        radius: shot.effect.splashRadius,
        stage: 'explosion',
        damage: 0,
        critical: false,
      });
      for (const target of targets) {
        if (
          target.hp <= 0 ||
          distance(center, target) > shot.effect.splashRadius ||
          config.collision.some(
            (wall) => segmentRect(center, target, wall) !== undefined,
          )
        )
          continue;
        const landed = hurt(
          world,
          target,
          shot.ownerId,
          shot.abilityId,
          shot.rawDamage,
          config,
          {
            critChance: shot.critChance ?? config.critChance,
            critMultiplier: shot.critMultiplier ?? config.critMultiplier,
          },
        );
        if (landed && target.hp > 0)
          for (const status of shot.effect.statuses ?? [])
            applyStatus(
              target,
              status,
              shot.ownerId,
              shot.abilityId,
              world.tick,
            );
      }
    }
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
function nearestBasicEnemy(
  world: World,
  hero: Hero,
  ability: NonNullable<ReturnType<typeof conLuanBasic>>,
  config: SimulationConfig,
): Creep | undefined {
  let nearest: Creep | undefined;
  let nearestDistance = Infinity;
  for (const creep of world.creeps.values()) {
    const d = distance(hero, creep);
    if (
      (d < nearestDistance ||
        (d === nearestDistance && creep.id < nearest!.id)) &&
      basicTargetInRange(world, hero, creep, ability, config)
    ) {
      nearest = creep;
      nearestDistance = d;
    }
  }
  return nearest;
}

function clickWaypoint(
  hero: Hero,
  config: SimulationConfig,
  walls: SimulationConfig['collision'],
) {
  const destination = hero.moveDestination;
  if (!destination) return undefined;
  const bounds = config.heroBounds;
  const path = (destination.waypoints ??= findWalkPath(
    hero,
    destination.point,
    config.radius,
    config,
    walls,
    bounds ? (point) => insideEllipse(point, bounds, config.radius) : undefined,
  ));
  while (path.length && distance(hero, path[0]!) < 0.5) path.shift();
  if (!path.length) delete hero.moveDestination;
  return path[0];
}

export function stepWorld(world: World, config: SimulationConfig): void {
  const confinementStarts = new Map(
    [...(world.duel ? world.heroes : world.creeps)].map(([id, e]) => [
      id,
      { x: e.x, y: e.y },
    ]),
  );
  world.tick++;
  const rocks = world.kim?.rockCollision(world.tick);
  if (rocks?.length)
    config = { ...config, collision: [...config.collision, ...rocks] };
  world.events = [];
  stepCreepHazards(world, config);
  if (bossFightReady(world, config)) world.bacCai?.prepare(world, config);
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
    if (hero.tamLien?.readyUntil && hero.tamLien.readyUntil <= world.tick)
      delete hero.tamLien;
    if (hero.hp <= 0) {
      delete hero.moveDestination;
      hero.pose = 'death';
      cancelOwnedEffects(world, hero.id);
      hero.statuses = [];
      continue;
    }
    const burn = hero.duelBurn;
    if (burn && world.tick <= burn.until && world.tick >= burn.next) {
      hurt(world, hero, burn.sourceId, 'burn', burn.damage, config, {
        ...offensiveStats(world, burn.sourceId, config),
        hitPhase: burn.abilityId,
        periodic: true,
      });
      burn.next += config.tickRate;
      if (hero.hp <= 0) continue;
    }
    const walls =
      world.duel && !world.duel.has(hero.id)
        ? world.duelWalkWalls!
        : config.collision;
    const clickMoving = !!hero.moveDestination;
    const waypoint = clickWaypoint(hero, config, walls);
    if (clickMoving) {
      const heading = waypoint
        ? direction(waypoint.x - hero.x, waypoint.y - hero.y)
        : { x: 0, y: 0 };
      hero.moveX = heading.x;
      hero.moveY = heading.y;
      hero.lastMoveTick = world.tick;
    } else if (world.tick - hero.lastMoveTick > config.inputTimeoutTicks) {
      hero.moveX = 0;
      hero.moveY = 0;
    }
    const movement = namDeMovement(world, hero);
    const guarding =
      hasStatus(hero, 'guard_counter', world.tick) ||
      hasStatus(hero, 'duong_mon_shell', world.tick);
    if (hasStatus(hero, 'duong_mon_flight', world.tick)) {
      hero.mana = Math.max(0, hero.mana - 15 / config.tickRate);
      if (hero.mana === 0)
        hero.statuses =
          hero.statuses?.filter(
            (status) => status.abilityId !== duongMon.flight,
          ) ?? [];
    }
    syncConLuanResources(hero, config, world.tick);
    const stats = characterStats(hero, config, world.tick).total;
    const runSpeedMultiplier = world.waveBossTest?.runSpeedMultiplier ?? 1;
    if (
      (movement.x || movement.y) &&
      !guarding &&
      !hero.namDeLocked &&
      !world.vuong?.locked(hero.id) &&
      !hasStatus(hero, 'stun', world.tick) &&
      !hasStatus(hero, 'root', world.tick) &&
      !hasStatus(hero, 'dash', world.tick) &&
      !skyfallAiming(world, hero.id) &&
      !(world.actions ?? []).some(
        (a) =>
          a.ownerId === hero.id &&
          (a.effect.mode === 'projectile' || a.effect.mode === 'area'),
      )
    ) {
      const before = { x: hero.x, y: hero.y };
      hero.fx = movement.x;
      hero.fy = movement.y;
      const step = (stats.movementSpeed * runSpeedMultiplier) / config.tickRate;
      const stride = waypoint ? Math.min(step, distance(hero, waypoint)) : step;
      moveCircle(
        hero,
        { x: movement.x * stride, y: movement.y * stride },
        config.radius,
        config.width,
        config.height,
        walls,
      );
      if (waypoint && distance(hero, before) < 1e-6) {
        delete hero.moveDestination;
        hero.moveX = hero.moveY = 0;
      }
      resetConLuanDashOnEntry(world, hero, before);
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
        !guarding &&
        !hasStatus(hero, 'stun', world.tick) &&
        !hasStatus(hero, 'root', world.tick) &&
        (movement.x || movement.y)
          ? 'walk'
          : 'idle';
  }
  for (const actor of [...world.heroes.values(), ...world.creeps.values()]) {
    const poison = actor.duongMonPoison;
    if (!poison) continue;
    if (actor.hp <= 0 || world.tick > poison.until) delete actor.duongMonPoison;
    else if (world.tick >= poison.next) {
      hurt(
        world,
        actor,
        poison.sourceId,
        poison.abilityId,
        poison.damage,
        config,
        { critChance: 0, critMultiplier: 1, periodic: true },
      );
      poison.next += config.tickRate;
    }
  }
  stepChu(world, config);
  stepNamDe(world, config);
  for (const input of world.pending.splice(0)) {
    const hero = world.heroes.get(input.heroId);
    if (hero) {
      if (bufferComboFinisher(world, hero, input.command, config)) continue;
      if (input.command.kind !== 'move-to') delete hero.comboFinisher;
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
    else if (
      hero.autoBasic &&
      !hero.comboFinisher &&
      !world.duel &&
      world.creeps.size
    )
      runCommand(world, hero, { kind: 'basic' }, config, true);
  }
  stepSkillActions(world, config);
  for (const hero of world.heroes.values()) stepFortune(world, hero, config);
  stepScatters(world, config);
  stepAreas(world, config);
  stepSupports(world, config);
  const releasedBatches = new Set<string>();
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
      spawnedAt: world.tick,
      ...(scheduled.curve ? { curve: scheduled.curve } : {}),
      ...(scheduled.dragonTarget
        ? {
            dragonFlight: {
              origin: { x: scheduled.x, y: scheduled.y },
              target: scheduled.dragonTarget,
              fx: scheduled.dx,
              fy: scheduled.dy,
            },
          }
        : {}),
      abilityId: scheduled.ability.id,
      x: scheduled.x,
      y: scheduled.y,
      vx: scheduled.dx * scheduled.ability.effect.speed,
      vy: scheduled.dy * scheduled.ability.effect.speed,
      remaining: scheduled.ability.effect.range,
      rawDamage: scheduled.rawDamage,
      equipmentAttack: scheduled.ability.equipmentAttack,
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
      ...(scheduled.ability.effect.boomerang ||
      scheduled.ability.effect.recallDrain
        ? { leg: 'outbound' as const }
        : {}),
      ...(scheduled.refund ? { refund: scheduled.refund } : {}),
      ...(scheduled.stage || scheduled.ability.effect.recallDrain
        ? { stage: scheduled.stage ?? 'fan_outbound' }
        : {}),
    });
    // One presentation cue per accepted volley, including shots that hit or
    // meet a wall before the next state patch. No per-projectile audio spam.
    if (
      scheduled.ability.id === duongMon.knives ||
      scheduled.ability.id === duongMon.storm
    ) {
      const batch = `${scheduled.ownerId}:${scheduled.ability.id}:${scheduled.stage ?? ''}`;
      if (!releasedBatches.has(batch)) {
        releasedBatches.add(batch);
        emit(world, {
          kind: 'pulse',
          sourceId: scheduled.ownerId,
          targetId: '',
          abilityId: scheduled.ability.id,
          stage: scheduled.stage ?? 'release',
          x: scheduled.x,
          y: scheduled.y,
          damage: 0,
          critical: false,
        });
      }
    }
  }
  world.shots = world.shots.filter((item) => item.tick > world.tick);
  for (const shot of world.projectiles.values())
    advanceProjectile(world, shot, config);
  stepEquipmentCombat(world, config);
  stepNguDocEffects(world, config);
  stepNguDocSummons(world, config);
  constrainChuTrap(world, config);
  stepBossEncounter(world, config);
  const creepStarts = config.dungeonAggro
    ? new Map([...world.creeps].map(([id, e]) => [id, { x: e.x, y: e.y }]))
    : undefined;
  const minions = [...nguDocSummons(world)];
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
        hitPhase: enemy.burnAbilityId,
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
          selectableTarget(player, world.tick) &&
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
        (!selectableTarget(hero, world.tick) ||
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
    const summon = minions
      .filter(
        (minion) =>
          minion.hp > 0 && distance(minion, enemy) < stats.detectionRange,
      )
      .sort(
        (a, b) =>
          distance(a, enemy) - distance(b, enemy) || a.id.localeCompare(b.id),
      )[0];
    const combatant =
      summon && (!hero || distance(enemy, summon) < distance(enemy, hero))
        ? summon
        : hero;
    if (stepCreepActor(world, enemy, combatant, objective, config)) continue;
    const target = combatant ??
      objective ?? {
        x: enemy.spawn.x,
        y: enemy.spawn.y + (Math.floor(world.tick / 90) % 2 ? 32 : -32),
      };
    if (config.dungeonAggro) enemy.aggroTargetId = combatant?.id ?? '';
    const waypoint =
      (config.dungeonAggro && combatant) ||
      (enemy.invasion && (combatant || objective))
        ? dungeonWaypoint(
            enemy,
            invasionApproach(enemy, (combatant ?? objective)!, !!combatant),
            world.tick,
            config,
          )
        : target;
    const delta = direction(waypoint.x - enemy.x, waypoint.y - enemy.y);
    const moving =
      !(config.dungeonAggro && !combatant && !objective) &&
      (distance(enemy, target) >
        (combatant
          ? stats.attackRange
          : objective
            ? stats.attackRange + objective.radius
            : 2) ||
        !!(
          config.dungeonAggro &&
          combatant &&
          config.collision.some(
            (w) => segmentRect(enemy, combatant, w) !== undefined,
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
    const victim = combatant ?? objective;
    if (
      victim &&
      !moving &&
      world.tick >= enemy.cooldown &&
      !hasStatus(enemy, 'stun', world.tick) &&
      !hasStatus(enemy, 'disarm', world.tick) &&
      !(
        config.dungeonAggro &&
        (config.combatCollision ?? config.collision).some(
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
      if (enemy.rangedAttack && combatant) {
        const effect = enemy.rangedAttack,
          aim = direction(combatant.x - enemy.x, combatant.y - enemy.y);
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
    else if (world.tick < actor.hurtUntil) {
      // Damage flinch is visual. Keep an accepted basic visible unless a
      // real stun interrupted it.
      const basicInProgress =
        world.heroes.get(actor.id) === actor &&
        actor.pose === 'basic_attack' &&
        !hasStatus(actor, 'stun', world.tick);
      if (!basicInProgress) actor.pose = 'hurt';
    }
  }
  finishNamDeTick(world, config);
  world.bacCai?.step(world, config);
  world.vuong?.step(world, config);
  enforceConfinement(world, config, confinementStarts);
  stepBossBanter(world, config);
}
import {
  inQuicksand,
  stepCreepActor,
  stepCreepHazards,
} from './creep-abilities.js';
