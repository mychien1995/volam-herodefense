import Phaser from 'phaser';
import {
  previews,
  ids,
  previewState,
  type Facing,
  type Outcome,
  type PreviewId,
  type PreviewState,
  type Layer,
} from './bac-cai-preview-model.js';
import './bac-cai-preview.css';

interface Clip {
  name: string;
  frames: string[];
  durations: number[];
  repeat: number;
}
interface Asset {
  id: string;
  origin: [number, number];
  animations: Clip[];
}
const field = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const skill = field<HTMLSelectElement>('skill'),
  facing = field<HTMLSelectElement>('facing'),
  outcome = field<HTMLSelectElement>('outcome'),
  players = field<HTMLSelectElement>('players');
const timeline = field<HTMLInputElement>('timeline'),
  pause = field<HTMLButtonElement>('pause');
const base = '/assets/bac-cai-preview/';

class BacCaiPreview extends Phaser.Scene {
  private assets: Asset[] = [];
  private views = new Map<string, Phaser.GameObjects.Sprite>();
  private labels = new Map<string, Phaser.GameObjects.Text>();
  private observed = new Set<string>();
  private clips = new Map<string, Clip>();
  private elapsed = 0;
  private playing = true;
  private speed = 1;
  private chosen: PreviewId = 'entrance';
  private audition: { asset: string; tag: string } | undefined;
  private state: PreviewState = previewState('entrance', 0);
  private errors: string[] = [];
  private cycles = 0;
  private ready = false;
  constructor() {
    super('BacCaiPreview');
  }
  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) =>
      this.errors.push(String(file.url)),
    );
    this.load.once(
      'filecomplete-json-bac-cai-manifest',
      (_key: string, _type: string, data: { assets: Asset[] }) => {
        this.assets = data.assets;
        for (const a of this.assets)
          this.load.atlas(a.id, base + a.id + '.png', base + a.id + '.json');
      },
    );
    this.load.json('bac-cai-manifest', base + 'manifest.json');
    this.load.image('bac-cai-ground', base + 'ground.png');
    this.load.image('bac-cai-statue', base + 'statue.png');
  }
  create(): void {
    for (const a of this.assets) {
      this.textures.get(a.id).setFilter(Phaser.Textures.FilterMode.NEAREST);
      for (const tag of a.animations) {
        for (const frame of tag.frames)
          if (!this.textures.get(a.id).has(frame))
            throw Error(`Missing frame ${a.id}:${frame}`);
        this.clips.set(a.id + ':' + tag.name, tag);
      }
    }
    this.add.image(640, 360, 'bac-cai-ground').setDepth(-10000);
    this.add.image(640, 145, 'bac-cai-statue').setOrigin(0.5, 1).setDepth(145);
    this.cameras.main.setZoom(1).setRotation(0);
    for (const [id, name] of previews) skill.add(new Option(name, id));
    const opt = document.createElement('optgroup');
    opt.label = 'Sprite / VFX · từng clip gốc';
    for (const a of this.assets.filter((a) => !a.id.startsWith('hero_')))
      for (const tag of a.animations)
        opt.append(
          new Option(
            a.id.replace('bac_cai_', '') + ' · ' + tag.name,
            a.id + ':' + tag.name,
          ),
        );
    skill.append(opt);
    skill.onchange = () => this.choose(skill.value);
    facing.onchange =
      outcome.onchange =
      players.onchange =
        () => this.choose(this.chosen);
    pause.onclick = () => {
      this.playing = !this.playing;
      pause.textContent = this.playing ? 'Dừng' : 'Phát';
    };
    field<HTMLButtonElement>('restart').onclick = () => {
      this.elapsed = 0;
      this.cycles = 0;
      this.draw();
    };
    field<HTMLSelectElement>('speed').onchange = (e) => {
      this.speed = Number((e.target as HTMLSelectElement).value);
    };
    field<HTMLSelectElement>('zoom').onchange = (e) =>
      this.cameras.main.setZoom(Number((e.target as HTMLSelectElement).value));
    timeline.oninput = () => this.seek(Number(timeline.value));
    const query = new URLSearchParams(location.search);
    const candidate = query.get('skill');
    const requestedFacing = query.get('facing');
    if (['right', 'down', 'left', 'up'].includes(requestedFacing ?? ''))
      facing.value = requestedFacing!;
    this.ready = true;
    this.choose(candidate ?? 'entrance');
    const bridge = {
      choose: (
        id: string,
        d: Facing = 'right',
        branch: Outcome = 'success',
        count = 6,
      ) => {
        facing.value = d;
        outcome.value = branch;
        players.value = String(count);
        this.choose(id);
      },
      seek: (t: number) => this.seek(t),
      play: () => {
        this.playing = true;
        pause.textContent = 'Dừng';
      },
      pause: () => {
        this.playing = false;
        pause.textContent = 'Phát';
      },
      speed: (n: number) => {
        this.speed = n;
      },
      zoom: (n: number) => this.cameras.main.setZoom(n),
      snapshot: () => ({
        ready: this.ready,
        id: this.chosen,
        audition: this.audition,
        time: this.elapsed,
        playing: this.playing,
        cycles: this.cycles,
        camera: {
          zoom: this.cameras.main.zoom,
          rotation: (() => {
            const origin = this.cameras.main.getWorldPoint(0, 0);
            const unit = this.cameras.main.getWorldPoint(1, 0);
            return Math.atan2(unit.y - origin.y, unit.x - origin.x);
          })(),
        },
        state: this.state,
        errors: this.errors,
        seen: [...this.observed],
        clips: [...this.clips].map(([key, c]) => ({
          key,
          frames: c.frames,
          duration: c.durations.reduce((a, b) => a + b, 0),
        })),
        actors: [...this.views]
          .filter(([, v]) => v.visible)
          .map(([id, v]) => ({
            id,
            asset: v.texture.key,
            frame: v.frame.name,
            x: v.x,
            y: v.y,
            origin: [v.originX, v.originY],
            scale: [v.scaleX, v.scaleY],
            depth: v.depth,
            alpha: v.alpha,
          })),
        labels: [...this.labels]
          .filter(([, v]) => v.visible)
          .map(([id, v]) => ({ id, text: v.text, x: v.x, y: v.y })),
      }),
    };
    (
      window as unknown as { __BAC_CAI_PREVIEW__: typeof bridge }
    ).__BAC_CAI_PREVIEW__ = bridge;
  }
  private choose(id: string): void {
    if (id.includes(':')) {
      const [asset, tag] = id.split(':');
      if (!asset || !tag || !this.clips.has(id))
        throw Error('Unknown clip ' + id);
      this.audition = { asset, tag };
    } else {
      if (!previews.some((p) => p[0] === id))
        throw Error('Unknown preview ' + id);
      this.chosen = id as PreviewId;
      this.audition = undefined;
    }
    skill.value = id;
    this.elapsed = 0;
    this.cycles = 0;
    this.observed.clear();
    this.draw();
  }
  private seek(t: number): void {
    this.elapsed = Math.max(0, Math.min(t, this.duration()));
    this.playing = false;
    pause.textContent = 'Phát';
    this.draw();
  }
  private duration(): number {
    return this.audition
      ? this.clips
          .get(this.audition.asset + ':' + this.audition.tag)!
          .durations.reduce((a, b) => a + b, 0)
      : previews.find((p) => p[0] === this.chosen)![2];
  }
  override update(_time: number, delta: number): void {
    if (!this.ready) return;
    if (this.playing) {
      this.elapsed += Math.min(delta, 80) * this.speed;
      if (this.elapsed > this.duration()) {
        this.elapsed %= this.duration();
        this.cycles++;
      }
    }
    this.draw();
  }
  private draw(): void {
    this.state = previewState(
      this.chosen,
      this.elapsed,
      facing.value as Facing,
      outcome.value as Outcome,
      Number(players.value),
    );
    if (this.audition) {
      this.state.layers = [
        {
          id: 'audition',
          asset: this.audition.asset,
          tag: this.audition.tag,
          x: this.audition.asset === ids.beam ? 260 : 640,
          y: 365,
          clock: this.elapsed,
          loop: true,
        },
        ...this.state.layers
          .filter((l) => l.id === 'hero-0')
          .map((l) => ({ ...l, x: 780, y: 365 })),
      ];
      this.state.captions = [];
      this.state.phase = this.audition.asset + ' · ' + this.audition.tag;
      this.state.note =
        'Clip raster gốc · chân boss 56px / hero khoảng 44px · zoom 1× là kích thước gameplay.';
    }
    for (const v of this.views.values()) v.setVisible(false);
    for (const l of this.state.layers) this.renderLayer(l);
    for (const v of this.labels.values()) v.setVisible(false);
    for (const c of this.state.captions) {
      let v = this.labels.get(c.id);
      if (!v) {
        v = this.add
          .text(0, 0, '', {
            fontFamily: 'Arial',
            fontSize: 14,
            color: '#ffe2a0',
            stroke: '#172015',
            strokeThickness: 4,
            align: 'center',
            backgroundColor: '#15200fb0',
            padding: { x: 6, y: 3 },
          })
          .setOrigin(0.5);
        this.labels.set(c.id, v);
      }
      v.setText(c.text)
        .setPosition(Math.round(c.x), Math.round(c.y))
        .setDepth(10000)
        .setColor(c.color ?? '#ffe2a0')
        .setVisible(true);
    }
    field('phase').textContent = this.state.phase;
    field('boss-health').textContent =
      `HP mẫu · ${Math.round(this.state.bossHp)}%`;
    field('note').textContent = this.state.note;
    field('readout').textContent =
      `${(this.elapsed / 1000).toFixed(1)} / ${(this.duration() / 1000).toFixed(1)}s`;
    timeline.max = String(this.duration());
    timeline.value = String(this.elapsed);
  }
  private renderLayer(l: Layer): void {
    const a = this.assets.find((a) => a.id === l.asset);
    const tag = this.clips.get(l.asset + ':' + l.tag);
    if (!a || !tag) {
      const error = `Unknown presentation clip ${l.asset}:${l.tag}`;
      if (!this.errors.includes(error)) this.errors.push(error);
      return;
    }
    let clock = Math.max(0, l.clock),
      index = 0;
    const total = tag.durations.reduce((a, b) => a + b, 0);
    if (l.frame !== undefined) index = Math.min(tag.frames.length - 1, l.frame);
    else {
      if (l.loop) clock %= total;
      for (let i = 0; i < tag.frames.length; i++) {
        index = i;
        if (clock < tag.durations[i]!) break;
        clock -= tag.durations[i]!;
      }
    }
    const frame = tag.frames[index]!;
    let view = this.views.get(l.id);
    if (!view) {
      view = this.add.sprite(0, 0, l.asset, frame);
      this.views.set(l.id, view);
    }
    view
      .setTexture(l.asset, frame)
      .setOrigin(...(l.origin ?? a.origin))
      .setPosition(Math.round(l.x), Math.round(l.y))
      .setScale(l.sx ?? 1, l.sy ?? l.sx ?? 1)
      .setAlpha(l.alpha ?? 1)
      .setAngle(l.angle ?? 0)
      .setFlipX(l.flip ?? false)
      .setDepth(l.depth ?? l.y)
      .setVisible(true);
    this.observed.add(l.asset + ':' + frame);
  }
}
new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'bac-cai-canvas',
  width: 1280,
  height: 720,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#25301c',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: false },
  audio: { noAudio: true },
  scene: [BacCaiPreview],
});
