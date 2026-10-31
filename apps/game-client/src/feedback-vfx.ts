import Phaser from 'phaser';
import type { CombatEvent } from '@volam/game-core';
import type { LobbyState } from '@volam/game-protocol';
import { rasterAnimationKey } from './skill-art-registry.js';
import {
  feedbackArt,
  feedbackComponents,
  feedbackTag,
  headings,
  eightFacing,
  artRef,
  type ArtRef,
  type FeedbackAnimation,
} from './feedback-art.js';
import {
  feedbackBindings,
  basicFeedbackArt,
  type SustainBinding,
} from './feedback-bindings.js';

type Actor = {
  x: number;
  y: number;
  fx: number;
  fy: number;
  hp: number;
  statuses: string;
  zoneId: string;
  pose?: string;
  mana?: number;
  maxHp?: number;
  schoolId?: string;
  basicId?: string;
  castAbilityId?: string;
  basicCooldown?: number;
  build?: { stats: { attackSpeed: number; hpRegen: number } };
};
type Status = { kind: string; abilityId: string; until?: number };
type Point = { x: number; y: number };
interface Fx {
  sprite: Phaser.GameObjects.Sprite;
  ref: ArtRef;
  tag: FeedbackAnimation;
  owner: string;
  skill: string;
  impact: boolean;
  review: boolean;
  offset: [number, number];
  queue: ArtRef[];
  playbackScale: number;
  cadenceTotalMs: number | undefined;
}
interface Persistent {
  view: Fx;
  definition: SustainBinding;
  fx: number;
  fy: number;
  complete: (() => void) | undefined;
}
interface Shot {
  view: Fx;
  owner: string;
  skill: string;
  leg: string;
  stage: string;
  fx: number;
  fy: number;
}
interface Pose {
  ref: ArtRef;
  tag: FeedbackAnimation;
  skill: string;
  started: number;
  duration: number;
  token: string;
  fx: number;
  fy: number;
  basic: boolean;
  startFrame: number;
  loopRef: ArtRef | undefined;
  endingRef: ArtRef | undefined;
  looping: boolean;
  receivedTick: number;
  cadenceSynced: boolean;
  waitingStrike: boolean;
}
export interface FeedbackPose {
  texture: string;
  animation: string;
  origin: [number, number];
  firstFrame: string;
  scale: number;
  durationMs: number;
  token: string;
  timeScale: number;
  startFrame: number;
}
const statuses = (a: Actor): Status[] =>
  JSON.parse(a.statuses || '[]') as Status[];
const actorPoint = (a: Actor): Point => ({ x: a.x, y: a.y });
/** Raster presentation driven only by received combat events, projected actors, statuses and shots. */
export class FeedbackVfx {
  private state: LobbyState | undefined;
  private zone = 'arena';
  private transient = new Set<Fx>();
  private persistent = new Map<string, Persistent>();
  private shots = new Map<string, Shot>();
  private recentShots: Array<{
    owner: string;
    skill: string;
    leg: string;
    x: number;
    y: number;
    at: number;
  }> = [];
  private poses = new Map<string, Pose>();
  private cuts = new Map<string, number>();
  private basicIds = new Map<string, string>();
  private queuedReactions = new Map<
    string,
    { ref: ArtRef; fx: number; fy: number; until: number }
  >();
  private manualOff = new Map<string, number>();
  private areaDistances = new Map<string, number>();
  private reactions = new Map<string, number>();
  private empowered = new Map<string, number>();
  private health = new Map<
    string,
    { hp: number; zone: string; healingUntil: number }
  >();
  private observed = new Set<string>();
  private played = new Set<string>();
  private completions = new Map<string, number>();
  private timings = new Map<string, Array<{ frame: string; at: number }>>();
  private events: Array<{
    id: number;
    kind: string;
    skill: string;
    stage: string;
    at: number;
  }> = [];
  private serial = 0;
  constructor(private scene: Phaser.Scene) {}
  handles(id: string): boolean {
    return !!feedbackBindings[id];
  }
  suppressesCastPose(id: string): boolean {
    return this.manualOff.has(id);
  }
  suppressesStatus(id: string, kind: string): boolean {
    const b = feedbackBindings[id];
    return (
      !!b &&
      (kind === 'channel' ||
        kind === 'dash' ||
        (id === 'luc_duong_chuong' && kind === 'damage_reduction') ||
        !!b.sustain?.some((d) => d.kinds.includes(kind)))
    );
  }
  private actor(id: string): Actor | undefined {
    return this.state?.players.get(id) ?? this.state?.creeps.get(id);
  }
  private record(v: Fx): void {
    const f = String(v.sprite.frame.name),
      key = v.ref.asset + ':' + f;
    this.observed.add(key);
    const clip = v.ref.asset + ':' + v.tag.name,
      list = this.timings.get(clip) ?? [];
    if (list.length < 24) {
      list.push({ frame: f, at: this.scene.time.now });
      this.timings.set(clip, list);
    }
  }
  observeCharacter(texture: string, frame: string): void {
    if (feedbackComponents.has(texture)) {
      this.observed.add(texture + ':' + frame);
      this.played.add(texture + ':character');
    }
  }
  private place(v: Fx, p: Point): void {
    const offset = v.tag.effectPlacementOffset;
    v.sprite
      .setPosition(
        Math.round(p.x + offset[0] + v.offset[0]),
        Math.round(p.y + offset[1] + v.offset[1]),
      )
      .setDepth(
        v.sprite.texture.key.endsWith('_ground') ? p.y - 0.3 : p.y + 0.4,
      );
  }
  private play(
    v: Fx,
    ref: ArtRef,
    fx: number,
    fy: number,
    repeat?: number,
  ): boolean {
    const tag = feedbackTag(ref, fx, fy);
    if (!tag) return false;
    v.ref = ref;
    v.tag = tag;
    v.sprite
      .setTexture(ref.asset, tag.frames[0]!)
      .setOrigin(...tag.origin)
      .setScale(feedbackComponents.get(ref.asset)?.displayScale ?? 1);
    v.sprite.play({
      key: rasterAnimationKey(ref.asset, tag.name),
      ...(repeat === undefined ? {} : { repeat }),
    });
    v.sprite.anims.timeScale = 1;
    this.played.add(rasterAnimationKey(ref.asset, tag.name));
    this.record(v);
    return true;
  }
  private make(
    ref: ArtRef,
    p: Point,
    fx: number,
    fy: number,
    owner: string,
    skill: string,
    impact = false,
    offset: [number, number] = [0, 0],
    review = false,
  ): Fx | undefined {
    const tag = feedbackTag(ref, fx, fy);
    if (!tag) return;
    const sprite = this.scene.add
      .sprite(p.x, p.y, ref.asset, tag.frames[0]!)
      .setName('feedback-v2:' + skill);
    const v: Fx = {
      sprite,
      ref,
      tag,
      owner,
      skill,
      impact,
      review,
      offset,
      queue: [],
      playbackScale: 1,
      cadenceTotalMs: undefined,
    };
    sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => this.record(v));
    sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      const key = v.ref.asset + ':' + v.tag.name;
      this.completions.set(key, (this.completions.get(key) ?? 0) + 1);
    });
    this.play(v, ref, fx, fy);
    this.place(v, p);
    return v;
  }
  private destroy(v: Fx): void {
    this.transient.delete(v);
    v.sprite.destroy();
  }
  private sequence(
    refs: ArtRef[],
    e: CombatEvent,
    p: Point = e,
    impact = e.kind === 'hit',
    offset: [number, number] = [0, 0],
    duration?: number,
  ): Fx | undefined {
    const [first, ...rest] = refs;
    if (!first) return;
    const v = this.make(
      first,
      p,
      e.fx ?? 1,
      e.fy ?? 0,
      e.sourceId,
      e.abilityId,
      impact,
      offset,
    );
    if (!v) return;
    v.queue = rest;
    this.transient.add(v);
    const totalMs = refs.reduce(
      (n, ref) =>
        n + (feedbackTag(ref, e.fx ?? 1, e.fy ?? 0)?.durationMsTotal ?? 0),
      0,
    );
    v.playbackScale = duration ? totalMs / duration : 1;
    v.cadenceTotalMs = duration && e.kind === 'attack' ? totalMs : undefined;
    v.sprite.anims.timeScale = v.playbackScale;
    const next = () => {
      const ref = v.queue.shift();
      if (ref && v.sprite.active) {
        this.play(v, ref, e.fx ?? 1, e.fy ?? 0, 0);
        v.sprite.anims.timeScale = v.playbackScale;
        this.place(v, p);
        v.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, next);
      } else this.destroy(v);
    };
    // One-shot events must never inherit an infinite source loop.
    v.sprite.anims.repeat = 0;
    v.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, next);
    return v;
  }
  private pose(
    owner: string,
    skill: string,
    ref: ArtRef,
    e: CombatEvent,
    duration?: number,
    basic = false,
    startFrame = 0,
    loopRef?: ArtRef,
    endingRef?: ArtRef,
    waitingStrike = false,
  ): void {
    const tag = feedbackTag(ref, e.fx ?? 1, e.fy ?? 0);
    if (!tag) return;
    const actor = this.actor(owner),
      pack = feedbackComponents.get(ref.asset)?.handoffId ?? '';
    const school = pack.startsWith('thien_son')
      ? 'thien_son'
      : pack.startsWith('vo_dang')
        ? 'vo_dang'
        : pack.startsWith('thieu_lam')
          ? 'thieu_lam'
          : 'cai_bang';
    // Mixed-school skills retain the owner's costume; only their VFX is shared.
    if (actor?.schoolId && actor.schoolId !== school) return;
    this.poses.set(owner, {
      ref,
      tag,
      skill,
      started: this.scene.time.now,
      duration:
        duration ??
        tag.frameDurationsMs.slice(startFrame).reduce((n, t) => n + t, 0),
      token: 'feedback:' + e.id + ':' + ++this.serial,
      fx: e.fx ?? 1,
      fy: e.fy ?? 0,
      basic,
      startFrame,
      loopRef,
      endingRef,
      looping: false,
      receivedTick: this.state?.tick ?? 0,
      cadenceSynced: false,
      waitingStrike,
    });
    if (waitingStrike) {
      const key = rasterAnimationKey(ref.asset, tag.name) + ':anticipation',
        end = tag.contactFrames?.[0] ?? 1;
      if (!this.scene.anims.exists(key))
        this.scene.anims.create({
          key,
          frames: tag.frames.slice(0, end).map((frame, i) => ({
            key: ref.asset,
            frame,
            duration: tag.frameDurationsMs[i]!,
          })),
          frameRate: 1000,
          repeat: 0,
        });
    }
  }
  private cue(owner: string, skill: string, ref: ArtRef, fx = 1, fy = 0): void {
    this.pose(owner, skill, ref, {
      id: 0,
      kind: 'pulse',
      sourceId: owner,
      targetId: '',
      abilityId: skill,
      x: 0,
      y: 0,
      damage: 0,
      critical: false,
      fx,
      fy,
    });
  }
  event(e: CombatEvent): boolean {
    const b = feedbackBindings[e.abilityId];
    if (!b) return false;
    this.events.push({
      id: e.id,
      kind: e.kind,
      skill: e.abilityId,
      stage: e.stage ?? '',
      at: this.scene.time.now,
    });
    if (this.events.length > 1500) this.events.shift();
    const a = this.actor(e.sourceId);
    if ((!a || a.zoneId !== this.zone) && e.kind !== 'hit') return true;
    const at = a ? actorPoint(a) : { x: e.x, y: e.y };
    if (e.kind === 'attack') {
      this.poses.delete(e.sourceId);
      if (this.basicIds.get(e.sourceId) !== e.abilityId) {
        this.cuts.delete(e.sourceId);
        this.basicIds.set(e.sourceId, e.abilityId);
      }
      for (const v of this.transient)
        if (
          v.owner === e.sourceId &&
          v.skill === e.abilityId &&
          !v.impact &&
          !v.review
        )
          this.destroy(v);
      const count = (this.cuts.get(e.sourceId) ?? 0) + 1;
      this.cuts.set(e.sourceId, count);
      const basic = basicFeedbackArt(e.abilityId, e.stage ?? '', count);
      if (basic) {
        const duration = Math.max(
          basic.floorMs,
          basic.baseMs / (1 + (a?.build?.stats.attackSpeed ?? 0)),
        );
        if (basic.ref)
          this.pose(e.sourceId, e.abilityId, basic.ref, e, duration, true);
        if (basic.effect)
          this.sequence([basic.effect], e, at, false, [0, 0], duration);
        if (basic.effects)
          this.sequence(basic.effects, e, at, false, [0, 0], duration);
      }
      if (b.release) this.sequence(b.release, e, at, false);
    }
    if (e.kind === 'cast') {
      this.empowered.delete(e.sourceId + ':' + e.abilityId);
      if (e.stage === 'toggle_off') {
        this.manualOff.set(e.sourceId, this.scene.time.now);
        this.poses.delete(e.sourceId);
        return true;
      }
      if (e.abilityId === 'thai_cuc_than_cong' && (a?.mana ?? 0) <= 0)
        this.sequence(
          [artRef('vo_dang_shield_formation_v2', 'aura', 'mana_depleted')],
          e,
          at,
          false,
        );
      if (b.cast)
        this.pose(
          e.sourceId,
          e.abilityId,
          b.cast,
          e,
          undefined,
          false,
          0,
          b.loopCharacter,
          b.endingCharacter,
          b.releaseOnStrike,
        );
      if (b.release && !b.releaseOnStrike)
        this.sequence(
          b.release,
          e,
          at,
          false,
          e.abilityId === 'cam_long_cong'
            ? [(e.fx ?? 1) * 75, (e.fy ?? 0) * 75 - 20]
            : [0, 0],
        );
    }
    if (e.kind === 'hit' && b.impact) {
      let refs =
        e.stage === 'empowered' && b.empowered ? b.empowered.impact : b.impact;
      if (e.abilityId === 'thien_son_phien') {
        const nearby = [...this.shots.values()]
          .filter((s) => s.owner === e.sourceId && s.skill === e.abilityId)
          .map((s) => ({ leg: s.leg, x: s.view.sprite.x, y: s.view.sprite.y }))
          .concat(
            this.recentShots.filter(
              (s) => s.owner === e.sourceId && s.skill === e.abilityId,
            ),
          );
        const closest = nearby.sort(
          (p, q) =>
            Math.hypot(p.x - e.x, p.y - e.y) - Math.hypot(q.x - e.x, q.y - e.y),
        )[0];
        refs = [
          artRef(
            'thien_son_fan_v2',
            'impact',
            closest?.leg === 'return' ? 'return_hit' : 'outbound_hit',
          ),
        ];
      }
      this.sequence(refs, e);
    }
    if (e.kind === 'pulse' || e.kind === 'effect') {
      const key = e.sourceId + ':' + e.abilityId;
      if (
        e.stage === 'combo_empowered' &&
        b.empowered &&
        !this.empowered.has(key)
      ) {
        this.empowered.set(key, this.scene.time.now);
        for (const v of this.transient)
          if (
            v.owner === e.sourceId &&
            v.skill === e.abilityId &&
            !v.impact &&
            !v.review
          )
            this.destroy(v);
        const ref = b.empowered.cast,
          tag = feedbackTag(ref, e.fx ?? 1, e.fy ?? 0);
        this.pose(
          e.sourceId,
          e.abilityId,
          ref,
          e,
          undefined,
          false,
          tag?.contactFrames?.[0] ?? 0,
        );
        this.sequence(b.empowered.release, e, at, false);
        this.sequence([b.empowered.ground], e, at, true);
      }
      if (
        e.stage === 'strike' &&
        b.releaseOnStrike &&
        !this.empowered.has(key)
      ) {
        if (b.cast) {
          const tag = feedbackTag(b.cast, e.fx ?? 1, e.fy ?? 0);
          this.pose(
            e.sourceId,
            e.abilityId,
            b.cast,
            e,
            undefined,
            false,
            tag?.contactFrames?.[0] ?? 0,
          );
        }
        if (b.release) this.sequence(b.release, e, at, false);
      }
      if (e.abilityId === 'thai_cuc_than_cong' && e.stage === 'absorb') {
        const key = 'status:' + e.sourceId + ':thai_cuc_than_cong:0',
          ref = artRef('vo_dang_shield_formation_v2', 'aura', 'mana_absorb');
        if (!this.react(key, ref, e.fx ?? 1, e.fy ?? 0))
          this.queuedReactions.set(key, {
            ref,
            fx: e.fx ?? 1,
            fy: e.fy ?? 0,
            until: this.scene.time.now + 250,
          });
      }
      if (e.stage === 'toggle_off') {
        this.manualOff.set(e.sourceId, this.scene.time.now);
        this.poses.delete(e.sourceId);
      }
      if (e.stage === 'control' && b.control) {
        const existing = [...this.transient].find(
          (v) =>
            v.owner === e.sourceId &&
            v.skill === e.abilityId &&
            v.ref.prefix === 'claw_extend',
        );
        if (existing) {
          if (!existing.queue.length) existing.queue.push(b.control);
        } else
          this.sequence([b.control], e, at, false, [
            (e.fx ?? 1) * 75,
            (e.fy ?? 0) * 75 - 20,
          ]);
      }
      const refs = b.pulses?.[e.stage ?? ''];
      if (refs)
        this.sequence(
          refs,
          e,
          ['refund', 'absorb', 'mitigate'].includes(e.stage ?? '') ? at : e,
          false,
        );
      if (e.stage === 'counter' && b.counterCharacter)
        this.cue(
          e.sourceId,
          e.abilityId,
          b.counterCharacter,
          e.fx ?? 1,
          e.fy ?? 0,
        );
      if (e.stage === 'finisher' && b.finisherCharacter)
        this.cue(
          e.sourceId,
          e.abilityId,
          b.finisherCharacter,
          e.fx ?? 1,
          e.fy ?? 0,
        );
      if (e.stage === 'finisher' && b.endingCharacter)
        this.cue(
          e.sourceId,
          e.abilityId,
          b.endingCharacter,
          e.fx ?? 1,
          e.fy ?? 0,
        );
    }
    return true;
  }
  actorCast(
    id: string,
    pose: string,
    fx: number,
    fy: number,
    hp: number,
  ): FeedbackPose | undefined {
    let pending = this.poses.get(id);
    if (
      hp <= 0 ||
      this.state?.phase === 'DEFEAT' ||
      pose === 'death' ||
      (['hurt', 'walk'].includes(pose) &&
        (!pending || this.scene.time.now - pending.started > 100))
    ) {
      this.poses.delete(id);
      return;
    }
    if (!pending && ['channel', 'cast'].includes(pose)) {
      const a = this.actor(id),
        s =
          a &&
          statuses(a).find(
            (s) =>
              s.kind === 'channel' &&
              feedbackBindings[s.abilityId]?.loopCharacter,
          );
      if (s) {
        const b = feedbackBindings[s.abilityId]!;
        // Snapshot already describes an active channel: do not replay its anticipation.
        this.cue(id, s.abilityId, b.loopCharacter!, fx, fy);
        pending = this.poses.get(id);
        if (pending) {
          pending.looping = true;
          pending.loopRef = b.loopCharacter;
          pending.endingRef = b.endingCharacter;
        }
      }
    }
    if (!pending) return;
    const skill = pending.skill;
    const a = this.actor(id),
      b = feedbackBindings[skill],
      active =
        a &&
        statuses(a).some(
          (s) => s.abilityId === skill && ['channel', 'dash'].includes(s.kind),
        );
    if (
      pending.waitingStrike &&
      !active &&
      this.scene.time.now - pending.started > 650
    ) {
      this.poses.delete(id);
      return;
    }
    if (
      !pending.waitingStrike &&
      this.scene.time.now >= pending.started + pending.duration
    ) {
      if (active && pending.loopRef && !pending.looping) {
        const tag = feedbackTag(pending.loopRef, pending.fx, pending.fy);
        if (tag) {
          pending = {
            ...pending,
            ref: pending.loopRef,
            tag,
            looping: true,
            started: this.scene.time.now,
            duration: tag.durationMsTotal,
            token: pending.token + ':loop',
            startFrame: 0,
          };
          this.poses.set(id, pending);
        }
      } else if (pending.looping && active) {
        /* Loop lifetime is authoritative, not a frame count. */
      } else if (pending.looping && pending.endingRef) {
        this.cue(id, pending.skill, pending.endingRef, pending.fx, pending.fy);
        return this.actorCast(id, pose, fx, fy, hp);
      } else if (!pending.basic || pose !== 'basic_attack') {
        this.poses.delete(id);
        return;
      }
    }
    if (pending.looping && !active) {
      if (b?.endingCharacter) {
        this.cue(id, pending.skill, b.endingCharacter, pending.fx, pending.fy);
        return this.actorCast(id, pose, fx, fy, hp);
      }
      this.poses.delete(id);
      return;
    }
    const tag = pending.tag;
    return {
      texture: pending.ref.asset,
      animation:
        rasterAnimationKey(pending.ref.asset, tag.name) +
        (pending.waitingStrike ? ':anticipation' : ''),
      origin: tag.origin,
      firstFrame: tag.frames[pending.startFrame] ?? tag.frames[0]!,
      scale: feedbackComponents.get(pending.ref.asset)?.displayScale ?? 1,
      durationMs: pending.duration,
      token: pending.token,
      timeScale:
        tag.frameDurationsMs
          .slice(pending.startFrame)
          .reduce((n, t) => n + t, 0) / pending.duration,
      startFrame: pending.startFrame,
    };
  }
  private ensure(
    key: string,
    owner: string,
    skill: string,
    d: SustainBinding,
    p: Point,
    fx: number,
    fy: number,
  ): void {
    let current = this.persistent.get(key);
    if (!current) {
      const v = this.make(
        d.opening ?? d.loop,
        p,
        fx,
        fy,
        owner,
        skill,
        false,
        d.offset ?? [0, 0],
      );
      if (!v) return;
      current = { view: v, definition: d, fx, fy, complete: undefined };
      this.persistent.set(key, current);
      if (d.opening) {
        current.complete = () => {
          if (this.persistent.get(key)?.view === v) {
            this.play(v, d.loop, fx, fy, -1);
            this.place(v, p);
          }
        };
        v.sprite.once(
          Phaser.Animations.Events.ANIMATION_COMPLETE,
          current.complete,
        );
      }
    }
    current.view.offset = d.offset ?? [0, 0];
    this.place(current.view, p);
    const queued = this.queuedReactions.get(key);
    if (queued) {
      this.queuedReactions.delete(key);
      if (queued.until >= this.scene.time.now)
        this.react(key, queued.ref, queued.fx, queued.fy);
    }
  }
  private react(key: string, ref: ArtRef, fx: number, fy: number): boolean {
    const current = this.persistent.get(key);
    if (!current) return false;
    const v = current.view;
    if (current.complete)
      v.sprite.off(
        Phaser.Animations.Events.ANIMATION_COMPLETE,
        current.complete,
      );
    if (!this.play(v, ref, fx, fy, 0)) return false;
    current.complete = () => {
      if (this.persistent.get(key) === current)
        this.play(v, current.definition.loop, current.fx, current.fy, -1);
    };
    v.sprite.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE,
      current.complete,
    );
    return true;
  }
  private end(key: string, entry: Persistent, allowEnding: boolean): void {
    const { view: v, definition: d } = entry,
      a = this.actor(v.owner);
    if (allowEnding && d.ending && a && a.hp > 0 && a.zoneId === this.zone) {
      const ref =
        v.skill === 'thai_cuc_than_cong' &&
        a.mana !== undefined &&
        a.mana <= 0 &&
        !this.manualOff.has(v.owner)
          ? artRef('vo_dang_shield_formation_v2', 'aura', 'mana_depleted')
          : d.ending;
      this.sequence(
        [ref],
        {
          id: 0,
          kind: 'pulse',
          sourceId: v.owner,
          targetId: '',
          abilityId: v.skill,
          x: v.sprite.x - v.tag.effectPlacementOffset[0],
          y: v.sprite.y - v.tag.effectPlacementOffset[1],
          fx: entry.fx,
          fy: entry.fy,
          damage: 0,
          critical: false,
        },
        undefined,
        false,
      );
    }
    this.destroy(v);
    this.persistent.delete(key);
    this.queuedReactions.delete(key);
    if (key.startsWith('area:')) {
      const id = key.slice(5);
      this.reactions.delete(id);
      for (const probe of this.areaDistances.keys())
        if (probe.startsWith(id + ':')) this.areaDistances.delete(probe);
    }
  }
  sync(
    state: LobbyState | undefined,
    zone: string,
    renderPosition?: (id: string) => Point | undefined,
  ): void {
    this.state = state;
    this.zone = zone;
    if (!state || state.phase === 'DEFEAT') {
      this.clear();
      return;
    }
    const wanted = new Set<string>();
    for (const id of this.basicIds.keys()) {
      const a = this.actor(id);
      if (!a || a.hp <= 0 || a.zoneId !== zone) {
        this.cuts.delete(id);
        this.basicIds.delete(id);
      }
    }
    for (const id of this.health.keys()) {
      const a = this.actor(id);
      if (!a || a.hp <= 0 || a.zoneId !== zone) this.health.delete(id);
    }
    for (const key of this.empowered.keys()) {
      const a = this.actor(key.slice(0, key.indexOf(':')));
      if (!a || a.hp <= 0 || a.zoneId !== zone) this.empowered.delete(key);
    }
    for (const [id, p] of this.poses) {
      const a = this.actor(id);
      // The next projected cooldown is authoritative, including temporary AS.
      // This adjusts playback only; no command/input waits on the animation.
      if (
        a &&
        p.basic &&
        !p.cadenceSynced &&
        state.tick > p.receivedTick &&
        (a.basicCooldown ?? 0) > 0
      ) {
        p.duration =
          ((a.basicCooldown ?? 0) * 1000) / 30 +
          Math.max(0, this.scene.time.now - p.started);
        p.cadenceSynced = true;
        for (const v of this.transient)
          if (v.owner === id && v.skill === p.skill && v.cadenceTotalMs) {
            v.playbackScale = v.cadenceTotalMs / p.duration;
            v.sprite.anims.timeScale = v.playbackScale;
          }
      }
      if (
        !a ||
        a.hp <= 0 ||
        a.zoneId !== zone ||
        statuses(a).some((s) => s.kind === 'stun')
      )
        this.poses.delete(id);
      else if (a.basicId && a.basicId !== p.skill && p.basic)
        this.poses.delete(id);
    }
    for (const v of this.transient) {
      const a = this.actor(v.owner);
      if (!v.review && !v.impact && (!a || a.hp <= 0 || a.zoneId !== zone))
        this.destroy(v);
    }
    state.players.forEach((a, id) => {
      if (a.hp <= 0 || a.zoneId !== zone) return;
      const point = renderPosition?.(id) ?? a,
        ss = statuses(a);
      if (a.schoolId === 'thieu_lam') {
        const before = this.health.get(id),
          healing =
            before &&
            before.zone === zone &&
            a.hp > before.hp &&
            before.hp < a.maxHp &&
            a.build.stats.hpRegen > 0,
          healingUntil = healing
            ? this.scene.time.now + 650
            : (before?.healingUntil ?? 0);
        this.health.set(id, { hp: a.hp, zone, healingUntil });
        if (healingUntil > this.scene.time.now && a.hp < a.maxHp) {
          const key = 'regen:' + id;
          wanted.add(key);
          this.ensure(
            key,
            id,
            'dich_can_kinh',
            {
              kinds: [],
              opening: artRef(
                'thieu_lam_hands_combo_v2',
                'aura',
                'gentle_regen_opening',
              ),
              loop: artRef(
                'thieu_lam_hands_combo_v2',
                'aura',
                'gentle_regen_loop',
              ),
              ending: artRef(
                'thieu_lam_hands_combo_v2',
                'aura',
                'gentle_regen_ending',
              ),
            },
            point,
            a.fx,
            a.fy,
          );
        }
      }
      for (const [skill, b] of Object.entries(feedbackBindings)) {
        if (!b.sustain) continue;
        b.sustain.forEach((d, index) => {
          if (
            !ss.some((s) => s.abilityId === skill && d.kinds.includes(s.kind))
          )
            return;
          if (skill === 'thai_cuc_than_cong' && a.mana <= 0) return;
          if (
            d.kinds.includes('counter') &&
            ss.some((s) => s.abilityId === skill && s.kind === 'dash')
          )
            return;
          const key = 'status:' + id + ':' + skill + ':' + index;
          wanted.add(key);
          const action = this.poses.get(id),
            fx = action?.skill === skill ? action.fx : a.fx,
            fy = action?.skill === skill ? action.fy : a.fy;
          const definition =
            feedbackComponents.get(d.loop.asset)?.role === 'afterimage'
              ? { ...d, offset: [-fx * 14, -fy * 14 - 3] as [number, number] }
              : d;
          this.ensure(key, id, skill, definition, point, fx, fy);
        });
        if (
          b.dogs &&
          ss.some((s) => s.abilityId === skill && s.kind === 'channel')
        ) {
          for (let i = 0; i < 4; i++) {
            const theta = this.scene.time.now * 0.0018 + (i * Math.PI) / 2,
              p = {
                x: point.x + Math.cos(theta) * 90,
                y: point.y + Math.sin(theta) * 54,
              },
              vx = -Math.sin(theta),
              vy = Math.cos(theta);
            const key = 'dog:' + id + ':' + i,
              d = {
                kinds: ['channel'],
                loop: artRef(
                  'thien_ha_vo_cau_dogs_v2',
                  'projectile',
                  'dog_run',
                ),
              };
            wanted.add(key);
            this.ensure(key, id, skill, d, p, vx, vy);
            const v = this.persistent.get(key)?.view,
              tag = feedbackTag(d.loop, vx, vy);
            if (v && tag && v.tag.name !== tag.name)
              this.play(v, d.loop, vx, vy, -1);
          }
        }
      }
    });
    state.areas.forEach((a, id) => {
      const b = feedbackBindings[a.abilityId];
      if (a.zoneId !== zone || !b?.area) return;
      const owner = this.actor(a.ownerId);
      if (!owner || owner.hp <= 0) return;
      const key = 'area:' + id;
      wanted.add(key);
      this.ensure(
        key,
        a.ownerId,
        a.abilityId,
        { ...b.area, kinds: [] },
        a,
        1,
        0,
      );
      if (a.abilityId === 'thai_cuc_tran')
        state.creeps.forEach((target, targetId) => {
          if (target.hp <= 0 || target.zoneId !== zone) return;
          const probe = id + ':' + targetId,
            dist = Math.hypot(target.x - a.x, target.y - a.y),
            before = this.areaDistances.get(probe);
          this.areaDistances.set(probe, dist);
          // Cosmetic boundary contact from consecutive authoritative positions.
          // The protocol does not expose trappedIds/attempted movement; never apply control here.
          if (
            before !== undefined &&
            before < a.radius - 2 &&
            dist >= a.radius - 2 &&
            dist <= a.radius + 0.1 &&
            this.scene.time.now - (this.reactions.get(id) ?? -1000) > 180
          ) {
            this.reactions.set(id, this.scene.time.now);
            this.react(
              key,
              artRef(
                'vo_dang_shield_formation_v2',
                'ground',
                'inward_response',
              ),
              target.x - a.x,
              target.y - a.y,
            );
          }
        });
    });
    for (const [key, entry] of this.persistent)
      if (!wanted.has(key)) this.end(key, entry, true);
    for (const [owner, at] of this.manualOff)
      if (this.scene.time.now - at > 500) this.manualOff.delete(owner);
    const active = new Set<string>();
    state.projectiles.forEach((p, id) => {
      const b = feedbackBindings[p.abilityId];
      if (
        !b?.projectile ||
        p.zoneId !== zone ||
        (b.projectileStage && b.projectileStage !== p.stage)
      )
        return;
      const owner = this.actor(p.ownerId);
      if (!owner || owner.hp <= 0 || owner.zoneId !== zone) return;
      let ref = b.projectile;
      if (p.abilityId === 'thien_son_phien')
        ref = artRef(
          'thien_son_fan_v2',
          'projectile',
          p.leg === 'return' ? 'return' : 'outbound',
        );
      if (p.abilityId === 'bach_phien_phong_bao')
        ref = artRef(
          'thien_son_fan_v2',
          'projectile',
          'storm_fan_' + eightFacing(p.vx, p.vy),
        );
      active.add(id);
      let shot = this.shots.get(id);
      const tag = feedbackTag(ref, p.vx, p.vy);
      if (!tag) return;
      if (!shot) {
        const view = this.make(
          ref,
          p,
          p.vx,
          p.vy,
          p.ownerId,
          p.abilityId,
          false,
          [0, -20],
        );
        if (!view) return;
        shot = {
          view,
          owner: p.ownerId,
          skill: p.abilityId,
          leg: p.leg,
          stage: p.stage,
          fx: p.vx,
          fy: p.vy,
        };
        this.shots.set(id, shot);
      }
      const changed = shot.view.tag.name !== tag.name;
      if (changed) this.play(shot.view, ref, p.vx, p.vy, -1);
      shot.leg = p.leg;
      shot.fx = p.vx;
      shot.fy = p.vy;
      this.place(shot.view, p);
      shot.view.sprite.setRotation(
        Math.atan2(p.vy, p.vx) - (headings[shot.view.tag.direction] ?? 0),
      );
    });
    for (const [id, shot] of this.shots)
      if (!active.has(id)) {
        const v = shot.view;
        this.recentShots.push({
          owner: shot.owner,
          skill: shot.skill,
          leg: shot.leg,
          x: v.sprite.x,
          y: v.sprite.y + 20,
          at: this.scene.time.now,
        });
        const a = this.actor(shot.owner);
        if (
          shot.skill === 'thien_son_phien' &&
          shot.leg === 'return' &&
          a &&
          a.hp > 0 &&
          a.zoneId === zone &&
          Math.hypot(a.x - v.sprite.x, a.y - (v.sprite.y + 20)) < 32 &&
          !this.poses.has(shot.owner)
        )
          this.cue(
            shot.owner,
            shot.skill,
            artRef('thien_son_fan_v2', 'character', 'catch'),
            shot.fx,
            shot.fy,
          );
        this.destroy(v);
        this.shots.delete(id);
      }
    this.recentShots = this.recentShots.filter(
      (p) => this.scene.time.now - p.at < 300,
    );
  }
  projectileHandled(id: string, stage: string): boolean {
    const b = feedbackBindings[id];
    return (
      !!b?.projectile && (!b.projectileStage || b.projectileStage === stage)
    );
  }
  areaHandled(id: string): boolean {
    return !!feedbackBindings[id]?.area;
  }
  clear(): void {
    for (const v of [
      ...this.transient,
      ...[...this.persistent.values()].map((v) => v.view),
      ...[...this.shots.values()].map((v) => v.view),
    ])
      v.sprite.destroy();
    this.transient.clear();
    this.persistent.clear();
    this.shots.clear();
    this.poses.clear();
    this.cuts.clear();
    this.basicIds.clear();
    this.queuedReactions.clear();
    this.recentShots = [];
    this.manualOff.clear();
    this.areaDistances.clear();
    this.reactions.clear();
    this.empowered.clear();
    this.health.clear();
  }
  review(asset: string, tag: string, x: number, y: number) {
    const ref = { asset, prefix: tag },
      v = this.make(
        ref,
        { x, y },
        1,
        0,
        '__review__',
        '__review__',
        false,
        [0, 0],
        true,
      );
    if (!v) throw Error('Unknown feedback review ' + asset + ':' + tag);
    this.transient.add(v);
    v.sprite.play({
      key: rasterAnimationKey(asset, tag),
      repeat: v.tag.loop ? 1 : 0,
    });
    v.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () =>
      this.destroy(v),
    );
    return {
      key: asset + ':' + tag,
      duration: v.tag.durationMsTotal * (v.tag.loop ? 2 : 1),
      frames: v.tag.frames,
      origin: v.tag.origin,
      scale: v.sprite.scaleX,
      canvas: [v.sprite.frame.realWidth, v.sprite.frame.realHeight],
    };
  }
  inspect() {
    const serialize = (v: Fx) => ({
      texture: v.ref.asset,
      tag: v.tag.name,
      role: feedbackComponents.get(v.ref.asset)?.role,
      frame: v.sprite.frame.name,
      x: v.sprite.x,
      y: v.sprite.y,
      depth: v.sprite.depth,
      origin: [v.sprite.originX, v.sprite.originY],
      scale: v.sprite.scaleX,
      rotation: v.sprite.rotation,
      timeScale: v.sprite.anims.timeScale,
    });
    return {
      loadedComponents: feedbackArt.filter((a) =>
        this.scene.textures.exists(a.id),
      ).length,
      registeredAnimations: feedbackArt.reduce(
        (n, a) =>
          n +
          a.animations.filter((t) =>
            this.scene.anims.exists(rasterAnimationKey(a.id, t.name)),
          ).length,
        0,
      ),
      played: [...this.played],
      observedFrames: [...this.observed],
      observedCount: this.observed.size,
      completed: Object.fromEntries(this.completions),
      frameTimes: Object.fromEntries(this.timings),
      events: this.events,
      persistent: [...this.persistent].map(([id, v]) => ({
        id,
        ...serialize(v.view),
      })),
      projectiles: [...this.shots].map(([id, s]) => ({
        id,
        leg: s.leg,
        ...serialize(s.view),
      })),
      transient: [...this.transient].map(serialize),
      poses: [...this.poses].map(([id, p]) => ({
        id,
        skill: p.skill,
        token: p.token,
        durationMs: p.duration,
        timeScale: p.tag.durationMsTotal / p.duration,
        looping: p.looping,
      })),
    };
  }
}
