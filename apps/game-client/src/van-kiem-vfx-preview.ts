import Phaser from 'phaser';
import groundUrl from '../../../assets/exports/visual-upgrade-2/ground.png?url';
import casterUrl from '../../../assets/exports/vo-dang-kiem-rework/body.png?url';
import casterAtlas from '../../../assets/exports/vo-dang-kiem-rework/body.json?url';
import effectsUrl from '../../../assets/exports/vo-dang-kiem-rework/effects.png?url';
import effectsAtlas from '../../../assets/exports/vo-dang-kiem-rework/effects.json?url';
import targetUrl from '../../../assets/exports/renovation-v1/runtime/creep_bandit_grunt.png?url';
import targetAtlas from '../../../assets/exports/renovation-v1/runtime/creep_bandit_grunt.json?url';
import { VanKiemVolley, vanKiemTiming } from './van-kiem-volley.js';
import './van-kiem-vfx-preview.css';

const width = 1140;
const height = 640;
const {
  firstLaunch,
  quietAt,
  fallAt,
  completeAt,
  blades: swordCount,
  baseRadius,
} = vanKiemTiming;
const caster = { x: 325, y: 421, fx: 1, fy: 0 };
const target = { x: 779, y: 420, radius: baseRadius };
const playbackEnd = completeAt + 380;

/** Standalone raster choreography. This scene has no match state or damage rules. */
class VanKiemVfxPreview extends Phaser.Scene {
  private readonly timeline =
    document.querySelector<HTMLInputElement>('#preview-timeline')!;
  private readonly status =
    document.querySelector<HTMLElement>('#preview-status')!;
  private readonly replay =
    document.querySelector<HTMLButtonElement>('#preview-replay')!;
  private readonly pause =
    document.querySelector<HTMLButtonElement>('#preview-pause')!;
  private readonly speed =
    document.querySelector<HTMLSelectElement>('#preview-speed')!;
  private readonly listeners = new AbortController();
  private volley!: VanKiemVolley;
  private elapsed = 0;
  private playing = true;

  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      this.status.textContent = `Không nạp được hình ${file.key}`;
      console.error('Van Kiem preview asset failed', file.key, file.url);
    });
    this.load.image('arena', groundUrl);
    this.load.atlas('caster', casterUrl, casterAtlas);
    this.load.atlas('target', targetUrl, targetAtlas);
    this.load.atlas('sword-fx', effectsUrl, effectsAtlas);
  }

  create(): void {
    for (const texture of ['arena', 'caster', 'target', 'sword-fx'])
      this.textures.get(texture).setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.add.image(width / 2, height / 2, 'arena').setDepth(-3);
    this.add
      .image(caster.x, caster.y, 'caster', 'right_aim')
      .setOrigin(0.5, 0.775)
      .setDepth(caster.y);
    this.add
      .image(target.x, target.y, 'target', 'idle_left_0')
      .setOrigin(0.5, 0.875)
      .setDepth(target.y);
    this.volley = new VanKiemVolley(
      this,
      'sword-fx',
      'preview',
      caster,
      target,
      1,
    );
    this.bindControls();
    this.draw();
    if (new URLSearchParams(location.search).has('debug'))
      Object.defineProperty(window, '__VAN_KIEM_PREVIEW__', {
        configurable: true,
        value: { snapshot: () => this.snapshot() },
      });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.listeners.abort();
      Reflect.deleteProperty(window, '__VAN_KIEM_PREVIEW__');
    });
  }

  override update(_time: number, delta: number): void {
    if (!this.playing) return;
    this.elapsed = Math.min(
      playbackEnd,
      this.elapsed + delta * Number(this.speed.value),
    );
    if (this.elapsed >= playbackEnd) this.setPlaying(false);
    this.draw();
  }

  private bindControls(): void {
    const { signal } = this.listeners;
    for (const control of [this.timeline, this.replay, this.pause, this.speed])
      control.disabled = false;
    this.timeline.max = String(playbackEnd);
    this.timeline.addEventListener(
      'input',
      () => {
        this.setPlaying(false);
        this.elapsed = Number(this.timeline.value);
        this.draw();
      },
      { signal },
    );
    this.replay.addEventListener('click', () => this.restart(), { signal });
    this.pause.addEventListener(
      'click',
      () => {
        if (this.elapsed >= playbackEnd) this.restart();
        else this.setPlaying(!this.playing);
      },
      { signal },
    );
    window.addEventListener(
      'keydown',
      (event) => {
        if (
          event.code === 'KeyT' &&
          !event.repeat &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.metaKey
        ) {
          event.preventDefault();
          this.restart();
        }
      },
      { signal },
    );
  }

  private setPlaying(playing: boolean): void {
    this.playing = playing;
    this.pause.textContent = playing ? 'Tạm dừng' : 'Tiếp tục';
  }

  private restart(): void {
    this.elapsed = 0;
    this.setPlaying(true);
    this.draw();
  }

  private draw(): void {
    const t = this.elapsed;
    this.timeline.value = String(Math.floor(t));
    const landed = this.volley.draw(t);
    const phase =
      t < firstLaunch
        ? 'Chỉ kiếm'
        : t < quietAt
          ? 'Kiếm lần lượt bay lên'
          : t < fallAt
            ? 'Kiếm khuất · Còn dấu trên đất'
            : t < completeAt
              ? `Kiếm rơi · ${landed}/${swordCount} vụ nổ nhỏ`
              : `${swordCount}/${swordCount} thanh đã chạm đất`;
    if (this.status.textContent !== phase) this.status.textContent = phase;
  }

  private snapshot() {
    return {
      elapsed: this.elapsed,
      playing: this.playing,
      quietAt,
      fallAt,
      completeAt,
      ...this.volley.snapshot(),
    };
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'preview-game',
  backgroundColor: '#182219',
  scene: [VanKiemVfxPreview],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width,
    height,
  },
  render: { antialias: true, antialiasGL: true, pixelArt: false },
  input: { keyboard: false, mouse: false, touch: false },
  audio: { noAudio: true },
});
