import Phaser from 'phaser';
import { loiDai } from '@volam/game-core';
import sparks from '../../../assets/exports/loi-dai/fireworks.png?url';
import victory from '../../../assets/exports/loi-dai/manifest.json';
import manifest from '../../../assets/exports/loi-dai-v2/manifest.json';

const scenery = import.meta.glob<string>(
  '../../../assets/exports/loi-dai-v2/*.png',
  { eager: true, import: 'default', query: '?url' },
);
const key = (id: string) => 'loi-dai:' + id;
const fireworkKey = key('fireworks');
const burstKey = key('victory');

export function preloadLoiDai(scene: Phaser.Scene): void {
  for (const [path, url] of Object.entries(scenery)) {
    const id = path.slice(path.lastIndexOf('/') + 1, -4);
    scene.load.image(key(id), url);
  }
  scene.load.spritesheet(fireworkKey, sparks, {
    frameWidth: victory.fireworks.frameWidth,
    frameHeight: victory.fireworks.frameHeight,
  });
}

export function fitLoiDaiCamera(scene: Phaser.Scene): void {
  const camera = scene.cameras.main;
  camera.setZoom(
    Math.min(
      scene.scale.width / loiDai.width,
      scene.scale.height / loiDai.height,
    ),
  );
  camera.centerOn(loiDai.width / 2, loiDai.height / 2);
}

export function drawLoiDai(scene: Phaser.Scene): void {
  // Leave space for the visible courtyards outside the playfield on wide screens.
  scene.cameras.main.removeBounds();
  scene.add
    .tileSprite(
      loiDai.width / 2,
      loiDai.height / 2,
      loiDai.width * 4,
      loiDai.height * 4,
      key('paving'),
    )
    .setTileScale(1 / manifest.density)
    .setDepth(-120);
  for (const { id, x, y, depth, width, height } of manifest.layers)
    scene.add
      .image(x, y, key(id))
      .setName(key(id))
      .setData(
        'world-depth-prop',
        !['ground', 'deck', 'west-overscan', 'east-overscan'].includes(id),
      )
      .setOrigin(0)
      .setDisplaySize(width / manifest.density, height / manifest.density)
      .setDepth(depth);
  fitLoiDaiCamera(scene);
}

export function celebrateLoiDai(
  scene: Phaser.Scene,
  x: number,
  y: number,
): void {
  if (!scene.anims.exists(burstKey))
    scene.anims.create({
      key: burstKey,
      frames: scene.anims.generateFrameNumbers(fireworkKey, {
        start: 0,
        end: victory.fireworks.frameCount - 1,
      }),
      frameRate: victory.fireworks.fps,
    });
  const sprite = scene.add
    .sprite(x, y - 38, fireworkKey)
    .setName(burstKey)
    .setOrigin(victory.fireworks.originX, victory.fireworks.originY)
    .setDepth(1000);
  sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () =>
    sprite.destroy(),
  );
  sprite.play(burstKey);
}
