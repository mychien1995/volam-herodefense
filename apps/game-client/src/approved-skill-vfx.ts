import Phaser from 'phaser';
import { m1Config, skillArt } from '@volam/game-data';
import type { CombatEvent } from '@volam/game-core';
import type { LobbyState } from '@volam/game-protocol';
import raw from './approved-skill-assets.generated.json' with { type: 'json' };
import { feedbackArt } from './feedback-art.js';
import { facing as rasterFacing } from './facing.js';
import { approvedSkillIds } from './approved-skill-ids.js';
import {
  animationReviewPlan,
  reviewFrameIndex,
  type ReviewClip,
  type ReviewDirection,
} from './animation-review-plans.js';
import {
  rasterAnimationKey,
  type RasterAnimation,
  type RasterComponent,
} from './skill-art-registry.js';

export const approvedSkillAssets = raw.assets as unknown as RasterComponent[];
type Point = { x: number; y: number };
type ClipView = {
  cue: ReviewClip;
  sprite: Phaser.GameObjects.Sprite;
  tag: RasterAnimation;
};
type Run = {
  owner: string;
  skill: string;
  started: number;
  duration: number;
  rate: number;
  origin: Point;
  direction: ReviewDirection;
  token: string;
  body: boolean;
  impact: boolean;
  follow: boolean;
  revision: number | undefined;
  clips: ReviewClip[];
  views: ClipView[];
};
type Loop = {
  owner: string;
  skill: string;
  phase: string;
  view: ClipView;
  direction: ReviewDirection;
  started: number;
  point: Point;
  field: boolean;
};
const vector = {
  right: [1, 0],
  down: [0, 1],
  left: [-1, 0],
  up: [0, -1],
} as const;
const facing = (x: number, y: number): ReviewDirection =>
  rasterFacing(x, y) as ReviewDirection;

/** Presentation only: server casts/status/areas/projectiles/hits own every trigger and lifetime. */
export class ApprovedSkillVfx {
  private heroes = new Map<string, string>();
  private assets = new Map<string, RasterComponent>(
    [...skillArt.assets, ...feedbackArt, ...approvedSkillAssets].map((a) => [
      a.id,
      a,
    ]),
  );
  private runs: Run[] = [];
  private loops = new Map<string, Loop>();
  private shots = new Map<string, ClipView[]>();
  private shotMeta = new Map<
    string,
    {
      owner: string;
      skill: string;
      born: number;
      point: Point;
      direction: ReviewDirection;
    }
  >();
  private channels = new Set<string>();
  private trails = new Map<
    string,
    { last: Point; count: number; at: number; direction: ReviewDirection }
  >();
  private state: LobbyState | undefined;
  private zone = 'arena';
  private renderPoint: ((id: string) => Point | undefined) | undefined;
  private observed = new Set<string>();
  private phases = new Set<string>();
  private history: { id: number; skill: string; stage: string; at: number }[] =
    [];
  constructor(private scene: Phaser.Scene) {}
  handles(id: string) {
    return approvedSkillIds.has(id);
  }
  private actor(id: string) {
    return this.state?.players.get(id);
  }
  private point(id: string): Point | undefined {
    return this.renderPoint?.(id) ?? this.actor(id);
  }
  private tag(
    asset: string,
    prefix: string,
    d: ReviewDirection,
  ): RasterAnimation {
    const list = this.assets.get(asset)?.animations;
    const tag =
      list?.find((a) => a.name === prefix + '_' + d) ??
      list?.find((a) => a.name === prefix);
    if (!tag)
      throw Error(
        'Missing approved animation: ' + asset + ':' + prefix + ':' + d,
      );
    return tag;
  }
  private make(cue: ReviewClip, d: ReviewDirection): ClipView {
    const tag = this.tag(cue.asset, cue.tag, d);
    const sprite = this.scene.add
      .sprite(0, 0, cue.asset, tag.frames[0]!)
      .setOrigin(...tag.origin)
      .setScale(cue.scale ?? 1)
      .setVisible(false);
    return { cue, sprite, tag };
  }
  private start(
    e: CombatEvent,
    clips: ReviewClip[],
    duration: number,
    options: Partial<Pick<Run, 'rate' | 'follow' | 'impact'>> = {},
  ): Run {
    const d = facing(e.fx ?? 1, e.fy ?? 0),
      a = this.actor(e.sourceId);
    const run: Run = {
      owner: e.sourceId,
      skill: e.abilityId,
      started: this.scene.time.now,
      duration,
      rate: 1,
      origin: { x: e.x, y: e.y },
      direction: d,
      token: `feedback:approved:${e.id}:${this.scene.time.now}`,
      body: true,
      impact: e.kind === 'hit',
      follow: e.kind !== 'hit',
      revision: a?.build.revision,
      clips,
      views: [],
      ...options,
    };
    run.views = clips.filter((c) => !c.body).map((c) => this.make(c, d));
    this.runs.push(run);
    return run;
  }
  private single(
    asset: string,
    tag: string,
    duration: number,
    phase: string,
    rest: Partial<ReviewClip> = {},
  ): ReviewClip {
    return { asset, tag, at: 0, end: duration, phase, ...rest };
  }
  event(e: CombatEvent): boolean {
    // New accepted inputs may interrupt a cosmetic pose, never an authoritative effect.
    if (e.kind === 'attack' || e.kind === 'cast')
      for (const run of this.runs)
        if (run.owner === e.sourceId) run.body = false;
    if (!this.handles(e.abilityId)) return false;
    this.history.push({
      id: e.id,
      skill: e.abilityId,
      stage: e.stage ?? e.kind,
      at: this.scene.time.now,
    });
    if (this.history.length > 160) this.history.shift();
    const id = e.abilityId;
    if (e.kind === 'cast' || (e.kind === 'attack' && id === 'thieu_lam_dao')) {
      const plan = animationReviewPlan(id);
      this.heroes.set(id, plan.hero);
      let clips = plan.clips,
        duration = plan.duration,
        rate = 1;
      if (id === 'lien_hoa_phien') {
        clips = clips.filter((c) => c.body);
        duration = 280;
      }
      if (id === 'phong_anh_hoan_vi') {
        clips = clips.filter((c) => c.body || c.phase === 'dash_wind');
        duration = 580;
        const effect = m1Config.skillCatalogue![id]!.effect;
        if (effect.mode === 'dash')
          rate = 580 / ((effect.distance / effect.speed) * 1000 + 80);
        this.trails.set(e.sourceId, {
          last: { x: e.x, y: e.y },
          count: 0,
          at: this.scene.time.now,
          direction: facing(e.fx ?? 1, e.fy ?? 0),
        });
        // Motion is always received from the server; the preview's scripted -140 is never used.
      }
      if (id === 'that_tinh_kiem') {
        const effect = m1Config.skillCatalogue![id]!.effect;
        if (effect.mode === 'multi_hit')
          rate =
            plan.duration /
            (((effect.hits * effect.spacingTicks + 1) * 1000) /
              m1Config.tickRate);
      }
      if (id === 'van_kiem_quy_tong') {
        clips = clips.filter((c) => c.body || c.phase === 'sword_gather');
        duration = 500;
      }
      if (id === 'toa_sat_bac_do') {
        clips = clips.filter((c) => c.body && c.tag === 'cast');
        duration = 320;
      }
      if (id === 'dai_luc_kim_cuong_chuong') {
        clips = clips
          .filter((c) => c.body || c.phase === 'golden_palm_travel')
          .map((c) => ({ ...c }));
        const effect = m1Config.skillCatalogue![id]!.effect;
        const windup =
          effect.mode === 'arc'
            ? ((effect.windupTicks ?? 12) * 1000) / m1Config.tickRate
            : 400;
        rate = 1050 / windup;
        duration = 1050;
        for (const c of clips) if (!c.body && c.to) c.to = [e.radius ?? 78, 0];
      }
      if (id === 'tam_gioi_quy_thien') {
        clips = clips
          .filter((c) => !['armor_hit', 'armor_break_seal'].includes(c.phase))
          .map((c) => ({ ...c, at: c.at * 1.5, end: c.end * 1.5 }));
        duration *= 1.5;
      }
      if (id === 'bat_dong_minh_vuong')
        clips = clips.filter((c) => c.phase !== 'healing_pulse');
      if (id === 'nhu_lai_thien_diep') {
        clips = clips.filter((c) => c.body);
        duration = 440;
      }
      if (id === 'thieu_lam_dao') {
        clips = clips
          .filter((c) => c.at < 770)
          .map((c) => (c.body ? c : { ...c, scale: (c.scale ?? 1) * 1.2 }));
        duration = 400;
        const a = this.actor(e.sourceId),
          cadence =
            ((a?.basicCooldown || 23 / (a?.build.stats.attackSpeed || 1)) *
              1000) /
            m1Config.tickRate;
        rate = 400 / Math.max(1000 / 6, Math.min(400, cadence));
      }
      this.start(e, clips, duration, { rate });
    }
    if (e.kind === 'pulse' && id === 'toa_sat_bac_do') {
      if (e.stage === 'guard_received')
        this.start(
          e,
          [
            this.single(
              'toa_sat_bac_do_vfx',
              'received',
              300,
              'guard_received',
              { scale: 2 },
            ),
          ],
          300,
        );
      if (e.stage === 'counter_release') {
        const release = animationReviewPlan(id)
          .clips.filter((c) => c.at >= 2800 && c.phase !== 'received_damage')
          .map((c) => ({ ...c, at: c.at - 2800, end: c.end - 2800 }));
        for (const c of release)
          if (c.from && c.to) {
            const k = (e.radius ?? 110) / 200;
            c.from = [c.from[0] * k, c.from[1] * k];
            c.to = [c.to[0] * k, c.to[1] * k];
          }
        this.start(e, release, 1000, { follow: false });
      }
    }
    if (e.kind === 'hit') {
      if (['van_kiem_quy_tong', 'that_tinh_kiem'].includes(id))
        this.start(
          e,
          [
            this.single(
              'review_sword',
              'impact',
              300,
              'confirmed_sword_impact',
              { scale: 0.7, fade: true },
            ),
          ],
          300,
        );
      if (id === 'dai_luc_kim_cuong_chuong' || id === 'nhu_lai_thien_diep')
        this.start(
          e,
          [
            this.single('review_palm', 'impact', 500, 'confirmed_palm_impact', {
              scale: id === 'nhu_lai_thien_diep' ? 1.25 : 1,
              fade: true,
            }),
          ],
          500,
        );
      if (id === 'tam_gioi_quy_thien')
        this.start(
          e,
          [
            this.single(
              'tam_gioi_quy_thien_vfx',
              'impact',
              600,
              'confirmed_armor_hit',
              { scale: 2.6 },
            ),
          ],
          600,
        );
    }
    if (
      e.kind === 'pulse' &&
      id === 'bat_dong_minh_vuong' &&
      e.stage === 'heal' &&
      e.damage > 0
    )
      this.start(
        e,
        [
          this.single(
            'bat_dong_minh_vuong_vfx',
            'healing_pulse',
            550,
            'confirmed_heal',
            { scale: 2.2 },
          ),
        ],
        550,
        { follow: false },
      );
    return true;
  }
  private draw(
    view: ClipView,
    clock: number,
    p: Point,
    d: ReviewDirection,
  ): void {
    const { cue: c, sprite: s, tag } = view,
      elapsed = clock - c.at;
    const visible = elapsed >= 0 && clock < c.end;
    s.setVisible(visible);
    if (!visible) return;
    const progress = elapsed / (c.end - c.at),
      from = c.from ?? [0, 0],
      to = c.to ?? from,
      [fx, fy] = vector[d];
    const x = from[0] + (to[0] - from[0]) * progress,
      y = from[1] + (to[1] - from[1]) * progress;
    s.setPosition(
      Math.round(
        p.x +
          (c.facingSpace ? fx * x - fy * y : x) +
          tag.effectPlacementOffset[0],
      ),
      Math.round(
        p.y +
          (c.facingSpace ? fy * x + fx * y : y) +
          tag.effectPlacementOffset[1] -
          (c.elevation ?? 0),
      ),
    );
    s.setDepth(
      c.ground
        ? -4 // Above world floor/decor (-10000..-9000), below every actor including northern neighbors.
        : p.y + (c.phase === 'light_afterimage' ? -0.2 : 0.4),
    );
    s.setRotation((c.angle ?? 0) + (c.facingSpace ? Math.atan2(fy, fx) : 0));
    s.setAlpha((c.alpha ?? 1) * (c.fade ? 1 - progress : 1));
    const durations =
        tag.frameDurationsMs ?? tag.frames.map(() => 1000 / tag.frameRate),
      total = durations.reduce((a, b) => a + b, 0);
    const index =
      c.hold ??
      reviewFrameIndex(
        durations,
        c.loop ? elapsed : progress * total,
        c.loop ?? false,
      );
    s.setFrame(tag.frames[index]!);
    this.observe(c.asset, String(s.frame.name));
    this.phases.add(c.phase);
  }
  private loop(
    key: string,
    owner: string,
    skill: string,
    cue: ReviewClip,
    p: Point,
    d: ReviewDirection,
    wanted: Set<string>,
    field = false,
  ): void {
    wanted.add(key);
    let entry = this.loops.get(key);
    if (
      entry &&
      (entry.view.cue.asset !== cue.asset ||
        entry.view.cue.tag !== cue.tag ||
        entry.direction !== d)
    ) {
      entry.view.sprite.destroy();
      this.loops.delete(key);
      entry = undefined;
    }
    if (!entry) {
      entry = {
        owner,
        skill,
        phase: cue.phase,
        view: this.make(cue, d),
        started: this.scene.time.now,
        point: { ...p },
        direction: d,
        field,
      };
      this.loops.set(key, entry);
    }
    entry.point = { x: p.x, y: p.y };
    this.draw(
      entry.view,
      Math.min(cue.end - 1, this.scene.time.now - entry.started),
      p,
      d,
    );
  }
  sync(
    state: LobbyState | undefined,
    zone: string,
    renderPoint?: (id: string) => Point | undefined,
  ): void {
    if (zone !== this.zone || !state || state.phase === 'DEFEAT') this.clear();
    this.state = state;
    this.zone = zone;
    this.renderPoint = renderPoint;
    if (!state || state.phase === 'DEFEAT') return;
    const now = this.scene.time.now,
      wanted = new Set<string>();
    state.areas.forEach((a, key) => {
      const owner = this.actor(a.ownerId);
      if (
        a.abilityId !== 'lien_hoa_phien' ||
        a.zoneId !== zone ||
        !owner ||
        owner.hp <= 0 ||
        a.ticks <= 0
      )
        return;
      const effect = m1Config.skillCatalogue!['lien_hoa_phien']!.effect;
      const duration = effect.mode === 'area' ? effect.durationTicks : 180;
      const elapsed =
        (Math.max(0, duration - a.ticks) * 1000) / m1Config.tickRate;
      const scale = (a.radius * 2) / 180;
      this.loop(
        'field:' + key,
        a.ownerId,
        a.abilityId,
        this.single(
          'review_lotus',
          elapsed < 400 ? 'opening' : 'loop',
          elapsed < 400 ? 400 : 1e9,
          'lotus_ground',
          { ground: true, loop: elapsed >= 400, scale },
        ),
        a,
        'right',
        wanted,
        true,
      );
      if (Math.hypot(owner.x - a.x, owner.y - a.y) <= a.radius) {
        const p = this.point(a.ownerId) ?? owner;
        this.loop(
          'protected:' + key,
          a.ownerId,
          a.abilityId,
          this.single(
            'thien_son_wind_actions_v2_aura',
            'guard_loop',
            1e9,
            'protected_inside',
            { loop: true, alpha: 0.38, scale: 0.8 },
          ),
          p,
          facing(owner.fx, owner.fy),
          wanted,
        );
      }
    });
    state.players.forEach((a, id) => {
      if (a.hp <= 0 || a.zoneId !== zone) return;
      const p = this.point(id) ?? a,
        ss = JSON.parse(a.statuses || '[]') as {
          kind: string;
          abilityId: string;
        }[];
      if (
        ss.some(
          (s) => s.kind === 'channel' && s.abilityId === 'van_kiem_quy_tong',
        )
      )
        this.channels.add(id);
      else if (this.channels.delete(id))
        this.start(
          {
            id: 0,
            kind: 'pulse',
            sourceId: id,
            targetId: '',
            abilityId: 'van_kiem_quy_tong',
            x: p.x,
            y: p.y,
            fx: a.fx,
            fy: a.fy,
            damage: 0,
            critical: false,
          },
          [
            this.single('review_sword', 'impact', 500, 'sword_dissolve', {
              alpha: 0.65,
              scale: 1.6,
              fade: true,
            }),
          ],
          500,
        );
      if (
        ss.some(
          (s) => s.kind === 'guard_counter' && s.abilityId === 'toa_sat_bac_do',
        )
      ) {
        const d = facing(a.fx, a.fy);
        this.loop(
          'guard:' + id,
          id,
          'toa_sat_bac_do',
          this.single(
            'vo_dang_shield_formation_v2_aura',
            'mana_loop',
            1e9,
            'guard_70_percent',
            { loop: true, alpha: 0.5 },
          ),
          p,
          d,
          wanted,
        );
        this.loop(
          'ready:' + id,
          id,
          'toa_sat_bac_do',
          this.single(
            'toa_sat_bac_do_vfx',
            'readiness',
            1e9,
            'sheathed_readiness',
            { loop: true, scale: 2 },
          ),
          p,
          d,
          wanted,
        );
      }
      if (
        ss.some(
          (s) =>
            s.kind === 'defense_break' && s.abilityId === 'tam_gioi_quy_thien',
        )
      )
        this.loop(
          'armor:' + id,
          id,
          'tam_gioi_quy_thien',
          this.single(
            'tam_gioi_quy_thien_vfx',
            'armor_break',
            1e9,
            'armor_break_seal',
            { loop: true, scale: 2 },
          ),
          p,
          facing(a.fx, a.fy),
          wanted,
        );
      if (
        ss.some(
          (s) =>
            s.kind === 'defense_buff' && s.abilityId === 'nhu_lai_thien_diep',
        )
      )
        this.loop(
          'ally:' + id,
          id,
          'nhu_lai_thien_diep',
          this.single(
            'nhu_lai_thien_diep_vfx',
            'ally_defense',
            1e9,
            'ally_defense',
            { loop: true },
          ),
          p,
          facing(a.fx, a.fy),
          wanted,
        );
    });
    // Armor-break belongs to confirmed enemy status, not a delayed cast assumption.
    state.creeps.forEach((a, id) => {
      if (a.hp <= 0 || a.zoneId !== zone) return;
      const ss = JSON.parse(a.statuses || '[]') as {
        kind: string;
        abilityId: string;
      }[];
      if (
        ss.some(
          (s) =>
            s.kind === 'defense_break' && s.abilityId === 'tam_gioi_quy_thien',
        )
      )
        this.loop(
          'armor:' + id,
          id,
          'tam_gioi_quy_thien',
          this.single(
            'tam_gioi_quy_thien_vfx',
            'armor_break',
            1e9,
            'armor_break_seal',
            { loop: true, scale: 2 },
          ),
          a,
          facing(a.fx, a.fy),
          wanted,
        );
    });
    for (const [key, entry] of this.loops)
      if (!wanted.has(key)) {
        const a = this.actor(entry.owner);
        if (entry.field && a && a.hp > 0 && a.zoneId === zone)
          this.start(
            {
              id: 0,
              kind: 'pulse',
              sourceId: entry.owner,
              targetId: '',
              abilityId: entry.skill,
              x: entry.point.x,
              y: entry.point.y,
              damage: 0,
              critical: false,
            },
            [
              this.single('review_lotus', 'loop', 500, 'lotus_ending', {
                ground: true,
                loop: true,
                fade: true,
                scale: entry.view.sprite.scaleX,
              }),
            ],
            500,
            { follow: false },
          );
        entry.view.sprite.destroy();
        this.loops.delete(key);
      }
    const shotKeys = new Set<string>();
    state.projectiles.forEach((p, id) => {
      if (
        !['van_kiem_quy_tong', 'nhu_lai_thien_diep'].includes(p.abilityId) ||
        p.zoneId !== zone ||
        (this.actor(p.ownerId)?.hp ?? 0) <= 0
      )
        return;
      shotKeys.add(id);
      let views = this.shots.get(id);
      const count = p.abilityId === 'nhu_lai_thien_diep' ? 7 : 1;
      if (!views) {
        views = Array.from({ length: count }, (_, i) =>
          this.make(
            this.single(
              count === 1 ? 'review_sword' : 'review_palm',
              'travel',
              1e9,
              'authoritative_projectile',
              {
                at: count === 1 ? 0 : i * 120,
                loop: true,
                scale: count === 1 ? 0.7 : 0.65 + i * 0.04,
                alpha: count === 1 ? 1 : 0.8,
                facingSpace: true,
                elevation: 24,
                from:
                  count === 1 ? [0, 0] : [-(i % 3) * 18, ((i % 3) - 1) * 26],
              },
            ),
            'right',
          ),
        );
        this.shots.set(id, views);
        this.shotMeta.set(id, {
          owner: p.ownerId,
          skill: p.abilityId,
          born: now,
          point: { x: p.x, y: p.y },
          direction: facing(p.vx, p.vy),
        });
      }
      const meta = this.shotMeta.get(id)!;
      meta.point = { x: p.x, y: p.y };
      for (const v of views) {
        this.draw(v, now - meta.born, p, 'right');
        v.sprite.setRotation(Math.atan2(p.vy, p.vx));
        // Offset the echoes along the received heading without changing the authoritative point.
        const theta = Math.atan2(p.vy, p.vx),
          [x, y] = v.cue.from ?? [0, 0];
        v.sprite.setPosition(
          Math.round(p.x + Math.cos(theta) * x - Math.sin(theta) * y),
          Math.round(p.y + Math.sin(theta) * x + Math.cos(theta) * y - 24),
        );
      }
    });
    for (const [id, views] of this.shots)
      if (!shotKeys.has(id)) {
        const meta = this.shotMeta.get(id),
          owner = meta && this.actor(meta.owner);
        if (
          meta?.skill === 'nhu_lai_thien_diep' &&
          owner &&
          owner.hp > 0 &&
          owner.zoneId === zone
        ) {
          const [fx, fy] = vector[meta.direction];
          this.start(
            {
              id: 0,
              kind: 'pulse',
              sourceId: meta.owner,
              targetId: '',
              abilityId: meta.skill,
              ...meta.point,
              fx,
              fy,
              damage: 0,
              critical: false,
            },
            [
              this.single(
                'review_palm',
                'travel',
                400,
                'thousand_leaf_ending',
                {
                  loop: true,
                  fade: true,
                  scale: 0.8,
                  elevation: 24,
                  facingSpace: true,
                },
              ),
            ],
            400,
            { follow: false },
          );
        }
        for (const v of views) v.sprite.destroy();
        this.shots.delete(id);
        this.shotMeta.delete(id);
      }
    for (const id of this.channels) {
      const a = this.actor(id);
      if (!a || a.hp <= 0 || a.zoneId !== zone) this.channels.delete(id);
    }
    for (const [id, trail] of this.trails) {
      const a = this.actor(id),
        p = this.point(id);
      if (!a || !p || a.hp <= 0 || a.zoneId !== zone || now - trail.at > 600) {
        this.trails.delete(id);
        continue;
      }
      const distance = Math.hypot(p.x - trail.last.x, p.y - trail.last.y);
      if (distance > 0.5 && trail.count < 6) {
        const count = Math.min(
          6 - trail.count,
          Math.max(1, Math.round(distance / 10)),
        );
        for (let i = 0; i < count; i++) {
          const at = {
            x: trail.last.x + ((p.x - trail.last.x) * i) / count,
            y: trail.last.y + ((p.y - trail.last.y) * i) / count,
          };
          const [fx, fy] = vector[trail.direction];
          const e: CombatEvent = {
            id: 0,
            kind: 'pulse',
            sourceId: id,
            targetId: '',
            abilityId: 'phong_anh_hoan_vi',
            ...at,
            fx,
            fy,
            damage: 0,
            critical: false,
          };
          const echo = this.start(
            e,
            a.schoolId === 'thien_son'
              ? [
                  this.single(
                    'thien_son_dao_v2_afterimage',
                    'moving_ghost',
                    560,
                    'light_afterimage',
                    { loop: true, alpha: 0.5, fade: true },
                  ),
                ]
              : [],
            560,
            { follow: false },
          );
          const image = this.renderPoint?.(id) as
            Phaser.GameObjects.Sprite | undefined;
          if (image?.texture && image.frame) {
            // Snapshot actual authored owner pixels: mixed-school casts keep their own costume.
            const cue = this.single(
              image.texture.key,
              'snapshot',
              480,
              'light_afterimage',
              { hold: 0, alpha: 0.62, fade: true },
            );
            const tag: RasterAnimation = {
              name: 'snapshot',
              frames: [String(image.frame.name)],
              frameRate: 10,
              repeat: 0,
              direction: trail.direction,
              origin: [image.originX, image.originY],
              frameDimensions: [image.frame.realWidth, image.frame.realHeight],
              stage: 'afterimage',
              placement: 'character_feet',
              effectPlacementOffset: [0, 0],
            };
            echo.views.push({
              cue,
              tag,
              sprite: this.scene.add
                .sprite(0, 0, image.texture.key, image.frame.name)
                .setOrigin(...tag.origin)
                .setScale(image.scaleX),
            });
          }
          trail.count++;
        }
      }
      trail.last = { x: p.x, y: p.y };
    }
    this.runs = this.runs.filter((run) => {
      const a = this.actor(run.owner),
        elapsed = (now - run.started) * run.rate;
      const valid =
        elapsed < run.duration &&
        a &&
        a.hp > 0 &&
        a.zoneId === zone &&
        (run.revision === undefined || run.revision === a.build.revision);
      if (!valid) {
        for (const v of run.views) v.sprite.destroy();
        return false;
      }
      const p = run.follow ? (this.point(run.owner) ?? run.origin) : run.origin;
      for (const v of run.views)
        this.draw(
          v,
          elapsed,
          v.cue.anchor === 'start' ? run.origin : p,
          run.direction,
        );
      return true;
    });
  }
  actorCast(id: string, pose: string, fx: number, fy: number, hp: number) {
    if (
      pose === 'stun' ||
      hp <= 0 ||
      !this.state ||
      this.state.phase === 'DEFEAT'
    )
      return undefined;
    const a = this.actor(id),
      now = this.scene.time.now;
    for (const run of [...this.runs].reverse()) {
      if (!run.body || run.owner !== id || run.impact) continue;
      const t = (now - run.started) * run.rate,
        cue = run.clips.filter((c) => c.body && t >= c.at && t < c.end).at(-1);
      if (
        !cue ||
        !this.heroes.get(run.skill)?.startsWith('hero_' + a?.schoolId)
      )
        continue;
      return this.pose(
        cue,
        run.direction,
        cue.end - cue.at,
        run.token,
        run.rate,
      );
    }
    if (
      a?.schoolId === 'vo_dang' &&
      pose === 'idle' &&
      JSON.parse(a.statuses || '[]').some(
        (s: { kind: string }) => s.kind === 'guard_counter',
      )
    )
      return this.pose(
        this.single('toa_sat_bac_do_character', 'ready', 100, 'ready', {
          loop: true,
        }),
        facing(fx, fy),
        100,
        'feedback:approved:ready:' + id,
        1,
      );
    return undefined;
  }
  private pose(
    c: ReviewClip,
    d: ReviewDirection,
    duration: number,
    token: string,
    rate: number,
  ) {
    const tag = this.tag(c.asset, c.tag, d),
      native =
        tag.frameDurationsMs?.reduce((a, b) => a + b, 0) ??
        (tag.frames.length * 1000) / tag.frameRate;
    return {
      texture: c.asset,
      animation: rasterAnimationKey(c.asset, tag.name),
      origin: tag.origin,
      firstFrame: tag.frames[0]!,
      scale: 1,
      durationMs: duration / rate,
      token,
      timeScale: c.loop ? 1 : (native / duration) * rate,
      startFrame: c.hold ?? 0,
    };
  }
  observe(asset: string, frame: string) {
    this.observed.add(asset + ':' + frame);
  }
  clear() {
    for (const run of this.runs) for (const v of run.views) v.sprite.destroy();
    this.runs = [];
    for (const v of this.loops.values()) v.view.sprite.destroy();
    this.loops.clear();
    for (const views of this.shots.values())
      for (const v of views) v.sprite.destroy();
    this.shots.clear();
    this.shotMeta.clear();
    this.channels.clear();
    this.trails.clear();
  }
  inspect() {
    return {
      runs: this.runs.length,
      persistent: [...this.loops].map(([key, e]) => ({
        key,
        owner: e.owner,
        skill: e.skill,
        phase: e.phase,
        x: e.view.sprite.x,
        y: e.view.sprite.y,
        depth: e.view.sprite.depth,
      })),
      projectiles: this.shots.size,
      trails: this.trails.size,
      observedFrames: [...this.observed],
      phases: [...this.phases],
      events: [...this.history],
      active: this.runs.flatMap((r) =>
        r.views
          .filter((v) => v.sprite.visible)
          .map((v) => ({
            owner: r.owner,
            skill: r.skill,
            phase: v.cue.phase,
            asset: v.cue.asset,
            x: v.sprite.x,
            y: v.sprite.y,
          })),
      ),
    };
  }
}
