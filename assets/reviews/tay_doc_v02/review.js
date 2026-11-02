/* Art-only timeline rendered by installed Phaser 4; no room, damage or RNG authority. */
const packages = await (await fetch('./packages.json')).json();
const tuning = await (await fetch('./feedback03/tuning.json')).json();
const $ = (id) => document.getElementById(id);
const MODES = [
  [
    'enter',
    'Từ hướng tây',
    'Vào arena chính, tập trung người chơi; bỏ qua tượng.',
    4200,
  ],
  ['staff', 'Quẹt trượng', 'Một nhát hình quạt 180° phía trước.', 3000],
  ['bolt', 'Độc khí', 'Bắn độc khí từ đầu trượng theo đường thẳng.', 3300],
  [
    'needles',
    'Vạn Độc Phi Châm',
    'Warning hình cone → nhiều đợt kim; trúng kim: chậm + độc đốt.',
    4300,
  ],
  [
    'cloud',
    'Độc Vụ Mê Hồn',
    'Tám bãi độc lớn trên nền đất; warning → đám độc gây chậm + độc đốt.',
    6500,
  ],
  [
    'curse',
    'Cổ Độc Khoan Tâm',
    'Một người mang độc không thể giải; ra góc trước khi nổ lan. Tự mất 25% máu.',
    6500,
  ],
  [
    'snakes',
    'Hỗn Thiên Phục Long Chấn',
    'Sáu cọc rắn quay 8 hướng; nhịp bắn chậm hơn. A để phá cọc gần P1.',
    tuning.snake.demoDurationMs,
  ],
  [
    'phase',
    'Cáp Mô Công · dưới 50%',
    'Bỏ trượng, hạ sát đất; bò nhanh hơn và đòn mạnh hơn ở phase 2.',
    4800,
  ],
  ['palm', 'Bắn độc chưởng', 'Chưởng độc bay thẳng từ tư thế Cáp Mô.', 3400],
  [
    'stomp',
    'Cáp Mô Chấn Kích',
    'Dậm độc lan rất rộng, gây độc và choáng trong vùng.',
    4000,
  ],
  [
    'channel',
    'Ngũ Độc Thần Chưởng',
    'Đứng yên nhả độc 360°; đạn bay chậm hơn.',
    tuning.channel.demoDurationMs,
  ],
  [
    'eruption',
    'Vạn Độc Bạo Phát',
    'Nhảy nhiều vị trí; mỗi lần chạm đất đều nhả độc 360°.',
    6200,
  ],
];
const V = { right: [1, 0], down: [0, 1], left: [-1, 0], up: [0, -1] };
const initialHeroes = [
  [760, 460],
  [890, 515],
  [700, 600],
  [970, 385],
  [925, 620],
  [580, 550],
];
let mode = 'snakes',
  time = 0,
  playing = true,
  speed = 1,
  facing = 'right',
  party = 6,
  isolate = true,
  scene,
  ready = false;
let bundle = 'p1',
  galleryTag = 'idle_right',
  heroes = initialHeroes.map((p) => [...p]),
  hp = [100, 100, 100, 100, 100, 100],
  snakeHp = Array(6).fill(100),
  brokenAt = {},
  keys = {},
  lastA = -9999;
let observations = new Set(),
  nodes = [],
  projectiles = [],
  affectedParty = [],
  areas = [],
  pool = [],
  labels = [],
  poolN = 0,
  labelN = 0,
  cycles = 0;
const seen = () => [...observations];
const duration = () =>
  mode === 'gallery' ? 2400 : MODES.find((m) => m[0] === mode)[3];
const options = () => {
  const select = $('clip');
  select.replaceChildren();
  for (const tag of Object.keys(packages[bundle].animations)) {
    const el = document.createElement('option');
    el.value = tag;
    el.textContent = tag;
    select.append(el);
  }
  if (packages[bundle].animations[galleryTag]) select.value = galleryTag;
  else galleryTag = select.value;
};
function selectMode(value) {
  mode = value;
  time = 0;
  heroes = initialHeroes.map((p) => [...p]);
  hp = hp.map(() => 100);
  snakeHp.fill(100);
  brokenAt = {};
  lastA = -9999;
  const def = MODES.find((m) => m[0] === mode);
  $('skill-title').textContent = def?.[1] || 'Kiểm tra sprite gốc';
  $('skill-note').textContent =
    def?.[2] ||
    'Frame vẽ sẵn · pivot chân cố định · chọn clip và hướng trong Tùy chỉnh.';
  $('timeline').max = duration();
  document
    .querySelectorAll('[data-mode]')
    .forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
  if (scene && ready) render();
}
function angle() {
  return Math.atan2(V[facing][1], V[facing][0]);
}
function frameOf(key, tag, t, index) {
  const a = packages[key].animations[tag];
  if (!a) throw Error('Missing clip ' + key + '/' + tag);
  let n = index;
  if (n === undefined) {
    const total = a.durationsMs.reduce((s, v) => s + v, 0);
    let local =
      a.repeat === -1
        ? Math.max(0, t) % total
        : Math.max(0, Math.min(t, total - 1));
    n = 0;
    while (local >= a.durationsMs[n] && n < a.frames.length - 1) {
      local -= a.durationsMs[n];
      n++;
    }
  }
  return a.frames[n];
}
function cel(
  key,
  tag,
  t,
  x,
  y,
  { scale = 1, rotation = 0, alpha = 1, depth = y, index, origin } = {},
) {
  const frame = frameOf(key, tag, t, index),
    p = packages[key];
  let sprite = pool[poolN++];
  if (!sprite) {
    sprite = scene.add.sprite(x, y, key, frame);
    pool.push(sprite);
  }
  sprite
    .setVisible(true)
    .setTexture(key, frame)
    .setOrigin(...(origin || p.origin))
    .setPosition(Math.round(x), Math.round(y))
    .setScale(scale)
    .setRotation(rotation)
    .setAlpha(alpha)
    .setDepth(depth);
  sprite.setBlendMode(Phaser.BlendModes.NORMAL);
  observations.add(key + '/' + frame);
  nodes.push({
    key,
    tag,
    frame,
    x,
    y,
    scale,
    rotation,
    depth,
    origin: origin || p.origin,
  });
  return sprite;
}
function text(value, x, y, color = '#f2e5ba', size = 12, depth = 10000) {
  let t = labels[labelN++];
  if (!t) {
    t = scene.add.text(x, y, value, {
      fontFamily: 'Arial',
      fontSize: size,
      color,
      stroke: '#142117',
      strokeThickness: 3,
    });
    labels.push(t);
  }
  t.setVisible(true)
    .setText(value)
    .setPosition(Math.round(x), Math.round(y))
    .setColor(color)
    .setFontSize(size)
    .setDepth(depth)
    .setOrigin(0.5, 1);
}
function fx(key, tag, t, x, y, scale = 1, rotation = 0, depth = 9000) {
  return cel(key, tag, t, x, y, { scale, rotation, depth });
}
function actor(key, tag, t, x = 460, y = 460) {
  return cel(key, tag, t, x, y);
}
function phaseActor(tag, t, x = 460, y = 460) {
  if (tag === 'crawl' || tag === 'hop' || tag === 'exhale')
    return actor('newactor', tag + '_right', t, x, y);
  return actor('p2', tag + '_' + facing, t, x, y);
}
function warning(tag, t, x, y, scale = 1, rotation = 0, key = 'fx1') {
  fx(key, tag, t, x, y, scale, rotation, 100); // floor layer, never an authoritative collision mask
}
function ray(
  key,
  tag,
  start,
  x,
  y,
  a,
  velocity = 300,
  scale = 1,
  kind = 'poison',
  lifetimeMs = 1700,
) {
  const age = time - start;
  if (age < 0 || age > lifetimeMs) return;
  const dist = (age * velocity) / 1000,
    px = x + Math.cos(a) * dist,
    py = y + Math.sin(a) * dist;
  fx(key, tag, age % 400, px, py, scale, a, 8500).setBlendMode(
    Phaser.BlendModes.ADD,
  );
  projectiles.push({
    kind,
    x: px,
    y: py,
    origin: [x, y],
    angle: a,
    distance: dist,
    start,
    velocity,
    lifetimeMs,
  });
}
function radial(
  start,
  x,
  y,
  count = 16,
  offset = 0,
  velocity = 285,
  lifetimeMs = 1700,
) {
  for (let i = 0; i < count; i++)
    ray(
      'fx1',
      'poison_bolt',
      start,
      x,
      y,
      offset + (i * Math.PI * 2) / count,
      velocity,
      0.9,
      'radial',
      lifetimeMs,
    );
}
function actorAttack(key, tag, start, duration, x = 460, y = 460) {
  if (
    facing === 'right' &&
    ((key === 'p1' && tag === 'basic_attack') ||
      (key === 'p2' && tag === 'palm_attack'))
  ) {
    if (time >= start && time < start + 480)
      return actor(
        'actions',
        key === 'p1' ? 'staff_sweep_right' : 'palm_attack_right',
        time - start,
        x,
        y,
      );
    return actor(key, 'idle_' + facing, time, x, y);
  }
  if (time < start) actor(key, 'idle_' + facing, time, x, y);
  else if (time < start + duration)
    actor(key, tag + '_' + facing, time - start, x, y);
  else actor(key, 'idle_' + facing, time, x, y);
}
const snakePositions = () =>
  Array.from({ length: 6 }, (_, i) => [
    650 + Math.cos((i * Math.PI) / 3) * 215,
    470 + Math.sin((i * Math.PI) / 3) * 145,
  ]);
function render() {
  poolN = 0;
  labelN = 0;
  nodes = [];
  projectiles = [];
  affectedParty = [];
  areas = [];
  hp = hp.map(() => 100);
  let cue = '';
  const a = angle(),
    d = V[facing],
    tip = [460 + d[0] * 40, 440 + d[1] * 40];
  if (mode === 'gallery') {
    const p = packages[bundle],
      tag = galleryTag;
    actor(bundle, tag, time, 460, 460);
    text(bundle + ' / ' + tag, 460, 500);
  } else if (mode === 'enter') {
    const x = Math.min(
      tuning.entry.endX,
      -50 + time * tuning.entry.speedPxPerMs,
    );
    const y = tuning.entry.worldRoadCenterY - tuning.entry.viewportOffsetY;
    actor(
      'p1',
      x < tuning.entry.endX ? 'walk_right' : 'idle_right',
      time,
      x,
      y,
    );
    cue = 'Tây → Đông · đi giữa đường gạch · mục tiêu: người chơi';
  } else if (mode === 'staff') {
    actorAttack('p1', 'basic_attack', 650, 360);
    areas.push({
      kind: 'staff',
      x: 460,
      y: 460,
      radius: tuning.staff.radiusPx,
      arcDegrees: tuning.staff.arcDegrees,
      angle: a,
    });
    if (time < 650)
      warning('staff_180_warning', time, 460, 460, 1, a, 'staff180');
    if (time >= 650 && time < 1130)
      fx('staff180', 'staff_180_sweep', time - 650, 460, 460, 1, a);
    cue =
      time < 650
        ? 'Lấy đà'
        : time < 1130
          ? 'Quẹt trượng 180° phía trước'
          : 'Hồi chiêu';
  } else if (mode === 'bolt') {
    actorAttack('p1', 'basic_attack', 600, 360);
    ray('fx1', 'poison_bolt', 800, ...tip, a, 330, 1.3);
    cue = time < 800 ? 'Dồn độc lên đầu trượng' : 'Độc khí bay thẳng';
  } else if (mode === 'needles') {
    actorAttack('p1', 'poison_cast', 700, 560);
    if (time < 1000)
      warning(
        'needle_fan_warning',
        time,
        460 + d[0] * 95,
        440 + d[1] * 95,
        1,
        a,
      );
    for (const start of [1000, 1180, 1360])
      for (let i = -4; i <= 4; i++)
        ray(
          'fx1',
          'poison_needle',
          start,
          ...tip,
          a + (i * Math.PI) / 24,
          360,
          0.7,
          'needle',
        );
    if (time > 1700 && time < 3500)
      fx('fx1', 'poison_status', time, ...heroes[0], 0.65);
    cue =
      time < 1000
        ? 'Warning · cone phía trước'
        : '27 kim / 3 loạt · slow + độc đốt';
  } else if (mode === 'cloud') {
    actorAttack('p1', 'poison_cast', 650, 560);
    for (const [x, y] of tuning.cloud.centers) {
      if (time < 1100) warning('cloud_warning', time, x, y, 0.95);
      else
        fx(
          'fx1',
          time < 1500 ? 'cloud_expand' : 'cloud_loop',
          time - 1100,
          x,
          y,
          1.15,
          0,
          130,
        );
    }
    cue =
      time < 1100
        ? 'Warning · nhiều vị trí dưới đất'
        : 'Tám bãi độc tồn tại · slow + độc đốt';
  } else if (mode === 'curse') {
    actorAttack('p1', 'large_spell_cast', 200, 720);
    if (
      isolate &&
      !keys.ArrowDown &&
      !keys.ArrowUp &&
      !keys.ArrowLeft &&
      !keys.ArrowRight
    ) {
      const p = Math.max(0, Math.min(1, (time - 1000) / 2600));
      heroes[0] = [760 + 320 * p, 460 + 155 * p];
    }
    if (time >= 400 && time < 4500) {
      warning('cloud_warning', time, ...heroes[0], 1.35);
      fx('newfx', 'curse_mark', time, heroes[0][0], heroes[0][1] - 65, 1);
      text(
        'P1 · ' + Math.ceil((4500 - time) / 1000) + 's · không thể giải',
        heroes[0][0],
        heroes[0][1] - 88,
        '#e8c5ff',
      );
    }
    if (time >= 4500) {
      hp[0] = 75;
      if (time < 4980)
        fx('newfx', 'curse_burst', time - 4500, ...heroes[0], 1.45);
      for (let i = 1; i < party; i++)
        if (
          Math.hypot(
            heroes[i][0] - heroes[0][0],
            heroes[i][1] - heroes[0][1],
          ) <= 145
        ) {
          affectedParty.push(i);
          if (time < 5800) fx('fx1', 'poison_status', time, ...heroes[i], 0.6);
        }
      text('−25% HP · độc nổ', heroes[0][0], heroes[0][1] - 73, '#e4bbf4', 14);
    }
    cue =
      time < 4500
        ? 'Người mang độc phải ra xa đồng đội'
        : 'Nổ lan trong vùng · người bị chọn luôn mất 25% HP';
  } else if (mode === 'snakes') {
    actorAttack('p1', 'large_spell_cast', 200, 720);
    snakePositions().forEach(([x, y], i) => {
      if (time < 900) {
        warning('cloud_warning', time, x, y, 0.45);
        return;
      }
      const hpNow = snakeHp[i];
      if (hpNow === 0) {
        const age = time - brokenAt[i];
        if (age >= 0 && age < 480)
          fx('newfx', 'snake_break', age, x, y - 50, 1, 0, y);
        return;
      }
      if (time < 1380)
        fx('newfx', 'snake_rise', time - 900, x, y - 50, 1, 0, y);
      else {
        const first =
          tuning.snake.firstShotMs + i * tuning.snake.pillarStaggerMs;
        const shot = Math.floor((time - first) / tuning.snake.shotIntervalMs);
        const turn = Math.max(0, shot) % tuning.snake.directions;
        cel('snake8', 'snake_facing_8', 0, x, y - 50, {
          index: turn,
          depth: y,
        });
        // Each shot captures its own direction. A head turn never redirects a live ray.
        for (let n = Math.max(0, shot - 1); n <= shot; n++) {
          const start = first + n * tuning.snake.shotIntervalMs;
          const heading = ((n % tuning.snake.directions) * Math.PI) / 4;
          const v = [Math.cos(heading), Math.sin(heading)];
          const before = projectiles.length;
          ray(
            'fx1',
            'poison_bolt',
            start,
            x + v[0] * 28,
            y - 58 + v[1] * 28,
            heading,
            tuning.snake.projectileSpeedPxPerSec,
            1.2,
            'snake-ray',
            tuning.snake.lifetimeMs,
          );
          if (projectiles.length > before) projectiles.at(-1).pillar = i;
        }
      }
      text(
        '▰'.repeat(Math.ceil(hpNow / 25)) + ' ' + hpNow + '%',
        x,
        y - 89,
        '#c7ee8f',
        11,
      );
    });
    cue = '6 cọc · quay 8 hướng · bắn chậm từng tia';
  } else if (mode === 'phase') {
    const stages = [
      ['staff_release', 0, 600],
      ['cap_mo_crouch', 600, 600],
      ['cap_mo_charge', 1200, 640],
      ['energy_eruption', 1840, 440],
    ];
    const stage = stages.find(([, s, t]) => time >= s && time < s + t);
    if (stage) actor('transition', stage[0] + '_' + facing, time - stage[1]);
    else
      phaseActor(
        'crawl',
        (time - 2280) * 1.35,
        460 + Math.min(240, Math.max(0, time - 2280) * 0.12),
        460,
      );
    if (time < 1840)
      warning('transition_circle_warning', time, 460, 460, 0.8, 0, 'fxt');
    if (time >= 1840 && time < 2280)
      fx('fxt', 'transition_shockwave', time - 1840, 460, 460);
    cue = '49% HP · bỏ trượng → hạ người → Cáp Mô Công';
  } else if (mode === 'palm') {
    actorAttack('p2', 'palm_attack', 450, 360);
    ray('fx2', 'giant_palm_projectile', 650, ...tip, a, 310, 0.42, 'palm');
    cue = 'Độc chưởng · không bẻ hướng sau khi bắn';
  } else if (mode === 'stomp') {
    if (time < 600) phaseActor('crawl', time);
    else if (time < 1100) {
      const p = (time - 600) / 500;
      phaseActor('hop', time - 600, 460, 460 - Math.sin(p * Math.PI) * 80);
    } else phaseActor('crawl', time);
    if (time < 1100)
      warning(
        'eruption_circle_warning',
        time,
        460,
        460,
        (2 * tuning.stomp.radiusPx) / tuning.stomp.warningSourceDiameterPx,
        0,
        'fx2',
      );
    areas.push({
      kind: 'stomp',
      x: 460,
      y: 460,
      radius: tuning.stomp.radiusPx,
    });
    if (time >= 1100 && time < 1580) {
      fx('fx2', 'lunge_impact', time - 1100, 460, 460, 1.4);
      const spread = Math.min(1, (time - 1100) / 360);
      fx(
        'fxt',
        'transition_shockwave',
        time - 1100,
        460,
        460,
        (Math.max(0.1, spread) * 2 * tuning.stomp.radiusPx) /
          tuning.stomp.shockwaveSourceDiameterPx,
        0,
        200,
      ).setAlpha(0.8);
    }
    if (time >= 1100 && time < 2900)
      for (const h of heroes.slice(0, party))
        if (Math.hypot(h[0] - 460, h[1] - 460) <= tuning.stomp.radiusPx) {
          fx('fx1', 'poison_status', time, ...h, 0.7);
          text('Độc · choáng', h[0], h[1] - 64, '#e0bbef');
        }
    cue = time < 1100 ? 'Warning · dậm lan rộng' : 'Sóng độc + choáng';
  } else if (mode === 'channel') {
    phaseActor(
      time >= 700 && time < 4500 ? 'exhale' : 'crawl',
      time >= 700 && time < 4500 ? (time - 700) % 480 : time,
    );
    if (time < 700)
      warning('eruption_circle_warning', time, 460, 460, 0.8, 0, 'fx2');
    for (let start = 900; start <= 4200; start += 350)
      radial(
        start,
        460,
        440,
        16,
        (((start / 350) % 2) * Math.PI) / 16,
        tuning.channel.projectileSpeedPxPerSec,
        tuning.channel.projectileLifetimeMs,
      );
    cue =
      time < 900 ? 'Lấy hơi tại chỗ' : 'Đứng yên · liên tục nhả độc toàn hướng';
  } else if (mode === 'eruption') {
    const points = [
        [460, 460],
        [710, 385],
        [890, 550],
        [570, 590],
      ],
      step = 1250;
    let pos = [...points[0]],
      air = 0,
      tag = 'crawl',
      local = time;
    for (let i = 0; i < 3; i++) {
      const start = 700 + i * step,
        land = start + 650,
        from = points[i],
        to = points[i + 1];
      if (time >= start && time < land) {
        const p = (time - start) / 650;
        pos = [
          from[0] + (to[0] - from[0]) * p,
          from[1] + (to[1] - from[1]) * p,
        ];
        air = Math.sin(p * Math.PI) * 100;
        tag = 'hop';
        local = p * 479;
      }
      if (time >= land) pos = [...to];
      if (time >= start && time < land)
        warning('eruption_circle_warning', time, ...to, 0.7, 0, 'fx2');
      if (time >= land && time < land + 480)
        fx('fx2', 'circular_eruption', time - land, ...to, 0.85);
      radial(
        land,
        ...to,
        16,
        (i * Math.PI) / 16,
        tuning.eruption.projectileSpeedPxPerSec,
        tuning.eruption.projectileLifetimeMs,
      );
    }
    phaseActor(tag, local, pos[0], pos[1] - air);
    cue = 'Ba cú nhảy · mỗi điểm chạm đất phát độc 360°';
  }
  for (let i = 0; i < party; i++) {
    const [x, y] = heroes[i];
    cel('hero', 'idle_left', time, x, y, { depth: y });
    text(
      'P' +
        (i + 1) +
        ' · ' +
        (affectedParty.includes(i) ? 'Nhiễm độc' : hp[i] + '%'),
      x,
      y - 49,
      i === 0 ? '#fff4ba' : '#d3e2d5',
      11,
    );
  }
  pool.slice(poolN).forEach((s) => s.setVisible(false));
  labels.slice(labelN).forEach((t) => t.setVisible(false));
  $('cue').textContent = cue;
  $('clock').textContent = (time / 1000).toFixed(1) + 's';
  $('timeline').value = time;
  $('phase-label').textContent = [
    'phase',
    'palm',
    'stomp',
    'channel',
    'eruption',
  ].includes(mode)
    ? 'Phase 2 · Cáp Mô Công · 49%'
    : 'Phase 1 · Độc Trượng · bản duyệt mỹ thuật';
  $('boss-hp').style.width = [
    'phase',
    'palm',
    'stomp',
    'channel',
    'eruption',
  ].includes(mode)
    ? '49%'
    : '100%';
  $('readout').textContent = projectiles.length + ' tia / đạn đang bay';
}
class ReviewScene extends Phaser.Scene {
  preload() {
    for (const [key, p] of Object.entries(packages))
      this.load.atlas(key, p.path + '/' + p.image, p.path + '/' + p.atlas);
    this.load.image('ground', '/assets/exports/arena_v2/ground.png');
    for (const id of [
      'statue_male',
      'lantern',
      'tree_jade',
      'tree_blossom',
      'red_banner',
    ])
      this.load.image(id, '/assets/exports/arena_art01/' + id + '.png');
    this.load.on('loaderror', (f) => console.error('Asset failed', f.url));
  }
  create() {
    scene = this;
    this.add.image(-160, -260, 'ground').setOrigin(0).setDepth(-10000);
    const prop = (id, x, y) =>
      this.add
        .image(x - 160, y - 260, id)
        .setOrigin(0.5, 184 / 192)
        .setDepth(y - 260);
    prop('statue_male', 800, 576);
    prop('lantern', 744, 578);
    prop('lantern', 856, 578);
    for (const [id, x, y] of [
      ['tree_jade', 360, 560],
      ['tree_blossom', 1220, 600],
      ['tree_jade', 460, 1010],
      ['tree_blossom', 1200, 970],
      ['red_banner', 444, 530],
      ['red_banner', 1150, 525],
    ])
      prop(id, x, y);
    for (const [key, p] of Object.entries(packages))
      for (const [tag, a] of Object.entries(p.animations)) {
        this.anims.create({
          key: key + ':' + tag,
          frames: a.frames.map((frame, i) => ({
            key,
            frame,
            duration: a.durationsMs[i],
          })),
          frameRate: 1000 / a.durationsMs[0],
          repeat: a.repeat,
        });
      }
    ready = true;
    selectMode(mode);
  }
  update(_now, delta) {
    if (!ready) return;
    if (playing) {
      time += Math.min(delta, 80) * speed;
      if (time >= duration()) {
        cycles++;
        selectMode(mode);
      }
    }
    if (keys.ArrowLeft || keys.ArrowRight || keys.ArrowUp || keys.ArrowDown) {
      let dx = Number(!!keys.ArrowRight) - Number(!!keys.ArrowLeft),
        dy = Number(!!keys.ArrowDown) - Number(!!keys.ArrowUp),
        len = Math.hypot(dx, dy) || 1;
      heroes[0][0] = Math.max(
        45,
        Math.min(1230, heroes[0][0] + (dx / len) * delta * 0.2),
      );
      heroes[0][1] = Math.max(
        180,
        Math.min(660, heroes[0][1] + (dy / len) * delta * 0.2),
      );
      isolate = false;
      $('isolate').checked = false;
    }
    if (keys.a && mode === 'snakes' && time > 1380 && time - lastA > 300) {
      const p = snakePositions()
        .map(([x, y], i) => ({
          i,
          dist: Math.hypot(x - heroes[0][0], y - heroes[0][1]),
        }))
        .filter((p) => snakeHp[p.i] > 0 && p.dist < 160)
        .sort((a, b) => a.dist - b.dist)[0];
      if (p) {
        snakeHp[p.i] = Math.max(0, snakeHp[p.i] - 25);
        if (snakeHp[p.i] === 0) brokenAt[p.i] = time;
        lastA = time;
      }
    }
    render();
  }
}
for (const [id, name, ,] of MODES) {
  const b = document.createElement('button');
  b.dataset.mode = id;
  b.textContent = name;
  const small = document.createElement('small');
  small.textContent = ['palm', 'stomp', 'channel', 'eruption'].includes(id)
    ? 'Cáp Mô · phase 2'
    : id === 'phase'
      ? 'Chuyển phase'
      : 'Độc Trượng · phase 1';
  b.append(small);
  b.onclick = () => selectMode(id);
  $('dock').append(b);
}
$('settings').onclick = () => ($('options').hidden = !$('options').hidden);
$('pause').onclick = () => {
  playing = !playing;
  $('pause').textContent = playing ? 'Tạm dừng' : 'Tiếp tục';
};
$('restart').onclick = () => selectMode(mode);
$('timeline').oninput = (e) => {
  time = Number(e.target.value);
  playing = false;
  $('pause').textContent = 'Tiếp tục';
  render();
};
$('facing').onchange = (e) => {
  facing = e.target.value;
  if (mode === 'gallery') {
    const tag = galleryTag.replace(/_(right|left|up|down)$/, '_' + facing);
    if (packages[bundle].animations[tag]) {
      galleryTag = tag;
      options();
    }
  }
  time = 0;
};
$('speed').onchange = (e) => (speed = Number(e.target.value));
$('party').onchange = (e) => (party = Number(e.target.value));
$('isolate').onchange = (e) => (isolate = e.target.checked);
$('bundle').onchange = (e) => {
  bundle = e.target.value;
  options();
};
$('clip').onchange = (e) => {
  galleryTag = e.target.value;
  selectMode('gallery');
};
$('gallery').onclick = () => selectMode('gallery');
options();
addEventListener('keydown', (e) => {
  if (['INPUT', 'SELECT', 'BUTTON'].includes(document.activeElement?.tagName))
    return;
  if (e.key.startsWith('Arrow') || e.key.toLowerCase() === 'a') {
    keys[e.key.toLowerCase() === 'a' ? 'a' : e.key] = true;
    e.preventDefault();
  }
});
addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase() === 'a' ? 'a' : e.key] = false;
});
addEventListener('blur', () => (keys = {}));
window.tayDocReview = {
  get ready() {
    return ready;
  },
  setMode: selectMode,
  pause: (v) => (playing = !v),
  seek: (t) => {
    time = t;
    render();
  },
  setFacing: (d) => {
    facing = d;
    render();
  },
  gallery: (key, tag) => {
    bundle = key;
    galleryTag = tag;
    selectMode('gallery');
  },
  seen,
  clearObserved: () => observations.clear(),
  snapshot: () => ({
    phaser: Phaser.VERSION,
    mode,
    time,
    facing,
    nodes,
    projectiles,
    hp,
    heroes,
    snakeHp,
    affectedParty,
    areas,
    cycles,
    scope: 'local_art_demo',
    multiplayer: false,
  }),
};
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 800,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#18241c',
  scene: ReviewScene,
  audio: { noAudio: true },
  banner: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});
