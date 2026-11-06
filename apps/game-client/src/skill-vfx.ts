import Phaser from 'phaser';
import {RenovationFeedback,preloadRenovationFeedback} from './renovation-feedback.js';
import { renovatedSkillComponents } from './renovation-skill-components.js';
import {
  skillArt,
  skillAnimationKey,
  skillVisualStages,
  basicSkillVisualAliases,
  statusVisuals,
  type SkillAnimation,
} from '@volam/game-data';
import type { CombatEvent } from '@volam/game-core';
import type { LobbyState } from '@volam/game-protocol';
import { facing } from './facing.js';
import { FeedbackVfx } from './feedback-vfx.js';
import { M3dFeedback, m3dAssets } from './m3d-feedback.js';
import { M3dR3Feedback } from './m3d-r3-feedback.js';
import { r3Assets } from './m3d-r3-art.js';
import { preloadR3Arena } from './m3d-r3-arena.js';
import { feedbackArt } from './feedback-art.js';
import { ApprovedSkillVfx, approvedSkillAssets } from './approved-skill-vfx.js';
import { feedbackProjectile, feedbackScale } from './feedback-visuals.js';
import {
  preloadRasterAnimations,
  registerRasterAnimations,
} from './skill-art-registry.js';

const components = new Map(skillArt.assets.map((a) => [a.id, a]));
export function preloadSkillArt(scene: Phaser.Scene): void {
  preloadRenovationFeedback(scene);
  scene.load.svg(
    'leaf-halo',
    '/assets/visual-improvement-approved/leaf-halo.svg',
  );
  preloadR3Arena(scene);
  preloadRasterAnimations(scene, renovatedSkillComponents);
  preloadRasterAnimations(scene, skillArt.assets);
  preloadRasterAnimations(scene, feedbackArt);
  preloadRasterAnimations(scene, approvedSkillAssets);
  preloadRasterAnimations(scene, m3dAssets);
  preloadRasterAnimations(scene, r3Assets);
}
export function registerSkillArt(scene: Phaser.Scene): void {
  registerRasterAnimations(scene, renovatedSkillComponents);
  registerRasterAnimations(scene, skillArt.assets);
  registerRasterAnimations(scene, feedbackArt);
  registerRasterAnimations(scene, approvedSkillAssets);
  registerRasterAnimations(scene, m3dAssets);
  registerRasterAnimations(scene, r3Assets);
}
interface EffectView {
  sprite: Phaser.GameObjects.Sprite;
  tag: SkillAnimation;
  ownerId: string;
  impact?: boolean;
}
interface VfxActor {
  x: number;
  y: number;
  fx: number;
  fy: number;
  hp: number;
  statuses: string;
  zoneId: string;
}
export class SkillVfx {
  private renovated: RenovationFeedback;
  private r3: M3dR3Feedback;
  private m3d: M3dFeedback;
  private feedback: FeedbackVfx;
  private approved: ApprovedSkillVfx;
  private transient = new Set<EffectView>();
  private persistent = new Map<string, EffectView>();
  private projectiles = new Map<string, EffectView>();
  private frameObservations = new Set<string>();
  private played = new Set<string>();
  private casts = new Map<
    string,
    {
      abilityId: string;
      fx: number;
      fy: number;
      started?: number;
      prefix?: string;
      pulses?: number;
    }
  >();
  private state: LobbyState | undefined;
  constructor(private scene: Phaser.Scene) {
    this.renovated=new RenovationFeedback(scene);
    this.r3 = new M3dR3Feedback(scene);
    this.m3d = new M3dFeedback(scene);
    this.feedback = new FeedbackVfx(scene);
    this.approved = new ApprovedSkillVfx(scene);
  }
  private tag(
    asset: string,
    prefix: string,
    fx: number,
    fy: number,
  ): SkillAnimation | undefined {
    const a = components.get(asset);
    return (
      a?.animations.find((t) => t.name === `${prefix}_${facing(fx, fy)}`) ??
      a?.animations.find((t) => t.name === prefix)
    );
  }
  private make(
    asset: string,
    prefix: string,
    x: number,
    y: number,
    fx: number,
    fy: number,
    ownerId: string,
    loop = false,
  ): EffectView | undefined {
    const tag = this.tag(asset, prefix, fx, fy);
    if (!tag) return;
    const sprite = this.scene.add
      .sprite(x, y, asset, tag.frames[0]!)
      .setOrigin(...tag.origin)
      .setScale(
        (components.get(asset)?.displayScale ?? 1) *
          feedbackScale(asset, prefix),
      );
    sprite.play({
      key: skillAnimationKey(asset, tag.name),
      ...(loop ? { repeat: -1 } : {}),
    });
    this.played.add(skillAnimationKey(asset, tag.name));
    const view = { sprite, tag, ownerId };
    this.place(view, x, y);
    sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => {
      this.frameObservations.add(`${asset}:${String(sprite.frame.name)}`);
    });
    return view;
  }
  private place(view: EffectView, x: number, y: number): void {
    if (
      view.sprite.texture.key === 'kim_cang_bat_hoai_vfx' ||
      (view.sprite.texture.key === 'la_han_quyen_vfx' &&
        /^(guard|ending)/.test(view.tag.name))
    ) {
      view.sprite
        .setOrigin(0.5)
        .setPosition(Math.round(x), Math.round(y))
        .setScale(1, 0.35)
        .setDepth(y - 1);
      return;
    }
    view.sprite
      .setPosition(
        Math.round(x + view.tag.effectPlacementOffset[0]),
        Math.round(y + view.tag.effectPlacementOffset[1]),
      )
      .setDepth(
        view.tag.placement === 'ground' &&
          skillVisualStages[
            components.get(view.sprite.texture.key)?.skillId ?? ''
          ]?.area
          ? -10
          : view.tag.placement === 'ground' ||
              view.tag.placement === 'caster_front_ground'
            ? y - 0.3
            : y + 0.4,
      );
  }
  private burst(
    asset: string,
    prefix: string,
    event: CombatEvent,
    ownerId = event.sourceId,
    durationMs?: number,
  ): void {
    const placement = this.tag(
      asset,
      prefix,
      event.fx ?? 1,
      event.fy ?? 0,
    )?.placement;
    const caster =
      event.kind === 'hit' && placement?.startsWith('caster')
        ? this.state?.players.get(event.sourceId)
        : undefined;
    const view = this.make(
      asset,
      prefix,
      caster?.x ?? event.x,
      caster?.y ?? event.y,
      event.fx ?? 1,
      event.fy ?? 0,
      ownerId,
    );
    if (!view) return;
    if (
      ['hoanh_tao_bong', 'cam_long_cong'].includes(event.abilityId) &&
      event.radius &&
      event.kind === 'cast'
    )
      view.sprite.setScale(
        Math.max(
          1,
          event.radius / (event.abilityId === 'cam_long_cong' ? 160 : 64),
        ),
      );
    if (
      event.radius &&
      view.tag.placement === 'ground' &&
      (skillVisualStages[event.abilityId]?.area ||
        event.stage === 'strike' ||
        event.stage === 'support_tick')
    )
      view.sprite.setScale((event.radius * 2) / view.tag.frameDimensions[0]);
    if (event.abilityId === 'liet_phong_dao' && event.kind === 'cast')
      view.sprite
        .setOrigin(0.5, 0.5)
        .setPosition(event.x, event.y - 54)
        .setScale(1.8);
    if (durationMs)
      view.sprite.anims.timeScale =
        ((view.tag.frames.length / view.tag.frameRate) * 1000) / durationMs;
    view.impact = event.kind === 'hit';
    this.transient.add(view);
    const remove = () => {
      this.transient.delete(view);
      view.sprite.destroy();
    };
    view.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, remove);
    // An incorrectly looped optional source tag must not become an immortal impact.
    this.scene.time.delayedCall(
      Math.max(
        200,
        durationMs ??
          (view.tag.frames.length / view.tag.frameRate) * 1000 + 100,
      ),
      () => {
        if (this.transient.has(view)) remove();
      },
    );
  }
  event(e: CombatEvent): void {
    this.renovated.event(e);
    if (this.r3.event(e)) return;
    if (this.m3d.event(e)) return;
    if (this.approved.event(e)) return;
    if (e.kind === 'attack') this.casts.delete(e.sourceId);
    if (this.feedback.event(e)) return;
    if (e.abilityId === 'liet_phong_dao') {
      if (e.kind === 'cast')
        this.burst('nhan_kiem_hop_nhat_vfx', 'travel', e, e.sourceId, 600);
      if (e.kind === 'pulse' && e.stage === 'strike')
        this.burst('liet_phong_dao_vfx', 'strike', e);
      return;
    }
    const skill =
      e.abilityId === 'thien_son_phien'
        ? 'lien_hoa_phien'
        : e.abilityId === 'thien_son_dao'
          ? 'liet_phong_dao'
          : (basicSkillVisualAliases[e.abilityId] ?? e.abilityId);
    const visual = skillVisualStages[skill];
    if (e.kind === 'attack') this.casts.delete(e.sourceId);
    if (e.kind === 'attack' && e.abilityId === 'cai_bang_bong')
      this.burst(
        'hoanh_tao_bong_vfx',
        e.stage === 'smash' ? 'impact' : 'sweep',
        e,
      );
    if (e.kind === 'attack' && e.abilityId.startsWith('thien_son_'))
      this.burst(
        e.abilityId === 'thien_son_phien'
          ? 'lien_hoa_phien_vfx'
          : 'liet_phong_dao_vfx',
        e.abilityId === 'thien_son_phien' ? 'sweep' : 'strike',
        e,
      );
    if (e.kind === 'attack' && e.abilityId.startsWith('vo_dang_'))
      this.burst(
        e.abilityId === 'vo_dang_quyen'
          ? 'luong_nghi_thu_vfx'
          : 'that_tinh_kiem_vfx',
        e.abilityId === 'vo_dang_quyen' ? 'release' : 'slash_a',
        e,
      );
    if (e.kind === 'attack' && e.abilityId.startsWith('thieu_lam_'))
      this.burst(
        e.abilityId === 'thieu_lam_quyen' ? 'la_han_quyen_vfx' : 'tru_ta_vfx',
        e.abilityId === 'thieu_lam_quyen' ? 'release' : 'slash',
        e,
      );
    if (e.kind === 'cast') {
      if (e.stage === 'toggle_off') {
        this.casts.delete(e.sourceId);
        return;
      }
      this.casts.set(e.sourceId, {
        abilityId: e.abilityId,
        fx: e.fx ?? 1,
        fy: e.fy ?? 0,
      });
      if (e.abilityId === 'hoanh_tao_bong') {
        for (const [fx, fy] of [
          [1, 0],
          [0, 1],
          [-1, 0],
          [0, -1],
        ])
          this.burst('hoanh_tao_bong_vfx', 'sweep', { ...e, fx, fy });
      } else if (visual?.release)
        this.burst(`${e.abilityId}_vfx`, visual.release, e);
      if (visual?.sharedRelease)
        this.burst(
          visual.sharedRelease.asset,
          visual.sharedRelease.animation,
          e,
        );
    }
    if (e.kind === 'hit') {
      if (
        !visual?.impact &&
        (e.abilityId.startsWith('thien_son_') ||
          /\/(thien-son|vo-dang)\//.test(
            components.get(`${skill}_vfx`)?.sheet ?? '',
          ))
      )
        return;
      const asset = visual?.impact ? `${skill}_vfx` : 'shared_fire_vfx',
        prefix =
          (e.stage === 'empowered' ? visual?.empoweredImpact : undefined) ??
          visual?.impact ??
          'small_impact';
      // Impacts belong to the hit target even if the caster leaves or dies.
      this.burst(asset, prefix, e, e.targetId);
    }
    if (e.kind === 'effect' && visual?.control) {
      const caster = this.state?.players.get(e.sourceId);
      this.burst(
        `${e.abilityId}_vfx`,
        visual.control,
        caster ? { ...e, x: caster.x, y: caster.y } : e,
      );
    }
    if (e.kind === 'pulse') {
      if (e.stage === 'combo_empowered' && visual?.empoweredRelease)
        this.burst(`${e.abilityId}_vfx`, visual.empoweredRelease, {
          ...e,
          kind: 'hit',
        });
      if (e.stage === 'strike' && visual?.strike)
        this.burst(`${e.abilityId}_vfx`, visual.strike, e);
      if (e.stage === 'support_tick' && visual?.supportPulse)
        this.burst(`${e.abilityId}_vfx`, visual.supportPulse, e);
      if (e.stage === 'mitigate' && visual?.absorption)
        this.burst(`${e.abilityId}_vfx`, visual.absorption, e);
      if (
        e.stage === 'finisher' &&
        this.tag(`${e.abilityId}_character`, 'finish', e.fx ?? 1, e.fy ?? 0)
      )
        this.casts.set(e.sourceId, {
          abilityId: e.abilityId,
          fx: e.fx ?? 1,
          fy: e.fy ?? 0,
          prefix: 'finish',
        });
      const cast = this.casts.get(e.sourceId);
      const repeated =
        e.stage === 'sweep' &&
        cast &&
        (cast.pulses = (cast.pulses ?? 0) + 1) > 1;
      if (e.stage === 'counter' && visual?.received)
        this.burst(`${e.abilityId}_vfx`, visual.received, e);
      if (e.stage === 'absorb' && visual?.absorption)
        this.burst(`${e.abilityId}_vfx`, visual.absorption, e);
      if (e.stage === 'refund' && visual?.refund)
        this.burst(`${e.abilityId}_vfx`, visual.refund, e);
      if (e.stage === 'counter') {
        this.casts.set(e.sourceId, {
          abilityId: e.abilityId,
          fx: e.fx ?? 1,
          fy: e.fy ?? 0,
          prefix: 'counter',
        });
        if (visual?.counter)
          this.burst(`${e.abilityId}_vfx`, visual.counter, e);
      }
      const animation =
        e.stage === 'area_tick'
          ? visual?.areaPulse
          : e.stage === 'finisher'
            ? visual?.finisherImpact
            : e.stage === 'explosion'
              ? visual?.areaImpact
              : repeated
                ? visual?.repeatPulse
                : visual?.pulse;
      if (
        animation &&
        ['area_tick', 'finisher', 'explosion', 'sweep'].includes(e.stage ?? '')
      )
        this.burst(`${e.abilityId}_vfx`, animation, e);
    }
  }
  sync(
    state: LobbyState | undefined,
    zoneId: string,
    renderPosition?: (id: string) => { x: number; y: number } | undefined,
  ): void {
    this.state = state;
    this.r3.sync(state, zoneId, renderPosition);
    this.m3d.sync(state, zoneId, renderPosition);
    this.approved.sync(state, zoneId, renderPosition);
    this.feedback.sync(state, zoneId, renderPosition);
    if (state?.phase === 'DEFEAT') {
      this.clear();
      return;
    }
    const actor = (id: string): VfxActor | undefined =>
      state?.players.get(id) ?? state?.creeps.get(id);
    for (const id of this.casts.keys()) {
      const a = actor(id);
      if (
        !a ||
        a.zoneId !== zoneId ||
        a.hp <= 0 ||
        JSON.parse(a.statuses).some((s: { kind: string }) => s.kind === 'stun')
      )
        this.casts.delete(id);
    }
    for (const v of this.transient) {
      const a = actor(v.ownerId);
      if (
        (!a || a.zoneId !== zoneId || a.hp <= 0) &&
        !v.impact &&
        !v.tag.stage.includes('impact')
      ) {
        v.sprite.destroy();
        this.transient.delete(v);
      }
    }
    const active = new Set<string>();
    const syncActor = (id: string, a: VfxActor) => {
      if (a.zoneId !== zoneId || a.hp <= 0) return;
      const point = renderPosition?.(id) ?? a;
      const statuses = JSON.parse(a.statuses) as Array<{
        kind: string;
        abilityId: string;
        magnitude: number;
      }>;
      for (const s of statuses) {
        if (this.r3.handles(s.abilityId)) continue;
        if (
          this.m3d.handles(s.abilityId) &&
          ['channel', 'dash', 'crit_buff'].includes(s.kind)
        )
          continue;
        if (this.approved.handles(s.abilityId)) continue;
        if (this.feedback.suppressesStatus(s.abilityId, s.kind)) continue;
        const stage = skillVisualStages[s.abilityId];
        const definition =
          stage?.persistent &&
          ([
            'channel',
            'dash',
            'speed_buff',
            'counter',
            'mana_shield',
            'damage_reduction',
            'support_aura',
          ].includes(s.kind) ||
            (s.kind === 'defense_break' &&
              ['vi_da_quyen', 'tam_gioi_quy_thien'].includes(s.abilityId)) ||
            (s.kind === 'defense_buff' &&
              s.abilityId === 'nhu_lai_thien_diep') ||
            (s.kind === 'slow' &&
              ['huyen_am_chuong', 'tru_ta'].includes(s.abilityId)))
            ? { asset: `${s.abilityId}_vfx`, prefix: stage.persistent }
            : statusVisuals[s.kind];
        if (!definition) continue;
        const cast = this.casts.get(id);
        const fx =
          s.kind === 'channel' && cast?.abilityId === s.abilityId
            ? cast.fx
            : a.fx;
        const fy =
          s.kind === 'channel' && cast?.abilityId === s.abilityId
            ? cast.fy
            : a.fy;
        const asset = definition.asset || `${s.abilityId}_vfx`,
          prefix = definition.prefix;
        const key = `${id}:${s.kind}:${s.abilityId}`,
          current = this.persistent.get(key),
          tag = this.tag(asset, prefix, fx, fy);
        active.add(key);
        if (current && current.tag.name !== tag?.name) {
          current.sprite.destroy();
          this.persistent.delete(key);
        }
        let view = this.persistent.get(key);
        if (!view) {
          view = this.make(asset, prefix, point.x, point.y, fx, fy, id, true);
          if (view) this.persistent.set(key, view);
        }
        if (view) this.place(view, point.x, point.y);
        if (
          view &&
          ['support_aura', 'channel'].includes(s.kind) &&
          s.magnitude > 1
        )
          view.sprite.setScale((s.magnitude * 2) / view.tag.frameDimensions[0]);
        if (stage?.extraPersistent) {
          const extraKey = key + ':extra';
          active.add(extraKey);
          let extra = this.persistent.get(extraKey);
          if (!extra) {
            extra = this.make(
              asset,
              stage.extraPersistent,
              point.x,
              point.y,
              a.fx,
              a.fy,
              id,
              true,
            );
            if (extra) this.persistent.set(extraKey, extra);
          }
          if (extra) this.place(extra, point.x, point.y);
        }
      }
    };
    state?.players.forEach((a, id) => syncActor(id, a));
    state?.creeps.forEach((a, id) => syncActor(id, a));
    state?.areas.forEach((a, id) => {
      if (this.r3.areaHandled(a.abilityId)) return;
      if (this.m3d.areaHandled(a.abilityId)) return;
      if (this.approved.handles(a.abilityId)) return;
      if (this.feedback.areaHandled(a.abilityId)) return;
      if (a.zoneId !== zoneId) return;
      const key = 'area:' + id,
        prefix =
          a.abilityId === 'khang_long_huu_hoi'
            ? 'burn_flecks'
            : skillVisualStages[a.abilityId]?.area;
      if (!prefix) return;
      active.add(key);
      let v = this.persistent.get(key);
      if (!v) {
        v = this.make(
          a.abilityId === 'khang_long_huu_hoi'
            ? 'shared_fire_vfx'
            : `${a.abilityId}_vfx`,
          prefix,
          a.x,
          a.y,
          1,
          0,
          a.ownerId,
          true,
        );
        if (v) this.persistent.set(key, v);
      }
      if (v) {
        this.place(v, a.x, a.y);
        v.sprite.setScale((a.radius * 2) / v.tag.frameDimensions[0]);
      }
    });
    for (const [key, view] of this.persistent)
      if (!active.has(key)) {
        const a = actor(view.ownerId),
          skill = view.sprite.texture.key.replace(/_vfx$/, ''),
          expiry = skillVisualStages[skill]?.expiry;
        if (
          expiry &&
          a &&
          a.hp > 0 &&
          a.zoneId === zoneId &&
          !key.endsWith(':extra')
        )
          this.burst(`${skill}_vfx`, expiry, {
            id: 0,
            kind: 'pulse',
            sourceId: view.ownerId,
            targetId: '',
            abilityId: skill,
            x: key.startsWith('area:') ? view.sprite.x : a.x,
            y: key.startsWith('area:') ? view.sprite.y : a.y,
            fx: a.fx,
            fy: a.fy,
            radius: key.startsWith('area:') ? view.sprite.displayWidth / 2 : 0,
            damage: 0,
            critical: false,
          });
        view.sprite.destroy();
        this.persistent.delete(key);
      }
    const shots = new Set<string>();
    state?.projectiles.forEach((p, id) => {
      if (this.r3.projectileHandled(p.abilityId)) return;
      if (this.m3d.projectileHandled(p.abilityId)) return;
      if (this.approved.handles(p.abilityId)) return;
      if (this.feedback.projectileHandled(p.abilityId, p.stage)) return;
      if (p.zoneId !== zoneId) return;
      shots.add(id);
      const skill = basicSkillVisualAliases[p.abilityId] ?? p.abilityId;
      const temporary = feedbackProjectile(p.abilityId, p.stage);
      const prefix =
          temporary?.prefix ?? skillVisualStages[skill]?.travel ?? 'projectile',
        asset = temporary?.asset ?? `${skill}_vfx`;
      let v = this.projectiles.get(id);
      if (!v) {
        v = this.make(asset, prefix, p.x, p.y, p.vx, p.vy, p.ownerId, true);
        if (v) this.projectiles.set(id, v);
      }
      if (v) {
        this.place(v, p.x, p.y);
        if (temporary) {
          v.sprite.setScale(temporary.scale);
          if (temporary.centered)
            v.sprite
              .setOrigin(0.5, 0.5)
              .setPosition(Math.round(p.x), Math.round(p.y - 20))
              .setDepth(p.y + 0.4);
        } else if (
          p.abilityId === 'vo_dang_kiem' ||
          p.abilityId === 'nhan_kiem_hop_nhat'
        ) {
          v.sprite.setPosition(Math.round(p.x), Math.round(p.y - 22));
        } else if (
          p.abilityId === 'huyen_am_chuong' ||
          p.abilityId === 'hang_long_hoa_vu'
        )
          v.sprite.setScale(1.4);
        const angle: Record<string, number> = {
          right: 0,
          down: Math.PI / 2,
          left: Math.PI,
          up: -Math.PI / 2,
        };
        v.sprite.setRotation(
          Math.atan2(p.vy, p.vx) - (angle[v.tag.direction] ?? 0),
        );
      }
    });
    for (const [key, v] of this.projectiles)
      if (!shots.has(key)) {
        v.sprite.destroy();
        this.projectiles.delete(key);
      }
    this.renovated.sync(state,zoneId,renderPosition);
  }
  castPresentation(
    id: string,
    fx: number,
    fy: number,
    prefix = 'cast',
  ):
    | {
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
    | undefined {
    const asset = `${id}_character`,
      tag = this.tag(asset, prefix, fx, fy);
    if (!tag) return;
    return {
      texture: asset,
      animation: skillAnimationKey(asset, tag.name),
      origin: tag.origin,
      firstFrame: tag.frames[0]!,
      scale: components.get(asset)?.displayScale ?? 1,
      durationMs: (tag.frames.length / tag.frameRate) * 1000,
      token: 'legacy',
      timeScale: 1,
      startFrame: 0,
    };
  }
  clear(): void {
    this.renovated.clear();
    this.r3.clear();
    this.m3d.clear();
    this.approved.clear();
    this.feedback.clear();
    this.casts.clear();
    for (const v of [
      ...this.transient,
      ...this.persistent.values(),
      ...this.projectiles.values(),
    ])
      v.sprite.destroy();
    this.transient.clear();
    this.persistent.clear();
    this.projectiles.clear();
  }
  observeCharacter(texture: string, frame: string) {
    this.r3.observeCharacter(texture, frame);
    this.m3d.observe(texture, frame);
    this.approved.observe(texture, frame);
    this.feedback.observeCharacter(texture, frame);
    if (components.has(texture)) {
      this.frameObservations.add(`${texture}:${frame}`);
      this.played.add(`${texture}:cast`);
    }
  }
  actorCast(
    id: string,
    abilityId: string,
    pose: string,
    fx: number,
    fy: number,
    hp: number,
  ) {
    const r3 = this.r3.actorCast(id);
    if (r3) return r3;
    if (this.r3.handles(abilityId)) return undefined;
    const m3d = this.m3d.actorCast(id);
    if (m3d) return m3d;
    if (this.m3d.handles(abilityId)) return undefined;
    const approved = this.approved.actorCast(id, pose, fx, fy, hp);
    if (approved) return approved;
    if (this.approved.handles(abilityId)) return undefined;
    const updated = this.feedback.actorCast(id, pose, fx, fy, hp);
    if (updated) return updated;
    if (this.feedback.handles(abilityId) && pose === 'cast') return;
    if (hp <= 0 || this.state?.phase === 'DEFEAT') {
      this.casts.delete(id);
      return;
    }
    const pending = this.casts.get(id);
    if (pending) {
      const actor = this.state?.players.get(id);
      const active =
        actor &&
        JSON.parse(actor.statuses).some(
          (s: { kind: string; abilityId: string }) =>
            ['channel', 'counter'].includes(s.kind) &&
            s.abilityId === pending.abilityId,
        );
      const loop = skillVisualStages[pending.abilityId]?.characterLoop;
      const visual = this.castPresentation(
        pending.abilityId,
        pending.fx,
        pending.fy,
        pending.prefix,
      );
      if (
        active &&
        loop &&
        !pending.prefix &&
        pending.started !== undefined &&
        this.scene.time.now >= pending.started + (visual?.durationMs ?? 0)
      )
        return this.castPresentation(
          pending.abilityId,
          pending.fx,
          pending.fy,
          loop,
        );
      if (visual) {
        pending.started ??= this.scene.time.now;
        if (this.scene.time.now < pending.started + visual.durationMs)
          return visual;
      }
      this.casts.delete(id);
    }
    return pose === 'cast'
      ? this.castPresentation(abilityId, fx, fy)
      : undefined;
  }
  inspect() {
    return {
      m3d: this.m3d.inspect(),
      r3: this.r3.inspect(),
      approved: this.approved.inspect(),
      feedback: this.feedback.inspect(),
      loadedComponents: skillArt.assets.filter((a) =>
        this.scene.textures.exists(a.id),
      ).length,
      registeredAnimations: skillArt.assets.reduce(
        (n, a) =>
          n +
          a.animations.filter((t) =>
            this.scene.anims.exists(skillAnimationKey(a.id, t.name)),
          ).length,
        0,
      ),
      played: [...this.played],
      transient: this.transient.size,
      persistent: [...this.persistent].map(([id, v]) => ({
        id,
        texture: v.sprite.texture.key,
        frame: v.sprite.frame.name,
        depth: v.sprite.depth,
        x: v.sprite.x,
        y: v.sprite.y,
        scale: v.sprite.scaleX,
      })),
      projectiles: [...this.projectiles].map(([id, v]) => ({
        id,
        texture: v.sprite.texture.key,
        frame: v.sprite.frame.name,
        depth: v.sprite.depth,
        x: v.sprite.x,
        y: v.sprite.y,
        scale: v.sprite.scaleX,
      })),
      observedFrames: [...this.frameObservations],
    };
  }
  reviewFeedback(asset: string, tag: string, x: number, y: number) {
    if (asset.startsWith('m3d_') || asset.startsWith('r2_'))
      return this.m3d.review(asset, tag, x, y);
    return this.feedback.review(asset, tag, x, y);
  }
  suppressesCastPose(id: string) {
    return this.feedback.suppressesCastPose(id);
  }
  actorAlpha(id: string) {
    return this.m3d.alpha(id);
  }
}
