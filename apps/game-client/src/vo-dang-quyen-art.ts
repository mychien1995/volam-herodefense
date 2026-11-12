import { zoneTick } from './zone-tick.js';
import Phaser from 'phaser';
import { fortuneReadings, type CombatEvent } from '@volam/game-core';
import { m1Config } from '@volam/game-data';
import type { LobbyPlayer, LobbyState } from '@volam/game-protocol';
import { facing } from './facing.js';
import { m3dPresentation } from './m3d-feedback-policy.js';
import punchUrl from '../../../assets/exports/vo-dang-quyen-preview/punch.png?url';
import punchAtlas from '../../../assets/exports/vo-dang-quyen-preview/punch.json?url';
import castUrl from '../../../assets/exports/vo-dang-quyen-preview/casts.png?url';
import castAtlas from '../../../assets/exports/vo-dang-quyen-preview/casts.json?url';
import effectUrl from '../../../assets/exports/vo-dang-quyen-preview/effects.png?url';
import effectAtlas from '../../../assets/exports/vo-dang-quyen-preview/effects.json?url';
import rimUrl from '../../../assets/exports/vo-dang-quyen-preview/formation-rim.png?url';
import legacyHuyenUrl from '../../../assets/exports/visual-improvement-approved/vo_dang_hands_v2_projectile_3657f015.png?url';
import legacyHuyenAtlas from '../../../assets/exports/vo-dang-quyen-preview/legacy-huyen-am.json?url';
import fistWaveUrl from '../../../assets/m3d-feedback-visual/exported/m3d_vo_dang_sonic_vfx_r2/m3d_vo_dang_sonic_vfx_r2.png?url';
import fistWaveAtlas from '../../../assets/m3d-feedback-visual/exported/m3d_vo_dang_sonic_vfx_r2/m3d_vo_dang_sonic_vfx_r2.json?url';
import fistWaveClips from '../../../assets/m3d-feedback-visual/exported/m3d_vo_dang_sonic_vfx_r2/m3d_vo_dang_sonic_vfx_r2.animations.json';
import sockets from '../../../assets/exports/vo-dang-quyen-preview/cast-sockets.json';
import placement from '../../../assets/exports/vo-dang-quyen-preview/placement.json';

export const quyen = {
  basic: 'vo_dang_quyen',
  palm: 'luong_nghi_thu',
  wave: 'huyen_am_chuong',
  fortune: 'duong_khi_kich',
  shield: 'thai_cuc_than_cong',
  formation: 'thai_cuc_tran',
} as const;
const replaced = new Set<string>(Object.values(quyen));
export const voDangQuyenHandled = (id: string) => replaced.has(id);

const keys = {
  punch: 'vdq-punch',
  cast: 'vdq-cast',
  effects: 'vdq-effects',
  rim: 'vdq-rim',
  projectile: 'vdq-huyen-am',
  fist: 'vdq-fist-wave',
} as const;
const heading = {
  right: { x: 1, y: 0, angle: 0, origin: [0.59, 0.5] },
  left: { x: -1, y: 0, angle: Math.PI, origin: [0.41, 0.5] },
  down: { x: 0, y: 1, angle: Math.PI / 2, origin: [0.5, 0.59] },
  up: { x: 0, y: -1, angle: -Math.PI / 2, origin: [0.5, 0.41] },
} as const;
type Direction = keyof typeof heading;
type Fx = keyof typeof placement;
type Image = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
type Point = { x: number; y: number };
const tickMs = 1000 / m1Config.tickRate;
const bodyScale = 0.5;
export const fortuneBuffCues = {
  can: { duration: 1000, y: 0, lift: 18, start: 0.84, end: 1.06 },
  khon: { duration: 950, y: -45, lift: 7, start: 0.72, end: 1.05 },
  ton: { duration: 1100, y: -39, lift: 5, start: 1.08, end: 0.78 },
  kham: { duration: 1400, y: -7, lift: 1, start: 0.83, end: 1 },
} as const;

export function preloadVoDangQuyenArt(scene: Phaser.Scene): void {
  scene.load.atlas(keys.punch, punchUrl, punchAtlas);
  scene.load.atlas(keys.cast, castUrl, castAtlas);
  scene.load.atlas(keys.effects, effectUrl, effectAtlas);
  scene.load.atlas(keys.projectile, legacyHuyenUrl, legacyHuyenAtlas);
  scene.load.atlas(keys.fist, fistWaveUrl, fistWaveAtlas);
  scene.load.image(keys.rim, rimUrl);
}

export function registerVoDangQuyenArt(scene: Phaser.Scene): void {
  for (const key of Object.values(keys))
    scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
  for (const clip of fistWaveClips.animations)
    scene.anims.create({
      key: 'vdq:' + clip.name,
      frames: clip.frames.map((frame) => ({ key: keys.fist, frame })),
      duration: m3dPresentation.sonicMs,
    });
}

export function presentVoDangQuyenBody(
  sprite: Phaser.GameObjects.Sprite,
  actor: Pick<
    LobbyPlayer,
    | 'hp'
    | 'pose'
    | 'basicId'
    | 'basicStage'
    | 'castAbilityId'
    | 'actionStartedAt'
    | 'fx'
    | 'fy'
  >,
  tick: number | undefined,
): void {
  if (actor.hp <= 0 || tick === undefined) return;
  const age = Math.max(0, tick - actor.actionStartedAt);
  const direction = facing(actor.fx, actor.fy);
  let frame: string;
  let texture: string = keys.cast;
  if (actor.pose === 'basic_attack' && actor.basicId === quyen.basic) {
    const index =
      age < 2 ? 0 : age < 6 ? (actor.basicStage === 'right_palm' ? 2 : 1) : 3;
    texture = keys.punch;
    frame = `${direction}_${index}`;
  } else if (actor.pose === 'cast' && actor.castAbilityId === quyen.palm) {
    frame = `palm_${direction}_${age < 5 ? 0 : age < 9 ? 2 : 3}`;
  } else if (actor.pose === 'cast' && actor.castAbilityId === quyen.wave) {
    frame = `palm_${direction}_${age < 4 ? 0 : age < 9 ? 1 : age < 13 ? 2 : 3}`;
  } else if (actor.pose === 'cast' && actor.castAbilityId === quyen.formation) {
    frame =
      'taichi_' +
      (age < 4
        ? 0
        : age < 9
          ? 1
          : age < 14
            ? 2
            : age < 19
              ? 3
              : age < 24
                ? 4
                : 5);
  } else return;
  sprite.anims.stop();
  sprite
    .setTexture(texture, frame)
    .setOrigin(0.5, 0.775)
    .setScale(bodyScale)
    .setFlip(false, false)
    .setRotation(0);
}

type Status = {
  kind: string;
  abilityId: string;
  ticks: number;
  magnitude: number;
};

/** Read server projectiles, areas and status results. All sizes are presentation-only. */
export class VoDangQuyenArt {
  private readonly sprites = new Map<string, Image>();
  private readonly transients = new Set<Image>();
  private readonly timers = new Set<Phaser.Time.TimerEvent>();
  private readonly shieldFlash = new Map<string, number>();
  private point: ((id: string) => Point | undefined) | undefined;

  constructor(private readonly scene: Phaser.Scene) {}

  event(event: CombatEvent): boolean {
    if (!voDangQuyenHandled(event.abilityId)) return false;
    if (event.abilityId === quyen.basic && event.kind === 'attack') {
      const timer = this.scene.time.delayedCall(2 * tickMs, () => {
        this.timers.delete(timer);
        this.fist(event);
      });
      this.timers.add(timer);
    }
    if (event.kind === 'pulse') {
      if (event.abilityId === quyen.wave && event.stage === 'area_tick')
        this.burst('ink', event, 560, 0.38);
      if (event.abilityId === quyen.fortune && event.stage === 'fortune:doai')
        this.burst('doai-ring', event, 510, 0.12);
      if (event.abilityId === quyen.shield && event.stage === 'absorb')
        this.shieldFlash.set(event.sourceId, this.scene.time.now + 180);
    }
    return true;
  }

  private fist(event: CombatEvent): void {
    const direction = facing(event.fx ?? 1, event.fy ?? 0) as Direction;
    const right = event.stage === 'right_palm';
    const socket = sockets.punch[direction][right ? 1 : 0]!;
    const root = this.point?.(event.sourceId) ?? event;
    const x = root.x + socket.x * bodyScale;
    const y = root.y + socket.y * bodyScale;
    const tag = `${right ? 'right' : 'left'}_fist_wave_${direction}`;
    const image = this.scene.add
      .sprite(x, y, keys.fist, tag + '_0')
      .setScale(0.75)
      .setDepth(root.y + (direction === 'up' ? -1 : 1))
      .setName('vdq:basic')
      .play('vdq:' + tag);
    const dir = heading[direction];
    this.transients.add(image);
    this.scene.tweens.add({
      targets: image,
      x: x + dir.x * m3dPresentation.sonicTravel,
      y: y + dir.y * m3dPresentation.sonicTravel * 0.65,
      duration: m3dPresentation.sonicMs,
      onComplete: () => this.end(image),
    });
  }

  private burst(
    frame: 'ink' | 'doai-ring',
    event: CombatEvent,
    duration: number,
    start: number,
  ): void {
    const image = this.scene.add
      .image(event.x, event.y, keys.effects, frame)
      .setName('vdq:' + frame);
    const width = event.radius
      ? event.radius * 2
      : placement[frame].width * bodyScale;
    this.place(image, frame, event, width, frame === 'ink' ? event.y : -0.4);
    const scale = image.scaleX;
    image.setScale(scale * start);
    this.transients.add(image);
    this.scene.tweens.add({
      targets: image,
      scale: scale,
      duration: Math.round(duration * 0.36),
      ease: 'Cubic.easeOut',
    });
    this.scene.tweens.add({
      targets: image,
      alpha: 0,
      delay: Math.round(duration * 0.36),
      duration: Math.round(duration * 0.64),
      onComplete: () => this.end(image),
    });
  }

  private end(image: Image): void {
    if (this.transients.delete(image)) image.destroy();
  }

  private image(id: string, texture: string, frame?: string): Image {
    let image = this.sprites.get(id);
    if (!image) {
      image = this.scene.add.image(0, 0, texture, frame).setName('vdq:' + id);
      this.sprites.set(id, image);
    } else if (frame !== undefined) image.setFrame(frame);
    return image;
  }

  private place(
    image: Image,
    frame: Fx,
    point: Point,
    width: number,
    depth: number,
  ): Image {
    const { origin } = placement[frame];
    return image
      .setOrigin(origin[0]!, origin[1]!)
      .setPosition(point.x, point.y)
      .setScale(width / image.width)
      .setDepth(depth);
  }

  sync(
    state: LobbyState | undefined,
    zone: string,
    point?: (id: string) => Point | undefined,
  ): void {
    this.point = point;
    const wanted = new Set<string>();
    const tick = zoneTick(state, zone);
    const get = (id: string, texture: string, frame?: string) => {
      wanted.add(id);
      return this.image(id, texture, frame);
    };
    if (tick !== undefined) {
      state?.projectiles.forEach((shot, id) => {
        if (
          shot.zoneId !== zone ||
          (shot.abilityId !== quyen.palm && shot.abilityId !== quyen.wave)
        )
          return;
        const direction = facing(shot.vx, shot.vy) as Direction;
        const dir = heading[direction];
        const wave = shot.abilityId === quyen.wave;
        const socket =
          sockets.palm[direction][wave && shot.stage === 'travel_0' ? 0 : 1]!;
        const position = {
          x: shot.x - shot.vx / m1Config.tickRate + socket.x * bodyScale,
          y: shot.y - shot.vy / m1Config.tickRate + socket.y * bodyScale,
        };
        const angle = Math.atan2(shot.vy, shot.vx);
        const age = Math.max(0, (tick - shot.startedAt) * tickMs);
        const image = wave
          ? this.place(
              get('shot:' + id, keys.effects, 'sonic'),
              'sonic',
              position,
              placement.sonic.width * bodyScale,
              shot.y + 1,
            ).setRotation(angle)
          : get(
              'shot:' + id,
              keys.projectile,
              `huyen_am_travel_${direction}_${Math.floor(age / 100) % 4}`,
            )
              .setPosition(position.x, position.y)
              .setDepth(shot.y + 1)
              .setOrigin(...dir.origin)
              .setScale(0.88 * bodyScale)
              .setRotation(angle - dir.angle);
        image
          .setData('projectile-id', id)
          .setData('velocity', [shot.vx, shot.vy])
          .setData('projectile-stage', shot.stage);
      });
      state?.areas.forEach((area, id) => {
        if (area.zoneId !== zone) return;
        if (area.abilityId === quyen.wave && area.ticks > 1) {
          const age = (tick - area.startedAt) * tickMs;
          this.place(
            get('seal:' + id, keys.effects, 'seal'),
            'seal',
            area,
            area.radius,
            -0.4,
          ).setAlpha(0.7 + 0.3 * Math.sin(age * 0.013));
        }
        if (area.abilityId !== quyen.formation) return;
        const field = this.place(
          get('formation:' + id, keys.effects, 'formation'),
          'formation',
          area,
          area.radius * 2,
          -0.6,
        );
        const elapsed = (tick - area.startedAt) * tickMs;
        const alpha = Math.min(0.96, 0.3 + elapsed / 270, area.ticks / 12);
        field.setAlpha(alpha);
        const rx = field.displayWidth * 0.457;
        const ry = field.displayHeight * 0.431;
        for (let i = 0; i < 3; i++) {
          const angle = (this.scene.time.now / 2500 + i / 3) * Math.PI * 2;
          const sin = Math.sin(angle),
            cos = Math.cos(angle);
          const light = get(`rim:${id}:${i}`, keys.rim);
          light
            .setPosition(area.x + rx * cos, area.y + ry * sin)
            .setScale((field.displayWidth * 134) / 768 / light.width)
            .setRotation(Math.atan2(ry * cos, -rx * sin))
            .setDepth(-0.5)
            .setAlpha(alpha * (0.64 + sin * 0.12));
        }
      });
      state?.players.forEach((actor, id) => {
        if (actor.zoneId !== zone || actor.hp <= 0) return;
        const root = point?.(id) ?? actor;
        const statuses = JSON.parse(actor.statuses || '[]') as Status[];
        if (
          actor.mana > 0 &&
          statuses.some(
            (status) =>
              status.abilityId === quyen.shield &&
              status.kind === 'mana_shield',
          )
        ) {
          const flash = Math.max(
            0,
            ((this.shieldFlash.get(id) ?? 0) - this.scene.time.now) / 180,
          );
          this.place(
            get('shield:' + id, keys.effects, 'shield'),
            'shield',
            { x: root.x, y: root.y - 22 },
            placement.shield.width * bodyScale * (1 + flash * 0.06),
            root.y + 0.6,
          ).setAlpha(0.87 + flash * 0.13);
        }
        const fortune =
          statuses.find((status) => status.kind === 'fortune_roll') ??
          statuses.find((status) => status.kind === 'fortune_result');
        const glyph = fortune && fortuneReadings[fortune.magnitude];
        if (!fortune || !glyph) return;
        this.place(
          get('glyph:' + id, keys.effects, glyph),
          glyph,
          { x: root.x, y: root.y - 56 },
          placement[glyph].width * bodyScale,
          root.y + 0.9,
        );
        if (
          fortune.kind !== 'fortune_result' ||
          !Object.hasOwn(fortuneBuffCues, glyph)
        )
          return;
        const cue = fortuneBuffCues[glyph as keyof typeof fortuneBuffCues];
        const age =
          (Math.round(m1Config.tickRate * 1.3) - fortune.ticks) * tickMs;
        const progress = Phaser.Math.Clamp(age / cue.duration, 0, 1);
        if (progress >= 1) return;
        const frame = `buff-${glyph as keyof typeof fortuneBuffCues}` as const;
        const dir = heading[facing(actor.fx, actor.fy) as Direction];
        const trail = glyph === 'kham' ? 4 : 0;
        this.place(
          get('buff:' + id, keys.effects, frame),
          frame,
          {
            x: root.x - dir.x * trail,
            y:
              root.y +
              (cue.y - cue.lift * progress) * bodyScale -
              dir.y * trail,
          },
          placement[frame].width *
            bodyScale *
            Phaser.Math.Linear(cue.start, cue.end, progress),
          root.y + 0.7,
        ).setAlpha(0.88 * Math.min(1, progress * 11, (1 - progress) * 3));
      });
    }
    for (const [id, image] of this.sprites)
      if (!wanted.has(id)) {
        image.destroy();
        this.sprites.delete(id);
      }
    for (const [id, until] of this.shieldFlash)
      if (until < this.scene.time.now) this.shieldFlash.delete(id);
  }

  clear(): void {
    for (const timer of this.timers) timer.remove();
    this.timers.clear();
    for (const image of [...this.sprites.values(), ...this.transients]) {
      this.scene.tweens.killTweensOf(image);
      image.destroy();
    }
    this.sprites.clear();
    this.transients.clear();
    this.shieldFlash.clear();
    this.point = undefined;
  }
}
