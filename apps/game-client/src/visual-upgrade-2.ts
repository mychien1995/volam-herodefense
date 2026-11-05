import Phaser from 'phaser';
import './visual-upgrade-2.css';

const root = '/assets/visual-upgrade-2/';
const directions = ['down', 'up', 'left', 'right'] as const;
type Direction = (typeof directions)[number];
const skills = [
  ['that_tinh_kiem', 'Thất Tinh Kiếm'],
  ['nhan_kiem_hop_nhat', 'Nhân Kiếm Hợp Nhất'],
  ['bat_quai_kiem_tran', 'Bát Quái Kiếm Trận'],
  ['toa_sat_bac_do', 'Tọa Sát Bác Đồ'],
  ['van_kiem_quy_tong', 'Vạn Kiếm Quy Tông'],
] as const;
type SkillId = (typeof skills)[number][0];
type Effect = {
  sprite: Phaser.GameObjects.Sprite;
  skill: SkillId;
  born: number;
  lifetime: number;
  follow: boolean;
  vx: number;
  vy: number;
};
const vectors = {
  down: [0, 1],
  up: [0, -1],
  left: [-1, 0],
  right: [1, 0],
} as const;
const field = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

/** Interactive artwork review. Animation clocks here describe presentation clips. */
class VisualUpgradeScene extends Phaser.Scene {
  private hero!: Phaser.GameObjects.Sprite;
  private direction: Direction = 'down';
  private keys = new Set<string>();
  private effects: Effect[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];
  private companions: Phaser.GameObjects.Sprite[] = [];
  private castUntil = 0;
  private shoutUntil = 0;
  private readonly seen = new Set<string>();
  private readonly casts: string[] = [];
  private readonly frameTimes = new Map<string, number[]>();
  private readonly obstacles = [
    { x: 740, y: 470, w: 96, h: 30 },
    { x: 190, y: 690, w: 38, h: 26 },
    { x: 1295, y: 690, w: 38, h: 26 },
  ];

  constructor() {
    super('VisualUpgrade');
  }

  preload(): void {
    this.load.image('upgrade-ground', root + 'ground.png');
    this.load.atlas('upgrade-hero', root + 'hero.png', root + 'hero.json');
    for (const name of [
      'statue',
      'tree-jade',
      'tree-blossom',
      'banner',
      'bamboo',
      'merchant',
      'portal',
      'lantern',
    ])
      this.load.image('upgrade-' + name, root + name + '.png');
    for (const [id] of skills)
      this.load.atlas(id, root + id + '.png', root + id + '.json');
  }

  create(): void {
    this.add.image(0, 0, 'upgrade-ground').setOrigin(0).setDepth(-1000);
    for (const direction of directions) {
      this.anims.create({
        key: 'idle-' + direction,
        frames: [{ key: 'upgrade-hero', frame: `idle_${direction}_0` }],
        frameRate: 1,
        repeat: -1,
      });
      this.anims.create({
        key: 'walk-' + direction,
        frames: [0, 1, 2, 3].map((i) => ({
          key: 'upgrade-hero',
          frame: `walk_${direction}_${i}`,
        })),
        frameRate: 1000 / 110,
        repeat: -1,
      });
      this.anims.create({
        key: 'cast-' + direction,
        frames: [
          { key: 'upgrade-hero', frame: `idle_${direction}_0`, duration: 70 },
          { key: 'upgrade-hero', frame: `cast_${direction}_0`, duration: 160 },
          { key: 'upgrade-hero', frame: `idle_${direction}_0`, duration: 70 },
        ],
        frameRate: 1000,
        repeat: 0,
      });
    }
    this.prop('statue', 740, 470);
    this.prop('merchant', 360, 420);
    this.prop('portal', 1110, 420);
    for (const [x, y] of [
      [520, 425],
      [960, 425],
      [450, 850],
      [1030, 850],
    ])
      this.prop('banner', x!, y!);
    for (const [x, y] of [
      [650, 474],
      [830, 474],
      [370, 550],
      [1110, 550],
    ])
      this.prop('lantern', x!, y!, 0.48);
    for (const [name, x, y] of [
      ['tree-jade', 190, 690],
      ['tree-blossom', 1295, 690],
      ['tree-blossom', 300, 1060],
      ['tree-jade', 1230, 1060],
      ['bamboo', 105, 420],
      ['bamboo', 1390, 440],
    ] as const)
      this.prop(name, x, y);
    this.hero = this.add
      .sprite(740, 665, 'upgrade-hero', 'idle_down_0')
      .setOrigin(0.5, 0.8)
      .setDepth(665);
    this.hero.play('idle-down');
    this.observe(this.hero);
    this.cameras.main
      .setBounds(0, 0, 1478, 1064)
      .setRoundPixels(true)
      .centerOn(740, 545);
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(
          event.key,
        )
      )
        event.preventDefault();
      if (event.key === 'Escape') {
        this.menu(false);
        return;
      }
      if (!field('skills-menu').hidden) return;
      this.keys.add(event.code);
      if (!event.repeat) {
        if (event.code === 'KeyA') this.cast('basic');
        const slot = ['KeyQ', 'KeyW', 'KeyE', 'KeyR'].indexOf(event.code);
        if (slot >= 0) this.cast(equipped[slot]!);
      }
    });
    this.input.keyboard!.on('keyup', (event: KeyboardEvent) =>
      this.keys.delete(event.code),
    );
    this.game.events.on(Phaser.Core.Events.BLUR, () => this.keys.clear());
    field('skills-toggle').onclick = () =>
      this.menu(field('skills-menu').hasAttribute('hidden'));
    field('skills-close').onclick = () => this.menu(false);
    field('party').onclick = () => this.setParty(!this.companions.length);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fit, this);
    this.fit();
    const review = {
      ready: true,
      cast: (id: SkillId | 'basic') => this.cast(id),
      party: (enabled: boolean) => this.setParty(enabled),
      snapshot: () => ({
        phaser: Phaser.VERSION,
        viewport: [this.scale.width, this.scale.height],
        canvas: [this.game.canvas.width, this.game.canvas.height],
        zoom: this.cameras.main.zoom,
        hero: {
          x: this.hero.x,
          y: this.hero.y,
          direction: this.direction,
          frame: this.hero.frame.name,
          animation: this.hero.anims.currentAnim?.key,
          scale: this.hero.scaleX,
          pivot: [this.hero.originX, this.hero.originY],
        },
        seen: [...this.seen],
        casts: [...this.casts],
        frames: Object.fromEntries(this.frameTimes),
        effects: this.effects.map((e) => ({
          skill: e.skill,
          frame: e.sprite.frame.name,
          x: e.sprite.x,
          y: e.sprite.y,
          vx: e.vx,
          vy: e.vy,
        })),
        actors: 1 + this.companions.length,
        companionFeet: this.companions.map((sprite) => ({
          x: sprite.x - this.cameras.main.scrollX,
          y: sprite.y - this.cameras.main.scrollY,
        })),
        scenery: this.children.list
          .filter((o) => o.name.startsWith('upgrade-prop:'))
          .map((o) => ({
            name: o.name,
            depth: (o as Phaser.GameObjects.Image).depth,
          })),
      }),
    };
    Object.assign(window, { __VISUAL_UPGRADE__: review });
  }

  private fit(): void {
    this.cameras.main.setZoom(
      Math.max(1, this.scale.width / 1478, this.scale.height / 1064),
    );
  }

  private prop(name: string, x: number, y: number, scale = 1): void {
    this.add
      .image(x, y, 'upgrade-' + name)
      .setOrigin(0.5, 368 / 384)
      .setScale(scale)
      .setDepth(y)
      .setName('upgrade-prop:' + name);
  }

  private observe(sprite: Phaser.GameObjects.Sprite): void {
    const note = () => {
      const id = sprite.texture.key + ':' + sprite.frame.name;
      this.seen.add(id);
      const times = this.frameTimes.get(id) ?? [];
      if (times.length < 12) times.push(this.time.now);
      this.frameTimes.set(id, times);
    };
    sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, note);
    sprite.on(Phaser.Animations.Events.ANIMATION_START, note);
    note();
  }

  private menu(open: boolean): void {
    field('skills-menu').hidden = !open;
    this.keys.clear();
  }

  private setParty(enabled: boolean): void {
    for (const sprite of this.companions) sprite.destroy();
    this.companions = [];
    if (enabled)
      for (const [index, offset] of [
        [-180, -40],
        [180, -40],
        [-140, 110],
        [140, 110],
        [0, 100],
      ].entries()) {
        const sprite = this.add
          .sprite(
            this.hero.x + offset[0]!,
            this.hero.y + offset[1]!,
            'upgrade-hero',
          )
          .setOrigin(0.5, 0.8);
        sprite
          .setData('startX', sprite.x)
          .setData('startY', sprite.y)
          .setData('index', index);
        sprite.play('walk-' + directions[index % 4]!);
        this.observe(sprite);
        this.companions.push(sprite);
      }
    field('party').textContent = enabled ? '1 nhân vật' : '6 nhân vật';
  }

  private effect(
    skill: SkillId,
    lifetime: number,
    options: Partial<Pick<Effect, 'follow' | 'vx' | 'vy'>> = {},
  ): Effect {
    const sprite = this.add.sprite(
      this.hero.x,
      this.hero.y - 35,
      skill,
      'phase_0',
    );
    const effect = {
      sprite,
      skill,
      born: this.time.now,
      lifetime,
      follow: false,
      vx: 0,
      vy: 0,
      ...options,
    };
    this.effects.push(effect);
    return effect;
  }

  cast(id: SkillId | 'basic'): void {
    this.menu(false);
    for (const timer of this.timers) timer.remove(false);
    this.timers = [];
    for (const effect of this.effects) effect.sprite.destroy();
    this.effects = [];
    this.casts.push(id);
    this.castUntil = this.time.now + 300;
    this.hero.play('cast-' + this.direction);
    const [vx, vy] = vectors[this.direction];
    const angle = Phaser.Math.RadToDeg(Math.atan2(vy, vx));
    field('skill-name').textContent =
      id === 'basic' ? 'Võ Đang Kiếm' : skills.find((s) => s[0] === id)![1];
    this.shoutUntil = this.time.now + 1900;
    if (id === 'basic' || id === 'that_tinh_kiem') {
      const strikes = id === 'basic' ? 1 : 7;
      for (let i = 0; i < strikes; i++)
        this.timers.push(
          this.time.delayedCall(i * 145, () => {
            this.castUntil = this.time.now + 180;
            this.hero.play('cast-' + this.direction, false);
            const effect = this.effect('that_tinh_kiem', 400);
            effect.sprite
              .setPosition(this.hero.x + vx * 45, this.hero.y - 25 + vy * 35)
              .setAngle(angle)
              .setScale(0.55);
          }),
        );
    } else if (id === 'nhan_kiem_hop_nhat') {
      const effect = this.effect(id, 1900, { vx: vx * 200, vy: vy * 200 });
      effect.sprite.setAngle(angle).setScale(0.65);
    } else if (id === 'bat_quai_kiem_tran') {
      const effect = this.effect(id, 3200);
      effect.sprite
        .setPosition(this.hero.x, this.hero.y + 8)
        .setDepth(this.hero.y - 2)
        .setScale(1.25);
    } else if (id === 'toa_sat_bac_do') {
      this.effect(id, 5000, { follow: true });
    } else {
      this.effect(id, 4000, { follow: true }).sprite.setScale(1.35);
    }
  }

  override update(_time: number, delta: number): void {
    if (!this.hero) return;
    const x =
      Number(this.keys.has('ArrowRight')) - Number(this.keys.has('ArrowLeft'));
    const y =
      Number(this.keys.has('ArrowDown')) - Number(this.keys.has('ArrowUp'));
    if (this.time.now >= this.castUntil) {
      if (x || y) {
        this.direction = x ? (x > 0 ? 'right' : 'left') : y > 0 ? 'down' : 'up';
        const length = Math.hypot(x, y);
        const step = Math.min(delta, 50) * 0.18;
        const nextX = Phaser.Math.Clamp(
          this.hero.x + (x / length) * step,
          55,
          1423,
        );
        const nextY = Phaser.Math.Clamp(
          this.hero.y + (y / length) * step,
          130,
          1010,
        );
        if (
          !this.obstacles.some(
            (o) =>
              Math.abs(nextX - o.x) < o.w / 2 &&
              Math.abs(nextY - o.y) < o.h / 2,
          )
        )
          this.hero.setPosition(nextX, nextY);
        this.hero.play('walk-' + this.direction, true);
        this.cameras.main.centerOn(this.hero.x, this.hero.y - 120);
      } else this.hero.play('idle-' + this.direction, true);
    }
    this.hero.setDepth(this.hero.y);
    for (const sprite of this.companions) {
      const phase = this.time.now / 700 + sprite.getData('index');
      const movingRight = Math.cos(phase) > 0;
      sprite
        .setPosition(
          sprite.getData('startX') + Math.sin(phase) * 34,
          sprite.getData('startY'),
        )
        .setDepth(sprite.y);
      sprite.play('walk-' + (movingRight ? 'right' : 'left'), true);
    }
    this.effects = this.effects.filter((effect) => {
      const elapsed = this.time.now - effect.born;
      if (elapsed >= effect.lifetime) {
        effect.sprite.destroy();
        return false;
      }
      const progress = elapsed / effect.lifetime;
      let index =
        progress < 0.12
          ? 0
          : progress > 0.85
            ? 3
            : 1 + (Math.floor(elapsed / 170) % 2);
      if (effect.skill === 'that_tinh_kiem')
        index = Math.min(7, Math.floor(progress * 8));
      if (effect.skill === 'van_kiem_quy_tong')
        index = Math.floor(elapsed / 150) % 4;
      effect.sprite.setFrame('phase_' + index);
      this.seen.add(effect.skill + ':phase_' + index);
      if (effect.follow)
        effect.sprite
          .setPosition(this.hero.x, this.hero.y - 38)
          .setDepth(this.hero.y + 1);
      if (effect.skill === 'nhan_kiem_hop_nhat' && elapsed < 900) {
        effect.sprite.x += (effect.vx * Math.min(delta, 50)) / 1000;
        effect.sprite.y += (effect.vy * Math.min(delta, 50)) / 1000;
      }
      if (effect.skill !== 'bat_quai_kiem_tran')
        effect.sprite.setDepth(this.hero.y + 1);
      return true;
    });
    if (this.time.now >= this.shoutUntil) field('skill-name').textContent = '';
  }
}

const scene = new VisualUpgradeScene();
const equipped: SkillId[] = skills.slice(0, 4).map((s) => s[0]);
const hotbar = field('hotbar-buttons');
function renderHotbar(): void {
  hotbar.replaceChildren();
  for (const [index, id] of ['basic', ...equipped].entries()) {
    const button = document.createElement('button');
    const key = document.createElement('b');
    key.textContent = ['A', 'Q', 'W', 'E', 'R'][index]!;
    button.append(
      key,
      id === 'basic' ? 'Đánh thường' : skills.find((s) => s[0] === id)![1],
    );
    button.onclick = () => scene.cast(id as SkillId | 'basic');
    hotbar.append(button);
  }
}
renderHotbar();
for (const [id, name] of skills) {
  const button = document.createElement('button');
  button.textContent = name;
  button.onclick = () => scene.cast(id);
  field('skill-list').append(button);
}
field('swap-r').onclick = () => {
  equipped[3] =
    equipped[3] === 'toa_sat_bac_do' ? 'van_kiem_quy_tong' : 'toa_sat_bac_do';
  renderHotbar();
  field('skills-menu').hidden = true;
};
new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'visual-game',
  width: innerWidth,
  height: innerHeight,
  render: { antialias: true, roundPixels: true },
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene,
  audio: { noAudio: true },
});
