import { bossFightReady } from './boss-provocation.js';
import { waveBossFarewell } from './boss-banter.js';
import { announceBossSkill } from './boss-skill-announcement.js';
import { bacCaiWander } from './bac-cai-wander.js';
import { addCreep } from './simulation.js';
import { emit, hurt } from './combat.js';
import { gainExperience } from './progression.js';
import { hasStatus } from './status.js';
import {
  blocked,
  direction,
  distance,
  moveCircle,
  segmentCircle,
} from './geometry.js';
import type { Actor, Hero, Point, SimulationConfig, World } from './types.js';
import {
  bacCaiAbilities,
  validateBacCai,
  type BacCaiAbility,
  type BacCaiCast,
  type BacCaiDefinition,
  type BacCaiEffect,
  type BacCaiView,
} from './bac-cai-types.js';
const crit = { critChance: 0, critMultiplier: 1 };
const smooth = (p: number) => {
  const t = Math.max(0, Math.min(1, p));
  return t * t * (3 - 2 * t);
};
const lerp = (a: Point, b: Point, p: number): Point => ({
  x: a.x + (b.x - a.x) * p,
  y: a.y + (b.y - a.y) * p,
});
export const isBacCaiActor = (id: string) =>
  id === 'bac_cai' || id.startsWith('bc_form_') || id.startsWith('bc_dog_');
/** The field is six straight strokes: four edges and the two center strokes of 田. */
export function bacCaiFieldHit(
  p: Point,
  center: Point,
  half: number,
  line: number,
  radius: number,
  halfHeight = half,
): boolean {
  const x = Math.abs(p.x - center.x),
    y = Math.abs(p.y - center.y),
    pad = line / 2 + radius;
  return (
    x <= half + pad &&
    y <= halfHeight + pad &&
    (x <= pad ||
      y <= pad ||
      Math.abs(x - half) <= pad ||
      Math.abs(y - halfHeight) <= pad)
  );
}
export function bacCaiSpiral(
  origin: Point,
  heading: Point,
  progress: number,
  radius: number,
  turns: number,
  startRadius = 35,
  yScale = 0.7,
): Point {
  const p = Math.max(0, Math.min(1, progress)),
    angle = Math.atan2(heading.y, heading.x) + p * Math.PI * 2 * turns;
  const r = startRadius + (radius - startRadius) * p;
  return {
    x: origin.x + Math.cos(angle) * r,
    y: origin.y + Math.sin(angle) * r * yScale,
  };
}
/** Pure deterministic arena adapter. No dungeon reset, transport, animation callback or client RNG. */
export class BacCaiEncounter {
  readonly bossId = 'bac_cai';
  private corpseUntil = Infinity;
  phase: BacCaiView['phase'] = 'entering';
  cast: BacCaiCast | undefined;
  readonly effects = new Map<string, BacCaiEffect>();
  outcomeUntil = 0;
  private nextAction = 0;
  private nextSpecial = 0;
  private summonedDogs = false;
  private cooldowns = new Map<BacCaiAbility, number>();
  private forms: string[] = [];
  private spinHits = new Map<string, number>();
  private ringHeroPositions = new Map<string, Point>();
  private slots: number[] = [];
  private splitOrigin: Point = { x: 0, y: 0 };
  private cloneStart = 0;
  private realIndex = -1;
  private realHit = false;
  private cloneHits = new Set<string>();
  private rewarded = false;
  private dogBorn = new Map<string, number>();
  private preference = -1;
  private dialogue = '';
  private nextPreference = 0;
  private nextVote = 0;
  private vote:
    | {
        options: Array<Point & { preference: number }>;
        deadline: number;
        counts: number[];
        outcome: string;
        answer: number;
      }
    | undefined;
  constructor(readonly definition: BacCaiDefinition) {}
  get suppressAutoBasic(): boolean {
    return this.forms.length > 0 && !this.realHit && !this.cloneHits.size;
  }
  ticks(ms: number, c: SimulationConfig) {
    return Math.max(1, Math.round((ms * c.tickRate) / 1000));
  }
  initialize(w: World, c: SimulationConfig) {
    validateBacCai(this.definition, c);
    if (w.bacCai && w.bacCai !== this) throw Error('Arena already has Bắc Cái');
    if (w.creeps.has(this.bossId)) throw Error('Bắc Cái cannot spawn twice');
    const d = this.definition,
      b = addCreep(w, this.bossId, d.entry, c);
    b.hp = b.maxHp = Math.round(
      d.hp * (1 + d.hpPerAdditionalPlayer * Math.max(0, w.heroes.size - 1)),
    );
    Object.assign(b, {
      controlled: true,
      bossEncounter: true,
      forcedMovementImmune: true,
      archetypeId: 'bac_cai',
      fx: 0,
      fy: 1,
    });
    b.stats = {
      ...c.creep,
      hp: b.hp,
      defense: d.defense,
      speed: d.speed,
      radius: d.radius,
      xp: 0,
      gold: 0,
    };
    if ((w.creeps.get('boss_nam_de')?.hp ?? 1) <= 0)
      w.creeps.delete('boss_nam_de');
    w.bacCai = this;
    this.nextPreference = w.tick;
    this.nextVote = w.tick + this.ticks(d.preferences.voteEveryMs, c);
    this.nextSpecial = w.tick + this.ticks(2000, c);
  }
  private living(w: World): Hero[] {
    return [...w.heroes.values()]
      .filter((h) => h.hp > 0)
      .sort((a, b) => a.id.localeCompare(b.id));
  }
  private random<T>(w: World, items: T[]): T {
    return items[
      Math.min(items.length - 1, Math.floor(w.random() * items.length))
    ]!;
  }
  private move(
    actor: Actor,
    to: Point,
    speed: number,
    c: SimulationConfig,
    radius = this.definition.radius,
  ) {
    const heading = direction(to.x - actor.x, to.y - actor.y),
      step = Math.min(distance(actor, to), speed / c.tickRate);
    actor.fx = heading.x;
    actor.fy = heading.y;
    moveCircle(
      actor,
      { x: heading.x * step, y: heading.y * step },
      radius,
      c.width,
      c.height,
      c.collision,
    );
  }
  private roundMs() {
    const d = this.definition.clones;
    return d.moveMs + 3 * d.staggerMs + d.settleMs;
  }
  private cloneAge(w: World, c: SimulationConfig) {
    return ((w.tick - this.cloneStart) * 1000) / c.tickRate;
  }
  private corner(slot: number): Point {
    const d = this.definition;
    return {
      x: d.center.x + Math.cos((slot * Math.PI) / 4) * d.cloneRadius.x,
      y: d.center.y + Math.sin((slot * Math.PI) / 4) * d.cloneRadius.y,
    };
  }
  private cloneStage(w: World, c: SimulationConfig) {
    const age = this.cloneAge(w, c),
      d = this.definition.clones;
    return age < d.splitMs
      ? 'split'
      : age < d.splitMs + 5 * this.roundMs()
        ? 'shuffle'
        : 'reveal';
  }
  /** Runs before incoming attacks; immunity has exact server tick boundaries. */
  prepare(w: World, c: SimulationConfig) {
    if (!this.forms.length) return;
    const d = this.definition.clones,
      age = this.cloneAge(w, c),
      elapsed = age - d.splitMs;
    const complete = Math.max(
      0,
      Math.min(5, Math.floor(elapsed / this.roundMs())),
    );
    this.slots = Array.from({ length: 8 }, (_, i) => i);
    for (const pairs of d.pairs.slice(0, complete))
      this.slots = this.slots.map((s) => {
        const pair = pairs.find((p) => p.includes(s))!;
        return pair[0] === s ? pair[1]! : pair[0]!;
      });
    for (let i = 0; i < 8; i++) {
      const a = w.creeps.get(this.forms[i]!)!;
      let p = this.corner(this.slots[i]!);
      if (age < d.splitMs && i === this.realIndex)
        p = lerp(this.splitOrigin, p, smooth(age / d.splitMs));
      if (elapsed >= 0 && complete < 5) {
        const pairs = d.pairs[complete]!,
          pairIndex = pairs.findIndex((p) => p.includes(this.slots[i]!)),
          pair = pairs[pairIndex]!;
        const dest = pair[0] === this.slots[i] ? pair[1]! : pair[0]!;
        p = lerp(
          p,
          this.corner(dest),
          smooth(
            (elapsed - complete * this.roundMs() - pairIndex * d.staggerMs) /
              d.moveMs,
          ),
        );
      }
      a.x = p.x;
      a.y = p.y;
      a.fx = 0;
      a.fy = 1;
      a.pose = 'idle';
    }
  }
  /** Queue decisions until all attacks in the tick are evaluated. Never mutate the target set here. */
  interceptDamage(
    w: World,
    c: SimulationConfig,
    target: string,
    source: string,
    abilityId: string,
  ): boolean {
    if (!this.forms.includes(target)) return true;
    const stage = this.cloneStage(w, c);
    if (stage === 'shuffle') return false;
    if (target !== this.bossId) {
      if (stage === 'reveal' && w.heroes.has(source))
        this.cloneHits.add(`${source}:${abilityId}:${target}`);
      return false;
    }
    return true;
  }
  damaged(w: World, c: SimulationConfig, target: string, source: string) {
    if (
      target === this.bossId &&
      this.forms.length &&
      this.cloneStage(w, c) === 'reveal' &&
      w.heroes.has(source)
    )
      this.realHit = true;
  }
  /** Server-only entry, also used by test fixtures. It cannot be invoked by a network gameplay message. */
  begin(
    w: World,
    c: SimulationConfig,
    ability: BacCaiAbility,
    target?: Hero,
  ): boolean {
    const b = w.creeps.get(this.bossId),
      heroes = this.living(w).filter((h) => !hasStatus(h, 'concealed', w.tick)),
      d = this.definition;
    if (
      !b ||
      b.hp <= 0 ||
      this.cast ||
      this.forms.length ||
      this.phase === 'sleep' ||
      this.phase === 'drink' ||
      this.phase === 'cleared'
    )
      return false;
    if (ability === 'tether' && heroes.length < 2) return false;
    target ??= heroes[0];
    if (!target) return false;
    const heading = direction(target.x - b.x, target.y - b.y);
    if (ability === 'vortex') {
      b.x = d.center.x;
      b.y = d.center.y;
    }
    b.fx = heading.x;
    b.fy = heading.y;
    b.pose = 'cast';
    b.castAbilityId = 'bc_' + ability;
    let release = 0,
      end = 0;
    switch (ability) {
      case 'staff':
        release = d.staff.cadenceMs;
        end = d.staff.durationMs;
        break;
      case 'palms':
        release = d.palms.releaseMs;
        end = d.palms.recoveryMs;
        break;
      case 'beam':
        release = d.beam.warningMs;
        end = d.beam.recoveryMs;
        break;
      case 'dogs':
        release = d.dogs.releaseMs;
        end = d.dogs.recoveryMs;
        break;
      case 'clones':
        release = d.clones.splitMs;
        end = d.clones.splitMs + this.roundMs() * 5;
        break;
      case 'vortex':
        release = d.vortex.windupMs;
        end = release + d.vortex.activeMs + d.vortex.recoveryMs;
        break;
      case 'tether':
        release = d.tether.releaseMs;
        end = d.tether.recoveryMs;
        break;
      case 'field':
        release = d.field.impactMs;
        end = d.field.recoveryMs;
        break;
      case 'spiral':
        release = d.spiral.dashMs + d.spiral.releaseMs;
        end = d.spiral.dashMs + d.spiral.recoveryMs;
        break;
    }
    this.cast = {
      id: 'bc_cast_' + w.nextId++,
      ability,
      start: w.tick,
      release: w.tick + this.ticks(release, c),
      end: w.tick + this.ticks(end, c),
      fx: heading.x,
      fy: heading.y,
      x: target.x,
      y: target.y,
      origin: { x: b.x, y: b.y },
      targetId: target.id,
      released: false,
      nextHit: w.tick,
    };
    if (
      ability === 'field' &&
      blocked(this.cast, d.radius, c.width, c.height, c.collision)
    ) {
      this.cast.x = b.x;
      this.cast.y = b.y;
    }
    b.actionUntil = this.cast.end;
    if (ability === 'vortex') {
      this.cast.wanderSeed = Math.floor(w.random() * 4294967296);
      this.spinHits.clear();
    }
    if (ability === 'clones') this.split(w, c);
    if (ability === 'dogs') this.summonedDogs = true;
    announceBossSkill(w, b.id, 'bc_' + ability);
    emit(w, {
      kind: 'cast',
      sourceId: b.id,
      targetId: '',
      abilityId: 'bc_' + ability,
      damage: 0,
      critical: false,
      x: b.x,
      y: b.y,
      fx: b.fx,
      fy: b.fy,
    });
    return true;
  }
  private split(w: World, c: SimulationConfig) {
    const b = w.creeps.get(this.bossId)!;
    this.cloneStart = w.tick;
    this.splitOrigin = { x: b.x, y: b.y };
    this.realIndex = Math.floor(w.random() * 8);
    this.forms = Array.from({ length: 8 }, (_, i) =>
      i === this.realIndex ? b.id : `bc_form_${w.nextId++}`,
    );
    for (const id of this.forms)
      if (id !== b.id) {
        const a = addCreep(w, id, { x: b.x, y: b.y }, c);
        Object.assign(a, {
          controlled: true,
          bossEncounter: true,
          forcedMovementImmune: true,
          hp: b.maxHp,
          maxHp: b.maxHp,
          archetypeId: 'bc_form',
        });
        a.stats = { ...b.stats!, xp: 0, gold: 0 };
      }
    this.prepare(w, c);
  }
  private removeForms(w: World) {
    for (const id of this.forms) if (id !== this.bossId) w.creeps.delete(id);
    this.forms = [];
    this.cast = undefined;
    this.realHit = false;
    this.cloneHits.clear();
  }
  private addEffect(
    w: World,
    kind: BacCaiEffect['kind'],
    p: Point,
    heading: Point,
    lifetime: number,
    c: SimulationConfig,
    targets: string[] = [],
  ): BacCaiEffect {
    const e: BacCaiEffect = {
      id: 'bc_effect_' + w.nextId++,
      kind,
      x: p.x,
      y: p.y,
      origin: { x: p.x, y: p.y },
      previous: { x: p.x, y: p.y },
      fx: heading.x,
      fy: heading.y,
      start: w.tick,
      end: w.tick + this.ticks(lifetime, c),
      targetIds: targets,
      hits: {},
    };
    this.effects.set(e.id, e);
    return e;
  }
  private damage(
    w: World,
    c: SimulationConfig,
    h: Hero,
    ability: string,
    value: number,
  ) {
    hurt(w, h, this.bossId, 'bc_' + ability, value, c, crit);
  }
  private release(w: World, c: SimulationConfig, cast: BacCaiCast) {
    const b = w.creeps.get(this.bossId)!,
      d = this.definition,
      heading = { x: cast.fx, y: cast.fy };
    switch (cast.ability) {
      case 'palms':
        this.addEffect(
          w,
          'palm',
          { x: b.x + cast.fx * 24, y: b.y + cast.fy * 24 },
          heading,
          (d.palms.range / d.palms.speed) * 1000,
          c,
        );
        break;
      case 'beam':
        this.addEffect(
          w,
          'beam',
          { x: b.x + cast.fx * 15, y: b.y + cast.fy * 15 },
          heading,
          d.beam.activeMs,
          c,
        );
        break;
      case 'dogs':
        for (let i = 0; i < 4; i++) {
          const pos = {
            x: b.x + (i % 2 ? 1 : -1) * 42,
            y: b.y + (i < 2 ? -1 : 1) * 36,
          };
          const a = addCreep(
            w,
            'bc_dog_' + w.nextId++,
            blocked(pos, d.dogs.radius, c.width, c.height, c.collision)
              ? { x: b.x, y: b.y }
              : pos,
            c,
          );
          Object.assign(a, {
            hp: d.dogs.hp,
            maxHp: d.dogs.hp,
            controlled: true,
            bossEncounter: true,
            summonedBy: b.id,
            archetypeId: 'bc_dog',
            expiresAt: w.tick + this.ticks(d.dogs.lifetimeMs, c),
          });
          a.stats = {
            ...c.creep,
            hp: d.dogs.hp,
            defense: 0,
            radius: d.dogs.radius,
            speed: d.dogs.speed,
            xp: 0,
            gold: 0,
          };
          this.dogBorn.set(a.id, w.tick);
        }
        break;
      case 'vortex':
        break;
      case 'tether': {
        const pool = this.living(w);
        if (pool.length < 2) break;
        const a = this.random(w, pool),
          other = this.random(
            w,
            pool.filter((h) => h !== a),
          );
        for (const h of [a, other])
          this.move(
            h,
            b,
            Math.min(d.tether.pullDistance, distance(h, b)) * c.tickRate,
            c,
            c.radius,
          );
        this.addEffect(w, 'tether', b, heading, d.tether.lifetimeMs, c, [
          a.id,
          other.id,
        ]);
        break;
      }
      case 'field': {
        if (!blocked(cast, d.radius, c.width, c.height, c.collision)) {
          b.x = cast.x;
          b.y = cast.y;
        }
        // Choose the legal landing point, then use the same center for warning/hit/VFX.
        const e = this.addEffect(w, 'field', b, heading, d.field.activeMs, c);
        for (const h of this.living(w))
          if (
            bacCaiFieldHit(
              h,
              e,
              d.field.halfSize,
              d.field.lineWidth,
              c.radius,
              d.field.halfHeight,
            )
          )
            this.damage(w, c, h, 'field', d.damage.field);
        break;
      }
      case 'spiral':
        this.addEffect(w, 'spiral', d.center, heading, d.spiral.flightMs, c);
        break;
    }
  }
  private stepCast(w: World, c: SimulationConfig) {
    const cast = this.cast,
      b = w.creeps.get(this.bossId)!,
      d = this.definition;
    if (!cast) return;
    b.pose = 'cast';
    b.castAbilityId = 'bc_' + cast.ability;
    if (cast.ability === 'staff' && w.tick < cast.end) {
      this.move(
        b,
        { x: b.x + cast.fx * d.staff.dash, y: b.y + cast.fy * d.staff.dash },
        d.staff.dash / (d.staff.durationMs / 1000),
        c,
      );
      if (w.tick >= cast.nextHit) {
        for (const h of this.living(w)) {
          const dir = direction(h.x - b.x, h.y - b.y);
          if (
            distance(b, h) <= d.staff.range + c.radius &&
            dir.x * cast.fx + dir.y * cast.fy >= Math.cos(d.staff.halfAngle)
          )
            this.damage(w, c, h, 'staff', d.damage.staff);
        }
        cast.nextHit = w.tick + this.ticks(d.staff.cadenceMs, c);
      }
    }
    if (
      cast.ability === 'spiral' &&
      w.tick <= cast.start + this.ticks(d.spiral.dashMs, c)
    ) {
      const progress = Math.min(
        1,
        (w.tick - cast.start) / this.ticks(d.spiral.dashMs, c),
      );
      const to = {
        x: cast.origin.x + (d.center.x - cast.origin.x) * progress,
        y: cast.origin.y + (d.center.y - cast.origin.y) * progress,
      };
      this.move(b, to, distance(b, to) * c.tickRate, c);
      b.pose = 'walk';
    }
    if (cast.ability === 'vortex') {
      const activeEnd = cast.release + this.ticks(d.vortex.activeMs, c);
      const points = bacCaiWander(
        cast.wanderSeed ?? 0,
        Math.max(0, (w.tick - cast.release) / c.tickRate),
        c.heroBounds ?? {
          x: d.center.x,
          y: d.center.y,
          radiusX: 324,
          radiusY: 294,
        },
        d.vortex,
      );
      Object.assign(b, points[0]);
      if (w.tick >= cast.release && w.tick < activeEnd) {
        for (const [i, p] of points.entries())
          for (const h of this.living(w)) {
            const key = i + ':' + h.id;
            if (
              distance(h, p) <= d.vortex.radius + c.radius &&
              w.tick >= (this.spinHits.get(key) ?? 0)
            ) {
              this.damage(w, c, h, 'vortex', d.damage.vortex);
              this.spinHits.set(
                key,
                w.tick + this.ticks(d.vortex.cadenceMs, c),
              );
            }
          }
      }
    }
    if (w.tick >= cast.release && !cast.released) {
      cast.released = true;
      this.release(w, c, cast);
    }
    if (w.tick >= cast.end) {
      this.cast = undefined;
      b.pose = 'idle';
      b.castAbilityId = '';
      this.nextAction = w.tick + this.ticks(d.actionGapMs, c);
    }
  }
  private stepEffects(w: World, c: SimulationConfig) {
    const d = this.definition;
    for (const e of this.effects.values()) {
      if (w.tick >= e.end) {
        this.effects.delete(e.id);
        continue;
      }
      if (e.kind === 'tether') {
        const a = w.heroes.get(e.targetIds[0]!),
          b = w.heroes.get(e.targetIds[1]!);
        if (
          !a ||
          !b ||
          a.hp <= 0 ||
          b.hp <= 0 ||
          distance(a, b) >= d.tether.breakDistance
        ) {
          this.effects.delete(e.id);
          continue;
        }
        for (const h of [a, b])
          if (w.tick >= (e.hits[h.id] ?? 0)) {
            this.damage(w, c, h, 'tether', d.damage.tether);
            e.hits[h.id] = w.tick + this.ticks(d.tether.cadenceMs, c);
            if (h.hp <= 0) {
              this.effects.delete(e.id);
              break;
            }
          }
        continue;
      }
      if (e.kind === 'field' || e.kind === 'explosion') continue;
      const old = { x: e.x, y: e.y };
      if (e.kind === 'palm') {
        e.x += (e.fx * d.palms.speed) / c.tickRate;
        e.y += (e.fy * d.palms.speed) / c.tickRate;
      }
      if (e.kind === 'spiral') {
        const radiusAt = (tick: number) =>
          d.spiral.startRadius +
          (d.spiral.radius - d.spiral.startRadius) *
            Math.max(0, Math.min(1, (tick - e.start) / (e.end - e.start)));
        const radial = (p: Point) =>
          Math.hypot(p.x - e.origin.x, (p.y - e.origin.y) / d.spiral.yScale);
        for (const h of this.living(w)) {
          const previous = this.ringHeroPositions.get(h.id) ?? h;
          const before = radial(previous) - radiusAt(w.tick - 1);
          const after = radial(h) - radiusAt(w.tick);
          const pad = d.spiral.hitRadius + c.radius / d.spiral.yScale;
          if (
            w.tick < (e.hits[h.id] ?? 0) ||
            h.lastUniversalDashTick === w.tick ||
            Math.min(before, after) > pad ||
            Math.max(before, after) < -pad
          )
            continue;
          this.damage(w, c, h, 'spiral', d.damage.spiral);
          e.hits[h.id] = w.tick + this.ticks(d.spiral.cadenceMs, c);
        }
        continue;
      }
      const end =
        e.kind === 'beam'
          ? { x: e.x + e.fx * d.beam.length, y: e.y + e.fy * d.beam.length }
          : e;
      for (const h of this.living(w)) {
        if (w.tick < (e.hits[h.id] ?? 0)) continue;
        const radius =
          (e.kind === 'beam'
            ? d.beam.radius
            : e.kind === 'palm'
              ? d.palms.radius
              : d.spiral.hitRadius) + c.radius;
        if (segmentCircle(old, end, h, radius) === undefined) continue;
        this.damage(
          w,
          c,
          h,
          e.kind === 'palm' ? 'palms' : e.kind,
          d.damage[e.kind === 'palm' ? 'palms' : e.kind],
        );
        e.hits[h.id] = Infinity;
      }
      e.previous = old;
    }
    for (const h of w.heroes.values())
      this.ringHeroPositions.set(h.id, { x: h.x, y: h.y });
  }
  private stepDogs(w: World, c: SimulationConfig) {
    const d = this.definition;
    for (const [id, born] of this.dogBorn) {
      const dog = w.creeps.get(id);
      if (!dog) {
        this.dogBorn.delete(id);
        continue;
      }
      if (dog.hp <= 0) {
        dog.pose = 'death';
        if (
          w.tick >=
          dog.respawnAt - c.creep.respawnTicks + this.ticks(d.dogs.corpseMs, c)
        ) {
          w.creeps.delete(id);
          this.dogBorn.delete(id);
        }
        continue;
      }
      if (w.tick >= born + this.ticks(d.dogs.lifetimeMs, c)) {
        w.creeps.delete(id);
        this.dogBorn.delete(id);
        continue;
      }
      const target = this.living(w)
        .filter((h) => !hasStatus(h, 'concealed', w.tick))
        .sort((a, b) => distance(a, dog) - distance(b, dog))[0];
      if (!target) continue;
      if (dog.stats) dog.stats.damage = d.damage.dogs;
      if (stepControlledCreepSpecial(w, dog, target, c)) continue;
      if (hasStatus(dog, 'stun', w.tick)) {
        dog.pose = 'idle';
        continue;
      }
      const dir = direction(target.x - dog.x, target.y - dog.y);
      dog.fx = dir.x;
      dog.fy = dir.y;
      if (distance(dog, target) > d.dogs.range + c.radius) {
        this.move(dog, target, d.dogs.speed, c, d.dogs.radius);
        dog.pose = w.tick < dog.hurtUntil ? 'hurt' : 'walk';
      } else if (w.tick >= dog.cooldown && !hasStatus(dog, 'disarm', w.tick)) {
        dog.cooldown = w.tick + this.ticks(d.dogs.cadenceMs, c);
        dog.actionUntil = w.tick + this.ticks(400, c);
        dog.pose = 'basic_attack';
        hurt(w, target, dog.id, 'bc_dogs', d.damage.dogs, c, crit);
      } else
        dog.pose =
          w.tick < dog.hurtUntil
            ? 'hurt'
            : w.tick < dog.actionUntil
              ? 'basic_attack'
              : 'idle';
    }
  }
  private stepPreferences(w: World, c: SimulationConfig) {
    const d = this.definition,
      p = d.preferences;
    if (this.phase === 'sleep' || this.phase === 'drink') return;
    if (!this.vote && w.tick >= this.nextPreference) {
      this.preference = this.random(
        w,
        [0, 1, 2, 3, 4, 5].filter((i) => i !== this.preference),
      );
      this.dialogue = p.quotes[this.preference]!;
      this.nextPreference = w.tick + this.ticks(p.changeMs, c);
    }
    if (!this.vote && w.tick >= this.nextVote) {
      const rest = [0, 1, 2, 3, 4, 5].filter((i) => i !== this.preference),
        a = this.random(w, rest),
        b = this.random(
          w,
          rest.filter((i) => i !== a),
        );
      const options = [this.preference, a, b];
      for (let i = 2; i > 0; i--) {
        const j = Math.floor(w.random() * (i + 1));
        [options[i], options[j]] = [options[j]!, options[i]!];
      }
      this.vote = {
        options: options.map((preference, i) => ({
          preference,
          x: d.center.x + (i - 1) * 150,
          y: d.center.y - 80,
        })),
        deadline: w.tick + this.ticks(p.voteMs, c),
        counts: [0, 0, 0],
        answer: this.preference,
        outcome: '',
      };
      this.dialogue = 'Ai còn nhớ lời lão phu?';
    }
    const vote = this.vote;
    if (!vote || vote.outcome) return;
    vote.counts = [0, 0, 0];
    for (const h of this.living(w)) {
      const index = vote.options.findIndex(
        (o) =>
          ((h.x - o.x) / (p.zoneSize / 2)) ** 2 +
            ((h.y - o.y) / (p.zoneHeight / 2)) ** 2 <=
          1,
      );
      if (index >= 0) vote.counts[index]!++;
    }
    if (w.tick < vote.deadline) return;
    const max = Math.max(...vote.counts),
      winners = vote.counts.flatMap((n, i) => (n === max ? [i] : []));
    const success =
      max > 0 &&
      winners.length === 1 &&
      vote.options[winners[0]!]!.preference === vote.answer;
    vote.outcome = success ? 'correct' : 'wrong';
    this.phase = success ? 'sleep' : 'drink';
    this.outcomeUntil = w.tick + this.ticks(success ? p.sleepMs : p.drinkMs, c);
    this.cast = undefined;
    this.removeForms(w); // outcome interrupts the body; released hazards/dogs survive.
    const boss = w.creeps.get(this.bossId)!;
    boss.castAbilityId = '';
    if (!success) {
      boss.hp = Math.min(boss.maxHp, boss.hp + boss.maxHp * p.healFraction);
      this.dialogue = 'Thất vọng quá! Để lão uống một ngụm rượu.';
    } else this.dialogue = 'Đúng ý lão rồi… ngủ một giấc đã!';
  }
  step(w: World, c: SimulationConfig) {
    if (!bossFightReady(w, c) && this.phase !== 'entering') return;
    const b = w.creeps.get(this.bossId);
    if (!b || this.phase === 'cleared' || this.phase === 'defeated') return;
    // Resolve the complete tick hit set, including simultaneous real and clone hits.
    const timeout =
      this.forms.length > 0 &&
      !this.realHit &&
      this.cloneAge(w, c) >=
        this.definition.clones.splitMs +
          5 * this.roundMs() +
          this.definition.clones.guessMs;
    const explode = this.cloneHits.size > 0 || timeout;
    if (explode) {
      for (const h of this.living(w))
        this.damage(
          w,
          c,
          h,
          'clone_explosion',
          this.definition.damage.cloneExplosion,
        );
      this.addEffect(
        w,
        'explosion',
        this.definition.center,
        { x: 1, y: 0 },
        800,
        c,
      );
    }
    // A single outcome per tick, including an AoE touching both real body and copies.
    this.cloneHits.clear();
    if (explode || this.realHit) {
      this.removeForms(w);
      b.pose = 'idle';
      this.nextAction = w.tick + this.ticks(this.definition.actionGapMs, c);
    }
    if (b.hp <= 0) {
      this.finish(w, c);
      return;
    }
    if (this.phase === 'entering') {
      this.move(b, this.definition.center, this.definition.speed, c);
      b.pose = 'walk';
      if (distance(b, this.definition.center) < 5) {
        this.phase = 'combat';
        b.pose = 'idle';
      }
      return;
    }
    if (
      (this.phase === 'sleep' || this.phase === 'drink') &&
      w.tick >= this.outcomeUntil
    ) {
      this.phase = 'combat';
      this.vote = undefined;
      this.nextVote =
        w.tick + this.ticks(this.definition.preferences.voteEveryMs, c);
      this.nextPreference = w.tick;
      this.nextAction = w.tick + this.ticks(this.definition.actionGapMs, c);
    }
    if (!this.forms.length && this.cast?.ability !== 'clones')
      this.stepPreferences(w, c);
    this.stepDogs(w, c);
    if (this.phase !== 'sleep' && this.phase !== 'drink') this.stepCast(w, c);
    this.stepEffects(w, c);
    if (this.phase === 'sleep' || this.phase === 'drink') {
      b.pose = 'idle';
      return;
    }
    if (
      this.cast ||
      this.forms.length ||
      w.tick < this.nextAction ||
      hasStatus(b, 'stun', w.tick)
    )
      return;
    const heroes = this.living(w).filter(
        (h) => !hasStatus(h, 'concealed', w.tick),
      ),
      target = heroes.sort((a, b2) => distance(a, b) - distance(b2, b))[0];
    if (!target) return;
    if (w.tick >= this.nextSpecial) {
      const available = bacCaiAbilities.filter(
        (a) =>
          a !== 'staff' &&
          a !== 'palms' &&
          (a !== 'tether' || heroes.length >= 2) &&
          w.tick >= (this.cooldowns.get(a) ?? 0),
      );
      if (available.length) {
        const ability =
          !this.summonedDogs && available.includes('dogs')
            ? 'dogs'
            : this.random(w, available);
        this.begin(w, c, ability, this.random(w, heroes));
        this.cooldowns.set(
          ability,
          w.tick + this.ticks(this.definition.specialCooldownMs, c),
        );
        this.nextSpecial =
          w.tick + this.ticks(this.definition.specialCooldownMs, c);
        return;
      }
    }
    if (
      distance(b, target) > this.definition.staff.range &&
      w.random() < 0.65
    ) {
      this.move(b, target, this.definition.speed, c);
      b.pose = 'walk';
      this.nextAction = w.tick + this.ticks(200, c);
    } else {
      this.begin(
        w,
        c,
        distance(b, target) > this.definition.staff.range || w.random() < 0.5
          ? 'palms'
          : 'staff',
        target,
      );
      this.nextAction = w.tick + this.ticks(this.definition.basicGapMs, c);
    }
  }
  private finish(w: World, c: SimulationConfig) {
    if (!this.rewarded) {
      this.rewarded = true;
      const b = w.creeps.get(this.bossId)!,
        eligible = this.living(w).filter(
          (h) =>
            b.hits[h.id] !== undefined &&
            w.tick - b.hits[h.id]! <=
              this.ticks(this.definition.reward.assistMs, c),
        );
      eligible.forEach((h, i) => {
        if (c.campaign) return;
        const split = (n: number) =>
          Math.floor(n / eligible.length) + (i < n % eligible.length ? 1 : 0);
        gainExperience(h, split(this.definition.reward.xp), c);
        h.gold += split(this.definition.reward.gold);
      });
    }
    this.clear(w);
    this.phase = 'defeated';
    const boss = w.creeps.get(this.bossId)!;
    this.corpseUntil = waveBossFarewell(w, c, boss);
  }
  clear(w: World) {
    this.effects.clear();
    this.cast = undefined;
    this.removeForms(w);
    this.vote = undefined;
    for (const id of this.dogBorn.keys()) w.creeps.delete(id);
    this.dogBorn.clear();
    for (const h of w.heroes.values())
      h.statuses = (h.statuses ?? []).filter((s) => s.sourceId !== this.bossId);
    const b = w.creeps.get(this.bossId);
    if (b) {
      b.statuses = [];
      b.castAbilityId = '';
      b.pose = b.hp <= 0 ? 'death' : 'idle';
    }
    this.phase = 'cleared';
  }
  participantLeft(id: string) {
    for (const e of this.effects.values())
      if (e.kind === 'tether' && e.targetIds.includes(id))
        this.effects.delete(e.id);
  }
  view(w: World, c: SimulationConfig): BacCaiView {
    const b = w.creeps.get(this.bossId)!,
      clones = this.forms.length > 0;
    // No original actor ID, real index/slot, per-form HP, RNG seed or hidden body coordinate crosses the wire.
    const action = this.cast
      ? { ...this.cast, targetId: '', nextHit: 0 }
      : null;
    if (action) delete action.wanderSeed;
    return {
      tick: w.tick,
      tickRate: c.tickRate,
      phase: this.phase,
      hp: b.hp,
      maxHp: b.maxHp,
      boss:
        clones || (this.phase === 'defeated' && w.tick >= this.corpseUntil)
          ? null
          : {
              x: b.x,
              y: b.y,
              fx: b.fx,
              fy: b.fy,
              pose:
                b.hp <= 0 ? 'death' : w.tick < b.hurtUntil ? 'hurt' : b.pose,
              poseStart:
                b.hp <= 0
                  ? Math.max(0, b.respawnAt - c.creep.respawnTicks)
                  : w.tick < b.hurtUntil
                    ? b.hurtUntil - 6
                    : 0,
            },
      action,
      forms: this.forms.map((id, i) => {
        const a = w.creeps.get(id)!;
        return { key: 'form_' + i, x: a.x, y: a.y, fx: a.fx, fy: a.fy };
      }),
      spinners:
        this.cast?.ability === 'vortex' &&
        w.tick >= this.cast.start + this.ticks(300, c) &&
        w.tick <
          this.cast.release + this.ticks(this.definition.vortex.activeMs, c)
          ? bacCaiWander(
              this.cast.wanderSeed ?? 0,
              Math.max(0, (w.tick - this.cast.release) / c.tickRate),
              c.heroBounds ?? {
                x: this.definition.center.x,
                y: this.definition.center.y,
                radiusX: 324,
                radiusY: 294,
              },
              this.definition.vortex,
            ).map((p, i) => ({
              key: 'spinner_' + i,
              ...p,
              fx: this.cast!.fx,
              fy: this.cast!.fy,
            }))
          : [],
      clonePhase: clones ? this.cloneStage(w, c) : '',
      swaps: clones
        ? Math.max(
            0,
            Math.min(
              5,
              Math.floor(
                (this.cloneAge(w, c) - this.definition.clones.splitMs) /
                  this.roundMs(),
              ),
            ),
          )
        : 0,
      immune: clones && this.cloneStage(w, c) === 'shuffle',
      effects: [...this.effects.values()].map(
        ({ hits: _h, previous: _p, ...e }) => ({
          ...e,
          targetIds: [...e.targetIds],
        }),
      ),
      dogs: [...this.dogBorn].flatMap(([id, born]) => {
        const a = w.creeps.get(id);
        return a
          ? [
              {
                id,
                x: a.x,
                y: a.y,
                hp: a.hp,
                maxHp: a.maxHp,
                fx: a.fx,
                pose: a.pose,
                age:
                  w.tick -
                  (a.hp <= 0
                    ? a.respawnAt - c.creep.respawnTicks
                    : w.tick < a.hurtUntil
                      ? a.hurtUntil - 6
                      : a.pose === 'basic_attack'
                        ? a.actionUntil - this.ticks(400, c)
                        : born),
              },
            ]
          : [];
      }),
      dialogue: clones ? '' : this.dialogue,
      preference: this.preference,
      vote: this.vote
        ? {
            options: this.vote.options,
            counts: this.vote.counts,
            deadline: this.vote.deadline,
            outcome: this.vote.outcome,
          }
        : null,
      outcomeUntil: this.outcomeUntil,
      tuning: {
        beam: this.definition.beam,
        field: this.definition.field,
        spiral: this.definition.spiral,
        preferences: this.definition.preferences,
        vortex: this.definition.vortex,
      },
    };
  }
}
import { stepControlledCreepSpecial } from './creep-abilities.js';
