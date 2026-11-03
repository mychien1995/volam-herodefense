import {
  WaveBossFeedbackArt,
  WaveBossHealth,
} from './wave-boss-feedback-art.js';
import Phaser from 'phaser';
import type { LobbyState } from '@volam/game-protocol';
import type { NamDeView } from '@volam/game-core';
import raw from './nam-de-art.generated.json' with { type: 'json' };
import { facing } from './facing.js';
interface Bundle {
  origin: number[];
  frames: Record<string, unknown>;
  clips: {
    name: string;
    frames: string[];
    durationMs: number;
    repeat: number;
  }[];
}
const bundles = raw.bundles as unknown as Record<string, Bundle>;
export function preloadNamDe(s: Phaser.Scene) {
  for (const [key, b] of Object.entries(bundles))
    s.load.atlas('nd_' + key, '/assets/nam_de/' + key + '.png', {
      frames: b.frames,
      meta: { image: key + '.png' },
    });
}
export function registerNamDe(s: Phaser.Scene) {
  for (const key of Object.keys(bundles))
    s.textures.get('nd_' + key).setFilter(Phaser.Textures.FilterMode.NEAREST);
}
/** Raster presentation sampled from server ticks; no hit or outcome callbacks. */
export class NamDePresentation {
  private sprites = new Map<string, Phaser.GameObjects.Sprite>();
  private observed = new Map<string, Set<string>>();
  private active = new Set<string>();
  private observedRays = new Map<string, unknown>();
  private pose = { key: '', at: 0 };
  private feedback: WaveBossFeedbackArt;
  private health: WaveBossHealth;
  constructor(private scene: Phaser.Scene) {
    this.feedback = new WaveBossFeedbackArt(scene);
    this.health = new WaveBossHealth(scene);
  }
  clear() {
    for (const s of this.sprites.values()) s.destroy();
    this.sprites.clear();
    this.feedback.clear();
    this.health.clear();
  }
  private draw(
    id: string,
    bundle: string,
    clipName: string,
    x: number,
    y: number,
    age: number,
    sx = 1,
    sy = sx,
    rotation = 0,
    alpha = 1,
  ) {
    const b = bundles[bundle]!,
      clip = b.clips.find((c) => c.name === clipName)!;
    if (!clip) throw Error('Missing Nam De clip ' + clipName);
    const n = Math.max(0, Math.floor((age * 1000) / clip.durationMs)),
      loop =
        clip.repeat === -1 ||
        ['fingertip_charge', 'line_warning', 'immobilization_symbol'].includes(
          clipName,
        ) ||
        /^(rapid_fingers|finger_charge|healing_meditation|ultimate_charge)_/.test(
          clipName,
        ),
      index = loop
        ? n % clip.frames.length
        : Math.min(n, clip.frames.length - 1),
      frame = clip.frames[index]!;
    let sprite = this.sprites.get(id);
    if (!sprite) {
      sprite = this.scene.add
        .sprite(x, y, 'nd_' + bundle, frame)
        .setName('nam-de:' + id);
      this.sprites.set(id, sprite);
    }
    sprite
      .setTexture('nd_' + bundle, frame)
      .setOrigin(b.origin[0]!, b.origin[1]!)
      .setPosition(x, y)
      .setScale(sx, sy)
      .setRotation(rotation)
      .setAlpha(alpha)
      .setDepth(y + 0.3);
    this.active.add(id);
    const key = bundle + ':' + clipName,
      seen = this.observed.get(key) ?? new Set<string>();
    seen.add(frame);
    this.observed.set(key, seen);
    return sprite;
  }
  sync(state: LobbyState | undefined, zone: string) {
    this.active.clear();
    this.feedback.begin();
    this.health.begin();
    const v =
      zone === 'arena' && state?.defense.namDe
        ? (JSON.parse(state.defense.namDe) as NamDeView)
        : null;
    const b = state?.creeps.get('boss_nam_de'),
      tick = state?.tick ?? 0,
      c = v?.cast ?? v?.smallCast;
    if (
      v &&
      b &&
      zone === 'arena' &&
      !(b.hp <= 0 && state?.bacCai.get('arena')?.snapshot)
    ) {
      let action =
        b.hp <= 0
          ? 'death'
          : b.pose === 'walk'
            ? 'walk'
            : b.pose === 'death'
              ? 'death'
              : b.pose === 'hurt'
                ? 'hurt'
                : 'idle';
      if (c && b.hp > 0) {
        action =
          c.ability === 'nam_de_palm'
            ? 'palm_attack'
            : c.ability === 'nam_de_aura'
              ? 'defensive_stance'
              : c.ability === 'dai_ly_phong_huyet'
                ? 'pressure_point'
                : c.ability === 'phat_quang_pho_chieu'
                  ? tick < c.releaseAt
                    ? 'palm_attack'
                    : 'idle'
                  : c.ability === 'nhat_duong_quy_tong'
                    ? tick < c.startedAt + 9
                      ? 'walk'
                      : tick < c.releaseAt
                        ? 'ultimate_charge'
                        : 'ultimate_release'
                    : c.ability === 'nam_de_dash'
                      ? 'walk'
                      : c.ability === 'lien_hoan_nhat_duong_chi'
                        ? tick < c.releaseAt
                          ? 'finger_charge'
                          : 'rapid_fingers'
                        : c.ability === 'nam_de_small_finger'
                          ? 'rapid_fingers'
                          : tick < c.releaseAt
                            ? 'finger_charge'
                            : 'finger_release';
      }
      this.health.draw('nam_de', 'Nam Đế', b.x, b.y - 65, b.hp, b.maxHp);
      const pose = action + '_' + facing(b.fx, b.fy),
        token = (c?.id ?? '') + ':' + action;
      if (token !== this.pose.key) this.pose = { key: token, at: tick };
      const at = c
        ? action === 'finger_release' || action === 'ultimate_release'
          ? c.releaseAt
          : c.startedAt
        : this.pose.at;
      this.draw('boss', 'boss', pose, b.x, b.y, (tick - at) / 30)
        .setDepth(b.y)
        .setAlpha(
          b.hp <= 0
            ? Math.max(
                0,
                1 - Math.max(0, (tick - v.defeatedAt) / 30 - 0.7) / 0.7,
              )
            : 1,
        );
      if (
        c &&
        tick < c.releaseAt &&
        ['nhat_duong_chi', 'lien_hoan_nhat_duong_chi'].includes(c.ability)
      )
        this.draw(
          'charge',
          'finger',
          'fingertip_charge',
          b.x + b.fx * 32,
          b.y - 42,
          (tick - c.startedAt) / 30,
          0.27,
        );
      if (c?.ability === 'nam_de_dash' || c?.ability === 'dai_ly_phong_huyet')
        this.draw(
          'wake',
          'rework',
          'dash_wake',
          b.x,
          b.y - 20,
          (tick - c.startedAt) / 30,
          0.6,
          0.6,
          Math.atan2(b.fy, b.fx),
        );
      if (c?.ability === 'phat_quang_pho_chieu' && tick >= c.releaseAt) {
        const target = state!.players.get(c.targetId);
        if (target && target.hp > 0 && target.zoneId === zone)
          this.feedback.cel(
            'spotlight:' + c.id,
            'spotlight',
            'loop',
            target.x,
            target.y,
            (tick - c.releaseAt) / 30,
            { alpha: 0.7, depth: target.y - 0.1 },
          );
      }
      for (const target of v.targets) {
        const h = state!.players.get(target.id);
        if (!h || h.zoneId !== 'arena') continue;
        if (target.qteUntil > tick)
          this.draw(
            'seal:' + target.id,
            'pressure',
            'immobilization_symbol',
            h.x,
            h.y - 38,
            tick / 30,
            0.55,
          );
        if (target.confusionUntil > tick)
          this.draw(
            'dizzy:' + target.id,
            'rework',
            'dizzy_halo',
            h.x,
            h.y - 50,
            tick / 30,
            0.65,
          );
        if (target.stunUntil > tick)
          this.draw(
            'stun:' + target.id,
            'pressure',
            'stun_status',
            h.x,
            h.y - 45,
            tick / 30,
            0.6,
          );
      }
      state!.bossEffects.forEach((e, id) => {
        if (e.ownerId !== 'boss_nam_de' || e.zoneId !== zone) return;
        const age = (tick - e.activeAt) / 30,
          warning = tick < e.activeAt;
        if (e.kind === 'beam') {
          if (!this.observedRays.has(id)) {
            this.observedRays.set(id, e.toJSON());
            if (this.observedRays.size > 256)
              this.observedRays.delete(this.observedRays.keys().next().value!);
          }
          this.feedback.ray(
            id,
            e.x,
            e.y,
            Math.atan2(e.fy, e.fx),
            e.length,
            warning ? Math.max(0, (tick - e.startedAt) / 30) : age,
            warning,
          );
        } else if (e.kind === 'finger')
          this.feedback.cel(id, 'gold_bolt', 'loop', e.x, e.y, age, {
            angle: Math.atan2(e.fy, e.fx),
          });
        else if (e.kind === 'palm')
          this.feedback.cel(id, 'nd_palm', 'palm_trail', e.x, e.y, age, {
            sx: 1.25,
            sy: 0.85,
            angle: Math.atan2(e.fy, e.fx),
          });
        else if (e.kind === 'ring') {
          this.feedback.ring(id, e.x, e.y, age);
        } else if (e.kind === 'sky') {
          if (warning)
            this.feedback.cel(id, 'nam_de_ring', 'pulse', e.x, e.y, 0, {
              sx: 0.14,
              sy: 0.14,
              alpha: 0.65,
              depth: 10,
            });
          else
            this.draw(
              id,
              'rework',
              'sky_ray',
              e.x,
              e.y,
              age,
              0.43,
              1.65,
            ).setOrigin(0.5, 0.94);
        } else if (e.kind === 'backlash')
          this.draw(id, 'rework', 'pressure_contact', e.x, e.y - 27, age, 0.8);
      });
    }
    this.feedback.end();
    this.health.end();
    for (const [id, sprite] of this.sprites)
      if (!this.active.has(id)) {
        sprite.destroy();
        this.sprites.delete(id);
      }
  }
  inspect() {
    return {
      feedback: this.feedback.inspect(),
      rays: Object.fromEntries(this.observedRays),
      sprites: [...this.sprites].map(([id, s]) => ({
        id,
        x: s.x,
        y: s.y,
        frame: s.frame.name,
        rotation: s.rotation,
        visible: s.visible,
        alpha: s.alpha,
        renderFlags: s.renderFlags,
        depth: s.depth,
        texture: s.texture.key,
        origin: [s.originX, s.originY],
        width: s.displayWidth,
        height: s.displayHeight,
      })),
      frames: Object.fromEntries(
        [...this.observed].map(([k, v]) => [k, [...v]]),
      ),
    };
  }
}
