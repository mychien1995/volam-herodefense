import Phaser from 'phaser';
import type { CombatEvent } from '@volam/game-core';
import type { LobbyState } from '@volam/game-protocol';
import raw from './m3d-feedback-art.generated.json' with { type: 'json' };
import { facing } from './facing.js';
import {
  rasterAnimationKey,
  type RasterComponent,
  type RasterAnimation,
} from './skill-art-registry.js';
import { m3dPresentation as P, m3dSkillIds } from './m3d-feedback-policy.js';

type Tag = RasterAnimation & { durationMsTotal: number; loop: boolean };
export const m3dAssets = raw.assets as unknown as (Omit<
  RasterComponent,
  'animations'
> & { animations: Tag[] })[];
const assets = new Map(m3dAssets.map((a) => [a.id, a]));
type Point = { x: number; y: number };
type Direction = 'right' | 'down' | 'left' | 'up';
const vectors = {
  right: [1, 0],
  left: [-1, 0],
  down: [0, 0.65],
  up: [0, -0.65],
} as const;
const C = {
  monk: 'm3d_thieu_lam_quyen_character',
  monkFx: 'm3d_thieu_lam_quyen_vfx',
  gold: 'm3d_thieu_lam_skill_vfx',
  monkDao: 'm3d_thieu_lam_dao_character',
  fist: 'm3d_vo_dang_quyen_character',
  sword: 'm3d_vo_dang_kiem_character',
  sonic: 'm3d_vo_dang_sonic_vfx_r2',
  white: 'm3d_vo_dang_basic_vfx',
  swordFx: 'm3d_nhan_kiem_hop_nhat_vfx',
  wind: 'm3d_thien_son_dao_vfx',
  dao: 'm3d_thien_son_dao_character',
  ground: 'm3d_liet_phong_ground_vfx_r2',
  dragon: 'm3d_khang_long_huu_hoi_vfx',
  burn: 'm3d_khang_long_burn_vfx',
  staff: 'm3d_pha_giap_bong_vfx',
};
type Clip = {
  sprite: Phaser.GameObjects.Sprite;
  asset: string;
  tag: Tag;
  owner: string;
  skill: string;
  start: number;
  duration: number;
  point: Point;
  direction: Direction;
  follow: boolean;
  ground: boolean;
  loop: boolean;
  offset: [number, number];
  travel: number;
  fade: number;
  gate: boolean;
  source?: string;
  observed: Set<string>;
  motionStart: number;
  motionMs: number;
  revision: number;
  receivedTick: number;
  gateSeen: boolean;
};
type Body = {
  asset: string;
  tag: Tag;
  owner: string;
  skill: string;
  start: number;
  duration: number;
  direction: Direction;
  token: string;
  loop: boolean;
  gate: boolean;
  swordless?: boolean;
  revision: number;
  receivedTick: number;
  gateSeen: boolean;
};
type Options = Partial<
  Pick<
    Clip,
    | 'duration'
    | 'follow'
    | 'ground'
    | 'loop'
    | 'offset'
    | 'travel'
    | 'fade'
    | 'gate'
    | 'motionStart'
    | 'motionMs'
  >
> & { delay?: number; scale?: number };
type Status = { kind: string; abilityId: string };
const ss = (a: { statuses: string }) =>
  JSON.parse(a.statuses || '[]') as Status[];
function tagFor(asset: string, prefix: string, d: Direction): Tag {
  const tag = assets
    .get(asset)
    ?.animations.find((a) => a.name === prefix + '_' + d || a.name === prefix);
  if (!tag)
    throw Error('Unselected M3D tag: ' + asset + '/' + prefix + '/' + d);
  return tag;
}
/** Select frames by authored durations, never atlas object order. Used for state-held phases too. */
export function m3dFrame(
  tag: Tag,
  elapsed: number,
  duration: number,
  loop: boolean,
): string {
  const times = tag.frameDurationsMs!;
  let t = loop
    ? elapsed % tag.durationMsTotal
    : Math.min(
        tag.durationMsTotal - 0.001,
        Number.isFinite(duration)
          ? Math.max(0, elapsed / duration) * tag.durationMsTotal
          : elapsed,
      );
  for (let i = 0; i < times.length; i++) {
    if (t < times[i]!) return tag.frames[i]!;
    t -= times[i]!;
  }
  return tag.frames.at(-1)!;
}

/** All triggers come from accepted events or projected state. Clips never send commands or resolve hits. */
export class M3dFeedback {
  private state: LobbyState | undefined;
  private zone = 'arena';
  private clips = new Set<Clip>();
  private bodies = new Map<string, Body>();
  private held = new Map<string, Clip>();
  private actions = new Map<
    string,
    {
      owner: string;
      skill: string;
      event: CombatEvent;
      struck: boolean;
      receivedTick: number;
      gateSeen: boolean;
    }
  >();
  private observed = new Set<string>();
  private completed: Record<string, number> = {};
  private timings: Record<string, Array<{ frame: string; at: number }>> = {};
  private history: {
    id: number;
    skill: string;
    stage: string;
    kind: string;
  }[] = [];
  private serial = 0;
  private arrivals = new Map<string, number>();
  private renderPoint: ((id: string) => Point | undefined) | undefined;
  constructor(private scene: Phaser.Scene) {}
  handles(id: string) {
    return m3dSkillIds.has(id);
  }
  private actor(id: string) {
    return this.state?.players.get(id) ?? this.state?.creeps.get(id);
  }
  private revision(id: string) {
    return this.state?.players.get(id)?.build.revision ?? 0;
  }
  private valid(id: string) {
    const a = this.actor(id);
    return a && a.hp > 0 && a.zoneId === this.zone;
  }
  private active(id: string, skill: string) {
    const a = this.actor(id);
    return (
      !!a &&
      ss(a).some(
        (s) => s.abilityId === skill && ['channel', 'dash'].includes(s.kind),
      )
    );
  }
  private gateEnded(g: {
    owner: string;
    skill: string;
    receivedTick: number;
    gateSeen: boolean;
  }) {
    if (this.active(g.owner, g.skill)) {
      g.gateSeen = true;
      return false;
    }
    // Reliable combat messages can precede their schema patch. Reconcile by server ticks,
    // then cancel as soon as an observed channel disappears. Never extend gameplay.
    return g.gateSeen || (this.state?.tick ?? 0) > g.receivedTick + 3;
  }
  private trackAction(e: CombatEvent) {
    this.actions.set(e.sourceId, {
      owner: e.sourceId,
      skill: e.abilityId,
      event: e,
      struck: false,
      receivedTick: this.state?.tick ?? 0,
      gateSeen: this.active(e.sourceId, e.abilityId),
    });
  }
  private point(id: string): Point | undefined {
    return this.renderPoint?.(id) ?? this.actor(id);
  }
  private remove(c: Clip) {
    c.sprite.destroy();
    this.clips.delete(c);
  }
  private emit(
    asset: string,
    prefix: string,
    e: CombatEvent,
    options: Options = {},
    point: Point = e,
  ): Clip {
    const d = facing(e.fx ?? 1, e.fy ?? 0) as Direction,
      tag = tagFor(asset, prefix, d);
    const c: Clip = {
      sprite: this.scene.add
        .sprite(point.x, point.y, asset, tag.frames[0]!)
        .setOrigin(...tag.origin)
        .setScale(options.scale ?? 1)
        .setName('m3d-r2:' + e.abilityId),
      asset,
      tag,
      owner: e.sourceId,
      skill: e.abilityId,
      start: this.scene.time.now + (options.delay ?? 0),
      duration: options.duration ?? tag.durationMsTotal,
      point: { x: point.x, y: point.y },
      direction: d,
      follow: false,
      ground: false,
      loop: false,
      offset: [...tag.effectPlacementOffset],
      travel: 0,
      fade: 0,
      gate: false,
      motionStart: this.scene.time.now + (options.delay ?? 0),
      motionMs: options.duration ?? tag.durationMsTotal,
      revision: this.revision(e.sourceId),
      receivedTick: this.state?.tick ?? 0,
      gateSeen: this.active(e.sourceId, e.abilityId),
      ...options,
      observed: new Set(),
    };
    c.sprite.setVisible(false);
    this.clips.add(c);
    return c;
  }
  private sequence(
    asset: string,
    prefix: string,
    e: CombatEvent,
    options: Options = {},
  ) {
    let delay = options.delay ?? 0;
    const d = facing(e.fx ?? 1, e.fy ?? 0) as Direction;
    const motionMs = ['intro', 'impact', 'outro'].reduce(
      (n, p) => n + tagFor(asset, prefix + '_' + p, d).durationMsTotal,
      0,
    );
    for (const phase of ['intro', 'impact', 'outro']) {
      const c = this.emit(asset, prefix + '_' + phase, e, {
        ...options,
        delay,
        motionStart: this.scene.time.now + (options.delay ?? 0),
        motionMs,
      });
      delay += c.duration;
    }
  }
  private body(
    asset: string,
    prefix: string,
    e: CombatEvent,
    options: Partial<
      Pick<Body, 'duration' | 'loop' | 'gate' | 'swordless'>
    > = {},
  ) {
    const a = this.actor(e.sourceId),
      expected =
        asset === C.dao || asset.includes('bach_liet')
          ? 'thien_son'
          : asset === C.fist || asset === C.sword
            ? 'vo_dang'
            : asset.includes('staff') || asset.includes('khang_long')
              ? 'cai_bang'
              : 'thieu_lam';
    if (a && 'schoolId' in a && a.schoolId !== expected) return;
    const d = facing(e.fx ?? 1, e.fy ?? 0) as Direction,
      tag = tagFor(asset, prefix, d);
    this.bodies.set(e.sourceId, {
      asset,
      tag,
      owner: e.sourceId,
      skill: e.abilityId,
      start: this.scene.time.now,
      duration: tag.durationMsTotal,
      direction: d,
      token: 'feedback:m3d:' + e.id + ':' + ++this.serial,
      revision: this.revision(e.sourceId),
      receivedTick: this.state?.tick ?? 0,
      gateSeen: this.active(e.sourceId, e.abilityId),
      loop: false,
      gate: false,
      ...options,
    });
  }
  private extent(asset: string, prefix: string, d: Direction) {
    // Authored footprint is presentation data, independent of authoritative reach.
    const a = assets.get(asset)!;
    const tags = a.animations.filter(
      (t) => t.name.startsWith(prefix) && t.direction === d,
    );
    // Prepared metadata keeps measured opaque bounds separately; alpha canvas is never a hitbox.
    return Math.max(
      0,
      ...tags.map((t) => (t as Tag & { forwardExtent: number }).forwardExtent),
    );
  }
  event(e: CombatEvent): boolean {
    if (e.kind === 'cast' || e.kind === 'attack') {
      this.bodies.delete(e.sourceId);
    }
    if (!this.handles(e.abilityId)) return false;
    if (!this.valid(e.sourceId)) return true;
    this.history.push({
      id: e.id,
      skill: e.abilityId,
      stage: e.stage ?? '',
      kind: e.kind,
    });
    if (this.history.length > 1500) this.history.shift();
    const id = e.abilityId,
      d = facing(e.fx ?? 1, e.fy ?? 0) as Direction;
    if (e.kind === 'attack') {
      this.bodies.delete(e.sourceId);
      // A new accepted press replaces the previous body's recovery, never starts another attack itself.
      const a = this.state!.players.get(e.sourceId)!;
      const cadence = Math.max(
        1000 / 6,
        ((a.basicCooldown ||
          (id.startsWith('vo_dang') ? 6 : id === 'thien_son_dao' ? 9 : 23)) *
          1000) /
          30,
      );
      if (id === 'thieu_lam_quyen') {
        const stage = e.stage ?? 'left_fist';
        this.body(C.monk, stage, e, { duration: Math.min(330, cadence) });
        this.emit(C.monkFx, stage, e, {
          travel: stage === 'roundhouse_kick' ? 0 : P.shaolinTravel,
        });
      } else if (id === 'vo_dang_quyen') {
        const stage = e.stage === 'right_palm' ? 'right_fist' : 'left_fist';
        this.body(C.fist, stage, e, { duration: Math.min(330, cadence) });
        this.emit(C.sonic, stage + '_wave', e, {
          offset: [...P.fistTips[stage][d]],
          travel: P.sonicTravel,
          duration: P.sonicMs,
        });
      } else if (id === 'vo_dang_kiem') {
        this.body(C.sword, 'basic_attack', e, {
          duration: Math.min(330, cadence),
        });
        this.emit(C.white, 'sword_qi', e);
      } else if (id === 'thien_son_dao') {
        this.body(C.dao, 'basic_attack', e, {
          duration: Math.min(330, cadence),
        });
        this.emit(C.wind, 'basic_slash', e);
      } else if (id === 'thieu_lam_dao') {
        this.body(C.monkDao, 'basic_attack', e, {
          duration: Math.min(330, cadence),
        });
        this.sequence(C.gold, 'dao_basic', e, {
          travel:
            this.extent(C.gold, 'dao_basic', d) * (P.daoReachMultiplier - 1),
        });
      }
    }
    if (e.kind === 'cast') {
      this.actions.delete(e.sourceId);
      if (id === 'universal_dash')
        this.emit('m3d_dash_vfx', 'dash', e, { follow: true });
      if (id === 'nhan_kiem_hop_nhat') {
        this.body(C.sword, 'nhan_kiem_launch', e, { swordless: true });
        this.emit(C.swordFx, 'launch', e);
      }
      if (id === 'liet_phong_dao') {
        this.trackAction(e);
        this.body(C.dao, 'liet_phong_gather', e, { gate: true });
        this.emit(C.wind, 'liet_phong_gather', e, { follow: true, gate: true });
      }
      if (id === 'pha_giap_bong') {
        this.trackAction(e);
        this.body('r2_retained_staff', 'pha_giap_bong_cast', e);
      }
      if (id === 'bach_liet_thien_kich') {
        this.trackAction(e);
        this.body('r2_retained_bach_liet', 'cast', e, { gate: true });
      }
      if (id === 'tam_gioi_quy_thien') {
        this.trackAction(e);
        this.body(C.monkDao, id, e, { gate: true });
      }
      if (id === 'la_han_quyen' || id === 'vi_da_quyen') {
        this.body(
          id === 'la_han_quyen' ? 'r2_retained_la_han' : 'r2_retained_vi_da',
          'cast',
          e,
        );
        const offset = tagFor(C.gold, id + '_intro', d).effectPlacementOffset;
        if (id === 'la_han_quyen') {
          const [handX, handY] = P.fistTips.left_fist[d];
          this.sequence(C.gold, id, e, {
            offset: [handX, handY],
            scale: 0.67,
            follow: true,
          });
        } else
          this.sequence(
            C.gold,
            id,
            e,
            id === 'vi_da_quyen'
              ? {
                  offset: [
                    offset[0] * P.viDaMultiplier,
                    offset[1] * P.viDaMultiplier,
                  ],
                  ground: true,
                }
              : {},
          );
      }
      if (id === 'nhu_lai_niet_ban') {
        this.trackAction(e);
        this.body('r2_retained_nhu_lai', 'cast', e, { gate: true });
      }
      if (id === 'khang_long_huu_hoi') {
        this.body('r2_retained_khang_long', 'cast', e);
      }
    }
    if (e.kind === 'pulse') {
      if (id === 'nhu_lai_niet_ban' && e.stage === 'strike') {
        this.body('r2_retained_nhu_lai', 'cast', e, {
          duration: P.palmCount * P.palmIntervalMs,
          loop: true,
        });
        // Eight cosmetic palms from ONE confirmed delayed arc. No additional projectiles or hits.
        for (let i = 0; i < P.palmCount; i++)
          for (const [phase, at, ms] of [
            ['intro', 0, 140],
            ['intro', 140, 180],
            ['impact', 320, 160],
            ['outro', 480, 170],
          ] as const) {
            const c = this.emit(C.gold, id + '_' + phase, e, {
              delay: i * P.palmIntervalMs + at,
              duration: ms,
              travel: P.palmTravel,
              motionStart: this.scene.time.now + i * P.palmIntervalMs,
              motionMs: P.palmMs,
            });
            c.source = 'palm-echo:' + i;
          }
      }
      if (
        id === 'nhan_kiem_hop_nhat' &&
        ['blink_depart', 'blink_arrive'].includes(e.stage ?? '')
      ) {
        this.emit(
          C.swordFx,
          e.stage === 'blink_depart' ? 'blink_departure' : 'blink_arrival',
          e,
          { offset: [0, -24] },
        );
        if (e.stage === 'blink_arrive') {
          this.bodies.delete(e.sourceId);
          this.arrivals.set(e.sourceId, this.scene.time.now);
        }
      }
      if (e.stage === 'strike') {
        const action = this.actions.get(e.sourceId);
        if (action?.skill === id) action.struck = true;
        if (id === 'liet_phong_dao') {
          for (const c of this.clips)
            if (c.owner === e.sourceId && c.skill === id) this.remove(c);
          this.body(C.dao, 'liet_phong_slash', e, { gate: true });
          this.emit(C.wind, 'liet_phong_slash', e, {
            gate: true,
            travel:
              this.extent(C.wind, 'liet_phong_slash', d) *
              (P.lietReachMultiplier - 1),
          });
          this.emit(C.ground, 'ground_break', e, {
            ground: true,
            offset: [
              vectors[d][0] * P.groundOffset,
              vectors[d][1] * P.groundOffset,
            ],
            fade: 160,
            gate: true,
          });
        }
        if (id === 'pha_giap_bong')
          this.emit(C.staff, 'foot_explosion', e, {
            ground: true,
            offset: [0, 0],
            gate: true,
          });
        if (id === 'tam_gioi_quy_thien')
          this.sequence(C.gold, id, e, { gate: true });
      }
      if (
        id === 'bach_liet_thien_kich' &&
        ['sweep', 'finisher'].includes(e.stage ?? '')
      ) {
        const action = this.actions.get(e.sourceId);
        if (action) action.struck = true;
        // Every real pulse emits one visual wave. Never manufacture nine authoritative attacks from the preview.
        const motion = {
          motionStart: this.scene.time.now,
          motionMs: P.bladeMs,
        };
        this.emit(C.wind, 'bach_liet_intro', e, {
          ...motion,
          travel: P.bladeTravel,
          duration: 120,
          gate: true,
        });
        this.emit(C.wind, 'bach_liet_loop', e, {
          ...motion,
          delay: 120,
          travel: P.bladeTravel,
          duration: 200,
          loop: true,
          gate: true,
        });
        this.emit(C.wind, 'bach_liet_outro', e, {
          ...motion,
          delay: 320,
          travel: P.bladeTravel,
          gate: true,
        });
        this.body(
          'r2_retained_bach_liet',
          e.stage === 'finisher' ? 'finish' : 'flurry',
          e,
          { gate: e.stage !== 'finisher' },
        );
      }
    }
    return true;
  }
  private sustain(
    key: string,
    asset: string,
    prefix: string,
    e: CombatEvent,
    point: Point,
    wanted: Set<string>,
    options: Options = {},
  ) {
    wanted.add(key);
    let c = this.held.get(key);
    const tag = tagFor(
      asset,
      prefix,
      facing(e.fx ?? 1, e.fy ?? 0) as Direction,
    );
    if (
      c &&
      (c.tag.name !== tag.name ||
        !c.sprite.active ||
        c.revision !== this.revision(c.owner))
    ) {
      this.remove(c);
      this.held.delete(key);
      c = undefined;
    }
    if (!c) {
      c = this.emit(
        asset,
        prefix,
        e,
        { ...options, duration: Infinity, loop: true },
        point,
      );
      c.source = key;
      this.held.set(key, c);
    }
    c.point = { x: point.x, y: point.y };
    return c;
  }
  sync(
    state: LobbyState | undefined,
    zone: string,
    renderPoint?: (id: string) => Point | undefined,
  ) {
    if (this.zone !== zone || !state || state.phase === 'DEFEAT') this.clear();
    this.state = state;
    this.zone = zone;
    this.renderPoint = renderPoint;
    if (!state || state.phase === 'DEFEAT') return;
    const now = this.scene.time.now,
      wanted = new Set<string>();
    const event = (
      owner: string,
      skill: string,
      point: Point,
      fx = 1,
      fy = 0,
    ): CombatEvent => ({
      id: 0,
      kind: 'pulse',
      sourceId: owner,
      targetId: '',
      abilityId: skill,
      ...point,
      fx,
      fy,
      damage: 0,
      critical: false,
    });
    for (const [owner, a] of this.actions) {
      if (!this.valid(owner) || this.gateEnded(a)) {
        this.actions.delete(owner);
        continue;
      }
      const p = this.point(owner)!,
        e = a.event;
      if (a.skill === 'liet_phong_dao' && !a.struck) {
        const elapsed = now - (this.bodies.get(owner)?.start ?? now);
        if (
          this.bodies
            .get(owner)
            ?.tag.name.startsWith('liet_phong_gather_hold') ||
          elapsed >=
            tagFor(
              C.dao,
              'liet_phong_gather',
              facing(e.fx ?? 1, e.fy ?? 0) as Direction,
            ).durationMsTotal
        ) {
          if (
            !this.bodies
              .get(owner)
              ?.tag.name.startsWith('liet_phong_gather_hold')
          )
            this.body(C.dao, 'liet_phong_gather_hold', e, {
              duration: Infinity,
              loop: true,
              gate: true,
            });
          this.sustain(
            'gather:' + owner,
            C.wind,
            'liet_phong_gather_loop',
            e,
            p,
            wanted,
            { gate: true },
          );
        }
      }
      if (a.skill === 'liet_phong_dao' && a.struck) {
        const b = this.bodies.get(owner);
        if (
          b?.tag.name.startsWith('liet_phong_slash') &&
          now - b.start >= b.duration
        ) {
          this.body(C.dao, 'liet_phong_recover', e, { gate: true });
          this.emit(C.wind, 'liet_phong_outro', e, { gate: true });
        }
      }
      if (a.skill === 'pha_giap_bong')
        this.sustain(
          'reach:' + owner,
          C.staff,
          a.struck ? 'reach_loop' : 'reach_intro',
          e,
          p,
          wanted,
          { gate: true },
        );
    }
    state.projectiles.forEach((p, id) => {
      if (
        p.abilityId !== 'nhan_kiem_hop_nhat' ||
        p.zoneId !== zone ||
        !this.valid(p.ownerId)
      )
        return;
      const e = event(p.ownerId, p.abilityId, p, p.vx, p.vy);
      this.sustain(
        'sword:' + id,
        C.swordFx,
        p.stage === 'sword_linger' ? 'hold' : 'flight_loop',
        e,
        p,
        wanted,
        { offset: [0, -24] },
      );
    });
    state.areas.forEach((a, id) => {
      if (
        a.abilityId !== 'khang_long_huu_hoi' ||
        a.zoneId !== zone ||
        !this.valid(a.ownerId)
      )
        return;
      const key = 'burn:' + id,
        old = this.held.get(key),
        p = this.point(a.ownerId) ?? a,
        e = event(a.ownerId, a.abilityId, p);
      const intro = tagFor(C.burn, 'burn_intro', 'right').durationMsTotal;
      if (!old) {
        const c = this.sustain(key, C.burn, 'burn_intro', e, p, wanted, {
          ground: true,
        });
        c.loop = false;
      } else {
        wanted.add(key);
        old.point = { ...p };
        if (now - old.start >= intro && old.tag.name === 'burn_intro') {
          this.remove(old);
          this.held.delete(key);
          this.sustain(key, C.burn, 'burn_loop', e, p, wanted, {
            ground: true,
          });
        }
      }
    });
    for (const [key, c] of this.held)
      if (!wanted.has(key)) {
        if (this.valid(c.owner) && c.revision === this.revision(c.owner)) {
          const e = event(
            c.owner,
            c.skill,
            c.point,
            ...(vectors[c.direction] as [number, number]),
          );
          if (key.startsWith('sword:'))
            this.emit(C.swordFx, 'recall_outro', e, { offset: [0, -24] });
          if (key.startsWith('burn:'))
            this.emit(C.burn, 'burn_outro', e, { ground: true });
          if (key.startsWith('reach:')) this.emit(C.staff, 'reach_outro', e);
        }
        this.remove(c);
        this.held.delete(key);
      }
    for (const c of this.clips) {
      if (
        !this.valid(c.owner) ||
        (c.skill === 'nhu_lai_niet_ban' &&
          ss(this.actor(c.owner)!).some((s) => s.kind === 'stun')) ||
        c.revision !== this.revision(c.owner) ||
        (c.gate && this.gateEnded(c)) ||
        now >= c.start + c.duration
      ) {
        this.remove(c);
        continue;
      }
      const elapsed = now - c.start;
      if (elapsed < 0) continue;
      const p = c.follow ? (this.point(c.owner) ?? c.point) : c.point;
      const t = Math.max(0, Math.min(1, (now - c.motionStart) / c.motionMs)),
        [fx, fy] = vectors[c.direction];
      c.sprite
        .setVisible(true)
        .setPosition(
          Math.round(p.x + c.offset[0] + fx * c.travel * t),
          Math.round(p.y + c.offset[1] + fy * c.travel * t),
        )
        .setDepth(c.ground ? -4 : p.y + 0.4)
        .setAlpha(c.fade ? Math.min(1, (c.duration - elapsed) / c.fade) : 1)
        .setFrame(m3dFrame(c.tag, elapsed, c.duration, c.loop));
      const frame = String(c.sprite.frame.name);
      c.observed.add(frame);
      this.observe(c.asset, frame);
    }
    for (const [owner, b] of this.bodies) {
      const a = this.actor(owner);
      if (
        !this.valid(owner) ||
        b.revision !== this.revision(owner) ||
        ss(a!).some((s) => s.kind === 'stun') ||
        (b.gate && this.gateEnded(b))
      )
        this.bodies.delete(owner);
    }
  }
  actorCast(id: string) {
    const b = this.bodies.get(id);
    if (!this.valid(id)) return;
    if (!b) {
      const a = this.state?.players.get(id),
        p = [...(this.state?.projectiles.values() ?? [])].find(
          (p) => p.ownerId === id && p.abilityId === 'nhan_kiem_hop_nhat',
        );
      if (!a || a.schoolId !== 'vo_dang' || !p) return;
      if (a.pose === 'walk') {
        const asset = 'r2_hero_vo_dang',
          tag = tagFor(asset, 'walk', facing(a.fx, a.fy) as Direction);
        return {
          texture: asset,
          animation: rasterAnimationKey(asset, tag.name),
          origin: tag.origin,
          firstFrame: tag.frames[0]!,
          scale: 1,
          token: 'feedback:m3d:unarmed-walk:' + tag.name,
          durationMs: tag.durationMsTotal,
          timeScale: 1,
          startFrame: 0,
        };
      }
      const tag = tagFor(
          C.sword,
          'nhan_kiem_launch',
          facing(p.vx, p.vy) as Direction,
        ),
        key = rasterAnimationKey(C.sword, tag.name) + ':swordless';
      if (!this.scene.anims.exists(key))
        this.scene.anims.create({
          key,
          frames: [{ key: C.sword, frame: tag.frames.at(-1)! }],
          frameRate: 1,
          repeat: 0,
        });
      return {
        texture: C.sword,
        animation: key,
        origin: tag.origin,
        firstFrame: tag.frames.at(-1)!,
        scale: 1,
        token: 'feedback:m3d:swordless:' + tag.name,
        durationMs: 1,
        timeScale: 1,
        startFrame: 0,
      };
    }
    const elapsed = this.scene.time.now - b.start;
    const swordAlive =
      b.swordless &&
      [...(this.state?.projectiles.values() ?? [])].some(
        (p) => p.ownerId === id && p.abilityId === 'nhan_kiem_hop_nhat',
      );
    if (
      elapsed >= b.duration &&
      Number.isFinite(b.duration) &&
      !swordAlive &&
      !(b.gate && this.active(id, b.skill))
    ) {
      this.bodies.delete(id);
      return;
    }
    const index =
      swordAlive && elapsed >= b.duration ? b.tag.frames.length - 1 : 0;
    let key = rasterAnimationKey(b.asset, b.tag.name);
    if (b.loop) {
      key += ':r2-loop';
      if (!this.scene.anims.exists(key))
        this.scene.anims.create({
          key,
          frames: b.tag.frames.map((frame, i) => ({
            key: b.asset,
            frame,
            duration: b.tag.frameDurationsMs![i]!,
          })),
          frameRate: 1000,
          repeat: -1,
        });
    }
    return {
      texture: b.asset,
      abilityId: b.skill,
      phase: b.tag.name,
      progress: b.duration > 0 ? elapsed / b.duration : 1,
      animation: key,
      origin: b.tag.origin,
      firstFrame: b.tag.frames[index]!,
      scale: 1,
      token: b.token,
      durationMs: b.duration,
      timeScale: b.loop
        ? b.skill === 'nhu_lai_niet_ban'
          ? b.tag.durationMsTotal / P.palmIntervalMs
          : 1
        : b.tag.durationMsTotal / b.duration,
      startFrame: index,
    };
  }
  observe(asset: string, frame: string) {
    if (assets.has(asset)) {
      this.observed.add(asset + ':' + frame);
      const list = (this.timings[asset] ??= []);
      if (list.length < 240 && list.at(-1)?.frame !== frame)
        list.push({ frame, at: this.scene.time.now });
    }
  }
  review(asset: string, name: string, x: number, y: number) {
    const tag = assets.get(asset)?.animations.find((a) => a.name === name);
    if (!tag) throw Error('Unselected M3D review clip ' + asset + '/' + name);
    const sprite = this.scene.add
      .sprite(x, y, asset, tag.frames[0]!)
      .setOrigin(...tag.origin)
      .setScale(1)
      .setDepth(y + 0.5);
    sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, () =>
      this.observe(asset, String(sprite.frame.name)),
    );
    this.observe(asset, tag.frames[0]!);
    sprite.play({
      key: rasterAnimationKey(asset, name),
      repeat: tag.loop ? 1 : 0,
    });
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      const k = asset + ':' + name;
      this.completed[k] = (this.completed[k] ?? 0) + 1;
      sprite.destroy();
    });
    return {
      key: asset + ':' + name,
      duration: tag.durationMsTotal * (tag.loop ? 2 : 1),
      frames: tag.frames,
      origin: tag.origin,
      scale: 1,
      canvas: assets.get(asset)!.frameDimensions,
    };
  }
  projectileHandled(id: string) {
    return id === 'nhan_kiem_hop_nhat';
  }
  areaHandled(id: string) {
    return id === 'khang_long_huu_hoi';
  }
  alpha(id: string) {
    const at = this.arrivals.get(id);
    if (at === undefined) return 1;
    const t = (this.scene.time.now - at) / 165;
    if (t >= 1) {
      this.arrivals.delete(id);
      return 1;
    }
    return Math.max(0, t);
  }
  clear() {
    for (const c of this.clips) c.sprite.destroy();
    this.clips.clear();
    this.bodies.clear();
    this.held.clear();
    this.actions.clear();
    this.arrivals.clear();
  }
  inspect() {
    return {
      observed: [...this.observed],
      completed: this.completed,
      timings: this.timings,
      events: this.history,
      clips: [...this.clips].map((c) => ({
        texture: c.asset,
        tag: c.tag.name,
        frame: c.sprite.frame.name,
        owner: c.owner,
        skill: c.skill,
        x: c.sprite.x,
        y: c.sprite.y,
        depth: c.sprite.depth,
        origin: [c.sprite.originX, c.sprite.originY],
        visible: c.sprite.visible,
        source: c.source,
      })),
      bodies: [...this.bodies.values()].map((b) => ({
        owner: b.owner,
        skill: b.skill,
        asset: b.asset,
        tag: b.tag.name,
      })),
      loaded: m3dAssets.map((a) => ({
        id: a.id,
        tags: a.animations.map((t) => t.name),
      })),
    };
  }
}

/** Only the delivered bamboo idle/walk replace baseline; all combat/death remain retained art. */
export function m3dBambooPose(
  archetype: string | undefined,
  pose: string,
  fx: number,
  fy: number,
) {
  if (archetype !== 'truc_lam_kiem_khach' || !['idle', 'walk'].includes(pose))
    return;
  const asset = 'm3d_truc_lam_kiem_khach_character',
    d = facing(fx, fy) as Direction,
    tag = tagFor(asset, pose, d);
  return {
    texture: asset,
    animation: rasterAnimationKey(asset, tag.name),
    origin: tag.origin,
    firstFrame: tag.frames[0]!,
    scale: 1,
    token: 'bamboo:' + pose + ':' + d,
    durationMs: tag.durationMsTotal,
    timeScale: 1,
    startFrame: 0,
  };
}
