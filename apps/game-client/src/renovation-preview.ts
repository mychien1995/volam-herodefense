import Phaser from 'phaser';
import './renovation-preview.css';

const base = '/assets/renovation-v1/';
const pageSize = 8;
const directions = ['down', 'left', 'right', 'up'] as const;
type Direction = (typeof directions)[number];
type Actor = {
  id: string;
  name: string;
  group: string;
  biome: string;
  height: number;
  canvas: [number, number];
  pivot: [number, number];
  frames: number;
  reuse?: { sheet: string; atlas: string };
};
type Place = {
  id: string;
  name: string;
  ground: string;
  props: { image: string; height: number }[];
};
type Catalog = { assets: Actor[]; scenes: Place[] };
type Selection = {
  scene?: string;
  group?: string;
  actor?: string;
  showGroup?: boolean;
  compare?: boolean;
  page?: number;
};
type Body = {
  definition: Actor;
  sprite: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  homeX: number;
  homeY: number;
  direction: Direction;
};
const groups: Record<string, string> = {
  heroes: '8 nhánh môn phái',
  wave_creeps: '20 quái xâm lăng',
  dungeon_creeps: '24 quái phó bản',
  wave_bosses: '5 wave boss · 7 dạng',
  dungeon_bosses: '4 boss phó bản',
  minions: '11 minion / trợ thủ',
};
const element = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const menu = () => element('art-menu');
const selects = {
  scene: element<HTMLSelectElement>('scene-select'),
  group: element<HTMLSelectElement>('group-select'),
  actor: element<HTMLSelectElement>('actor-select'),
};
const putOptions = (
  select: HTMLSelectElement,
  entries: { id: string; name: string }[],
) => {
  select.replaceChildren(
    ...entries.map(({ id, name }) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = name;
      return option;
    }),
  );
};

class RenovationScene extends Phaser.Scene {
  private catalog!: Catalog;
  private chosenScene = 'arena';
  private chosenGroup = 'heroes';
  private chosenActor = 'hero_vo_dang_kiem';
  private showGroup = true;
  private compare = false;
  private walking = false;
  private facing: Direction = 'down';
  private keys = new Set<string>();
  private bodies: Body[] = [];
  private environment: Phaser.GameObjects.Image[] = [];
  private original: Phaser.GameObjects.Image | undefined;
  private originalLabel: Phaser.GameObjects.Text | undefined;
  private queue: Promise<void> = Promise.resolve();
  private revision = 0;
  private ready = false;
  private observed = new Set<string>();
  private frameTimes: Record<string, number[]> = {};
  private failures: string[] = [];
  private pageIndex = 0;
  constructor() {
    super('RenovationReview');
  }
  preload(): void {
    this.load.json('renovation-catalog', base + 'catalog.json');
  }
  create(): void {
    this.catalog = this.cache.json.get('renovation-catalog') as Catalog;
    putOptions(selects.scene, this.catalog.scenes);
    putOptions(
      selects.group,
      Object.entries(groups).map(([id, name]) => ({ id, name })),
    );
    const close = () => {
      menu().hidden = true;
      this.keys.clear();
    };
    element('choose-art').onclick = () => {
      menu().hidden = !menu().hidden;
      this.keys.clear();
    };
    element('close-art').onclick = close;
    element('toggle-group').onclick = () =>
      void this.select({ showGroup: !this.showGroup });
    element('toggle-compare').onclick = () =>
      void this.select({ compare: !this.compare });
    element('toggle-walk').onclick = () => this.walk(!this.walking);
    element('previous-page').onclick = () =>
      void this.select({ page: Math.max(0, this.pageIndex - 1) });
    element('next-page').onclick = () =>
      void this.select({
        page: Math.min(this.pageCount() - 1, this.pageIndex + 1),
      });
    for (const direction of directions)
      element('face-' + direction).onclick = () => this.face(direction);
    selects.scene.onchange = () =>
      void this.select({ scene: selects.scene.value });
    selects.group.onchange = () =>
      void this.select({ group: selects.group.value });
    selects.actor.onchange = () =>
      void this.select({ actor: selects.actor.value });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (
        !menu().hidden ||
        (event.target instanceof HTMLElement &&
          ['SELECT', 'INPUT', 'TEXTAREA'].includes(event.target.tagName))
      )
        return;
      if (event.key.startsWith('Arrow')) {
        event.preventDefault();
        this.keys.add(event.key);
      }
    };
    const keyup = (event: KeyboardEvent) => {
      this.keys.delete(event.key);
    };
    const blur = () => this.keys.clear();
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', blur);
    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', blur);
    });
    this.scale.on('resize', () => {
      if (this.ready) {
        this.drawEnvironment();
        this.layoutBodies();
      }
    });
    window.__renovation = {
      select: (selection) => this.select(selection),
      face: (direction) => this.face(direction),
      walk: (enabled) => this.walk(enabled),
      snapshot: () => this.snapshot(),
    };
    void this.select({});
  }
  select(selection: Selection): Promise<void> {
    const revision = ++this.revision;
    this.ready = false;
    this.keys.clear();
    this.queue = this.queue
      .then(async () => {
        if (revision !== this.revision) return;
        if (selection.scene) this.chosenScene = selection.scene;
        if (selection.group) {
          this.chosenGroup = selection.group;
          this.pageIndex = 0;
          this.chosenActor = this.catalog.assets.find(
            (actor) => actor.group === selection.group,
          )!.id;
        }
        if (selection.actor) {
          const actor = this.catalog.assets.find(
            (actor) => actor.id === selection.actor,
          );
          if (!actor) throw Error('Unknown actor ' + selection.actor);
          this.chosenActor = actor.id;
          this.chosenGroup = actor.group;
          this.pageIndex = Math.floor(
            this.catalog.assets
              .filter((item) => item.group === actor.group)
              .findIndex((item) => item.id === actor.id) / pageSize,
          );
        }
        if (selection.page !== undefined) {
          this.pageIndex = Phaser.Math.Clamp(
            selection.page,
            0,
            this.pageCount() - 1,
          );
          this.chosenActor = this.catalog.assets.filter(
            (actor) => actor.group === this.chosenGroup,
          )[this.pageIndex * pageSize]!.id;
        }
        if (selection.showGroup !== undefined)
          this.showGroup = selection.showGroup;
        if (selection.compare !== undefined) this.compare = selection.compare;
        this.destroyBodies();
        this.environment.forEach((item) => item.destroy());
        this.environment = [];
        this.evictTextures();
        const actors = this.activeDefinitions();
        const place = this.catalog.scenes.find(
          (candidate) => candidate.id === this.chosenScene,
        )!;
        const old = this.catalog.assets.find(
          (actor) => actor.id === this.chosenActor,
        )!;
        let pending = 0;
        const image = (key: string, url: string) => {
          if (!this.textures.exists(key)) {
            this.load.image(key, url);
            pending++;
          }
        };
        image('review-ground', place.ground);
        place.props.forEach((prop, index) =>
          image('review-prop-' + index, prop.image),
        );
        for (const actor of actors) {
          const key = 'review-' + actor.id;
          if (!this.textures.exists(key)) {
            this.load.atlas(
              key,
              actor.reuse
                ? '/assets/visual-upgrade-2/hero.png'
                : base + actor.id + '.png',
              actor.reuse
                ? '/assets/visual-upgrade-2/hero.json'
                : base + actor.id + '.json',
            );
            pending++;
          }
        }
        if (this.compare)
          image('review-original', base + 'originals/' + old.id + '.png');
        if (pending)
          await new Promise<void>((resolve, reject) => {
            const error = (file: Phaser.Loader.File) => {
              const message = 'Failed to load ' + file.key;
              this.failures.push(message);
              reject(Error(message));
            };
            this.load.on('loaderror', error);
            this.load.once('complete', () => {
              this.load.off('loaderror', error);
              resolve();
            });
            this.load.start();
          });
        if (revision !== this.revision) return;
        this.drawEnvironment();
        for (const actor of actors) this.addBody(actor);
        this.layoutBodies();
        this.refreshMenu();
        this.ready = true;
      })
      .catch((error: unknown) => {
        const message = String(error);
        this.failures.push(message);
        element('review-status').textContent = message;
        console.error(error);
      });
    return this.queue;
  }
  private activeDefinitions(): Actor[] {
    if (!this.showGroup || this.compare)
      return this.catalog.assets.filter(
        (actor) => actor.id === this.chosenActor,
      );
    return this.catalog.assets
      .filter((actor) => actor.group === this.chosenGroup)
      .slice(this.pageIndex * pageSize, this.pageIndex * pageSize + pageSize);
  }
  private pageCount(): number {
    return Math.ceil(
      this.catalog.assets.filter((actor) => actor.group === this.chosenGroup)
        .length / pageSize,
    );
  }
  private evictTextures(): void {
    // Keep only the active group on the GPU. No accumulating 74 large atlases.
    for (const key of this.textures
      .getTextureKeys()
      .filter((key) => key.startsWith('review-')))
      this.textures.remove(key);
    for (const actor of this.catalog.assets)
      for (const direction of directions)
        for (const state of ['idle', 'walk'])
          this.anims.remove(actor.id + '-' + state + '-' + direction);
  }
  private destroyBodies(): void {
    for (const body of this.bodies) {
      body.sprite.destroy();
      body.label.destroy();
    }
    this.bodies = [];
    this.original?.destroy();
    this.originalLabel?.destroy();
    this.original = undefined;
    this.originalLabel = undefined;
  }
  private drawEnvironment(): void {
    this.environment.forEach((item) => item.destroy());
    this.environment = [];
    const w = this.scale.width,
      h = this.scale.height;
    const ground = this.add
      .image(w / 2, h / 2, 'review-ground')
      .setDepth(-10000);
    const cover = Math.max(w / ground.width, h / ground.height, 1);
    ground.setScale(cover);
    this.environment.push(ground);
    const place = this.catalog.scenes.find(
      (candidate) => candidate.id === this.chosenScene,
    )!;
    // Separate props preserve feet-based occlusion. The combat center stays open.
    const positions = [
      [0.1, 0.4],
      [0.9, 0.4],
      [0.07, 0.88],
      [0.93, 0.88],
      [0.43, 0.33],
      [0.87, 0.88],
    ];
    place.props.forEach((_prop, index) => {
      const position = positions[index]!;
      const x = w * position[0]!,
        y = h * position[1]!;
      const item = this.add
        .image(x, y, 'review-prop-' + index)
        .setOrigin(0.5, 368 / 384)
        .setDepth(y);
      this.environment.push(item);
    });
  }
  private addBody(definition: Actor): void {
    const key = 'review-' + definition.id;
    for (const direction of directions) {
      for (const state of ['idle', 'walk'])
        this.anims.create({
          key: definition.id + '-' + state + '-' + direction,
          frames: Array.from(
            { length: state === 'idle' ? 1 : 4 },
            (_, index) => ({ key, frame: `${state}_${direction}_${index}` }),
          ),
          frameRate: state === 'idle' ? 1 : 1000 / 110,
          repeat: -1,
        });
    }
    const sprite = this.add
      .sprite(0, 0, key, 'idle_down_0')
      .setOrigin(
        definition.pivot[0] / definition.canvas[0],
        definition.pivot[1] / definition.canvas[1],
      );
    const label = this.add
      .text(0, 0, definition.name, {
        fontFamily: 'Segoe UI',
        fontSize: '12px',
        color: '#fff4da',
        backgroundColor: '#122019d9',
        padding: { x: 5, y: 3 },
      })
      .setOrigin(0.5, 0);
    this.bodies.push({
      definition,
      sprite,
      label,
      homeX: 0,
      homeY: 0,
      direction: 'down',
    });
    sprite.on(
      'animationupdate',
      (_animation: unknown, frame: Phaser.Animations.AnimationFrame) => {
        const name = definition.id + ':' + frame.textureFrame;
        this.observed.add(name);
        const times = (this.frameTimes[name] ??= []);
        if (times.length < 5) times.push(this.time.now);
      },
    );
  }
  private layoutBodies(): void {
    const width = this.scale.width,
      height = this.scale.height;
    const count = this.bodies.length;
    const columns = Math.min(4, count);
    const rows = Math.ceil(count / columns);
    const left = width * 0.28,
      right = width * 0.72;
    const top = Math.max(250, height * (rows === 3 ? 0.34 : 0.43)),
      bottom = height - 135;
    this.bodies.forEach((body, index) => {
      const column = index % columns,
        row = Math.floor(index / columns);
      body.homeX =
        count === 1
          ? width * (this.compare ? 0.61 : 0.5)
          : Phaser.Math.Linear(
              left,
              right,
              columns === 1 ? 0.5 : column / (columns - 1),
            );
      body.homeY =
        rows === 1
          ? height * 0.56
          : Phaser.Math.Linear(top, bottom, row / (rows - 1));
      body.sprite.setPosition(body.homeX, body.homeY);
      body.label.setPosition(body.homeX, body.homeY + 10);
    });
    this.original?.destroy();
    this.originalLabel?.destroy();
    if (this.compare) {
      const definition = this.bodies[0]!.definition;
      this.textures
        .get('review-original')
        .setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.original = this.add
        .image(width * 0.39, height * 0.56, 'review-original')
        .setOrigin(0.5, 1);
      this.original
        .setScale(definition.height / this.original.height)
        .setDepth(this.original.y);
      this.originalLabel = this.add
        .text(
          this.original.x,
          this.original.y + 10,
          'Bản cũ · cùng chiều cao',
          {
            fontFamily: 'Segoe UI',
            fontSize: '13px',
            color: '#fff4da',
            backgroundColor: '#122019d9',
            padding: { x: 6, y: 4 },
          },
        )
        .setOrigin(0.5, 0)
        .setDepth(10000);
      this.bodies[0]!.label.setText(definition.name + ' · bản mới');
    }
  }
  private refreshMenu(): void {
    putOptions(
      selects.actor,
      this.catalog.assets.filter((actor) => actor.group === this.chosenGroup),
    );
    selects.scene.value = this.chosenScene;
    selects.group.value = this.chosenGroup;
    selects.actor.value = this.chosenActor;
    const chosen = this.catalog.assets.find(
      (actor) => actor.id === this.chosenActor,
    )!;
    element('actor-name').textContent = this.compare
      ? chosen.name + ' · so sánh'
      : this.showGroup
        ? groups[this.chosenGroup]!
        : chosen.name;
    element('scene-name').textContent =
      this.catalog.scenes.find((place) => place.id === this.chosenScene)!.name +
      ' · Renovation v1 · Chưa duyệt';
    element('review-status').textContent =
      `${this.catalog.assets.length} dạng · ${this.catalog.scenes.length - 1} phó bản · Trang ${this.pageIndex + 1}/${this.pageCount()}`;
    element<HTMLButtonElement>('previous-page').disabled =
      this.pageIndex === 0 || !this.showGroup || this.compare;
    element<HTMLButtonElement>('next-page').disabled =
      this.pageIndex >= this.pageCount() - 1 || !this.showGroup || this.compare;
    element('toggle-group').setAttribute(
      'aria-pressed',
      String(this.showGroup),
    );
    element('toggle-compare').setAttribute(
      'aria-pressed',
      String(this.compare),
    );
    const paths = chosen.reuse
      ? [
          '/assets/visual-upgrade-2/hero.png',
          '/assets/visual-upgrade-2/hero.json',
        ]
      : [base + chosen.id + '.png', base + chosen.id + '.json'];
    element('asset-links').replaceChildren(
      ...paths.map((path, index) => {
        const link = document.createElement('a');
        link.href = path;
        link.target = '_blank';
        link.textContent = index ? 'Atlas JSON' : 'PNG gốc';
        return link;
      }),
    );
  }
  face(direction: Direction): void {
    this.facing = direction;
    for (const body of this.bodies) body.direction = direction;
  }
  walk(enabled: boolean): void {
    this.walking = enabled;
    element('toggle-walk').setAttribute('aria-pressed', String(enabled));
  }
  override update(_time: number, delta: number): void {
    if (!this.ready) return;
    let dx =
      Number(this.keys.has('ArrowRight')) - Number(this.keys.has('ArrowLeft'));
    let dy =
      Number(this.keys.has('ArrowDown')) - Number(this.keys.has('ArrowUp'));
    const moving = menu().hidden && (dx !== 0 || dy !== 0);
    if (moving) {
      const length = Math.hypot(dx, dy);
      dx /= length;
      dy /= length;
      this.facing =
        Math.abs(dx) > Math.abs(dy)
          ? dx < 0
            ? 'left'
            : 'right'
          : dy < 0
            ? 'up'
            : 'down';
    }
    for (const body of this.bodies) {
      const selected = body.definition.id === this.chosenActor;
      const stationary = body.definition.id === 'tay_doc_snake';
      if (selected && moving && !stationary) {
        body.sprite.x = Phaser.Math.Clamp(
          body.sprite.x + dx * Math.min(delta, 40) * 0.13,
          70,
          this.scale.width - 70,
        );
        body.sprite.y = Phaser.Math.Clamp(
          body.sprite.y + dy * Math.min(delta, 40) * 0.13,
          180,
          this.scale.height - 120,
        );
        body.direction = this.facing;
      }
      const state = this.walking || (selected && moving) ? 'walk' : 'idle';
      body.sprite.play(
        body.definition.id + '-' + state + '-' + body.direction,
        true,
      );
      body.sprite.setDepth(body.sprite.y);
      body.label
        .setPosition(body.sprite.x, body.sprite.y + 10)
        .setDepth(body.sprite.y + 1);
      this.observed.add(body.definition.id + ':' + body.sprite.frame.name);
    }
  }
  snapshot() {
    return {
      page: this.pageIndex,
      pages: this.pageCount(),
      ready: this.ready,
      scene: this.chosenScene,
      group: this.chosenGroup,
      actor: this.chosenActor,
      showGroup: this.showGroup,
      compare: this.compare,
      facing: this.facing,
      walking: this.walking,
      menuOpen: !menu().hidden,
      failures: this.failures,
      roster: this.catalog.assets.map(({ id, group, frames }) => ({
        id,
        group,
        frames,
      })),
      scenes: this.catalog.scenes.map(({ id }) => id),
      textureCount: this.textures
        .getTextureKeys()
        .filter((key) => key.startsWith('review-')).length,
      observed: [...this.observed],
      frameTimes: this.frameTimes,
      viewport: {
        width: this.scale.width,
        height: this.scale.height,
        zoom: this.cameras.main.zoom,
      },
      actors: this.bodies.map((body) => ({
        id: body.definition.id,
        x: body.sprite.x,
        y: body.sprite.y,
        frame: body.sprite.frame.name,
        origin: [body.sprite.originX, body.sprite.originY],
        height: body.definition.height,
        scale: body.sprite.scale,
        direction: body.direction,
        depth: body.sprite.depth,
      })),
    };
  }
}
type Review = {
  select: (selection: Selection) => Promise<void>;
  face: (direction: Direction) => void;
  walk: (enabled: boolean) => void;
  snapshot: () => ReturnType<RenovationScene['snapshot']>;
};
declare global {
  interface Window {
    __renovation?: Review;
  }
}
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'renovation-game',
  backgroundColor: '#18251d',
  width: window.innerWidth,
  height: window.innerHeight,
  antialias: true,
  pixelArt: false,
  roundPixels: false,
  scale: { mode: Phaser.Scale.RESIZE },
  scene: RenovationScene,
  audio: { noAudio: true },
});
