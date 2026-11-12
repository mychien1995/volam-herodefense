import Phaser from 'phaser';
import { queueArtPack } from './queue-art-pack.js';
import type { ArenaCreepArt, ArenaCreepManifest } from './arena-creeps.js';

export interface DesertManifest extends ArenaCreepManifest {
  assets: Array<ArenaCreepArt & { archetypeId: string }>;
  scenery: Array<{
    id: string;
    size: number[];
    pivot: number[];
    layer: string;
  }>;
}
export function preloadDesertArt(scene: Phaser.Scene): void {
  queueArtPack(scene, 'desert_pack', '/assets/desert/pack.json');
  scene.load.image('desert_terrain', '/assets/desert/terrain.png');
  scene.load.atlas(
    'desert_scenery',
    '/assets/desert/scenery.png',
    '/assets/desert/scenery.json',
  );
  scene.load.tilemapTiledJSON('creep_desert', '/assets/creep_desert.tmj');
}
export function desertCreepArt(
  scene: Phaser.Scene,
  archetype: string | undefined,
  zone: string,
): ArenaCreepArt | undefined {
  if (!zone.startsWith('desert_')) return undefined;
  const manifest = scene.cache.json.get('desert_manifest') as DesertManifest;
  const entry = manifest.assets.find((a) => a.archetypeId === archetype);
  if (!entry)
    throw new Error(`Unknown authoritative desert creep: ${archetype}`);
  return entry;
}
export function registerDesertArt(
  scene: Phaser.Scene,
  manifestKey = 'desert_manifest',
): void {
  const manifest = scene.cache.json.get(manifestKey) as DesertManifest;
  for (const asset of manifest.assets) {
    scene.textures.get(asset.id).setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const anim of asset.animations) {
      for (const frame of anim.frames)
        if (!scene.textures.get(asset.id).has(frame))
          throw new Error(`Missing desert frame: ${asset.id}/${frame}`);
      const key = `${asset.id}:${anim.state}:${anim.direction}`;
      if (!scene.anims.exists(key))
        scene.anims.create({
          key,
          // Phaser 4.2.1 uses explicit frame durations in place of msPerFrame.
          frames: anim.frames.map((frame, i) => ({
            key: asset.id,
            frame,
            duration: anim.durations![i]!,
          })),
          frameRate: anim.frameRate,
          repeat: anim.repeat,
        });
    }
  }
}
