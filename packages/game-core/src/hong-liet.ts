import { grantCraftMaterial } from './economy.js';
import { announceBossSkill } from './boss-skill-announcement.js';
import { addCreep } from './simulation.js';
import { emit, hurt } from './combat.js';
import { applyStatus, displace, hasStatus } from './status.js';
import {
  blocked,
  direction,
  distance,
  segmentCircle,
  segmentRect,
} from './geometry.js';
import {
  type BossCast,
  type BossCue,
  type HongLietAbility,
  type HongLietDefinition,
} from './hong-liet-types.js';
import type { Creep, Hero, Point, SimulationConfig, World } from './types.js';

const zeroCrit = { critChance: 0, critMultiplier: 1 };
export class HongLietEncounter {
  generation = 0;
  readonly effects = new Map<string, BossCue>();
  cast: BossCast | undefined;
  bossId = 'hong_liet_boss';
  nextActionAt = 0;
  respawnAt = 0;
  emptySince: number | undefined;
  resetCount = 0;
  kills = 0;
  private actionIndex = 0;
  private cooldowns = new Map<HongLietAbility, number>();
  private summons = new Map<string, number>();
  private artillery: BossCast[] = [];
  constructor(readonly definition: HongLietDefinition) {}
  initialize(world: World, config: SimulationConfig): void {
    this.generation++;
    this.clear(world);
    world.creeps.clear();
    const d = this.definition,
      b = addCreep(world, this.bossId, d.spawn, config);
    b.archetypeId = d.id;
    b.controlled = true;
    b.forcedMovementImmune = true;
    b.crowdControlScale = d.stunScale;
    b.hp = b.maxHp = d.hp;
    b.stats = {
      ...config.creep,
      hp: d.hp,
      defense: d.defense,
      radius: d.radius,
      speed: d.speed,
      xp: d.xp,
      gold: d.gold,
      assistTicks: Number.MAX_SAFE_INTEGER,
    };
    this.cooldowns.clear();
    this.actionIndex = 0;
    this.nextActionAt = world.tick + d.initialRestTicks;
    this.respawnAt = 0;
  }
  clear(world: World): void {
    this.artillery = [];
    this.effects.clear();
    this.cast = undefined;
    const boss = world.creeps.get(this.bossId);
    if (boss) {
      boss.castAbilityId = '';
      delete boss.encounterAction;
      boss.actionUntil = world.tick;
      boss.pose = boss.hp > 0 ? 'idle' : 'death';
    }
    for (const id of this.summons.keys()) world.creeps.delete(id);
    this.summons.clear();
  }
  emptyStep(world: World, config: SimulationConfig, matchTick: number): void {
    this.emptySince ??= matchTick;
    this.clear(world);
    if (matchTick - this.emptySince >= this.definition.emptyResetTicks) {
      this.initialize(world, config);
      this.resetCount++;
      this.emptySince = matchTick;
    }
  }
  step(world: World, config: SimulationConfig): void {
    this.emptySince = undefined;
    let boss = world.creeps.get(this.bossId);
    if (!boss) return;
    if (boss.hp <= 0) {
      if (!this.respawnAt) {
        this.kills++;
        grantCraftMaterial(world, config, boss, 'armor');
        this.clear(world);
        this.respawnAt = world.tick + this.definition.respawnTicks;
      }
      if (world.tick >= this.respawnAt) this.initialize(world, config);
      return;
    }
    const heroes = [...world.heroes.values()].filter((h) => h.hp > 0);
    if (!heroes.length) {
      this.clear(world);
      boss.pose = 'idle';
      return;
    }
    this.stepSummons(world, config, heroes);
    for (const c of this.artillery) {
      const a = this.definition.abilities.hoa_phao_thien_la;
      if (
        world.tick >= c.nextVolley &&
        world.tick < c.activeAt + a.durationTicks
      ) {
        this.cannonVolley(world, config, c);
        c.nextVolley += a.intervalTicks;
      }
    }
    this.artillery = this.artillery.filter(
      (c) =>
        world.tick <
        c.activeAt + this.definition.abilities.hoa_phao_thien_la.durationTicks,
    );
    if (boss.hp <= 0) return;
    if (this.cast) {
      const c = this.cast,
        a = this.definition.abilities[c.abilityId];
      boss.fx = c.fx;
      boss.fy = c.fy;
      boss.castAbilityId = c.abilityId;
      boss.pose = c.abilityId.startsWith('hong_liet_a')
        ? 'basic_attack'
        : 'cast';
      if (world.tick >= c.activeAt && !c.fired) {
        c.fired = true;
        this.release(world, config, boss, c);
        if (c.abilityId === 'hoa_phao_thien_la') {
          this.cannonVolley(world, config, c);
          c.nextVolley += a.intervalTicks;
          this.artillery.push(c);
          this.cast = undefined;
          boss.castAbilityId = '';
          boss.pose = 'idle';
          this.nextActionAt = world.tick + this.definition.restTicks;
        }
      }
      if (c.abilityId === 'liet_diem_phong_toa' && c.fired) {
        const elapsed = Math.min(
          this.definition.lavaDashTicks,
          world.tick - c.activeAt + 1,
        );
        const wanted = {
          x:
            c.dashOrigin.x +
            (c.fx * c.dashLength * elapsed) / this.definition.lavaDashTicks,
          y:
            c.dashOrigin.y +
            (c.fy * c.dashLength * elapsed) / this.definition.lavaDashTicks,
        };
        displace(
          boss,
          wanted.x - boss.x,
          wanted.y - boss.y,
          this.definition.radius,
          config,
        );
        const lane = this.effects.get(c.id + '_lava');
        if (lane)
          lane.length = Math.max(
            0,
            (boss.x - c.dashOrigin.x) * c.fx + (boss.y - c.dashOrigin.y) * c.fy,
          );
        if (elapsed < this.definition.lavaDashTicks) boss.pose = 'walk';
      }
      if (
        c.abilityId === 'hoa_phao_thien_la' &&
        !this.artillery.includes(c) &&
        c.fired &&
        world.tick >= c.nextVolley &&
        world.tick < c.activeAt + a.durationTicks
      ) {
        this.cannonVolley(world, config, c);
        c.nextVolley += a.intervalTicks;
      }
      this.stepEffects(world, config);
      if (world.tick >= c.endsAt) {
        this.cast = undefined;
        boss.castAbilityId = '';
        boss.pose = 'idle';
        this.nextActionAt = world.tick + this.definition.restTicks;
      }
      return;
    }
    this.stepEffects(world, config);
    if (hasStatus(boss, 'stun', world.tick)) {
      boss.pose = 'idle';
      return;
    }
    const nearest = heroes.sort(
      (a, b) =>
        distance(boss!, a) - distance(boss!, b) || a.id.localeCompare(b.id),
    )[0]!;
    if (world.tick >= this.nextActionAt) {
      const order: HongLietAbility[] = this.artillery.length
        ? ['hong_liet_a1', 'hong_liet_a2']
        : [
            'hong_liet_a1',
            'dung_nham_liet_dia',
            'hong_liet_a2',
            'hoa_son_bao_phat',
            'hong_liet_a1',
            'liet_diem_phong_toa',
            'hong_liet_a2',
            'hoa_tien_te_phat',
            'hong_liet_a1',
            'thiet_ky_trieu_binh',
            'hong_liet_a2',
            'van_ly_nham_hoa',
            'hong_liet_a1',
            'hoa_phao_thien_la',
          ];
      for (let i = 0; i < order.length; i++) {
        const ability = order[this.actionIndex++ % order.length]!;
        if (world.tick < (this.cooldowns.get(ability) ?? 0)) continue;
        this.begin(world, config, ability, nearest);
        break;
      }
    } else {
      // Slow approach during rest, never change a captured cast heading.
      const delta = direction(nearest.x - boss.x, nearest.y - boss.y);
      if (distance(boss, nearest) > 210) {
        const before = { x: boss.x, y: boss.y };
        displace(
          boss,
          (delta.x * this.definition.speed) / config.tickRate,
          (delta.y * this.definition.speed) / config.tickRate,
          this.definition.radius,
          config,
        );
        boss.fx = delta.x;
        boss.fy = delta.y;
        boss.pose = distance(before, boss) > 0.01 ? 'walk' : 'idle';
      } else boss.pose = 'idle';
    }
  }
  /** Server-side entry point also used by deterministic core tests; no network command exposes it. */
  begin(
    world: World,
    config: SimulationConfig,
    abilityId: HongLietAbility,
    target: Point,
  ): void {
    const boss = world.creeps.get(this.bossId);
    if (!boss || boss.hp <= 0 || this.cast) return;
    const a = this.definition.abilities[abilityId],
      aim = direction(target.x - boss.x, target.y - boss.y);
    const fx = aim.x || aim.y ? aim.x : 1,
      fy = aim.y,
      id = 'hl_' + world.nextId++;
    let duration = a.durationTicks;
    if (abilityId === 'hoa_phao_thien_la') {
      const b = this.definition.bounds;
      duration +=
        Math.ceil(
          (Math.max(b.width, b.height) / this.definition.projectileSpeed) *
            config.tickRate,
        ) + 2;
    }
    const cast: BossCast = {
      id,
      abilityId,
      startedAt: world.tick,
      activeAt: world.tick + a.windupTicks,
      endsAt:
        world.tick + a.windupTicks + Math.max(duration, 1) + a.recoveryTicks,
      origin: { x: boss.x, y: boss.y },
      fx,
      fy,
      fired: false,
      nextVolley: world.tick + a.windupTicks,
      dashOrigin: { x: boss.x, y: boss.y },
      dashLength: this.definition.lavaDistance,
    };
    if (abilityId === 'liet_diem_phong_toa') {
      const probe = { x: boss.x, y: boss.y };
      displace(
        probe as Creep,
        fx * cast.dashLength,
        fy * cast.dashLength,
        this.definition.radius,
        config,
      );
      cast.dashLength = Math.max(
        0,
        (probe.x - boss.x) * fx + (probe.y - boss.y) * fy,
      );
      cast.endsAt =
        cast.activeAt + this.definition.lavaDashTicks + a.recoveryTicks;
    }
    this.cast = cast;
    this.cooldowns.set(abilityId, world.tick + a.cooldownTicks);
    boss.fx = fx;
    boss.fy = fy;
    boss.castAbilityId = abilityId;
    boss.actionUntil = cast.endsAt;
    boss.encounterAction = {
      startedAt: cast.startedAt,
      activeAt: cast.activeAt,
      endsAt: cast.endsAt,
    };
    announceBossSkill(world, boss.id, abilityId);
    emit(world, {
      kind: 'cast',
      sourceId: boss.id,
      targetId: '',
      abilityId,
      x: boss.x,
      y: boss.y,
      fx,
      fy,
      radius: a.range,
      damage: 0,
      critical: false,
      stage: 'warning',
    });
    if (abilityId === 'hong_liet_a1') {
      const shared = new Set<string>();
      for (const offset of [
        -2 * this.definition.a1Spread,
        -this.definition.a1Spread,
        0,
        this.definition.a1Spread,
        2 * this.definition.a1Spread,
      ]) {
        const angle = Math.atan2(fy, fx) + offset;
        const blade = this.cue(
          world,
          cast,
          'projectile',
          {
            x: boss.x + fx * this.definition.a1ForwardOffset,
            y: boss.y + fy * this.definition.a1ForwardOffset,
          },
          Math.cos(angle),
          Math.sin(angle),
          a.range,
          a.radius,
          cast.activeAt,
          cast.activeAt +
            Math.ceil(
              (a.range / this.definition.projectileSpeed) * config.tickRate,
            ) +
            1,
          a.damage,
          0,
          shared,
        );
        blade.speed = this.definition.projectileSpeed;
      }
    } else if (abilityId === 'hong_liet_a2')
      this.cue(
        world,
        cast,
        'arc',
        boss,
        fx,
        fy,
        a.range,
        0,
        cast.activeAt,
        cast.activeAt + 1,
        a.damage,
      );
    else if (abilityId === 'dung_nham_liet_dia')
      this.cue(
        world,
        cast,
        'stomp',
        boss,
        fx,
        fy,
        0,
        a.radius,
        cast.activeAt,
        cast.activeAt + 1,
        a.damage,
        Math.round(config.tickRate * 1.2),
      );
    else if (
      abilityId === 'hoa_son_bao_phat' ||
      abilityId === 'van_ly_nham_hoa'
    ) {
      const meteor = abilityId === 'van_ly_nham_hoa',
        count = meteor ? 12 : 5,
        b = this.definition.bounds;
      for (let i = 0; i < count; i++) {
        let p: Point = { x: 0, y: 0 };
        for (let attempt = 0; attempt < 20; attempt++) {
          p = {
            x: b.x + a.radius + world.random() * (b.width - a.radius * 2),
            y: b.y + a.radius + world.random() * (b.height - a.radius * 2),
          };
          if (
            !blocked(
              p,
              a.radius / 3,
              config.width,
              config.height,
              config.collision,
            )
          )
            break;
        }
        const at =
          cast.activeAt +
          Math.round(i * (meteor ? 0.38 : 0.16) * config.tickRate);
        this.cue(
          world,
          cast,
          meteor ? 'meteor' : 'volcano',
          p,
          fx,
          fy,
          0,
          a.radius,
          at,
          at + 1,
          a.damage,
        );
      }
      cast.endsAt =
        cast.activeAt +
        Math.round((meteor ? 12 * 0.38 : 5 * 0.16) * config.tickRate) +
        a.recoveryTicks;
    } else if (abilityId === 'liet_diem_phong_toa') {
      const lane = this.cue(
        world,
        cast,
        'lava',
        boss,
        fx,
        fy,
        cast.dashLength,
        a.radius,
        cast.activeAt,
        cast.activeAt + a.durationTicks,
        a.damage,
      );
      lane.expiresAt += this.definition.lavaFadeTicks;
      this.effects.delete(lane.id);
      lane.id = cast.id + '_lava';
      this.effects.set(lane.id, lane);
    } else if (abilityId === 'hoa_phao_thien_la') {
      for (const route of this.cannonRoutes()) {
        const cannon = this.cue(
          world,
          cast,
          'cannon',
          route.from,
          route.fx,
          route.fy,
          0,
          0,
          cast.activeAt,
          cast.endsAt,
          0,
        );
        if (route.fx > 0 || route.fy > 0)
          this.cue(
            world,
            cast,
            'line',
            route.from,
            route.fx,
            route.fy,
            route.length,
            a.radius,
            cast.activeAt,
            cast.activeAt,
            0,
          );
        cannon.radius = 0;
      }
    }
  }
  private cue(
    world: World,
    c: BossCast,
    kind: BossCue['kind'],
    p: Point,
    fx: number,
    fy: number,
    length: number,
    radius: number,
    activeAt: number,
    expiresAt: number,
    damage: number,
    stunTicks = 0,
    groupHits?: Set<string>,
  ): BossCue {
    const e: BossCue = {
      id: 'cue_' + world.nextId++,
      castId: c.id,
      ownerId: this.bossId,
      abilityId: c.abilityId,
      kind,
      x: p.x,
      y: p.y,
      fx,
      fy,
      length,
      radius,
      startedAt: world.tick,
      activeAt,
      expiresAt:
        kind === 'cannon' ||
        kind === 'projectile' ||
        kind === 'lava' ||
        damage === 0
          ? expiresAt
          : Math.max(expiresAt, activeAt + 18),
      damageUntil: expiresAt,
      damage,
      nextHit: activeAt,
      hitIds: new Set(),
      stunTicks,
      speed: 0,
      remaining: length,
      ...(groupHits ? { groupHits } : {}),
    };
    this.effects.set(e.id, e);
    return e;
  }
  private release(
    world: World,
    config: SimulationConfig,
    boss: Creep,
    c: BossCast,
  ): void {
    emit(world, {
      kind: 'pulse',
      sourceId: boss.id,
      targetId: '',
      abilityId: c.abilityId,
      x: boss.x,
      y: boss.y,
      fx: c.fx,
      fy: c.fy,
      damage: 0,
      critical: false,
      stage: 'active',
    });
    if (c.abilityId === 'liet_diem_phong_toa') {
      const e = this.effects.get(c.id + '_lava');
      if (e) e.length = 0;
    }
    if (
      c.abilityId === 'hoa_tien_te_phat' ||
      c.abilityId === 'thiet_ky_trieu_binh'
    ) {
      const archer = c.abilityId === 'hoa_tien_te_phat',
        d = this.definition,
        b = d.bounds;
      for (
        let i = 0;
        i < d.summonCount && this.summons.size < d.summonLimit;
        i++
      ) {
        const p = {
          x: i % 2 ? b.x + b.width - 60 : b.x + 60,
          y: b.y + 100 + Math.floor(i / 2) * 100,
        };
        if (
          blocked(
            p,
            d.minion.radius,
            config.width,
            config.height,
            config.collision,
          )
        )
          continue;
        const id = 'hl_minion_' + world.nextId++,
          m = addCreep(world, id, p, config);
        m.archetypeId = archer ? 'mongol_archer' : 'mongol_infantry';
        m.controlled = archer;
        m.stats = { ...d.minion };
        m.hp = m.maxHp = m.stats.hp;
        this.summons.set(id, world.tick + d.summonLifetimeTicks);
      }
    }
  }
  cannonRoutes(): Array<{
    from: Point;
    fx: number;
    fy: number;
    length: number;
  }> {
    const b = this.definition.bounds,
      out: Array<{ from: Point; fx: number; fy: number; length: number }> = [];
    for (const y of this.definition.cannonRows)
      out.push(
        { from: { x: b.x, y }, fx: 1, fy: 0, length: b.width },
        { from: { x: b.x + b.width, y }, fx: -1, fy: 0, length: b.width },
      );
    for (const x of this.definition.cannonColumns)
      out.push(
        { from: { x, y: b.y }, fx: 0, fy: 1, length: b.height },
        { from: { x, y: b.y + b.height }, fx: 0, fy: -1, length: b.height },
      );
    return out;
  }
  private cannonVolley(
    world: World,
    config: SimulationConfig,
    c: BossCast,
  ): void {
    const a = this.definition.abilities[c.abilityId];
    for (const r of this.cannonRoutes()) {
      const e = this.cue(
        world,
        c,
        'projectile',
        r.from,
        r.fx,
        r.fy,
        r.length,
        a.radius,
        world.tick,
        world.tick +
          Math.ceil(
            (r.length / this.definition.projectileSpeed) * config.tickRate,
          ) +
          1,
        a.damage,
      );
      e.speed = this.definition.projectileSpeed;
    }
  }
  private stepEffects(world: World, config: SimulationConfig): void {
    const boss = world.creeps.get(this.bossId);
    if (!boss || boss.hp <= 0) {
      this.clear(world);
      return;
    }
    for (const [id, e] of this.effects) {
      if (world.tick >= e.expiresAt) {
        this.effects.delete(id);
        continue;
      }
      if (
        world.tick < e.activeAt ||
        world.tick >= e.damageUntil ||
        e.kind === 'cannon' ||
        e.damage <= 0
      )
        continue;
      if (
        e.kind !== 'projectile' &&
        e.kind !== 'lava' &&
        world.tick > e.activeAt
      )
        continue;
      const before = { x: e.x, y: e.y };
      if (e.kind === 'projectile') {
        const amount = Math.min(e.remaining, e.speed / config.tickRate);
        e.x += e.fx * amount;
        e.y += e.fy * amount;
        e.remaining -= amount;
      }
      if (world.tick < e.nextHit) continue;
      const wallT =
        e.kind === 'projectile'
          ? Math.min(
              2,
              ...config.collision.map((w) => segmentRect(before, e, w) ?? 2),
            )
          : 2;
      const periodic = e.kind === 'lava';
      e.nextHit =
        world.tick +
        (periodic ? this.definition.abilities[e.abilityId].intervalTicks : 1);
      for (const hero of world.heroes.values()) {
        if (
          hero.hp <= 0 ||
          (!periodic && e.hitIds.has(hero.id)) ||
          e.groupHits?.has(hero.id)
        )
          continue;
        const end = { x: e.x + e.fx * e.length, y: e.y + e.fy * e.length };
        let hit = false;
        if (e.kind === 'projectile') {
          const t = segmentCircle(before, e, hero, e.radius + config.radius);
          hit = t !== undefined && t < wallT;
        } else if (e.kind === 'line' || e.kind === 'lava')
          hit =
            segmentCircle(e, end, hero, e.radius + config.radius) !== undefined;
        else if (e.kind === 'arc') {
          const delta = direction(hero.x - e.x, hero.y - e.y);
          hit =
            distance(e, hero) <= e.length + config.radius &&
            delta.x * e.fx + delta.y * e.fy >= -1e-9;
        } else hit = distance(e, hero) <= e.radius + config.radius;
        if (
          !hit ||
          (e.kind !== 'projectile' &&
            config.collision.some((w) => segmentRect(e, hero, w) !== undefined))
        )
          continue;
        if (
          hurt(world, hero, e.ownerId, e.abilityId, e.damage, config, {
            ...zeroCrit,
            periodic,
          })
        ) {
          e.hitIds.add(hero.id);
          e.groupHits?.add(hero.id);
          if (e.stunTicks)
            applyStatus(
              hero,
              { kind: 'stun', durationTicks: e.stunTicks, magnitude: 1 },
              e.ownerId,
              e.abilityId,
              world.tick,
            );
        }
      }
      if (
        e.kind === 'projectile' &&
        (e.remaining <= 0 ||
          config.collision.some((w) => segmentRect(before, e, w) !== undefined))
      )
        this.effects.delete(id);
    }
  }
  private stepSummons(
    world: World,
    config: SimulationConfig,
    heroes: Hero[],
  ): void {
    for (const [id, until] of this.summons) {
      const m = world.creeps.get(id);
      if (!m || m.hp <= 0 || world.tick >= until) {
        world.creeps.delete(id);
        this.summons.delete(id);
        for (const [key, e] of this.effects)
          if (e.ownerId === id) this.effects.delete(key);
        continue;
      }
      if (m.archetypeId !== 'mongol_archer' || hasStatus(m, 'stun', world.tick))
        continue;
      const target = [...heroes].sort(
          (a, b) => distance(m, a) - distance(m, b) || a.id.localeCompare(b.id),
        )[0]!,
        aim = direction(target.x - m.x, target.y - m.y);
      m.fx = aim.x;
      m.fy = aim.y;
      if (distance(m, target) > 340) {
        displace(
          m,
          (aim.x * this.definition.minion.speed) / config.tickRate,
          (aim.y * this.definition.minion.speed) / config.tickRate,
          this.definition.minion.radius,
          config,
        );
        m.pose = 'walk';
      } else if (
        world.tick >= m.cooldown &&
        !hasStatus(m, 'disarm', world.tick)
      ) {
        m.cooldown = world.tick + this.definition.minion.attackCooldownTicks;
        m.pose = 'basic_attack';
        m.actionUntil = world.tick + 8;
        const fake: BossCast = {
          id: 'archer_' + world.nextId++,
          abilityId: 'hoa_tien_te_phat',
          startedAt: world.tick,
          activeAt: world.tick,
          endsAt: world.tick + 30,
          origin: m,
          fx: aim.x,
          fy: aim.y,
          fired: true,
          nextVolley: 0,
          dashOrigin: m,
          dashLength: 0,
        };
        const e = this.cue(
          world,
          fake,
          'projectile',
          m,
          aim.x,
          aim.y,
          450,
          5,
          world.tick,
          world.tick + Math.ceil((450 / 420) * config.tickRate) + 1,
          this.definition.minion.damage,
        );
        e.ownerId = m.id;
        e.speed = 420;
        emit(world, {
          kind: 'attack',
          sourceId: id,
          targetId: target.id,
          abilityId: 'hoa_tien_te_phat',
          x: m.x,
          y: m.y,
          fx: aim.x,
          fy: aim.y,
          damage: 0,
          critical: false,
        });
      } else if (world.tick >= m.actionUntil) m.pose = 'idle';
    }
  }
}
