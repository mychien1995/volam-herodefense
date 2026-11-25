import { bossFightReady } from './boss-provocation.js';
import { waveBossFarewell } from './boss-banter.js';
import { announceBossSkill } from './boss-skill-announcement.js';
import { addCreep } from './simulation.js';
import { hurt, emit } from './combat.js';
import { applyStatus, hasStatus, statusValue, displace } from './status.js';
import {
  blocked,
  direction,
  distance,
  segmentCircle,
  segmentRect,
} from './geometry.js';
import type { Hero, Point, SimulationConfig, World } from './types.js';
import type {
  TayDocAbility,
  TayDocCast,
  TayDocDefinition,
  TayDocShot,
  TayDocPool,
  TayDocMark,
  TayDocPoison,
  TayDocPillar,
  TayDocView,
} from './tay-doc-types.js';
const crit = { critChance: 0, critMultiplier: 1 };
const p1: TayDocAbility[] = [
  'tay_doc_staff',
  'tay_doc_gas',
  'van_doc_phi_cham',
  'doc_vu_me_hon',
  'co_doc_khoan_tam',
  'hon_thien_phuc_long_chan',
];
const p2: TayDocAbility[] = [
  'doc_chuong',
  'cap_mo_chan_kich',
  'ngu_doc_than_chuong',
  'van_doc_bao_phat',
];
/** Arena-only server simulation. Nothing in the client can start casts or submit hits. */
export class TayDocEncounter {
  readonly bossId = 'tay_doc_boss';
  phase: TayDocView['phase'] = 'waiting';
  transitionAt = 0;
  cast: TayDocCast | undefined;
  readonly projectiles = new Map<string, TayDocShot>();
  readonly pools = new Map<string, TayDocPool>();
  readonly marks = new Map<string, TayDocMark>();
  readonly poisons = new Map<string, TayDocPoison>();
  readonly pillars = new Map<string, TayDocPillar>();
  readonly impacts: TayDocView['impacts'] = [];
  nextActionAt = 0;
  private rotation = 0;
  private cooldowns = new Map<TayDocAbility, number>();
  private deathAt = 0;
  private corpseUntil = 0;
  constructor(readonly definition: TayDocDefinition) {}
  spawn(world: World, config: SimulationConfig): boolean {
    if (this.phase !== 'waiting') return false;
    const d = this.definition,
      b = addCreep(world, this.bossId, d.spawn, config);
    b.archetypeId = 'tay_doc';
    b.controlled = true;
    b.forcedMovementImmune = true;
    b.crowdControlScale = d.controlScale;
    b.hp = b.maxHp = d.hp;
    b.fx = 1;
    b.fy = 0;
    b.respawnAt = Infinity;
    b.stats = {
      ...config.creep,
      hp: d.hp,
      defense: d.defense,
      speed: d.speed,
      radius: d.radius,
      xp: d.xp,
      gold: d.gold,
      assistTicks: Number.MAX_SAFE_INTEGER,
    };
    this.phase = 'enter';
    return true;
  }
  private id(world: World, prefix: string) {
    return 'tay_' + prefix + '_' + world.nextId++;
  }
  private alive(world: World) {
    return [...world.heroes.values()]
      .filter((h) => h.hp > 0)
      .sort((a, b) => a.id.localeCompare(b.id));
  }
  private impact(world: World, ability: string, p: Point, radius: number) {
    this.impacts.push({
      id: this.id(world, 'impact'),
      ability,
      x: p.x,
      y: p.y,
      at: world.tick,
      radius,
    });
    emit(world, {
      kind: 'pulse',
      abilityId: ability,
      sourceId: this.bossId,
      targetId: '',
      ...p,
      radius,
      damage: 0,
      critical: false,
      stage: 'release',
    });
  }
  private damage(
    world: World,
    h: Hero,
    ability: TayDocAbility,
    damage: number,
    config: SimulationConfig,
    poison = false,
    slow = false,
  ) {
    if ((world.creeps.get(this.bossId)?.hp ?? 0) <= 0) return;
    if (hurt(world, h, this.bossId, ability, damage, config, crit)) {
      if (poison) this.infect(world, h, ability, slow);
      if (ability === 'cap_mo_chan_kich')
        applyStatus(
          h,
          {
            kind: 'stun',
            durationTicks: this.definition.stunDuration,
            magnitude: 1,
          },
          this.bossId,
          ability,
          world.tick,
        );
    }
  }
  private infect(world: World, h: Hero, ability: TayDocAbility, slow: boolean) {
    const d = this.definition,
      old = this.poisons.get(h.id);
    this.poisons.set(h.id, {
      targetId: h.id,
      ability,
      slow: slow || (old?.slow ?? false),
      until: world.tick + d.poisonDuration,
      nextTick: old?.nextTick ?? world.tick + d.poisonInterval,
    });
    if (slow)
      applyStatus(
        h,
        { kind: 'slow', durationTicks: d.slowDuration, magnitude: d.slow },
        this.bossId,
        ability,
        world.tick,
      );
  }
  private shoot(
    world: World,
    ability: TayDocAbility,
    p: Point,
    angle: number,
    ownerId = this.bossId,
    range?: number,
    speed?: number,
  ) {
    const a = this.definition.attacks[ability],
      v = speed ?? a.speed,
      heading = { x: Math.cos(angle), y: Math.sin(angle) };
    const id = this.id(world, 'shot');
    this.projectiles.set(id, {
      id,
      ability,
      ownerId,
      x: p.x,
      y: p.y,
      vx: heading.x * v,
      vy: heading.y * v,
      remaining: range ?? a.range,
      radius: ability === 'van_doc_phi_cham' ? 3 : a.radius,
      damage:
        a.damage * (this.phase === 'phase2' ? this.definition.phase2Damage : 1),
      poison: true,
      slow: ability === 'van_doc_phi_cham',
      startedAt: world.tick,
    });
  }
  private radial(world: World, ability: TayDocAbility, p: Point, offset = 0) {
    for (let i = 0; i < this.definition.radialCount; i++)
      this.shoot(
        world,
        ability,
        p,
        offset + (i * 2 * Math.PI) / this.definition.radialCount,
      );
  }
  private legal(
    world: World,
    config: SimulationConfig,
    center: Point,
    radius: number,
    count: number,
  ): Point[] {
    const out: Point[] = [],
      d = this.definition;
    for (let i = 0; i < count; i++) {
      let best: Point | undefined;
      for (let tries = 0; tries < 80; tries++) {
        const a = (i / count) * Math.PI * 2 + (world.random() - 0.5) * 0.3;
        const p = {
          x: Math.max(
            d.bounds.x + radius,
            Math.min(
              d.bounds.x + d.bounds.width - radius,
              center.x + Math.cos(a) * (160 + world.random() * 210),
            ),
          ),
          y: Math.max(
            d.bounds.y + radius,
            Math.min(
              d.bounds.y + d.bounds.height - radius,
              center.y + Math.sin(a) * (120 + world.random() * 180),
            ),
          ),
        };
        if (
          !blocked(p, radius, config.width, config.height, config.collision) &&
          out.every((q) => distance(p, q) >= radius * 1.4)
        ) {
          best = p;
          break;
        }
      }
      if (!best) {
        // Deterministic grid fallback: never publish an invalid or overlapping warning.
        outer: for (
          let y = d.bounds.y + radius;
          y < d.bounds.y + d.bounds.height - radius;
          y += radius * 1.5
        )
          for (
            let x = d.bounds.x + radius;
            x < d.bounds.x + d.bounds.width - radius;
            x += radius * 1.5
          ) {
            const p = { x, y };
            if (
              !blocked(
                p,
                radius,
                config.width,
                config.height,
                config.collision,
              ) &&
              out.every((q) => distance(p, q) >= radius * 1.4)
            ) {
              best = p;
              break outer;
            }
          }
      }
      if (best) out.push(best);
    }
    return out;
  }
  /** Core-only API for deterministic tests; no network handler exposes this. */
  begin(
    world: World,
    config: SimulationConfig,
    ability: TayDocAbility,
    target: Hero,
  ): boolean {
    const b = world.creeps.get(this.bossId);
    if (
      !b ||
      b.hp <= 0 ||
      this.cast ||
      target.hp <= 0 ||
      !world.heroes.has(target.id)
    )
      return false;
    if (
      !(
        this.phase === 'phase1' ? p1 : this.phase === 'phase2' ? p2 : []
      ).includes(ability)
    )
      return false;
    if (
      ability === 'hon_thien_phuc_long_chan' &&
      [...this.pillars.keys()].some((id) => (world.creeps.get(id)?.hp ?? 0) > 0)
    )
      return false;
    const basic = ['tay_doc_staff', 'tay_doc_gas', 'doc_chuong'].includes(
      ability,
    );
    if (
      hasStatus(b, 'stun', world.tick) ||
      hasStatus(b, basic ? 'disarm' : 'silence', world.tick)
    )
      return false;
    const a = this.definition.attacks[ability],
      v = direction(target.x - b.x, target.y - b.y),
      now = world.tick;
    let points: Point[] = [];
    if (ability === 'doc_vu_me_hon')
      points = this.legal(
        world,
        config,
        { x: 800, y: 660 },
        this.definition.cloudRadius,
        this.definition.cloudCount,
      );
    if (ability === 'hon_thien_phuc_long_chan') {
      const field = config.heroBounds ?? {
        x: 800,
        y: 616,
        radiusX: 324,
        radiusY: 294,
      };
      points = Array.from({ length: 6 }, (_, i) => ({
        x: field.x + Math.cos((i * Math.PI) / 3) * (field.radiusX - 39),
        y: field.y + Math.sin((i * Math.PI) / 3) * (field.radiusY - 39),
      }));
      if (
        points.some((p) =>
          blocked(p, 26, config.width, config.height, config.collision),
        )
      )
        return false;
    }
    if (
      (ability === 'doc_vu_me_hon' &&
        points.length !== this.definition.cloudCount) ||
      (ability === 'hon_thien_phuc_long_chan' && points.length !== 6)
    )
      return false;
    if (ability === 'van_doc_bao_phat') {
      let from: Point = { x: b.x, y: b.y };
      for (let i = 0; i < 3; i++) {
        const candidates = this.legal(
          world,
          config,
          { x: 800, y: 660 },
          this.definition.radius,
          6,
        ).filter(
          (p) =>
            !config.collision.some(
              (w) =>
                segmentRect(from, p, w, this.definition.radius) !== undefined,
            ),
        );
        const p = candidates[i % candidates.length] ?? { ...from };
        points.push(p);
        from = p;
      }
    }
    const duration =
      ability === 'van_doc_bao_phat'
        ? 3 * this.definition.jumpTicks + 2 * this.definition.jumpRest
        : a.duration;
    this.cast = {
      id: this.id(world, 'cast'),
      ability,
      startedAt: now,
      activeAt: now + a.windup,
      endsAt: now + a.windup + Math.max(1, duration) + a.recovery,
      origin: { x: b.x, y: b.y },
      fx: v.x || (!v.y ? 1 : 0),
      fy: v.y,
      targetId: target.id,
      fired: false,
      nextVolley: now + a.windup,
      volley: 0,
      points,
      landed: 0,
    };
    b.fx = this.cast.fx;
    b.fy = this.cast.fy;
    b.pose = 'cast';
    b.castAbilityId = ability;
    b.actionUntil = this.cast.endsAt;
    b.encounterAction = {
      startedAt: now,
      activeAt: this.cast.activeAt,
      endsAt: this.cast.endsAt,
    };
    this.cooldowns.set(ability, now + a.cooldown);
    announceBossSkill(world, b.id, ability);
    return true;
  }
  private release(world: World, config: SimulationConfig, c: TayDocCast) {
    const b = world.creeps.get(this.bossId)!,
      a = this.definition.attacks[c.ability],
      d = this.definition;
    const damage = a.damage * (this.phase === 'phase2' ? d.phase2Damage : 1),
      angle = Math.atan2(c.fy, c.fx);
    if (c.ability === 'tay_doc_staff') {
      for (const h of this.alive(world)) {
        const dx = h.x - c.origin.x,
          dy = h.y - c.origin.y;
        if (
          dx * c.fx + dy * c.fy >= -1e-9 &&
          distance(h, c.origin) <= a.range + config.radius &&
          !config.collision.some(
            (w) => segmentRect(c.origin, h, w) !== undefined,
          )
        )
          this.damage(world, h, c.ability, damage, config);
      }
      this.impact(world, c.ability, c.origin, a.range);
    } else if (c.ability === 'tay_doc_gas' || c.ability === 'doc_chuong')
      this.shoot(
        world,
        c.ability,
        { x: b.x + c.fx * 35, y: b.y + c.fy * 35 },
        angle,
      );
    else if (c.ability === 'doc_vu_me_hon')
      for (const p of c.points) {
        const id = this.id(world, 'pool');
        this.pools.set(id, {
          id,
          ...p,
          activeAt: world.tick,
          until: world.tick + d.cloudDuration,
          nextTick: world.tick,
          radius: d.cloudRadius,
          damage,
        });
      }
    else if (c.ability === 'co_doc_khoan_tam') {
      const h = world.heroes.get(c.targetId);
      if (h && h.hp > 0 && !this.marks.has(h.id))
        this.marks.set(h.id, {
          id: this.id(world, 'mark'),
          targetId: h.id,
          at: world.tick,
          until: world.tick + d.curseDelay,
        });
    } else if (c.ability === 'hon_thien_phuc_long_chan')
      for (const p of c.points) {
        const id = this.id(world, 'pillar'),
          actor = addCreep(world, id, p, config);
        actor.archetypeId = 'tay_doc_pillar';
        actor.summonedBy = this.bossId;
        actor.controlled = true;
        actor.forcedMovementImmune = true;
        actor.crowdControlScale = d.controlScale;
        actor.hp = actor.maxHp = d.pillarHp;
        actor.stats = {
          ...config.creep,
          hp: d.pillarHp,
          defense: 0,
          radius: 20,
          xp: 0,
          gold: 0,
        };
        this.pillars.set(id, {
          id,
          ...p,
          at: world.tick,
          heading: Math.atan2(
            (config.heroBounds?.y ?? 616) - p.y,
            (config.heroBounds?.x ?? 800) - p.x,
          ),
          nextShot: world.tick + 15,
        });
      }
    else if (c.ability === 'cap_mo_chan_kich') {
      for (const h of this.alive(world))
        if (distance(h, c.origin) <= a.range + config.radius)
          this.damage(world, h, c.ability, damage, config, true, false);
      this.impact(world, c.ability, c.origin, a.range);
    }
  }
  /** Living marked players pay their unavoidable loss before arena travel; no cross-zone blast. */
  depart(
    world: World,
    config: SimulationConfig,
    id: string,
    travel: boolean,
  ): void {
    if (travel && this.marks.has(id)) {
      const h = world.heroes.get(id);
      if (h && h.hp > 0)
        hurt(
          world,
          h,
          this.bossId,
          'co_doc_khoan_tam',
          h.maxHp * 0.25,
          config,
          { ...crit, unavoidableHpLoss: true, preserveFraction: true },
        );
    }
    this.marks.delete(id);
    this.poisons.delete(id);
  }
  clear(world: World): void {
    this.projectiles.clear();
    this.pools.clear();
    this.marks.clear();
    this.poisons.clear();
    this.cast = undefined;
    for (const id of this.pillars.keys()) world.creeps.delete(id);
    this.pillars.clear();
    this.impacts.length = 0;
    for (const h of world.heroes.values())
      h.statuses = (h.statuses ?? []).filter((s) => s.sourceId !== this.bossId);
  }
  /** Match defeat/room disposal terminates the actor as well as its hazards. */
  reset(world: World): void {
    this.clear(world);
    world.creeps.delete(this.bossId);
    this.phase = 'waiting';
    this.rotation = 0;
    this.cooldowns.clear();
    this.transitionAt = 0;
    this.deathAt = 0;
    this.nextActionAt = 0;
  }
  dispose(world: World): void {
    this.clear(world);
    world.creeps.delete(this.bossId);
    this.phase = 'dead';
    this.deathAt = world.tick;
  }
  step(world: World, config: SimulationConfig): void {
    if (!bossFightReady(world, config) && this.phase !== 'enter') return;
    if (this.phase === 'waiting') return;
    const b = world.creeps.get(this.bossId),
      d = this.definition;
    if (!b || b.hp <= 0) {
      if (this.phase !== 'dead') {
        this.phase = 'dead';
        this.deathAt = world.tick;
        this.clear(world);
        if (b) {
          b.respawnAt = Infinity;
          this.corpseUntil = waveBossFarewell(world, config, b);
        }
      }
      if (world.tick >= Math.max(this.corpseUntil, this.deathAt + 31))
        world.creeps.delete(this.bossId);
      return;
    }
    this.impacts.splice(
      0,
      this.impacts.findIndex(
        (p) => world.tick - p.at < (p.ability === 'cap_mo_chan_kich' ? 27 : 18),
      ) === -1
        ? this.impacts.length
        : this.impacts.findIndex(
            (p) =>
              world.tick - p.at < (p.ability === 'cap_mo_chan_kich' ? 27 : 18),
          ),
    );
    for (const [id, p] of this.poisons) {
      const h = world.heroes.get(id);
      if (!h || h.hp <= 0 || world.tick > p.until) {
        this.poisons.delete(id);
        continue;
      }
      if (world.tick >= p.nextTick) {
        hurt(world, h, this.bossId, p.ability, d.poisonDamage, config, {
          ...crit,
          periodic: true,
        });
        p.nextTick += d.poisonInterval;
      }
    }
    for (const [id, m] of this.marks) {
      if (b.hp <= 0) {
        this.step(world, config);
        return;
      }
      const h = world.heroes.get(id);
      if (!h || h.hp <= 0) {
        this.marks.delete(id);
        continue;
      }
      if (world.tick >= m.until) {
        this.marks.delete(id);
        const pos = { x: h.x, y: h.y };
        hurt(
          world,
          h,
          this.bossId,
          'co_doc_khoan_tam',
          h.maxHp * 0.25,
          config,
          { ...crit, unavoidableHpLoss: true, preserveFraction: true },
        );
        for (const ally of this.alive(world))
          if (
            ally.id !== h.id &&
            distance(ally, pos) <= d.curseRadius + config.radius
          )
            this.damage(
              world,
              ally,
              'co_doc_khoan_tam',
              d.attacks.co_doc_khoan_tam.damage,
              config,
              true,
            );
        this.impact(world, 'co_doc_khoan_tam', pos, d.curseRadius);
      }
    }
    for (const [id, p] of this.pools) {
      if (world.tick >= p.until) {
        this.pools.delete(id);
        continue;
      }
      if (world.tick >= p.nextTick) {
        for (const h of this.alive(world))
          if (distance(h, p) <= p.radius + config.radius)
            this.damage(
              world,
              h,
              'doc_vu_me_hon',
              p.damage,
              config,
              true,
              true,
            );
        p.nextTick += d.poisonInterval;
      }
    }
    this.stepShots(world, config);
    if (b.hp <= 0) {
      this.step(world, config);
      return;
    }
    for (const [id, p] of this.pillars) {
      const actor = world.creeps.get(id);
      if (!actor || actor.hp <= 0) {
        p.deadAt ??= world.tick;
        if (world.tick - p.deadAt >= 16) {
          world.creeps.delete(id);
          this.pillars.delete(id);
        }
        continue;
      }
      if (
        this.alive(world).length &&
        world.tick >= p.nextShot &&
        !hasStatus(actor, 'stun', world.tick) &&
        !hasStatus(actor, 'disarm', world.tick)
      ) {
        const a = p.heading;
        actor.fx = Math.cos(a);
        actor.fy = Math.sin(a);
        for (const offset of [-0.4, 0, 0.4])
          this.shoot(
            world,
            'hon_thien_phuc_long_chan',
            { x: p.x + actor.fx * 24, y: p.y + actor.fy * 24 },
            a + offset,
            id,
            d.pillarRange,
            d.pillarSpeed,
          );
        p.nextShot =
          (world.tick - p.nextShot > d.pillarInterval
            ? world.tick
            : p.nextShot) + d.pillarInterval;
      }
    }
    if (
      b.hp < b.maxHp * 0.5 &&
      (this.phase === 'phase1' || this.phase === 'enter')
    ) {
      this.phase = 'transition';
      this.transitionAt = world.tick;
      this.cast = undefined;
      b.castAbilityId = 'cap_mo_cong';
      announceBossSkill(world, b.id, 'cap_mo_cong');
      b.pose = 'cast';
      this.rotation = 0;
      this.cooldowns.clear();
      b.actionUntil = world.tick + d.transition;
      b.encounterAction = {
        startedAt: world.tick,
        activeAt: world.tick + d.transition,
        endsAt: world.tick + d.transition,
      };
    }
    if (this.phase === 'transition') {
      if (world.tick < this.transitionAt + d.transition) return;
      this.phase = 'phase2';
      b.castAbilityId = '';
      this.nextActionAt = world.tick + d.rest;
    }
    const heroes = this.alive(world);
    if (!heroes.length) {
      b.pose = 'idle';
      this.cast = undefined;
      b.castAbilityId = '';
      return;
    }
    if (this.phase === 'enter') {
      if (hasStatus(b, 'stun', world.tick)) {
        b.pose = 'idle';
        return;
      }
      const old = { x: b.x, y: b.y };
      displace(
        b,
        Math.min(
          d.entryEndX - b.x,
          (d.speed * (1 - Math.min(0.85, statusValue(b, 'slow', world.tick)))) /
            config.tickRate,
        ),
        0,
        d.radius,
        config,
      );
      b.fx = 1;
      b.fy = 0;
      b.pose = 'walk';
      if (b.x >= d.entryEndX - 1 || distance(old, b) < 0.001) {
        this.phase = 'phase1';
        b.pose = 'idle';
        this.nextActionAt = world.tick + d.rest;
      }
      return;
    }
    if (this.cast) {
      const c = this.cast,
        a = d.attacks[c.ability];
      b.fx = c.fx;
      b.fy = c.fy;
      b.pose = 'cast';
      if (world.tick >= c.activeAt && !c.fired) {
        c.fired = true;
        this.release(world, config, c);
      }
      if (
        c.fired &&
        c.ability === 'van_doc_phi_cham' &&
        c.volley < d.needleVolleys &&
        world.tick >= c.nextVolley
      ) {
        for (let i = 0; i < d.needleCount; i++)
          this.shoot(
            world,
            c.ability,
            c.origin,
            Math.atan2(c.fy, c.fx) +
              (i / (d.needleCount - 1) - 0.5) * d.needleSpread,
          );
        c.volley++;
        c.nextVolley += a.interval;
      }
      if (
        c.fired &&
        c.ability === 'ngu_doc_than_chuong' &&
        world.tick < c.activeAt + a.duration &&
        world.tick >= c.nextVolley
      ) {
        this.radial(
          world,
          c.ability,
          c.origin,
          ((c.volley % 2) * Math.PI) / d.radialCount,
        );
        c.volley++;
        c.nextVolley += a.interval;
      }
      if (c.ability === 'van_doc_bao_phat' && c.fired) {
        const elapsed = world.tick - c.activeAt,
          stride = d.jumpTicks + d.jumpRest,
          index = Math.min(2, Math.floor(elapsed / stride)),
          local = elapsed - index * stride;
        const from = index === 0 ? c.origin : c.points[index - 1]!,
          to = c.points[index]!;
        const p = Math.min(1, local / d.jumpTicks);
        displace(
          b,
          from.x + (to.x - from.x) * p - b.x,
          from.y + (to.y - from.y) * p - b.y,
          d.radius,
          config,
        );
        if (local >= d.jumpTicks && c.landed <= index) {
          this.radial(world, c.ability, b, (index * Math.PI) / d.radialCount);
          this.impact(world, c.ability, b, 90);
          c.landed = index + 1;
        }
      }
      if (world.tick >= c.endsAt) {
        this.cast = undefined;
        b.castAbilityId = '';
        b.pose = 'idle';
        this.nextActionAt = world.tick + d.rest;
      }
      return;
    }
    if (hasStatus(b, 'stun', world.tick)) {
      b.pose = 'idle';
      return;
    }
    const target = heroes
      .filter((h) => !hasStatus(h, 'concealed', world.tick))
      .sort(
        (a, c) => distance(b, a) - distance(b, c) || a.id.localeCompare(c.id),
      )[0];
    if (!target) {
      b.pose = 'idle';
      return;
    }
    if (world.tick >= this.nextActionAt) {
      const rotation = this.phase === 'phase2' ? p2 : p1;
      for (let i = 0; i < rotation.length; i++) {
        const ability = rotation[this.rotation++ % rotation.length]!;
        if (world.tick < (this.cooldowns.get(ability) ?? 0)) continue;
        if (this.begin(world, config, ability, target)) break;
      }
    }
    if (!this.cast) {
      const v = direction(target.x - b.x, target.y - b.y);
      b.fx = v.x;
      b.fy = v.y;
      b.pose = 'idle';
      if (distance(target, b) > 125) {
        const before = { x: b.x, y: b.y },
          speed =
            (this.phase === 'phase2' ? d.phase2Speed : d.speed) *
            (1 - Math.min(0.85, statusValue(b, 'slow', world.tick)));
        displace(
          b,
          (v.x * speed) / config.tickRate,
          (v.y * speed) / config.tickRate,
          d.radius,
          config,
        );
        b.pose = distance(before, b) > 0.001 ? 'walk' : 'idle';
      }
    }
  }
  private stepShots(world: World, config: SimulationConfig) {
    for (const [id, s] of this.projectiles) {
      const dir = direction(s.vx, s.vy),
        length = Math.min(
          s.remaining,
          Math.hypot(s.vx, s.vy) / config.tickRate,
        ),
        end = { x: s.x + dir.x * length, y: s.y + dir.y * length };
      let wall = blocked(end, s.radius, config.width, config.height, [])
        ? 1
        : Infinity;
      for (const w of config.collision)
        wall = Math.min(wall, segmentRect(s, end, w, s.radius) ?? Infinity);
      const hits = this.alive(world)
        .map((h) => ({
          h,
          t: segmentCircle(s, end, h, config.radius + s.radius),
        }))
        .filter(
          (v): v is { h: Hero; t: number } => v.t !== undefined && v.t < wall,
        )
        .sort((a, b) => a.t - b.t || a.h.id.localeCompare(b.h.id));
      if (hits[0]) {
        this.damage(
          world,
          hits[0].h,
          s.ability,
          s.damage,
          config,
          s.poison,
          s.slow,
        );
        this.projectiles.delete(id);
      } else if (wall !== Infinity) this.projectiles.delete(id);
      else {
        s.x = end.x;
        s.y = end.y;
        s.remaining -= length;
        if (s.remaining <= 1e-8) this.projectiles.delete(id);
      }
    }
  }
  view(world: World): TayDocView {
    return {
      tick: world.tick,
      bossId: this.bossId,
      phase: this.phase,
      transitionAt: this.transitionAt,
      deathAt: this.deathAt,
      ...(this.cast
        ? {
            cast: {
              ...this.cast,
              origin: { ...this.cast.origin },
              points: this.cast.points.map((p) => ({ ...p })),
            },
          }
        : {}),
      projectiles: [...this.projectiles.values()].map((s) => ({ ...s })),
      pools: [...this.pools.values()].map((p) => ({ ...p })),
      marks: [...this.marks.values()].map((p) => ({ ...p })),
      poisons: [...this.poisons.values()].map((p) => ({ ...p })),
      pillars: [...this.pillars.values()].map((p) => ({
        ...p,
        hp: world.creeps.get(p.id)?.hp ?? 0,
        maxHp: this.definition.pillarHp,
      })),
      impacts: this.impacts.map((p) => ({ ...p })),
    };
  }
}
/** Minimal ordered chapter hook; Dong Ta is never marked defeated automatically. */
export class TayDocGate {
  dongTaDefeated = false;
  spawned = false;
  readyAt: number | undefined;
  completeChapter(id: 'dong_ta') {
    if (id === 'dong_ta') this.dongTaDefeated = true;
  }
  step(
    world: World,
    config: SimulationConfig,
    wave: number,
    encounter: TayDocEncounter,
  ) {
    if (this.spawned || !this.dongTaDefeated || wave < 10) return;
    if ([...(world.invasionPending ?? [])].some((w) => w <= 10)) return;
    if (
      [...world.creeps.values()].some(
        (c) => c.hp > 0 && c.invasion && c.invasion.wave <= 10,
      )
    )
      return;
    this.readyAt ??= world.tick + encounter.definition.gateRest;
    if (world.tick >= this.readyAt) {
      this.spawned = encounter.spawn(world, config);
    }
  }
}
