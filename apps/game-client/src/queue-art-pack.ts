import type Phaser from 'phaser';

/** Requeue missing children when the manifest itself survived a failed load. */
export function queueArtPack(scene: Phaser.Scene, key: string, url: string) {
  const manifest = scene.cache.json.get(key);
  if (manifest) scene.load.addPack(manifest);
  else scene.load.pack(key, url);
}
