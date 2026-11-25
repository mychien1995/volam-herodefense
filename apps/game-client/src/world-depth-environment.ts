import Phaser from 'phaser';
import type { WorldDepthProfile } from './world-depth-profiles.js';
import { DepthEmissionPoints } from './world-depth-emission.js';
type Image = Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
export class WorldDepthEnvironment {
  private zone = '';
  private ground: Image | undefined;
  private masks: Image[] = [];
  private textures: string[] = [];
  private lamps = new Map<
    Image,
    { ground: Image; core: Image; color: number }
  >();
  private emission = new DepthEmissionPoints();
  private enabled = true;
  constructor(private scene: Phaser.Scene) {}
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    for (const m of this.masks) m.setVisible(enabled);
    for (const [source, l] of this.lamps) {
      l.ground.setVisible(enabled && source.visible);
      l.core.setVisible(enabled && source.visible);
    }
  }
  private floor(p: WorldDepthProfile): Image | undefined {
    const names =
      p.id === 'arena'
        ? ['arena:ground']
        : p.id === 'loi_dai'
          ? ['loi-dai:ground']
          : [
              'kim_luan:xiangyang-court',
              'chu:ground',
              'hong_liet:ground',
              'renovation:ground:' + p.id,
            ];
    return names
      .map((n) => this.scene.children.getByName(n) as Image | undefined)
      .find((i) => i?.visible);
  }
  private build(source: Image, p: WorldDepthProfile) {
    const w = 512,
      h = Math.max(
        64,
        Math.round((w * source.displayHeight) / source.displayWidth),
      );
    const sample = document.createElement('canvas');
    sample.width = w;
    sample.height = h;
    const ctx = sample.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(
      source.frame.source.image as CanvasImageSource,
      source.frame.cutX,
      source.frame.cutY,
      source.frame.cutWidth,
      source.frame.cutHeight,
      0,
      0,
      w,
      h,
    );
    const pixels = ctx.getImageData(0, 0, w, h).data;
    const stamp = String(++WorldDepthEnvironment.serial);
    for (const [index, role] of ['shade', 'sun', 'emission'].entries()) {
      const key = 'world-depth:environment:' + stamp + ':' + role,
        texture = this.scene.textures.createCanvas(key, w, h)!,
        data = texture.context.createImageData(w, h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4,
            r = pixels[i]!,
            g = pixels[i + 1]!,
            b = pixels[i + 2]!,
            luma = r * 0.21 + g * 0.72 + b * 0.07;
          const wx = (x / w) * source.displayWidth,
            wy = (y / h) * source.displayHeight;
          const light = Math.max(
            0,
            Math.min(
              1,
              (0.5 +
                0.24 * Math.sin(wx * 0.018 - wy * 0.025) +
                0.17 * Math.sin(wx * 0.047 + wy * 0.021) +
                0.09 * Math.sin(wy * 0.079) -
                0.25) /
                0.55,
            ),
          );
          const floor = luma > 60 && luma < 245 ? 1 : 0.25;
          const color = index === 0 ? p.ambient : p.sun;
          data.data[i] = color[0];
          data.data[i + 1] = color[1];
          data.data[i + 2] = color[2];
          if (index === 0)
            data.data[i + 3] = Math.round(p.shade * 255 * (1 - light) * floor);
          if (index === 1)
            data.data[i + 3] = Math.round(p.daylight * 255 * light * floor);
          if (index === 2) {
            const lava =
              p.id === 'hell' &&
              r > 170 &&
              g > 65 &&
              r > g * 1.35 &&
              r > b * 1.8;
            const jade = p.id === 'co_mo' && g > 150 && b > 130 && g > r * 1.12;
            data.data[i + 3] = lava ? 95 : jade ? 45 : 0;
          }
        }
      texture.context.putImageData(data, 0, 0);
      if (index === 2) {
        const soft = document.createElement('canvas');
        soft.width = w;
        soft.height = h;
        const brush = soft.getContext('2d')!;
        brush.filter = 'blur(7px)';
        brush.drawImage(texture.canvas, 0, 0);
        texture.context.clearRect(0, 0, w, h);
        texture.context.drawImage(soft, 0, 0);
      }
      texture.refresh();
      this.textures.push(key);
      const image = this.scene.add
        .image(source.x, source.y, key)
        .setOrigin(source.originX, source.originY)
        .setDisplaySize(source.displayWidth, source.displayHeight)
        .setDepth(p.groundDepth - 3 + index * 0.1)
        .setName('world-depth:environment')
        .setBlendMode(
          index === 0 ? Phaser.BlendModes.MULTIPLY : Phaser.BlendModes.ADD,
        )
        .setVisible(this.enabled);
      this.masks.push(image);
    }
  }
  private white() {
    const key = 'world-depth:environment-light';
    if (this.scene.textures.exists(key)) return key;
    const t = this.scene.textures.createCanvas(key, 128, 128)!,
      c = t.context,
      g = c.createRadialGradient(64, 64, 0, 64, 64, 63);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
    t.refresh();
    this.textures.push(key);
    return key;
  }
  sync(zone: string, p: WorldDepthProfile) {
    const floor = this.floor(p);
    if (this.zone !== zone || this.ground !== floor) {
      this.clear();
      this.zone = zone;
      if (floor) {
        this.ground = floor;
        this.build(floor, p);
      }
    }
    if (p.id === 'arena' && !floor?.getData('m4d-ground')) return;
    const active = new Set<Image>();
    for (const node of this.scene.children.list) {
      const source = node as Image;
      if (
        !source.texture ||
        source.name.startsWith('world-depth:') ||
        !source.visible
      )
        continue;
      const semantic = /lantern|torch|brazier|jade_lamp/.test(
        source.name + ':' + source.texture.key,
      );
      const key = source.texture.key;
      const known =
        (p.id === 'forest' && key === 'renovated-prop-forest-2') ||
        (p.id === 'hell' &&
          [0, 1, 2, 3].some((i) => key === 'renovated-prop-hell-' + i)) ||
        (p.id === 'co_mo' && key === 'renovated-prop-co_mo-3') ||
        (p.id === 'chu_ba_thong' && key === 'renovated-prop-chu_ba_thong-3') ||
        (p.id === 'sea' && key === 'renovated-prop-sea-1');
      if (!semantic && !known) continue;
      active.add(source);
      let l = this.lamps.get(source);
      if (!l) {
        const color = p.id === 'co_mo' ? 0x8fe6db : 0xffba65;
        const ground = this.scene.add
          .image(0, 0, this.white())
          .setName('world-depth:environment')
          .setBlendMode(Phaser.BlendModes.ADD)
          .setTint(color)
          .setDepth(p.groundDepth + 1);
        const core = this.scene.add
          .image(0, 0, this.white())
          .setName('world-depth:environment')
          .setBlendMode(Phaser.BlendModes.ADD)
          .setTint(color);
        l = { ground, core, color };
        this.lamps.set(source, l);
      }
      const point = this.emission.world(
        source,
        p.id === 'co_mo' ? 'cool' : 'warm',
      );
      l.ground
        .setPosition(
          point.x,
          source.y + (1 - source.originY) * source.displayHeight,
        )
        .setDisplaySize(100, 38)
        .setAlpha(0.2)
        .setVisible(this.enabled);
      l.core
        .setPosition(point.x, point.y)
        .setDisplaySize(22, 26)
        .setDepth(source.depth + 0.01)
        .setAlpha(0.36)
        .setVisible(this.enabled);
    }
    for (const [source, l] of this.lamps)
      if (!active.has(source)) {
        l.ground.destroy();
        l.core.destroy();
        this.lamps.delete(source);
      }
  }
  inspect() {
    return {
      profile: this.zone,
      layers: this.masks.map((m) => ({
        texture: m.texture.key,
        visible: m.visible,
      })),
      localLights: this.lamps.size,
      textures: this.textures.length,
    };
  }
  clear() {
    for (const m of this.masks) m.destroy();
    this.masks = [];
    for (const l of this.lamps.values()) {
      l.ground.destroy();
      l.core.destroy();
    }
    this.lamps.clear();
    for (const key of this.textures) this.scene.textures.remove(key);
    this.textures = [];
    this.ground = undefined;
    this.zone = '';
  }
  private static serial = 0;
}
