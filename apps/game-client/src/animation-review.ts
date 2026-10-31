import Phaser from 'phaser';
import { skillArt } from '@volam/game-data';
import { feedbackArt } from './feedback-art.js';
import {
  preloadRasterAnimations,
  type RasterAnimation,
  type RasterComponent,
} from './skill-art-registry.js';
import {
  animationReviewPlan,
  reviewCounter,
  reviewFrameIndex,
  reviewMotion,
  reviewSkills,
  type ReviewClip,
  type ReviewDirection,
  type ReviewBranch,
  type ReviewPlan,
} from './animation-review-plans.js';
import './animation-review.css';

const directions: ReviewDirection[] = ['right', 'down', 'left', 'up'];
const vectors = {
  right: [1, 0],
  down: [0, 1],
  left: [-1, 0],
  up: [0, -1],
} as const;
const heroes = [
  'hero_thien_son',
  'hero_thien_son_dao',
  'hero_vo_dang_kiem',
  'hero_thieu_lam',
  'hero_thieu_lam_dao',
];
type View = {
  sprite: Phaser.GameObjects.Sprite;
  cue: ReviewClip;
  tag: RasterAnimation;
  direction: ReviewDirection;
  root: [number, number];
  owner: number;
};

/** Dedicated art-only scene. It never joins a room or sends gameplay messages. */
export class AnimationReviewScene extends Phaser.Scene {
  onDisplayScale: (zoom: number) => void = () => {};
  private displayScale = 1;
  private components = new Map<string, RasterComponent>();
  private views: View[] = [];
  private bodies: Phaser.GameObjects.Sprite[] = [];
  private targets: Phaser.GameObjects.Sprite[] = [];
  private roots: [number, number][] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private panel?: HTMLElement;
  private note?: HTMLElement;
  private timeline?: HTMLInputElement;
  private readout?: HTMLElement;
  private ground?: Phaser.GameObjects.Image;
  private seen = new Set<string>();
  private transitions: { frame: string; at: number }[] = [];
  private errors: string[] = [];
  private timeMs = 0;
  private playing = true;
  private repeat = true;
  private speed = 1;
  private facing: ReviewDirection = 'right';
  private mode = 'single';
  private branch: ReviewBranch = 'threshold';
  private exitLotus = true;
  private showTargets = true;
  private plan: ReviewPlan = animationReviewPlan('lien_hoa_phien');
  private ready = false;
  private completedCycles = 0;
  constructor() {
    super('AnimationReview');
  }
  preload(): void {
    this.load.on('loaderror', (f: Phaser.Loader.File) =>
      this.errors.push(String(f.url)),
    );
    // Load only the components used by these storyboards, preserving all old bytes.
    const used = new Set(
      reviewSkills.flatMap(([id]) =>
        ['threshold', 'expiry'].flatMap((branch) =>
          animationReviewPlan(id, branch as ReviewBranch).clips.map(
            (c) => c.asset,
          ),
        ),
      ),
    );
    const assets = [...skillArt.assets, ...feedbackArt].filter((a) =>
      used.has(a.id),
    );
    for (const a of assets) this.components.set(a.id, a);
    preloadRasterAnimations(this, assets);
    this.load.once(
      'filecomplete-json-animation-review-manifest',
      (_key: string, _type: string, data: { assets: RasterComponent[] }) => {
        for (const a of data.assets) this.components.set(a.id, a);
        preloadRasterAnimations(this, data.assets);
      },
    );
    this.load.json(
      'animation-review-manifest',
      '/assets/skills/animation-review-v01/manifest.json',
    );
    this.load.image('animation-review-ground', '/assets/arena_v2/ground.png');
    for (const id of [...heroes, 'creep_outlaw']) {
      const folder = id === 'creep_outlaw' ? 'enemies' : 'characters';
      this.load.atlas(
        id,
        `/assets/${folder}/${id}.png`,
        `/assets/${folder}/${id}.json`,
      );
      this.load.json(id + '-review-meta', `/assets/${folder}/${id}.json`);
    }
  }
  create(): void {
    for (const id of [...heroes, 'creep_outlaw']) {
      const meta = this.cache.json.get(id + '-review-meta') as {
        frames: Record<string, { duration?: number }>;
      };
      const animations: RasterAnimation[] = [];
      for (const pose of ['idle', 'walk'])
        for (const d of directions) {
          const frames = Object.keys(meta.frames)
            .filter((n) => n.startsWith(`${pose}_${d}_`))
            .sort(
              (a, b) =>
                Number(a.split('_').at(-1)) - Number(b.split('_').at(-1)),
            );
          if (!frames.length) continue;
          animations.push({
            name: `${pose}_${d}`,
            frames,
            frameDurationsMs: frames.map(
              (n) => meta.frames[n]?.duration ?? 120,
            ),
            frameRate: 8,
            repeat: -1,
            direction: d,
            origin: [0.5, 0.8],
            frameDimensions: [80, 80],
            stage: pose,
            placement: 'character_feet',
            effectPlacementOffset: [0, 0],
          });
        }
      this.components.set(id, {
        id,
        skillId: id,
        kind: 'character',
        sheet: '',
        atlas: '',
        origin: [0.5, 0.8],
        frameDimensions: [80, 80],
        animations,
      });
    }
    for (const a of this.components.values()) {
      if (!this.textures.exists(a.id))
        throw Error('Missing review texture: ' + a.id);
      this.textures.get(a.id).setFilter(Phaser.Textures.FilterMode.NEAREST);
      for (const t of a.animations)
        for (const n of t.frames)
          if (!this.textures.get(a.id).has(n))
            throw Error('Missing review frame: ' + a.id + ':' + n);
    }
    this.ground = this.add
      .image(0, 0, 'animation-review-ground')
      .setDepth(-10000);
    this.cameras.main.setZoom(1).setRotation(0);
    document.body.classList.add('animation-review');
    this.controls();
    const query = new URLSearchParams(location.search);
    if (directions.includes(query.get('facing') as ReviewDirection))
      this.facing = query.get('facing') as ReviewDirection;
    this.ready = true;
    this.choose(query.get('skill') ?? this.plan.id);
    const bridge = Object.freeze({
      snapshot: () => this.inspect(),
      choose: (
        id: string,
        d: ReviewDirection = 'right',
        mode = 'single',
        branch: ReviewBranch = 'threshold',
      ) => this.choose(id, d, mode, branch),
      seek: (at: number) => this.seek(at),
      play: () => {
        this.playing = true;
      },
      pause: () => {
        this.playing = false;
      },
      clear: () => this.clear(),
    });
    Object.defineProperty(window, '__ANIMATION_REVIEW__', {
      configurable: true,
      value: bridge,
    });
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      this.panel?.remove();
      this.note?.remove();
      document.body.classList.remove('animation-review');
      delete (window as unknown as Record<string, unknown>)[
        '__ANIMATION_REVIEW__'
      ];
    });
  }
  private controls(): void {
    const host = document.querySelector('#viewport')!;
    const p = document.createElement('section');
    p.className = 'animation-review-controls';
    p.setAttribute('aria-label', 'Animation review controls');
    p.innerHTML = `<div class="review-toolbar"><strong>DUYỆT ANIMATION · v01</strong><span>Chỉ hình ảnh · chưa đổi gameplay</span><a href="/">Về game</a></div>
      <div class="review-toolbar"><select aria-label="Skill cần duyệt" id="review-skill">${reviewSkills.map(([id, name]) => `<option value="${id}">${name}</option>`).join('')}</select>
      <select aria-label="Hướng nhìn" id="review-facing">${directions.map((d, i) => `<option value="${d}">${['Phải', 'Xuống', 'Trái', 'Lên'][i]}</option>`).join('')}</select>
      <select aria-label="Bố cục" id="review-mode"><option value="single">Một nhân vật</option><option value="four">Bốn hướng</option><option value="six">Sáu nhân vật</option></select>
      <select aria-label="Tình huống Tọa Sát" id="review-branch"><option value="threshold">Vượt 20% HP</option><option value="expiry">Hết 5 giây</option></select>
      <select aria-label="Tốc độ preview" id="review-speed"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option></select>
      <select aria-label="Nền preview" id="review-background"><option value="arena">Sân đấu</option><option value="dark">Nền tối</option><option value="light">Nền sáng</option></select>
      <select aria-label="Độ phóng" id="review-zoom"><option value="1">1× · Pixel gốc</option><option value="2">2× · Cỡ trong game</option></select>
      <button id="review-restart">Chạy lại</button><button id="review-pause">Tạm dừng</button></div>
      <div class="review-toolbar review-options"><label><input id="review-repeat" type="checkbox" checked>Lặp lại</label><label><input id="review-targets" type="checkbox" checked>Có mục tiêu</label><label><input id="review-exit" type="checkbox" checked>Ra / vào hoa</label><label>Thời gian <input id="review-time" aria-label="Tua animation" type="range" min="0" step="10" value="0"></label><output id="review-clock"></output></div>`;
    host.append(p);
    this.panel = p;
    const select = (id: string) =>
      p.querySelector<HTMLSelectElement>('#review-' + id)!;
    const change = () =>
      this.choose(
        select('skill').value,
        select('facing').value as ReviewDirection,
        select('mode').value,
        select('branch').value as ReviewBranch,
      );
    for (const id of ['skill', 'facing', 'mode', 'branch'])
      select(id).onchange = change;
    select('speed').onchange = () => {
      this.speed = Number(select('speed').value);
    };
    select('zoom').onchange = () =>
      this.onDisplayScale(Number(select('zoom').value));
    select('background').onchange = () => {
      this.ground?.setVisible(select('background').value === 'arena');
      this.cameras.main.setBackgroundColor(
        select('background').value === 'light' ? '#d9d3bd' : '#14252d',
      );
    };
    p.querySelector<HTMLButtonElement>('#review-restart')!.onclick = () => {
      this.seek(0);
      this.playing = true;
    };
    p.querySelector<HTMLButtonElement>('#review-pause')!.onclick = () => {
      this.playing = !this.playing;
      this.draw();
    };
    p.querySelector<HTMLInputElement>('#review-repeat')!.onchange = (e) => {
      this.repeat = (e.target as HTMLInputElement).checked;
    };
    p.querySelector<HTMLInputElement>('#review-targets')!.onchange = (e) => {
      this.showTargets = (e.target as HTMLInputElement).checked;
      this.draw();
    };
    p.querySelector<HTMLInputElement>('#review-exit')!.onchange = (e) => {
      this.exitLotus = (e.target as HTMLInputElement).checked;
      change();
    };
    this.timeline = p.querySelector<HTMLInputElement>('#review-time')!;
    this.timeline.oninput = () => this.seek(Number(this.timeline!.value));
    const note = document.createElement('section');
    note.className = 'animation-review-note';
    note.innerHTML =
      '<strong id="review-name"></strong><p id="review-description"></p><output id="review-readout"></output>';
    host.append(note);
    this.note = note;
    this.readout = note.querySelector('#review-readout')!;
  }
  choose(
    id: string,
    d = this.facing,
    mode = this.mode,
    branch = this.branch,
  ): void {
    if (!reviewSkills.some(([key]) => key === id)) id = 'lien_hoa_phien';
    if (!directions.includes(d)) throw Error('Unsupported review facing');
    if (!['single', 'four', 'six'].includes(mode))
      throw Error('Unsupported review mode');
    if (!['threshold', 'expiry'].includes(branch))
      throw Error('Unsupported review branch');
    this.facing = d;
    this.mode = mode;
    this.branch = branch;
    this.plan = animationReviewPlan(id, branch, this.exitLotus);
    this.timeMs = 0;
    this.completedCycles = 0;
    this.playing = true;
    this.seen.clear();
    this.transitions = [];
    if (!this.ready) return;
    for (const [key, value] of [
      ['skill', id],
      ['facing', d],
      ['mode', mode],
      ['branch', branch],
    ])
      this.panel!.querySelector<HTMLSelectElement>('#review-' + key)!.value =
        value!;
    this.panel!.querySelector<HTMLSelectElement>('#review-branch')!.disabled =
      id !== 'toa_sat_bac_do';
    this.panel!.querySelector<HTMLInputElement>('#review-exit')!.disabled =
      id !== 'lien_hoa_phien';
    this.timeline!.max = String(this.plan.duration);
    this.note!.querySelector('#review-name')!.textContent =
      this.plan.name + (this.plan.reference ? ' · ĐỐI CHIẾU' : ' · CHỜ DUYỆT');
    this.note!.querySelector('#review-description')!.textContent =
      this.plan.note;
    const url = new URL(location.href);
    url.searchParams.set('skill', id);
    url.searchParams.set('facing', d);
    history.replaceState(null, '', url);
    this.layout();
  }
  clear(): void {
    for (const v of this.views) v.sprite.destroy();
    this.views = [];
    for (const s of [...this.bodies, ...this.targets, ...this.labels])
      s.destroy();
    this.bodies = [];
    this.targets = [];
    this.labels = [];
    this.roots = [];
  }
  private resolve(
    asset: string,
    prefix: string,
    d: ReviewDirection,
  ): RasterAnimation {
    const a = this.components.get(asset);
    const tag =
      a?.animations.find((t) => t.name === prefix + '_' + d) ??
      a?.animations.find((t) => t.name === prefix);
    if (!tag)
      throw Error('Missing review tag: ' + asset + ':' + prefix + ':' + d);
    return tag;
  }
  private layout(): void {
    if (!this.ready) return;
    this.clear();
    const w = this.scale.width,
      h = this.scale.height;
    const count = this.mode === 'four' ? 4 : this.mode === 'six' ? 6 : 1;
    const rows = count > 3 ? 2 : 1,
      columns = count === 1 ? 1 : count === 4 ? 2 : 3;
    // Controls and captions overlay the world; they never resize the canvas.
    const top = 160 / this.displayScale,
      available = Math.max(100, h - top - 150 / this.displayScale);
    this.ground?.setPosition(w / 2, h / 2);
    for (let i = 0; i < count; i++) {
      const x = count === 1 ? w * 0.46 : (((i % columns) + 0.5) * w) / columns;
      const y = top + ((Math.floor(i / columns) + 0.5) * available) / rows;
      const d = this.mode === 'four' ? directions[i]! : this.facing;
      const root: [number, number] = [Math.round(x), Math.round(y)];
      this.roots.push(root);
      const idle = this.resolve(this.plan.hero, 'idle', d);
      this.bodies.push(
        this.add
          .sprite(...root, this.plan.hero, idle.frames[0]!)
          .setOrigin(...idle.origin),
      );
      const targetTag = this.resolve('creep_outlaw', 'idle', 'left');
      this.targets.push(
        this.add
          .sprite(
            x + vectors[d][0] * 175,
            y + vectors[d][1] * 175,
            'creep_outlaw',
            targetTag.frames[0]!,
          )
          .setOrigin(0.5, 0.8)
          .setAlpha(0.65),
      );
      this.labels.push(
        this.add
          .text(
            x,
            y + 83,
            count === 1
              ? ''
              : this.mode === 'four'
                ? { right: 'Phải', down: 'Xuống', left: 'Trái', up: 'Lên' }[d]
                : `Bản xem ${i + 1}`,
            {
              fontFamily: 'system-ui',
              fontSize: '12px',
              color: '#fff1cc',
              backgroundColor: '#14252daa',
            },
          )
          .setOrigin(0.5)
          .setDepth(10000),
      );
      for (const cue of this.plan.clips) {
        const tag = this.resolve(cue.asset, cue.tag, d);
        if (cue.body) continue;
        const sprite = this.add
          .sprite(x, y, cue.asset, tag.frames[0]!)
          .setOrigin(...tag.origin)
          .setVisible(false)
          .setScale(cue.scale ?? 1);
        this.views.push({ sprite, tag, cue, direction: d, root, owner: i });
      }
    }
    this.draw();
  }
  setDisplayScale(zoom: number): void {
    this.displayScale = zoom;
    if (this.panel)
      this.panel.querySelector<HTMLSelectElement>('#review-zoom')!.value =
        String(zoom);
    this.layout();
  }
  seek(at: number): void {
    this.timeMs = Math.max(0, Math.min(at, this.plan.duration));
    this.playing = false;
    this.draw();
  }
  private frame(
    tag: RasterAnimation,
    at: number,
    loop = false,
    hold?: number,
    windowMs?: number,
  ): string {
    const durations =
      tag.frameDurationsMs ?? tag.frames.map(() => 1000 / tag.frameRate);
    const clock =
      !loop && windowMs
        ? (at * durations.reduce((a, b) => a + b, 0)) / windowMs
        : at;
    return tag.frames[hold ?? reviewFrameIndex(durations, clock, loop)]!;
  }
  private observe(asset: string, frame: string): void {
    const key = asset + ':' + frame;
    const fresh = !this.seen.has(key);
    this.seen.add(key);
    if (fresh && this.transitions.length < 800)
      this.transitions.push({ frame: key, at: Math.round(this.timeMs) });
  }
  private inside(): boolean {
    return (
      Math.abs(reviewMotion(this.plan, this.timeMs)) < 73 &&
      this.timeMs >= 400 &&
      this.timeMs < 5600
    );
  }
  private draw(): void {
    if (!this.ready) return;
    const t = this.timeMs,
      displacement = reviewMotion(this.plan, t);
    const activeBody = this.plan.clips
      .filter((c) => c.body && t >= c.at && t < c.end)
      .at(-1);
    this.bodies.forEach((s, i) => {
      const d = this.mode === 'four' ? directions[i]! : this.facing,
        v = vectors[d],
        r = this.roots[i]!;
      const walking =
        this.plan.id === 'lien_hoa_phien' &&
        this.plan.motion?.some((m) => t >= m.at && t < m.end);
      const asset = activeBody?.asset ?? this.plan.hero;
      const tag = this.resolve(
        asset,
        activeBody?.tag ?? (walking ? 'walk' : 'idle'),
        d,
      );
      const frame = this.frame(
        tag,
        t - (activeBody?.at ?? 0),
        activeBody?.loop ?? !activeBody,
        activeBody?.hold,
        activeBody ? activeBody.end - activeBody.at : undefined,
      );
      s.setTexture(asset, frame)
        .setOrigin(...tag.origin)
        .setPosition(
          Math.round(r[0] + v[0] * displacement),
          Math.round(r[1] + v[1] * displacement),
        )
        .setDepth(s.y);
      this.observe(asset, frame);
      const target = this.targets[i]!;
      target.setVisible(this.showTargets).setDepth(target.y);
    });
    for (const view of this.views) {
      const { cue: c, sprite: s, tag, root, direction } = view;
      const visible =
        t >= c.at && t < c.end && (!c.insideOnly || this.inside());
      s.setVisible(visible);
      if (!visible) continue;
      const progress = (t - c.at) / (c.end - c.at),
        from = c.from ?? [0, 0],
        to = c.to ?? from;
      const localX = from[0] + (to[0] - from[0]) * progress,
        localY = from[1] + (to[1] - from[1]) * progress;
      const [vx, vy] = vectors[direction];
      const x = c.facingSpace ? vx * localX - vy * localY : localX;
      const y = c.facingSpace ? vy * localX + vx * localY : localY;
      const motion = c.anchor === 'start' ? 0 : displacement;
      const offset = tag.effectPlacementOffset;
      s.setPosition(
        Math.round(root[0] + vx * motion + x + offset[0]),
        Math.round(root[1] + vy * motion + y + offset[1] - (c.elevation ?? 0)),
      );
      s.setDepth(
        c.ground
          ? root[1] - 0.4
          : root[1] +
              vy * motion +
              (c.phase === 'light_afterimage' ? -0.2 : 0.4),
      );
      s.setRotation((c.angle ?? 0) + (c.facingSpace ? Math.atan2(vy, vx) : 0));
      s.setAlpha((c.alpha ?? 1) * (c.fade ? 1 - progress : 1));
      const frame = this.frame(tag, t - c.at, c.loop, c.hold, c.end - c.at);
      s.setFrame(frame);
      this.observe(c.asset, frame);
    }
    this.timeline!.value = String(Math.round(t));
    this.panel!.querySelector('#review-clock')!.textContent =
      `${(t / 1000).toFixed(2)} / ${(this.plan.duration / 1000).toFixed(2)}s`;
    this.panel!.querySelector('#review-pause')!.textContent = this.playing
      ? 'Tạm dừng'
      : 'Tiếp tục';
    const phases = [
      ...new Set(
        this.views.filter((v) => v.sprite.visible).map((v) => v.cue.phase),
      ),
    ];
    if (this.plan.id === 'toa_sat_bac_do') {
      const c = reviewCounter(this.branch, t);
      this.readout!.textContent = `MÔ PHỎNG · HP tối đa ${c.maxHp} · ngưỡng >${c.threshold} · thực nhận sau giảm 70%: ${c.received} · ${t >= c.releaseAt ? 'BẠT KIẾM · phản ' + c.reflect : 'ĐANG THỦ · ' + Math.min(5, t / 1000).toFixed(1) + ' / 5s'}`;
    } else if (this.plan.id === 'lien_hoa_phien')
      this.readout!.textContent = `MÔ PHỎNG · ${this.inside() ? 'TRONG HOA · bảo hộ + hồi máu' : t >= 5600 ? 'Hoa đã tàn' : 'NGOÀI HOA · không có bảo hộ'} · Hoa đứng yên tại điểm thi triển`;
    else {
      const labels: Record<string, string> = {
        dash_wind: 'Lướt',
        light_afterimage: 'Quang ảnh',
        seven_stars_gather: 'Tụ bảy kiếm',
        seven_sword_strike: 'Xuất kiếm',
        star_impact: 'Kiếm chạm đích',
        radial_release: 'Phóng kiếm / phiến liên tục',
        sword_gather: 'Tụ kiếm',
        sword_dissolve: 'Tan kiếm',
        golden_palm_travel: 'Chưởng bay',
        golden_palm_impact: 'Chưởng ấn',
        three_seals: 'Ba tầng pháp ấn',
        three_realms_slash: 'Chém đao',
        armor_hit: 'Va chạm',
        armor_break_seal: 'Ấn phá giáp',
        anticipation_release: 'Lấy đà',
        blade_contact: 'Vệt đao',
        short_recovery: 'Thu đao',
        minh_vuong_open: 'Khai ấn',
        healing_pulse: 'Nhịp hồi phục',
        minh_vuong_sustain: 'Duy trì hào quang',
        minh_vuong_close: 'Thu ấn',
        thousand_leaf_palm: 'Chưởng ảnh liên tiếp',
        thousand_leaf_climax: 'Chưởng ấn kết thúc',
        retained_spin: 'Xoay chưởng',
        retained_storm: 'Bão phiến',
        retained_ending: 'Thu thế',
      };
      this.readout!.textContent = `Nhịp: ${phases.map((p) => labels[p] ?? 'Thi triển').join(' · ') || 'Nghỉ / hồi thế'} · ${this.mode === 'six' ? '6 bản sao hình ảnh; không phải 6 người trong trận' : 'Tỉ lệ nhân vật như trong game'}`;
    }
  }
  override update(_now: number, delta: number): void {
    if (!this.ready || !this.playing) return;
    this.timeMs += delta * this.speed;
    if (this.timeMs > this.plan.duration) {
      this.completedCycles += Math.floor(this.timeMs / this.plan.duration);
      if (this.repeat) this.timeMs %= this.plan.duration;
      else {
        this.timeMs = this.plan.duration;
        this.playing = false;
      }
    }
    this.draw();
  }
  inspect() {
    const origin = this.cameras.main.getWorldPoint(0, 0);
    const unit = this.cameras.main.getWorldPoint(1, 0);
    return {
      ready: this.ready,
      skill: this.plan.id,
      facing: this.facing,
      mode: this.mode,
      branch: this.branch,
      timeMs: this.timeMs,
      duration: this.plan.duration,
      playing: this.playing,
      completedCycles: this.completedCycles,
      displayScale: this.displayScale,
      presentationOnly: true,
      gameplayIntegrated: false,
      camera: {
        zoom: this.cameras.main.zoom,
        rotation: Math.atan2(unit.y - origin.y, unit.x - origin.x),
      },
      rootMotion: reviewMotion(this.plan, this.timeMs),
      insideLotus: this.inside(),
      counter: reviewCounter(this.branch, this.timeMs),
      errors: [...this.errors],
      observedFrames: [...this.seen],
      transitions: [...this.transitions],
      actors: this.bodies.map((s) => ({
        x: s.x,
        y: s.y,
        depth: s.depth,
        texture: s.texture.key,
        frame: s.frame.name,
        origin: [s.originX, s.originY],
        scale: s.scaleX,
      })),
      effects: this.views
        .filter((v) => v.sprite.visible)
        .map((v) => ({
          phase: v.cue.phase,
          asset: v.cue.asset,
          frame: v.sprite.frame.name,
          x: v.sprite.x,
          y: v.sprite.y,
          alpha: v.sprite.alpha,
          depth: v.sprite.depth,
        })),
      resources: {
        bodies: this.bodies.length,
        effects: this.views.length,
        targets: this.targets.length,
      },
    };
  }
}
