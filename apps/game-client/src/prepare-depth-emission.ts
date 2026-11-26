import type Phaser from 'phaser';
import { DepthEmissionPoints } from './world-depth-emission.js';
import { depthLightStyle } from './world-depth-light-policy.js';
/** Run while the loader still owns the loading screen, using the exact runtime Canvas sampling. */
export function prepareDepthEmission(scene: Phaser.Scene): void {
  const sampler = new DepthEmissionPoints();
  for (const texture of Object.values(scene.textures.list)) {
    const names = texture.getFrameNames();
    for (const name of names.length ? names : ['__BASE']) {
      const frame = texture.get(name);
      const source = {
        texture,
        frame,
        name: texture.key,
      } as Phaser.GameObjects.Image;
      if (depthLightStyle(scene, source)) sampler.prepare(frame);
    }
  }
  sampler.clear();
}
