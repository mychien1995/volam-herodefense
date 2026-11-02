/* Presentation-only art demo, adapted from the retained Kim Luan Phaser viewer.
   No imports from game-core/protocol, rooms, damage or production asset registry. */
const D = await (await fetch('data.json')).json(),
  ROOT = '../../../../';
const $ = (id) => document.getElementById(id);
const MODES = [
  [
    'entry',
    'Xuất hiện từ hướng đông',
    5,
    'Đông Tà vào từ phía đông arena chính, tiến về người chơi.',
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
    'Liên tiếp đâm nhiều góc phía trước, kiếm khí mảnh vươn xa.',
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
    '5 viên bi phóng cực nhanh; từng viên lấy vị trí hiện tại của P1 tại lúc bắn.',
  ],
  [
    'dash',
    'W · Lạc Anh Kiếm Pháp',
    5,
    'Xuất kiếm → lướt nhanh theo tam giác / vuông / thoi / Z ngẫu nhiên, để lại hoa đào.',
  ],
  [
    'petals',
    'E · Ngọc Tiêu Hồi Phong',
    6,
    'Thổi sáo, rải cánh hoa dày trên arena; sau 2,8 giây demo, các cụm hoa nổ.',
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
    3,
    'Hai vuốt trái/phải xé phía trước. Bộ chiêu đỏ đô / đỏ đậm.',
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
  [
    'lock',
    'Mai Siêu Phong · khoá mục tiêu',
    7,
    'Bám P1 duy nhất; chỉ đổi mục tiêu sau khi P1 chết trong kịch bản demo.',
  ],
];
const B = { x: 650, y: 450 },
  V = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] };
const PATHS = {
  triangle: [
    [0, 0],
    [190, -90],
    [190, 90],
    [0, 0],
  ],
  square: [
    [0, 0],
    [170, 0],
    [170, 150],
    [0, 150],
    [0, 0],
  ],
  diamond: [
    [0, 0],
    [130, -80],
    [260, 0],
    [130, 80],
    [0, 0],
  ],
  z: [
    [0, -70],
    [230, -70],
    [0, 100],
    [230, 100],
  ],
};
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
let p1 = { x: 895, y: 450 },
  keys = new Set(),
  shots = new Map(),
  seen = new Map(),
  cycles = new Set(),
  completions = new Set(),
  errors = [],
  pool = new Map(),
  state = {},
  seekPending = false;
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
      this.add
        .image(x, y, 'world', id)
        .setOrigin(0.5, 184 / 192)
        .setDepth(y);
    }
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
        p1.y = clamp(p1.y + (dy / n) * 180 * dt, 130, 590);
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
    $('target-label').textContent = state.lockedTarget
      ? 'Mai Siêu Phong → ' + state.lockedTarget
      : '';
  }
  players(dead = false, override = null) {
    const heroes = [
      override ?? p1,
      { x: 480, y: 470 },
      { x: 825, y: 540 },
      { x: 420, y: 370 },
      { x: 900, y: 330 },
      { x: 540, y: 550 },
    ];
    for (let i = 0; i < party; i++) {
      if (dead && i === 0) continue;
      const p = heroes[i];
      this.actor('p' + i, 'hero', p, 'idle', 'left');
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
      const p = mix({ x: 1300, y: 450 }, { x: 750, y: 450 }, clamp(t / 3));
      this.actor('dong', 'dong', p, t < 3 ? 'walk' : 'idle', 'left');
      state.phase = t < 3 ? 'Từ phía đông' : 'Tập trung người chơi';
      state.statueTargeted = false;
      return;
    }
    if (['heal', 'evade', 'summon'].includes(mode)) {
      this.support();
      return;
    }
    if (['claws', 'ranged', 'pull', 'poison', 'lock'].includes(mode)) {
      this.mai();
      return;
    }
    this.players();
    if (mode === 'thrust') {
      const active = t >= 0.35 && t < 1.55,
        k = Math.max(0, Math.floor((t - 0.35) / 0.18));
      this.actor(
        'dong',
        active ? 'actions' : 'dong',
        B,
        active ? 'thrust' : 'idle',
        direction,
        active ? (t - 0.35) % 0.4 : t,
        { token: active ? Math.floor((t - 0.35) / 0.4) : 0 },
      );
      if (active) {
        const a = rightAngle + [-0.45, -0.23, 0, 0.26, 0.44, 0][Math.min(k, 5)],
          q = { x: B.x + Math.cos(a) * 105, y: B.y - 20 + Math.sin(a) * 105 };
        this.fx('stab', 'fx', 'thrust_streak', q, (t - 0.35) % 0.18, {
          angle: a,
          scale: 1,
          token: k,
        });
        state.thrustIndex = k + 1;
      }
      state.phase = active ? 'Liên kích · tầm xa' : 'Thu kiếm';
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
      const active = t >= 0.35 && t < 1.1;
      this.actor(
        'dong',
        'dong',
        B,
        active ? 'finger_cast' : 'idle',
        direction,
        Math.max(0, t - 0.35),
        { token: active ? Math.floor((t - 0.35) / 0.36) : 0 },
      );
      for (let i = 0; i < 5; i++) {
        const release = 0.45 + i * 0.105,
          age = t - release;
        if (age < 0) continue;
        if (!shots.has(i)) {
          const target = { ...p1 },
            from = point(24);
          from.y -= 22;
          shots.set(i, { from, target, angle: angle(from, target), release });
        }
        const shot = shots.get(i),
          distance = age * 770;
        if (age < 1.25) {
          const p = {
            x: shot.from.x + Math.cos(shot.angle) * distance,
            y: shot.from.y + Math.sin(shot.angle) * distance,
          };
          this.fx('pebble' + i, 'fx', 'pebble', p, age, {
            angle: shot.angle,
            loop: true,
          });
          state.projectiles.push({
            id: i,
            x: p.x,
            y: p.y,
            release,
            angle: shot.angle,
            targetAtRelease: shot.target,
          });
        }
      }
      state.shotsReleased = shots.size;
      state.phase =
        t < 0.45 ? 'Vận chỉ' : t < 0.98 ? '5 viên · liên xạ' : 'Bi bay thẳng';
    } else if (mode === 'dash') {
      const names = Object.keys(PATHS),
        name = pathChoice === 'random' ? names[(seed >>> 16) % 4] : pathChoice,
        path = PATHS[name],
        local = t - 0.7;
      const seg = Math.min(
          path.length - 2,
          Math.max(0, Math.floor(local / 0.24)),
        ),
        u = clamp((local - seg * 0.24) / 0.24);
      const rotate = (p) => ({
        x: B.x + p[0] * Math.cos(rightAngle) - p[1] * Math.sin(rightAngle),
        y: B.y + p[0] * Math.sin(rightAngle) + p[1] * Math.cos(rightAngle),
      });
      const a = rotate(path[seg]),
        b = rotate(path[seg + 1]),
        moving = local >= 0 && local < (path.length - 1) * 0.24,
        p = local < 0 ? B : mix(a, b, u),
        d = face(a, b);
      this.actor(
        'dong',
        'dong',
        p,
        moving ? 'dash' : local < 0 ? 'sword_flurry_cast' : 'idle',
        moving ? d : direction,
        Math.max(0, local),
        { token: seg },
      );
      if (moving) {
        for (let j = 1; j <= 3; j++) {
          const q = mix(a, p, 1 - j * 0.19);
          this.fx('echo' + j, 'dash', 'afterimage_right', q, local, {
            angle: angle(a, b),
            alpha: 0.45 / j,
            depth: q.y - 0.1,
          });
        }
        this.fx('dashslash', 'fan', 'blossom_slash_wave', p, local, {
          angle: angle(a, b),
          token: seg,
        });
      }
      state.path = name;
      state.waypoints = path.map(rotate);
      state.phase = moving
        ? 'Lướt · ' +
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
      for (let row = 0; row < 5; row++)
        for (let col = 0; col < 9; col++) {
          const i = row * 9 + col,
            p = { x: 250 + col * 92 + (row % 2) * 26, y: 240 + row * 65 },
            arrival = 0.75 + (i % 7) * 0.09,
            blast = 3.55 + (i % 7) * 0.06;
          if (t >= arrival && t < blast) {
            this.fx('petal' + i, 'fx', 'petal_patch', p, t - arrival, {
              depth: 100,
              loop: true,
              scale: 1,
            });
            patches++;
          }
          if (t >= blast && t < blast + 0.4) {
            this.fx('blast' + i, 'fx', 'petal_burst', p, t - blast, {
              depth: p.y + 0.2,
            });
            bursts++;
          }
        }
      state.patchCount = patches;
      state.burstCount = bursts;
      state.phase =
        t < 0.75
          ? 'Thổi sáo'
          : t < 3.55
            ? 'Hoa chờ nổ'
            : t < 4.35
              ? 'Hoa nổ'
              : 'Hoa tan';
    }
  }
  support() {
    const dong = { x: 600, y: 430 },
      mai = { x: 805, y: 460 },
      hoang = { x: 615, y: 530 };
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
        p = mix(hoang, { x: 955, y: 520 }, clamp((t - 0.5) / 0.55));
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
  mai() {
    let target = { ...p1 },
      mai = { x: 650, y: 450 },
      dead = false,
      action = 'idle',
      d = face(mai, target);
    if (mode === 'lock') {
      dead = t >= 4;
      target = dead ? { x: 480, y: 470 } : { ...p1 };
      mai = mix({ x: 650, y: 450 }, target, clamp((t % (dead ? 3 : 4)) * 0.16));
      this.players(dead);
      this.actor('mai', 'mai', mai, 'walk', face(mai, target));
      state.lockedTarget = dead ? 'P2 (P1 đã chết)' : 'P1';
      state.phase = dead ? 'P1 chết → đổi mục tiêu' : 'Giữ P1 dù P2 ở gần hơn';
      return;
    }
    state.lockedTarget = 'P1';
    if (mode === 'pull' && t > 0.7 && t < 2.5) {
      target = mix(p1, { x: mai.x + 70, y: mai.y }, clamp((t - 0.7) / 1.8));
    }
    this.players(false, target);
    if (mode === 'claws') {
      const active = t >= 0.45 && t < 1.1;
      action = active ? 'claw_attack' : 'idle';
      if (active) {
        const right = t >= 0.73,
          local = t - (right ? 0.73 : 0.45),
          ang = angle(mai, target),
          q = {
            x: mai.x + Math.cos(ang) * 65,
            y: mai.y - 18 + Math.sin(ang) * 65,
          };
        this.fx('claw', 'maifx', right ? 'claw_right' : 'claw_left', q, local, {
          angle: ang,
          flip: right,
          token: right ? 1 : 0,
        });
      }
      state.phase = active
        ? t < 0.73
          ? 'Vuốt trái'
          : 'Vuốt phải'
        : 'Thu vuốt';
    } else if (mode === 'ranged') {
      action = t > 0.3 && t < 2.2 ? 'claw_attack' : 'idle';
      const origin = { x: mai.x, y: mai.y - 20 };
      for (let i = 0; i < 5; i++) {
        const age = t - (0.5 + i * 0.3);
        if (age >= 0 && age < 1.1) {
          if (!shots.has(i)) shots.set(i, { angle: angle(origin, target) });
          const ang = shots.get(i).angle;
          const p = {
            x: origin.x + Math.cos(ang) * age * 450,
            y: origin.y + Math.sin(ang) * age * 450,
          };
          this.fx('ranged' + i, 'maifx', 'ranged_claw', p, age, {
            angle: ang,
            loop: true,
          });
          state.projectiles.push({
            kind: 'claw',
            target: 'P1',
            x: p.x,
            y: p.y,
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
      state.phase = t >= 0.7 && t < 2.5 ? 'Hút về gần' : 'Vận khí';
    } else if (mode === 'poison') {
      action = t >= 0.4 && t < 1.1 ? 'poison_skull_throw' : 'idle';
      const landing = { x: 895, y: 455 },
        release = 0.65,
        impact = 1.35,
        age = t - release;
      if (t >= release && t < impact) {
        const p = mix(
          { x: mai.x, y: mai.y - 28 },
          landing,
          age / (impact - release),
        );
        p.y -= Math.sin((age / (impact - release)) * Math.PI) * 95;
        this.fx('pouch', 'maifx', 'poison_pouch', p, age);
        state.projectiles.push({ kind: 'poison_pouch', x: p.x, y: p.y });
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
    this.actor('mai', 'mai', mai, action, d, Math.max(0, t - 0.4), {
      token: mode === 'ranged' ? Math.floor(t / 0.36) : 0,
    });
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
    p1 = { x, y };
  },
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
