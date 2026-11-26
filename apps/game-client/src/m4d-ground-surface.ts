import { assetUrl } from './asset-url.js';
import Phaser from 'phaser';
import { materialPattern } from './world-depth-material.js';
import { arenaVariants, type ArenaId } from '@volam/game-data';
import plazas from './m4d-plazas.generated.json';

export function preloadGroundSurface(scene: Phaser.Scene): void {
  scene.load.image('m4d:materials', assetUrl('/assets/m4d/r3/materials.png'));
  for (const p of plazas)
    scene.load.image('m4d:plaza:' + p.id, assetUrl('/assets/m4d/' + p.image));
}
const geometry: Record<
  ArenaId,
  { x: number; y: number; rx: number; ry: number; cell: number }
> = {
  dao_hoa_dao: {
    ...arenaVariants.dao_hoa_dao.circleCenter,
    rx: 340,
    ry: 275,
    cell: 0,
  },
  tuong_duong: {
    ...arenaVariants.tuong_duong.circleCenter,
    rx: 340,
    ry: 280,
    cell: 1,
  },
  tu_hien_trang: {
    ...arenaVariants.tu_hien_trang.circleCenter,
    rx: 305,
    ry: 256,
    cell: 2,
  },
};
/** Native-density authored materials keep the canonical shoreline/layout mask. */
export function createGroundSurface(scene: Phaser.Scene, id: ArenaId): void {
  if (new URLSearchParams(location.search).get('groundDetail') === 'off') {
    scene.registry.set('m4d-ground-surface', { enabled: false });
    return;
  }
  const ground = scene.children.getByName(
    'arena:ground',
  ) as Phaser.GameObjects.Image;
  const source = ground.texture.getSourceImage() as HTMLImageElement;
  const atlas = scene.textures
    .get('m4d:materials')
    .getSourceImage() as HTMLImageElement;
  const scratch = document.createElement('canvas');
  scratch.width = source.width;
  scratch.height = source.height;
  const sample = scratch.getContext('2d', { willReadFrequently: true })!;
  sample.drawImage(source, 0, 0);
  const raw = sample.getImageData(0, 0, source.width, source.height).data;
  const g = geometry[id],
    cw = Math.round(atlas.width / 2),
    ch = Math.round(atlas.height / 2);
  const nodes: Phaser.GameObjects.Image[] = [],
    owned: string[] = [];
  const renderW = Math.ceil(ground.displayWidth * 2),
    renderH = Math.ceil(ground.displayHeight * 2);
  const key = `m4d:surface:${id}`;
  const combined = scene.textures.createCanvas(key, renderW, renderH)!;
  owned.push(key);
  for (const role of id === 'tu_hien_trang'
    ? ['stone', 'wood', 'grass']
    : ['stone', 'grass']) {
    const mask = document.createElement('canvas');
    mask.width = source.width;
    mask.height = source.height;
    const ctx = mask.getContext('2d')!,
      pixels = ctx.createImageData(mask.width, mask.height);
    for (let y = 0; y < mask.height; y++)
      for (let x = 0; x < mask.width; x++) {
        const i = (y * mask.width + x) * 4,
          r = raw[i]!,
          green = raw[i + 1]!,
          b = raw[i + 2]!;
        const wx =
            ground.x - ground.displayWidth / 2 + (x + 0.5) * ground.scaleX,
          wy = ground.y - ground.displayHeight / 2 + (y + 0.5) * ground.scaleY;
        const dx = wx - g.x,
          dy = wy - g.y;
        const inner = (dx / g.rx) ** 2 + (dy / g.ry) ** 2;
        const stone =
          id === 'dao_hoa_dao'
            ? r > 95 &&
              green > 65 &&
              b > 45 &&
              r > green * 1.03 &&
              r < green * 1.6 &&
              green > b * 1.05 &&
              green < b * 1.85
            : r > 35 &&
              green > 40 &&
              b > 50 &&
              green > r * 0.95 &&
              green < r * 1.48 &&
              b > green * 1.02 &&
              b < green * 1.55;
        const bridge =
          (Math.abs(dx) < 87 || Math.abs(dy) < 76) &&
          inner > 1 &&
          (dx / 553) ** 2 + (dy / 424) ** 2 < 1;
        const wood =
          bridge && r > 40 && green > 20 && r > green * 1.12 && b < green * 1.1;
        const pond =
          id === 'tu_hien_trang' &&
          inner > 1 &&
          (dx / 553) ** 2 + (dy / 424) ** 2 < 1 &&
          !bridge;
        const fill =
          role === 'grass'
            ? !pond &&
              green > r * 1.08 &&
              green > b * 1.2 &&
              b < r * 1.35 &&
              r < 180
            : role === 'wood'
              ? wood
              : !pond &&
                ((inner < (id === 'tu_hien_trang' ? 1 : 1.32) && !wood) ||
                  stone);
        pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
        pixels.data[i + 3] = fill ? 255 : 0;
      }
    ctx.putImageData(pixels, 0, 0);
    // Close only narrow old grout gaps, feathering material boundaries in place.
    const soft = document.createElement('canvas');
    soft.width = mask.width;
    soft.height = mask.height;
    const sc = soft.getContext('2d')!;
    sc.filter = 'blur(3px)';
    sc.drawImage(mask, 0, 0);
    const closed = sc.getImageData(0, 0, mask.width, mask.height);
    for (let i = 3; i < closed.data.length; i += 4)
      closed.data[i] = closed.data[i]! > 72 ? 255 : 0;
    sc.putImageData(closed, 0, 0);
    if (id === 'tuong_duong') {
      // This raised river boulder belongs to the retained landscape, not paving.
      const cx = (255 - ground.x + ground.displayWidth / 2) / ground.scaleX;
      const cy = (160 - ground.y + ground.displayHeight / 2) / ground.scaleY;
      sc.save();
      sc.globalCompositeOperation = 'destination-out';
      sc.translate(cx, cy);
      sc.scale(36 / ground.scaleX, 25 / ground.scaleY);
      const keep = sc.createRadialGradient(0, 0, 0, 0, 0, 1);
      keep.addColorStop(0, '#fff');
      keep.addColorStop(0.7, '#fff');
      keep.addColorStop(1, '#fff0');
      sc.fillStyle = keep;
      sc.fillRect(-1, -1, 2, 2);
      sc.restore();
    }
    const canvas = document.createElement('canvas');
    canvas.width = renderW;
    canvas.height = renderH;
    const context = canvas.getContext('2d')!;
    const t = { context };
    const cell = role === 'wood' ? 3 : g.cell,
      col = cell % 2,
      row = Math.floor(cell / 2);
    const grass = scene.textures
      .get('world-depth:authored-materials')
      .getSourceImage() as HTMLImageElement;
    const size =
      role === 'grass'
        ? Math.floor(grass.width / 2)
        : Math.min(cw, ch, atlas.width - col * cw, atlas.height - row * ch);
    const pattern =
      role === 'grass'
        ? materialPattern(grass, 0, 0, size)
        : materialPattern(atlas, col * cw, row * ch, size);
    const scale = 256 / pattern.width; // 128 world units at two render pixels/world unit.
    t.context.save();
    t.context.scale(scale, scale);
    t.context.fillStyle = t.context.createPattern(pattern, 'repeat')!;
    t.context.fillRect(0, 0, renderW / scale, renderH / scale);
    t.context.restore();
    if (role === 'grass') {
      t.context.globalCompositeOperation = 'multiply';
      t.context.globalAlpha = 0.6;
      t.context.drawImage(source, 0, 0, renderW, renderH);
      t.context.globalAlpha = 1;
    }
    t.context.globalCompositeOperation = 'destination-in';
    t.context.drawImage(soft, 0, 0, renderW, renderH);
    combined.context.drawImage(canvas, 0, 0);
  }
  combined.refresh();
  combined.setFilter(Phaser.Textures.FilterMode.NEAREST);
  nodes.push(
    scene.add
      .image(ground.x, ground.y, key)
      .setDisplaySize(ground.displayWidth, ground.displayHeight)
      .setDepth(-9999.7)
      .setName('m4d:surface:materials'),
  );
  const spec = plazas.find((p) => p.id === id);
  let plazaDensity: number[] = [];
  if (spec) {
    const p = scene.add
      .image(g.x, g.y, 'm4d:plaza:' + id)
      .setDisplaySize(g.rx * 2, g.ry * 2)
      .setDepth(-9999.5)
      .setName('m4d:surface:plaza');
    p.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    nodes.push(p);
    plazaDensity = [p.width / p.displayWidth, p.height / p.displayHeight];
  }
  scene.registry.set('m4d-ground-surface', {
    enabled: true,
    renderPixelsPerWorld: 2,
    materialPixelsPerWorld: 448 / 128,
    plazaPixelsPerWorld: plazaDensity,
    plaza: !!spec,
    materials: g.cell,
    staticLandmarks: true,
    grassDetail: true,
    materialLayers: 1,
    protectedRiverRockAlpha:
      id === 'tuong_duong'
        ? combined.context.getImageData(
            Math.round((255 - ground.x + ground.displayWidth / 2) * 2),
            Math.round((160 - ground.y + ground.displayHeight / 2) * 2),
            1,
            1,
          ).data[3]
        : undefined,
  });
  ground.once('destroy', () => {
    for (const n of nodes) n.destroy();
    for (const k of owned) scene.textures.remove(k);
    scene.registry.remove('m4d-ground-surface');
  });
}
