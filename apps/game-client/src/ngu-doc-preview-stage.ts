import Phaser from 'phaser';
import {
  demoTargets,
  directions,
  effectClips,
  facings,
  minionClips,
  type Branch,
  type Facing,
  type Minion,
  type Point,
  type TargetMode,
} from './ngu-doc-preview-data';

const atlasRoot = '../../../assets/exports/ngu-doc-preview-v01/';
const assets = import.meta.glob<string>(
  '../../../assets/exports/ngu-doc-preview-v01/*.{png,json}',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
);
const arenaRoot = '/assets/visual-upgrade-2/';
const props = [
  ['statue', 740, 470, 1],
  ['merchant', 360, 420, 1],
  ['portal', 1110, 420, 1],
  ['tree-jade', 190, 690, 1],
  ['tree-blossom', 1295, 690, 1],
  ['tree-blossom', 300, 1060, 1],
  ['tree-jade', 1230, 1060, 1],
  ['banner', 520, 425, 1],
  ['banner', 960, 425, 1],
  ['banner', 450, 850, 1],
  ['banner', 1030, 850, 1],
  ['lantern', 650, 474, 0.48],
  ['lantern', 830, 474, 0.48],
  ['bamboo', 105, 420, 1],
  ['bamboo', 1390, 440, 1],
] as const;
const elapsedLimit = 50;
const home = { x: 708, y: 685 };
const movement = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
type Sprite = Phaser.GameObjects.Sprite;
type Transient = Sprite | Phaser.GameObjects.Text;
type FxOptions = {
  under?: boolean;
  duration?: number;
  clip?: keyof typeof effectClips;
  scale?: number;
};

export class NguDocStage extends Phaser.Scene {
  protected branch: Branch = 'bich-co';
  protected facing: Facing = 'down';

  protected actor!: Sprite;
  protected readonly keys = new Set<string>();
  protected readonly summons = new Map<Sprite, Minion>();
  protected readonly stages: { name: string; time: number }[] = [];
  protected castUntil = 0;
  private readonly timers = new Set<Phaser.Time.TimerEvent>();
  private readonly transient = new Set<Transient>();
  private readonly dummies: {
    actor: Sprite;
    caption: Phaser.GameObjects.Text;
  }[] = [];

  preload(): void {
    for (const id of ['bich-co', 'am-linh', 'minions', 'effects']) {
      this.load.atlas(
        id,
        assets[atlasRoot + id + '.png']!,
        assets[atlasRoot + id + '.json']!,
      );
    }
    for (const name of new Set(['ground', ...props.map(([id]) => id)])) {
      this.load.image(name, arenaRoot + name + '.png');
    }
    this.load.atlas(
      'review-target',
      arenaRoot + 'hero.png',
      arenaRoot + 'hero.json',
    );
  }

  create(): void {
    this.add.image(0, 0, 'ground').setOrigin(0).setDepth(-1000);
    for (const [id, x, y, scale] of props) {
      this.add
        .image(x, y, id)
        .setOrigin(0.5, 368 / 384)
        .setScale(scale)
        .setDepth(y);
    }
    for (const branch of ['bich-co', 'am-linh'] as const) {
      for (const direction of facings) {
        this.sequence(
          branch + '-' + direction,
          branch,
          [0, 1, 2, 3].map((i) => 'walk_' + direction + '_' + i),
          110,
          -1,
        );
        this.sequence(
          branch + '-cast-' + direction,
          branch,
          [
            'idle_' + direction + '_0',
            'cast_' + direction + '_0',
            'idle_' + direction + '_0',
          ],
          [70, 155, 90],
        );
      }
    }
    for (const [id, frames] of Object.entries(effectClips)) {
      const looping = id === 'ring' || id === 'pool' || id === 'flame';
      this.sequence(
        id,
        'effects',
        frames,
        id === 'flame' ? 105 : 150,
        looping ? -1 : 0,
      );
    }
    for (const [id, frames] of Object.entries(minionClips)) {
      this.sequence(
        id + '-move',
        'minions',
        frames.walk,
        id === 'reaper' ? 200 : 160,
        -1,
      );
      this.sequence(
        id + '-hit',
        'minions',
        [...frames.attack, frames.idle],
        [170, 210, 130],
      );
    }
    this.sequence(
      'reaper-slam',
      'minions',
      ['reaper_raise', 'reaper_slam', 'reaper_idle'],
      [310, 260, 140],
    );

    this.actor = this.add
      .sprite(home.x, home.y, this.branch, 'idle_down_0')
      .setOrigin(0.5, 118 / 144)
      .setDepth(home.y);
    for (const target of demoTargets) {
      const boss = target.type === 'boss';
      this.dummies.push({
        actor: this.add
          .sprite(target.x, target.y, 'review-target', 'idle_left_0')
          .setOrigin(0.5, 0.8)
          .setDepth(target.y)
          .setScale(boss ? 1.14 : 0.73)
          .setTint(boss ? 0xd9ae8c : 0xc4c5ad),
        caption: this.add
          .text(target.x, target.y + 8, target.name, {
            fontFamily: 'sans-serif',
            fontSize: '11px',
            color: '#fff0c7',
            backgroundColor: '#272219df',
            padding: { x: 4, y: 2 },
          })
          .setOrigin(0.5, 0)
          .setDepth(target.y + 1),
      });
    }
    this.cameras.main
      .setBounds(0, 0, 1478, 1064)
      .setRoundPixels(true)
      .centerOn(740, 600);
    this.scale.on(Phaser.Scale.Events.RESIZE, () =>
      this.cameras.main.centerOn(740, 600),
    );
    this.game.events.on(Phaser.Core.Events.BLUR, () => this.keys.clear());
    window.addEventListener('blur', () => this.keys.clear());
  }

  private sequence(
    key: string,
    texture: string,
    frames: readonly string[],
    timing: number | number[],
    repeat = 0,
  ): void {
    // Phaser adds each per-frame hold to the base 1 ms.
    this.anims.create({
      key,
      frameRate: 1000,
      repeat,
      frames: frames.map((frame, i) => ({
        key: texture,
        frame,
        duration: (typeof timing === 'number' ? timing : timing[i]!) - 1,
      })),
    });
  }

  protected track(name: string): void {
    if (this.stages.length >= 128) this.stages.shift();
    this.stages.push({ name, time: this.time.now });
  }

  protected stats() {
    return {
      branch: this.branch,
      direction: this.facing,
      x: this.actor.x,
      y: this.actor.y,
      frame: this.actor.frame.name,
      cameraZoom: this.cameras.main.zoom,
      effects: [...this.transient].map((sprite) => sprite.name),
      summons: [...this.summons].map(([sprite, type]) => ({
        type,
        frame: sprite.frame.name,
      })),
      stages: this.stages.slice(),
    };
  }

  protected clearStage(): void {
    for (const timer of this.timers) timer.remove(false);
    this.timers.clear();
    for (const item of this.transient) this.tweens.killTweensOf(item);
    for (const item of this.transient) item.destroy();
    this.transient.clear();
    this.summons.clear();
    this.castUntil = 0;
    this.stages.length = 0;
    this.actor.stop().setPosition(home.x, home.y).setDepth(home.y);
    this.facing = 'down';
    this.actor.setTexture(this.branch, 'idle_down_0');
  }

  protected setTargets(mode: TargetMode): void {
    this.dummies.forEach(({ actor, caption }, i) => {
      const visible = mode !== 'none' && (i > 0 || mode === 'boss');
      actor.setVisible(visible);
      caption.setVisible(visible);
    });
  }

  protected target(preferBoss: boolean, range = 350) {
    const candidates = demoTargets.filter(
      (target, i) =>
        this.dummies[i]!.actor.visible &&
        Phaser.Math.Distance.BetweenPoints(this.actor, target) <= range,
    );
    return (
      (preferBoss
        ? candidates.find((target) => target.type === 'boss')
        : undefined) ??
      candidates.sort(
        (a, b) =>
          Phaser.Math.Distance.BetweenPoints(this.actor, a) -
          Phaser.Math.Distance.BetweenPoints(this.actor, b),
      )[0]
    );
  }

  protected front(distance: number): Point {
    const direction = directions[this.facing];
    return {
      x: this.actor.x + direction.x * distance,
      y: this.actor.y + direction.y * distance,
    };
  }

  protected face(point: Point): void {
    const dx = point.x - this.actor.x;
    const dy = point.y - this.actor.y;
    if (Math.abs(dx) + Math.abs(dy) < 1) return;
    this.facing =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? 'right'
          : 'left'
        : dy > 0
          ? 'down'
          : 'up';
  }

  protected later(delay: number, fn: () => void): void {
    const timer = this.time.delayedCall(delay, () => {
      this.timers.delete(timer);
      fn();
    });
    this.timers.add(timer);
  }

  protected release(item: Transient): void {
    this.tweens.killTweensOf(item);
    this.transient.delete(item);
    if (item instanceof Phaser.GameObjects.Sprite) this.summons.delete(item);
    item.destroy();
  }

  private retain<T extends Transient>(item: T, duration?: number): T {
    this.transient.add(item);
    if (duration)
      this.later(duration, () => {
        if (this.transient.has(item)) this.release(item);
      });
    return item;
  }

  protected fx(frame: string, point: Point, options: FxOptions = {}): Sprite {
    const { under, duration, clip, scale = 1 } = options;
    const sprite = this.add
      .sprite(point.x, point.y, 'effects', frame)
      .setName(clip ?? frame)
      .setDepth(under ? 1 : 1065)
      .setScale(scale);
    if (clip) sprite.play(clip);
    return this.retain(sprite, duration);
  }

  protected shot(
    frame: string,
    from: Point,
    to: Point,
    duration: number,
    arrive?: () => void,
  ): Sprite {
    const sprite = this.fx(frame, from).setRotation(
      Phaser.Math.Angle.BetweenPoints(from, to),
    );
    this.tweens.add({
      targets: sprite,
      x: to.x,
      y: to.y,
      duration,
      onComplete: () => {
        this.release(sprite);
        arrive?.();
      },
    });
    return sprite;
  }

  protected count(point: Point): void {
    const label = this.retain(
      this.add
        .text(point.x, point.y - 119, '3', {
          fontFamily: 'sans-serif',
          fontSize: '20px',
          color: '#f4ffc1',
          stroke: '#28351e',
          strokeThickness: 5,
        })
        .setName('countdown')
        .setOrigin(0.5)
        .setDepth(1070),
      3000,
    );
    this.later(1000, () => label.setText('2'));
    this.later(2000, () => label.setText('1'));
  }

  protected castPose(ritual = false): void {
    if (ritual) {
      this.facing = 'down';
      this.actor.stop().setFrame('ritual_down_0');
      this.castUntil = this.time.now + 540;
    } else {
      this.actor.play(this.branch + '-cast-' + this.facing);
      this.castUntil = this.time.now + 315;
    }
  }

  protected minion(
    type: Minion,
    origin: Point,
    destination: Point,
    life: number,
  ): Sprite {
    const sprite = this.add
      .sprite(origin.x, origin.y, 'minions', minionClips[type].idle)
      .setOrigin(0.5, 157 / 192)
      .setName(type)
      .setFlipX(destination.x < origin.x)
      .setDepth(origin.y);
    this.summons.set(sprite, type);
    this.retain(sprite, life);
    sprite.play(type + '-move');
    this.tweens.add({
      targets: sprite,
      x: destination.x,
      y: destination.y,
      duration: type === 'reaper' ? 510 : 690,
      onUpdate: () => sprite.setDepth(sprite.y),
      onComplete: () => sprite.stop().setFrame(minionClips[type].idle),
    });
    return sprite;
  }

  protected minionHits(sprite: Sprite, type: 'jiangshi' | 'zombie'): void {
    const stride = type === 'jiangshi' ? 700 : 840;
    for (let delay = 760; delay < 4900; delay += stride)
      this.later(delay, () => sprite.play(type + '-hit'));
  }

  protected onMovement(): void {}

  override update(_time: number, delta: number): void {
    const dx =
      Number(this.keys.has('ArrowRight')) - Number(this.keys.has('ArrowLeft'));
    const dy =
      Number(this.keys.has('ArrowDown')) - Number(this.keys.has('ArrowUp'));
    if (this.time.now >= this.castUntil) {
      if (dx || dy) {
        this.face({ x: this.actor.x + dx, y: this.actor.y + dy });
        const step =
          (Math.min(delta, elapsedLimit) * 0.188) / Math.hypot(dx, dy);
        const x = Phaser.Math.Clamp(this.actor.x + dx * step, 440, 1090);
        const y = Phaser.Math.Clamp(this.actor.y + dy * step, 486, 836);
        this.actor
          .setPosition(x, y)
          .setDepth(y)
          .play(this.branch + '-' + this.facing, true);
      } else {
        this.actor.stop().setFrame('idle_' + this.facing + '_0');
      }
    }
    this.onMovement();
  }

  protected shouldCastFromKeydown(event: KeyboardEvent): boolean {
    if (event.target instanceof HTMLSelectElement) return false;
    if (movement.includes(event.code)) {
      event.preventDefault();
      this.keys.add(event.code);
      return false;
    }
    return !event.repeat && !event.ctrlKey && !event.altKey && !event.metaKey;
  }
}

export function at(point: Point, x: number, y: number): Point {
  return { x: point.x + x, y: point.y + y };
}
