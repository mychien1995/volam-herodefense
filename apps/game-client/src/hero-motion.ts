import {
  preloadHeroFinish,
  presentHeroFinish,
  actionBodyPose,
  type HeroActionClock,
} from './hero-finish.js';
import Phaser from 'phaser';
import raw from '../../../assets/exports/hero-motion-v1/manifest.json';
type Body = Phaser.GameObjects.Sprite;
const actors = new Map(raw.actors.map((a) => [a.basic, a]));
export function preloadHeroMotion(scene: Phaser.Scene): void {
  preloadHeroFinish(scene);
  for (const a of actors.values())
    scene.load.atlas(
      'hero-motion:' + a.basic,
      '/assets/hero-motion-v1/' + a.basic + '.png',
      '/assets/hero-motion-v1/' + a.basic + '.json',
    );
}
export function motionFacing(x: number, y: number): string {
  if (Math.abs(x) < 0.1 && Math.abs(y) < 0.1) return 'down';
  const sector = Math.round(Math.atan2(y, x) / (Math.PI / 4));
  return [
    'right',
    'down_right',
    'down',
    'down_left',
    'left',
    'up_left',
    'up',
    'up_right',
  ][(sector + 8) % 8]!;
}
/** Authored locomotion and diagonal actions; cardinal choreography and special forms retain their renderer. */
export function presentHeroMotion(
  scene: Phaser.Scene,
  sprite: Body,
  basic: string | undefined,
  pose: string,
  fx: number,
  fy: number,
  statuses: readonly { kind: string }[],
  clock?: HeroActionClock,
): void {
  const a = basic && actors.get(basic);
  sprite.setData('hero-motion-active', false);
  sprite.setData('hero-motion-direction', undefined);
  if (
    !a ||
    !['idle', 'walk', 'action', 'cast', 'basic_attack'].includes(pose) ||
    statuses.some((s) =>
      [
        'con_luan_chaos',
        'duong_mon_flight',
        'duong_mon_shell',
        'duong_mon_evade',
      ].includes(s.kind),
    )
  ) {
    sprite.setData('hero-motion-direction', undefined);
    return;
  }
  const direction = motionFacing(fx, fy),
    phase =
      (scene.time.now +
        [...sprite.name].reduce((n, c) => n + c.charCodeAt(0), 0) * 71) %
      2480;
  const acting = ['action', 'cast', 'basic_attack'].includes(pose);
  const last = sprite.getData('hero-finish-last') as
    { basic: string; direction: string; at: number } | undefined;
  let authoredPose: string | undefined;
  if (acting) {
    // Four cardinal renderers retain their skill-specific choreography.
    if (!direction.includes('_') || !clock) return;
    authoredPose = actionBodyPose(clock, basic!);
    sprite.setData('hero-finish-last', {
      basic: basic!,
      direction,
      at: scene.time.now,
    });
  } else if (
    pose === 'idle' &&
    last?.basic === basic &&
    last.direction === direction &&
    scene.time.now - last.at < 85
  ) {
    authoredPose = 'recover';
  } else if (pose === 'idle') {
    if (phase >= 280 && phase < 1000) authoredPose = 'inhale';
    else if (phase >= 1600 && phase < 2320) authoredPose = 'exhale';
  }
  const cel =
    pose === 'walk'
      ? Math.floor(scene.time.now / 115) % 4
      : phase >= 1300 && phase < 1480
        ? 1
        : 0;
  const key = 'hero-motion:' + basic,
    frame = pose + '_' + direction + '_' + cel;
  const finished =
    authoredPose &&
    presentHeroFinish(scene, sprite, basic!, direction, authoredPose);
  if (acting && !finished) return;
  if (!finished)
    sprite
      .stop()
      .setTexture(key, frame)
      .setOrigin(a.pivot[0]!, a.pivot[1]!)
      .setScale(a.scale)
      .setFlip(false, false)
      .setRotation(0);
  sprite
    .setData('hero-motion-active', true)
    .setData('hero-motion-direction', direction)
    .setData('hero-motion-body-width', a.bodyWidth);
  sprite.setData('renovation', {
    id: basic,
    pose,
    direction,
    locomotion: !acting,
    actionFamily: acting ? authoredPose : undefined,
  });
  const seen = (scene.registry.get('hero-motion-observed') ??
    new Set<string>()) as Set<string>;
  seen.add(basic + ':' + (finished ? authoredPose + '_' + direction : frame));
  scene.registry.set('hero-motion-observed', seen);
}
