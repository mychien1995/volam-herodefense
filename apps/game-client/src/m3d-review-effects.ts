import Phaser from 'phaser';
import type { BossEffectState } from '@volam/game-protocol';
import { m1Config } from '@volam/game-data';
import image from '../../../assets/exports/m3d-review/effects.png?url';
import atlas from '../../../assets/exports/m3d-review/effects.json?url';
import layout from '../../../assets/exports/m3d-review/layout.json';

const texture = 'm3d_review_effects';
const clips = layout.clips as Record<string, string[]>;
const anchors = layout.anchors as Record<string, number[]>;
export function preloadM3dReviewEffects(scene: Phaser.Scene): void {
  scene.load.atlas(texture, image, atlas);
}

export function reviewFrame(
  sprite: Phaser.GameObjects.Sprite,
  clip: string,
  cel: number,
  x: number,
  y: number,
  scale = 0.5,
  depth = y + 0.2,
  rotation = 0,
): void {
  const frame = clips[clip]![cel]!;
  const [ox, oy] = anchors[frame]!;
  sprite
    .setTexture(texture, frame)
    .setOrigin(ox!, oy!)
    .setPosition(x, y)
    .setScale(scale)
    .setDepth(depth)
    .setRotation(rotation)
    .setVisible(true);
}

function fitWidth(sprite: Phaser.GameObjects.Sprite, width: number): void {
  sprite.setScale(width / sprite.frame.realWidth);
}

export function renderTrapCue(
  body: Phaser.GameObjects.Sprite,
  e: BossEffectState,
  tick: number,
): void {
  const age = tick - e.activeAt;
  const heading = Math.atan2(e.fy, e.fx);
  if (e.abilityId === 'darts') {
    reviewFrame(
      body,
      'dart',
      Math.floor(age / 3) % 2,
      e.x,
      e.y - 12,
      0.55,
      e.y + 0.2,
      heading,
    );
    return;
  }
  if (e.abilityId === 'quicksand') {
    reviewFrame(
      body,
      'quicksand',
      Math.floor(tick / 5) % 4,
      e.x,
      e.y,
      1,
      e.y - 100,
    );
    fitWidth(body, e.radius * 2);
    return;
  }
  const progress = (tick - e.startedAt) / Math.max(1, e.activeAt - e.startedAt);
  const fire = e.abilityId === 'firetrap';
  const cel =
    age >= 18 || tick < e.startedAt
      ? 0
      : age >= 8
        ? 3
        : age >= 0
          ? 2
          : fire || progress > 0.48
            ? 1
            : 0;
  const key = fire ? 'firetrap' : 'geyser';
  reviewFrame(
    body,
    key,
    cel,
    e.x,
    e.y,
    1,
    age < 0 || age >= 18 ? e.y - 3 : e.y + 0.4,
  );
  body.setAlpha(fire && cel === 0 ? 0.72 : 1);
  fitWidth(body, e.radius * 2);
}

export function renderReviewedCreepCue(
  body: Phaser.GameObjects.Sprite,
  e: BossEffectState,
  tick: number,
): boolean {
  const age = tick - e.activeAt;
  const cel = Math.min(3, Math.max(0, Math.floor(age / 4)));
  const angle = Math.atan2(e.fy, e.fx);
  if (
    e.abilityId === 'creep_son_vien_special' &&
    e.kind === 'creep_projectile'
  ) {
    const p = Math.min(
      1,
      Math.max(
        0,
        ((age + 1) * e.speed) / (Math.max(1, e.length) * m1Config.tickRate),
      ),
    );
    if (tick < e.startedAt + Math.round((e.activeAt - e.startedAt) / 4)) {
      body.setVisible(false);
      return true;
    }
    const height = age < 0 ? 36 : 16 * (1 - p) + 45 * 4 * p * (1 - p);
    reviewFrame(
      body,
      'rock',
      0,
      e.x + (age < 0 ? -e.fx * 5 : 0),
      e.y - height,
      0.67,
      e.y + 1,
      p * Math.PI,
    );
    return true;
  }
  if (age < 0) return false;
  if (e.abilityId === 'creep_hai_vu_special' && e.kind === 'creep_projectile') {
    const travel =
      ((age + 1) * e.speed) / (Math.max(1, e.length) * m1Config.tickRate);
    reviewFrame(
      body,
      'tide',
      Math.min(3, Math.floor(travel * 4)),
      e.x,
      e.y,
      0.62,
      e.y + 0.25,
    );
    body.setFlipX(e.fx < 0);
    return true;
  }
  if (e.abilityId === 'creep_cu_nhan_sa_thach_special') {
    reviewFrame(body, 'sandstone', cel, e.x, e.y, 0.58);
    return true;
  }
  const key =
    e.abilityId === 'creep_xac_uop_special'
      ? 'curse'
      : e.abilityId === 'creep_hell_xich_quy_special'
        ? 'claw'
        : undefined;
  if (!key) return false;
  const reach = Math.min(e.length, 170);
  reviewFrame(
    body,
    key,
    cel,
    e.x + e.fx * reach * 0.53,
    e.y + e.fy * reach * 0.53 - 9,
    0.75,
    e.y + 0.3,
    angle,
  );
  return true;
}
