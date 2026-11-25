import { createTorchMotion } from './m4d-torch-motion.js';
import Phaser from 'phaser';
import { arena, type ArenaId } from '@volam/game-data';

/** Mechanical masks and UV flow of authored raster pixels, never a moving floor. */
export function createArenaAmbient(scene: Phaser.Scene, id: ArenaId): void {
  const ground = scene.children.getByName(
    'arena:ground',
  ) as Phaser.GameObjects.Image;
  const source = ground.texture.getSourceImage() as HTMLImageElement;
  const nodes: Phaser.GameObjects.Image[] = [];
  const owned: string[] = [];
  let flow: Phaser.GameObjects.Image | undefined;
  let frames: string[] = [];
  let waterPixels = 0;
  {
    const w = source.width,
      h = source.height;
    const scratch = document.createElement('canvas');
    scratch.width = w;
    scratch.height = h;
    const c = scratch.getContext('2d', { willReadFrequently: true })!;
    c.drawImage(source, 0, 0);
    const input = c.getImageData(0, 0, w, h).data;
    const mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = input[i]!,
          g = input[i + 1]!,
          b = input[i + 2]!;
        // Teal/blue water only: exclude grey paving, wood, pink blooms and green leaves.
        const u = x / w,
          v = y / h;
        // Xiangyang streams lie around the outer rim; exclude the blue plaza stones.
        const stream =
          id !== 'tuong_duong' ||
          ((u < 0.31 || u > 0.72) && (v < 0.29 || v > 0.73));
        const wx = ground.x - ground.displayWidth / 2 + x * ground.scaleX;
        const wy = ground.y - ground.displayHeight / 2 + y * ground.scaleY;
        const dx = wx - 800,
          dy = wy - 535;
        const pond =
          id !== 'tu_hien_trang' ||
          (Math.abs(dx) > 90 &&
            Math.abs(dy) > 80 &&
            (dx / 305) ** 2 + (dy / 256) ** 2 > 1.02 &&
            (dx / 553) ** 2 + (dy / 424) ** 2 < 0.99);
        const wet =
          stream &&
          pond &&
          r < 90 &&
          g > r * (id === 'tuong_duong' ? 1.65 : 1.45) &&
          b > r * (id === 'tuong_duong' ? 2 : 1.65) &&
          b > g * 0.86;
        const fall =
          id === 'dao_hoa_dao' &&
          ((x > 250 && x < 295 && y > 115 && y < 197) ||
            (x > 382 && x < 415 && y > 73 && y < 125)) &&
          b > r * 0.9 &&
          g > r * 0.9 &&
          b > 110 &&
          g > 115;
        if (wet || fall) {
          mask[y * w + x] = fall ? 2 : 1;
          waterPixels++;
        }
      }
    for (let frame = 0; frame < 8; frame++) {
      const key = `m4d:flow:${id}:${frame}`;
      const texture = scene.textures.createCanvas(key, w, h)!;
      const out = texture.context.createImageData(w, h);
      for (let y = 2; y < h - 2; y++) {
        const shift = Math.round(
          Math.sin(y * 0.07 + (frame * Math.PI) / 4) * 2,
        );
        for (let x = 3; x < w - 3; x++) {
          const p = y * w + x;
          if (!mask[p]) continue;
          const q =
            mask[p] === 2
              ? (y + Math.round(Math.sin((frame * Math.PI) / 4) * 2)) * w + x
              : y * w + x + shift;
          if (!mask[q]) continue;
          const a = p * 4,
            b = q * 4;
          out.data[a] = input[b]!;
          out.data[a + 1] = input[b + 1]!;
          out.data[a + 2] = input[b + 2]!;
          // A stationary mask feathers shore pixels while UVs move inside it.
          out.data[a + 3] =
            mask[p - 1] && mask[p + 1] && mask[p - w] && mask[p + w] ? 235 : 95;
        }
      }
      texture.context.putImageData(out, 0, 0);
      texture.refresh();
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      owned.push(key);
    }
    frames = [...owned];
    flow = scene.add
      .image(ground.x, ground.y, frames[0]!)
      .setScale(ground.scaleX)
      .setDepth(-9999.9)
      .setName('m4d:ambient:water');
    nodes.push(flow);
  }
  const torches = id === 'tuong_duong' ? createTorchMotion(scene) : undefined;
  const flowers: {
    image: Phaser.GameObjects.Image;
    y: number;
    phase: number;
  }[] = [];
  if (id === 'tu_hien_trang') {
    // Independent alpha art: no baked flowers underneath these moving sprites.
    const positions = [
      [535, 320],
      [620, 255],
      [430, 390],
      [1040, 310],
      [1160, 390],
      [945, 240],
      [490, 760],
      [620, 855],
      [385, 690],
      [1080, 785],
      [970, 865],
      [1205, 690],
    ];
    for (const [index, p] of positions.entries()) {
      const key = ['lotus-open', 'lotus-pair', 'lotus-bud', 'lotus-pink'][
        index % 4
      ]!;
      const image = scene.add
        .image(p[0]!, p[1]!, 'm4d:' + key)
        .setScale(0.1 + (index % 3) * 0.014)
        .setDepth(-9900)
        .setName('m4d:ambient:lotus');
      flowers.push({ image, y: p[1]!, phase: index * 1.37 });
      nodes.push(image);
    }
  }
  let phase = -1;
  const update = () => {
    const time = scene.time.now;
    const next = Math.floor(time / 140) % 8;
    if (flow && next !== phase) flow.setTexture(frames[next]!);
    phase = next;
    for (const flower of flowers)
      flower.image
        .setY(flower.y + Math.sin(time / 950 + flower.phase) * 1.3)
        .setRotation(Math.sin(time / 1500 + flower.phase) * 0.025);
    torches?.update(time);
    scene.registry.set('m4d-ambient', {
      id,
      frame: phase,
      waterPixels,
      fireCount: torches?.count ?? 0,
      torches: torches?.inspect() ?? [],
      detachedFlames: scene.children.list.filter(
        (n) => n.name === 'm4d:ambient:flame' || n.name === 'm4d:ambient:ember',
      ).length,
      lotusCount: flowers.length,
      waterFrame: flow?.texture.key,

      lotusY: flowers[0]?.image.y,
      time,
      nodes: nodes.length,
      waterBounds: { width: arena.width, height: arena.height },
    });
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, update);
  ground.once('destroy', () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, update);
    torches?.destroy();
    for (const node of nodes) node.destroy();
    for (const key of owned) scene.textures.remove(key);
    scene.registry.remove('m4d-ambient');
  });
  update();
}
