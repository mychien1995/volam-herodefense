import Phaser from 'phaser';
/** Canvas font density must cover world zoom as well as display pixel density. */
export function readableWorldText(
  text: Phaser.GameObjects.Text,
): Phaser.GameObjects.Text {
  const resolution = Math.min(
    6,
    Math.max(
      2,
      Math.ceil(
        text.scene.cameras.main.zoom * (globalThis.devicePixelRatio || 1),
      ),
    ),
  );
  if (text.style.resolution !== resolution) text.setResolution(resolution);
  text.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return text;
}
