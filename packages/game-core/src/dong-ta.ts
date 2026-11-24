import { waveBossFarewell } from './boss-banter.js';
import { announceBossSkill } from './boss-skill-announcement.js';
import { emit, hurt } from './combat.js';
import { addCreep } from './simulation.js';
import { gainExperience } from './progression.js';
import {
  cancelOwnedEffects,
  displace,
  hasStatus,
  statusValue,
  applyStatus,
} from './status.js';
import {
  clampEllipse,
  direction,
  distance,
  moveCircle,
  segmentCircle,
  segmentRect,
} from './geometry.js';
import type { Creep, Hero, Point, SimulationConfig, World } from './types.js';
import type {
  DongAbility,
  DongCast,
  DongDefinition,
  DongEffect,
  DongHooks,
  DongView,
} from './dong-ta-types.js';

const bossId = 'dong_ta';
const actorIds = ['dong_ta', 'mai_sieu_phong', 'hoang_dung'] as const;
const noCrit = { critChance: 0, critMultiplier: 1 };
export const isDongActor = (id: string) =>
  (actorIds as readonly string[]).includes(id);

/** Match-wide wave encounter. All geometry, RNG, impacts and lifecycle run on fixed server ticks. */
export class DongTaEncounter {
  phase: DongView['phase'] = 'waiting';
  phaseUntil = 0;
  attempt = 0;
  summoned = false;
  targetId = '';
  casts: DongCast[] = [];
  effects: DongEffect[] = [];
  readonly ready = new Map<string, number>();
  private serial = 0;
  private normal = 0;
  private paid = false;
  private corpseUntil = 0;
  constructor(
    readonly definition: DongDefinition,
    private hooks: DongHooks,
  ) {}
  get locked(): boolean {
    return this.phase === 'fighting' || this.phase === 'retry';
  }

  beforeStep(world: World, config: SimulationConfig, wave: number): void {
    if (this.phase === 'cleared' && world.tick + 1 >= this.corpseUntil)
      world.creeps.delete(bossId);
    const t = world.tick + 1,
      d = this.definition;
    if (
      this.phase === 'waiting' &&
      wave >= d.gateWave &&
      !world.invasionPending?.has(d.gateWave) &&
      ![...world.creeps.values()].some(
        (c) => c.invasion?.wave === d.gateWave && c.hp > 0,
      )
    ) {
      this.phase = 'rest';
      this.phaseUntil = t + d.restTicks;
    }
    if (this.phase === 'rest' && t >= this.phaseUntil) {
      this.phase = 'entry';
      this.phaseUntil = t + d.entryTicks;
      this.spawn(world, config, 'dong_ta', d.entry).invulnerable = true;
    }
    if (this.phase === 'entry') {
      const boss = world.creeps.get(bossId)!;
      const a = Math.min(1, 1 - (this.phaseUntil - t) / d.entryTicks);
      boss.x = d.entry.x + (d.center.x - d.entry.x) * a;
      boss.y = d.center.y;
      boss.fx = -1;
      boss.fy = 0;
      boss.pose = 'walk';
      boss.actionUntil = t + 1;
      if (a >= 1) this.startAttempt(world, config);
    }
    if (
      !config.campaign &&
      this.phase === 'retry' &&
      t >= this.phaseUntil &&
      world.heroes.size
    )
      this.startAttempt(world, config);
  }
  private startAttempt(world: World, config: SimulationConfig): void {
    this.cleanup(world);
    this.attempt++;
    this.summoned = false;
    this.targetId = '';
    this.normal = 0;
    this.ready.clear();
    this.phase = 'fighting';
    this.phaseUntil = 0;
    this.hooks.lock(true);
    this.hooks.recall();
    const boss = this.spawn(world, config, 'dong_ta', this.definition.center);
    boss.cooldown = world.tick + this.definition.openingTicks;
    for (const [i, id] of (
      ['dan_chi_than_cong', 'lac_anh_kiem_phap', 'ngoc_tieu_hoi_phong'] as const
    ).entries())
      this.ready.set(id, world.tick + (3 + i * 3) * config.tickRate);
  }
  restartCampaign(world: World, config: SimulationConfig): void {
    this.startAttempt(world, config);
  }
  suspendCampaign(world: World): void {
    this.retry(world);
  }
  private spawn(
    world: World,
    config: SimulationConfig,
    id: (typeof actorIds)[number],
    point: Point,
  ): Creep {
    const p = this.definition.actors[id],
      hp = Math.round(
        p.hp *
          (1 +
            this.definition.hpPerAdditionalPlayer *
              Math.max(0, world.heroes.size - 1)),
      );
    const actor = addCreep(world, id, point, config);
    Object.assign(actor, {
      hp,
      maxHp: hp,
      archetypeId: id,
      controlled: true,
      bossEncounter: true,
      waveBossActor: true,
      forcedMovementImmune: true,
      controlResistance: this.definition.controlResistance,
      stats: {
        ...config.creep,
        hp,
        defense: p.defense,
        speed: p.speed,
        xp: 0,
        gold: 0,
      },
    });
    return actor;
  }
  private cleanup(world: World, keepCorpse = false): void {
    this.casts = [];
    this.effects = [];
    for (const id of actorIds) {
      cancelOwnedEffects(world, id);
      if (!keepCorpse || id !== bossId) world.creeps.delete(id);
    }
    for (const h of world.heroes.values())
      h.statuses = (h.statuses ?? []).filter((s) => !isDongActor(s.sourceId));
  }
  /** Called after player skills/projectiles/DOT, before respawn processing. */
  afterStep(world: World, config: SimulationConfig): void {
    if (this.phase !== 'fighting') return;
    const boss = world.creeps.get(bossId);
    if (!boss || boss.hp <= 0) {
      this.clear(world, config, boss);
      return;
    }
    if (!config.campaign && this.wiped(world)) {
      this.retry(world);
      return;
    }
    if (!this.summoned && boss.hp < boss.maxHp * 0.4) {
      this.casts = this.casts.filter((c) => c.actorId !== bossId);
      this.beginCast(world, config, bossId, 'trieu_hon_dong_hai');
      this.summoned = true;
    }
    for (const c of [...this.casts]) {
      const owner = world.creeps.get(c.actorId);
      if (
        !owner ||
        owner.hp <= 0 ||
        (hasStatus(owner, 'stun', world.tick) &&
          c.abilityId !== 'trieu_hon_dong_hai')
      ) {
        this.casts = this.casts.filter((v) => v !== c);
        continue;
      }
      if (world.tick >= c.activeAt && !c.released) {
        c.released = true;
        this.release(world, config, c);
      }
      if (c.released) this.pulses(world, config, c);
      if (world.tick >= c.endsAt) {
        this.casts = this.casts.filter((v) => v !== c);
        if (c.abilityId === 'am_phong_hap_luc') {
          const target = world.heroes.get(c.targetId);
          if (
            target &&
            target.hp > 0 &&
            this.beginCast(
              world,
              config,
              c.actorId,
              'ma_anh_troc_hon',
              target.id,
            )
          ) {
            const follow = this.casts.find((v) => v.actorId === c.actorId)!;
            follow.activeAt = world.tick + this.definition.pull.followupTicks;
            follow.nextPulse = follow.activeAt;
            follow.endsAt =
              follow.activeAt +
              this.definition.abilities.ma_anh_troc_hon.duration;
            follow.released = false;
            const aim = direction(target.x - owner.x, target.y - owner.y);
            follow.fx = aim.x;
            follow.fy = aim.y;
            owner.actionUntil = follow.endsAt;
            owner.cooldown = follow.endsAt + Math.round(0.35 * config.tickRate);
          }
        }
      }
    }
    this.stepEffects(world, config);
    // Counter/retaliation can kill Đông Tà during an effect impact.
    if (boss.hp <= 0) {
      this.clear(world, config, boss);
      return;
    }
    if (!config.campaign && this.wiped(world)) {
      this.retry(world);
      return;
    }
    this.ai(world, config);
  }
  private wiped(world: World): boolean {
    return (
      world.heroes.size > 0 &&
      [...world.heroes.values()].every((h) => h.hp <= 0)
    );
  }
  private retry(world: World): void {
    this.cleanup(world);
    this.targetId = '';
    this.phase = 'retry';
    this.phaseUntil = world.tick + this.definition.retryTicks;
    for (const h of world.heroes.values()) {
      h.moveX = h.moveY = 0;
      cancelOwnedEffects(world, h.id);
    }
    this.hooks.lock(true);
    emit(world, {
      kind: 'effect',
      sourceId: bossId,
      targetId: '',
      abilityId: 'dong_ta_retry',
      ...this.definition.center,
      damage: 0,
      critical: false,
    });
  }
  private clear(world: World, config: SimulationConfig, boss?: Creep): void {
    if (!this.paid) {
      this.paid = true;
      const eligible = [...world.heroes.values()]
        .filter((h) => boss?.hits[h.id] !== undefined)
        .sort((a, b) => a.id.localeCompare(b.id));
      eligible.forEach((h, i) => {
        if (config.campaign) return;
        gainExperience(
          h,
          Math.floor(this.definition.xp / eligible.length) +
            (i < this.definition.xp % eligible.length ? 1 : 0),
          config,
        );
        h.gold +=
          Math.floor(this.definition.gold / eligible.length) +
          (i < this.definition.gold % eligible.length ? 1 : 0);
      });
    }
    this.phase = 'cleared';
    this.phaseUntil = 0;
    this.corpseUntil = boss
      ? waveBossFarewell(world, config, boss)
      : world.tick;
    this.cleanup(world, this.corpseUntil > world.tick);
    this.hooks.lock(false);
    emit(world, {
      kind: 'effect',
      sourceId: bossId,
      targetId: '',
      abilityId: 'dong_ta_clear',
      ...this.definition.center,
      damage: 0,
      critical: false,
    });
  }
  private nearest(world: World, p: Point): Hero | undefined {
    return [...world.heroes.values()]
      .filter((h) => h.hp > 0 && !hasStatus(h, 'concealed', world.tick))
      .sort(
        (a, b) => distance(a, p) - distance(b, p) || a.id.localeCompare(b.id),
      )[0];
  }
  private ai(world: World, config: SimulationConfig): void {
    const t = world.tick;
    for (const id of actorIds) {
      const actor = world.creeps.get(id);
      if (
        !actor ||
        actor.hp <= 0 ||
        this.casts.some((c) => c.actorId === id) ||
        hasStatus(actor, 'stun', t)
      )
        continue;
      actor.castAbilityId = '';
      let target = this.nearest(world, actor);
      if (id === 'mai_sieu_phong') {
        const locked = world.heroes.get(this.targetId);
        if (!locked || locked.hp <= 0) this.targetId = target?.id ?? '';
        target = world.heroes.get(this.targetId);
      }
      if (!target) continue;
      const n = direction(target.x - actor.x, target.y - actor.y);
      actor.fx = n.x;
      actor.fy = n.y;
      const ready = world.tick >= actor.cooldown,
        mayCast = ready && !hasStatus(actor, 'silence', t);
      let chosen: DongAbility | undefined;
      if (id === 'dong_ta') {
        if (mayCast)
          chosen = (
            [
              'ngoc_tieu_hoi_phong',
              'lac_anh_kiem_phap',
              'dan_chi_than_cong',
            ] as const
          ).find((a) => t >= (this.ready.get(a) ?? 0));
        if (
          !chosen &&
          ready &&
          distance(actor, target) <= this.definition.thrust.range &&
          !hasStatus(actor, 'disarm', t)
        ) {
          const normal =
            this.normal % 2 ? 'lac_anh_normal' : 'ta_kiem_lien_kich';
          if (t >= (this.ready.get(normal) ?? 0)) {
            chosen = normal;
            this.normal++;
          }
        }
      } else if (id === 'mai_sieu_phong') {
        if (mayCast)
          chosen = (
            ['doc_cot_bao', 'am_phong_hap_luc', 'ma_anh_troc_hon'] as const
          ).find((a) => t >= (this.ready.get(a) ?? Infinity));
        if (
          !chosen &&
          ready &&
          distance(actor, target) < 100 &&
          !hasStatus(actor, 'disarm', t) &&
          t >= (this.ready.get('bach_cot_trao') ?? 0)
        )
          chosen = 'bach_cot_trao';
      } else {
        if (mayCast && t >= (this.ready.get('linh_xa_bo') ?? 0))
          chosen = 'linh_xa_bo';
        else if (mayCast && t >= (this.ready.get('thanh_am_ho_tro') ?? 0))
          chosen = 'thanh_am_ho_tro';
      }
      if (chosen) {
        this.beginCast(world, config, id, chosen, target.id);
        continue;
      }
      const reach = id === 'dong_ta' ? 150 : id === 'mai_sieu_phong' ? 62 : 190;
      const flee = id === 'hoang_dung';
      const moving = flee
        ? distance(actor, target) < reach
        : distance(actor, target) > reach;
      if (moving) {
        const sprint =
          t < (this.ready.get('sprint_until') ?? 0)
            ? this.definition.sprintMultiplier
            : 1;
        const speed =
          (actor.stats?.speed ?? 100) *
          sprint *
          (1 - Math.min(0.85, statusValue(actor, 'slow', t)));
        moveCircle(
          actor,
          {
            x: ((n.x * speed) / config.tickRate) * (flee ? -1 : 1),
            y: ((n.y * speed) / config.tickRate) * (flee ? -1 : 1),
          },
          actor.stats!.radius,
          config.width,
          config.height,
          config.collision,
        );
        clampEllipse(actor, this.definition.bounds, actor.stats!.radius);
        actor.pose = 'walk';
      } else actor.pose = 'idle';
    }
  }
  beginCast(
    world: World,
    config: SimulationConfig,
    actorId: string,
    abilityId: DongAbility,
    targetId = '',
  ): boolean {
    const a = world.creeps.get(actorId),
      p = this.definition.abilities[abilityId];
    if (
      this.phase !== 'fighting' ||
      !a ||
      a.hp <= 0 ||
      this.casts.some((c) => c.actorId === actorId)
    )
      return false;
    const cast: DongCast = {
      id: `dong_${this.attempt}_${++this.serial}`,
      actorId,
      abilityId,
      x: a.x,
      y: a.y,
      fx: a.fx,
      fy: a.fy,
      targetId,
      startedAt: world.tick,
      activeAt: world.tick + p.windup,
      endsAt: world.tick + p.windup + p.duration,
      released: false,
      nextPulse: world.tick + p.windup,
      pulse: 0,
      pattern: world.random() < 0.5 ? 'plus' : 'x',
    };
    this.casts.push(cast);
    announceBossSkill(world, actorId, abilityId);
    if (abilityId === 'lac_anh_normal') {
      const d = this.definition,
        shape =
          d.normalDash.paths[Math.min(3, Math.floor(world.random() * 4))]!;
      const angle =
        Math.abs(a.fx) > Math.abs(a.fy)
          ? a.fx < 0
            ? Math.PI
            : 0
          : a.fy < 0
            ? -Math.PI / 2
            : Math.PI / 2;
      cast.path = [
        { x: a.x, y: a.y },
        ...shape.map(([x, y]) => {
          const p = {
            x: d.center.x + x! * Math.cos(angle) - y! * Math.sin(angle),
            y: d.center.y + x! * Math.sin(angle) + y! * Math.cos(angle),
          };
          clampEllipse(p, d.bounds, a.stats!.radius);
          return p;
        }),
      ];
      cast.endsAt =
        cast.activeAt +
        d.normalDash.approachTicks +
        (shape.length - 1) * d.normalDash.segmentTicks;
      cast.hitIds = [];
    }
    a.pose = 'cast';
    a.castAbilityId = abilityId;
    a.actionUntil = cast.endsAt;
    a.cooldown = cast.endsAt + Math.round(0.35 * config.tickRate);
    this.ready.set(abilityId, world.tick + p.cooldown);
    emit(world, {
      kind: 'cast',
      sourceId: actorId,
      targetId,
      abilityId,
      x: a.x,
      y: a.y,
      fx: a.fx,
      fy: a.fy,
      damage: 0,
      critical: false,
    });
    return true;
  }
  private effect(
    world: World,
    c: Pick<
      DongCast,
      'id' | 'actorId' | 'abilityId' | 'x' | 'y' | 'fx' | 'fy' | 'targetId'
    >,
    kind: DongEffect['kind'],
    overrides: Partial<DongEffect> = {},
  ): DongEffect {
    const e: DongEffect = {
      id: `${c.id}_fx_${++this.serial}`,
      ownerId: c.actorId,
      abilityId: c.abilityId,
      kind,
      x: c.x,
      y: c.y,
      origin: { x: c.x, y: c.y },
      fx: c.fx,
      fy: c.fy,
      speed: 0,
      length: 0,
      radius: 0,
      startedAt: world.tick,
      activeAt: world.tick,
      expiresAt: world.tick + 12,
      damage: this.definition.abilities[c.abilityId].damage,
      hits: [],
      targetId: c.targetId,
      nextTick: world.tick,
      ...overrides,
    };
    this.effects.push(e);
    return e;
  }
  private release(world: World, config: SimulationConfig, c: DongCast): void {
    const d = this.definition,
      t = world.tick;
    switch (c.abilityId) {
      case 'lac_anh_normal':
        break;
      case 'dan_chi_than_cong': {
        const count =
            d.beads.min +
            Math.floor(world.random() * (d.beads.max - d.beads.min + 1)),
          phase = world.random() * Math.PI * 2;
        for (let i = 0; i < count; i++) {
          const a = phase + (i * Math.PI * 2) / count;
          this.effect(world, c, 'bead', {
            fx: Math.cos(a),
            fy: Math.sin(a),
            speed: d.beads.speed,
            length: d.beads.range,
            radius: d.beads.radius,
            expiresAt:
              t + Math.ceil((d.beads.range / d.beads.speed) * config.tickRate),
          });
        }
        break;
      }
      case 'lac_anh_kiem_phap':
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + (c.pattern === 'x' ? Math.PI / 4 : 0);
          this.effect(world, c, 'slash', {
            fx: Math.cos(a),
            fy: Math.sin(a),
            speed: (d.slash.range / d.slash.travelTicks) * config.tickRate,
            length: d.slash.range,
            radius: d.slash.halfWidth,
            expiresAt:
              t +
              Math.max(
                d.slash.travelTicks,
                this.definition.abilities[c.abilityId].duration,
              ),
          });
        }
        break;
      case 'ngoc_tieu_hoi_phong': {
        const points: Point[] = [];
        for (
          let tries = 0;
          points.length < d.petals.count && tries < 20000;
          tries++
        ) {
          const a = world.random() * Math.PI * 2,
            r = Math.sqrt(world.random());
          const point = {
            x: d.center.x + Math.cos(a) * r * (d.bounds.radiusX - 36),
            y: d.center.y + Math.sin(a) * r * (d.bounds.radiusY - 36),
          };
          if (points.some((p) => distance(p, point) < d.petals.separation))
            continue;
          points.push(point);
          const arrive = t + Math.floor(world.random() * 0.7 * config.tickRate);
          this.effect(world, c, 'petal', {
            ...point,
            radius: d.petals.radius,
            activeAt: arrive + d.petals.delayTicks,
            expiresAt: arrive + d.petals.delayTicks + 12,
          });
        }
        if (points.length !== d.petals.count)
          throw Error('Unable to place approved flower count');
        break;
      }
      case 'trieu_hon_dong_hai':
        for (const [i, id] of (
          ['mai_sieu_phong', 'hoang_dung'] as const
        ).entries()) {
          const p = { x: d.center.x + (i ? -110 : 110), y: d.center.y - 55 };
          this.spawn(world, config, id, p).cooldown = t + config.tickRate;
          this.effect(world, c, 'summon', {
            ...p,
            targetId: id,
            expiresAt: t + config.tickRate,
          });
        }
        for (const [i, a] of (
          ['ma_anh_troc_hon', 'am_phong_hap_luc', 'doc_cot_bao'] as const
        ).entries())
          this.ready.set(a, t + (2 + i * 3) * config.tickRate);
        break;
      case 'am_phong_hap_luc':
        this.effect(world, c, 'pull', {
          radius: d.pull.range,
          expiresAt: c.endsAt,
        });
        break;
      case 'doc_cot_bao': {
        const h = world.heroes.get(c.targetId),
          p = h
            ? { x: h.x, y: h.y }
            : { x: c.x + c.fx * 150, y: c.y + c.fy * 150 };
        clampEllipse(p, d.bounds, config.radius);
        this.effect(world, c, 'pouch', {
          ...p,
          radius: d.poison.radius,
          activeAt: t + d.poison.flightTicks,
          expiresAt: t + d.poison.flightTicks + 1,
        });
        break;
      }
      case 'thanh_am_ho_tro':
        for (const id of ['dong_ta', 'mai_sieu_phong']) {
          const a = world.creeps.get(id);
          if (!a || a.hp <= 0) continue;
          const v = direction(a.x - c.x, a.y - c.y);
          this.effect(world, c, 'heal', {
            targetId: id,
            fx: v.x,
            fy: v.y,
            speed: d.heal.speed,
            length: d.heal.range,
            radius: d.heal.radius,
            expiresAt:
              t + Math.ceil((d.heal.range / d.heal.speed) * config.tickRate),
          });
        }
        break;
      case 'linh_xa_bo':
        this.ready.set('sprint_until', c.endsAt + config.tickRate);
        this.effect(world, c, 'sprint', {
          expiresAt: c.endsAt + config.tickRate,
        });
        break;
    }
  }
  private pulses(world: World, config: SimulationConfig, c: DongCast): void {
    const d = this.definition;
    if (c.abilityId === 'lac_anh_normal' && c.path) {
      const b = world.creeps.get(c.actorId)!;
      let at = world.tick - c.activeAt;
      for (let i = 0; i < c.path.length - 1; i++) {
        const duration =
          i === 0 ? d.normalDash.approachTicks : d.normalDash.segmentTicks;
        if (at <= duration || i === c.path.length - 2) {
          const from = c.path[i]!,
            to = c.path[i + 1]!,
            p = Math.max(0, Math.min(1, at / duration));
          const old = { x: b.x, y: b.y },
            target = {
              x: from.x + (to.x - from.x) * p,
              y: from.y + (to.y - from.y) * p,
            },
            v = direction(to.x - from.x, to.y - from.y);
          moveCircle(
            b,
            { x: target.x - b.x, y: target.y - b.y },
            b.stats!.radius,
            config.width,
            config.height,
            config.collision,
          );
          clampEllipse(b, d.bounds, b.stats!.radius);
          b.fx = v.x;
          b.fy = v.y;
          for (const h of world.heroes.values())
            if (
              h.hp > 0 &&
              !c.hitIds!.includes(h.id) &&
              segmentCircle(
                old,
                b,
                h,
                d.normalDash.halfWidth + config.radius,
              ) !== undefined
            ) {
              c.hitIds!.push(h.id);
              hurt(
                world,
                h,
                c.actorId,
                c.abilityId,
                d.abilities.lac_anh_normal.damage,
                config,
                { ...noCrit, fx: v.x, fy: v.y },
              );
            }
          break;
        }
        at -= duration;
      }
      return;
    }
    if (world.tick < c.nextPulse) return;
    if (c.abilityId === 'ta_kiem_lien_kich' && c.pulse < d.thrust.hits) {
      const a =
        Math.atan2(c.fy, c.fx) -
        Math.PI / 2 +
        (c.pulse * Math.PI) / (d.thrust.hits - 1);
      this.effect(world, c, 'thrust', {
        fx: Math.cos(a),
        fy: Math.sin(a),
        length: d.thrust.range,
        radius: d.thrust.halfWidth,
      });
      c.pulse++;
      c.nextPulse += Math.max(
        1,
        Math.floor(
          this.definition.abilities[c.abilityId].duration / d.thrust.hits,
        ),
      );
    } else if (c.abilityId === 'bach_cot_trao' && c.pulse < 2) {
      this.effect(world, c, 'claw', {
        length: d.claws.range,
        radius: d.claws.halfWidth,
        targetId: String(c.pulse),
      });
      c.pulse++;
      c.nextPulse += d.claws.gapTicks;
    } else if (c.abilityId === 'ma_anh_troc_hon' && c.pulse < 5) {
      const v = { x: c.fx, y: c.fy };
      this.effect(world, c, 'claw', {
        fx: v.x,
        fy: v.y,
        speed: d.claws.speed,
        length: 500,
        radius: d.claws.radius,
        expiresAt: world.tick + config.tickRate,
      });
      c.pulse++;
      c.nextPulse += Math.max(
        1,
        Math.floor(this.definition.abilities[c.abilityId].duration / 5),
      );
    }
  }
  private stepEffects(world: World, config: SimulationConfig): void {
    const d = this.definition;
    for (const e of [...this.effects]) {
      const owner = world.creeps.get(e.ownerId);
      if (!owner || owner.hp <= 0) {
        e.expiresAt = world.tick;
        continue;
      }
      if (world.tick < e.activeAt) continue;
      if (world.tick >= e.expiresAt) continue;
      const from = { x: e.x, y: e.y };
      if (e.speed) {
        const n = Math.min(e.length, e.speed / config.tickRate);
        e.x += e.fx * n;
        e.y += e.fy * n;
        e.length -= n;
        if (e.length <= 0) e.expiresAt = Math.min(e.expiresAt, world.tick + 1);
        if (
          config.collision.some(
            (w) => segmentRect(from, e, w, e.radius) !== undefined,
          )
        ) {
          e.expiresAt = world.tick;
          continue;
        }
      }
      if (e.kind === 'heal') {
        const target = world.creeps.get(e.targetId);
        if (
          target &&
          target.hp > 0 &&
          segmentCircle(
            from,
            e,
            target,
            d.heal.radius + (target.stats?.radius ?? 12),
          ) !== undefined
        ) {
          const amount = Math.min(d.heal.amount, target.maxHp - target.hp);
          target.hp += amount;
          e.expiresAt = world.tick;
          emit(world, {
            kind: 'pulse',
            sourceId: e.ownerId,
            targetId: target.id,
            abilityId: e.abilityId,
            x: target.x,
            y: target.y,
            damage: 0,
            critical: false,
            stage: 'heal',
          });
        }
        continue;
      }
      if (e.kind === 'pouch') {
        this.effect(world, { ...e, actorId: e.ownerId }, 'poison', {
          x: e.x,
          y: e.y,
          origin: { x: e.x, y: e.y },
          damage: e.damage,
          radius: d.poison.radius,
          expiresAt: world.tick + d.poison.poolTicks,
        });
        e.expiresAt = world.tick;
        continue;
      }
      for (const hero of world.heroes.values()) {
        if (hero.hp <= 0) continue;
        if (e.kind === 'pull') {
          if (hero.id === e.targetId && distance(hero, e) < e.radius) {
            applyStatus(
              hero,
              {
                kind: 'dash_lock',
                magnitude: 1,
                durationTicks: e.startedAt + d.pull.lockTicks - world.tick,
              },
              e.ownerId,
              e.abilityId,
              world.tick,
            );
            world.actions = (world.actions ?? []).filter(
              (a) => a.ownerId !== hero.id || a.abilityId !== 'universal_dash',
            );
            const v = direction(e.x - hero.x, e.y - hero.y);
            const amount = Math.min(
              Math.max(0, distance(hero, e) - d.pull.stopDistance),
              Math.max(
                d.pull.speed / config.tickRate,
                (distance(hero, e) - d.pull.stopDistance) /
                  Math.max(1, e.expiresAt - world.tick),
              ),
            );
            displace(
              hero,
              v.x * amount,
              v.y * amount,
              config.radius,
              config,
              world.tick,
            );
          }
          continue;
        }
        if (e.kind === 'summon' || e.kind === 'sprint') continue;
        if (e.kind !== 'poison' && e.hits.includes(hero.id)) continue;
        if (e.kind === 'poison' && world.tick < e.nextTick) continue;
        let contact = false;
        const dx = hero.x - e.x,
          dy = hero.y - e.y,
          forward = dx * e.fx + dy * e.fy,
          side = Math.abs(dx * e.fy - dy * e.fx);
        if (e.kind === 'thrust')
          contact =
            forward >= 0 &&
            forward <= e.length + config.radius &&
            side <= e.radius + config.radius;
        else if (e.kind === 'claw' && !e.speed)
          contact =
            forward > 0 &&
            forward <= e.length + config.radius &&
            side <= e.radius + config.radius;
        else if (e.kind === 'fan')
          contact =
            distance(hero, e) <= e.length + config.radius &&
            forward > 0 &&
            forward / Math.max(1, distance(hero, e)) >= Math.cos(e.radius);
        else if (e.kind === 'petal' || e.kind === 'poison')
          contact = distance(hero, e) <= e.radius + config.radius;
        else
          contact =
            segmentCircle(from, e, hero, e.radius + config.radius) !==
            undefined;
        if (
          contact &&
          !config.collision.some(
            (w) => segmentRect(e.origin, hero, w) !== undefined,
          )
        ) {
          hurt(world, hero, e.ownerId, e.abilityId, e.damage, config, {
            ...noCrit,
            fx: e.fx,
            fy: e.fy,
            periodic: e.kind === 'poison',
          });
          e.hits.push(hero.id);
        }
      }
      if (e.kind === 'poison' && world.tick >= e.nextTick)
        e.nextTick = world.tick + d.poison.intervalTicks;
    }
    this.effects = this.effects.filter((e) => e.expiresAt > world.tick);
  }
  view(world: World): DongView {
    const boss = world.creeps.get(bossId);
    return {
      kind: 'dong_ta',
      phase: this.phase,
      tick: world.tick,
      attempt: this.attempt,
      phaseUntil: this.phaseUntil,
      locked: this.locked,
      summoned: this.summoned,
      bounds: this.definition.bounds,
      targetId: this.targetId,
      bossHp: boss?.hp ?? 0,
      bossMaxHp: boss?.maxHp ?? 0,
      casts: this.casts.map((c) => ({ ...c })),
      effects: this.effects.map(
        ({ hits: _, damage: __, nextTick: ___, ...e }) => ({ ...e }),
      ),
    };
  }
}
