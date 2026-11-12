import type Phaser from 'phaser';

/** Phaser 4.2.1 uploads the raster again even when setFilter is a no-op. */
export function setArtFilter(
  texture: Phaser.Textures.Texture,
  mode: Phaser.Textures.FilterMode,
): void {
  if (
    [...texture.source, ...texture.dataSource].some(
      (source: Phaser.Textures.TextureSource) =>
        source.scaleMode !== mode ||
        source.glTexture?.minFilter !== source.glTexture?.magFilter,
    )
  )
    texture.setFilter(mode);
}
