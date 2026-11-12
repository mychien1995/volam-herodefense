import Phaser from 'phaser';
import { setArtFilter } from './art-filter.js';

/** Shared PNG/hash-atlas presentation contract; contains no combat state. */
export interface RasterAnimation {
  name: string;
  frames: string[];
  frameRate: number;
  repeat: number;
  direction: string;
  origin: [number, number];
  frameDimensions: [number, number];
  stage: string;
  placement: string;
  effectPlacementOffset: [number, number];
  frameDurationsMs?: number[];
}
export interface RasterComponent {
  id: string;
  skillId: string;
  kind: 'character' | 'vfx';
  sheet: string;
  atlas: string;
  origin: [number, number];
  frameDimensions: [number, number];
  animations: RasterAnimation[];
}
export const rasterAnimationKey = (asset: string, tag: string): string =>
  `skill:${asset}:${tag}`;
export const rasterAssetUrl = (path: string): string =>
  '/' + path.replace('assets/exports/', 'assets/');

export function preloadRasterAnimations(
  scene: Phaser.Scene,
  assets: readonly RasterComponent[],
): void {
  for (const asset of assets)
    scene.load.atlas(
      asset.id,
      rasterAssetUrl(asset.sheet),
      rasterAssetUrl(asset.atlas),
    );
}
export function registerRasterAnimations(
  scene: Phaser.Scene,
  assets: readonly RasterComponent[],
): void {
  const keys = new Set<string>();
  for (const asset of assets) {
    if (!scene.textures.exists(asset.id))
      throw new Error(`Required skill texture missing: ${asset.id}`);
    setArtFilter(
      scene.textures.get(asset.id),
      Phaser.Textures.FilterMode.NEAREST,
    );
    for (const tag of asset.animations) {
      const key = rasterAnimationKey(asset.id, tag.name);
      if (keys.has(key)) throw new Error(`Duplicate skill animation: ${key}`);
      keys.add(key);
      for (const frame of tag.frames)
        if (!scene.textures.get(asset.id).has(frame))
          throw new Error(`Missing skill frame ${asset.id}:${frame}`);
      if (!scene.anims.exists(key))
        scene.anims.create({
          key,
          // Installed Phaser4.2.1 uses frame.duration as the absolute delay
          // (Animation.getFirstTick/updateNextTick), unlike older Phaser3 docs.
          frames: tag.frames.map((frame, i) => ({
            key: asset.id,
            frame,
            ...(tag.frameDurationsMs
              ? { duration: tag.frameDurationsMs[i]! }
              : {}),
          })),
          frameRate: tag.frameDurationsMs ? 1000 : tag.frameRate,
          repeat: tag.repeat,
        });
    }
  }
}
