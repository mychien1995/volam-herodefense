import Phaser from 'phaser';
import './visual-upgrade-2.css';
import {
  shaolinDaoAtlas as atlas,
  shaolinDaoAtlasPath,
  shaolinDaoPivot,
  shaolinDaoSweep,
} from './shaolin-dao-art.js';

const arena = '/assets/visual-upgrade-2/';
const propPositions = [
  ['statue', 740, 470],
  ['merchant', 360, 420],
  ['portal', 1110, 420],
  ['banner', 520, 425],
  ['banner', 960, 425],
  ['banner', 450, 850],
  ['banner', 1030, 850],
  ['tree-jade', 190, 690],
  ['tree-blossom', 1295, 690],
] as const;
const vectors = {
  down: [0, 1],
  up: [0, -1],
  left: [-1, 0],
  right: [1, 0],
} as const;
type Facing = keyof typeof vectors;
type Cast = 'a' | 'q' | 't';

/** Choreography for the visual review. This scene has no match connection. */
class ShaolinDaoPreview extends Phaser.Scene {
  private hero!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private facing: Facing = 'right';
  private castUntil = 0;
  private walkMs = 0;
  private halo: Phaser.GameObjects.Image | undefined;
  private readonly effects = new Set<Phaser.GameObjects.Image>();
  private readonly seen = new Set<string>();
  private readonly notice = document.querySelector('#skill-name')!;
  private readonly buttons =
    document.querySelectorAll<HTMLButtonElement>('button[data-cast]');

  preload(): void {
    const root = shaolinDaoAtlasPath;
    this.load.atlas(atlas, root + '.png', root + '.json');
    this.load.image('ground', arena + 'ground.png');
    for (const prop of new Set(propPositions.map(([name]) => name)))
      this.load.image(prop, arena + prop + '.png');
    this.load.image('dummy', '/assets/chu/training_dummy.png');
  }

  create(): void {
    this.add.image(0, 0, 'ground').setOrigin(0).setDepth(-1);
    for (const [prop, x, y] of propPositions)
      this.add
        .image(x, y, prop)
        .setOrigin(0.5, 368 / 384)
        .setDepth(y);
    this.add.image(965, 720, 'dummy').setOrigin(0.5, 1).setDepth(720);
    this.hero = this.add
      .sprite(740, 720, atlas, 'idle_right')
      .setOrigin(...shaolinDaoPivot)
      .setDepth(720);
    this.cameras.main.setBounds(0, 0, 1478, 1064).centerOn(740, 555);
    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    for (const button of this.buttons) {
      const action = button.dataset['cast'] as Cast;
      button.disabled = false;
      button.onclick = () => this.cast(action);
      keyboard.on('keydown-' + action.toUpperCase(), (event: KeyboardEvent) => {
        if (!event.repeat) this.cast(action);
      });
    }
    if (new URLSearchParams(location.search).has('debug')) {
      Object.defineProperty(window, '__SHAOLIN_DAO_PREVIEW__', {
        value: () => ({
          facing: this.facing,
          x: this.hero.x,
          y: this.hero.y,
          frame: this.hero.frame.name,
          seen: [...this.seen],
          effects: [...this.effects].map((sprite) => ({
            frame: sprite.frame.name,
            x: sprite.x,
            y: sprite.y,
            depth: sprite.depth,
          })),
          depth: this.hero.depth,
        }),
      });
    }
  }

  override update(time: number, delta: number): void {
    if (time < this.castUntil) return;
    const x =
      Number(this.cursors.right.isDown) - Number(this.cursors.left.isDown);
    const y = Number(this.cursors.down.isDown) - Number(this.cursors.up.isDown);
    if (x || y)
      this.facing = x ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up';
    if (this.halo) {
      this.pose('lotus');
      return;
    }
    if (!x && !y) {
      this.walkMs = 0;
      this.pose('idle');
      return;
    }
    const step = (Math.min(delta, 50) * 0.15) / Math.hypot(x, y);
    this.hero.x = Phaser.Math.Clamp(this.hero.x + x * step, 500, 1075);
    this.hero.y = Phaser.Math.Clamp(this.hero.y + y * step, 500, 820);
    this.hero.setDepth(this.hero.y);
    this.walkMs += delta;
    this.pose(Math.floor(this.walkMs / 120) % 2 ? 'walk_2' : 'walk_1');
  }

  private pose(pose: string): void {
    const frame = pose + '_' + this.facing;
    if (this.hero.frame.name !== frame) this.hero.setFrame(frame);
    this.seen.add(frame);
  }

  private effect(frame: string, x: number, y: number, depth: number) {
    const sprite = this.add.image(x, y, atlas, frame).setDepth(depth);
    this.effects.add(sprite);
    this.seen.add(frame);
    return sprite;
  }

  private remove(sprite: Phaser.GameObjects.Image): void {
    this.effects.delete(sprite);
    sprite.destroy();
  }

  private aim(sprite: Phaser.GameObjects.Image): void {
    const [dx, dy] = vectors[this.facing];
    sprite.setFlipX(dx < 0).setRotation(dy * Math.PI * 0.5);
  }

  private cast(action: Cast): void {
    if (this.time.now < this.castUntil) return;
    if (action === 't') {
      const active = !this.halo;
      if (this.halo) {
        this.remove(this.halo);
        this.halo = undefined;
        this.pose('idle');
      } else {
        this.halo = this.effect(
          'lotus_ring',
          this.hero.x,
          this.hero.y - 72,
          this.hero.depth - 1,
        );
        this.pose('lotus');
      }
      document
        .querySelector('[data-cast=t]')!
        .setAttribute('aria-pressed', String(active));
      this.notice.textContent = active ? 'Như Lai Thiên Diệp' : '';
      return;
    }
    if (this.halo) this.cast('t');
    this.castUntil = this.time.now + (action === 'a' ? 390 : 710);
    const [dx, dy] = vectors[this.facing];
    const { x, y, depth } = this.hero;
    if (action === 'a') {
      this.time.delayedCall(105, () => {
        this.pose('strike');
        const qi = this.effect(
          'crescent',
          x + 55 * dx,
          y - 37 + 55 * dy,
          depth + 1,
        );
        this.aim(qi);
        this.tweens.add({
          targets: qi,
          x: qi.x + dx * 235,
          y: qi.y + dy * 235,
          duration: 470,
          onComplete: () => this.remove(qi),
        });
      });
      return;
    }
    this.notice.textContent = 'Tru Tà';
    const layout = shaolinDaoSweep;
    const arhat = this.effect(
      'arhat',
      x - dx * layout.arhatBackX,
      y - layout.arhatLift - dy * layout.arhatBackY,
      depth - 1,
    )
      .setOrigin(0.5, 1)
      .setAlpha(0.15)
      .setFlipX(dx < 0);
    this.tweens.add({ targets: arhat, alpha: 1, duration: 175 });
    this.time.delayedCall(195, () => {
      this.pose('strike');
      const sweep = this.effect(
        'sweep',
        x + layout.frontX * dx,
        y - layout.lift + layout.frontY * dy,
        depth + 2,
      );
      this.aim(sweep);
      this.tweens.add({
        targets: arhat,
        x: arhat.x + dx * 12,
        y: arhat.y + dy * 8,
        duration: 140,
      });
      this.tweens.add({
        targets: sweep,
        delay: 120,
        alpha: 0,
        duration: 260,
        onComplete: () => this.remove(sweep),
      });
      this.tweens.add({
        targets: arhat,
        delay: 150,
        alpha: 0,
        duration: 330,
        onComplete: () => this.remove(arhat),
      });
    });
    this.time.delayedCall(710, () => {
      this.notice.textContent = '';
    });
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'visual-game',
  width: innerWidth,
  height: innerHeight,
  render: { antialias: false, roundPixels: true, pixelArt: true },
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: ShaolinDaoPreview,
  audio: { noAudio: true },
});
