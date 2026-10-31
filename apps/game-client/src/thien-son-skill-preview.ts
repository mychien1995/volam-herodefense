import Phaser from 'phaser';
import {
  preloadRasterAnimations,
  registerRasterAnimations,
  rasterAnimationKey,
  rasterAssetUrl,
  type RasterAnimation,
  type RasterComponent,
} from './skill-art-registry.js';
import './thien-son-skill-preview.css';

type Direction = 'down' | 'left' | 'right' | 'up';
type Mode = 'combined' | 'character' | 'vfx' | 'four' | 'six';
type Branch = 'counter' | 'expiry';
interface SkillInfo {
  id: string;
  nameVi: string;
  kind: string;
  style: string;
  icon: string;
  characterId: string;
  vfxId: string | null;
}
interface Manifest {
  complete: boolean;
  assets: RasterComponent[];
  skills: SkillInfo[];
  icons: Array<{ id: string; file: string }>;
}
interface Cue {
  asset: string;
  tag: string;
  at: number;
  repeat?: number;
  ttl?: number;
  holdFrame?: number;
  wrap?: boolean;
  when?: Branch;
}
interface Plan {
  id: string;
  style: string;
  duration: number;
  actors: Cue[];
  effects: Cue[];
  motion?: { at: number; duration: number; along: number; across: number };
  afterimageAt?: number;
}
interface View {
  sprite: Phaser.GameObjects.Sprite;
  asset: RasterComponent;
  tag: RasterAnimation;
  role: string;
  direction: Direction;
  owner?: View;
  depthDelta: number;
}
const directions: Direction[] = ['down', 'left', 'right', 'up'];
const vectors: Record<Direction, [number, number]> = {
  right: [1, 0],
  left: [-1, 0],
  down: [0, 1],
  up: [0, -1],
};
const baseline = ['hero_thien_son', 'hero_thien_son_dao'] as const;

/** Art-only route. Does not import commands, combat rules, rooms or loadouts. */
export class ThienSonSkillPreviewScene extends Phaser.Scene {
  private manifest!: Manifest;
  private plans: Plan[] = [];
  private components = new Map<string, RasterComponent>();
  private views = new Set<View>();
  private effects = new Set<View>();
  private roots: View[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private seen = new Map<string, Set<string>>();
  private times = new Map<string, Array<{ frame: string; at: number }>>();
  private errors: string[] = [];
  private panel?: HTMLElement;
  private icons?: HTMLElement;
  private status?: HTMLElement;
  private ground?: Phaser.GameObjects.Image;
  private selected = 'lien_hoa_phien';
  private direction: Direction = 'right';
  private mode: Mode = 'combined';
  private branch: Branch = 'counter';
  private auto = false;
  private ready = false;
  private cycle = 0;
  private completed = 0;
  private stageEvents: Array<{ stage: string; at: number; branch: Branch }> =
    [];
  private createdEffects = 0;
  private destroyedEffects = 0;
  constructor() {
    super('ThienSonSkillArtPreview');
  }
  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) =>
      this.errors.push(String(file.url)),
    );
    this.load.once(
      'filecomplete-json-ts-review-manifest',
      (_key: string, _type: string, data: Manifest) => {
        this.manifest = data;
        preloadRasterAnimations(this, data.assets);
        for (const icon of data.icons)
          this.load.image('ts-icon-' + icon.id, rasterAssetUrl(icon.file));
      },
    );
    this.load.json(
      'ts-review-manifest',
      '/assets/skills/thien-son/production_manifest_v01.json',
    );
    this.load.json(
      'ts-review-plan',
      '/assets/skills/thien-son/preview_plan_v01.json',
    );
    this.load.image('ts-review-ground', '/assets/arena_v2/ground.png');
    for (const id of baseline) {
      this.load.atlas(
        id,
        '/assets/characters/' + id + '.png',
        '/assets/characters/' + id + '.json',
      );
      this.load.json(id + '-review-meta', '/assets/characters/' + id + '.json');
    }
  }
  create(): void {
    if (!this.manifest?.complete)
      throw new Error('Thiên Sơn production manifest is incomplete');
    this.plans = (
      this.cache.json.get('ts-review-plan') as { plans: Plan[] }
    ).plans;
    const approved = baseline.map((id) => {
      const raw = this.cache.json.get(id + '-review-meta') as {
        frames: Record<string, { duration: number }>;
      };
      const animations: RasterAnimation[] = [];
      for (const pose of ['idle', 'walk', 'basic_attack'])
        for (const d of directions) {
          const frames = Object.keys(raw.frames)
            .filter((n) => n.startsWith(pose + '_' + d + '_'))
            .sort(
              (a, b) =>
                Number(a.split('_').at(-1)) - Number(b.split('_').at(-1)),
            );
          if (!frames.length)
            throw new Error('Approved baseline tag missing: ' + id + pose + d);
          animations.push({
            name: pose + '_' + d,
            frames,
            frameRate: 1000 / raw.frames[frames[0]!]!.duration,
            repeat: pose === 'basic_attack' ? 0 : -1,
            direction: d,
            origin: [0.5, 0.8],
            frameDimensions: [80, 80],
            stage: 'approved_' + pose,
            placement: 'character_feet',
            effectPlacementOffset: [0, 0],
          });
        }
      return {
        id,
        skillId: id === 'hero_thien_son' ? 'thien_son_phien' : 'thien_son_dao',
        kind: 'character' as const,
        sheet: 'assets/exports/characters/' + id + '.png',
        atlas: 'assets/exports/characters/' + id + '.json',
        origin: [0.5, 0.8] as [number, number],
        frameDimensions: [80, 80] as [number, number],
        animations,
      };
    });
    for (const a of [...this.manifest.assets, ...approved])
      this.components.set(a.id, a);
    registerRasterAnimations(this, [...this.components.values()]);
    this.cameras.main.setZoom(1);
    this.ground = this.add
      .image(this.scale.width / 2, this.scale.height / 2, 'ts-review-ground')
      .setDepth(-10000);
    this.textures
      .get('ts-review-ground')
      .setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const i of this.manifest.icons)
      this.textures
        .get('ts-icon-' + i.id)
        .setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.makeControls();
    const query = new URLSearchParams(location.search);
    if (this.manifest.skills.some((s) => s.id === query.get('skill')))
      this.selected = query.get('skill')!;
    if (directions.includes(query.get('facing') as Direction))
      this.direction = query.get('facing') as Direction;
    const bridge = Object.freeze({
      snapshot: () => this.inspect(),
      manifest: () => this.manifest,
      choose: (
        id: string,
        d: Direction = 'right',
        mode: Mode = 'combined',
        branch: Branch = 'counter',
      ) => this.choose(id, d, mode, branch),
      inspectAsset: (asset: string, tag: string) =>
        this.inspectAsset(asset, tag),
      clear: () => this.clearViews(),
      pause: () => this.scene.pause(),
      resume: () => this.scene.resume(),
    });
    Object.defineProperty(window, '__THIEN_SON_SKILL_REVIEW__', {
      configurable: true,
      value: bridge,
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.panel?.remove();
      this.icons?.remove();
      this.status?.remove();
      delete (window as unknown as Record<string, unknown>)[
        '__THIEN_SON_SKILL_REVIEW__'
      ];
      document.body.classList.remove('ts-skill-art');
    });
    this.ready = true;
    this.choose(this.selected, this.direction);
  }
  private makeControls(): void {
    document.body.classList.add('ts-skill-art');
    const host = document.querySelector<HTMLElement>('#viewport')!;
    const panel = document.createElement('section');
    panel.className = 'ts-art-controls';
    panel.setAttribute('aria-label', 'Thiên Sơn art preview controls');
    panel.innerHTML =
      '<strong>Thiên Sơn · prototype art preview</strong><select aria-label="Preview skill" id="ts-art-skill"></select><select aria-label="Preview facing" id="ts-art-facing">' +
      directions.map((d) => '<option>' + d + '</option>').join('') +
      '</select><select aria-label="Preview mode" id="ts-art-mode">' +
      ['combined', 'character', 'vfx', 'four', 'six']
        .map((m) => '<option>' + m + '</option>')
        .join('') +
      '</select><select aria-label="Counter branch" id="ts-art-branch"><option value="counter">Counter branch</option><option value="expiry">Expiry branch</option></select><button id="ts-art-play">Play</button><button id="ts-art-pause">Pause</button><label><input type="checkbox" id="ts-art-loop">Repeat preview</label><select aria-label="Contrast background" id="ts-art-terrain"><option value="arena">Arena</option><option value="light">Light QA</option><option value="dark">Dark QA</option></select>';
    const skill = panel.querySelector<HTMLSelectElement>('#ts-art-skill')!;
    for (const s of this.manifest.skills) {
      const o = document.createElement('option');
      o.value = s.id;
      o.textContent = s.nameVi;
      skill.append(o);
    }
    const select = (id: string) =>
      panel.querySelector<HTMLSelectElement>('#' + id)!;
    skill.onchange = () =>
      this.choose(skill.value, this.direction, this.mode, this.branch);
    select('ts-art-facing').onchange = () =>
      this.choose(
        this.selected,
        select('ts-art-facing').value as Direction,
        this.mode,
        this.branch,
      );
    select('ts-art-mode').onchange = () =>
      this.choose(
        this.selected,
        this.direction,
        select('ts-art-mode').value as Mode,
        this.branch,
      );
    select('ts-art-branch').onchange = () =>
      this.choose(
        this.selected,
        this.direction,
        this.mode,
        select('ts-art-branch').value as Branch,
      );
    panel.querySelector<HTMLButtonElement>('#ts-art-play')!.onclick = () =>
      this.choose(this.selected, this.direction, this.mode, this.branch);
    const pause = panel.querySelector<HTMLButtonElement>('#ts-art-pause')!;
    pause.onclick = () => {
      if (this.scene.isPaused()) {
        this.scene.resume();
        pause.textContent = 'Pause';
      } else {
        this.scene.pause();
        pause.textContent = 'Resume';
      }
    };
    panel.querySelector<HTMLInputElement>('#ts-art-loop')!.onchange = (e) => {
      this.auto = (e.target as HTMLInputElement).checked;
    };
    select('ts-art-terrain').onchange = () => {
      const value = select('ts-art-terrain').value;
      this.ground?.setVisible(value === 'arena');
      this.cameras.main.setBackgroundColor(
        value === 'dark' ? '#19332e' : '#ddd5b8',
      );
    };
    this.panel = panel;
    host.append(panel);
    const strip = document.createElement('nav');
    strip.className = 'ts-art-icons';
    strip.setAttribute('aria-label', 'Skill icons at 64 CSS pixels');
    for (const s of this.manifest.skills) {
      const button = document.createElement('button');
      button.dataset['skillId'] = s.id;
      button.title = s.nameVi;
      button.setAttribute('aria-label', s.nameVi);
      const img = document.createElement('img');
      img.src = rasterAssetUrl(s.icon);
      img.alt = s.nameVi;
      img.width = 64;
      img.height = 64;
      button.append(img);
      button.onclick = () =>
        this.choose(s.id, this.direction, this.mode, this.branch);
      strip.append(button);
    }
    this.icons = strip;
    host.append(strip);
    this.status = document.createElement('p');
    this.status.className = 'ts-art-note';
    host.append(this.status);
  }
  private syncControls(): void {
    for (const [id, value] of [
      ['skill', this.selected],
      ['facing', this.direction],
      ['mode', this.mode],
      ['branch', this.branch],
    ])
      this.panel!.querySelector<HTMLSelectElement>('#ts-art-' + id)!.value =
        value!;
    for (const button of this.icons!.querySelectorAll<HTMLButtonElement>(
      'button',
    ))
      button.setAttribute(
        'aria-pressed',
        String(button.dataset['skillId'] === this.selected),
      );
    this.panel!.querySelector<HTMLSelectElement>('#ts-art-branch')!.disabled =
      this.selected !== 'phong_anh_hoan_vi';
    const info = this.manifest.skills.find((s) => s.id === this.selected)!;
    this.status!.textContent =
      info.nameVi +
      ' · PRESENTATION ONLY · camera zoom 1 · ' +
      (info.kind === 'passive'
        ? 'Icon only; no aura.'
        : info.kind === 'normal'
          ? 'Approved basic animation reused.'
          : 'Provisional art timing; gameplay implementation pending.');
  }
  private tag(
    asset: RasterComponent,
    prefix: string,
    d: Direction,
  ): RasterAnimation {
    const t =
      asset.animations.find((t) => t.name === prefix + '_' + d) ??
      asset.animations.find((t) => t.name === prefix);
    if (!t)
      throw new Error(
        'Missing preview tag ' + asset.id + ':' + prefix + '_' + d,
      );
    return t;
  }
  private record(view: View): void {
    const key = view.asset.id + ':' + view.tag.name,
      frame = String(view.sprite.frame.name);
    if (!view.tag.frames.includes(frame)) return;
    if (!this.seen.has(key)) this.seen.set(key, new Set());
    this.seen.get(key)!.add(frame);
    if (!this.times.has(key)) this.times.set(key, []);
    const times = this.times.get(key)!;
    if (times.at(-1)?.frame !== frame) times.push({ frame, at: this.time.now });
  }
  private makeView(
    asset: RasterComponent,
    tag: RasterAnimation,
    x: number,
    y: number,
    d: Direction,
    role: string,
    repeat?: number,
  ): View {
    const sprite = this.add
      .sprite(x, y, asset.id, tag.frames[0]!)
      .setOrigin(...tag.origin);
    const view: View = {
      sprite,
      asset,
      tag,
      role,
      direction: d,
      depthDelta: 0,
    };
    this.views.add(view);
    sprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, () =>
      this.record(view),
    );
    sprite.on(Phaser.Animations.Events.ANIMATION_START, () =>
      this.record(view),
    );
    sprite.play({
      key: rasterAnimationKey(asset.id, tag.name),
      ...(repeat === undefined ? {} : { repeat }),
    });
    this.record(view);
    return view;
  }
  private remove(view: View): void {
    if (!this.views.delete(view)) return;
    if (this.effects.delete(view)) this.destroyedEffects++;
    view.sprite.destroy();
  }
  private changeActor(view: View, cue: Cue): void {
    const a = this.components.get(cue.asset)!;
    const t = this.tag(a, cue.tag, view.direction);
    view.asset = a;
    view.tag = t;
    view.sprite.setOrigin(...t.origin);
    if (cue.holdFrame !== undefined) {
      view.sprite.anims.stop();
      view.sprite.setTexture(a.id, t.frames[cue.holdFrame]!);
      this.record(view);
    } else
      view.sprite.play({
        key: rasterAnimationKey(a.id, t.name),
        ...(cue.repeat === undefined ? {} : { repeat: cue.repeat }),
      });
    this.stageEvents.push({
      stage: t.stage,
      at: this.time.now,
      branch: this.branch,
    });
  }
  private effect(cue: Cue, owner: View): void {
    const asset = this.components.get(cue.asset)!,
      tag = this.tag(asset, cue.tag, owner.direction);
    for (const half of cue.wrap ? ['far', 'near'] : ['full']) {
      const view = this.makeView(
        asset,
        tag,
        owner.sprite.x,
        owner.sprite.y,
        owner.direction,
        'effect',
        cue.repeat,
      );
      view.owner = owner;
      view.depthDelta =
        half === 'far'
          ? -0.25
          : half === 'near'
            ? 0.25
            : tag.placement === 'ground'
              ? -0.3
              : 0.15;
      if (half !== 'full') {
        const [w, h] = tag.frameDimensions;
        view.sprite.setCrop(0, half === 'far' ? 0 : h / 2, w, h / 2);
      }
      this.effects.add(view);
      this.createdEffects++;
      view.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () =>
        this.remove(view),
      );
      const lifetime =
        cue.ttl ??
        (tag.repeat === -1
          ? 650
          : (tag.frames.length / tag.frameRate) *
              1000 *
              (1 + (cue.repeat ?? 0)) +
            100);
      this.time.delayedCall(lifetime, () => {
        if (!this.views.has(view)) return;
        this.tweens.add({
          targets: view.sprite,
          alpha: 0,
          duration: 80,
          onComplete: () => this.remove(view),
        });
      });
    }
    this.stageEvents.push({
      stage: tag.stage,
      at: this.time.now,
      branch: this.branch,
    });
    this.place();
  }
  private afterimage(owner: View): void {
    const sprite = this.add
      .sprite(
        owner.sprite.x,
        owner.sprite.y,
        owner.asset.id,
        owner.sprite.frame.name,
      )
      .setOrigin(...owner.tag.origin)
      .setAlpha(0.18)
      .setDepth(owner.sprite.y - 0.4);
    const echo: View = {
      sprite,
      asset: owner.asset,
      tag: owner.tag,
      role: 'temporal_afterimage',
      direction: owner.direction,
      depthDelta: -0.4,
    };
    this.views.add(echo);
    this.effects.add(echo);
    this.createdEffects++;
    this.tweens.add({
      targets: sprite,
      alpha: 0,
      duration: 180,
      onComplete: () => this.remove(echo),
    });
  }
  private delay(at: number, fn: () => void): void {
    const cycle = this.cycle;
    this.time.delayedCall(at, () => {
      if (cycle === this.cycle) fn();
    });
  }
  private combined(x: number, y: number, d: Direction, plan: Plan): void {
    const id = plan.style === 'dao' ? 'hero_thien_son_dao' : 'hero_thien_son',
      a = this.components.get(id)!;
    const root = this.makeView(a, this.tag(a, 'idle', d), x, y, d, 'character');
    this.roots.push(root);
    for (const cue of plan.actors)
      if (!cue.when || cue.when === this.branch)
        this.delay(cue.at, () => this.changeActor(root, cue));
    for (const cue of plan.effects)
      if (!cue.when || cue.when === this.branch)
        this.delay(cue.at, () => this.effect(cue, root));
    if (plan.motion) {
      const m = plan.motion,
        [dx, dy] = vectors[d];
      this.delay(m.at, () =>
        this.tweens.add({
          targets: root.sprite,
          x: x + dx * m.along - dy * m.across,
          y: y + dy * m.along + dx * m.across,
          duration: m.duration,
          ease: 'Linear',
        }),
      );
    }
    if (plan.afterimageAt !== undefined)
      this.delay(plan.afterimageAt, () => this.afterimage(root));
  }
  private clearViews(): void {
    if (this.scene.isPaused()) this.scene.resume();
    this.cycle++;
    this.time.removeAllEvents();
    this.tweens.killAll();
    for (const v of [...this.views]) this.remove(v);
    this.roots = [];
    for (const t of this.labels) t.destroy();
    this.labels = [];
  }
  choose(
    id: string,
    d: Direction = 'right',
    mode: Mode = 'combined',
    branch: Branch = 'counter',
  ): void {
    if (
      !this.manifest.skills.some((s) => s.id === id) ||
      !directions.includes(d)
    )
      throw new Error('Unknown preview selection');
    this.clearViews();
    this.selected = id;
    this.direction = d;
    this.mode = mode;
    this.branch = branch;
    this.syncControls();
    const plan = this.plans.find((p) => p.id === id)!,
      info = this.manifest.skills.find((s) => s.id === id)!;
    const w = this.scale.width,
      h = this.scale.height;
    if (mode === 'character') {
      const a = this.components.get(info.characterId)!;
      directions.forEach((dir, i) => {
        const tag = this.tag(
          a,
          info.kind === 'active'
            ? 'cast'
            : info.kind === 'normal'
              ? 'basic_attack'
              : 'idle',
          dir,
        );
        const view = this.makeView(
          a,
          tag,
          (w * (i + 1)) / 5,
          h * 0.56,
          dir,
          'character',
          -1,
        );
        this.roots.push(view);
        this.labels.push(
          this.add
            .text((w * (i + 1)) / 5 - 16, h * 0.56 + 18, dir, {
              fontSize: '9px',
              color: '#f1ecd6',
            })
            .setDepth(20000),
        );
      });
    } else if (mode === 'vfx' && info.vfxId) {
      const a = this.components.get(info.vfxId)!;
      const tags = a.animations.filter(
        (t) => t.direction === d || t.direction === 'none',
      );
      tags.forEach((tag, i) => {
        const x = (w * ((i % 3) + 1)) / 4,
          y = 90 + Math.floor(i / 3) * 100;
        this.makeView(a, tag, x, y, d, 'diagnostic_vfx', -1);
        this.labels.push(
          this.add
            .text(x - 45, y + 35, tag.name, {
              fontSize: '8px',
              color: '#f1ecd6',
            })
            .setDepth(20000),
        );
      });
    } else {
      const list: Array<[number, number, Direction]> =
        mode === 'six'
          ? [
              [w * 0.2, h * 0.35, 'right'],
              [w * 0.5, h * 0.35, 'down'],
              [w * 0.8, h * 0.35, 'left'],
              [w * 0.2, h * 0.67, 'up'],
              [w * 0.5, h * 0.67, 'right'],
              [w * 0.8, h * 0.67, 'left'],
            ]
          : mode === 'four'
            ? directions.map((dir, i) => [(w * (i + 1)) / 5, h * 0.57, dir])
            : [[w * 0.5, h * 0.56, d]];
      for (const [x, y, dir] of list) this.combined(x, y, dir, plan);
      this.delay(plan.duration, () => {
        this.completed++;
        if (this.auto)
          this.delay(700, () =>
            this.choose(this.selected, this.direction, this.mode, this.branch),
          );
      });
    }
    this.place();
  }
  private inspectAsset(id: string, name: string): void {
    this.clearViews();
    const asset = this.components.get(id),
      tag = asset?.animations.find((t) => t.name === name);
    if (!asset || !tag) throw new Error('Unknown diagnostic asset/tag');
    this.seen.delete(id + ':' + name);
    this.times.delete(id + ':' + name);
    const d = directions.includes(tag.direction as Direction)
      ? (tag.direction as Direction)
      : 'right';
    const view = this.makeView(
      asset,
      tag,
      this.scale.width / 2,
      this.scale.height * 0.55,
      d,
      'diagnostic',
      -1,
    );
    this.roots.push(view);
    this.status!.textContent =
      'DIAGNOSTIC · ' +
      id +
      ' / ' +
      name +
      ' · metadata cadence; repeat override for frame inspection';
    this.place();
  }
  private place(): void {
    for (const view of this.views) {
      if (view.owner) {
        const o = view.tag.effectPlacementOffset;
        view.sprite.setPosition(
          Math.round(view.owner.sprite.x + o[0]),
          Math.round(view.owner.sprite.y + o[1]),
        );
      }
      if (view.role !== 'temporal_afterimage')
        view.sprite.setDepth(
          (view.owner?.sprite.y ?? view.sprite.y) + view.depthDelta,
        );
    }
  }
  override update(): void {
    this.place();
  }
  inspect() {
    const origin = this.cameras.main.getWorldPoint(0, 0),
      unit = this.cameras.main.getWorldPoint(1, 0);
    return {
      ready: this.ready,
      scope: 'presentation_only',
      gameplayImplemented: false,
      phaser: Phaser.VERSION,
      selected: this.selected,
      direction: this.direction,
      mode: this.mode,
      branch: this.branch,
      zoom: this.cameras.main.zoom,
      rotation: Math.atan2(unit.y - origin.y, unit.x - origin.x),
      displayZoom: this.scale.zoom,
      logicalCanvas: [this.scale.width, this.scale.height],
      errors: [...this.errors],
      activeEffects: this.effects.size,
      createdEffects: this.createdEffects,
      destroyedEffects: this.destroyedEffects,
      completed: this.completed,
      actors: this.roots.map((v) => ({
        asset: v.asset.id,
        tag: v.tag.name,
        frame: String(v.sprite.frame.name),
        x: v.sprite.x,
        y: v.sprite.y,
        origin: [v.sprite.originX, v.sprite.originY],
        scale: [v.sprite.scaleX, v.sprite.scaleY],
        depth: v.sprite.depth,
        frameRate: v.sprite.anims.currentAnim?.frameRate,
        playing: v.sprite.anims.isPlaying,
      })),
      effects: [...this.effects].map((v) => ({
        asset: v.asset.id,
        tag: v.tag.name,
        x: v.sprite.x,
        y: v.sprite.y,
        depth: v.sprite.depth,
        offset: v.tag.effectPlacementOffset,
        ownerX: v.owner?.sprite.x,
        ownerY: v.owner?.sprite.y,
        depthDelta: v.depthDelta,
      })),
      observations: Object.fromEntries(
        [...this.seen].map(([k, v]) => [k, [...v]]),
      ),
      timings: Object.fromEntries(this.times),
      stages: [...this.stageEvents],
    };
  }
}
