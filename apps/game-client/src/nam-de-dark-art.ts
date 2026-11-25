import Phaser from 'phaser';
import type { NamDeView } from '@volam/game-core';
import type { LobbyState } from '@volam/game-protocol';
import manifest from '../../../assets/exports/boss-nam-de-dark-v1/manifest.json';
import effects from '../../../assets/exports/effects/nam_de_dark_v01/manifest.json';
import { setArtFilter } from './art-filter.js';
const dirs = [
  'right',
  'down_right',
  'down',
  'down_left',
  'left',
  'up_left',
  'up',
  'up_right',
];
const sector = (fx: number, fy: number) =>
  dirs[(Math.round(Math.atan2(fy, fx) / (Math.PI / 4)) + 8) % 8]!;
export function preloadNamDeDark(scene: Phaser.Scene): void {
  scene.load.atlas(
    manifest.texture,
    '/assets/' + manifest.folder + '/body.png',
    '/assets/' + manifest.folder + '/body.json',
  );
  scene.load.atlas(
    effects.texture,
    '/assets/' + effects.folder + '/effects.png',
    '/assets/' + effects.folder + '/effects.json',
  );
}
export function presentNamDeDark(
  scene: Phaser.Scene,
  body: Phaser.GameObjects.Sprite,
  view: NamDeView,
  actor: {
    fx: number;
    fy: number;
    pose: string;
    hp: number;
    hurtUntil?: number;
  },
  tick: number,
): void {
  if (!view.dark) return;
  const dir = sector(actor.fx, actor.fy),
    cast = view.dark.cast;
  let pose = 'idle';
  if (actor.hp <= 0) pose = 'death';
  else if (cast?.kind === 'blade')
    pose = tick < cast.releaseAt ? 'slash_windup' : 'slash_release';
  else if (cast?.kind === 'fist' || tick < view.dark.transitionUntil)
    pose = 'summon';
  else if ((actor.hurtUntil ?? 0) > tick) pose = 'hurt';
  else if (view.cast || view.smallCast) {
    const legacy = view.cast ?? view.smallCast!;
    pose = [
      'nam_de_aura',
      'phat_quang_pho_chieu',
      'nhat_duong_quy_tong',
    ].includes(legacy.ability)
      ? 'summon'
      : tick < legacy.releaseAt
        ? 'slash_windup'
        : 'slash_release';
  } // Shared unarmed phase2 poses; never swaps back into robes.
  else if (actor.pose === 'walk')
    pose = Math.floor(tick / 6) % 2 ? 'walk_a' : 'walk_b';
  const texture = scene.textures.get(manifest.texture);
  setArtFilter(texture, Phaser.Textures.FilterMode.LINEAR);
  body.anims.stop();
  body
    .setTexture(manifest.texture, pose + '_' + dir)
    .setOrigin(manifest.pivot[0]!, manifest.pivot[1]!)
    .setScale(manifest.scale)
    .setRotation(0)
    .setFlip(false, false);
  body.setData('nam-de-dark', {
    pose,
    direction: dir,
    physicalHeight: manifest.bodyHeight,
    shield: view.dark.shield,
  });
}
export class NamDeDarkArt {
  private images = new Map<string, Phaser.GameObjects.Image>();
  private used = new Set<string>();
  private observed = new Set<string>();
  constructor(private scene: Phaser.Scene) {}
  clear(): void {
    for (const image of this.images.values()) image.destroy();
    this.images.clear();
  }
  private draw(
    id: string,
    frame: string,
    x: number,
    y: number,
    scale: number,
    depth: number,
    origin: [number, number] = [0.5, 0.5],
    alpha = 1,
  ) {
    let image = this.images.get(id);
    if (!image) {
      image = this.scene.add
        .image(x, y, effects.texture, frame)
        .setName('nam-de-dark:' + id);
      this.images.set(id, image);
    }
    setArtFilter(
      this.scene.textures.get(effects.texture),
      Phaser.Textures.FilterMode.LINEAR,
    );
    image
      .setTexture(effects.texture, frame)
      .setPosition(x, y)
      .setScale(scale)
      .setOrigin(...origin)
      .setDepth(depth)
      .setRotation(0)
      .setFlip(false, false)
      .setAlpha(alpha)
      .setCrop();
    this.used.add(id);
    this.observed.add(frame);
    return image;
  }
  sync(
    state: LobbyState | undefined,
    zone: string,
    view: NamDeView | null,
  ): void {
    this.used.clear();
    const b = zone === 'arena' ? state?.creeps.get('boss_nam_de') : undefined,
      d = view?.dark,
      tick = state?.tick ?? 0;
    if (b && d && b.hp > 0) {
      if (d.shield) {
        const alpha = 0.8 + 0.1 * Math.sin(tick / 5);
        this.draw(
          'aura-back',
          'aura',
          b.x,
          b.y + 7,
          0.42,
          b.y - 0.4,
          [0.5, 0.88],
          alpha,
        );
        this.draw(
          'aura-front',
          'aura',
          b.x,
          b.y + 7,
          0.42,
          b.y + 0.4,
          [0.5, 0.88],
          alpha * 0.7,
        ).setCrop(0, 365, 512, 147);
      }
      if (d.shatterAt > 0 && tick - d.shatterAt < 27) {
        const age = (tick - d.shatterAt) / 27;
        this.draw(
          'shatter',
          'shatter',
          b.x,
          b.y - 65,
          0.4 + age * 0.07,
          b.y + 0.6,
          [0.5, 0.5],
          1 - age,
        );
      }
      for (const blade of d.blades) {
        const dir = sector(blade.fx, blade.fy);
        const origins: Record<string, [number, number]> = {
          right: [0.8, 0.5],
          left: [0.2, 0.5],
          up: [0.5, 0.2],
          down: [0.5, 0.8],
          up_right: [0.72, 0.28],
          up_left: [0.28, 0.28],
          down_right: [0.5, 0.8],
          down_left: [0.5, 0.8],
        };
        const height = blade.reflected
          ? 28 + Math.min(1, blade.traveled / 180) * 28
          : 28 + Math.max(0, 1 - blade.traveled / 100) * 38;
        this.draw(
          'blade:' + blade.id,
          'blade_' + dir,
          blade.x,
          blade.y - height,
          0.19,
          blade.y + 0.6,
          origins[dir]!,
        ).setData('travel', {
          id: blade.id,
          reflected: blade.reflected,
          worldX: blade.x,
          worldY: blade.y,
        });
      }
      for (const fist of d.fists) {
        const age = tick - fist.activeAt;
        if (age < 0) {
          this.draw(
            'warning:' + fist.id,
            'fist_warning',
            fist.x,
            fist.y,
            0.25,
            fist.y - 0.8,
            [0.53, 0.7],
            0.8,
          );
          if (age >= -11) {
            const progress = (11 + age) / 11;
            this.draw(
              'fall:' + fist.id,
              'fist_fall',
              fist.x,
              fist.y - (1 - progress) * 150,
              0.27,
              fist.y + 2,
              [0.5, 0.77],
              0.35 + 0.65 * progress,
            );
          } else
            this.draw(
              'ghost:' + fist.id,
              'fist_ghost',
              fist.x,
              fist.y - 95,
              0.22,
              fist.y + 2,
              [0.5, 0.68],
              0.25,
            );
        } else {
          this.draw(
            'crack:' + fist.id,
            'fist_crack',
            fist.x,
            fist.y,
            0.26,
            fist.y - 0.6,
            [0.5, 0.65],
            Math.max(0, 1 - age / 21),
          );
          if (age < 7)
            this.draw(
              'impact:' + fist.id,
              'fist_impact',
              fist.x,
              fist.y,
              0.27,
              fist.y + 2,
              [0.5, 0.88],
              1 - age / 14,
            );
          else if (age < 17)
            this.draw(
              'burst:' + fist.id,
              'fist_burst',
              fist.x,
              fist.y,
              0.23 + (age - 7) * 0.008,
              fist.y + 1,
              [0.5, 0.65],
              1 - (age - 7) / 10,
            );
        }
      }
      state!.players.forEach((h, id) => {
        if (h.zoneId !== zone || h.hp <= 0) return;
        const guard = d.guards.find((g) => g.id === id);
        if (
          guard &&
          (guard.until > tick ||
            (guard.parryAt > 0 && tick - guard.parryAt < 9))
        ) {
          const parry = guard.parryAt > 0 && tick - guard.parryAt < 9;
          this.draw(
            'guard:' + id,
            'parry',
            h.x + h.fx * 10,
            h.y - 28,
            0.105,
            h.y + 0.8,
            [0.5, 0.5],
            parry ? 1 : 0.55,
          ).setFlipX(h.fx < 0);
        }
        const states = JSON.parse(h.statuses || '[]') as Array<{
          kind: string;
          sourceId: string;
          abilityId: string;
          until: number;
        }>;
        if (
          states.some(
            (s) =>
              s.kind === 'slow' &&
              s.abilityId === 'tien_thien_canh_khi' &&
              s.until > tick,
          )
        )
          this.draw(
            'frost:' + id,
            'frost',
            h.x,
            h.y - 1,
            0.14,
            h.y - 0.15,
            [0.5, 0.55],
            0.8,
          );
      });
    }
    for (const [id, image] of this.images)
      if (!this.used.has(id)) {
        image.destroy();
        this.images.delete(id);
      }
  }
  inspect() {
    return {
      observed: [...this.observed],
      images: [...this.images].map(([id, image]) => ({
        id,
        frame: image.frame.name,
        x: image.x,
        y: image.y,
        scale: image.scaleX,
        depth: image.depth,
        alpha: image.alpha,
        rotation: image.rotation,
        travel: image.getData('travel'),
      })),
    };
  }
}
