import Phaser from 'phaser';
export const actorSheets = [
  { id: 'hero_cai_bang', folder: 'characters' },
  { id: 'creep_outlaw', folder: 'enemies' },
] as const;
export const poses = [
  'idle',
  'walk',
  'basic_attack',
  'cast',
  'hurt',
  'death',
] as const;
export const facings = ['down', 'left', 'right', 'up'] as const;
export function facing(x: number, y: number): string {
  return Math.abs(x) >= Math.abs(y)
    ? x < 0
      ? 'left'
      : 'right'
    : y < 0
      ? 'up'
      : 'down';
}
export function preloadArt(scene: Phaser.Scene): void {
  for (const asset of actorSheets)
    scene.load.atlas(
      asset.id,
      `/assets/${asset.folder}/${asset.id}.png`,
      `/assets/${asset.folder}/${asset.id}.json`,
    );
  scene.load.json('art_manifest', '/assets/manifest.json');
  scene.load.tilemapTiledJSON('arena', '/assets/arena.tmj');
  scene.load.image('tree', '/assets/scenery/tree.png');
  scene.load.spritesheet('terrain', '/assets/tilesets/terrain.png', {
    frameWidth: 32,
    frameHeight: 32,
  });
  scene.load.spritesheet('fire', '/assets/effects/fire.png', {
    frameWidth: 32,
    frameHeight: 32,
  });
}
interface Manifest {
  assets: Array<{
    id: string;
    status: string;
    animations?: Array<{
      state: string;
      direction: string;
      frames: string[];
      frameRate: number;
      repeat: number;
    }>;
  }>;
}
export function registerArt(scene: Phaser.Scene): void {
  const manifest = scene.cache.json.get('art_manifest') as Manifest;
  for (const asset of actorSheets) {
    const entry = manifest.assets.find((item) => item.id === asset.id);
    if (
      !entry?.animations?.length ||
      !['placeholder', 'prototype', 'approved'].includes(entry.status)
    )
      throw new Error(`Invalid art manifest for ${asset.id}`);
    scene.textures.get(asset.id).setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const anim of entry.animations) {
      for (const frame of anim.frames)
        if (!scene.textures.get(asset.id).has(frame))
          throw new Error(`Missing ${asset.id}/${frame}`);
      scene.anims.create({
        key: `${asset.id}:${anim.state}:${anim.direction}`,
        frames: anim.frames.map((frame) => ({ key: asset.id, frame })),
        frameRate: anim.frameRate,
        repeat: anim.repeat,
      });
    }
  }
  for (const id of ['tree', 'terrain', 'fire'])
    scene.textures.get(id).setFilter(Phaser.Textures.FilterMode.NEAREST);
  scene.anims.create({
    key: 'fire_orb',
    frames: scene.anims.generateFrameNumbers('fire', { start: 0, end: 3 }),
    frameRate: 12,
    repeat: -1,
  });
  scene.anims.create({
    key: 'fire_impact',
    frames: scene.anims.generateFrameNumbers('fire', { start: 0, end: 3 }),
    frameRate: 14,
    repeat: 0,
  });
}
