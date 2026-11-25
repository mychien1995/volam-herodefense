import Phaser from 'phaser';

/** Animate only the original flame pixels inside each authored brazier. */
export function createTorchMotion(scene: Phaser.Scene) {
  const boxes: Record<string, [number, number, number, number]> = {
    watchtower: [146, 116, 50, 43],
    'war-banner': [185, 308, 56, 54],
  };
  const textures: string[] = [];
  const torches: {
    source: Phaser.GameObjects.Image;
    image: Phaser.GameObjects.Image;
    box: number[];
    keys: string[];
    phase: number;
    flamePixels: number;
  }[] = [];
  for (const kind of Object.keys(boxes)) {
    const [x, y, w, h] = boxes[kind]!;
    const source = scene.textures
      .get('m4d-prop-' + kind)
      .getSourceImage() as HTMLImageElement;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(source, x!, y!, w!, h!, 0, 0, w!, h!);
    const raw = ctx.getImageData(0, 0, w!, h!).data;
    const keys: string[] = [];
    let flamePixels = 0;
    for (let f = 0; f < 8; f++) {
      const key = `m4d:torch:${kind}:${f}`;
      const t = scene.textures.createCanvas(key, w!, h!)!;
      const pixels = t.context.createImageData(w!, h!);
      for (let py = 2; py < h! - 2; py++)
        for (let px = 2; px < w! - 2; px++) {
          const i = (py * w! + px) * 4;
          if (
            raw[i]! < 130 ||
            raw[i]! < raw[i + 1]! * 1.14 ||
            raw[i + 1]! < raw[i + 2]! * 1.35
          )
            continue;
          if (f === 0) flamePixels++;
          const dx = Math.round(Math.sin(py * 0.22 + (f * Math.PI) / 4));
          const from = (py * w! + px + dx) * 4;
          const light = 1 + Math.sin((f * Math.PI) / 4 + py * 0.12) * 0.09;
          for (let channel = 0; channel < 3; channel++)
            pixels.data[i + channel] = Math.min(
              255,
              raw[from + channel]! * light,
            );
          pixels.data[i + 3] = raw[i + 3]!;
        }
      t.context.putImageData(pixels, 0, 0);
      t.refresh();
      keys.push(key);
      textures.push(key);
    }
    const props = scene.children.list.filter((p) =>
      p.name.startsWith('m4d:prop:' + kind + ':'),
    ) as Phaser.GameObjects.Image[];
    for (const [index, p] of props.entries()) {
      const image = scene.add
        .image(0, 0, keys[0]!)
        .setName('m4d:ambient:torch');
      torches.push({
        source: p,
        image,
        box: [x!, y!, w!, h!],
        keys,
        phase: index * 3,
        flamePixels,
      });
    }
  }
  return {
    count: torches.length,
    update(time: number) {
      for (const t of torches) {
        const [x, y, w, h] = t.box;
        t.image
          .setTexture(t.keys[(Math.floor(time / 110) + t.phase) % 8]!)
          .setPosition(
            t.source.x +
              (x! + w! / 2 - t.source.displayOriginX) * t.source.scaleX,
            t.source.y +
              (y! + h! / 2 - t.source.displayOriginY) * t.source.scaleY,
          )
          .setScale(t.source.scaleX, t.source.scaleY)
          .setDepth(t.source.depth + 0.01)
          .setVisible(t.source.visible)
          .setAlpha(t.source.alpha * 0.9);
      }
    },
    inspect: () =>
      torches.map((t) => ({
        source: t.source.name,
        x: t.image.x,
        y: t.image.y,
        frame: t.image.texture.key,
        flamePixels: t.flamePixels,
      })),
    destroy() {
      for (const t of torches) t.image.destroy();
      for (const key of textures) scene.textures.remove(key);
    },
  };
}
