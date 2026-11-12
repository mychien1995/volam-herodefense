import Phaser from 'phaser';
import { setArtFilter } from './art-filter.js';
import { queueArtPack } from './queue-art-pack.js';
import type { ForestCreepManifest } from './forest-creeps.js';
import { forestCombatBody, forestCombatEffect } from './m3d-native-art.js';

export function preloadForestCreepArt(scene: Phaser.Scene): void {
  queueArtPack(scene, 'forest_creep_pack', '/assets/forest_creep_review/pack.json');
}
export function registerForestCreepArt(scene: Phaser.Scene): void {
  const manifest = scene.cache.json.get(
    'forest_creeps_manifest',
  ) as ForestCreepManifest;
  const register = (
    key: string,
    texture: string,
    frames: string[],
    durations: number[],
    repeat: number,
  ) => {
    if (scene.anims.exists(key)) return;
    setArtFilter(
      scene.textures.get(texture),
      Phaser.Textures.FilterMode.NEAREST,
    );
    for (const frame of frames)
      if (!scene.textures.get(texture).has(frame))
        throw Error(`Missing forest frame ${texture}/${frame}`);
    scene.anims.create({
      key,
      frames: frames.map((frame, i) => ({
        key: texture,
        frame,
        duration: durations[i]!,
      })),
      frameRate: 1000,
      repeat,
    });
  };
  for (const a of manifest.assets)
    for (const anim of a.animations) {
      const key = `${a.id}:${anim.state}:${anim.direction}`;
      register(key, a.id, anim.frames, anim.durations!, anim.repeat);
      const native = forestCombatBody(scene, a.id, anim.state);
      if (native)
        register(
          `${native}:${anim.state}:${anim.direction}`,
          native,
          anim.frames,
          anim.durations!,
          anim.repeat,
        );
    }
  for (const fx of manifest.effects) {
    register(fx.id, fx.texture!, fx.frames, fx.durations!, fx.repeat ?? 0);
    const native = forestCombatEffect(scene, fx.id);
    if (native)
      register(
        'native:' + fx.id,
        native,
        fx.frames,
        fx.durations!,
        fx.repeat ?? 0,
      );
  }
}
