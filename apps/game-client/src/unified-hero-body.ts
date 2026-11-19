import Phaser from 'phaser';
import bong from '../../../assets/exports/cai-bang-bong-unified-v1/manifest.json';
import { setArtFilter } from './art-filter.js';
import {
  unifiedBodySample,
  type UnifiedHeroClock,
} from './unified-hero-policy.js';
const profiles = new Map([[bong.basic, bong]]);
export const unifiedHeroBasics: ReadonlySet<string> = new Set(
  [...profiles.values()]
    .filter((p) => p.directions.length === 8)
    .map((p) => p.basic),
);
const ring = [
  'right',
  'down_right',
  'down',
  'down_left',
  'left',
  'up_left',
  'up',
  'up_right',
];
export function preloadUnifiedHeroes(scene: Phaser.Scene): void {
  for (const p of profiles.values())
    scene.load.atlas(
      p.texture,
      '/assets/' + p.folder + '/body.png',
      '/assets/' + p.folder + '/body.json',
    );
}
export function presentUnifiedHero(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  basic: string | undefined,
  pose: string,
  direction: string,
  clock?: UnifiedHeroClock,
): boolean {
  const p = basic && profiles.get(basic);
  if (!p) return false;
  const previous = sprite.getData('unified-body-state') as
    { basic: string; pose: string; at: number } | undefined;
  const at =
    previous?.basic === basic && previous.pose === pose
      ? previous.at
      : scene.time.now;
  const sample = unifiedBodySample(
    basic,
    pose,
    scene.time.now - at,
    scene.time.now,
    clock,
  );
  if (!sample) return false;
  const base = sample.cardinal
    ? direction.includes('down')
      ? 'down'
      : direction.includes('up')
        ? 'up'
        : direction
    : direction;
  const facing = ring[(ring.indexOf(base) + sample.turns + 8) % 8]!;
  // Single-facing production gate may be built before the rest; final validator requires all8.
  if (!p.directions.includes(facing) || !scene.textures.exists(p.texture))
    return false;
  const poseName = sample.pose;
  const frame = poseName + '_' + facing,
    texture = scene.textures.get(p.texture);
  if (!texture.has(frame))
    throw new Error('Missing coherent hero cel ' + basic + ':' + frame);
  setArtFilter(texture, Phaser.Textures.FilterMode.LINEAR);
  sprite
    .stop()
    .setTexture(p.texture, frame)
    .setOrigin(p.pivot[0]!, p.pivot[1]!)
    .setScale(p.scale)
    .setFlip(false, false)
    .setRotation(0);
  sprite.setData('unified-body-state', { basic, pose, at });
  sprite.setData('unified-body-phase', clock?.phase ?? '');
  sprite
    .setData('hero-motion-active', true)
    .setData('hero-motion-direction', facing)
    .setData('hero-motion-body-width', p.bodyWidth);
  sprite.setData('renovation', {
    id: 'hero_cai_bang',
    pose,
    direction: facing,
    locomotion: pose === 'idle' || pose === 'walk',
    bodySet: p.texture,
    actionFamily: sample.pose,
  });
  return true;
}
