import Phaser from 'phaser';
import raw from '../../../assets/exports/hero-finish-v1/manifest.json';
export { actionBodyPose, type HeroActionClock } from './hero-finish-policy.js';
const actors = new Map(raw.actors.map((a) => [a.basic, a]));
export function preloadHeroFinish(scene: Phaser.Scene): void {
  for (const a of actors.values())
    scene.load.atlas(
      'hero-finish:' + a.basic,
      '/assets/hero-finish-v1/' + a.basic + '.png',
      '/assets/hero-finish-v1/' + a.basic + '.json',
    );
}
export function presentHeroFinish(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  basic: string,
  direction: string,
  pose: string,
): boolean {
  const a = actors.get(basic);
  if (!a) return false;
  const key = 'hero-finish:' + basic,
    frame = pose + '_' + direction;
  if (!scene.textures.exists(key) || !scene.textures.get(key).has(frame))
    return false;
  sprite
    .stop()
    .setTexture(key, frame)
    .setOrigin(a.pivot[0]!, a.pivot[1]!)
    .setScale(a.scale)
    .setFlip(false, false)
    .setRotation(0);
  return true;
}
