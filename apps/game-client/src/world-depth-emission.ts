import { emissionPoint, type EmissionPoint } from './pixel-analysis.js';
import type Phaser from 'phaser';
type Image = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;

/** One tiny readback per retained cel, cached as coordinates, never one GPU texture per cel. */
export class DepthEmissionPoints {
  // Frame identity invalidates replacements; weak keys release unloaded atlases.
  private static readonly points = new WeakMap<
    Phaser.Textures.Frame,
    Map<string, EmissionPoint>
  >();
  private scratch: HTMLCanvasElement | undefined;
  private matrix: Phaser.GameObjects.Components.TransformMatrix | undefined;
  private sample(frame: Phaser.Textures.Frame): Uint8ClampedArray {
    const canvas = (this.scratch ??= document.createElement('canvas'));
    if (canvas.width !== 48 || canvas.height !== 48)
      canvas.width = canvas.height = 48;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
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
    return ctx.getImageData(0, 0, 48, 48).data;
  }
  prepare(frame: Phaser.Textures.Frame): void {
    if (DepthEmissionPoints.points.has(frame)) return;
    const data = this.sample(frame);
    DepthEmissionPoints.points.set(
      frame,
      new Map(
        ['warm', 'cool', 'poison'].map((tone) => [
          tone,
          emissionPoint(data, tone),
        ]),
      ),
    );
  }
  world(
    source: Image,
    tone = 'warm',
  ): { x: number; y: number; strength: number } {
    const frame = source.frame;
    let tones = DepthEmissionPoints.points.get(frame);
    let point = tones?.get(tone);
    if (!point) {
      point = emissionPoint(this.sample(frame), tone);
      if (!tones) DepthEmissionPoints.points.set(frame, (tones = new Map()));
      tones.set(tone, point);
    }
    const x =
      (source.flipX
        ? frame.realWidth - (frame.x + point.x * frame.cutWidth)
        : frame.x + point.x * frame.cutWidth) - source.displayOriginX;
    const y =
      (source.flipY
        ? frame.realHeight - (frame.y + point.y * frame.cutHeight)
        : frame.y + point.y * frame.cutHeight) - source.displayOriginY;
    const matrix = source.getWorldTransformMatrix(this.matrix);
    this.matrix = matrix;
    const world = matrix.transformPoint(x, y);
    return { x: world.x, y: world.y, strength: point.strength };
  }
  clear(): void {
    this.scratch = undefined;
  }
}
