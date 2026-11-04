import type Phaser from 'phaser';

// Presentation only: no resampling, geometry, alpha, collision or shader changes.
const foliageTint = 0xc7d2c1;
export function applyArenaPalette(
  scene: Phaser.Scene,
  polished: boolean,
): void {
  for (const object of scene.children.list) {
    const image = object as Phaser.GameObjects.Image;
    if (!image.texture || !image.setTint) continue;
    const texture = image.texture.key;
    const frame = String(image.frame.name);
    const tint =
      texture === 'arena_ground_art01'
        ? 0xe5e8df
        : texture.startsWith('art01_tree_') ||
            (texture === 'arena_world_art01' &&
              ['tree_jade', 'tree_blossom', 'bamboo'].includes(frame))
          ? foliageTint
          : texture === 'arena_garden_art01' && frame === 'flower_rocks'
            ? 0xd2daca
            : undefined;
    if (tint !== undefined) {
      if (polished) image.setTint(tint);
      else image.clearTint();
    }
  }
}

export function applyNameLabel(
  label: Phaser.GameObjects.Text,
  polished: boolean,
): void {
  label.setFontFamily(
    polished ? 'Segoe UI, Tahoma, Arial, sans-serif' : 'monospace',
  );
  // Rasterize text at its actual 2x desktop display size. This does not upscale sprites.
  label.setResolution(polished ? 2 : 1);
  label.setBackgroundColor(polished ? '#15211e' : '#283e3c');
}
