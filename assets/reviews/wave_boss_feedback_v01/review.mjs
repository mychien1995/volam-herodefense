import {
  sceneAt,
  advancePlayer,
  confine,
  center,
  vector,
  modes,
  bosses,
  tuning,
  angle,
  clamp,
} from './model.mjs';
const data = await (await fetch('./data.json')).json();
const $ = (id) => document.getElementById(id),
  seen = new Set(),
  keys = new Set(),
  errors = [];
const state = {
  ready: false,
  id: 'lac_anh',
  boss: 'dong',
  t: 0,
  seed: 42,
  playing: true,
  speed: 1,
  facing: 'right',
  players: 2,
  revision: 'candidate',
  shape: 'random',
  branch: 'random',
  camera: 'player',
  player: { x: 960, y: 646, dir: 'left', pose: 'idle' },
  releaseTarget: null,
  dashTarget: null,
  hp: 70,
  cycles: 0,
  dashBlocked: 0,
  dashes: 0,
};
let scene,
  current,
  dtObserved = 0;
function options() {
  return {
    ...state,
    player: state.player,
    releaseTarget: state.releaseTarget,
    dashTarget: state.dashTarget,
  };
}
function choose(id, config = {}) {
  const m = modes.find((m) => m.id === id);
  if (!m) throw Error('Unknown preview ' + id);
  Object.assign(state, config, {
    id,
    t: 0,
    playing: true,
    player: { x: 960, y: 646, dir: 'left', pose: 'idle' },
    releaseTarget: null,
    dashTarget: null,
    hp: 70,
  });
  if (!['entry', 'retry'].includes(id)) state.boss = m.boss;
  keys.clear();
  $('pause').textContent = 'Dừng';
  $('boss').value = state.boss;
  populateModes();
  $('mode').value = id;
  $('timeline').max = m.duration;
  scene?.draw();
}
function populateModes() {
  $('mode').replaceChildren();
  for (const m of modes.filter(
    (m) => m.boss === state.boss || ['entry', 'retry'].includes(m.id),
  ))
    $('mode').add(new Option(m.name, m.id));
}
for (const [id, b] of Object.entries(bosses))
  $('boss').add(new Option(b.name, id));
$('boss').onchange = () => {
  state.boss = $('boss').value;
  choose(
    modes.find(
      (m) => m.boss === state.boss && !['entry', 'retry'].includes(m.id),
    ).id,
  );
};
$('mode').onchange = () => choose($('mode').value);
$('restart').onclick = () => {
  state.seed++;
  choose(state.id);
};
$('pause').onclick = () => {
  state.playing = !state.playing;
  $('pause').textContent = state.playing ? 'Dừng' : 'Phát';
};
function seek(t) {
  const target = clamp(t, 0, modes.find((m) => m.id === state.id).duration);
  state.player = { x: 960, y: 646, dir: 'left', pose: 'idle' };
  state.releaseTarget = null;
  state.dashTarget = null;
  for (let at = 0; at < target;) {
    const dt = Math.min(1 / 60, target - at),
      previous = at;
    at += dt;
    const frame = sceneAt(state.id, at, { ...options(), t: at });
    if (
      state.id === 'mai_pull' &&
      previous < tuning.mai.pullEnd &&
      at >= tuning.mai.pullEnd
    )
      state.releaseTarget = { ...state.player };
    if (state.id === 'nam_dash' && !state.dashTarget)
      state.dashTarget = { ...state.player };
    state.player = advancePlayer(state.player, new Set(), dt, frame, previous);
  }
  state.playing = false;
  state.t = target;
  $('pause').textContent = 'Phát';
  scene.draw();
}
$('timeline').oninput = () => seek(Number($('timeline').value));
$('prev').onclick = () => seek(state.t - 0.1);
$('next').onclick = () => seek(state.t + 0.1);
for (const key of ['facing', 'players', 'revision', 'shape', 'branch'])
  $(key).onchange = () => {
    state[key] = key === 'players' ? Number($(key).value) : $(key).value;
    choose(state.id);
  };
$('speed').onchange = () => (state.speed = Number($('speed').value));
$('camera').onchange = () => {
  state.camera = $('camera').value;
  scene.draw();
};
$('settings-open').onclick = () => {
  keys.clear();
  $('settings').showModal();
};
$('settings-close').onclick = () => {
  $('settings').close();
  $('viewport').focus();
};
$('hide-controls').onclick = () => document.body.classList.toggle('hud-hidden');
$('viewport').addEventListener('pointerdown', (e) => {
  if (e.target.tagName === 'CANVAS') $('viewport').focus();
});
addEventListener('keydown', (e) => {
  if (e.target.matches('input,select,button') || $('settings').open) return;
  if (
    ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Shift'].includes(
      e.key,
    )
  )
    e.preventDefault();
  keys.add(e.key);
  if (e.repeat) return;
  if (e.key === ' ' || e.code === 'Space') $('pause').click();
  if (e.key.toLowerCase() === 'h') document.body.classList.toggle('hud-hidden');
  if (e.key.toLowerCase() === 'r') $('restart').click();
  if (e.key.toLowerCase() === 'a') {
    state.hp = Math.max(0, state.hp - 7);
    scene.draw();
  }
  if (e.key === 'Shift' && current) {
    if (current.shiftLocked) {
      state.dashBlocked++;
      $('status').textContent = 'Shift bị khóa trong lực hút';
    } else {
      const v = vector[state.player.dir] ?? vector.right;
      Object.assign(
        state.player,
        confine({
          x: state.player.x + v[0] * 110,
          y: state.player.y + v[1] * 110,
        }),
      );
      state.dashes++;
      scene.draw();
    }
  }
});
addEventListener('keyup', (e) => keys.delete(e.key));
addEventListener('blur', () => keys.clear());

class Review extends Phaser.Scene {
  constructor() {
    super('WaveBossFeedback');
    this.pool = [];
    this.used = 0;
    this.labels = [];
    this.labelUsed = 0;
    this.objectRecords = [];
  }
  preload() {
    this.load.on('loaderror', (f) => errors.push('load:' + f.url));
    for (const [key, b] of Object.entries(data.bundles))
      this.load.atlas(key, b.image, {
        frames: b.frames,
        meta: { image: b.image },
      });
    this.load.image('ground', '/assets/exports/arena_v2/ground.png');
    this.load.atlas(
      'world',
      '/assets/exports/arena_art01/world.png',
      '/assets/exports/arena_art01/world.json',
    );
  }
  create() {
    scene = this;
    for (const [key, b] of Object.entries(data.bundles)) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      for (const [name, c] of Object.entries(b.clips))
        for (const f of c.frames)
          if (!this.textures.get(key).has(f))
            throw Error('Missing frame ' + key + ':' + name + ':' + f);
    }
    this.add.image(0, 0, 'ground').setOrigin(0).setDepth(-10000);
    for (const [f, x, y] of [
      ['tree_jade', 160, 530],
      ['tree_blossom', 1340, 580],
      ['bamboo', 310, 840],
      ['bamboo', 1260, 830],
      ['red_banner', 440, 350],
      ['red_banner', 1160, 350],
    ])
      this.add.image(x, y, 'world', f).setOrigin(0.5, 1).setDepth(y);
    this.statue = this.add
      .image(800, 576, 'world', 'statue_male')
      .setOrigin(0.5, 1)
      .setDepth(576);
    // Boundary is a presentation outline, not finished environment/character art.
    this.wall = this.add.graphics().setDepth(30);
    this.health = this.add.graphics().setDepth(9000);
    this.cameras.main.setZoom(1).setRotation(0).setRoundPixels(true);
    state.ready = true;
    populateModes();
    choose(state.id);
    window.__waveReview = {
      choose: (id, config = {}) => {
        choose(id, config);
        for (const k of [
          'facing',
          'players',
          'revision',
          'shape',
          'branch',
          'camera',
        ])
          $(k).value = String(state[k]);
      },
      seek,
      play: () => {
        state.playing = true;
        $('pause').textContent = 'Dừng';
      },
      pause: () => {
        state.playing = false;
        $('pause').textContent = 'Phát';
      },
      player: (p) => {
        Object.assign(state.player, p);
        scene.draw();
      },
      inspect: () => ({
        ready: state.ready,
        id: state.id,
        t: state.t,
        playing: state.playing,
        dtObserved,
        cycles: state.cycles,
        player: { ...state.player },
        dashBlocked: state.dashBlocked,
        dashes: state.dashes,
        errors: [...errors],
        seen: [...seen],
        current: structuredClone(current),
        objects: scene.objectRecords,
        canvas: [game.scale.width, game.scale.height],
        zoom: scene.cameras.main.zoom,
        camera: [scene.cameras.main.midPoint.x, scene.cameras.main.midPoint.y],
        displayScale: displayScale(),
        scope: 'VISUAL_PREVIEW_ONLY',
        serverMechanics: false,
      }),
    };
  }
  cel(l) {
    const b = data.bundles[l.asset],
      c = b?.clips[l.clip];
    if (!c) throw Error('Missing clip ' + l.asset + ':' + l.clip);
    const total = c.durations.reduce((a, b) => a + b, 0),
      loop = l.loop ?? c.repeat === -1;
    let time = Math.max(0, l.clock) * 1000;
    if (loop) time %= total;
    let index = c.frames.length - 1;
    for (let i = 0; i < c.frames.length; i++) {
      if (time < c.durations[i]) {
        index = i;
        break;
      }
      time -= c.durations[i];
    }
    const frame = c.frames[index];
    seen.add(l.asset + ':' + frame);
    const image =
      this.pool[this.used] ??
      (this.pool[this.used] = this.add.image(0, 0, l.asset, frame));
    this.used++;
    image
      .setVisible(true)
      .setTexture(l.asset, frame)
      .setCrop()
      .setPosition(Math.round(l.x), Math.round(l.y))
      .setScale(l.sx ?? 1, l.sy ?? l.sx ?? 1)
      .setOrigin(...(l.origin ?? b.origin))
      .setRotation(l.rotation ?? 0)
      .setFlipX(l.flipX ?? false)
      .setAlpha(l.alpha ?? 1)
      .setDepth(l.depth ?? l.y)
      .setBlendMode(
        l.additive ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL,
      );
    this.objectRecords.push({
      id: l.id,
      asset: l.asset,
      clip: l.clip,
      frame,
      x: image.x,
      y: image.y,
      scale: [image.scaleX, image.scaleY],
      origin: [image.originX, image.originY],
      rotation: image.rotation,
      depth: image.depth,
      alpha: image.alpha,
      size: [image.frame.realWidth, image.frame.realHeight],
    });
    return image;
  }
  text(content, x, y, color = '#fff1bc') {
    const label =
      this.labels[this.labelUsed] ??
      (this.labels[this.labelUsed] = this.add
        .text(0, 0, '', {
          fontFamily: 'Arial',
          fontSize: '11px',
          color,
          stroke: '#151b14',
          strokeThickness: 3,
        })
        .setOrigin(0.5, 1));
    this.labelUsed++;
    return label
      .setVisible(true)
      .setText(content)
      .setColor(color)
      .setPosition(x, y)
      .setDepth(9001);
  }
  bar(x, y, hp, width = 96) {
    // Same green overhead HP treatment as current TayDocRenderer.health.
    this.health
      .fillStyle(0x171419, 0.9)
      .fillRect(x - width / 2, y + 2, width, 5)
      .fillStyle(0x91c852)
      .fillRect(
        x - width / 2 + 1,
        y + 3,
        (width - 2) * Math.max(0, hp / 100),
        3,
      );
  }
  beam(p, index) {
    const warning = p.kind === 'warning',
      asset = warning ? 'nd_feedback02' : 'nd_feedback01',
      clip = warning ? 'line_warning' : 'thin_beam';
    if (state.revision === 'original') {
      const l = {
        id: 'ray-original',
        asset,
        clip,
        x: p.x,
        y: p.y,
        clock: p.age,
        rotation: p.heading,
        origin: [0, 0.5],
        depth: p.y + 0.3,
      };
      const image = this.cel(l);
      image.setDisplaySize(p.length, warning ? 12 : 20);
      return;
    }
    // Tile native raster fragments; do not stretch an 8px thumbnail to 2000px.
    const frame = data.bundles[asset].clips[clip].frames[0],
      r = data.bundles[asset].frames[frame].frame;
    const step = warning ? Math.min(r.w, 24) : r.w;
    for (let d = 0; d < p.length; d += step) {
      const x = p.x + Math.cos(p.heading) * d,
        y = p.y + Math.sin(p.heading) * d;
      if (!this.cameras.main.worldView.contains(x, y)) continue;
      const image = this.cel({
        id: `ray-${index}-${d}`,
        asset,
        clip,
        x,
        y,
        clock: p.age,
        rotation: p.heading,
        origin: [0, 0.5],
        depth: p.y + 0.4,
        alpha: warning ? 0.65 : 1,
      });
      if (warning) image.setCrop(0, 0, step, r.h);
      else image.setCrop(0, 0, Math.min(step, p.length - d), r.h);
    }
  }
  draw() {
    this.used = 0;
    this.labelUsed = 0;
    this.objectRecords = [];
    this.health.clear();
    current = sceneAt(state.id, state.t, options());
    const camera =
      state.camera === 'boss'
        ? current.bossPosition
        : state.camera === 'center'
          ? center
          : state.player;
    this.cameras.main.centerOn(camera.x, camera.y);
    this.cameras.main.preRender();
    this.statue.setVisible(current.statueVisible);
    this.wall.clear();
    if (current.locked) {
      for (const [width, alpha, color] of [
        [10, 0.04, 0xc8dfc7],
        [5, 0.08, 0xc8dfc7],
        [1, 0.22, 0xe7ead2],
      ])
        this.wall
          .lineStyle(width, alpha === 0 ? 0 : color, alpha)
          .strokeEllipse(
            center.x,
            center.y,
            tuning.field.rx * 2,
            tuning.field.ry * 2,
          );
    }
    for (const l of current.layers) {
      const image = this.cel(l);
      image.setCrop();
    }
    for (const p of current.projectiles.filter((p) =>
      ['beam', 'warning'].includes(p.kind),
    ))
      this.beam(p, current.projectiles.indexOf(p));
    for (const [i, p] of current.heroes.entries()) {
      this.cel({
        id: 'hero-' + i,
        asset: p.asset,
        clip: p.pose + '_' + p.dir,
        x: p.x,
        y: p.y,
        clock: state.t,
        depth: p.y,
        loop: true,
        alpha: p.defeated ? 0.25 : 1,
      }).setCrop();
      this.text(
        'P' + (i + 1) + (p.defeated ? ' · Gục' : ''),
        p.x,
        p.y - 51,
        i === 0 ? '#d3f1c8' : '#c4d9ee',
      );
    }
    const b = current.bossPosition;
    if (state.id !== 'clones') {
      this.text(bosses[current.boss].name, b.x, b.y - 69);
      this.bar(b.x, b.y - 65, state.id === 'retry' ? current.bossHp : state.hp);
    }
    for (const l of current.layers.filter((l) => l.kind === 'dog'))
      this.bar(l.x, l.y - 47, l.hp, 46);
    for (let i = this.used; i < this.pool.length; i++)
      this.pool[i].setVisible(false);
    for (let i = this.labelUsed; i < this.labels.length; i++)
      this.labels[i].setVisible(false);
    $('phase').textContent = current.phase;
    $('note').textContent = current.note;
    $('readout').textContent =
      `${state.t.toFixed(2)} / ${current.duration.toFixed(2)}s`;
    $('timeline').value = state.t;
    $('revision-label').textContent =
      state.revision === 'candidate'
        ? 'Bản sửa đề xuất · Chờ duyệt'
        : 'Preview gốc · Đối chiếu';
    $('status').textContent = current.shiftLocked
      ? 'Đang hút · Shift khóa · Có thể giữ phím đi bộ'
      : state.id === 'spiral'
        ? 'Lướt về tâm → Thả rồng độc lập'
        : state.id === 'clones'
          ? 'Tâm phân thân = tâm arena'
          : state.id === 'entry'
            ? 'Cơ chế chung cho wave boss'
            : '';
  }
  update(_, delta) {
    if (!state.ready) return;
    if (state.playing && !$('settings').open) {
      const dt = Math.min(0.05, delta / 1000) * state.speed,
        previous = state.t;
      state.t += dt;
      dtObserved += dt;
      current = sceneAt(state.id, state.t, options());
      if (
        state.id === 'mai_pull' &&
        previous < tuning.mai.pullEnd &&
        state.t >= tuning.mai.pullEnd
      )
        state.releaseTarget = { ...state.player };
      if (state.id === 'nam_dash' && !state.dashTarget)
        state.dashTarget = { ...state.player };
      state.player = advancePlayer(state.player, keys, dt, current, previous);
      if (state.t >= current.duration) {
        state.cycles++;
        choose(state.id);
      }
    }
    this.draw();
  }
}
function displayScale() {
  return innerWidth >= 960 && innerHeight >= 600 ? 2 : 1;
}
const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: 640,
  height: 360,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#293e30',
  render: { antialias: false, preserveDrawingBuffer: true },
  audio: { noAudio: true },
  scale: { mode: Phaser.Scale.NONE, zoom: displayScale() },
  scene: Review,
});
function resize() {
  const z = displayScale();
  $('viewport').style.width = innerWidth + 'px';
  $('viewport').style.height = innerHeight + 'px';
  game.scale.resize(Math.ceil(innerWidth / z), Math.ceil(innerHeight / z));
  game.scale.setZoom(z);
}
addEventListener('resize', resize);
resize();
addEventListener('error', (e) => errors.push(e.message));
