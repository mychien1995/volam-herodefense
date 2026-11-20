import type Phaser from 'phaser';

export interface CameraSize {
  width: number;
  height: number;
}
export type CameraFraming = 'native' | 'cover' | 'overview';

/** Screen pixels / world unit. HUD visibility never participates in this calculation. */
export function nativeGameplayZoom(viewport: CameraSize): number {
  return viewport.width >= 960 && viewport.height >= 600 ? 2 : 1;
}

export function cameraZoom(
  viewport: CameraSize,
  world: CameraSize,
  framing: CameraFraming = 'native',
  maxZoom = Infinity,
): number {
  if (framing === 'native') return nativeGameplayZoom(viewport);
  const x = viewport.width / world.width,
    y = viewport.height / world.height;
  return framing === 'cover'
    ? Math.max(nativeGameplayZoom(viewport), x, y)
    : Math.min(x, y, maxZoom);
}

/** One full viewport, fixed overhead perspective. Actor follow remains owned by ArenaScene. */
export function frameWorld(
  scene: Phaser.Scene,
  world: CameraSize,
  framing: CameraFraming,
  options: { bounds?: boolean; center?: boolean; maxZoom?: number } = {},
): void {
  const camera = scene.cameras.main;
  camera.setViewport(0, 0, scene.scale.width, scene.scale.height);
  camera.setRotation(0);
  camera.setZoom(cameraZoom(scene.scale, world, framing, options.maxZoom));
  if (options.bounds) camera.setBounds(0, 0, world.width, world.height);
  if (options.center) camera.centerOn(world.width / 2, world.height / 2);
}
