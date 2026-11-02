/* Presentation-only art demo, adapted from the retained Kim Luan Phaser viewer.
   No imports from game-core/protocol, rooms, damage or production asset registry. */
import {
  DEMO,
  PATHS,
  constrain,
  formation,
  radialPlan,
  petalPlan,
  dashPath,
  clawStrokes,
} from './choreography.mjs';
const D = await (await fetch('data.json')).json(),
  ROOT = '../../../../';
const $ = (id) => document.getElementById(id);
const MODES = [
  [
    'entry',
    'Xuất hiện từ hướng đông',
    5,
    'Đi giữa đường phía đông → vào tâm sân → ẩn tượng, gom cả đội và khóa sân tròn cùng một ít rìa.',
  ],
  [
    'sprites',
    'Sprite nhân vật · bốn hướng',
    6,
    'Giữ thiết kế Đông Tà / Mai Siêu Phong / Hoàng Dung. Chọn hướng trong Tuỳ chỉnh.',
  ],
  [
    'thrust',
    'A · Tà Kiếm Liên Kích',
    3,
    'Liên tiếp đâm phủ 180° phía trước, vươn qua tầm Chưởng Cái Bang và Phiến Thiên Sơn.',
  ],
  [
    'fan',
    'A · Lạc Anh Kiếm Pháp',
    3,
    'Xuất kiếm quét hình quạt trước mặt, xen cánh hoa đào.',
  ],
  [
    'pebbles',
    'Q · Đàn Chỉ Thần Công',
    3,
    'Một đợt bi tỏa 360° quanh Đông Tà; mỗi lần thử chọn ngẫu nhiên từ 8 đến 14 hướng.',
  ],
  [
    'dash',
    'W · Lạc Anh Kiếm Pháp',
    5,
    'Lướt rộng theo tam giác / vuông / thoi / Z ngẫu nhiên; vệt kiếm và vùng quét dọc đường rộng hơn.',
  ],
  [
    'petals',
    'E · Ngọc Tiêu Hồi Phong',
    6,
    'Thổi sáo, rải cánh hoa ngẫu nhiên khắp sân tròn; mỗi cụm chờ 2,8 giây rồi nổ.',
  ],
  [
    'summon',
    'R · Triệu Hồn Đông Hải',
    6,
    'Qua ngưỡng dưới 40% HP, gọi cả Mai Siêu Phong và Hoàng Dung đúng một lần.',
  ],
  [
    'claws',
    'Mai Siêu Phong · Bạch Cốt Trảo',
    8,
    'Hai đường vuốt đỏ đô giao nhau tại Mai: một từ trên xuống, một từ dưới lên.',
  ],
  [
    'ranged',
    'Mai Siêu Phong · Ma Ảnh Tróc Hồn',
    4,
    'Liên tiếp phóng vuốt xa về đúng người đã bị khoá.',
  ],
  [
    'pull',
    'Mai Siêu Phong · Âm Phong Hấp Lực',
    4,
    'Gió đỏ đô hút người chơi bị khoá về gần Mai Siêu Phong.',
  ],
  [
    'poison',
    'Mai Siêu Phong · Độc Cốt Bạo',
    6,
    'Ném một bọc độc → nổ khi chạm đất → vùng độc còn tồn tại.',
  ],
  [
    'heal',
    'Hoàng Dung · Thanh Âm Hộ Trợ',
    6,
    'Liên tục bắn chưởng hồi máu tới Đông Tà và Mai Siêu Phong.',
  ],
  [
    'evade',
    'Hoàng Dung · Linh Xà Bộ',
    4,
    'Tăng tốc chạy đột ngột với vệt di chuyển ngọc/hoa đào.',
  ],
];
const B = { x: DEMO.field.x, y: DEMO.field.y },
  V = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] };
let scene,
  ready = false,
  mode = 'entry',
  t = 0,
  paused = false,
  speed = 1,
  direction = 'right',
  party = 2,
  pathChoice = 'random',
  seed = 1,
  fixture = null;
let p1 = formation(0),
  keys = new Set(),
  shots = new Map(),
  seen = new Map(),
  cycles = new Set(),
  completions = new Set(),
  errors = [],
  pool = new Map(),
  state = {},
  seekPending = false;
let encounterLocked = false,
  positions = [],
  alive = Array(6).fill(true),
  maiTarget = 0,
  maiFeet = { ...B },
  demoDt = 0,
  radial = radialPlan(seed),
  petals = petalPlan(seed);
function gatherPlayers(locked) {
  positions = locked
    ? Array.from({ length: 6 }, (_, i) => formation(i))
    : [
        { x: 1090, y: 440 },
        { x: 300, y: 420 },
        { x: 1020, y: 530 },
        { x: 280, y: 230 },
        { x: 990, y: 200 },
        { x: 510, y: 620 },
      ];
  p1 = { ...positions[0] };
}
const meta = () => MODES.find((m) => m[0] === mode);
const point = (n = 1) => ({
  x: B.x + V[direction][0] * n,
  y: B.y + V[direction][1] * n,
});
const mix = (a, b, k) => ({
  x: a.x + (b.x - a.x) * k,
  y: a.y + (b.y - a.y) * k,
});
const face = (a, b) =>
  Math.abs(b.x - a.x) >= Math.abs(b.y - a.y)
    ? b.x > a.x
      ? 'right'
      : 'left'
    : b.y > a.y
      ? 'down'
      : 'up';
const angle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
function reset() {
  t = 0;
  shots.clear();
  seekPending = true;
  seed = (1664525 * seed + 1013904223) >>> 0;
  fixture = null;
  encounterLocked = false;
  alive = Array(6).fill(true);
  maiTarget = 0;
  maiFeet = { ...B };
  radial = radialPlan(seed);
  petals = petalPlan(seed);
  gatherPlayers(false);
  for (const s of pool.values()) s.destroy();
  pool.clear();
  $('timeline').max = meta()[2];
  $('description').textContent = meta()[3];
  $('title').textContent = meta()[1];
  $('notice').textContent = 'Bản thử chuyển động · thông số demo · chờ duyệt';
}
function choose(id) {
  mode = id;
  $('mode').value = id;
  reset();
}
for (const [id, label] of MODES) $('mode').add(new Option(label, id));
$('mode').onchange = () => choose($('mode').value);
$('restart').onclick = reset;
$('pause').onclick = () => {
  paused = !paused;
  $('pause').textContent = paused ? 'Chạy' : 'Dừng';
  seekPending = true;
};
$('timeline').oninput = () => {
  t = +$('timeline').value;
  paused = true;
  shots.clear();
  seekPending = true;
  $('pause').textContent = 'Chạy';
};
$('prev').onclick = () => seek(Math.max(0, t - 0.1));
$('next').onclick = () => seek(Math.min(meta()[2] - 0.01, t + 0.1));
$('facing').onchange = () => {
  direction = $('facing').value;
  const q = point(245);
  p1 = q;
  reset();
};
$('party').onchange = () => (party = +$('party').value);
$('path').onchange = () => {
  pathChoice = $('path').value;
  reset();
};
$('speed').onchange = () => (speed = +$('speed').value);
$('zoom').onchange = () => scene.cameras.main.setZoom(+$('zoom').value);
$('settings-toggle').onclick = () => {
  $('settings').hidden = !$('settings').hidden;
  $('settings-toggle').setAttribute(
    'aria-expanded',
    String(!$('settings').hidden),
  );
  keys.clear();
};
$('close-settings').onclick = () => {
  $('settings').hidden = true;
  $('settings-toggle').setAttribute('aria-expanded', 'false');
};
$('fullscreen').onclick = () =>
  document.fullscreenElement
    ? document.exitFullscreen()
    : $('viewport').requestFullscreen();
function seek(time) {
  t = time;
  paused = true;
  seekPending = true;
  $('pause').textContent = 'Chạy';
}
addEventListener('keydown', (e) => {
  if (e.target.matches('input,select,button') || !$('settings').hidden) return;
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key))
    e.preventDefault();
  keys.add(e.key);
  if (e.repeat) return;
  if (e.key === ' ') $('pause').click();
  if (e.key.toLowerCase() === 'h') $('tools').hidden = !$('tools').hidden;
  const hot = {
    a: 'thrust',
    q: 'pebbles',
    w: 'dash',
    e: 'petals',
    r: 'summon',
  };
  if (hot[e.key.toLowerCase()]) choose(hot[e.key.toLowerCase()]);
});
addEventListener('keyup', (e) => keys.delete(e.key));
addEventListener('blur', () => keys.clear());
class Review extends Phaser.Scene {
  preload() {
    this.load.on('loaderror', (f) => errors.push('load:' + f.url));
    for (const [key, b] of Object.entries(D.bundles))
      this.load.atlas(key, ROOT + b.image, {
        frames: b.frames,
        meta: { image: b.image },
      });
    this.load.image('ground', ROOT + D.ground);
    this.load.atlas('world', ROOT + D.worldImage, ROOT + D.worldAtlas);
  }
  create() {
    scene = this;
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
    this.add.image(-160, -240, 'ground').setOrigin(0).setDepth(-10000);
    for (const [id, x, y] of [
      ['statue_male', 640, 336],
      ['tree_jade', 170, 290],
      ['tree_blossom', 1100, 300],
      ['bamboo', 170, 490],
      ['bamboo', 1130, 490],
      ['red_banner', 300, 290],
      ['red_banner', 990, 290],
      ['lantern', 584, 338],
      ['lantern', 696, 338],
    ]) {
      const prop = this.add
        .image(x, y, 'world', id)
        .setOrigin(0.5, 184 / 192)
        .setDepth(y);
      if (id === 'statue_male') this.statue = prop;
    }
    const f = DEMO.field;
    Object.assign($('encounter-boundary').style, {
      left: (f.x - f.radiusX) / 12.8 + '%',
      top: (f.y - f.radiusY) / 7.2 + '%',
      width: (2 * f.radiusX) / 12.8 + '%',
      height: (2 * f.radiusY) / 7.2 + '%',
    });
    reset();
    ready = true;
  }
  cel(id, key, clip, x, y, local = 0, o = {}) {
    const b = D.bundles[key],
      c = b.clips.find((v) => v.name === clip);
    if (!c) throw Error('Missing clip ' + key + ':' + clip);
    let s = pool.get(id);
    if (!s) {
      s = this.add.sprite(x, y, key, c.frames[0]);
      pool.set(id, s);
      const observe = () => {
        const a = s.anims.currentAnim?.key;
        if (!a) return;
        const set = seen.get(a) || new Set();
        set.add(String(s.frame.name));
        seen.set(a, set);
      };
      s.on('animationstart', observe);
      s.on('animationupdate', observe);
      s.on('animationrepeat', () => cycles.add(s.anims.currentAnim.key));
      s.on('animationcomplete', () => completions.add(s.anims.currentAnim.key));
    }
    const anim = key + ':' + clip,
      token = o.token ?? 0;
    if (s.getData('anim') !== anim || s.getData('token') !== token) {
      s.setTexture(key, c.frames[0]);
      s.play(anim);
      s.setData('anim', anim).setData('token', token);
    }
    s.anims.timeScale = speed * (o.rate ?? 1);
    if (paused || seekPending || o.frame !== undefined) {
      const i =
        o.frame ??
        (o.loop || c.repeat === -1
          ? Math.floor(Math.max(0, local) * c.fps) % c.frames.length
          : Math.min(
              c.frames.length - 1,
              Math.floor(Math.max(0, local) * c.fps),
            ));
      s.anims.pause();
      s.setFrame(c.frames[i]);
    } else s.anims.resume();
    s.setPosition(Math.round(x), Math.round(y))
      .setOrigin(...b.origin)
      .setScale(o.scale ?? 1)
      .setRotation(o.angle ?? 0)
      .setFlipX(o.flip ?? false)
      .setAlpha(o.alpha ?? 1)
      .setDepth(o.depth ?? y + 0.1)
      .setVisible(true)
      .setData('used', true);
    state.objects.push({
      id,
      key,
      clip,
      x: s.x,
      y: s.y,
      frame: String(s.frame.name),
      origin: [s.originX, s.originY],
      scale: s.scaleX,
      depth: s.depth,
      angle: s.rotation,
      flip: s.flipX,
    });
    return s;
  }
  actor(id, key, p, action = 'idle', d = direction, local = t, o = {}) {
    return this.cel(id, key, action + '_' + d, p.x, p.y, local, o);
  }
  fx(id, key, clip, p, local = 0, o = {}) {
    return this.cel(id, key, clip, p.x, p.y, local, o);
  }
  update(_, delta) {
    if (!ready) return;
    const dt = Math.min(0.05, delta / 1000) * speed;
    demoDt = dt;
    if (!paused) {
      t += dt;
      if (t > meta()[2]) {
        if ($('auto').checked)
          choose(
            MODES[
              (MODES.findIndex((m) => m[0] === mode) + 1) % MODES.length
            ][0],
          );
        else reset();
      }
    }
    if (!paused && !fixture) {
      let dx = +keys.has('ArrowRight') - +keys.has('ArrowLeft'),
        dy = +keys.has('ArrowDown') - +keys.has('ArrowUp'),
        n = Math.hypot(dx, dy);
      if (n) {
        p1.x = clamp(p1.x + (dx / n) * 180 * dt, 60, 1220);
        p1.y = clamp(p1.y + (dy / n) * 180 * dt, 80, 680);
        if (encounterLocked) p1 = constrain(p1);
      }
    }
    for (const s of pool.values()) s.setData('used', false);
    state = {
      mode,
      time: t,
      party,
      direction,
      objects: [],
      projectiles: [],
      phase: 'Chuẩn bị',
      serverMechanics: false,
    };
    state.encounter = this.encounter();
    if (fixture) {
      this.cel('fixture', fixture.key, fixture.clip, 650, 450, t, {
        token: fixture.token,
      });
    } else this.draw();
    for (const s of pool.values())
      if (!s.getData('used')) {
        s.setVisible(false);
        s.anims.pause();
      }
    seekPending = false;
    $('timeline').value = t;
    $('time').textContent = t.toFixed(2) + 's';
    $('phase').textContent = state.phase;
  }
  encounter() {
    const locked =
      !fixture &&
      mode !== 'sprites' &&
      (mode !== 'entry' || t >= DEMO.entry.arriveAt);
    if (locked && !encounterLocked) gatherPlayers(true);
    if (!locked && encounterLocked && mode === 'entry') gatherPlayers(false);
    encounterLocked = locked;
    if (locked) p1 = constrain(p1);
    this.statue?.setVisible(!locked);
    $('encounter-boundary').hidden = !locked;
    return {
      locked,
      statueVisible: !locked,
      field: DEMO.field,
      allPlayersGathered: locked,
      statueTargeted: false,
    };
  }

  players(dead = false, override = null) {
    const heroes = [override ?? p1, ...positions.slice(1)];
    for (let i = 0; i < party; i++) {
      if (!alive[i] || (dead && i === 0)) continue;
      const p = heroes[i];
      this.actor(
        'p' + i,
        i === 0 ? 'cai' : i === 1 ? 'thien' : 'hero',
        p,
        'idle',
        'left',
      );
    }
    state.players = heroes.slice(0, party);
  }
  draw() {
    const front = V[direction],
      rightAngle = Math.atan2(front[1], front[0]);
    if (mode === 'sprites') {
      this.players();
      for (const [i, key] of ['dong', 'mai', 'hoang'].entries()) {
        const action = t < 1.5 ? 'idle' : t < 4 ? 'walk' : 'idle';
        this.actor(
          key,
          key,
          { x: 470 + i * 160, y: 445 },
          action,
          direction,
          t < 4 ? t - 1.5 : t,
        );
      }
      state.phase = t < 1.5 ? 'Đứng yên' : t < 4 ? 'Đi bộ' : 'Đứng yên';
      return;
    }
    if (mode === 'entry') {
      this.players();
      const arrive = DEMO.entry.arriveAt,
        p = mix({ x: DEMO.entry.fromX, y: B.y }, B, clamp(t / arrive));
      this.actor('dong', 'dong', p, t < arrive ? 'walk' : 'idle', 'left');
      if (t >= arrive && t < arrive + DEMO.entry.gatherFlash) {
        for (let i = 0; i < party; i++)
          this.fx(
            'gather' + i,
            'summon',
            'summon_column',
            i === 0 ? p1 : positions[i],
            t - arrive,
            { depth: 90 },
          );
      }
      state.phase =
        t < arrive ? 'Giữa đường phía đông' : 'Ẩn tượng · gom đội · khóa sân';
      state.statueTargeted = false;
      return;
    }
    if (['heal', 'evade', 'summon'].includes(mode)) {
      this.support();
      return;
    }
    if (['claws', 'ranged', 'pull', 'poison'].includes(mode)) {
      this.mai();
      return;
    }
    this.players();
    if (mode === 'thrust') {
      const spec = DEMO.thrust,
        active =
          t >= spec.start &&
          t < spec.start + spec.count * spec.spacing + spec.life;
      this.actor(
        'dong',
        active ? 'actions' : 'dong',
        B,
        active ? 'thrust' : 'idle',
        direction,
        active ? (t - spec.start) % 0.4 : t,
        { token: active ? Math.floor((t - spec.start) / 0.4) : 0 },
      );
      state.thrustSector = {
        origin: B,
        range: spec.range,
        angleDegrees: 180,
        referenceBasics: DEMO.referenceBasics,
        rays: [],
      };
      for (let i = 0; i < spec.count; i++) {
        const a =
            rightAngle - spec.angle / 2 + (i * spec.angle) / (spec.count - 1),
          age = t - spec.start - i * spec.spacing;
        state.thrustSector.rays.push({
          angle: a,
          release: spec.start + i * spec.spacing,
        });
        if (age < 0 || age >= spec.life) continue;
        const q = {
          x: B.x + (Math.cos(a) * spec.range) / 2,
          y: B.y - 20 + (Math.sin(a) * spec.range) / 2,
        };
        this.fx('stab' + i, 'fx', 'thrust_streak', q, age, {
          angle: a,
          scale: 3,
          token: i,
          frame: Math.min(3, Math.floor((age / spec.life) * 4)),
        });
      }
      state.phase = active ? 'Liên kích · nửa vòng 180°' : 'Thu kiếm';
    } else if (mode === 'fan') {
      const local = t - 0.45;
      this.actor(
        'dong',
        'dong',
        B,
        local >= 0 && local < 0.5 ? 'sword_flurry_cast' : 'idle',
        direction,
        Math.max(0, local),
      );
      if (local >= 0 && local < 0.65)
        this.fx('fan', 'fan', 'sword_fan_wave', point(75), local, {
          angle: rightAngle,
          scale: 2,
        });
      if (local >= 0 && local < 0.65)
        this.fx('blossom', 'fan', 'blossom_slash_wave', point(90), local, {
          angle: rightAngle,
        });
      state.phase =
        local >= 0 && local < 0.65 ? 'Quạt kiếm hoa đào' : 'Thu kiếm';
    } else if (mode === 'pebbles') {
      const spec = DEMO.pebbles,
        age = t - spec.release,
        active = t >= 0.25 && t < 1;
      this.actor(
        'dong',
        'dong',
        B,
        active ? 'finger_cast' : 'idle',
        direction,
        Math.max(0, t - 0.25),
      );
      const from = { x: B.x, y: B.y - 20 };
      for (const [i, a] of radial.angles.entries()) {
        if (age < 0 || age >= spec.life) continue;
        const p = {
          x: from.x + Math.cos(a) * age * spec.speed,
          y: from.y + Math.sin(a) * age * spec.speed,
        };
        this.fx('pebble' + i, 'fx', 'pebble', p, age, { angle: a, loop: true });
        state.projectiles.push({
          id: i,
          ...p,
          release: spec.release,
          angle: a,
          from,
        });
      }
      state.radialPlan = radial;
      state.shotsReleased = age < 0 ? 0 : radial.count;
      state.phase =
        age < 0 ? 'Vận chỉ' : radial.count + ' hướng · tỏa quanh boss';
    } else if (mode === 'dash') {
      const names = Object.keys(PATHS),
        name = pathChoice === 'random' ? names[(seed >>> 16) % 4] : pathChoice;
      const path = dashPath(name, direction),
        spec = DEMO.dash,
        local = t - spec.start,
        main = local - spec.approach;
      const seg = Math.min(
          path.length - 2,
          Math.max(0, Math.floor(main / spec.segment)),
        ),
        u = clamp((main - seg * spec.segment) / spec.segment);
      const a = main < 0 ? B : path[seg],
        b = main < 0 ? path[0] : path[seg + 1];
      const moving = local >= 0 && main < (path.length - 1) * spec.segment;
      const p =
          local < 0
            ? B
            : main < 0
              ? mix(B, path[0], clamp(local / spec.approach))
              : mix(a, b, u),
        d = face(a, b);
      this.actor(
        'dong',
        'dong',
        p,
        moving ? 'dash' : local < 0 ? 'sword_flurry_cast' : 'idle',
        moving ? d : direction,
        Math.max(0, local),
        { token: seg + (main < 0 ? -1 : 0) },
      );
      const swept = [];
      if (local >= 0) swept.push({ from: B, to: main < 0 ? p : path[0] });
      if (main >= 0)
        for (let i = 0; i <= seg; i++)
          swept.push({ from: path[i], to: i === seg ? p : path[i + 1] });
      if (local >= 0 && main < (path.length - 1) * spec.segment + 0.55) {
        for (const [i, line] of swept.entries()) {
          const length = Math.hypot(
              line.to.x - line.from.x,
              line.to.y - line.from.y,
            ),
            n = Math.max(1, Math.ceil(length / spec.trailStep));
          for (let j = 0; j <= n; j++) {
            const q = mix(line.from, line.to, j / n),
              a = angle(line.from, line.to);
            this.fx(
              'corridor-thread' + i + '-' + j,
              'fx',
              'thrust_streak',
              q,
              local,
              { angle: a, scale: 1, alpha: 0.18, depth: 105, frame: 3 },
            );
            for (const side of [-1, 1]) {
              const p = {
                x: q.x - Math.sin(a) * 40 * side,
                y: q.y + Math.cos(a) * 40 * side,
              };
              this.fx(
                'corridor-lane' + side + '-' + i + '-' + j,
                'fx',
                'petal_patch',
                p,
                local,
                { scale: 1, alpha: 0.42, depth: 105, frame: 0 },
              );
            }
          }
        }
      }
      if (moving) {
        for (let j = 1; j <= 3; j++)
          this.fx(
            'echo' + j,
            'dash',
            'afterimage_right',
            mix(a, p, 1 - j * 0.19),
            local,
            { angle: angle(a, b), alpha: 0.45 / j, depth: p.y - 0.1 },
          );
        this.fx('dashslash', 'fan', 'blossom_slash_wave', p, local, {
          angle: angle(a, b),
          token: seg,
          scale: 2,
        });
      }
      state.path = name;
      state.waypoints = path;
      state.sweptSegments = swept;
      state.damageCorridorHalfWidth = spec.halfWidth;
      state.phase = moving
        ? 'Lướt rộng · ' +
          { triangle: 'tam giác', square: 'vuông', diamond: 'thoi', z: 'Z' }[
            name
          ]
        : 'Xuất kiếm / hồi thế';
    } else if (mode === 'petals') {
      const casting = t >= 0.35 && t < 2.1;
      this.actor(
        'dong',
        casting ? 'actions' : 'dong',
        B,
        casting ? 'flute' : 'idle',
        direction,
        Math.max(0, t - 0.35),
        {
          frame: casting
            ? Math.min(3, Math.floor((t - 0.35) / 0.17))
            : undefined,
        },
      );
      let patches = 0,
        bursts = 0;
      for (const [i, p] of petals.entries()) {
        if (t >= p.arrival && t < p.blast) {
          this.fx(
            'petal' + i,
            'fx',
            'petal_patch',
            p,
            t - p.arrival + p.framePhase,
            { depth: 100, loop: true },
          );
          patches++;
        }
        if (t >= p.blast && t < p.blast + 0.4) {
          this.fx('blast' + i, 'fx', 'petal_burst', p, t - p.blast, {
            depth: p.y + 0.2,
          });
          bursts++;
        }
      }
      state.petalPlan = petals;
      state.patchCount = patches;
      state.burstCount = bursts;
      state.phase =
        bursts > 0
          ? 'Hoa nổ'
          : patches > 0
            ? 'Hoa chờ nổ'
            : t < 0.75
              ? 'Thổi sáo'
              : 'Hoa tan';
    }
  }
  support() {
    const dong = { x: 585, y: 365 },
      mai = { x: 775, y: 410 },
      hoang = { x: 615, y: 510 };
    this.players();
    if (mode === 'summon') {
      const hp = t < 1 ? 45 : t < 1.6 ? 40 : 39;
      state.bossHpPercent = hp;
      state.summonCount = t < 1.6 ? 0 : 1;
      this.actor(
        'dong',
        'dong',
        dong,
        t >= 1.6 && t < 2.3 ? 'summon_cast' : 'idle',
        direction,
        Math.max(0, t - 1.6),
      );
      if (t >= 1.6 && t < 2.7)
        for (const [i, p] of [mai, hoang].entries())
          this.fx(
            'summon' + i,
            'summon',
            i ? 'hoang_spawn' : 'mai_spawn',
            p,
            t - 1.6,
            { scale: 1, depth: p.y - 0.1 },
          );
      if (t >= 2.35) {
        this.actor('mai', 'mai', mai);
        this.actor('hoang', 'hoang', hoang);
      }
      state.phase = t < 1.6 ? 'HP ' + hp + '%' : '39% · triệu hồi lần 1/1';
      return;
    }
    this.actor('dong', 'dong', dong);
    this.actor('mai', 'mai', mai);
    if (mode === 'heal') {
      this.actor('hoang', 'hoang', hoang, 'support_cast', 'up', t, {
        token: Math.floor(t / 0.6),
      });
      for (let i = 0; i < 9; i++)
        for (const [j, target] of [dong, mai].entries()) {
          const release = 0.3 + i * 0.6,
            age = t - release;
          if (age < 0) continue;
          const end = { x: target.x, y: target.y - 20 },
            from = { x: hoang.x, y: hoang.y - 22 },
            duration = 0.48;
          if (age < duration) {
            const p = mix(from, end, age / duration);
            this.fx('heal' + i + j, 'fx', 'heal_palm', p, age, {
              angle: angle(from, end),
              loop: true,
            });
            state.projectiles.push({
              kind: 'heal',
              target: j ? 'mai' : 'dong',
              x: p.x,
              y: p.y,
            });
          }
          if (age >= duration && age < duration + 0.4)
            this.fx(
              'healhit' + i + j,
              'hoangfx',
              'heal_aura',
              target,
              age - duration,
              { depth: target.y - 0.1, scale: 1 },
            );
        }
      state.phase = 'Chưởng hồi máu → 2 đồng minh';
      state.healTargets = ['dong', 'mai'];
    } else {
      const moving = t >= 0.5 && t < 1.05,
        p = mix(hoang, { x: 880, y: 495 }, clamp((t - 0.5) / 0.55));
      this.actor(
        'hoang',
        'hoang',
        p,
        moving ? 'evade' : 'idle',
        'right',
        Math.max(0, t - 0.5),
      );
      if (moving)
        for (let j = 1; j <= 3; j++)
          this.fx(
            'evade' + j,
            'hoangfx',
            'movement_trail',
            { x: p.x - j * 42, y: p.y },
            t - 0.5,
            { alpha: 0.8 / j },
          );
      state.phase = moving ? 'Bứt tốc' : 'Di chuyển thường';
    }
  }
  clawPair(mai, local, id = 'claw') {
    const strokes = clawStrokes(mai);
    state.clawStrokes = strokes;
    for (const stroke of strokes) {
      const age = local - stroke.start;
      if (age < 0 || age >= 0.42) continue;
      const p = mix(stroke.from, stroke.to, clamp(age / 0.42));
      this.fx(id + stroke.id, 'maifx', stroke.art, p, age, {
        angle: angle(stroke.from, stroke.to) - stroke.artAngle,
        scale: 1,
        alpha: 0.85,
        depth: mai.y - 0.15,
      });
    }
  }
  mai() {
    if (!alive[maiTarget])
      maiTarget = alive.findIndex((v, i) => i < party && v);
    if (maiTarget < 0) {
      this.players();
      this.actor('mai', 'mai', maiFeet);
      return;
    }
    const heroes = [p1, ...positions.slice(1)],
      target = { ...heroes[maiTarget] };
    const recovery = { claws: 1.1, ranged: 2.2, pull: 2.5, poison: 1.35 }[mode];
    const chasing = t > recovery;
    if (seekPending && chasing) {
      const dist = Math.hypot(target.x - B.x, target.y - B.y);
      maiFeet = mix(
        B,
        target,
        clamp(
          (DEMO.mai.chaseSpeed * (t - recovery)) / Math.max(1, dist),
          0,
          Math.max(0, 1 - DEMO.mai.attackRange / Math.max(1, dist)),
        ),
      );
    } else if (!paused && chasing) {
      const dist = Math.hypot(target.x - maiFeet.x, target.y - maiFeet.y);
      if (dist > DEMO.mai.attackRange)
        maiFeet = mix(
          maiFeet,
          target,
          Math.min(DEMO.mai.chaseSpeed * demoDt, dist - DEMO.mai.attackRange) /
            dist,
        );
    }
    const mai = { ...maiFeet },
      distance = Math.hypot(target.x - mai.x, target.y - mai.y),
      d = face(mai, target);
    let action = 'idle',
      actorTime = Math.max(0, t - 0.4),
      token = 0,
      displayTarget = target;
    state.lockedTarget = 'P' + (maiTarget + 1);
    state.focusIsPassive = true;
    state.maiPosition = mai;
    if (mode === 'pull' && t > 0.7 && t < 2.5)
      displayTarget = mix(
        target,
        { x: mai.x + 65, y: mai.y },
        clamp((t - 0.7) / 1.8),
      );
    this.players(false, maiTarget === 0 ? displayTarget : null);
    if (mode === 'claws') {
      action = t >= 0.4 && t < 1.1 ? 'claw_attack' : 'idle';
      if (t >= 0.45 && t < 1.1) this.clawPair(mai, t - 0.45);
      state.phase =
        t < 1.1 ? 'Vuốt trên ↓ · vuốt dưới ↑' : 'Đuổi đánh cùng mục tiêu';
    } else if (mode === 'ranged') {
      action = t > 0.3 && t < 2.2 ? 'claw_attack' : 'idle';
      const origin = { x: mai.x, y: mai.y - 20 };
      for (let i = 0; i < 5; i++) {
        const age = t - (0.5 + i * 0.3);
        if (age >= 0 && age < 1.1) {
          if (!shots.has(i))
            shots.set(i, { angle: angle(origin, target), from: { ...origin } });
          const shot = shots.get(i),
            p = {
              x: shot.from.x + Math.cos(shot.angle) * age * 450,
              y: shot.from.y + Math.sin(shot.angle) * age * 450,
            };
          this.fx('ranged' + i, 'maifx', 'ranged_claw', p, age, {
            angle: shot.angle,
            loop: true,
          });
          state.projectiles.push({
            kind: 'claw',
            target: state.lockedTarget,
            ...p,
          });
        }
      }
      state.phase = 'Vuốt xa liên tiếp';
    } else if (mode === 'pull') {
      action = t >= 0.4 && t < 2.5 ? 'pull_cast' : 'idle';
      if (t >= 0.6 && t < 2.5)
        this.fx('suction', 'maifx', 'suction', mai, t - 0.6, {
          scale: 2,
          depth: 100,
          loop: true,
        });
      state.phase = t >= 0.7 && t < 2.5 ? 'Hút về gần' : 'Đuổi cùng mục tiêu';
    } else if (mode === 'poison') {
      action = t >= 0.4 && t < 1.1 ? 'poison_skull_throw' : 'idle';
      const landing = { x: 865, y: 420 },
        release = 0.65,
        impact = 1.35,
        age = t - release;
      if (t >= release && t < impact) {
        const p = mix(
          { x: B.x, y: B.y - 28 },
          landing,
          age / (impact - release),
        );
        p.y -= Math.sin((age / (impact - release)) * Math.PI) * 95;
        this.fx('pouch', 'maifx', 'poison_pouch', p, age);
        state.projectiles.push({ kind: 'poison_pouch', ...p });
      }
      if (t >= impact && t < impact + 0.4)
        this.fx('poisonburst', 'maifx', 'poison_burst', landing, t - impact, {
          scale: 2,
        });
      if (t >= impact + 0.25 && t < 5.4)
        this.fx(
          'poisonpool',
          'maifx',
          'poison_pool',
          landing,
          t - impact - 0.25,
          { scale: 2, depth: 100, loop: true },
        );
      state.poisonActive = t >= impact + 0.25 && t < 5.4;
      state.phase =
        t < release
          ? 'Lấy bọc độc'
          : t < impact
            ? 'Bọc độc bay'
            : t < impact + 0.4
              ? 'Nổ khi chạm đất'
              : t < 5.4
                ? 'Vùng độc tồn tại'
                : 'Độc tan';
    }
    if (chasing) {
      if (distance > DEMO.mai.attackRange + 1) action = 'walk';
      else {
        const local = (t - recovery) % DEMO.mai.attackInterval;
        action = local < 0.5 ? 'claw_attack' : 'idle';
        actorTime = local;
        token = Math.floor((t - recovery) / DEMO.mai.attackInterval);
        if (local < 0.5) this.clawPair(mai, local, 'followup');
      }
    }
    this.actor('mai', 'mai', mai, action, d, actorTime, { token });
  }
}
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#263626',
  audio: { noAudio: true },
  scene: Review,
});
window.ART = {
  setSpeed(n) {
    speed = n;
  },
  get ready() {
    return ready;
  },
  D,
  get scene() {
    return scene;
  },
  choose,
  setTime(time) {
    seek(time);
  },
  pause(v) {
    paused = v;
    seekPending = true;
  },
  setDirection(d) {
    direction = d;
    $('facing').value = d;
    reset();
  },
  setParty(n) {
    party = n;
    $('party').value = n;
  },
  setPath(p) {
    pathChoice = p;
    $('path').value = p;
    reset();
  },
  setPlayer(x, y) {
    p1 = encounterLocked ? constrain({ x, y }) : { x, y };
  },
  setAlive(i, value) {
    alive[i] = value;
  },
  seed(value) {
    seed = value >>> 0;
    radial = radialPlan(seed);
    petals = petalPlan(seed);
  },
  DEMO,
  snapshot() {
    return JSON.parse(JSON.stringify(state));
  },
  observed() {
    return Object.fromEntries([...seen].map(([k, v]) => [k, [...v]]));
  },
  fixtures() {
    return Object.entries(D.bundles).flatMap(([key, b]) =>
      b.clips.map((c) => ({
        key,
        clip: c.name,
        frames: c.frames,
        fps: c.fps,
        repeat: c.repeat,
      })),
    );
  },
  fixture(key, clip) {
    paused = false;
    t = 0;
    fixture = { key, clip, token: performance.now() };
    seekPending = false;
  },
  fixtureDone(key, clip) {
    const c = D.bundles[key].clips.find((c) => c.name === clip),
      name = key + ':' + clip;
    return (
      seen.get(name)?.size === c.frames.length &&
      (c.repeat === -1 ? cycles : completions).has(name)
    );
  },
  errors,
  clearObserved() {
    seen.clear();
    cycles.clear();
    completions.clear();
  },
};
