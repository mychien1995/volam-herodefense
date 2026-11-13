import Phaser from 'phaser';
import baseVfx from '../../../assets/reviews/duong-mon-vfx-v2/art/vfx.json';
import coQuanAtlas from '../../../assets/reviews/duong-mon-vfx-v2/art/co-quan-effects.json';
import '../../../assets/reviews/duong-mon-vfx-v2/preview.css';

const pngs = import.meta.glob<string>(
  '../../../assets/reviews/duong-mon-vfx-v2/art/*.png',
  { eager: true, import: 'default', query: '?url' },
);
const atlases = import.meta.glob<string>(
  '../../../assets/reviews/duong-mon-vfx-v2/art/*.json',
  { eager: true, import: 'default', query: '?url' },
);
const byName = (files: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(files).map(([path, url]) => [
      path.slice(path.lastIndexOf('/') + 1, path.lastIndexOf('.')),
      url,
    ]),
  );
const images = byName(pngs);
const atlasUrls = byName(atlases);
const props = ['wall', 'pillar', 'tree', 'rocks', 'bush', 'dummy'];
const cell = baseVfx.frames.arrow.frame.w;
const density = 2;
const worldWidth = 640;
const worldHeight = 360;
const host = document.querySelector<HTMLElement>('#world')!;
const phase = document.querySelector<HTMLElement>('#phase')!;

interface FrameStyle {
  angle: number;
  flip: boolean;
  alpha: number;
  scale: number;
  stretch: number;
}

type Drawing =
  | Phaser.GameObjects.Image
  | Phaser.GameObjects.Ellipse
  | Phaser.GameObjects.Rectangle;

/** Same choreography as the approved offline preview, drawn by Phaser at native density. */
class DuongMonPreview extends Phaser.Scene {
  private sprites: Phaser.GameObjects.Image[] = [];
  private shadows: Phaser.GameObjects.Ellipse[] = [];
  private motes: Phaser.GameObjects.Rectangle[] = [];
  private usedSprites = 0;
  private usedShadows = 0;
  private usedMotes = 0;
  private depth = 0;
  private screen = false;
  private runFrame?: (time: number) => void;
  private ground!: Phaser.GameObjects.Image;
  private margin!: Phaser.GameObjects.Image;
  private zoom = density;
  private left = 0;
  private top = 0;
  private observer?: ResizeObserver;
  private loadFailed = false;

  preload() {
    this.load.on('loaderror', (file: { key: string }) => {
      this.loadFailed = true;
      phase.textContent = 'Không tải được hình ảnh Đường Môn · ' + file.key;
    });
    for (const [name, image] of Object.entries(images)) {
      const atlas = atlasUrls[name];
      if (atlas) this.load.atlas(name, image, atlas);
      else this.load.image(name, image);
    }
  }

  create() {
    if (this.loadFailed) return;
    for (const name of Object.keys(images)) {
      this.textures.get(name).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    this.margin = this.add.image(0, 0, 'arena').setTint(0x625957).setDepth(-2);
    this.ground = this.add.image(0, 0, 'arena').setOrigin(0).setDepth(-1);
    this.observer = new ResizeObserver(() => this.fit());
    this.observer.observe(host);
    this.events.once('shutdown', () => this.observer?.disconnect());
    this.fit();
    this.game.canvas.setAttribute(
      'aria-label',
      'Sân tập Đường Môn trong Phaser',
    );
    Object.assign(window, {
      duongMonPhaser: {
        frames: {
          sheets: Object.fromEntries(
            Object.keys(atlasUrls).map((name) => [
              name,
              { frames: this.textures.get(name).getFrameNames() },
            ]),
          ),
        },
        coQuanFx: {
          names: Object.keys(coQuanAtlas.frames),
          // The original laser cel is drawn at 192 source px / 96 world px.
          laserWidth: 96,
        },
        begin: () => this.begin(),
        end: () => this.end(),
        frame: (
          sheet: string,
          name: string,
          x: number,
          y: number,
          style: FrameStyle,
        ) => this.drawFrame(sheet, name, x, y, style),
        prop: (name: string, x: number, y: number, width: number) =>
          this.prop(name, x, y, width),
        shadow: (x: number, y: number, airborne: boolean) =>
          this.shadow(x, y, airborne),
        mote: (x: number, y: number, size: number, color: string) =>
          this.mote(x, y, size, color),
        outline: (
          sheet: string,
          name: string,
          x: number,
          y: number,
          flip: boolean,
        ) => this.outline(sheet, name, x, y, flip),
        blend: (screen: boolean) => {
          this.screen = screen;
        },
        run: (draw: (time: number) => void) => {
          this.runFrame = draw;
        },
        inspect: () => this.inspect(),
      },
    });
    void import('../../../assets/reviews/duong-mon-vfx-v2/preview.js').catch(
      (error: unknown) => {
        console.error(error);
        phase.textContent = 'Không khởi động được sân tập Đường Môn.';
      },
    );
  }

  override update(time: number) {
    this.runFrame?.(time);
  }

  private fit() {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(host.clientWidth * dpr));
    const height = Math.max(1, Math.round(host.clientHeight * dpr));
    this.scale.resize(width, height);
    const { canvas } = this.game;
    canvas.style.width = host.clientWidth + 'px';
    canvas.style.height = host.clientHeight + 'px';
    this.zoom = Math.min(width / worldWidth, height / worldHeight);
    this.left = (width - worldWidth * this.zoom) / 2;
    this.top = (height - worldHeight * this.zoom) / 2;
    this.ground
      .setPosition(this.left, this.top)
      .setDisplaySize(worldWidth * this.zoom, worldHeight * this.zoom);
    const image = this.textures.get('arena').getSourceImage();
    const cover = Math.max(width / image.width, height / image.height);
    this.margin
      .setVisible(this.left > 1 || this.top > 1)
      .setPosition(width / 2, height / 2)
      .setDisplaySize(image.width * cover, image.height * cover);
  }

  private begin() {
    this.usedSprites = 0;
    this.usedShadows = 0;
    this.usedMotes = 0;
    this.depth = 0;
    this.screen = false;
  }

  private end() {
    const hide = (pool: Drawing[], used: number) => {
      for (let i = used; i < pool.length && pool[i]?.visible; i++) {
        pool[i]?.setVisible(false);
      }
    };
    hide(this.sprites, this.usedSprites);
    hide(this.shadows, this.usedShadows);
    hide(this.motes, this.usedMotes);
  }

  private place(object: Drawing, x: number, y: number) {
    object
      .setPosition(this.left + x * this.zoom, this.top + y * this.zoom)
      .setDepth(this.depth++)
      .setVisible(true);
  }

  private image(sheet: string, frame?: string) {
    const index = this.usedSprites++;
    const image = (this.sprites[index] ??= this.add.image(0, 0, sheet, frame));
    if (image.texture.key !== sheet || (frame && image.frame.name !== frame)) {
      image.setTexture(sheet, frame);
    }
    return image
      .clearTint()
      .setTintMode(Phaser.TintModes.MULTIPLY)
      .setBlendMode(
        this.screen ? Phaser.BlendModes.SCREEN : Phaser.BlendModes.NORMAL,
      );
  }

  private drawFrame(
    sheet: string,
    name: string,
    x: number,
    y: number,
    style: FrameStyle,
  ) {
    const image = this.image(sheet, name);
    const effect = sheet === 'vfx' || sheet === 'co-quan-effects';
    this.place(image, x, y);
    image
      .setOrigin(0.5, effect ? 0.5 : 200 / cell)
      .setRotation(style.angle)
      .setFlipX(style.flip)
      .setAlpha(style.alpha)
      .setScale(
        (this.zoom * style.scale * style.stretch) / density,
        (this.zoom * style.scale) / density,
      );
    return image;
  }

  private prop(name: string, x: number, y: number, width: number) {
    const image = this.image(name);
    this.place(image, x, y);
    image
      .setOrigin(0.5, 1)
      .setRotation(0)
      .setFlipX(false)
      .setAlpha(1)
      .setScale((width * this.zoom) / image.width);
  }

  private shadow(x: number, y: number, airborne: boolean) {
    const index = this.usedShadows++;
    const shadow = (this.shadows[index] ??= this.add.ellipse(
      0,
      0,
      34,
      10,
      0x28201d,
    ));
    this.place(shadow, x, y);
    shadow
      .setScale(this.zoom * (airborne ? 0.76 : 1), this.zoom)
      .setAlpha(airborne ? 0.28 : 0.4);
  }

  private mote(x: number, y: number, size: number, color: string) {
    const index = this.usedMotes++;
    const mote = (this.motes[index] ??= this.add
      .rectangle(0, 0, 1, 1)
      .setOrigin(0));
    this.place(mote, x, y);
    mote
      .setScale(size * this.zoom)
      .setFillStyle(Number.parseInt(color.slice(1), 16));
  }

  private outline(
    sheet: string,
    name: string,
    x: number,
    y: number,
    flip: boolean,
  ) {
    const step = 1 / this.zoom;
    for (const [dx, dy] of [
      [step, 0],
      [-step, 0],
      [0, step],
    ] as const) {
      this.drawFrame(sheet, name, x + dx, y + dy, {
        angle: 0,
        flip,
        alpha: 0.78,
        scale: 1,
        stretch: 1,
      })
        .setTint(0xeef5ff)
        .setTintMode(Phaser.TintModes.FILL);
    }
  }

  private inspect() {
    const actor = this.sprites
      .slice(0, this.usedSprites)
      .reverse()
      .find((sprite) => /^(tuan-sa|da-hanh)-/.test(sprite.texture.key));
    const { canvas } = this.game;
    return {
      width: canvas.width,
      height: canvas.height,
      scale: this.zoom,
      renderer: this.game.renderer.type,
      phaser: Phaser.VERSION,
      atlasCount: Object.keys(atlasUrls).length,
      propsLoaded: props.every((id) => this.textures.exists(id)),
      sprite: actor && {
        frame: actor.frame.name,
        texture: actor.texture.key,
        sourceWidth: actor.frame.cutWidth,
        originY: actor.displayOriginY,
        scale: actor.scaleY,
      },
    };
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  parent: host,
  width: host.clientWidth,
  height: host.clientHeight,
  backgroundColor: '#131820',
  scale: { mode: Phaser.Scale.NONE },
  render: {
    pixelArt: false,
    roundPixels: false,
    antialias: true,
    antialiasGL: true,
  },
  scene: DuongMonPreview,
  audio: { noAudio: true },
  banner: false,
});
