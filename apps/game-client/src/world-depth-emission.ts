import Phaser from 'phaser';
type Image = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;

/** One tiny readback per retained cel, cached as coordinates, never one GPU texture per cel. */
export class DepthEmissionPoints {
  private points = new Map<
    string,
    { x: number; y: number; strength: number }
  >();
  private scratch = document.createElement('canvas');
  private matrix = new Phaser.GameObjects.Components.TransformMatrix();
  constructor() {
    this.scratch.width = this.scratch.height = 48;
  }
  world(
    source: Image,
    tone = 'warm',
  ): { x: number; y: number; strength: number } {
    const frame = source.frame,
      key = source.texture.key + ':' + frame.name + ':' + tone;
    let point = this.points.get(key);
    if (!point) {
      const ctx = this.scratch.getContext('2d', { willReadFrequently: true })!;
      ctx.clearRect(0, 0, 48, 48);
      ctx.drawImage(
        frame.source.image as CanvasImageSource,
        frame.cutX,
        frame.cutY,
        frame.cutWidth,
        frame.cutHeight,
        0,
        0,
        48,
        48,
      );
      const data = ctx.getImageData(0, 0, 48, 48).data;
      let peak = -1,
        px = 24,
        py = 24;
      // Find a local bright warm cluster, avoiding transparent centers of rings and grey lamp bases.
      for (let y = 2; y < 46; y += 2)
        for (let x = 2; x < 46; x += 2) {
          let value = 0;
          for (let dy = -2; dy <= 2; dy++)
            for (let dx = -2; dx <= 2; dx++) {
              const i = ((y + dy) * 48 + x + dx) * 4;
              const r = data[i]!,
                g = data[i + 1]!,
                b = data[i + 2]!;
              if (
                tone === 'warm'
                  ? r > 145 && g > 65 && r > b * 1.18
                  : Math.max(r, g, b) > 165 &&
                    (tone === 'poison'
                      ? g > r * 1.02 || b > g * 1.05
                      : b > r * 0.95 || Math.min(r, g, b) > 205)
              )
                value += ((r + g + b * 0.3) * data[i + 3]!) / 255;
            }
          if (value > peak) {
            peak = value;
            px = x;
            py = y;
          }
        }
      point = {
        strength: Math.min(1, Math.max(0, peak) / 7000),
        x: frame.x + ((px + 0.5) / 48) * frame.cutWidth,
        y: frame.y + ((py + 0.5) / 48) * frame.cutHeight,
      };
      if (this.points.size >= 1024)
        this.points.delete(this.points.keys().next().value!);
      this.points.set(key, point);
    }
    const x =
      (source.flipX ? frame.realWidth - point.x : point.x) -
      source.displayOriginX;
    const y =
      (source.flipY ? frame.realHeight - point.y : point.y) -
      source.displayOriginY;
    const world = source
      .getWorldTransformMatrix(this.matrix)
      .transformPoint(x, y);
    return { x: world.x, y: world.y, strength: point.strength };
  }
  clear(): void {
    this.points.clear();
  }
}
