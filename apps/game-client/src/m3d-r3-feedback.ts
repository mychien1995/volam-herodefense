import { zoneTick } from './zone-tick.js';
import Phaser from 'phaser';
import { caiBangBongArtEnabled } from './bong-combo-review-art.js';
import { spinFacing } from './hero-vfx-review.js';
import type { CombatEvent } from '@volam/game-core';
import type { LobbyState } from '@volam/game-protocol';
import { m1Config } from '@volam/game-data';
import { facing } from './facing.js';
import {
  R3Painter,
  r3Body,
  r3Tag,
  type R3Direction,
  type R3PaintOptions,
} from './m3d-r3-art.js';
const voAnh = m1Config.skillCatalogue!['vo_anh_cuoc']!.effect;
const voAnhDash = voAnh.mode === 'projectile' ? voAnh.comboDash : undefined;
const skills = new Set([
  'thieu_lam_quyen',
  'la_han_quyen',
  'vi_da_quyen',
  'vo_anh_cuoc',
  'toan_phong_thoai',
  'hoanh_tao_cuoc',
  'nhu_lai_niet_ban',
  'tru_ta',
  'kim_quang_ho_tran',
  'tam_gioi_quy_thien',
  'pha_giap_bong',
  'thien_ha_vo_cau',
  'liet_phong_dao',
]);
type Point = { x: number; y: number };
interface Action {
  id: string;
  kind: string;
  abilityId: string;
  startedAt: number;
  until: number;
  nextTick: number;
  remaining: number;
  fx: number;
  fy: number;
  windupTicks?: number;
  range: number;
}
export interface Cast {
  owner: string;
  skill: string;
  start: number;
  until: number;
  fx: number;
  fy: number;
  stage: string;
  token: string;
  strike?: number;
  revision: number;
  windupTicks?: number;
  outroUntilMs?: number;
}
interface Flash {
  key: string;
  owner: string;
  asset: string;
  phase: string;
  direction?: R3Direction;
  point: Point;
  start: number;
  duration: number;
  drift?: Point;
  options: R3PaintOptions;
}
const parse = <T>(value: string, fallback: T): T => {
  try {
    return JSON.parse(value) || fallback;
  } catch {
    return fallback;
  }
};
/** Approved raster phases read actual authoritative actions, projectiles, areas and hit events. */
export class M3dR3Feedback {
  private state: LobbyState | undefined;
  private zone = 'arena';
  private readonly casts = new Map<string, Cast>();
  private flashes: Flash[] = [];
  private readonly shotBirth = new Map<string, number>();
  private readonly moundEnds = new Map<
    string,
    { owner: string; direction: R3Direction; point: Point }
  >();
  private readonly auraBirth = new Map<string, number>();
  private readonly painter: R3Painter;
  private renderPoint: ((id: string) => Point | undefined) | undefined;
  private tick = 0;
  private sequence = 0;
  constructor(private readonly scene: Phaser.Scene) {
    this.painter = new R3Painter(scene);
  }
  handles(id: string): boolean {
    return skills.has(id);
  }
  projectileHandled(id: string): boolean {
    return [
      'thieu_lam_quyen',
      'vo_anh_cuoc',
      'toan_phong_thoai',
      'hoanh_tao_cuoc',
    ].includes(id);
  }
  areaHandled(id: string): boolean {
    return id === 'nhu_lai_niet_ban';
  }
  private actor(id: string) {
    return this.state?.players.get(id) ?? this.state?.creeps.get(id);
  }
  private valid(id: string): boolean {
    const a = this.actor(id);
    return !!a && a.zoneId === this.zone && a.hp > 0;
  }
  private point(id: string): Point | undefined {
    return this.renderPoint?.(id) ?? this.actor(id);
  }
  private direction(x: number, y: number) {
    return facing(x, y) as R3Direction;
  }
  private flash(
    owner: string,
    asset: string,
    phase: string,
    d: R3Direction | undefined,
    point: Point,
    options: R3PaintOptions = {},
    delay = 0,
    drift?: Point,
  ): void {
    const { tag } = r3Tag(asset, phase, d);
    this.flashes.push({
      key: 'flash:' + ++this.sequence,
      owner,
      asset,
      phase,
      ...(d ? { direction: d } : {}),
      point: { x: point.x, y: point.y },
      start: this.scene.time.now + delay,
      duration: options.duration ?? tag.durationMsTotal,
      ...(drift ? { drift } : {}),
      options,
    });
  }
  event(e: CombatEvent): boolean {
    if (!this.handles(e.abilityId)) return false;
    const d = this.direction(e.fx ?? 1, e.fy ?? 0),
      hero = this.state?.players.get(e.sourceId);
    const now = e.tick ?? this.tick;
    if (e.stage === 'cancel') {
      this.casts.delete(e.sourceId);
      this.flashes = this.flashes.filter((f) => f.owner !== e.sourceId);
      for (const [id, p] of this.moundEnds)
        if (p.owner === e.sourceId) this.moundEnds.delete(id);
      return true;
    }
    if (e.kind === 'cast' || e.kind === 'attack') {
      this.casts.set(e.sourceId, {
        owner: e.sourceId,
        skill: e.abilityId,
        start: now,
        until:
          e.abilityId === 'thieu_lam_quyen'
            ? now + 6
            : Math.max(now + 1, hero?.actionUntil ?? now + 12),
        fx: e.fx ?? 1,
        fy: e.fy ?? 0,
        stage: e.stage ?? '',
        token: String(e.id),
        revision: hero?.build.revision ?? 0,
      });
      if (e.abilityId === 'tru_ta')
        this.flash(
          e.sourceId,
          'tru_ta_vfx',
          'slash',
          d,
          { x: e.x + (e.fx ?? 1) * 18, y: e.y - 22 + (e.fy ?? 0) * 18 },
          {
            scale: 2.4,
            pivot: (
              {
                right: [32, 64],
                left: [96, 64],
                down: [64, 32],
                up: [64, 96],
              } as const
            )[d],
            duration: 400,
          },
        );
      if (
        e.kind === 'attack' &&
        e.abilityId === 'thieu_lam_quyen' &&
        e.stage !== 'roundhouse_kick'
      ) {
        const fx = e.fx ?? 1,
          fy = e.fy ?? 0;
        // The rear edge of the qi cel starts outside the monk silhouette.
        const release = d === 'up' ? 46 : 42;
        this.flash(
          e.sourceId,
          'shaolin_quyen_ki',
          e.stage || 'left_fist',
          undefined,
          {
            x: e.x + fx * release,
            y: e.y + fy * release - (d === 'down' ? 0 : 23),
          },
          { duration: 205, scale: 0.92, rotation: Math.atan2(fy, fx) },
          42,
          { x: fx * 26, y: fy * 26 },
        );
      }
      if (e.abilityId === 'vo_anh_cuoc' && e.stage === 'empowered_dash') {
        this.flash(e.sourceId, 'shaolin_vo_anh_dust', 'gust', undefined, e, {
          duration: 340,
          scale: 1.12,
          depth: e.y - 3,
          rotation: Math.atan2(e.fy ?? 0, e.fx ?? 1),
        });
      }
      if (e.abilityId === 'la_han_quyen') {
        const side = d === 'left' ? 'left' : 'right';
        const dx = e.fx ?? 1,
          dy = e.fy ?? 0;
        const reach = e.radius ?? 0;
        const advance = reach * 0.24;
        this.flash(
          e.sourceId,
          'shaolin_la_han',
          'apparition',
          side,
          { x: e.x + dx * advance, y: e.y + dy * advance },
          { depth: e.y - 1, alpha: 0.82 },
        );
        for (const [index, delay] of [150, 370, 590].entries()) {
          const contact = reach * (0.8 + index * 0.09);
          this.flash(
            e.sourceId,
            'shaolin_la_han_ground',
            'impact',
            undefined,
            { x: e.x + dx * contact, y: e.y + dy * contact },
            { scale: 0.9 + index * 0.14, duration: 165, depth: e.y - 1 },
            delay,
          );
        }
      }
      if (e.abilityId === 'vi_da_quyen') {
        const effect = m1Config.skillCatalogue![e.abilityId]!.effect;
        const offset = effect.mode === 'arc' ? (effect.originOffset ?? 0) : 0;
        const impact = {
          x: e.x + (e.fx ?? 1) * offset,
          y: e.y + (e.fy ?? 0) * offset,
        };
        this.flash(
          e.sourceId,
          'shaolin_skill_fx',
          'vi_da_quyen_impact',
          d,
          impact,
          { depth: e.y - 20 },
        );
      }
    }
    const cast = this.casts.get(e.sourceId);
    if (
      e.kind === 'pulse' &&
      ['strike', 'release', 'finisher'].includes(e.stage ?? '')
    ) {
      if (cast && (e.abilityId !== 'thien_ha_vo_cau' || e.stage === 'finisher'))
        cast.strike = now;
      if (cast && e.stage === 'finisher')
        cast.outroUntilMs = this.scene.time.now + 200;
      if (!caiBangBongArtEnabled && e.abilityId === 'pha_giap_bong')
        this.flash(e.sourceId, 'b3_pha_giap_vfx', 'impact', d, e, {
          depth: e.y - 10,
          placement: true,
          rotation:
            Math.atan2(e.fy ?? 0, e.fx ?? 1) -
            { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[d],
        });
      if (e.abilityId === 'liet_phong_dao')
        this.flash(
          e.sourceId,
          'ts_ground',
          'ground_break',
          d,
          { x: e.x + (e.fx ?? 1) * 28, y: e.y + (e.fy ?? 0) * 28 },
          { placement: true, depth: e.y - 10 },
        );
      if (
        !caiBangBongArtEnabled &&
        e.abilityId === 'thien_ha_vo_cau' &&
        e.stage === 'finisher'
      ) {
        const feet = this.point(e.sourceId) ?? e;
        this.flash(
          e.sourceId,
          'vo_cau_ground',
          'final_smash',
          undefined,
          feet,
          {
            scale: 1.45,
            pivot: [128, 194],
            depth: feet.y - 10,
          },
        );
      }
      if (e.abilityId === 'nhu_lai_niet_ban' && e.stage === 'strike')
        this.flash(
          e.sourceId,
          'r3_palm_impact',
          'loop_billboard',
          undefined,
          e,
          { depth: e.y + 1, pivot: [128, 181] },
        );
      if (e.abilityId === 'tam_gioi_quy_thien' && e.stage === 'strike') {
        this.flash(
          e.sourceId,
          'r3_lion_head',
          'roar_billboard',
          undefined,
          { x: e.x, y: e.y - 60 },
          { depth: e.y - 5 },
        );
        this.flash(e.sourceId, 'r3_roar_wave', 'roar_billboard', undefined, e, {
          scale: 1.25,
          depth: e.y - 10,
        });
      }
    }
    if (e.kind === 'hit') {
      if (e.abilityId === 'hoanh_tao_cuoc')
        this.flash(e.sourceId, 'r3_ca_diep_ground_keyposes', 'impact', d, e, {
          depth: e.y - 5,
        });
      if (e.abilityId === 'toan_phong_thoai')
        this.flash(e.sourceId, 'r3_tornado_' + d, 'impact', d, e, {
          scale: 0.7,
        });
      if (e.abilityId === 'vo_anh_cuoc' && e.stage === 'empowered') {
        const rotation = Math.atan2(e.fy ?? 0, e.fx ?? 1);
        this.flash(e.sourceId, 'shaolin_vo_anh_dust', 'gust', undefined, e, {
          duration: 470,
          scale: 1.35,
          rotation,
          depth: e.y - 2,
        });
        this.flash(
          e.sourceId,
          'shaolin_quyen_ki',
          'heel',
          undefined,
          { x: e.x, y: e.y - 28 },
          { duration: 300, scale: 1.25, rotation },
        );
      } else if (e.abilityId === 'vo_anh_cuoc') {
        this.flash(
          e.sourceId,
          'shaolin_quyen_ki',
          'heel',
          undefined,
          { x: e.x, y: e.y - 21 },
          {
            duration: 115,
            scale: 0.5,
            rotation: Math.atan2(e.fy ?? 0, e.fx ?? 1),
          },
        );
      }
      if (e.abilityId === 'nhu_lai_niet_ban')
        this.flash(
          e.sourceId,
          'r3_palm_impact',
          'intro_billboard',
          undefined,
          e,
          { scale: 0.3 },
        );
    }
    return true;
  }
  sync(
    state: LobbyState | undefined,
    zone: string,
    renderPoint?: (id: string) => Point | undefined,
  ): void {
    if (!state || state.phase === 'DEFEAT' || zone !== this.zone) this.clear();
    this.state = state;
    this.zone = zone;
    this.renderPoint = renderPoint;
    if (!state || state.phase === 'DEFEAT') return;
    this.tick = zoneTick(state, zone) ?? 0;
    this.painter.begin();
    for (const [id, h] of state.players) {
      if (h.zoneId !== zone || h.hp <= 0) continue;
      const action = parse<Action | undefined>(h.actionState, undefined);
      if (
        !action &&
        this.handles(h.castAbilityId) &&
        h.actionUntil > this.tick &&
        ['basic_attack', 'cast'].includes(h.pose) &&
        !this.casts.has(id)
      ) {
        this.casts.set(id, {
          owner: id,
          skill: h.castAbilityId,
          start: h.actionStartedAt,
          until:
            h.castAbilityId === 'thieu_lam_quyen'
              ? h.actionStartedAt + 6
              : h.actionUntil,
          fx: h.fx,
          fy: h.fy,
          stage: h.basicStage,
          token: `state:${h.actionStartedAt}`,
          revision: h.build.revision,
        });
      }
      if (action && this.handles(action.abilityId)) {
        let cast = this.casts.get(id);
        if (!cast || cast.token !== action.id) {
          cast = {
            owner: id,
            skill: action.abilityId,
            start: action.startedAt,
            until: action.until,
            fx: action.fx,
            fy: action.fy,
            stage:
              action.kind === 'dash' && action.abilityId === 'vo_anh_cuoc'
                ? 'empowered_dash'
                : '',
            token: action.id,
            revision: h.build.revision,
          };
          this.casts.set(id, cast);
        }
        cast.until = action.until;
        if (action.windupTicks) cast.windupTicks = action.windupTicks;
        if (action.remaining === 0 && action.windupTicks)
          cast.strike = action.startedAt + action.windupTicks;
      }
      const p = this.point(id)!;
      const statuses = parse<
        Array<{ kind: string; abilityId: string; ticks: number }>
      >(h.statuses, []);
      if (
        statuses.some(
          (s) =>
            s.abilityId === 'kim_quang_ho_tran' && s.kind === 'support_aura',
        )
      ) {
        const key = 'aura:' + id;
        if (!this.auraBirth.has(key))
          this.auraBirth.set(key, this.scene.time.now);
        this.painter.draw(
          key,
          'kim_quang_ho_tran_vfx',
          'loop',
          undefined,
          p.x,
          p.y,
          this.scene.time.now - this.auraBirth.get(key)!,
          { alpha: 0.45, pivot: [128, 120], depth: p.y - 5, loop: true },
        );
      } else this.auraBirth.delete('aura:' + id);
    }
    for (const [id, cast] of this.casts) {
      const h = state.players.get(id),
        p = this.point(id);
      if (
        !h ||
        !p ||
        !this.valid(id) ||
        h.build.revision !== cast.revision ||
        (this.tick >= cast.until &&
          this.scene.time.now >= (cast.outroUntilMs ?? 0))
      ) {
        this.casts.delete(id);
        continue;
      }
      const d = this.direction(cast.fx, cast.fy),
        elapsed = ((this.tick - cast.start) * 1000) / 30;
      if (cast.skill === 'thien_ha_vo_cau' && cast.strike === undefined) {
        this.painter.draw(
          'whirl:' + id,
          'vo_cau_aura',
          'whirlwind',
          undefined,
          p.x,
          p.y,
          elapsed,
          { scale: 1.35, depth: p.y - 5, loop: true },
        );
        const effect = m1Config.skillCatalogue![cast.skill]!.effect;
        const radius = effect.mode === 'multi_hit' ? effect.range * 0.69 : 120;
        const dogCount = caiBangBongArtEnabled ? 6 : 4;
        for (let i = 0; i < dogCount; i++) {
          const a = elapsed * 0.0018 + (i * 2 * Math.PI) / dogCount;
          const face = this.direction(-Math.sin(a), Math.cos(a) * 0.6);
          this.painter.draw(
            `dog:${id}:${i}`,
            'vo_cau_projectile',
            'dog_run',
            face,
            p.x + Math.cos(a) * radius,
            p.y + Math.sin(a) * radius * 0.6,
            elapsed + (caiBangBongArtEnabled ? i * 41 : 0),
            { depth: p.y + Math.sin(a) * radius * 0.6, loop: true },
          );
        }
      }
      if (cast.skill === 'liet_phong_dao') {
        const phase =
          cast.strike === undefined
            ? elapsed < 180
              ? 'liet_phong_gather'
              : 'liet_phong_gather_loop'
            : this.tick - cast.strike < 5
              ? 'liet_phong_slash'
              : 'liet_phong_outro';
        const phaseAge =
          cast.strike === undefined
            ? phase === 'liet_phong_gather_loop'
              ? elapsed - 180
              : elapsed
            : ((this.tick - cast.strike) * 1000) / 30 -
              (phase === 'liet_phong_outro' ? (5 * 1000) / 30 : 0);
        this.painter.draw(
          'blade:' + id,
          'ts_dao_fx',
          phase,
          d === 'left' ? 'right' : d,
          p.x,
          p.y,
          phaseAge,
          {
            placement: true,
            mirrorX: d === 'left',
            depth: p.y + (cast.strike === undefined ? -5 : 2),
            loop: phase === 'liet_phong_gather_loop',
            duration:
              phase === 'liet_phong_slash'
                ? (5 * 1000) / 30
                : phase === 'liet_phong_outro'
                  ? Math.max(1, ((cast.until - cast.strike! - 5) * 1000) / 30)
                  : 180,
          },
        );
      }
      if (cast.skill === 'nhu_lai_niet_ban' && cast.strike === undefined) {
        this.painter.draw(
          'buddha:' + id,
          'r3_buddha',
          'loop_billboard',
          undefined,
          p.x,
          p.y - 10,
          elapsed,
          { scale: 2, depth: p.y - 5, alpha: Math.min(1, elapsed / 100) },
        );
        this.painter.draw(
          'sky:' + id,
          'r3_sky_palm',
          'intro_billboard',
          undefined,
          p.x,
          p.y - 142 * (1 - Math.min(1, elapsed / 500)),
          elapsed,
          { depth: p.y + 3 },
        );
      }
      if (cast.skill === 'tam_gioi_quy_thien' && cast.strike === undefined)
        this.painter.draw(
          'lion-intro:' + id,
          'r3_lion_head',
          'intro_billboard',
          undefined,
          p.x,
          p.y - 60,
          elapsed,
          { depth: p.y - 5, duration: ((cast.until - cast.start) * 1000) / 30 },
        );
      const angle = Math.atan2(cast.fy, cast.fx);
      if (
        cast.skill === 'vo_anh_cuoc' &&
        cast.stage === 'empowered_dash' &&
        voAnhDash
      ) {
        const side = d === 'left' ? 'left' : 'right';
        const traveled = Math.min(
          voAnhDash.distance,
          (Math.max(0, elapsed) * voAnhDash.speed) / 1000,
        );
        const fade = Math.min(1, 0.4 + traveled / 55);
        for (const [index, trail] of [22, 45].entries()) {
          const offset = Math.min(trail, traveled);
          if (offset <= 5) continue;
          this.painter.draw(
            'vo-echo:' + id + ':' + index,
            'shaolin_vo_anh_body',
            'fly',
            side,
            p.x - cast.fx * offset,
            p.y - cast.fy * offset,
            elapsed,
            { alpha: 0.32 - index * 0.13, depth: p.y - 2 },
          );
        }
        this.painter.draw(
          'vo-dust:' + id,
          'shaolin_vo_anh_dust',
          'gust',
          undefined,
          p.x - cast.fx * 8,
          p.y - cast.fy * 8,
          elapsed,
          {
            rotation: angle,
            scale: 0.58 + fade * 0.42,
            alpha: fade,
            depth: p.y - 3,
          },
        );
        this.painter.draw(
          'vo-heel:' + id,
          'shaolin_quyen_ki',
          'heel',
          undefined,
          p.x + cast.fx * 42,
          p.y - 35 + cast.fy * 28,
          elapsed,
          { rotation: angle, alpha: fade, depth: p.y + 1 },
        );
      }
    }
    const shots = new Set<string>();
    for (const [id, p] of state.projectiles) {
      if (
        p.zoneId !== zone ||
        !this.projectileHandled(p.abilityId) ||
        !this.valid(p.ownerId)
      )
        continue;
      shots.add(id);
      if (!this.shotBirth.has(id)) this.shotBirth.set(id, this.scene.time.now);
      const age = Math.max(0, ((this.tick - p.startedAt) * 1000) / 30),
        d = this.direction(p.vx, p.vy);
      if (p.abilityId === 'hoanh_tao_cuoc') {
        this.moundEnds.set(id, {
          owner: p.ownerId,
          direction: d,
          point: { x: p.x, y: p.y },
        });
        this.painter.draw(
          'shot:' + id,
          'r3_ca_diep_ground_keyposes',
          age < 100 ? 'birth' : 'travel',
          d,
          p.x,
          p.y,
          age,
          { depth: p.y - 5, loop: age >= 100 },
        );
      } else if (
        p.abilityId === 'vo_anh_cuoc' ||
        p.abilityId === 'thieu_lam_quyen'
      ) {
        // The fourth strike uses the real projectile, once it clears the body.
        if (p.abilityId === 'thieu_lam_quyen' && age < 2000 / m1Config.tickRate)
          continue;
        this.painter.draw(
          'shot:' + id,
          'shaolin_quyen_ki',
          p.abilityId === 'vo_anh_cuoc' ? 'foot' : 'roundhouse_kick',
          undefined,
          p.x,
          p.y - 22,
          age,
          { rotation: Math.atan2(p.vy, p.vx) },
        );
      } else {
        const kind = 'tornado';
        this.painter.draw(
          'shot:' + id,
          `r3_${kind}_${d}`,
          age < 100 ? 'birth' : 'travel',
          d,
          p.x,
          p.y,
          age,
          {
            loop: age >= 100,
          },
        );
      }
    }
    for (const id of this.shotBirth.keys())
      if (!shots.has(id)) this.shotBirth.delete(id);
    for (const [id, end] of this.moundEnds)
      if (!shots.has(id)) {
        if (this.valid(end.owner))
          this.flash(
            end.owner,
            'r3_ca_diep_ground_keyposes',
            'outro',
            end.direction,
            end.point,
            { depth: end.point.y - 5 },
          );
        this.moundEnds.delete(id);
      }
    for (const [id, a] of state.areas)
      if (
        a.zoneId === zone &&
        this.areaHandled(a.abilityId) &&
        this.valid(a.ownerId)
      )
        this.painter.draw(
          'field:' + id,
          'r3_sanskrit',
          'loop_billboard',
          undefined,
          a.x,
          a.y,
          ((this.tick - a.startedAt) * 1000) / 30,
          { depth: a.y - 10, loop: true },
        );
    for (const [id, e] of state.creeps)
      if (
        e.zoneId === zone &&
        e.hp > 0 &&
        parse<Array<{ kind: string; abilityId: string }>>(e.statuses, []).some(
          (s) => s.kind === 'stun' && s.abilityId === 'hoanh_tao_cuoc',
        )
      ) {
        const p = this.point(id) ?? e;
        this.painter.draw(
          'stun:' + id,
          'r3_ca_diep_stun_keyposes',
          'stun_loop',
          undefined,
          p.x,
          p.y - 52,
          this.scene.time.now,
          { loop: true, depth: p.y + 5 },
        );
      }
    const ended = this.flashes.filter(
      (f) =>
        ((f.asset === 'r3_lion_head' && f.phase === 'roar_billboard') ||
          (f.asset === 'b3_pha_giap_vfx' && f.phase === 'impact')) &&
        this.valid(f.owner) &&
        this.scene.time.now - f.start >= f.duration,
    );
    this.flashes = this.flashes.filter(
      (f) => this.valid(f.owner) && this.scene.time.now - f.start < f.duration,
    );
    for (const f of ended)
      this.flash(
        f.owner,
        f.asset,
        f.asset === 'r3_lion_head' ? 'outro_billboard' : 'outro',
        f.direction,
        f.point,
        f.options,
      );
    for (const f of this.flashes) {
      if (this.scene.time.now < f.start) continue;
      const progress = (this.scene.time.now - f.start) / f.duration;
      this.painter.draw(
        f.key,
        f.asset,
        f.phase,
        f.direction,
        f.point.x + (f.drift?.x ?? 0) * progress,
        f.point.y + (f.drift?.y ?? 0) * progress,
        this.scene.time.now - f.start,
        {
          ...f.options,
          duration: f.duration,
          alpha: Math.min(
            f.options.alpha ?? 1,
            1 - ((this.scene.time.now - f.start) / f.duration) * 0.6,
          ),
        },
      );
    }
    this.painter.end();
  }
  actorCast(id: string) {
    const cast = this.casts.get(id);
    if (
      !cast ||
      !this.valid(id) ||
      (this.tick >= cast.until &&
        this.scene.time.now >= (cast.outroUntilMs ?? 0))
    )
      return;
    const d = this.direction(cast.fx, cast.fy),
      elapsed = ((this.tick - cast.start) * 1000) / 30;
    let asset = '',
      phase = '',
      loop = false,
      phaseElapsed = elapsed,
      phaseDuration = ((cast.until - cast.start) * 1000) / 30;
    const after = cast.strike !== undefined;
    if (cast.skill === 'hoanh_tao_cuoc') {
      asset = 'r3_ca_diep_body_keyposes';
      phase = after
        ? this.tick - cast.strike! < 2
          ? 'contact'
          : 'recovery'
        : elapsed < 150
          ? 'anticipation'
          : 'raise';
    }
    if (cast.skill === 'pha_giap_bong') {
      asset = 'b3_pha_giap_body';
      phase = after
        ? this.tick - cast.strike! < 3
          ? 'strike'
          : 'recovery'
        : 'raise';
    }
    if (cast.skill === 'thieu_lam_quyen') {
      asset = 'shaolin_quyen_body';
      phase = cast.stage || 'left_fist';
    }
    if (cast.skill === 'la_han_quyen') {
      asset = 'shaolin_quyen_body';
      phase = 'left_fist';
    }
    if (cast.skill === 'vi_da_quyen') {
      asset = 'shaolin_a';
      phase = 'left_fist';
    }
    if (cast.skill === 'toan_phong_thoai') {
      asset = 'shaolin_a';
      phase = 'front_kick';
    }
    if (cast.skill === 'vo_anh_cuoc') {
      const flying = cast.stage === 'empowered_dash';
      asset =
        flying || d === 'left' || d === 'right'
          ? 'shaolin_vo_anh_body'
          : 'vo_anh_cuoc_character';
      phase = flying ? 'fly' : 'cast';
      loop = !flying;
    }
    if (cast.skill === 'tru_ta') {
      asset = 'tru_ta_character';
      phase = 'cast';
    }
    if (cast.skill === 'kim_quang_ho_tran') {
      asset = 'kim_quang_ho_tran_character';
      phase = 'cast';
    }
    if (cast.skill === 'tam_gioi_quy_thien') {
      asset = 'tam_gioi_quy_thien_character';
      phase = 'cast';
    }
    if (cast.skill === 'nhu_lai_niet_ban') {
      asset = 'nhu_lai_niet_ban_character';
      phase = 'cast';
    }
    if (cast.skill === 'thien_ha_vo_cau') {
      asset = 'vo_cau_character';
      phase = after ? 'ending' : elapsed < 150 ? 'opening' : 'whirl';
      loop = phase === 'whirl';
    }
    if (cast.skill === 'liet_phong_dao') {
      asset = 'ts_dao';
      phase = after
        ? this.tick - cast.strike! < 5
          ? 'liet_phong_slash'
          : 'liet_phong_recover'
        : elapsed < 180
          ? 'liet_phong_gather'
          : 'liet_phong_gather_hold';
      loop = phase === 'liet_phong_gather_hold';
    }
    if (!asset) return;
    if (cast.skill === 'hoanh_tao_cuoc') {
      const windup = ((cast.windupTicks ?? 9) * 1000) / 30;
      if (after) {
        phaseElapsed =
          ((this.tick - cast.strike!) * 1000) / 30 -
          (phase === 'recovery' ? (2 * 1000) / 30 : 0);
        phaseDuration =
          phase === 'contact'
            ? (2 * 1000) / 30
            : Math.max(1, ((cast.until - cast.strike! - 2) * 1000) / 30);
      } else {
        phaseElapsed = phase === 'raise' ? elapsed - 150 : elapsed;
        phaseDuration = phase === 'raise' ? Math.max(1, windup - 150) : 150;
      }
    }
    if (cast.skill === 'pha_giap_bong') {
      phaseElapsed = after ? ((this.tick - cast.strike!) * 1000) / 30 : elapsed;
      phaseDuration = after
        ? phase === 'strike'
          ? 100
          : Math.max(100, ((cast.until - cast.strike! - 3) * 1000) / 30)
        : ((cast.windupTicks ?? 6) * 1000) / 30;
      if (phase === 'recovery') phaseElapsed -= 100;
    }
    if (cast.skill === 'liet_phong_dao') {
      phaseElapsed = after ? ((this.tick - cast.strike!) * 1000) / 30 : elapsed;
      phaseDuration = after
        ? phase === 'liet_phong_slash'
          ? (5 * 1000) / 30
          : Math.max(1, ((cast.until - cast.strike! - 5) * 1000) / 30)
        : 180;
      if (phase === 'liet_phong_recover') phaseElapsed -= (5 * 1000) / 30;
    }
    if (cast.skill === 'thien_ha_vo_cau') {
      phaseDuration =
        phase === 'ending'
          ? 200
          : phase === 'opening'
            ? 150
            : r3Tag(asset, phase, d).tag.durationMsTotal;
      if (phase === 'ending')
        phaseElapsed =
          200 -
          Math.max(
            0,
            (cast.outroUntilMs ?? this.scene.time.now) - this.scene.time.now,
          );
    }
    if (cast.skill === 'thieu_lam_quyen')
      phaseDuration = Math.min(
        phaseDuration,
        r3Tag(asset, phase, d).tag.durationMsTotal,
      );
    const roundhouse =
      phase === 'roundhouse_kick' && asset !== 'shaolin_quyen_body';
    const bodyDirection =
      asset === 'shaolin_vo_anh_body' && d !== 'left' ? 'right' : d;
    const quarter = roundhouse
      ? Math.min(4, Math.floor((phaseElapsed / Math.max(1, phaseDuration)) * 5))
      : 0;
    return {
      ...r3Body(
        this.scene,
        asset,
        phase,
        spinFacing(bodyDirection, quarter),
        phaseElapsed,
        phaseDuration,
        cast.token + ':' + phase + (roundhouse ? ':' + quarter : ''),
        loop,
      ),
      abilityId: cast.skill,
      phase:
        caiBangBongArtEnabled &&
        cast.skill === 'thien_ha_vo_cau' &&
        !after &&
        cast.until - this.tick <= 3
          ? 'bong_finisher_raise'
          : phase,
      progress: phaseDuration > 0 ? phaseElapsed / phaseDuration : 1,
    };
  }
  observeCharacter(texture: string, frame: string): void {
    this.painter.observe(texture, frame);
  }
  clear(): void {
    this.casts.clear();
    this.flashes = [];
    this.shotBirth.clear();
    this.moundEnds.clear();
    this.auraBirth.clear();
    this.painter.clear();
  }
  inspect() {
    return {
      tick: this.tick,
      zone: this.zone,
      casts: [...this.casts.values()],
      ...this.painter.inspect(),
    };
  }
}
