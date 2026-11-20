import { materialPattern } from './world-depth-material.js';
import Phaser from 'phaser';
import materialsUrl from '../../../assets/source/renovation-v2/raw/arena-materials.png?url';

export function preloadDepthTerrain(scene: Phaser.Scene): void {
  scene.load.image('world-depth:authored-materials', materialsUrl);
}
const footprint = (x: number, y: number) =>
  Math.max(
    80 - Math.abs(x - 800),
    80 - Math.abs(y - 616),
    288 - Math.hypot(x - 800, y - 616),
  );

function joinError(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  step = 512,
): { peak: number; mean: number } {
  let peak = 0,
    total = 0,
    samples = 0;
  for (let x = step; x < width; x += step) {
    const strip = ctx.getImageData(x - 1, 0, 2, height).data;
    for (let y = 8; y < height - 8; y += 8) {
      if (Math.abs(footprint(x / 2, y / 2)) < 5) continue;
      const i = y * 8;
      for (let c = 0; c < 3; c++) {
        const delta = Math.abs(strip[i + c]! - strip[i + 4 + c]!);
        peak = Math.max(peak, delta);
        total += delta;
        samples++;
      }
    }
  }
  for (let y = step; y < height; y += step) {
    const strip = ctx.getImageData(0, y - 1, width, 2).data;
    for (let x = 8; x < width - 8; x += 8) {
      if (Math.abs(footprint(x / 2, y / 2)) < 5) continue;
      const i = x * 4;
      for (let c = 0; c < 3; c++) {
        const delta = Math.abs(strip[i + c]! - strip[i + width * 4 + c]!);
        peak = Math.max(peak, delta);
        total += delta;
        samples++;
      }
    }
  }
  return { peak, mean: total / samples };
}

/** Cached world materials/light masks only. Authority retains the exact original map footprint. */
export function createDepthTerrain(
  scene: Phaser.Scene,
  ownTexture: (key: string) => void,
): Phaser.GameObjects.Image[] {
  const ground = scene.children.getByName(
    'arena:ground',
  ) as Phaser.GameObjects.Image;
  if (!ground) return [];
  const width = ground.displayWidth,
    height = ground.displayHeight;
  const keys = [
    'world-depth:continuous-ground',
    'world-depth:terrain-edge',
    'world-depth:terrain-shade',
    'world-depth:sunlight',
  ];
  if (!scene.textures.exists(keys[0]!)) {
    const materials = scene.textures
      .get('world-depth:authored-materials')
      .getSourceImage() as HTMLImageElement;
    const tile = Math.floor(materials.width / 2);
    const grassPattern = materialPattern(materials, 0, 0, tile);
    const stonePattern = materialPattern(materials, 0, tile, tile);
    const nativeWidth = ground.frame.realWidth,
      nativeHeight = ground.frame.realHeight;
    const base = scene.textures.createCanvas(
      keys[0]!,
      nativeWidth,
      nativeHeight,
    )!;
    const ctx = base.context;
    ctx.fillStyle = ctx.createPattern(grassPattern, 'repeat')!;
    ctx.fillRect(0, 0, nativeWidth, nativeHeight);
    ctx.save();
    ctx.beginPath();
    ctx.rect(1440, 0, 320, nativeHeight);
    ctx.rect(0, 1072, nativeWidth, 320);
    ctx.moveTo(2176, 1232);
    ctx.arc(1600, 1232, 576, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = ctx.createPattern(stonePattern, 'repeat')!;
    ctx.fillRect(0, 0, nativeWidth, nativeHeight);
    ctx.restore();
    base.refresh();
    const original = document.createElement('canvas');
    original.width = nativeWidth;
    original.height = nativeHeight;
    original
      .getContext('2d')!
      .drawImage(ground.frame.source.image as CanvasImageSource, 0, 0);
    const originalJoins = joinError(
      original.getContext('2d')!,
      nativeWidth,
      nativeHeight,
    );
    const correctedJoins = joinError(ctx, nativeWidth, nativeHeight, 448);
    scene.registry.set('world-depth:ground-joins', {
      originalMaxRgbJump: originalJoins.peak,
      originalMeanRgbJump: originalJoins.mean,
      correctedMaxRgbJump: correctedJoins.peak,
      correctedMeanRgbJump: correctedJoins.mean,
      sharedPavingCoordinates: true,
      materialPeriod: 448,
      mirrored: false,
    });

    const mw = 800,
      mh = Math.round((mw * height) / width);
    const edgeMask = document.createElement('canvas');
    edgeMask.width = mw;
    edgeMask.height = mh;
    const edgeCtx = edgeMask.getContext('2d')!,
      edgePixels = edgeCtx.createImageData(mw, mh);
    const shade = scene.textures.createCanvas(keys[2]!, mw, mh)!;
    const shadePixels = shade.context.createImageData(mw, mh);
    const sun = scene.textures.createCanvas(keys[3]!, mw, mh)!;
    const sunPixels = sun.context.createImageData(mw, mh);
    for (let y = 0; y < mh; y++)
      for (let x = 0; x < mw; x++) {
        const wx = ((x + 0.5) * width) / mw,
          wy = ((y + 0.5) * height) / mh;
        const signed = footprint(wx, wy),
          grass = signed < 0;
        const irregular =
          2.1 * Math.sin(wx * 0.48) +
          1.5 * Math.sin(wy * 0.37) +
          1.3 * Math.sin((wx + wy) * 0.19);
        const edge =
          signed > -1 && signed < 10
            ? Math.max(0, Math.min(1, (5 + irregular - signed) / 6))
            : 0;
        const i = (y * mw + x) * 4;
        edgePixels.data[i] =
          edgePixels.data[i + 1] =
          edgePixels.data[i + 2] =
            255;
        edgePixels.data[i + 3] = Math.round(edge * 220);
        // A fixed overhead gobo: organic sun windows and soft intervening shade, anchored in world space.
        const along = wx * 0.9 + wy * 0.44,
          across = wx * 0.44 - wy * 0.9;
        const broad =
          0.5 +
          0.23 * Math.sin(across * 0.021 + Math.sin(along * 0.008)) +
          0.16 * Math.sin(across * 0.048 - along * 0.014) +
          0.11 * Math.sin(along * 0.047 + across * 0.075);
        const opening = Math.max(0, Math.min(1, (broad - 0.32) / 0.4));
        const mottled =
          0.65 + 0.35 * Math.sin(along * 0.031 + Math.sin(across * 0.029));
        const light = opening * mottled;
        shadePixels.data[i] = grass ? 89 : 137;
        shadePixels.data[i + 1] = grass ? 118 : 122;
        shadePixels.data[i + 2] = grass ? 55 : 98;
        shadePixels.data[i + 3] = Math.round(
          (grass ? 28 : 9) + (1 - light) * 90,
        );
        sunPixels.data[i] = 255;
        sunPixels.data[i + 1] = 223;
        sunPixels.data[i + 2] = 161;
        sunPixels.data[i + 3] = Math.round(light * (grass ? 48 : 42));
      }
    edgeCtx.putImageData(edgePixels, 0, 0);
    shade.context.putImageData(shadePixels, 0, 0);
    shade.refresh();
    sun.context.putImageData(sunPixels, 0, 0);
    sun.refresh();
    const edge = scene.textures.createCanvas(
      keys[1]!,
      nativeWidth,
      nativeHeight,
    )!;
    edge.context.fillStyle = edge.context.createPattern(
      grassPattern,
      'repeat',
    )!;
    edge.context.fillRect(0, 0, nativeWidth, nativeHeight);
    edge.context.globalCompositeOperation = 'destination-in';
    edge.context.drawImage(edgeMask, 0, 0, nativeWidth, nativeHeight);
    edge.refresh();
    for (const key of keys) ownTexture(key);
  }
  return keys.map((key, i) =>
    scene.add
      .image(ground.x, ground.y, key)
      .setDisplaySize(width, height)
      .setDepth(-9999 + i)
      .setName('world-depth:terrain')
      .setBlendMode(
        i === 2
          ? Phaser.BlendModes.MULTIPLY
          : i === 3
            ? Phaser.BlendModes.ADD
            : Phaser.BlendModes.NORMAL,
      ),
  );
}
