import Phaser from 'phaser';
import dong from '../../../assets/exports/boss-dong-ta-unified-v1/manifest.json';
import { setArtFilter } from './art-filter.js';
import {
  bossBodyPose,
  bossContactBeat,
  type BossBodyClock,
} from './boss-unified-policy.js';
let overrideEnabled: boolean | undefined;
const profiles = new Map([dong].map((p) => [p.basic, p]));
export function preloadUnifiedBosses(
  scene: Phaser.Scene,
  includes: (id: string) => boolean,
): void {
  for (const p of profiles.values())
    if (includes(p.basic))
      scene.load.atlas(
        p.texture,
        '/assets/' + p.folder + '/body.png',
        '/assets/' + p.folder + '/body.json',
      );
}
export function presentUnifiedBoss(
  scene: Phaser.Scene,
  body: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
  id: string,
  pose: string,
  fx: number,
  fy: number,
  ability: string,
  clock?: BossBodyClock,
): boolean {
  const p = profiles.get(id);
  if (!p) return false;
  overrideEnabled ??=
    new URLSearchParams(location.search).get('bossCoherence') !== '0';
  if (!overrideEnabled) return false;
  const previous = body.getData('boss-unified-clock') as
    { pose: string; ability: string; at: number; beat: 0 | 1 | 2 } | undefined;
  const at =
    clock?.elapsedMs !== undefined
      ? scene.time.now - clock.elapsedMs
      : previous?.pose === pose && previous.ability === ability
        ? previous.at
        : scene.time.now;
  const sector = (Math.round(Math.atan2(fy, fx) / (Math.PI / 4)) + 8) % 8;
  const actionPose = ['action', 'cast', 'basic_attack'].includes(pose);
  const directions = [
    'right',
    'down_right',
    'down',
    'down_left',
    'left',
    'up_left',
    'up',
    'up_right',
  ];
  // Retain the four-facing native encounter choreography; locomotion/reactions gain eight facings.
  const direction = actionPose
    ? Math.abs(fx) > Math.abs(fy)
      ? fx < 0
        ? 'left'
        : 'right'
      : fy < 0
        ? 'up'
        : 'down'
    : directions[sector]!;
  if (!p.directions.includes(direction)) return false; // Internal directional pilot; full delivery requires all8.
  const acting = ['action', 'cast', 'basic_attack'].includes(pose);
  const beat = bossContactBeat(
    clock,
    acting && previous?.pose === pose && previous.ability === ability
      ? previous.beat
      : undefined,
  );
  const sample = bossBodyPose(
    id,
    pose,
    scene.time.now - at,
    scene.time.now,
    ability,
    { ...clock, beat },
  );
  if (!sample) return false;
  const texture = scene.textures.get(p.texture),
    frame = sample + '_' + direction;
  if (!texture.has(frame))
    throw Error('Missing coherent boss cel ' + id + ':' + frame);
  if ('anims' in body) body.anims.stop();
  setArtFilter(texture, Phaser.Textures.FilterMode.LINEAR);
  body
    .setTexture(p.texture, frame)
    .setOrigin(p.pivot[0]!, p.pivot[1]!)
    .setScale(p.scale)
    .setFlip(false, false)
    .setRotation(0);
  body.setData('boss-unified-clock', { pose, ability, at, beat });
  body.setData('renovation-action', {
    ability,
    phase: ['windup', 'release', 'recovery'][beat],
    sourceTexture: p.texture,
    sourceFrame: frame,
  });
  body.setData('renovation', {
    id,
    pose,
    direction,
    locomotion: pose === 'idle' || pose === 'walk',
  });
  return true;
}
