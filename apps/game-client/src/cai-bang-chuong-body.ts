import Phaser from 'phaser';
import manifest from '../../../assets/exports/cai-bang-chuong-unified-v1/manifest.json';
import { setArtFilter } from './art-filter.js';
import {
  chuongBodyPose,
  type ChuongBodyClock,
} from './cai-bang-chuong-body-policy.js';
const key = 'cai-bang-chuong-unified';
export function preloadChuongBody(scene: Phaser.Scene): void {
  scene.load.atlas(
    key,
    '/assets/cai-bang-chuong-unified-v1/body.png',
    '/assets/cai-bang-chuong-unified-v1/body.json',
  );
}
/** Complete body replacement only; accepted server state and existing VFX own all gameplay. */
export function presentChuongBody(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  basic: string | undefined,
  pose: string,
  direction: string,
  clock?: ChuongBodyClock,
): boolean {
  if (basic !== 'cai_bang_chuong') return false;
  if (!manifest.directions.includes(direction))
    throw new Error('Missing Cái Bang Chưởng facing ' + direction);
  const texture = scene.textures.get(key);
  if (!scene.textures.exists(key)) return false;
  setArtFilter(texture, Phaser.Textures.FilterMode.LINEAR);
  const previous = sprite.getData('chuong-body-state') as
    { pose: string; at: number } | undefined;
  const at = previous?.pose === pose ? previous.at : scene.time.now;
  sprite.setData('chuong-body-state', { pose, at });
  const cel = chuongBodyPose(pose, scene.time.now - at, scene.time.now, clock),
    frame = cel + '_' + direction;
  if (!texture.has(frame))
    throw new Error('Missing coherent Cái Bang Chưởng frame ' + frame);
  sprite
    .stop()
    .setTexture(key, frame)
    .setOrigin(manifest.pivot[0]!, manifest.pivot[1]!)
    .setScale(manifest.scale)
    .setFlip(false, false)
    .setRotation(0);
  sprite
    .setData('hero-motion-active', true)
    .setData('hero-motion-direction', direction)
    .setData('hero-motion-body-width', 54);
  sprite.setData('renovation', {
    id: 'hero_cai_bang_chuong',
    pose,
    direction,
    locomotion: pose === 'idle' || pose === 'walk',
    bodySet: key,
  });
  sprite.setData('chuong-body-frame', frame);
  return true;
}
