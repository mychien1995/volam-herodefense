import { unifiedHeroProfile } from './unified-hero-body.js';
import { zoneTick } from './zone-tick.js';
import Phaser from 'phaser';
import { tamLienTram, type CombatEvent } from '@volam/game-core';
import { m1Config } from '@volam/game-data';
import type { LobbyState } from '@volam/game-protocol';
import { tamLienArt } from './tam-lien-hud.js';

const skillPath = '/assets/skills/thien-son/skill-review-2026-11-09/';
export const fanId = 'luu_phong_bo';
export const flurryId = 'bach_liet_thien_kich';
export const hanNguyetKey = 'renovated-thien-son-han-nguyet';
export const hanNguyetPath =
  '/assets/characters/thien-son-han-nguyet/han-nguyet';
const shadows = 'thien-son-x-shadows';
const fan = 'thien-son-wind-fan';
const crescents = 'thien-son-x-crescents';
const directions = ['down_right', 'down_left', 'up_right', 'up_left'] as const;
const shapes = ['slender', 'heavy', 'double_edge', 'hooked'] as const;
const daoPoses = 'tam-lien-poses';
const sweepTextures = ['sweep-right', 'sweep-left', 'sweep-down'] as const;
const peachWind = 'peach-wind';

export function preloadThienSonRework(scene: Phaser.Scene) {
  scene.load.spritesheet(daoPoses, tamLienArt + 'poses.png', {
    frameWidth: 160,
    frameHeight: 144,
  });
  for (const name of [...sweepTextures, peachWind])
    scene.load.image(name, tamLienArt + name + '.png');
  for (const [key, name] of [
    [shadows, 'bach-liet-x-bodies'],
    [fan, 'bao-vu-cuong-phong'],
    [crescents, 'bach-liet-x-flurry'],
  ])
    if (key !== shadows || !unifiedHeroProfile('thien_son_dao'))
      scene.load.atlas(
        key!,
        skillPath + name + '.png',
        skillPath + name + '.json',
      );
}

export function presentTamLienBody(
  sprite: Phaser.GameObjects.Sprite,
  actor: {
    hp: number;
    pose: string;
    basicId?: string;
    basicStage?: string;
    castAbilityId?: string;
    actionStartedAt?: number;
  },
  tick: number | undefined,
) {
  if (
    actor.hp <= 0 ||
    actor.basicId !== tamLienTram.basicId ||
    tick === undefined ||
    actor.actionStartedAt === undefined
  )
    return;
  const age = Math.max(0, tick - actor.actionStartedAt);
  let frame: number;
  if (
    actor.pose === 'basic_attack' &&
    actor.basicStage?.startsWith('dao_swing_')
  ) {
    const row = Number(actor.basicStage.at(-1));
    frame = row * 4 + (age < 2 ? 0 : age < 4 ? 1 : age < 7 ? 2 : 3);
  } else if (actor.pose === 'cast' && actor.castAbilityId === tamLienTram.id) {
    frame = 13 + Math.min(2, Math.floor(age / tamLienTram.passTicks));
  } else return;
  sprite.anims.stop();
  sprite
    .setTexture(daoPoses, frame)
    .setOrigin(0.5, 112 / 144)
    .setScale(0.5)
    .setFlip(false, false)
    .setRotation(0);
}

export class ThienSonRework {
  private readonly sprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly origins = new Map<
    string,
    { x: number; y: number; tick: number }
  >();
  private readonly opacities = new Map<string, number>();
  private readonly transients = new Set<Phaser.GameObjects.Image>();

  constructor(private readonly scene: Phaser.Scene) {}

  event(event: CombatEvent): boolean {
    if (
      event.abilityId === tamLienTram.basicId &&
      event.kind === 'attack' &&
      event.stage?.startsWith('dao_swing_')
    ) {
      this.sweep(event, Number(event.stage.at(-1)));
      return true;
    }
    if (event.abilityId === tamLienTram.id) {
      if (event.kind === 'pulse' && event.stage?.startsWith('cross_'))
        this.cross(event);
      return true;
    }
    if (event.abilityId === flurryId && event.kind === 'cast')
      this.origins.set(event.sourceId, {
        x: event.x,
        y: event.y,
        tick: event.tick ?? -1,
      });
    return event.abilityId === fanId || event.abilityId === flurryId;
  }

  private sweep(event: CombatEvent, row: number) {
    const key = sweepTextures[row];
    if (!key) return;
    const y =
      event.y +
      (row === 1 ? 0 : (event.fy ?? 0) * 12) -
      ([21, 13, 26.5][row] ?? 21);
    const x = event.x + (event.fx ?? 0) * 21;
    const image = this.scene.add
      .image(x, y, key)
      .setDepth(event.y + 1)
      .setFlipY(row === 0);
    image.setScale((row === 2 ? 58 : 79) / image.width).setVisible(false);
    this.transients.add(image);
    const reveal = { amount: 0 };
    this.scene.tweens.add({
      targets: reveal,
      amount: 1,
      delay: 72,
      duration: 62,
      onUpdate: () => {
        if (!this.transients.has(image)) return;
        image.setVisible(true);
        const width =
          row === 2
            ? image.width
            : Math.max(1, Math.round(image.width * reveal.amount));
        const height =
          row === 2
            ? Math.max(1, Math.round(image.height * reveal.amount))
            : image.height;
        image.setCrop(row === 1 ? image.width - width : 0, 0, width, height);
      },
    });
    this.fade(image, 168, 180);
  }

  private cross(event: CombatEvent) {
    const pass = Number(event.stage?.at(-1));
    const passMs = (1000 * tamLienTram.passTicks) / m1Config.tickRate;
    const image = this.scene.add
      .image(event.x, event.y - 18, peachWind)
      .setOrigin(0, 0.5)
      .setDepth(event.y + 200)
      .setRotation(Math.atan2(event.fy ?? 0, event.fx ?? 1));
    image.setDisplaySize(1, event.stage === 'cross_2' ? 26 : 21);
    this.transients.add(image);
    this.scene.tweens.add({
      targets: image,
      scaleX: (event.radius ?? 1) / image.width,
      duration: passMs,
    });
    this.fade(image, (tamLienTram.offsets.length - pass) * passMs + 60, 400);
  }

  private fade(
    image: Phaser.GameObjects.Image,
    delay: number,
    duration: number,
  ) {
    this.scene.tweens.add({
      targets: image,
      alpha: 0,
      delay,
      duration,
      onComplete: () => {
        if (this.transients.delete(image)) image.destroy();
      },
    });
  }

  opacity(id: string): number {
    return this.opacities.get(id) ?? 1;
  }

  inspect() {
    return [...this.sprites].map(([id, image]) => ({
      id,
      texture: image.texture.key,
      frame: image.frame.name,
      alpha: image.alpha,
      x: image.x,
      y: image.y,
      scale: [image.scaleX, image.scaleY],
      origin: [image.originX, image.originY],
    }));
  }

  private image(id: string, texture: string, frame: string) {
    let image = this.sprites.get(id);
    if (!image) {
      image = this.scene.add
        .image(0, 0, texture, frame)
        .setName('ts-rework:' + id);
      this.sprites.set(id, image);
    } else image.setTexture(texture, frame);
    return image;
  }

  sync(state: LobbyState | undefined, zone: string) {
    const active = new Set<string>();
    const casting = new Set<string>();
    this.opacities.clear();
    const effect = m1Config.skillCatalogue?.[flurryId]?.effect;
    const tick = zoneTick(state, zone);
    if (
      effect?.mode === 'multi_hit' &&
      effect.inwardBurst &&
      tick !== undefined
    ) {
      const pattern = effect.inwardBurst;
      state?.players.forEach((player, id) => {
        if (player.zoneId !== zone || player.hp <= 0 || !player.actionState)
          return;
        // A hit can replace the body pose while the server action is still running.
        const action = JSON.parse(player.actionState) as {
          abilityId: string;
          startedAt: number;
          until: number;
        };
        if (action.abilityId !== flurryId || tick >= action.until) return;
        const age = tick - action.startedAt;
        if (age < 0) return;
        casting.add(id);
        let origin = this.origins.get(id);
        if (!origin || origin.tick !== action.startedAt) {
          origin = { x: player.x, y: player.y, tick: action.startedAt };
          this.origins.set(id, origin);
        }
        const spread = 1 - (1 - Math.min(1, age / 6)) ** 2;
        const fade = Math.min(1, (action.until - tick) / 4);
        this.opacities.set(
          id,
          JSON.parse(player.statuses).some(
            (s: { kind: string }) => s.kind === 'concealed',
          )
            ? 0.22
            : 1,
        );
        const interval = pattern.intervalTicks;
        const sinceRelease = age - pattern.windupTicks;
        const beat = (sinceRelease % interval) / interval;
        const pose =
          age < 6
            ? 'ready'
            : sinceRelease < 0
              ? 'windup'
              : sinceRelease >= interval * effect.hits
                ? 'follow'
                : beat < 0.24
                  ? 'sweep'
                  : beat < 0.49
                    ? 'follow'
                    : beat < 0.66
                      ? 'ready'
                      : 'windup';
        const coherent = unifiedHeroProfile('thien_son_dao');
        const coherentPose = {
          ready: 'ready',
          windup: 'windup',
          sweep: 'flurry_sweep',
          follow: 'follow',
        }[pose];
        directions.forEach((direction, row) => {
          const key = `shadow:${id}:${row}`;
          const x = origin.x + (row % 2 ? 1 : -1) * pattern.offsetX * spread;
          const y = origin.y + (row < 2 ? -1 : 1) * pattern.offsetY * spread;
          this.image(
            key,
            coherent?.texture ?? shadows,
            coherent ? `${coherentPose}_${direction}` : `${direction}_${pose}`,
          )
            .setOrigin(coherent?.pivot[0] ?? 0.5, coherent?.pivot[1] ?? 0.8)
            .setScale(coherent?.scale ?? 0.88)
            .setPosition(Math.round(x), Math.round(y))
            .setAlpha(0.9 * fade * spread)
            .setDepth(y);
          active.add(key);
        });
      });
    }
    state?.projectiles.forEach((shot, id) => {
      if (shot.zoneId !== zone) return;
      const key = 'shot:' + id;
      if (shot.abilityId === fanId) {
        const phase = Math.floor(this.scene.time.now / 55) % 4;
        this.image(key, fan, 'spin_' + phase)
          .setOrigin(0.5)
          .setPosition(Math.round(shot.x), Math.round(shot.y - 20))
          .setDepth(shot.y + 0.4);
      } else if (shot.abilityId === flurryId) {
        const shape = shapes[Number(shot.stage.at(-1))] ?? shapes[0];
        this.image(key, crescents, shape)
          .setOrigin(54 / 80, 0.5)
          .setPosition(Math.round(shot.x), Math.round(shot.y - 22))
          .setRotation(Math.atan2(shot.vy, shot.vx))
          .setDepth(shot.y + 0.4);
      } else return;
      active.add(key);
    });
    for (const [id, image] of this.sprites)
      if (!active.has(id)) {
        image.destroy();
        this.sprites.delete(id);
      }
    for (const id of this.origins.keys())
      if (!casting.has(id)) this.origins.delete(id);
  }

  clear() {
    this.sync(undefined, '');
    for (const image of this.transients) {
      this.scene.tweens.killTweensOf(image);
      image.destroy();
    }
    this.transients.clear();
  }
}
