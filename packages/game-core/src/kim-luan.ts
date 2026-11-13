import { grantCraftMaterial } from './economy.js';
import { announceBossSkill } from './boss-skill-announcement.js';
import { addCreep } from './simulation.js';
import { hurt, emit } from './combat.js';
import { applyStatus, displace, hasStatus } from './status.js';
import { direction, distance, segmentCircle, segmentRect } from './geometry.js';
import { gainExperience } from './progression.js';
import { chuLootAction, settleBossLoot } from './chu-ba-thong.js';
import type {
  Creep,
  Hero,
  Point,
  Rect,
  SimulationConfig,
  World,
} from './types.js';
import type {
  KimAbility,
  KimCast,
  KimDefinition,
  KimEffect,
  KimLootContext,
  KimView,
} from './kim-types.js';
const crit = { critChance: 0, critMultiplier: 1 };
const actorIds = ['hoac_do', 'dat_nhi_ba', 'kim_luan_phap_vuong'] as const;
const sequences: Record<string, KimAbility[]> = {
  hoac_do: [
    'thiet_phien_lien_hoan',
    'cuong_phong_tan_loi_cong',
    'phien_trung_doc_dinh',
    'cuong_phong_van_nhan',
  ],
  dat_nhi_ba: [
    'dat_sweep',
    'dai_luc_pha_son',
    'bat_dong_kim_cang',
    'dai_luc_pha_son_boulder',
    'hang_ma_tam_lien_chan',
  ],
  kim_luan_phap_vuong: [
    'kim_sweep',
    'kim_luan_truy_hon',
    'kim_hand_chop',
    'ngu_luan_ho_the',
    'kim_sweep',
    'ngu_luan_phong_toa',
    'kim_hand_chop',
    'long_tuong_chan_thien',
    'long_tuong_bat_nha_cong',
  ],
};
/** All trajectories, gate transitions, hits and RNG live in this deterministic adapter. */
export class KimLuanEncounter {
  generation = 0;
  phase: KimView['phase'] = 'disciples';
  enraged = false;
  wardId = 'dat_nhi_ba';
  effects = new Map<string, KimEffect>();
  casts = new Map<string, KimCast>();
  rewards: KimLootContext;
  respawnAt = 0;
  emptySince: number | undefined;
  resetCount = 0;
  private next = new Map<string, number>();
  private cooldowns = new Map<string, number>();
  private order = new Map<string, number>();
  private poison = new Map<string, number>();
  private previous = new Map<string, Point>();
  private elephantCast = 0;
  private nextEnrageShot = 0;
  private nextEnrageHerd = 0;
  cageTarget = '';
  private cageUntil = 0;
  private cageSoloUntil = 0;
  private cageOrigin: Point = { x: 0, y: 0 };
  constructor(readonly definition: KimDefinition) {
    this.rewards = { definition, loot: [], kill: 0 };
  }
  ticks(s: number, c: SimulationConfig) {
    return Math.max(1, Math.round(s * c.tickRate));
  }
  initialize(w: World, c: SimulationConfig) {
    this.generation++;
    this.clear(w);
    w.creeps.clear();
    w.projectiles.clear();
    w.actions = [];
    w.areas = [];
    w.shots = [];
    this.phase = 'disciples';
    this.enraged = false;
    this.respawnAt = 0;
    this.emptySince = undefined;
    this.order.clear();
    this.next.clear();
    this.cooldowns.clear();
    this.elephantCast = 0;
    this.wardId = 'dat_nhi_ba';
    this.spawn(w, c, 'hoac_do');
    this.spawn(w, c, 'dat_nhi_ba');
    this.ward(w, c);
    w.kim = this;
  }
  private spawn(w: World, c: SimulationConfig, id: (typeof actorIds)[number]) {
    const d = this.definition.actors[id],
      b = addCreep(w, id, d, c);
    Object.assign(b, {
      archetypeId: id,
      bossEncounter: true,
      controlled: true,
      forcedMovementImmune: true,
      hp: d.hp,
      maxHp: d.hp,
      fx: 0,
      fy: 1,
    });
    b.stats = {
      ...c.creep,
      hp: d.hp,
      defense: d.defense,
      speed: d.speed,
      radius: 20,
      xp: 0,
      gold: 0,
    };
    this.next.set(id, w.tick + this.ticks(id === 'hoac_do' ? 1.2 : 2, c));
    return b;
  }
  clear(w: World) {
    this.effects.clear();
    this.casts.clear();
    this.poison.clear();
    this.previous.clear();
    this.releaseCage(w);
    for (const b of w.creeps.values()) {
      b.statuses = (b.statuses ?? []).filter(
        (s) => s.abilityId !== 'bat_dong_kim_cang',
      );
      b.castAbilityId = '';
      delete b.encounterAction;
    }
    for (const h of w.heroes.values())
      h.statuses = (h.statuses ?? []).filter(
        (s) => !actorIds.includes(s.sourceId as (typeof actorIds)[number]),
      );
  }

  rockCollision(tick: number): Rect[] {
    return [...this.effects.values()]
      .filter(
        (e) => e.kind === 'rock' && e.activeAt <= tick && tick < e.expiresAt,
      )
      .map((e) => this.rockFootprint(e));
  }

  private rockFootprint(p: Point): Rect {
    const { rockHalfWidth, rockHalfDepth } = this.definition.elephants;
    return {
      x: p.x - rockHalfWidth,
      y: p.y - rockHalfDepth,
      width: rockHalfWidth * 2,
      height: rockHalfDepth * 2,
    };
  }
  emptyStep(w: World, c: SimulationConfig, matchTick: number) {
    this.emptySince ??= matchTick;
    this.clear(w);
    for (const l of this.rewards.loot)
      if (l.state === 'rolling') l.state = 'ground';
    // Empty deadline uses match time. A defeated instance has its own deadline in the match adapter.
    if (
      this.phase !== 'defeated' &&
      matchTick - this.emptySince >= this.definition.emptyResetTicks
    ) {
      this.initialize(w, c);
      this.resetCount++;
      this.emptySince = matchTick;
    }
  }
  private ward(w: World, c: SimulationConfig) {
    const living = ['dat_nhi_ba', 'hoac_do'].filter(
      (id) => (w.creeps.get(id)?.hp ?? 0) > 0,
    );
    this.wardId =
      living.length === 2
        ? living[
            Math.floor(w.tick / this.ticks(this.definition.wardSeconds, c)) % 2
          ]!
        : (living[0] ?? '');
    for (const id of ['hoac_do', 'dat_nhi_ba']) {
      const a = w.creeps.get(id);
      if (!a) continue;
      a.statuses = (a.statuses ?? []).filter(
        (s) => s.abilityId !== 'bat_dong_kim_cang',
      );
      if (id === this.wardId)
        applyStatus(
          a,
          {
            kind: 'damage_reduction',
            magnitude: this.definition.wardReduction,
            durationTicks: 2,
          },
          'dat_nhi_ba',
          'bat_dong_kim_cang',
          w.tick,
        );
    }
  }
  step(w: World, c: SimulationConfig) {
    this.emptySince = undefined;
    settleBossLoot(w);
    const d = this.definition;
    if (this.phase === 'disciples') {
      this.ward(w, c);
      for (const id of ['hoac_do', 'dat_nhi_ba'])
        if ((w.creeps.get(id)?.hp ?? 0) <= 0) this.cancelActor(w, id);
      if (
        ['hoac_do', 'dat_nhi_ba'].every(
          (id) => (w.creeps.get(id)?.hp ?? 1) <= 0,
        )
      ) {
        this.clear(w);
        this.phase = 'boss';
        this.wardId = '';
        this.spawn(w, c, 'kim_luan_phap_vuong');
      }
    }
    const boss = w.creeps.get('kim_luan_phap_vuong');
    if (this.phase === 'boss' && boss && boss.hp <= 0) {
      this.finish(w, c, boss);
      return;
    }
    if (this.phase === 'defeated') return;
    const rocks = this.rockCollision(w.tick);
    const movement = rocks.length
      ? { ...c, collision: [...c.collision, ...rocks] }
      : c;
    const heroes = [...w.heroes.values()]
      .filter((h) => h.hp > 0)
      .sort((a, b) => a.id.localeCompare(b.id));
    if (!heroes.length) {
      this.clear(w);
      return;
    }
    if (
      boss &&
      boss.hp > 0 &&
      !this.enraged &&
      boss.hp / boss.maxHp < d.enrage.threshold
    ) {
      this.enraged = true;
      this.nextEnrageShot = w.tick + this.ticks(0.55, c);
      this.nextEnrageHerd = w.tick;
      // The enrage director owns herds; do not leave a second normal director alive.
      this.casts.delete(boss.id);
      for (const [id, e] of this.effects)
        if (e.ownerId === boss.id) this.effects.delete(id);
      this.releaseCage(w);
    }
    for (const id of actorIds) {
      const b = w.creeps.get(id);
      if (!b || b.hp <= 0) continue;
      const target = heroes
        .slice()
        .sort(
          (a, z) => distance(b, a) - distance(b, z) || a.id.localeCompare(z.id),
        )[0]!;
      const cast = this.casts.get(id);
      if (this.enraged && id === boss?.id) {
        this.move(w, movement, b, target, true);
        if (w.tick >= this.nextEnrageShot) {
          const aim = direction(target.x - b.x, target.y - b.y),
            cast = this.newCast(w, c, b, 'kim_sweep', target, 0, 0.55);
          cast.fx = aim.x;
          cast.fy = aim.y;
          this.fan(w, c, cast, 5, 0.34, d.enrage.wheelSpeed, 2, 11);
          this.nextEnrageShot += this.ticks(d.enrage.interval, c);
        }
        if (w.tick >= this.nextEnrageHerd) {
          this.begin(w, c, id, 'long_tuong_bat_nha_thap_tang', target);
          this.nextEnrageHerd = w.tick + this.ticks(12, c);
        }
      } else {
        if (
          !cast &&
          w.tick >= (this.next.get(id) ?? 0) &&
          !hasStatus(b, 'stun', w.tick)
        ) {
          const list = sequences[id]!;
          for (let i = 0; i < list.length; i++) {
            const n = this.order.get(id) ?? 0,
              ability = list[n % list.length]!;
            this.order.set(id, n + 1);
            if (w.tick < (this.cooldowns.get(`${id}:${ability}`) ?? 0))
              continue;
            if (ability === 'dat_sweep' && distance(b, target) > 230) continue;
            this.begin(w, c, id, ability, target);
            break;
          }
        }
        if (!cast || id === 'hoac_do') this.move(w, movement, b, target, false);
      }
    }
    for (const cast of [...this.casts.values()]) {
      if (w.tick >= cast.activeAt) this.release(w, c, cast);
      if (w.tick >= cast.endsAt) {
        this.casts.delete(cast.actorId);
        const b = w.creeps.get(cast.actorId);
        if (b) {
          b.castAbilityId = '';
          delete b.encounterAction;
        }
        this.next.set(
          cast.actorId,
          Math.max(
            this.next.get(cast.actorId) ?? 0,
            w.tick + this.ticks(d.actionRestSeconds, c),
          ),
        );
      }
    }
    this.stepEffects(w, c);
    this.constrainCage(w, c);
    for (const h of w.heroes.values())
      this.previous.set(h.id, { x: h.x, y: h.y });
  }
  private move(
    w: World,
    c: SimulationConfig,
    b: Creep,
    target: Hero,
    enrage: boolean,
  ) {
    if (hasStatus(b, 'stun', w.tick)) return;
    let aim: Point;
    if (b.id === 'hoac_do') {
      const angle = (w.tick / c.tickRate) * 1.7;
      const p = {
        x: target.x + Math.cos(angle) * 230,
        y: Math.max(
          this.definition.bounds.y + 20,
          Math.min(
            this.definition.bounds.y + this.definition.bounds.height - 50,
            target.y + Math.sin(angle) * 150,
          ),
        ),
      };
      aim = direction(p.x - b.x, p.y - b.y);
    } else if (b.id === 'dat_nhi_ba') {
      const hoac = w.creeps.get('hoac_do');
      const p =
        hoac && hoac.hp > 0
          ? { x: (hoac.x + target.x) / 2, y: (hoac.y + target.y) / 2 }
          : target;
      aim = direction(p.x - b.x, p.y - b.y);
    } else aim = direction(target.x - b.x, target.y - b.y);
    const before = { x: b.x, y: b.y },
      speed =
        this.definition.actors[b.id as (typeof actorIds)[number]].speed *
        (enrage ? this.definition.enrage.speedMultiplier : 1);
    displace(
      b,
      (aim.x * speed) / c.tickRate,
      (aim.y * speed) / c.tickRate,
      20,
      c,
    );
    b.fx = aim.x;
    b.fy = aim.y;
    b.pose = distance(before, b) > 0.01 ? 'walk' : 'idle';
  }
  /** Test/service entry point. There is deliberately no corresponding client command. */
  begin(
    w: World,
    c: SimulationConfig,
    actorId: string,
    abilityId: KimAbility,
    target: Point & { id?: string },
  ) {
    const b = w.creeps.get(actorId);
    if (!b || b.hp <= 0 || this.casts.has(actorId)) return;
    const p = this.definition.abilities[abilityId],
      cast = this.newCast(w, c, b, abilityId, target, p.warning, p.duration);
    this.casts.set(actorId, cast);
    this.cooldowns.set(
      `${actorId}:${abilityId}`,
      w.tick + this.ticks(p.cooldown, c),
    );
    this.next.set(
      actorId,
      cast.endsAt + this.ticks(this.definition.actionRestSeconds, c),
    );
    announceBossSkill(w, actorId, abilityId);
    emit(w, {
      kind: 'cast',
      sourceId: actorId,
      targetId: cast.targetId,
      abilityId,
      x: cast.origin.x,
      y: cast.origin.y,
      fx: cast.fx,
      fy: cast.fy,
      damage: 0,
      critical: false,
      stage: 'windup',
    });
    b.castAbilityId = abilityId;
    b.encounterAction = {
      startedAt: cast.startedAt,
      activeAt: cast.activeAt,
      endsAt: cast.endsAt,
    };
    b.pose = 'cast';
    // Warning geometry is the actual future footprint, at the captured ground origin.
    if (
      [
        'dai_luc_pha_son',
        'dat_sweep',
        'long_tuong_chan_thien',
        'hang_ma_tam_lien_chan',
      ].includes(abilityId)
    ) {
      const kind =
        abilityId === 'dai_luc_pha_son'
          ? 'line'
          : abilityId === 'dat_sweep'
            ? 'arc'
            : 'ring';
      const e = this.effect(
        w,
        c,
        cast,
        kind,
        cast.origin,
        p.warning,
        p.duration,
      );
      e.radius =
        abilityId === 'long_tuong_chan_thien'
          ? this.definition.stomp.radius
          : abilityId === 'dat_sweep'
            ? 210
            : 100;
      e.length = 650;
      e.damage = 0;
      e.expiresAt = cast.activeAt;
    }
  }
  private newCast(
    w: World,
    c: SimulationConfig,
    b: Creep,
    id: KimAbility,
    target: Point & { id?: string },
    warning: number,
    duration: number,
  ): KimCast {
    const aim = direction(target.x - b.x, target.y - b.y);
    return {
      id: 'kl_cast_' + w.nextId++,
      actorId: b.id,
      abilityId: id,
      startedAt: w.tick,
      activeAt: w.tick + Math.round(warning * c.tickRate),
      endsAt: w.tick + Math.round((warning + duration) * c.tickRate),
      origin: { x: b.x, y: b.y },
      fx: aim.x || (!aim.y ? 1 : 0),
      fy: aim.y,
      next: 0,
      pulse: 0,
      targetId: target.id ?? '',
    };
  }
  private effect(
    w: World,
    c: SimulationConfig,
    cast: KimCast,
    kind: KimEffect['kind'],
    p: Point,
    delay = 0,
    seconds = 2,
  ): KimEffect {
    const e: KimEffect = {
      id: 'kl_fx_' + w.nextId++,
      castId: cast.id,
      ownerId: cast.actorId,
      abilityId: cast.abilityId,
      kind,
      x: p.x,
      y: p.y,
      startedAt: w.tick,
      activeAt: w.tick + Math.round(delay * c.tickRate),
      expiresAt: w.tick + Math.round((delay + seconds) * c.tickRate),
      fx: cast.fx,
      fy: cast.fy,
      speed: 0,
      radius: 12,
      length: 0,
      damage: this.definition.abilities[cast.abilityId].damage,
      hits: {},
    };
    this.effects.set(e.id, e);
    return e;
  }
  private fan(
    w: World,
    c: SimulationConfig,
    cast: KimCast,
    count: number,
    step: number,
    speed: number,
    life: number,
    radius: number,
    offset = 0,
    radial = false,
  ) {
    for (let i = 0; i < count; i++) {
      const angle =
        Math.atan2(cast.fy, cast.fx) +
        offset +
        (radial ? i * step : (i - (count - 1) / 2) * step);
      const e = this.effect(w, c, cast, 'shot', cast.origin, 0, life);
      e.fx = Math.cos(angle);
      e.fy = Math.sin(angle);
      e.speed = speed;
      e.radius = radius;
      e.poison = cast.abilityId === 'phien_trung_doc_dinh';
      if (cast.abilityId === 'thiet_phien_lien_hoan')
        e.length = this.definition.triple.halfWidth;
      if (cast.abilityId === 'kim_luan_truy_hon') e.bounce = true;
    }
  }
  private release(w: World, c: SimulationConfig, k: KimCast) {
    if (w.tick < k.next) return;
    const d = this.definition,
      age = (w.tick - k.activeAt) / c.tickRate,
      b = w.creeps.get(k.actorId)!;
    const once = () => {
      k.next = Number.MAX_SAFE_INTEGER;
      k.pulse++;
    };
    switch (k.abilityId) {
      case 'thiet_phien_lien_hoan':
        if (k.pulse < 3) {
          this.fan(
            w,
            c,
            k,
            d.triple.rays,
            Math.PI / 2,
            d.triple.speed,
            d.triple.lifetime,
            d.triple.radius,
            (k.pulse * Math.PI) / 18 +
              ((this.order.get(b.id) ?? 0) * Math.PI) / 6,
            true,
          );
          k.pulse++;
          k.next = k.activeAt + this.ticks(k.pulse * d.triple.gap, c);
        }
        break;
      case 'cuong_phong_tan_loi_cong':
        this.fan(
          w,
          c,
          k,
          d.gust.rays,
          d.gust.spread / (d.gust.rays - 1),
          d.gust.speed,
          3.7,
          d.gust.radius,
        );
        once();
        break;
      case 'phien_trung_doc_dinh':
        for (const offset of [0, Math.PI])
          this.fan(
            w,
            c,
            k,
            5,
            Math.PI / 5,
            d.nails.speed,
            2.2,
            d.nails.radius,
            offset,
          );
        once();
        break;
      case 'cuong_phong_van_nhan':
        if (age < 3) {
          this.fan(
            w,
            c,
            { ...k, origin: { x: b.x, y: b.y } },
            8,
            Math.PI / 4,
            d.nails.speed,
            1.8,
            d.nails.radius,
            k.pulse * 0.22,
            true,
          );
          k.pulse++;
          k.next = w.tick + this.ticks(0.3, c);
        }
        break;
      case 'dat_sweep': {
        const e = this.effect(w, c, k, 'arc', k.origin, 0, 0.2);
        e.radius = 210;
        once();
        break;
      }
      case 'dai_luc_pha_son': {
        const e = this.effect(w, c, k, 'line', k.origin, 0.5, 0.25);
        e.radius = 24;
        e.length = 650;
        once();
        break;
      }
      case 'bat_dong_kim_cang':
        once();
        break;
      case 'dai_luc_pha_son_boulder':
        this.fan(w, c, k, 1, 0, 720, 2, 24);
        once();
        break;
      case 'hang_ma_tam_lien_chan':
        if (k.pulse < 3) {
          const e = this.effect(w, c, k, 'ring', k.origin, 0, 0.75);
          e.radius = 0;
          e.maxRadius = [100, 190, 330][k.pulse]!;
          e.speed = 600;
          k.pulse++;
          k.next = k.activeAt + this.ticks(k.pulse * 0.75, c);
        }
        break;
      case 'kim_sweep':
        this.fan(w, c, k, 5, 0.34, d.basicWheelSpeed, 2, 15);
        once();
        break;
      case 'kim_hand_chop':
        this.fan(
          w,
          c,
          k,
          1,
          0,
          d.crescent.speed,
          d.crescent.lifetime,
          d.crescent.radius,
        );
        once();
        break;
      case 'kim_luan_truy_hon':
        this.fan(
          w,
          c,
          k,
          d.wheelCount,
          (Math.PI * 2) / d.wheelCount,
          260,
          20,
          13,
          0,
          true,
        );
        once();
        break;
      case 'ngu_luan_ho_the':
        for (let i = 0; i < d.wheelCount; i++) {
          const angle = (i * Math.PI * 2) / d.wheelCount,
            e = this.effect(
              w,
              c,
              k,
              'orbit',
              {
                x: k.origin.x + Math.cos(angle) * d.orbit.radius,
                y: k.origin.y + Math.sin(angle) * d.orbit.radius,
              },
              0,
              d.orbit.seconds + 2,
            );
          e.index = i;
          e.radius = 15;
        }
        once();
        break;
      case 'ngu_luan_phong_toa': {
        const h = w.heroes.get(k.targetId);
        if (h && h.hp > 0) {
          this.releaseCage(w);
          this.cageTarget = h.id;
          this.cageOrigin = { x: h.x, y: h.y };
          this.cageUntil = w.tick + this.ticks(d.cageSeconds, c);
          this.cageSoloUntil =
            [...w.heroes.values()].filter((h) => h.hp > 0).length === 1
              ? w.tick + this.ticks(d.soloReleaseSeconds, c)
              : this.cageUntil;
          const cage = addCreep(w, 'kim_cage', { x: h.x, y: h.y }, c);
          Object.assign(cage, {
            hp: d.cageHp,
            maxHp: d.cageHp,
            controlled: true,
            bossEncounter: true,
            archetypeId: 'kim_cage',
            forcedMovementImmune: true,
            rescueTargetId: h.id,
          });
          cage.stats = {
            ...c.creep,
            defense: 0,
            radius: 32,
            speed: 0,
            xp: 0,
            gold: 0,
          };
          this.effect(w, c, k, 'cage', h, 0, d.cageSeconds);
          const aim = direction(h.x - k.origin.x, h.y - k.origin.y),
            e = this.effect(w, c, k, 'line', k.origin, d.cageSeconds, 0.3);
          e.fx = aim.x;
          e.fy = aim.y;
          e.length = 1200;
          e.radius = 38;
        }
        once();
        break;
      }
      case 'long_tuong_chan_thien':
        if (k.pulse < 3) {
          const e = this.effect(
            w,
            c,
            k,
            'ring',
            k.origin,
            0,
            d.stomp.radius / d.stomp.speed + 0.25,
          );
          e.radius = 0;
          e.speed = d.stomp.speed;
          e.maxRadius = d.stomp.radius;
          k.pulse++;
          k.next = k.activeAt + this.ticks(k.pulse * d.stomp.gap, c);
        }
        break;
      case 'long_tuong_bat_nha_cong':
      case 'long_tuong_bat_nha_thap_tang':
        this.herd(w, c, k);
        once();
        break;
    }
  }
  private herd(w: World, c: SimulationConfig, k: KimCast) {
    const d = this.definition.elephants,
      p = this.enraged ? d.enrage : d.normal,
      castIndex = this.elephantCast++;
    const bounds = this.definition.bounds;
    const rocks: Point[] = [];
    const actors = [...w.heroes.values(), ...w.creeps.values()].filter(
      (actor) => actor.hp > 0,
    );
    const walls = [...c.collision, ...this.rockCollision(w.tick)];
    for (let i = 0; i < d.rocks; i++) {
      const center = bounds.x + ((90 + i * 195) * bounds.width) / 980;
      const roll = {
        x: center + ((w.random() - 0.5) * 75 * bounds.width) / 980,
        y: bounds.y + ((50 + w.random() * 225) * bounds.height) / 400,
      };
      const fallbacks = [0.16, 0.48, 0.77].map((ratio) => ({
        x: center,
        y: bounds.y + bounds.height * ratio,
      }));
      const rock = [roll, ...fallbacks].find((p) => {
        const footprint = this.rockFootprint(p);
        const { rockHalfWidth, rockHalfDepth } = d;
        return (
          !walls.some(
            (r) =>
              p.x + rockHalfWidth > r.x &&
              p.x - rockHalfWidth < r.x + r.width &&
              p.y + rockHalfDepth > r.y &&
              p.y - rockHalfDepth < r.y + r.height,
          ) &&
          !actors.some(
            (actor) =>
              segmentRect(actor, actor, footprint, Math.max(c.radius, 20)) !==
              undefined,
          )
        );
      });
      if (rock) {
        rocks.push(rock);
        walls.push(this.rockFootprint(rock));
      }
    }
    const duration =
      p.warning +
      2 * p.volleyGap +
      (p.rows - 1) * p.rowGap +
      (d.bottom - d.top) / d.speed +
      0.7;
    for (const r of rocks) {
      const e = this.effect(w, c, k, 'rock', r, 0, duration);
      e.radius = d.rockHalfWidth;
    }
    const lanes = Array.from(
      { length: p.lanes },
      (_, i) =>
        bounds.x +
        ((10 + (i * 960) / (p.lanes - 1) + (w.random() - 0.5) * 14) *
          bounds.width) /
          980,
    );
    for (let volley = 0; volley < 3; volley++)
      for (let row = 0; row < p.rows; row++)
        for (const x of lanes) {
          const down = (castIndex * 3 + volley) % 2 === 0,
            delay = p.warning + volley * p.volleyGap + row * p.rowGap;
          const e = this.effect(
            w,
            c,
            k,
            'elephant',
            { x, y: down ? d.top : d.bottom },
            delay,
            (d.bottom - d.top) / d.speed,
          );
          e.fx = 0;
          e.fy = down ? 1 : -1;
          e.speed = d.speed;
          e.radius = d.halfWidth;
          const rock = rocks
            .filter((r) => Math.abs(r.x - x) < d.rockHalfWidth)
            .sort((a, b) => (down ? a.y - b.y : b.y - a.y))[0];
          e.length = rock
            ? rock.y - (down ? d.rockHalfDepth : -d.rockHalfDepth)
            : down
              ? d.bottom
              : d.top;
        }
  }
  private stepEffects(w: World, c: SimulationConfig) {
    const d = this.definition,
      dt = 1 / c.tickRate;
    for (const [id, e] of this.effects) {
      if (w.tick >= e.expiresAt) {
        this.effects.delete(id);
        continue;
      }
      if (
        w.tick < e.activeAt ||
        e.kind === 'rock' ||
        e.kind === 'cage' ||
        e.damage === 0
      )
        continue;
      const old = { x: e.x, y: e.y };
      let blockedAt: number | undefined;
      if (e.kind === 'orbit') {
        const b = w.creeps.get(e.ownerId);
        if (!b || b.hp <= 0) {
          this.effects.delete(id);
          continue;
        }
        const age = (w.tick - e.activeAt) * dt,
          a =
            age * d.orbit.angularSpeed +
            ((e.index ?? 0) * Math.PI * 2) / d.wheelCount;
        if (age < d.orbit.seconds) {
          e.x = b.x + Math.cos(a) * d.orbit.radius;
          e.y = b.y + Math.sin(a) * d.orbit.radius;
        } else {
          e.kind = 'shot';
          e.fx = Math.cos(a);
          e.fy = Math.sin(a);
          e.speed = d.orbit.releaseSpeed;
        }
      } else if (e.kind === 'shot' || e.kind === 'elephant') {
        e.x += e.fx * e.speed * dt;
        e.y += e.fy * e.speed * dt;
        if (e.kind === 'elephant') {
          if ((e.fy > 0 && e.y >= e.length) || (e.fy < 0 && e.y <= e.length)) {
            e.y = e.length;
            blockedAt = 1;
          }
        } else if (e.bounce) {
          const b = d.bounds;
          if (e.x < b.x || e.x > b.x + b.width) {
            e.x = Math.max(b.x, Math.min(b.x + b.width, e.x));
            e.fx *= -1;
          }
          if (e.y < b.y || e.y > b.y + b.height) {
            e.y = Math.max(b.y, Math.min(b.y + b.height, e.y));
            e.fy *= -1;
          }
        } else {
          const walls = c.collision
            .map((r) => segmentRect(old, e, r, e.radius))
            .filter((v): v is number => v !== undefined);
          blockedAt = walls.length ? Math.min(...walls) : undefined;
        }
      } else if (e.kind === 'ring') {
        e.previousRadius = e.radius;
        e.radius = Math.min(e.maxRadius ?? e.radius, e.radius + e.speed * dt);
      }
      for (const h of w.heroes.values()) {
        if (h.hp <= 0) continue;
        const cadence =
          e.bounce || e.kind === 'orbit'
            ? this.ticks(0.65, c)
            : Number.MAX_SAFE_INTEGER;
        if (e.hits[h.id] !== undefined && w.tick - e.hits[h.id]! < cadence)
          continue;
        const prev = this.previous.get(h.id) ?? h;
        let contact = false;
        if (e.kind === 'shot' || e.kind === 'elephant' || e.kind === 'orbit') {
          // Relative sweep accounts for both moving hero and moving hazard.
          let t = segmentCircle(
            { x: old.x - prev.x + h.x, y: old.y - prev.y + h.y },
            e,
            h,
            e.radius + c.radius,
          );
          if (e.abilityId === 'thiet_phien_lien_hoan') {
            const local = (p: Point, hero: Point) => ({
              x: (p.x - hero.x) * e.fx + (p.y - hero.y) * e.fy,
              y: -(p.x - hero.x) * e.fy + (p.y - hero.y) * e.fx,
            });
            t = segmentRect(local(old, prev), local(e, h), {
              x: -e.radius - c.radius,
              y: -e.length - c.radius,
              width: 2 * (e.radius + c.radius),
              height: 2 * (e.length + c.radius),
            });
          }
          contact =
            t !== undefined && (blockedAt === undefined || t <= blockedAt);
          if (
            e.kind === 'elephant' &&
            e.length !== (e.fy > 0 ? d.elephants.bottom : d.elephants.top)
          )
            contact = contact && (e.fy > 0 ? h.y <= e.length : h.y >= e.length);
        } else if (e.kind === 'line') {
          const end = { x: e.x + e.fx * e.length, y: e.y + e.fy * e.length };
          contact = segmentCircle(e, end, h, e.radius + c.radius) !== undefined;
        } else if (e.kind === 'arc') {
          contact =
            distance(e, h) <= e.radius + c.radius &&
            (h.x - e.x) * e.fx + (h.y - e.y) * e.fy >= -c.radius;
        } else if (e.kind === 'ring')
          contact = kimRingContact(
            e,
            prev,
            h,
            c.radius,
            d.stomp.ellipseY,
            d.stomp.thickness,
          );
        if (!contact) continue;
        e.hits[h.id] = w.tick;
        const key = e.castId + ':' + h.id,
          poisonCount = (this.poison.get(key) ?? 0) + 1;
        const raw = e.poison
          ? poisonCount >= 5
            ? 1e12
            : e.damage * poisonCount
          : e.damage;
        const hp = h.hp,
          valid = hurt(w, h, e.ownerId, e.abilityId, raw, c, crit);
        // Only actual HP loss counts: immunity/evade/full shields never advance lethal stacks.
        if (e.poison && valid && h.hp < hp) this.poison.set(key, poisonCount);
        if (valid && h.hp > 0) {
          if (h.hp < hp)
            for (const status of d.abilities[e.abilityId].statuses ?? [])
              applyStatus(h, status, e.ownerId, e.abilityId, w.tick);
          if (e.abilityId === 'cuong_phong_tan_loi_cong') {
            applyStatus(
              h,
              {
                kind: 'slow',
                magnitude: d.slowFraction,
                durationTicks: this.ticks(d.slowSeconds, c),
              },
              e.ownerId,
              e.abilityId,
              w.tick,
            );
            displace(h, e.fx * d.knockback, e.fy * d.knockback, c.radius, c);
          }
          if (
            e.kind === 'elephant' ||
            (e.kind === 'ring' && e.ownerId !== 'dat_nhi_ba')
          )
            applyStatus(
              h,
              {
                kind: 'stun',
                magnitude: 1,
                durationTicks: this.ticks(
                  e.kind === 'elephant'
                    ? d.elephants.stunSeconds
                    : d.stunSeconds,
                  c,
                ),
              },
              e.ownerId,
              e.abilityId,
              w.tick,
            );
        }
      }
      if (blockedAt !== undefined) this.effects.delete(id);
    }
    // Poison stacks have cast scope; prune once the last projectile of that cast expires.
    const active = new Set([...this.effects.values()].map((e) => e.castId));
    for (const key of this.poison.keys())
      if (!active.has(key.split(':')[0]!)) this.poison.delete(key);
  }
  private constrainCage(w: World, c: SimulationConfig) {
    if (!this.cageTarget) return;
    const h = w.heroes.get(this.cageTarget),
      cage = w.creeps.get('kim_cage');
    const others = [...w.heroes.values()].filter(
      (v) => v.hp > 0 && v.id !== this.cageTarget,
    );
    if (!others.length)
      this.cageSoloUntil = Math.min(
        this.cageSoloUntil,
        w.tick + this.ticks(this.definition.soloReleaseSeconds, c),
      );
    if (
      !h ||
      h.hp <= 0 ||
      !cage ||
      cage.hp <= 0 ||
      w.tick >= this.cageUntil ||
      w.tick >= this.cageSoloUntil
    ) {
      this.releaseCage(w);
      return;
    }
    h.x = this.cageOrigin.x;
    h.y = this.cageOrigin.y;
  }
  private releaseCage(w: World) {
    this.cageTarget = '';
    w.creeps.delete('kim_cage');
    for (const [id, e] of this.effects)
      if (e.kind === 'cage') this.effects.delete(id);
  }
  private cancelActor(w: World, id: string) {
    this.casts.delete(id);
    for (const [key, e] of this.effects)
      if (e.ownerId === id) this.effects.delete(key);
    const b = w.creeps.get(id);
    if (b) {
      b.pose = 'death';
      b.castAbilityId = '';
      delete b.encounterAction;
    }
  }
  private finish(w: World, c: SimulationConfig, b: Creep) {
    this.phase = 'defeated';
    this.clear(w);
    this.respawnAt = w.tick + this.definition.respawnTicks;
    const eligible = [...w.heroes.values()]
      .filter((h) =>
        actorIds.some((id) =>
          Object.hasOwn(w.creeps.get(id)?.hits ?? {}, h.id),
        ),
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    const d = this.definition;
    eligible.forEach((h, i) => {
      if (c.campaign) return;
      gainExperience(
        h,
        Math.floor(d.xp / eligible.length) +
          (i < d.xp % eligible.length ? 1 : 0),
        c,
      );
      h.gold +=
        Math.floor(d.gold / eligible.length) +
        (i < d.gold % eligible.length ? 1 : 0);
    });
    if (c.personalCraftLoot) {
      this.rewards.kill++;
      grantCraftMaterial(w, c, b, 'weapon');
      return;
    }
    const item = d.loot[Math.floor(w.random() * d.loot.length)]!;
    this.rewards.loot.push({
      id: ++this.rewards.kill,
      itemId: item.id,
      nameVi: item.nameVi,
      eligible: eligible.map((h) => h.id),
      rolls: {},
      until: w.tick + d.rollTicks,
      state: eligible.length ? 'rolling' : 'ground',
      ownerId: '',
      x: b.x,
      y: b.y,
    });
    if (eligible.length === 1)
      chuLootAction(w, eligible[0]!.id, this.rewards.kill, 'roll');
  }
  view(w: World): KimView {
    const b = w.creeps.get('kim_luan_phap_vuong');
    return {
      kind: 'kim_luan',
      phase: this.phase,
      enraged: this.enraged,
      wardId: this.wardId,
      tick: w.tick,
      casts: [...this.casts.values()],
      effects: [...this.effects.values()].map(
        ({ hits: _, damage: __, ...e }) => e,
      ),
      loot: this.rewards.loot,
      bossHp:
        this.phase === 'disciples'
          ? ['hoac_do', 'dat_nhi_ba'].reduce(
              (sum, id) => sum + (w.creeps.get(id)?.hp ?? 0),
              0,
            )
          : (b?.hp ?? 0),
      bossMaxHp:
        this.phase === 'disciples'
          ? 2700
          : (b?.maxHp ?? this.definition.actors.kim_luan_phap_vuong.hp),
      bossX: b?.x ?? 640,
      bossY: b?.y ?? 410,
      bossId: 'kim_luan_phap_vuong',
      cageTarget: this.cageTarget,
    };
  }
}
/** Swept ellipse-annulus contact, matching the ground ripple rather than its canvas. */
export function kimRingContact(
  e: Pick<KimEffect, 'x' | 'y' | 'radius' | 'previousRadius' | 'maxRadius'>,
  from: Point,
  to: Point,
  heroRadius: number,
  ellipseY: number,
  thickness: number,
): boolean {
  const a = { x: from.x - e.x, y: from.y - e.y },
    b = { x: to.x - e.x, y: to.y - e.y };
  const dx = b.x - a.x,
    dy = b.y - a.y,
    t = Math.max(
      0,
      Math.min(1, -(a.x * dx + a.y * dy) / (dx * dx + dy * dy || 1)),
    );
  let min = Infinity,
    max = 0;
  // Sample a circular hero footprint in world coordinates before ellipse projection;
  // isotropic radius/ellipseY inflation would cause invisible horizontal hits.
  for (const p of [a, b, { x: a.x + t * dx, y: a.y + t * dy }])
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI) / 8,
        r = Math.hypot(
          p.x + Math.cos(angle) * heroRadius,
          (p.y + Math.sin(angle) * heroRadius) / ellipseY,
        );
      min = Math.min(min, r);
      max = Math.max(max, r);
    }
  const outer = Math.min(e.maxRadius ?? e.radius, e.radius) + thickness / 2,
    inner = Math.max(0, (e.previousRadius ?? e.radius) - thickness / 2);
  return min <= outer && max >= inner;
}
