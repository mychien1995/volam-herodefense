/* Presentation-only Phaser 4 scene. No game-core, server, network or combat authority. */
const D = await (await fetch('data.json')).json(),
  ROOT = '../../../../',
  $ = (id) => document.getElementById(id);
const MODES = [
  [
    'encounter',
    'Toàn trận · hai học trò → Pháp Vương',
    24,
    'Hoắc Đô liên tục đổi vị trí · Đạt Nhĩ Ba bảo vệ · chỉ hiện Pháp Vương khi cả hai đã rời trận',
  ],
  [
    'hoac_triple',
    'Hoắc Đô · Thiết Phiến Liên Hoàn',
    4,
    'Ba nhát quạt phía trước · nhát cuối có kiếm khí xuyên theo đường thẳng',
  ],
  [
    'hoac_gust',
    'Hoắc Đô · Cuồng Phong Tấn Lôi Công',
    6,
    'Ba luồng cuồng phong xòe quạt · hình ảnh đẩy lùi/giảm tốc, chưa có status thật',
  ],
  [
    'hoac_nails',
    'Hoắc Đô · Phiến Trung Độc Đinh',
    6,
    'Năm đinh độc theo nan quạt · đinh 2 đau hơn đinh 1; đủ 5 đinh gây chết là luật cần server thực thi',
  ],
  [
    'hoac_spin',
    'Hoắc Đô · Cuồng Phong Vạn Nhận',
    8,
    'Xoay người bằng bốn pose thật · ám khí liên tục bắn ra mọi phía',
  ],
  [
    'dat_basic',
    'Đạt Nhĩ Ba · Quét chùy',
    4,
    'Quét chùy 180° trước mặt · tầm rộng',
  ],
  [
    'dat_fissure',
    'Đạt Nhĩ Ba · Đại Lực Phá Sơn — nện đất',
    5,
    'Giơ chùy → nện → nứt đất → đúng 0,5 giây sau bùng nổ dọc vết nứt',
  ],
  [
    'dat_ward',
    'Đạt Nhĩ Ba · Bất Động Kim Cang',
    12,
    'Chỉ một luồng chân khí hộ thể, luân chuyển giữa hai học trò',
  ],
  [
    'dat_boulder',
    'Đạt Nhĩ Ba · Đại Lực Phá Sơn — ném đá',
    5,
    'Bê đá → chốt vị trí khi ném → bay nhanh về phía người chơi, có thể né',
  ],
  [
    'dat_triple',
    'Đạt Nhĩ Ba · Hàng Ma Tam Liên Chấn',
    7,
    'Ba nhịp nện · vòng nhỏ → vòng lớn → sóng xung kích rất lớn',
  ],
  [
    'kim_basic',
    'Pháp Vương · Đánh thường ngũ luân',
    4,
    'Năm luân quạt ra phía trước, phủ sát chân và vươn tới mốc người chơi tay dài',
  ],
  [
    'kim_hunt',
    'Pháp Vương · Kim Luân Truy Hồn',
    24,
    'Đúng năm kim luân bay lâu, bật quanh sân · không đổi hướng theo mục tiêu',
  ],
  [
    'kim_guard',
    'Pháp Vương · Ngũ Luân Hộ Thể',
    12,
    'Năm luân xoay quanh thân trên vùng rộng · hết xoay thì bắn theo năm hướng',
  ],
  [
    'kim_cage',
    'Pháp Vương · Ngũ Luân Phong Tỏa',
    10,
    'Một người bị nhốt trong luân xa · đồng đội tới gần và đánh A để phá trước xung kích',
  ],
  [
    'kim_stomp',
    'Pháp Vương · Long Tượng Chấn Thiên',
    6,
    'Dậm quanh thân · các vòng chấn động lan dần ra ngoài; choáng chưa phải status thật',
  ],
  [
    'kim_elephants',
    'Pháp Vương · Long Tượng Bát Nhã Công',
    13,
    'Mỏm đá trồi lên → đàn voi chạy từ trên xuống · đứng phía dưới mỏm đá để nấp',
  ],
  [
    'kim_enrage',
    'Pháp Vương · Long Tượng Bát Nhã Thập Tầng',
    16,
    'Bản xem tại HP 29% · voi đi xuyên sân ở làn ngẫu nhiên có seed · boss chạy/đánh nhanh hơn',
  ],
];
const T = {
  bounds: { left: 150, right: 1130, top: 260, bottom: 645 },
  fissureDelay: 0.5,
  wardPeriod: 4,
  ringLifetime: 20,
  ringSpeed: 260,
  orbitRadius: 145,
  orbitTime: 5,
  cageBreakHits: 3,
  elephantSpeed: 315,
  normalSpeed: 100,
  enrageMultiplier: 1.6,
};
let mode = 'encounter',
  t = 0,
  paused = false,
  speed = 1,
  party = 6,
  direction = 'down',
  keys = new Set(),
  rescue = false,
  breakHits = 0;
let player = { x: 640, y: 555, dir: 'down' },
  targets = {},
  state = {},
  ready = false,
  gallery = null;
const fixtureCycles = new Set(),
  fixtureCompletions = new Set(),
  fixtureEvents = [];
const seen = new Map(),
  completed = new Set(),
  errors = [],
  pool = new Map();
function meta() {
  return MODES.find((m) => m[0] === mode);
}
function reset() {
  t = 0;
  breakHits = 0;
  targets = {};
  player = { x: 640, y: 555, dir: 'down' };
  if (mode === 'kim_cage') player.x = 830;
  state = {};
  for (const s of pool.values()) s.destroy();
  pool.clear();
  $('timeline').max = meta()[2];
  $('caption').textContent = meta()[3];
}
function choose(id) {
  mode = id;
  $('mode').value = id;
  reset();
}
for (const [id, label] of MODES) {
  const o = new Option(label, id);
  $('mode').add(o);
}
$('mode').onchange = () => choose($('mode').value);
$('pause').onclick = () => {
  paused = !paused;
  $('pause').textContent = paused ? 'Chạy' : 'Dừng';
};
$('restart').onclick = reset;
$('party').onchange = () => (party = +$('party').value);
$('speed').onchange = () => (speed = +$('speed').value);
$('facing').onchange = () => (direction = $('facing').value);
$('rescue').onchange = () => (rescue = $('rescue').checked);
$('timeline').oninput = () => {
  t = +$('timeline').value;
  paused = true;
  $('pause').textContent = 'Chạy';
  targets = {};
};
for (const k of Object.keys(D.bundles)) $('bundle').add(new Option(k, k));
function showSheet() {
  const b = D.bundles[$('bundle').value];
  $('sheet').src = ROOT + b.image;
}
$('bundle').onchange = showSheet;
$('gallery').onclick = () => {
  gallery = true;
  showSheet();
  $('sheets').showModal();
  keys.clear();
};
$('close').onclick = () => {
  $('sheets').close();
  gallery = false;
};
$('sheets').addEventListener('close', () => (gallery = false));
addEventListener('keydown', (e) => {
  if (e.target.matches('input,select') || gallery) return;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key))
    e.preventDefault();
  keys.add(e.key);
  if (e.repeat) return;
  if (e.key === ' ') {
    $('pause').click();
  }
  if (e.key.toLowerCase() === 'h') $('tools').hidden = !$('tools').hidden;
  if (
    e.key.toLowerCase() === 'a' &&
    mode === 'kim_cage' &&
    t >= 1 &&
    t < 6 &&
    rescue
  )
    breakHits++;
});
addEventListener('keyup', (e) => keys.delete(e.key));
addEventListener('blur', () => keys.clear());
class ArtScene extends Phaser.Scene {
  preload() {
    this.load.on('loaderror', (f) => errors.push('load:' + f.url));
    for (const [key, b] of Object.entries(D.bundles))
      this.load.atlas(key, ROOT + b.image, {
        frames: b.frames,
        meta: { image: b.image },
      });
    for (const [key, p] of Object.entries(D.props))
      this.load.image('prop:' + key, ROOT + p.image);
    this.load.image('terrain', ROOT + D.terrain);
  }
  create() {
    this.cameras.main.setRoundPixels(true);
    for (const [key, b] of Object.entries(D.bundles)) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      for (const c of b.clips)
        this.anims.create({
          key: key + ':' + c.name,
          frames: c.frames.map((frame) => ({ key, frame })),
          frameRate: c.fps,
          repeat: c.repeat,
          skipMissedFrames: false,
        });
    }
    const ground = D.map.layers.find((l) => l.name === 'ground');
    this.textures.get('terrain').setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (let n = 1; n <= 256; n++)
      this.textures
        .get('terrain')
        .add(n, 0, ((n - 1) % 16) * 32, Math.floor((n - 1) / 16) * 32, 32, 32);
    for (let y = 0; y < ground.height; y++)
      for (let x = 0; x < ground.width; x++)
        this.add
          .image(x * 32, y * 32, 'terrain', ground.data[y * ground.width + x])
          .setOrigin(0)
          .setDepth(-10000);
    for (const o of D.map.layers.find((l) => l.name === 'scenery').objects)
      this.add
        .image(o.x, o.y, 'prop:' + o.name)
        .setOrigin(0.5, 1)
        .setDepth(o.y)
        .setName('prop:' + o.name);
    reset();
    ready = true;
    window.ART.scene = this;
  }
  update(_, delta) {
    if (!ready) return;
    const dt = Math.min(0.05, delta / 1000) * speed;
    if (!paused && !gallery) {
      t += dt;
      if (t > meta()[2]) reset();
    }
    if (!gallery) {
      const dx = +keys.has('ArrowRight') - +keys.has('ArrowLeft'),
        dy = +keys.has('ArrowDown') - +keys.has('ArrowUp'),
        len = Math.hypot(dx, dy);
      if (len) {
        player.x = Math.max(
          T.bounds.left,
          Math.min(T.bounds.right, player.x + (dx / len) * 170 * dt),
        );
        player.y = Math.max(
          T.bounds.top,
          Math.min(T.bounds.bottom, player.y + (dy / len) * 170 * dt),
        );
        player.dir =
          Math.abs(dx) > Math.abs(dy)
            ? dx > 0
              ? 'right'
              : 'left'
            : dy > 0
              ? 'down'
              : 'up';
      }
      player.walking = !!len;
    }
    for (const s of pool.values()) s.setData('used', false);
    state = {
      mode,
      time: t,
      castDirection: 'down',
      party,
      objects: [],
      cageBroken: false,
    };
    this.drawWorld();
    for (const s of pool.values())
      if (!s.getData('used')) {
        s.setVisible(false);
        s.anims?.pause();
      }
    if (document.activeElement !== $('timeline')) $('timeline').value = t;
    $('time').textContent = t.toFixed(1) + 's';
  }
  cel(id, key, clip, x, y, opts = {}) {
    const b = D.bundles[key],
      c = b.clips.find((v) => v.name === clip);
    if (!c) throw Error('Missing clip ' + key + ':' + clip);
    const animation = key + ':' + clip;
    let s = pool.get(id);
    if (!s) {
      s = this.add.sprite(x, y, key, c.frames[0]);
      pool.set(id, s);
      const observe = () => {
        const k = s.anims.currentAnim?.key;
        if (!k) return;
        const a = seen.get(k) || new Set();
        a.add(String(s.frame.name));
        if (id === 'fixture')
          fixtureEvents.push({
            key: k,
            frame: String(s.frame.name),
            at: performance.now(),
          });
        seen.set(k, a);
      };
      s.on(Phaser.Animations.Events.ANIMATION_UPDATE, observe);
      s.on(Phaser.Animations.Events.ANIMATION_START, observe);
      s.on(Phaser.Animations.Events.ANIMATION_REPEAT, () => {
        if (id === 'fixture') fixtureCycles.add(s.anims.currentAnim.key);
      });
      s.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (id === 'fixture') fixtureCompletions.add(s.anims.currentAnim.key);
      });
      s.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () =>
        completed.add(s.anims.currentAnim.key),
      );
    }
    const token = opts.token ?? Math.floor(t / (c.frames.length / c.fps));
    if (s.getData('clip') !== animation || s.getData('token') !== token) {
      s.setTexture(key, c.frames[0]);
      s.play(animation);
      s.setData('clip', animation).setData('token', token);
    }
    if (paused || opts.frame !== undefined) {
      s.anims.pause();
      s.setFrame(
        c.frames[
          opts.frame ??
            Math.min(
              c.frames.length - 1,
              Math.floor(t * c.fps) % c.frames.length,
            )
        ],
      );
    } else s.anims.resume();
    s.anims.timeScale = speed;
    const origin = opts.origin || b.origin;
    s.setPosition(Math.round(x), Math.round(y))
      .setOrigin(...origin)
      .setScale(opts.scale ?? 1)
      .setRotation(opts.angle ?? 0)
      .setAlpha(opts.alpha ?? 1)
      .setDepth(opts.depth ?? y + 0.1)
      .setVisible(true)
      .setData('used', true);
    state.objects.push({
      id,
      key,
      clip,
      x,
      y,
      frame: String(s.frame.name),
      depth: s.depth,
      origin: [s.originX, s.originY],
      scale: s.scaleX,
    });
    return s;
  }
  actor(who, x, y, clip = null, token) {
    return this.cel(
      who,
      who + (clip ? '_actions' : '_base'),
      clip || 'idle_' + direction,
      x,
      y,
      { token },
    );
  }
  fx(id, who, clip, x, y, opts = {}) {
    return this.cel(id, who + '_fx', clip, x, y, {
      origin: [0.5, 0.65],
      ...opts,
    });
  }
  radial(id, who, clip, x, y, count, radius, phase = 0, opts = {}) {
    for (let i = 0; i < count; i++) {
      const a = phase + (i * Math.PI * 2) / count;
      this.fx(
        id + i,
        who,
        clip,
        x + Math.cos(a) * radius,
        y + Math.sin(a) * radius,
        opts,
      );
    }
  }
  bolt(id, who, clip, from, angle, distance, opts = {}) {
    this.fx(
      id,
      who,
      clip,
      from.x + Math.cos(angle) * distance,
      from.y + Math.sin(angle) * distance,
      { angle: angle - Math.PI / 2, ...opts },
    );
  }
  heroes() {
    for (let i = 0; i < party; i++) {
      const p = i
        ? { x: 350 + (i - 1) * 145, y: 550 + (i % 2) * 45, dir: 'up' }
        : player;
      this.cel(
        'hero' + i,
        'hero',
        (i === 0 && p.walking ? 'walk_' : 'idle_') + p.dir,
        p.x,
        p.y,
        { token: 0 },
      );
    }
  }
  drawWorld() {
    const b = { x: 640, y: 410 },
      h = { x: 535 + Math.sin(t * 1.7) * 110, y: 350 + Math.sin(t * 2.1) * 38 },
      d = { x: 745 + Math.sin(t * 0.4) * 18, y: 365 };
    const local = t % 4,
      beat = Math.floor(t / 4);
    if (mode === 'encounter') {
      state.disciples = { hoac: t < 6, dat: t < 12 };
      state.kimVisible = t >= 12;
      if (t < 6)
        this.cel(
          'hoac_do',
          'hoac_do_base',
          'walk_' + (Math.cos(t * 1.7) > 0 ? 'right' : 'left'),
          h.x,
          h.y,
        );
      if (t < 12)
        this.actor('dat_nhi_ba', d.x, d.y, t % 3 < 0.4 ? 'transfer' : null);
      const target = t >= 6 ? d : t % 8 < 4 ? d : h;
      if (t < 12)
        this.fx('ward', 'dat_nhi_ba', 'ward', target.x, target.y, {
          scale: 0.8,
          alpha: 0.7,
        });
      if (t >= 12) {
        this.actor('kim_luan', b.x, b.y, 'invoke', 0);
        this.radial('ring', 'kim_luan', 'chakram', b.x, b.y, 5, 110, t * 1.2, {
          scale: 0.3,
        });
      }
    } else if (mode.startsWith('hoac_')) {
      const moving = mode === 'hoac_spin' ? b : h;
      const cast =
        mode === 'hoac_triple'
          ? 'triple_fan'
          : mode === 'hoac_gust'
            ? 'gust'
            : mode === 'hoac_nails'
              ? 'nails'
              : 'spin';
      this.actor('hoac_do', moving.x, moving.y, cast, Math.floor(t / 0.65));
      if (mode === 'hoac_triple') {
        const q = t % 2.5,
          n = Math.floor((q - 0.35) / 0.35);
        if (n >= 0 && n <= 2)
          this.fx('slash' + n, 'hoac_do', 'slash', moving.x, moving.y + 55, {
            scale: 1,
            token: n,
          });
        if (q >= 1.05 && q < 2.35)
          this.fx(
            'pierce',
            'hoac_do',
            'slash',
            moving.x,
            moving.y + 80 + (q - 1.05) * 290,
            { scale: 0.8, frame: 2 },
          );
        state.slashCount = Math.max(0, Math.min(3, n + 1));
      }
      if (mode === 'hoac_gust' || mode === 'hoac_nails') {
        if (t >= 0.5 && !targets.hoac) targets.hoac = { ...moving };
        const origin = targets.hoac || moving;
        const n = mode === 'hoac_gust' ? 3 : 5,
          dist = Math.max(0, t - 0.5) * (mode === 'hoac_gust' ? 125 : 250);
        for (let i = 0; i < n; i++)
          this.bolt(
            'shot' + i,
            'hoac_do',
            mode === 'hoac_gust' ? 'gust' : 'nail',
            origin,
            Math.PI / 2 + (i - (n - 1) / 2) * 0.27,
            dist,
            { scale: mode === 'hoac_gust' ? 0.7 : 0.25 },
          );
        state.projectileCount = n;
      }
      if (mode === 'hoac_spin') {
        this.fx('spin', 'hoac_do', 'whirlwind', b.x, b.y + 4, {
          scale: 1.4,
          alpha: 0.75,
        });
        for (
          let burst = Math.max(0, Math.floor(t / 0.75) - 4);
          burst <= Math.floor(t / 0.75);
          burst++
        ) {
          const age = t - burst * 0.75;
          if (age < 0 || age > 3) continue;
          this.radial(
            'nails' + burst,
            'hoac_do',
            'nail',
            b.x,
            b.y,
            12,
            age * 165,
            burst * 0.21,
            { scale: 0.2 },
          );
        }
      }
    } else if (mode.startsWith('dat_')) {
      const action =
        mode === 'dat_basic'
          ? 'sweep'
          : mode === 'dat_ward'
            ? 'transfer'
            : mode === 'dat_boulder'
              ? 'boulder'
              : 'slam';
      this.actor(
        'dat_nhi_ba',
        b.x,
        b.y,
        action,
        mode === 'dat_triple' ? Math.floor(t / 1.5) : beat,
      );
      if (mode === 'dat_basic' && local > 0.25 && local < 0.7)
        this.fx('sweep', 'hoac_do', 'slash', b.x, b.y + 70, { scale: 1.8 });
      if (mode === 'dat_fissure') {
        const impact = 0.4,
          explosion = impact + T.fissureDelay;
        if (t >= impact)
          this.fx('crack', 'dat_nhi_ba', 'fissure', b.x, b.y + 155, {
            scale: 1.6,
            frame: t < explosion ? 0 : t < explosion + 0.4 ? 2 : 3,
            alpha: t > 2 ? 0.4 : 1,
            depth: 300,
          });
        state.impactAt = impact;
        state.explosionAt = explosion;
        state.exploding = t >= explosion;
      }
      if (mode === 'dat_ward') {
        this.cel(
          'hoac_do',
          'hoac_do_base',
          'walk_' + (Math.cos(t) > 0 ? 'right' : 'left'),
          h.x,
          h.y,
        );
        const transfer = t % T.wardPeriod,
          from = Math.floor(t / T.wardPeriod) % 2 === 0 ? b : h,
          to = from === b ? h : b,
          progress = Math.min(1, Math.max(0, (transfer - 3) / 1));
        const target = {
          x: from.x + (to.x - from.x) * progress,
          y: from.y + (to.y - from.y) * progress,
        };
        this.fx('sole-ward', 'dat_nhi_ba', 'ward', target.x, target.y, {
          scale: 0.85,
          alpha: 0.8,
        });
        state.wardCount = 1;
        state.wardProgress = progress;
      }
      if (mode === 'dat_boulder') {
        if (t >= 0.55 && !targets.boulder) targets.boulder = { ...player };
        if (targets.boulder) {
          const a = Math.atan2(
            targets.boulder.y - b.y,
            targets.boulder.x - b.x,
          );
          this.bolt('rock', 'dat_nhi_ba', 'boulder', b, a, (t - 0.55) * 620, {
            scale: 0.55,
          });
          state.capturedTarget = targets.boulder;
        }
      }
      if (mode === 'dat_triple')
        for (let i = 0; i < 3; i++) {
          const age = t - (0.5 + i * 1.5);
          if (age >= 0 && age < 1.2)
            this.fx('quake' + i, 'dat_nhi_ba', 'shockwave', b.x, b.y + 10, {
              scale: (i + 1) * 1.2,
              frame: Math.min(3, Math.floor(age / 0.3)),
              alpha: 1 - age / 1.5,
              depth: 300,
            });
        }
    } else {
      this.actor(
        'kim_luan',
        b.x,
        b.y,
        ['kim_stomp'].includes(mode)
          ? 'stomp'
          : ['kim_elephants', 'kim_enrage'].includes(mode)
            ? 'invoke'
            : mode === 'kim_basic'
              ? 'sweep'
              : 'channel',
        beat,
      );
      if (mode === 'kim_basic' && local >= 0.3 && local < 1.8) {
        for (let i = 0; i < 5; i++)
          this.bolt(
            'sweep' + i,
            'kim_luan',
            'chakram',
            b,
            Math.PI / 2 + (i - 2) * 0.38,
            50 + (local - 0.3) * 200,
            { scale: 0.32 },
          );
        state.projectileCount = 5;
        state.forwardReach = 350;
      }
      if (mode === 'kim_hunt') {
        for (let i = 0; i < 5 && t >= 0.5 && t < T.ringLifetime + 0.5; i++) {
          const a = 0.4 + (i * Math.PI * 2) / 5,
            elapsed = Math.max(0, t - 0.5),
            rx = b.x + Math.cos(a) * elapsed * T.ringSpeed,
            ry = b.y + Math.sin(a) * elapsed * T.ringSpeed;
          const bounce = (v, lo, hi) => {
            const span = hi - lo,
              n = (((v - lo) % (2 * span)) + 2 * span) % (2 * span);
            return lo + (n < span ? n : 2 * span - n);
          };
          this.fx(
            'hunt' + i,
            'kim_luan',
            'chakram',
            bounce(rx, 160, 1120),
            bounce(ry, 270, 630),
            { scale: 0.35 },
          );
        }
        state.projectileCount = 5;
        state.homing = false;
      }
      if (mode === 'kim_guard') {
        for (let i = 0; i < 5; i++) {
          const a = (i * Math.PI * 2) / 5 + Math.min(t, T.orbitTime) * 2.5,
            r =
              t < T.orbitTime
                ? T.orbitRadius
                : T.orbitRadius + (t - T.orbitTime) * 240;
          this.bolt('orbit' + i, 'kim_luan', 'chakram', b, a, r, {
            scale: 0.4,
          });
        }
        state.stage = t < T.orbitTime ? 'orbit' : 'release';
        state.projectileCount = 5;
      }
      if (mode === 'kim_cage') {
        if (t >= 0.5 && !targets.cage)
          targets.cage = { x: player.x, y: player.y };
        const p = targets.cage;
        if (p) {
          const freed = breakHits >= T.cageBreakHits;
          state.cageBroken = freed;
          state.rescueHits = breakHits;
          if (!freed && t < 6) {
            player.x = p.x;
            player.y = p.y;
            this.fx('cage', 'kim_luan', 'cage', p.x, p.y, {
              scale: 0.8,
              frame: t < 1 ? 0 : 1,
            });
          }
          if (rescue && party > 1)
            for (let i = 1; i < party; i++)
              this.cel(
                'rescue' + i,
                'hero',
                t < 3 ? 'walk_right' : 'basic_attack_right',
                p.x - 100 - Math.max(0, 3 - t) * 40,
                p.y + i * 8,
              );
          if (t >= 4 && t < 6)
            this.fx('charge', 'kim_luan', 'empower', b.x, b.y, {
              scale: 1.5,
              alpha: 0.55,
            });
          if (t >= 6 && t < 8) {
            const a = Math.atan2(p.y - b.y, p.x - b.x);
            this.bolt('burst', 'kim_luan', 'shockwave', b, a, (t - 6) * 500, {
              scale: 1.5,
            });
          }
        }
      }
      if (mode === 'kim_stomp')
        for (let i = 0; i < 4; i++) {
          const age = t - 0.5 - i * 0.6;
          if (age >= 0 && age < 1.4)
            this.fx('stomp' + i, 'dat_nhi_ba', 'shockwave', b.x, b.y + 8, {
              scale: 0.8 + i * 1.15,
              frame: Math.min(3, Math.floor(age / 0.35)),
              alpha: 1 - age / 1.7,
              depth: 300,
            });
        }
      if (mode === 'kim_elephants' || mode === 'kim_enrage') {
        const rocks = [
          { x: 405, y: 400 },
          { x: 650, y: 430 },
          { x: 890, y: 380 },
        ];
        if (mode === 'kim_elephants' && t > 0.7)
          for (let i = 0; i < rocks.length; i++) {
            const r = rocks[i];
            this.cel('shelter' + i, 'elephant', 'shelter_rise', r.x, r.y, {
              frame: Math.min(2, Math.floor((t - 0.7) * 3)),
              origin: [0.5, 0.9],
              token: 0,
            });
          }
        let laneSeed = 337;
        const randomLane = () => {
          laneSeed = (Math.imul(laneSeed, 1664525) + 1013904223) >>> 0;
          return 190 + (laneSeed % 900);
        };
        const lanes =
          mode === 'kim_elephants'
            ? [220, 405, 650, 890, 1080]
            : Array.from({ length: 7 }, randomLane);
        const start = mode === 'kim_elephants' ? 3 : 1.5;
        for (let i = 0; i < lanes.length; i++) {
          const age =
            t - start - (mode === 'kim_elephants' ? (i % 2) * 0.4 : i * 1.5);
          if (age >= 0 && age < 2.4) {
            const rock =
              mode === 'kim_elephants'
                ? rocks.find((r) => Math.abs(r.x - lanes[i]) < 56)
                : null;
            const y = 180 + age * T.elephantSpeed;
            if (!rock || y < rock.y - 26)
              this.cel('elephant' + i, 'elephant', 'run_down', lanes[i], y, {
                scale: 1,
                origin: [0.5, 0.82],
              });
            else if (y < rock.y + 90)
              this.fx(
                'rock-impact' + i,
                'dat_nhi_ba',
                'shockwave',
                rock.x,
                rock.y - 15,
                { scale: 0.65, alpha: 0.6 },
              );
          }
        }
        const protectedBy = rocks.find(
          (r) =>
            Math.abs(player.x - r.x) < 55 &&
            player.y > r.y &&
            player.y < r.y + 135,
        );
        state.sheltered = mode === 'kim_elephants' && !!protectedBy;
        state.safeRock = protectedBy || null;
        if (mode === 'kim_enrage') {
          const x = b.x + Math.sin(t * 1.9) * 200,
            y = b.y + Math.sin(t * 1.3) * 60;
          this.actor(
            'kim_luan',
            x,
            y,
            t % 0.65 < 0.4 ? 'sweep' : null,
            Math.floor(t / 0.65),
          );
          this.fx('rage', 'kim_luan', 'empower', x, y + 10, {
            scale: 1.2,
            alpha: 0.65,
            depth: y - 0.2,
          });
          state.hpPercent = 29;
          state.speedMultiplier = T.enrageMultiplier;
          state.lanes = lanes;
        }
      }
    }
    this.heroes();
    if (mode === 'kim_elephants')
      $('caption').textContent =
        meta()[3] +
        (state.sheltered
          ? '\nĐANG NẤP SAU ĐÁ'
          : '\nDi chuyển xuống phía sau mỏm đá');
    if (mode === 'kim_cage')
      $('caption').textContent =
        meta()[3] +
        '\n' +
        (state.cageBroken
          ? 'Luân xa đã vỡ'
          : breakHits + '/' + T.cageBreakHits + ' đòn minh họa');
    if (window.ART.fixture) {
      const f = window.ART.fixture;
      this.cel('fixture', f.key, f.clip, 640, 430, { token: 0 });
    }
  }
}
window.ART = {
  get ready() {
    return ready;
  },
  choose,
  reset,
  MODES,
  T,
  D,
  get state() {
    return structuredClone(state);
  },
  get player() {
    return { ...player };
  },
  setPlayer(x, y) {
    player.x = x;
    player.y = y;
  },
  setTime(v, pause = true) {
    t = v;
    paused = pause;
    targets = {};
  },
  play() {
    paused = false;
  },
  pause() {
    paused = true;
  },
  setParty(n) {
    party = n;
    $('party').value = n;
  },
  setRescue(v) {
    rescue = v;
    $('rescue').checked = v;
  },
  get observed() {
    return Object.fromEntries([...seen].map(([k, v]) => [k, [...v]]));
  },
  get fixtureCycles() {
    return [...fixtureCycles];
  },
  get fixtureCompletions() {
    return [...fixtureCompletions];
  },
  get fixtureEvents() {
    return [...fixtureEvents];
  },
  get completed() {
    return [...completed];
  },
  errors,
  fixture: null,
};
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#26312b',
  antialias: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: ArtScene,
  audio: { noAudio: true },
});
