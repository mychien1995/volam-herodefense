import { bossFightReady } from './boss-provocation.js';
import { announceBossSkill } from './boss-skill-announcement.js';
import { hurt } from './combat.js';
import {
  blocked,
  direction,
  distance,
  moveCircle,
  segmentCircle,
} from './geometry.js';
import { namDeKeys, type NamDeControl, type NamDeKey } from './nam-de-types.js';
import { gainExperience } from './progression.js';
import { addCreep } from './simulation.js';
import { applyStatus, cancelOwnedEffects, hasStatus } from './status.js';
import type { Creep, Hero, Point, SimulationConfig, World } from './types.js';

export const VUONG_ID = 'vuong_trung_duong';
export const vuongElements = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'] as const;
export const vuongCounters = [3, 0, 4, 2, 1] as const;
export const vuongNotes = ['Đô', 'Rê', 'Mi', 'Fa', 'Sol', 'La'] as const;
export const vuongSkills = {
  thrust: 'vtd_kiem_khi',
  slash: 'vtd_ban_nguyet',
  crescent: 'vtd_ban_nguyet_kiem_khi',
  tam: 'vtd_nhat_khi_hoa_tam_thanh',
  shield: 'vtd_cuu_am_ho_the',
  counter: 'vtd_toan_chan_phan_kiem',
  elements: 'vtd_ngu_hanh_kiem_tran',
  stars: 'vtd_bac_dau_kiem_tran',
  break: 'vtd_tam_thanh_pha_tran',
  pulse: 'vtd_tien_thien_chan_mach',
  swords: 'vtd_huyen_vu_kiem_tran',
  finger: 'vtd_nhat_duong_chi',
  rain: 'vtd_pha_the_vo_hinh_kiem',
  notes: 'vtd_that_tuyet_loi_am',
} as const;
type Skill = keyof typeof vuongSkills;
type DamageSkill = Exclude<Skill, 'counter' | 'shield' | 'notes' | 'swords'>;
type Main =
  | 'thrust'
  | 'slash'
  | 'crescent'
  | 'tam'
  | 'counter'
  | 'elements'
  | 'stars'
  | 'pulse'
  | 'swords'
  | 'notes';
export interface VuongDefinition {
  center: Point;
  restMs: number;
  hp: number;
  hpPerPlayer: number;
  radius: number;
  speed: number;
  shieldHoldRange: number;
  shieldMoveSpeed: number;
  starGroups: number;
  starSpreadX: number;
  starSpreadY: number;
  starWarningMs: number;
  starSpeed: number;
  starGapMs: number;
  defense: number;
  phase2Hp: number;
  notesHp: number;
  recoveryMs: number;
  openingMs: number;
  exposedMs: number;
  shieldMultiplier: number;
  starMultiplier: number;
  lightningMs: number;
  lightningGapMs: number;
  rainMs: number;
  rainGapMs: number;
  notesReadMs: number;
  beatMs: number;
  qteMs: number;
  qteFraction: number;
  swordsCount: number;
  drainPerSword: number;
  damage: Record<DamageSkill | 'lightning', number>;
  gold: number;
  xp: number;
}
export function validateVuong(d: VuongDefinition, c: SimulationConfig) {
  const { center, damage, ...values } = d;
  if (
    [...Object.values(values), ...Object.values(damage)].some(
      (n) => !Number.isFinite(n) || n <= 0,
    ) ||
    blocked(center, d.radius, c.width, c.height, c.collision) ||
    !Number.isFinite(center.x + center.y) ||
    d.phase2Hp >= 1 ||
    d.notesHp >= d.phase2Hp ||
    Math.max(d.shieldMultiplier, d.starMultiplier, d.qteFraction) >= 1 ||
    !Number.isInteger(d.starGroups) ||
    d.starGroups < 1 ||
    d.starGroups > 4 ||
    !Number.isInteger(d.swordsCount) ||
    d.swordsCount > 6 ||
    !Number.isInteger(d.xp) ||
    !Number.isInteger(d.gold)
  )
    throw Error('Invalid Vương Trùng Dương definition');
}

type CueKind =
  | 'lightning'
  | 'rain'
  | 'thrust'
  | 'slash'
  | 'crescent'
  | 'tam'
  | 'starLine'
  | 'finger'
  | 'inner'
  | 'outer'
  | 'elements'
  | 'counter'
  | 'shatter';
export interface VuongCue extends Point {
  id: number;
  kind: CueKind;
  radius: number;
  end?: Point;
  at: number;
  until: number;
  index?: number;
}
interface Hazard extends VuongCue {
  skill?: DamageSkill;
  velocity?: Point;
  hit?: Set<string>;
  resolved?: boolean;
}
interface Action {
  skill: Main;
  start: number;
  next: number;
  stage: number;
  target: string;
  index: number;
  direction: Point;
}
const rotation1 = ['tam', 'counter', 'elements'] as const;
const rotation2 = ['stars', 'pulse', 'swords', 'pulse'] as const;
const starOffsets = [
  [-95, -40],
  [-60, -62],
  [-22, -50],
  [20, -20],
  [66, -18],
  [88, 34],
  [40, 49],
] as const;
const starLinks = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 4],
] as const;
const eyeIndex = 3;
const noteRadius = 29;
const elementRadius = 38;
const starRadius = 18;
const innerRadius = 95;
const outerRadius = 185;

export function vuongStarLight(
  cue: Point & { end?: Point | undefined; at: number; until: number },
  tick: number,
): Point {
  const progress = Math.max(
    0,
    Math.min(1, (tick - cue.at) / Math.max(1, cue.until - cue.at - 1)),
  );
  return {
    x: cue.x + ((cue.end?.x ?? cue.x) - cue.x) * progress,
    y: cue.y + ((cue.end?.y ?? cue.y) - cue.y) * progress,
  };
}
export class VuongEncounter {
  readonly bossId = VUONG_ID;
  phase: 1 | 2 = 1;
  state: 'fighting' | 'defeated' | 'retry' = 'fighting';
  lightningHits = 0;
  readonly controls = new Map<string, NamDeControl>();
  private nextAction = 0;
  private nextHazard = 0;
  private nextSpecial = 0;
  private rotation = 0;
  private basics = 0;
  private serial = 0;
  private action: Action | undefined;
  private hazards: Hazard[] = [];
  private swords: { id: number; point: Point }[] = [];
  private nextDrain = 0;
  private nextFinger = 0;
  private burns = new Map<string, { next: number; remaining: number }>();
  private notes: number[] = [];
  private notesDone = false;
  private practiceNotes = false;
  private exposedUntil = 0;
  private transitionUntil = 0;
  private corpseUntil = 0;
  private qteFailed = false;
  private shieldAnnounced = false;
  private releasedAt = -1000;
  private qteOutcome: 'success' | 'failed' | '' = '';
  private qteOutcomeUntil = 0;
  private readonly participants = new Set<string>();

  constructor(readonly definition: VuongDefinition) {}
  private ticks(ms: number, c: SimulationConfig) {
    return Math.max(1, Math.round((ms * c.tickRate) / 1000));
  }
  private living(w: World) {
    return [...w.heroes.values()]
      .filter((h) => h.hp > 0)
      .sort((a, b) => a.id.localeCompare(b.id));
  }
  private choose<T>(w: World, options: readonly T[]) {
    return options[Math.floor(w.random() * options.length)]!;
  }
  private around(count: number, radius: number) {
    const { x, y } = this.definition.center;
    return Array.from({ length: count }, (_, i) => ({
      x: x + radius * Math.cos((i * 2 * Math.PI) / count - Math.PI / 2),
      y: y + radius * Math.sin((i * 2 * Math.PI) / count - Math.PI / 2),
    }));
  }
  private stars() {
    const d = this.definition;
    return Array.from({ length: d.starGroups }, (_, group) => {
      const angle = (group * Math.PI) / 2,
        cos = Math.cos(angle),
        sin = Math.sin(angle);
      const cx = d.center.x + (group % 2 ? 1 : -1) * d.starSpreadX;
      const cy = d.center.y + (group < 2 ? -1 : 1) * d.starSpreadY;
      return starOffsets.map(([x, y]) => ({
        x: cx + x * cos - y * sin,
        y: cy + x * sin + y * cos,
      }));
    }).flat();
  }
  private notesTest(w: World): boolean {
    return (
      !!w.waveBossTest?.progression && w.waveBossTest.scenario === 'vuong_notes'
    );
  }
  initialize(w: World, c: SimulationConfig) {
    if (w.creeps.has(VUONG_ID)) throw Error('Vương Trùng Dương already exists');
    const d = this.definition;
    const b = addCreep(w, VUONG_ID, d.center, c);
    const hp = Math.round(
      d.hp * (1 + d.hpPerPlayer * Math.max(0, w.heroes.size - 1)),
    );
    Object.assign(b, {
      controlled: true,
      bossEncounter: true,
      forcedMovementImmune: true,
      archetypeId: VUONG_ID,
      hp,
      maxHp: hp,
    });
    b.stats = {
      ...c.creep,
      hp,
      defense: d.defense,
      radius: d.radius,
      speed: d.speed,
      xp: 0,
      gold: 0,
    };
    this.nextAction =
      this.nextSpecial =
      this.nextHazard =
        w.tick + this.ticks(d.openingMs, c);
    w.vuong = this;
    this.practiceNotes = this.notesTest(w);
    if (this.practiceNotes) {
      this.phase = 2;
      this.lightningHits = 3;
      b.provoked = true;
      b.hp = Math.ceil(b.maxHp * this.definition.notesHp);
    }
  }
  scaleParty(w: World) {
    const boss = w.creeps.get(VUONG_ID)!;
    const hp = Math.round(
      this.definition.hp *
        (1 + this.definition.hpPerPlayer * Math.max(0, w.heroes.size - 1)),
    );
    boss.maxHp = hp;
    boss.hp = this.notesTest(w) ? Math.ceil(hp * this.definition.notesHp) : hp;
    if (boss.stats) boss.stats.hp = hp;
  }
  limitIncoming(boss: Creep, damage: number) {
    if (this.practiceNotes) return 0;
    const d = this.definition;
    const shield = this.phase === 1 && this.lightningHits < 3;
    const reduction = shield
      ? d.shieldMultiplier
      : this.action?.skill === 'stars'
        ? d.starMultiplier
        : 1;
    const floor =
      this.phase === 1
        ? Math.ceil(boss.maxHp * d.phase2Hp) + (shield ? 1 : 0)
        : this.notesDone
          ? 0
          : 1;
    return Math.min(damage * reduction, Math.max(0, boss.hp - floor));
  }
  get wipeRequested() {
    return this.failedNotes;
  }
  private failedNotes = false;
  notesFailure: { beat: number; note: number; missed: string[] } | undefined;
  private noteMisses(w: World, stage: number): string[] {
    const seal = this.around(6, 142)[this.notes[stage - 1]!];
    return [...this.participants].filter((id) => {
      const h = w.heroes.get(id);
      return !seal || !h || h.hp <= 0 || distance(h, seal) > noteRadius;
    });
  }
  locked(id: string) {
    return this.controls.has(id);
  }
  participantLeft(id: string) {
    if (this.controls.delete(id)) this.qteFailed = true;
    this.burns.delete(id);
    this.participants.delete(id);
  }
  submitKey(
    w: World,
    id: string,
    castId: string,
    index: number,
    key: NamDeKey,
  ) {
    const q = this.controls.get(id)?.qte;
    if (
      !q ||
      !this.living(w).some((h) => h.id === id) ||
      q.id !== castId ||
      q.state !== 'pending' ||
      index !== q.index ||
      w.tick > q.until
    )
      return;
    if (q.keys[index] !== key) {
      q.state = 'wrong';
      this.qteFailed = true;
    } else if (++q.index === q.keys.length) q.state = 'success';
  }
  private move(
    b: Point,
    to: Point,
    speed: number,
    c: SimulationConfig,
    radius: number,
  ) {
    const heading = direction(to.x - b.x, to.y - b.y);
    const step = Math.min(distance(b, to), speed / c.tickRate);
    moveCircle(
      b,
      { x: heading.x * step, y: heading.y * step },
      radius,
      c.width,
      c.height,
      c.collision,
    );
    return heading;
  }
  private cue(
    w: World,
    c: SimulationConfig,
    kind: CueKind,
    p: Point,
    radius: number,
    delay: number,
    life: number,
    extra: Partial<Hazard> = {},
  ) {
    const at = w.tick + (delay ? this.ticks(delay, c) : 0);
    const e: Hazard = {
      id: ++this.serial,
      kind,
      x: p.x,
      y: p.y,
      radius,
      at,
      until: at + this.ticks(life, c),
      ...extra,
    };
    this.hazards.push(e);
    return e;
  }
  private hit(
    w: World,
    c: SimulationConfig,
    h: Hero,
    s: Skill,
    damage: number,
  ) {
    return hurt(w, h, VUONG_ID, vuongSkills[s], damage, c, {
      critChance: 0,
      critMultiplier: 1,
    });
  }
  private aim(b: Creep, target: Point) {
    const d = direction(target.x - b.x, target.y - b.y);
    if (!d.x && !d.y) return { x: b.fx, y: b.fy };
    b.fx = d.x;
    b.fy = d.y;
    return d;
  }
  private endOf(p: Point, d: Point, reach: number) {
    return { x: p.x + d.x * reach, y: p.y + d.y * reach };
  }
  private finishAction(w: World, c: SimulationConfig) {
    this.releasedAt = w.tick;
    this.action = undefined;
    this.nextAction = w.tick + this.ticks(this.definition.recoveryMs, c);
  }
  private start(
    w: World,
    c: SimulationConfig,
    b: Creep,
    skill: Main,
    target: Hero,
    heroes: Hero[],
  ) {
    const d = this.definition;
    const heading = this.aim(b, target);
    const a: Action = {
      skill,
      start: w.tick,
      next: w.tick,
      stage: 0,
      target: target.id,
      index: 0,
      direction: heading,
    };
    this.action = a;
    b.pose = 'cast';
    if (skill === 'thrust' || skill === 'slash' || skill === 'crescent') {
      a.next += this.ticks(skill === 'slash' ? 380 : 460, c);
      return;
    }
    announceBossSkill(w, VUONG_ID, vuongSkills[skill]);
    switch (skill) {
      case 'tam':
        a.next += this.ticks(350, c);
        break;
      case 'counter': {
        a.next += this.ticks(680, c);
        this.participants.clear();
        this.qteFailed = false;
        this.qteOutcome = '';
        for (const h of heroes) this.participants.add(h.id);
        break;
      }
      case 'elements':
        a.index = Math.floor(w.random() * 5);
        a.next += this.ticks(3900, c);
        break;
      case 'stars':
        Object.assign(b, d.center);
        a.next += this.ticks(300, c);
        break;
      case 'pulse':
        a.index = Math.floor(w.random() * 2);
        this.cue(
          w,
          c,
          a.index ? 'outer' : 'inner',
          b,
          a.index ? outerRadius : innerRadius,
          900,
          380,
          { skill },
        );
        a.next += this.ticks(900, c);
        break;
      case 'swords':
        Object.assign(b, d.center);
        this.swords = this.around(d.swordsCount, 158).map((point) => ({
          id: ++this.serial,
          point,
        }));
        this.nextDrain = w.tick + c.tickRate;
        this.nextFinger = w.tick + this.ticks(950, c);
        break;
      case 'notes': {
        const pool = [0, 1, 2, 3, 4, 5];
        for (let i = pool.length - 1; i > 0; --i) {
          const j = Math.floor(w.random() * (i + 1));
          [pool[i], pool[j]] = [pool[j]!, pool[i]!];
        }
        this.notes = [...pool, this.choose(w, pool.slice(0, -1))];
        this.participants.clear();
        for (const h of heroes) this.participants.add(h.id);
        a.next += this.ticks(d.notesReadMs, c);
        break;
      }
    }
  }
  private stepQte(
    w: World,
    c: SimulationConfig,
    b: Creep,
    a: Action,
    heroes: Hero[],
  ) {
    const center = this.definition.center;
    if (!a.stage) {
      // Resolve the short pull before granting the owner-filtered arrow controls.
      if (w.tick < a.next) {
        for (const h of heroes) {
          h.moveX = h.moveY = 0;
          this.move(h, center, 470, c, c.radius);
        }
        return;
      }
      Object.assign(b, center);
      a.stage = 1;
      a.next = w.tick + this.ticks(this.definition.qteMs, c);
      for (const h of heroes) {
        if (!this.participants.has(h.id)) continue;
        cancelOwnedEffects(w, h.id);
        this.controls.set(h.id, {
          stunUntil: 0,
          qte: {
            id: 'vtd:' + a.start,
            index: 0,
            keys: Array.from({ length: 4 }, () => this.choose(w, namDeKeys)),
            until: a.next,
            state: 'pending',
            anchor: { x: h.x, y: h.y },
          },
        });
      }
      return;
    }
    const alive = new Set(heroes.map((h) => h.id));
    const dropped = [...this.participants].some((id) => !alive.has(id));
    const controls = [...this.controls.values()];
    const complete = controls.every((v) => v.qte?.state === 'success');
    if (!this.qteFailed && !dropped && !complete && w.tick < a.next) return;
    const failed = this.qteFailed || dropped || !complete;
    this.controls.clear();
    this.participants.clear();
    this.qteOutcome = failed ? 'failed' : 'success';
    this.qteOutcomeUntil = w.tick + this.ticks(850, c);
    if (failed) {
      for (const h of heroes)
        hurt(
          w,
          h,
          VUONG_ID,
          vuongSkills.counter,
          Math.min(
            Math.max(0, h.hp - 1),
            h.maxHp * this.definition.qteFraction,
          ),
          c,
          {
            critChance: 0,
            critMultiplier: 1,
            unavoidableHpLoss: true,
            preserveFraction: true,
          },
        );
      this.cue(w, c, 'counter', center, 110, 0, 550, { index: 1 });
    }
    this.finishAction(w, c);
  }
  private stepSwords(w: World, c: SimulationConfig, b: Creep, heroes: Hero[]) {
    if (!this.swords.length) {
      this.finishAction(w, c);
      return;
    }
    if (w.tick >= this.nextDrain) {
      this.nextDrain += c.tickRate;
      for (const h of heroes)
        hurt(
          w,
          h,
          VUONG_ID,
          vuongSkills.swords,
          h.maxHp * this.definition.drainPerSword * this.swords.length,
          c,
          {
            critChance: 0,
            critMultiplier: 1,
            periodic: true,
            directHp: true,
            preserveFraction: true,
          },
        );
    }
    if (w.tick >= this.nextFinger && heroes.length) {
      const target = this.choose(w, heroes);
      this.cue(w, c, 'finger', b, 13, 620, 360, {
        skill: 'finger',
        end: this.endOf(b, this.aim(b, target), 430),
      });
      announceBossSkill(w, VUONG_ID, vuongSkills.finger);
      this.nextFinger = w.tick + this.ticks(2600, c);
    }
  }
  private stepAction(
    w: World,
    c: SimulationConfig,
    b: Creep,
    a: Action,
    heroes: Hero[],
  ) {
    const d = this.definition;
    if (a.skill === 'counter') return this.stepQte(w, c, b, a, heroes);
    if (a.skill === 'swords') return this.stepSwords(w, c, b, heroes);
    if (w.tick < a.next) return;
    const target = w.heroes.get(a.target);
    const liveTarget = target?.hp && target.hp > 0 ? target : heroes[0];
    if (a.skill === 'thrust' || a.skill === 'crescent') {
      const velocity = this.endOf(
        { x: 0, y: 0 },
        a.direction,
        a.skill === 'thrust' ? 365 : 260,
      );
      this.cue(
        w,
        c,
        a.skill,
        this.endOf(b, a.direction, 23),
        a.skill === 'thrust' ? 10 : 34,
        0,
        1200,
        { skill: a.skill, velocity, hit: new Set() },
      );
    } else if (a.skill === 'slash') {
      this.arc(w, c, b, a.direction, a.skill, 94);
    } else if (a.skill === 'tam' || a.skill === 'stars') {
      const starStages = starLinks.length + 1;
      if (a.skill === 'stars' && a.stage < starStages) {
        const stars = this.stars(),
          stage = a.stage++;
        for (let group = 0; group < d.starGroups; group++) {
          const pair =
            stage < starLinks.length ? starLinks[stage]! : [eyeIndex, eyeIndex];
          const from = group * 7 + pair[0]!;
          const to =
            stage < starLinks.length
              ? group * 7 + pair[1]!
              : ((group + 1) % d.starGroups) * 7 + eyeIndex;
          if (from === to) continue;
          const start = stars[from]!,
            end = stars[to]!;
          const flightMs = (distance(start, end) / d.starSpeed) * 1000;
          this.cue(
            w,
            c,
            'starLine',
            start,
            12,
            d.starWarningMs,
            flightMs + 1000 / c.tickRate,
            { end, skill: 'stars', hit: new Set() },
          );
        }
        a.next = w.tick + this.ticks(d.starGapMs, c);
        return;
      }
      const stage = a.stage - (a.skill === 'stars' ? starStages : 0);
      if (stage < 2) {
        const sign = stage ? -1 : 1;
        const angle = Math.atan2(a.direction.y, a.direction.x) + sign * 0.64;
        this.arc(
          w,
          c,
          b,
          { x: Math.cos(angle), y: Math.sin(angle) },
          a.skill,
          112,
        );
        a.stage++;
        a.next = w.tick + this.ticks(stage ? 800 : 220, c);
        if (stage && a.skill === 'stars')
          announceBossSkill(w, VUONG_ID, vuongSkills.break);
        return;
      }
      if (stage === 2) {
        if (liveTarget) a.direction = this.aim(b, liveTarget);
        const warned = this.cue(w, c, 'tam', b, 20, 840, 330, {
          skill: a.skill === 'stars' ? 'break' : 'tam',
          end: this.endOf(b, a.direction, 420),
        });
        a.stage++;
        a.next = warned.until;
        return;
      }
    } else if (a.skill === 'elements') {
      const safe = this.around(5, 123)[vuongCounters[a.index]!]!;
      for (const h of heroes) {
        if (distance(h, safe) <= elementRadius) continue;
        const amount = d.damage.elements;
        if (a.index === 0) {
          for (let i = 0; i < 3; i++) this.hit(w, c, h, 'elements', amount / 3);
        } else {
          this.hit(w, c, h, 'elements', a.index === 4 ? amount * 1.4 : amount);
        }
        if (h.hp <= 0) continue;
        if (a.index === 1)
          applyStatus(
            h,
            { kind: 'root', durationTicks: this.ticks(700, c), magnitude: 1 },
            VUONG_ID,
            vuongSkills.elements,
            w.tick,
          );
        if (a.index === 2)
          this.move(
            h,
            this.endOf(h, direction(h.x - b.x, h.y - b.y), 45),
            45 * c.tickRate,
            c,
            c.radius,
          );
        if (a.index === 3)
          this.burns.set(h.id, { next: w.tick + c.tickRate, remaining: 3 });
      }
      const seals = this.around(5, 123);
      seals.forEach((point, index) => {
        if (index !== vuongCounters[a.index])
          this.cue(w, c, 'elements', point, elementRadius, 0, 500, {
            index: a.index,
          });
      });
    } else if (a.skill === 'pulse' && !a.stage++) {
      this.cue(
        w,
        c,
        a.index ? 'inner' : 'outer',
        b,
        a.index ? innerRadius : outerRadius,
        1080,
        370,
        { skill: 'pulse' },
      );
      a.next = w.tick + this.ticks(1230, c);
      return;
    } else if (a.skill === 'notes') {
      if (!a.stage) {
        a.stage = 1;
        a.next = w.tick + this.ticks(d.beatMs, c);
        return;
      }
      const missed = this.noteMisses(w, a.stage);
      if (missed.length) {
        this.failedNotes = true;
        this.notesFailure = {
          beat: a.stage,
          note: this.notes[a.stage - 1]!,
          missed,
        };
      } else if (a.stage++ < this.notes.length) {
        a.next = w.tick + this.ticks(d.beatMs, c);
        return;
      } else this.notesDone = true;
      this.participants.clear();
      this.notes = [];
    }
    this.finishAction(w, c);
  }
  private arc(
    w: World,
    c: SimulationConfig,
    b: Creep,
    d: Point,
    skill: 'slash' | 'tam' | 'stars',
    radius: number,
  ) {
    for (const h of this.living(w))
      if (
        distance(b, h) <= radius &&
        (h.x - b.x) * d.x + (h.y - b.y) * d.y >= 0
      )
        this.hit(w, c, h, skill, this.definition.damage[skill]);
    this.cue(w, c, 'slash', b, radius, 0, 300, {
      end: this.endOf(b, d, radius),
    });
  }
  private stepHazards(
    w: World,
    c: SimulationConfig,
    boss: Creep,
    heroes: Hero[],
  ) {
    const d = this.definition;
    this.hazards = this.hazards.filter((e) => e.until > w.tick);
    for (const e of this.hazards) {
      if (w.tick < e.at || e.resolved) continue;
      if (e.velocity) {
        const next = this.endOf(e, e.velocity, 1 / c.tickRate);
        for (const h of heroes) {
          if (
            e.hit!.has(h.id) ||
            segmentCircle(e, next, h, e.radius + c.radius) === undefined
          )
            continue;
          e.hit!.add(h.id);
          this.hit(w, c, h, e.skill!, d.damage[e.skill!]);
        }
        Object.assign(e, next);
        continue;
      }
      if (e.kind === 'starLine' && e.end) {
        const before = vuongStarLight(e, w.tick - 1),
          after = vuongStarLight(e, w.tick);
        for (const h of heroes)
          if (
            !e.hit!.has(h.id) &&
            segmentCircle(before, after, h, e.radius + c.radius) !== undefined
          ) {
            e.hit!.add(h.id);
            this.hit(w, c, h, 'stars', d.damage.stars);
          }
        continue;
      }
      e.resolved = true;
      if (e.kind === 'lightning') {
        if (distance(e, boss) <= e.radius && this.lightningHits < 3) {
          if (++this.lightningHits === 3)
            this.cue(
              w,
              c,
              'shatter',
              { x: boss.x, y: boss.y - 27 },
              47,
              0,
              650,
            );
        }
        for (const h of heroes)
          if (distance(e, h) <= e.radius)
            this.hit(w, c, h, 'shield', d.damage.lightning);
      }
      if (!e.skill) continue;
      if (
        e.skill === 'break' &&
        segmentCircle(
          e,
          e.end!,
          this.stars()[eyeIndex]!,
          e.radius + starRadius,
        ) !== undefined
      ) {
        this.exposedUntil = w.tick + this.ticks(d.exposedMs, c);
        this.cue(w, c, 'shatter', this.stars()[eyeIndex]!, 38, 0, 500);
        this.finishAction(w, c);
        this.nextAction = this.exposedUntil;
      }
      if (e.skill === 'finger') {
        const hit = this.swords
          .map((s) => ({
            ...s,
            t: segmentCircle(e, e.end!, s.point, e.radius + 12),
          }))
          .filter((s) => s.t !== undefined)
          .sort((a, b) => a.t! - b.t!)[0];
        if (hit) {
          this.swords = this.swords.filter((s) => s.id !== hit.id);
          this.cue(w, c, 'shatter', hit.point, 32, 0, 530);
        }
      }
      const damage = d.damage[e.skill];
      for (const h of heroes) {
        const gap = distance(h, e);
        const hit = e.end
          ? segmentCircle(e, e.end, h, e.radius + c.radius) !== undefined
          : e.kind === 'outer'
            ? gap > innerRadius && gap <= e.radius
            : gap <= e.radius;
        if (hit) this.hit(w, c, h, e.skill, damage);
      }
    }
  }
  private stepAmbient(w: World, c: SimulationConfig, b: Creep, heroes: Hero[]) {
    const d = this.definition;
    if (this.notesTest(w) || w.tick < this.nextHazard || !heroes.length) return;
    if (this.phase === 1 && this.lightningHits < 3) {
      const target = this.choose(w, heroes);
      const dir = direction(target.x - b.x, target.y - b.y);
      const fallback = direction(d.center.x - b.x, d.center.y - b.y);
      const point =
        distance(target, b) >= 45
          ? this.endOf(b, dir, Math.min(distance(target, b), 115))
          : this.endOf(
              b,
              fallback.x || fallback.y ? fallback : { x: 1, y: 0 },
              55,
            );
      this.cue(w, c, 'lightning', point, 41, d.lightningMs, 420);
      this.nextHazard = w.tick + this.ticks(d.lightningGapMs, c);
    } else if (this.phase === 2) {
      // Central paths between notes, sword anchors and the eye remain open.
      const special =
        this.action && ['stars', 'swords', 'notes'].includes(this.action.skill);
      const point = this.choose(
        w,
        this.around(14, special ? 245 : this.choose(w, [75, 156, 240])),
      );
      this.cue(w, c, 'rain', point, 25, d.rainMs, 420, { skill: 'rain' });
      this.nextHazard = w.tick + this.ticks(d.rainGapMs, c);
    }
  }
  step(w: World, c: SimulationConfig) {
    if (!bossFightReady(w, c)) return;
    const b = w.creeps.get(VUONG_ID);
    if (!b || this.state !== 'fighting' || b.hp <= 0 || this.failedNotes)
      return;
    const d = this.definition;
    const heroes = this.living(w);
    if (!heroes.length) return;
    if (this.phase === 1 && !this.shieldAnnounced) {
      this.shieldAnnounced = true;
      announceBossSkill(w, VUONG_ID, vuongSkills.shield);
    }
    if (
      this.phase === 1 &&
      this.lightningHits === 3 &&
      b.hp <= Math.ceil(b.maxHp * d.phase2Hp)
    ) {
      this.enterPhaseTwo(w, c);
    }
    this.stepAmbient(w, c, b, heroes);
    this.stepHazards(w, c, b, heroes);
    for (const [id, burn] of this.burns) {
      const h = w.heroes.get(id);
      if (!h || h.hp <= 0) this.burns.delete(id);
      else if (w.tick >= burn.next) {
        this.hit(w, c, h, 'elements', d.damage.elements * 0.23);
        burn.next += c.tickRate;
        if (--burn.remaining <= 0) this.burns.delete(id);
      }
    }
    if (this.action)
      return this.stepAction(w, c, b, this.action, this.living(w));
    if (w.tick < this.nextAction) {
      if (w.tick >= this.transitionUntil) b.pose = 'idle';
      return;
    }
    const target = heroes
      .filter((h) => h.hp > 0 && !hasStatus(h, 'concealed', w.tick))
      .sort((a, other) => distance(a, b) - distance(other, b))[0];
    if (!target) return;
    if (this.notesTest(w)) {
      if (!this.notesDone) this.start(w, c, b, 'notes', target, heroes);
      else b.pose = 'idle';
      return;
    }
    if (this.phase === 1 && this.lightningHits < 3) {
      if (distance(b, target) > d.shieldHoldRange) {
        const v = this.move(b, target, d.shieldMoveSpeed, c, d.radius);
        b.fx = v.x;
        b.fy = v.y;
        b.pose = 'walk';
      } else b.pose = 'idle';
      return;
    }
    if (this.phase === 2 && !this.notesDone && b.hp <= b.maxHp * d.notesHp)
      return this.start(w, c, b, 'notes', target, heroes);
    if (w.tick >= this.nextSpecial) {
      const list = this.phase === 1 ? rotation1 : rotation2;
      this.nextSpecial = w.tick + this.ticks(5900, c);
      return this.start(
        w,
        c,
        b,
        list[this.rotation++ % list.length]!,
        target,
        heroes,
      );
    }
    if (distance(b, target) > 130 && this.basics % 3 === 1) {
      const v = this.move(b, target, d.speed, c, d.radius);
      b.fx = v.x;
      b.fy = v.y;
      b.pose = 'walk';
      return;
    }
    this.start(
      w,
      c,
      b,
      (['thrust', 'slash', 'crescent'] as const)[this.basics++ % 3]!,
      target,
      heroes,
    );
  }
  private enterPhaseTwo(w: World, c: SimulationConfig): void {
    this.clearTransient(w);
    this.phase = 2;
    this.transitionUntil = w.tick + this.ticks(1100, c);
    this.nextAction = this.nextSpecial = this.transitionUntil;
    this.nextHazard = w.tick;
    this.rotation = 0;
    w.creeps.get(VUONG_ID)!.pose = 'cast';
  }
  startPhaseTwoTest(w: World, c: SimulationConfig): boolean {
    const boss = w.creeps.get(VUONG_ID);
    if (
      !w.waveBossTest?.progression ||
      w.waveBossTest.stage !== VUONG_ID ||
      this.phase !== 1 ||
      this.state !== 'fighting' ||
      !boss ||
      boss.hp <= 0
    )
      return false;
    this.lightningHits = 3;
    boss.hp = Math.min(
      boss.hp,
      Math.ceil(boss.maxHp * this.definition.phase2Hp),
    );
    Object.assign(boss, this.definition.center);
    this.enterPhaseTwo(w, c);
    return true;
  }
  private clearTransient(w: World) {
    this.action = undefined;
    this.hazards = [];
    this.swords = [];
    this.controls.clear();
    this.burns.clear();
    this.notes = [];
    this.participants.clear();
    this.qteOutcome = '';
    for (const h of w.heroes.values())
      h.statuses = h.statuses?.filter((s) => s.sourceId !== VUONG_ID) ?? [];
  }
  clear(w: World) {
    this.clearTransient(w);
    this.state = 'retry';
    w.creeps.delete(VUONG_ID);
  }
  defeat(w: World, c: SimulationConfig) {
    const b = w.creeps.get(VUONG_ID);
    if (!b || b.hp > 0 || this.state !== 'fighting') return false;
    this.state = 'defeated';
    this.clearTransient(w);
    b.pose = 'death';
    this.corpseUntil = w.tick + this.ticks(900, c);
    const d = this.definition;
    const eligible = this.living(w).filter((h) => b.hits[h.id] !== undefined);
    eligible.forEach((h, i) => {
      if (c.campaign) return;
      const share = (n: number) =>
        Math.floor(n / eligible.length) + Number(i < n % eligible.length);
      gainExperience(h, share(d.xp), c);
      h.gold += share(d.gold);
    });
    return true;
  }
  view(w: World, c: SimulationConfig) {
    const b = w.creeps.get(VUONG_ID)!;
    const a = this.action;
    return {
      tick: w.tick,
      rate: c.tickRate,
      phase: this.phase,
      notesTest: this.notesTest(w),
      notesComplete: this.notesDone,
      noteReadyIds:
        a?.skill === 'notes' && a.stage > 0
          ? [...this.participants].filter(
              (id) => !this.noteMisses(w, a.stage).includes(id),
            )
          : [],
      noteParticipants: this.participants.size,
      state: this.state,
      x: b.x,
      y: b.y,
      fx: b.fx,
      fy: b.fy,
      hp: b.hp,
      maxHp: b.maxHp,
      pose: b.pose,
      center: this.definition.center,
      shield: this.phase === 1 ? 3 - this.lightningHits : 0,
      transitionUntil: this.transitionUntil,
      exposedUntil: this.exposedUntil,
      corpseUntil: this.corpseUntil,
      qteOutcome: w.tick < this.qteOutcomeUntil ? this.qteOutcome : '',
      action: a
        ? {
            skill: a.skill,
            start: a.start,
            next: a.next,
            stage: a.stage,
            index: a.index,
          }
        : null,
      releasedAt: this.releasedAt,
      elements: a?.skill === 'elements' ? this.around(5, 123) : [],
      stars: a?.skill === 'stars' ? this.stars() : [],
      eyeIndex,
      elementRadius,
      noteRadius,
      innerRadius,
      outerRadius,
      swords: this.swords,
      noteSeals: a?.skill === 'notes' ? this.around(6, 142) : [],
      notes: a?.skill === 'notes' ? this.notes : [],
      cues: this.hazards.map(
        ({ id, kind, x, y, radius, end, at, until, index, velocity }) => ({
          id,
          kind,
          x,
          y,
          radius,
          end,
          at,
          until,
          index,
          velocity,
        }),
      ),
    };
  }
}
export type VuongView = ReturnType<VuongEncounter['view']>;
