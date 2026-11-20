import Phaser from 'phaser';
import dong from '../../../assets/exports/boss-dong-ta-unified-v1/manifest.json';
import tay from '../../../assets/exports/boss-tay-doc-unified-v1/manifest.json';
import cap from '../../../assets/exports/boss-tay-doc-cap-mo-unified-v1/manifest.json';
import nam from '../../../assets/exports/boss-nam-de-unified-v1/manifest.json';
import bac from '../../../assets/exports/boss-bac-cai-unified-v1/manifest.json';
import vp1 from '../../../assets/exports/boss-vuong-trung-duong-p1-unified-v1/manifest.json';
import vp2 from '../../../assets/exports/boss-vuong-trung-duong-p2-unified-v1/manifest.json';
import chu from '../../../assets/exports/boss-chu-ba-thong-unified-v1/manifest.json';
import hong from '../../../assets/exports/boss-hoan-nhan-hong-liet-unified-v1/manifest.json';
import kim from '../../../assets/exports/boss-kim-luan-unified-v1/manifest.json';
import ly from '../../../assets/exports/boss-ly-mac-sau-unified-v1/manifest.json';
import { setArtFilter } from './art-filter.js';
import {
  bossBodyPose,
  bossNativePose,
  bossContactBeat,
  type BossBodyClock,
} from './boss-unified-policy.js';
let overrideEnabled: boolean | undefined;
const profiles = new Map(
  [dong, tay, cap, nam, bac, vp1, vp2, chu, hong, kim, ly].map((p) => [
    p.basic,
    p,
  ]),
);
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
  pose = bossNativePose(id, pose);
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
  const direction =
    id === 'bac_cai' && /^(drink|sleep)_/.test(ability)
      ? 'down'
      : actionPose
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
