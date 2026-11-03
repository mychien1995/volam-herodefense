/** Deterministic, seekable VISUAL choreography. No combat, room or protocol imports. */
import { tuning as T, modes, bosses } from './tuning.mjs';
export { tuning, modes, bosses } from './tuning.mjs';
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const mix = (a, b, p) => a + (b - a) * clamp(p);
export const lerp = (a, b, p) => ({ x: mix(a.x, b.x, p), y: mix(a.y, b.y, p) });
export const vector = {
  right: [1, 0],
  down: [0, 1],
  left: [-1, 0],
  up: [0, -1],
};
export const facing = (a) =>
  Math.abs(Math.cos(a)) > Math.abs(Math.sin(a))
    ? Math.cos(a) > 0
      ? 'right'
      : 'left'
    : Math.sin(a) > 0
      ? 'down'
      : 'up';
export const angle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
export const center = { x: T.field.x, y: T.field.y };
export function confine(p) {
  const f = T.field,
    n = Math.hypot(
      (p.x - f.x) / (f.rx - f.feet),
      (p.y - f.y) / (f.ry - f.feet),
    );
  return n > 1
    ? { x: f.x + (p.x - f.x) / n, y: f.y + (p.y - f.y) / n }
    : { ...p };
}
export function random(seed) {
  let n = seed >>> 0;
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
const paths = {
  triangle: [
    [-230, -150],
    [230, -130],
    [0, 215],
    [-230, -150],
  ],
  square: [
    [-195, -170],
    [195, -170],
    [195, 170],
    [-195, 170],
    [-195, -170],
  ],
  diamond: [
    [-275, 0],
    [0, -230],
    [275, 0],
    [0, 230],
    [-275, 0],
  ],
  z: [
    [-235, -160],
    [235, -160],
    [-235, 160],
    [235, 160],
  ],
};
export function dashPlan(seed, shape = 'random', dir = 'right') {
  const name =
    shape === 'random'
      ? Object.keys(paths)[Math.floor(random(seed)() * 4)]
      : shape;
  const a = Math.atan2(...vector[dir].slice().reverse());
  return {
    name,
    points: [
      center,
      ...paths[name].map(([x, y]) =>
        confine({
          x: center.x + x * Math.cos(a) - y * Math.sin(a),
          y: center.y + x * Math.sin(a) + y * Math.cos(a),
        }),
      ),
    ],
  };
}
export function samplePath(plan, t) {
  const age = Math.max(0, t - T.normal.start),
    spans = plan.points
      .slice(1)
      .map((_, i) => (i === 0 ? T.normal.approach : T.normal.segment));
  let at = age;
  for (let i = 0; i < spans.length; i++) {
    if (at < spans[i])
      return {
        ...lerp(plan.points[i], plan.points[i + 1], at / spans[i]),
        heading: angle(plan.points[i], plan.points[i + 1]),
        moving: t >= T.normal.start,
      };
    at -= spans[i];
  }
  return {
    ...plan.points.at(-1),
    heading: angle(plan.points.at(-2), plan.points.at(-1)),
    moving: false,
  };
}
export const clonePairs = [
  [
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ],
  [
    [0, 3],
    [1, 6],
    [2, 5],
    [4, 7],
  ],
  [
    [0, 5],
    [1, 4],
    [2, 7],
    [3, 6],
  ],
  [
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ],
  [
    [0, 3],
    [1, 6],
    [2, 5],
    [4, 7],
  ],
];
export function cloneSlot(actor, rounds) {
  let slot = actor;
  for (const pairs of clonePairs.slice(0, rounds)) {
    const pair = pairs.find((p) => p.includes(slot));
    slot = pair[0] === slot ? pair[1] : pair[0];
  }
  return slot;
}
const slot = (i) => ({
  x: center.x + Math.cos((i * Math.PI) / 4) * 265,
  y: center.y + Math.sin((i * Math.PI) / 4) * 165,
});
const initial = [
  { x: 960, y: 646 },
  { x: 675, y: 700 },
  { x: 910, y: 750 },
  { x: 650, y: 550 },
  { x: 800, y: 800 },
  { x: 970, y: 510 },
];
export function shiftLocked(id, t, revision = 'candidate') {
  return (
    revision === 'candidate' &&
    ((id === 'mai_pull' && t >= T.mai.pullStart && t < T.mai.pullEnd) ||
      (id === 'vortex' && t >= T.bacCai.pullStart && t < T.bacCai.pullEnd))
  );
}
export function sceneAt(id, t, opts = {}) {
  const m = modes.find((m) => m.id === id);
  if (!m) throw Error('Unknown preview ' + id);
  const dir = opts.facing ?? 'right',
    rev = opts.revision ?? 'candidate',
    candidate = rev === 'candidate',
    seed = opts.seed ?? 42,
    rng = random(seed);
  const bossId = ['entry', 'retry'].includes(id)
      ? (opts.boss ?? 'dong')
      : m.boss,
    boss = bosses[bossId];
  const s = {
    id,
    t,
    revision: rev,
    boss: bossId,
    layers: [],
    labels: [],
    phase: m.name,
    note: m.note,
    duration: m.duration,
    statueVisible: false,
    locked: true,
    shiftLocked: shiftLocked(id, t, rev),
    bossHp: 70,
    cloneCenter: { ...center },
    projectiles: [],
    dogHp: [],
    pull: null,
    followup: null,
    center: { ...center },
  };
  const layer = (asset, clip, p, clock = t, o = {}) => {
    const l = {
      id: `l${s.layers.length}`,
      asset,
      clip,
      x: p.x,
      y: p.y,
      clock,
      ...o,
    };
    s.layers.push(l);
    return l;
  };
  const fx = (asset, clip, p, clock = t, o = {}) =>
    layer(asset, clip, p, clock, { depth: p.y + 0.2, ...o });
  const body = (asset, pose, p, d = dir, clock = t, o = {}) =>
    layer(asset, pose + '_' + d, p, clock, { kind: 'actor', depth: p.y, ...o });
  const heroes = initial
    .slice(0, opts.players ?? 2)
    .map((p, i) => ({
      ...p,
      id: i,
      asset: ['dt_hero', 'dt_cai', 'dt_thien'][i % 3],
      dir: 'left',
      pose: 'idle',
    }));
  if (opts.player) Object.assign(heroes[0], opts.player);
  const b = { ...center };
  let asset = boss.asset,
    pose = 'idle',
    bd = dir,
    clock = t,
    bodyVisible = true;
  const v = vector[dir],
    a = Math.atan2(v[1], v[0]);
  const ray = (p, heading, age, length, warning = false) => {
    s.projectiles.push({
      kind: warning ? 'warning' : 'beam',
      x: p.x,
      y: p.y,
      heading,
      age,
      length,
    });
  };
  const ring = (p, age) => {
    if (age < 0 || age >= 0.7) return;
    if (candidate)
      fx('nam_de_ring', 'pulse', p, Math.min(age, 0.519), {
        depth: p.y + 0.15,
        alpha: 1 - clamp((age - 0.48) / 0.22),
      });
    else
      fx('nd_feedback01', 'plain_ring', p, Math.min(age, 0.399), {
        sx: mix(0.35, 2.5, age / 1.1),
        sy: mix(0.35, 2.5, age / 1.1),
        depth: p.y + 0.15,
      });
  };
  if (id === 'entry' || id === 'retry') {
    if (id === 'entry') {
      const from = {
        dong: { x: 1420, y: 616 },
        tay: { x: 80, y: 616 },
        nam: { x: 800, y: 1088 },
        bac: { x: 1120, y: 340 },
      }[bossId === 'mai' ? 'dong' : bossId];
      Object.assign(b, lerp(from, center, t / 2.2));
      bd = facing(angle(from, center));
      pose = t < 2.2 ? 'walk' : 'idle';
      s.locked = t >= 2.2;
      s.statueVisible = !s.locked;
      s.phase =
        t < 2.2
          ? 'Boss tiến vào sân chính'
          : 'Tượng ẩn · Gom đội / hồi sinh · Khóa sân';
      if (t < 2.2)
        heroes.forEach((p, i) =>
          Object.assign(p, { x: 1180 + i * 40, y: 840 }),
        );
      else if (t < 2.7)
        heroes.forEach((p) =>
          fx('dt_dash', 'dash_arrival', p, t - 2.2, { sx: 0.65, sy: 0.65 }),
        );
    } else {
      s.bossHp = t < 2 ? 70 : 100;
      heroes.forEach((p) => {
        p.pose = 'idle';
        p.defeated = t < 2;
      });
      s.phase =
        t < 2
          ? 'Cả đội gục · Tượng tiếp tục được bảo vệ'
          : 'Lần thử mới · Boss đầy HP · Đội hồi sinh';
      if (t >= 2 && t < 2.5)
        heroes.forEach((p) =>
          fx('dt_dash', 'dash_arrival', p, t - 2, { sx: 0.6, sy: 0.6 }),
        );
    }
  }
  if (id === 'lac_anh') {
    if (candidate) {
      const plan = dashPlan(seed, opts.shape ?? 'random', dir),
        q = samplePath(plan, t);
      Object.assign(b, q);
      bd = facing(q.heading);
      pose = q.moving
        ? 'dash'
        : t < T.normal.start
          ? 'sword_flurry_cast'
          : 'idle';
      clock = t - T.normal.start;
      s.path = plan;
      s.phase =
        'A · Lạc Anh · ' +
        {
          triangle: 'Tam giác',
          square: 'Vuông',
          diamond: 'Con thoi',
          z: 'Chữ Z',
        }[plan.name];
      if (q.moving)
        fx('dt_fan', 'blossom_slash_wave', { x: b.x, y: b.y - 22 }, t, {
          sx: 0.9,
          sy: 0.9,
          rotation: q.heading,
        });
      for (let age = 0.06; age < 0.45; age += 0.08) {
        if (t - age < T.normal.start) continue;
        const p = samplePath(plan, t - age);
        if (!p.moving) continue;
        fx('dt_fx', 'petal_patch', { x: p.x, y: p.y - 10 }, t - age, {
          sx: 0.35,
          sy: 0.35,
          alpha: 1 - age / 0.48,
          depth: p.y - 0.1,
        });
      }
    } else {
      pose = 'sword_flurry_cast';
      if (t > 0.45 && t < 1.4)
        fx(
          'dt_fan',
          'sword_fan_wave',
          { x: b.x + v[0] * 90, y: b.y - 22 + v[1] * 90 },
          t - 0.45,
          { rotation: a },
        );
      s.phase = 'Preview gốc · Đánh thường quạt hoa đào';
    }
  }
  if (id === 'four_slash') {
    pose = t < 0.9 ? 'sword_flurry_cast' : 'idle';
    const offset = rng() < 0.5 ? 0 : Math.PI / 4;
    s.pattern = offset ? 'X' : '+';
    if (t >= 0.55 && t < 1.25)
      for (let i = 0; i < 4; i++) {
        const heading = offset + (i * Math.PI) / 2,
          d = 280 * clamp((t - 0.55) / 0.5);
        fx(
          'dt_fan',
          'blossom_slash_wave',
          {
            x: b.x + Math.cos(heading) * d,
            y: b.y - 20 + Math.sin(heading) * d,
          },
          t - 0.55,
          { rotation: heading },
        );
      }
  }
  if (id === 'mai_claws') {
    pose = t < 1.3 ? 'claw_attack' : 'idle';
    for (let i = 0; i < 2; i++) {
      const age = t - 0.5 - i * 0.07;
      if (age < 0 || age > 0.4) continue;
      const p = clamp(age / 0.4),
        side = (i === 0 ? 1 : -1) * mix(-50, 50, p),
        forward = mix(24, 92, p);
      const x = b.x + v[0] * forward - v[1] * side,
        y = b.y - 20 + v[1] * forward + v[0] * side;
      fx('dt_maifx', i === 0 ? 'claw_left' : 'claw_right', { x, y }, age, {
        rotation: a + (i === 0 ? 0 : Math.PI),
        sx: 0.9,
        sy: 0.9,
        depth: b.y + 0.1,
      });
    }
    // Readable front/back witnesses in every selected facing.
    if (!opts.player)
      Object.assign(heroes[0], { x: b.x + v[0] * 80, y: b.y + v[1] * 80 });
    if (heroes[1])
      Object.assign(heroes[1], { x: b.x - v[0] * 90, y: b.y - v[1] * 90 });
    s.clawCount = t >= 0.57 && t < 0.9 ? 2 : t >= 0.5 && t < 0.97 ? 1 : 0;
  }
  if (id === 'mai_pull') {
    const end = candidate ? T.mai.pullEnd : 2.8;
    pose = t < end ? 'pull_cast' : t < end + 0.65 ? 'claw_attack' : 'idle';
    bd = facing(angle(b, heroes[0]));
    s.pull = {
      start: T.mai.pullStart,
      end,
      speed: candidate ? T.mai.pullSpeed : 150,
      stop: T.mai.stopDistance,
      center: { ...b },
      single: true,
    };
    if (t >= 0.4 && t < end) {
      fx('dt_maifx', 'suction', { x: b.x, y: b.y - 20 }, t, {
        sx: 1,
        sy: 0.7,
        depth: b.y - 0.1,
      });
      for (let i = 0; i < 5; i++) {
        const p = lerp(heroes[0], b, (t * 1.8 + i / 5) % 1);
        fx('dt_maifx', 'ranged_claw', { x: p.x, y: p.y - 20 }, t + i * 0.1, {
          sx: 0.3,
          sy: 0.3,
          rotation: angle(heroes[0], b),
          alpha: 0.55,
        });
      }
    }
    if (candidate)
      for (let i = 0; i < 3; i++) {
        const age = t - end - i * 0.12;
        if (age < 0 || age > 0.9) continue;
        const target = opts.releaseTarget ?? heroes[0],
          heading = angle(
            { x: b.x, y: b.y - 20 },
            { x: target.x, y: target.y - 20 },
          );
        const p = {
          x: b.x + Math.cos(heading) * (28 + age * T.mai.projectileSpeed),
          y: b.y - 20 + Math.sin(heading) * (28 + age * T.mai.projectileSpeed),
        };
        fx('dt_maifx', 'ranged_claw', p, age, {
          rotation: heading,
          sx: 0.75,
          sy: 0.75,
        });
        s.projectiles.push({ kind: 'mai', ...p, heading });
      }
    s.phase =
      t < end
        ? 'Âm Phong · Hút mạnh · Shift khóa'
        : candidate
          ? 'Dứt hút → Ma Ảnh Tróc Hồn ngay'
          : 'Preview gốc · Kết thúc hút';
  }
  if (id === 'needles') {
    pose = t < 1.5 ? 'poison_cast' : 'idle';
    s.needleSpeed = candidate ? T.needles.speed : T.needles.oldSpeed;
    if (t < 1)
      fx(
        'td_fx1',
        'needle_fan_warning',
        { x: b.x + v[0] * 110, y: b.y - 24 + v[1] * 110 },
        t,
        { rotation: a, sx: 0.8, sy: 0.8, alpha: 0.7, depth: 10 },
      );
    for (let wave = 0; wave < 3; wave++)
      for (let i = 0; i < 9; i++) {
        const age = t - 1 - wave * T.needles.volleySpacing,
          d = age * s.needleSpeed,
          heading = a - Math.PI / 6 + (i * Math.PI) / 24;
        if (age < 0 || d > T.needles.range) continue;
        const p = {
            x: b.x + Math.cos(heading) * (24 + d),
            y: b.y - 28 + Math.sin(heading) * (24 + d),
          },
          scale = candidate ? T.needles.scale : 1;
        fx('td_fx1', 'poison_needle', p, age, {
          rotation: heading,
          sx: scale,
          sy: scale,
          additive: candidate,
        });
        s.projectiles.push({ kind: 'needle', ...p, speed: s.needleSpeed });
      }
  }
  if (id === 'cloud') {
    pose = t < 1.3 ? 'large_spell_cast' : 'idle';
    for (let i = 0; i < 8; i++) {
      const q = {
          x: center.x + Math.cos((i * Math.PI) / 4 + 0.25) * 190,
          y: center.y + Math.sin((i * Math.PI) / 4 + 0.25) * 170,
        },
        age = t - 1.1 - i * 0.04;
      if (age < 0)
        fx('td_fx1', 'cloud_warning', q, t, {
          sx: 0.8,
          sy: 0.8,
          depth: 10,
          alpha: 0.65,
        });
      else if (candidate)
        fx('tay_doc_cloud_v2', 'loop', q, age + i * 0.12, {
          sx: 0.9,
          sy: 0.9,
          depth: 20,
          origin: [0.5, 0.64],
          alpha: clamp(age / 0.25),
        });
      else
        fx('td_fx1', age < 0.4 ? 'cloud_expand' : 'cloud_loop', q, age, {
          sx: 1.6,
          sy: 1.1,
          depth: 20,
        });
    }
  }
  if (id === 'stomp') {
    asset = 'td_p2';
    pose = t < 1.1 ? 'aoe_charge' : t < 1.6 ? 'lunge_attack' : 'idle';
    const age = t - 1.1;
    s.effectRadius = 405;
    if (age < 0)
      fx('td_fx2', 'eruption_circle_warning', b, t, {
        sx: 3.5,
        sy: 2.9,
        depth: 5,
        alpha: 0.5,
      });
    else if (age < 0.9) {
      if (candidate) {
        fx('td_fx2', 'lunge_impact', b, age, {
          sx: 0.85,
          sy: 0.85,
          depth: 20,
          alpha: 1 - clamp((age - 0.4) / 0.4),
        });
        if (age >= 0.2)
          fx('tay_doc_impact', 'rim', b, age, {
            depth: 15,
            alpha: Math.sin(clamp((age - 0.2) / 0.65) * Math.PI),
          });
        for (let i = 0; i < 24; i++) {
          const heading = (i * Math.PI) / 12,
            r = mix(65, 405, age / 0.6),
            p = {
              x: b.x + Math.cos(heading) * r,
              y: b.y + Math.sin(heading) * r * 0.6,
            };
          fx('td_fx2', 'toxic_particles', p, age + i * 0.08, {
            sx: 0.5,
            sy: 0.5,
            rotation: heading,
            alpha: 1 - clamp((age - 0.5) / 0.4),
            depth: 21,
          });
        }
      } else
        fx('td_fx2', 'lunge_shockwave', b, age, {
          sx: 4.1,
          sy: 3.4,
          depth: 20,
        });
    }
  }
  if (id === 'aura') {
    pose = t < 0.7 ? 'defensive_stance' : 'idle';
    ring(b, t - 0.4);
  }
  if (id === 'beam') {
    const release = candidate ? T.namDe.charge : T.namDe.oldCharge;
    s.releaseAt = release;
    pose =
      t < release
        ? 'finger_charge'
        : t < release + 0.4
          ? 'finger_release'
          : 'idle';
    const p = { x: b.x + v[0] * 32, y: b.y - 39 + v[1] * 18 };
    if (t < release) {
      fx('nd_finger', 'fingertip_charge', p, t, { sx: 0.27, sy: 0.27 });
      ray(p, a, t, 2000, true);
    } else if (t < release + T.namDe.active) {
      ray(p, a, t - release, 2000);
      fx('nd_rapid', 'fingertip_flash', p, t - release, { sx: 0.4, sy: 0.4 });
    }
  }
  if (id === 'nam_dash') {
    const p = opts.dashTarget ?? { ...heroes[0] },
      pv = vector[p.dir] ?? [-1, 0],
      dest = confine({ x: p.x - pv[0] * 64, y: p.y - pv[1] * 64 }),
      progress = clamp((t - 0.35) / 0.25);
    Object.assign(b, lerp(center, dest, progress));
    bd = facing(angle(b, p));
    const follow =
      opts.branch === 'random' || !opts.branch
        ? rng() < 0.5
          ? 'aura'
          : 'small'
        : opts.branch;
    s.followup = follow;
    pose =
      t < 0.6
        ? 'walk'
        : t < 1.1
          ? follow === 'aura'
            ? 'defensive_stance'
            : 'finger_release'
          : 'idle';
    clock = t < 0.6 ? t : t - 0.6;
    if (t >= 0.35 && t < 0.8)
      fx('nd_rework', 'dash_wake', { x: b.x, y: b.y - 20 }, t - 0.35, {
        sx: 0.6,
        sy: 0.6,
        rotation: angle(center, dest),
        alpha: 0.65,
      });
    if (candidate && follow === 'aura') ring(b, t - 0.6);
    if (candidate && follow === 'small' && t >= 0.6 && t < 1.3) {
      const heading = angle({ x: b.x, y: b.y - 30 }, { x: p.x, y: p.y - 22 }),
        age = t - 0.6,
        q = {
          x: b.x + Math.cos(heading) * (30 + age * 900),
          y: b.y - 30 + Math.sin(heading) * (30 + age * 900),
        };
      fx('nd_rapid', 'rapid_projectile', q, age, {
        sx: 0.55,
        sy: 0.3,
        rotation: heading,
      });
      s.projectiles.push({ kind: 'small', ...q, heading });
    }
  }
  if (id === 'palm') {
    pose = t < 0.5 ? 'palm_attack' : 'idle';
    const age = t - 0.45;
    if (age >= 0 && age < T.namDe.palmRange / T.namDe.palmSpeed) {
      const p = {
        x: b.x + v[0] * (25 + age * T.namDe.palmSpeed),
        y: b.y - 24 + v[1] * (25 + age * T.namDe.palmSpeed),
      };
      fx('nd_palm', candidate ? 'palm_trail' : 'palm_shockwave', p, age, {
        sx: candidate ? 1.25 : 0.7,
        sy: candidate ? 0.85 : 0.7,
        rotation: a,
      });
      s.projectiles.push({ kind: 'palm', ...p });
    }
  }
  if (id === 'clones') {
    bodyVisible = false;
    const base = candidate ? center : { x: center.x + 100, y: center.y + 90 };
    s.cloneCenter = base;
    const atSlot = (i) => {
      const p = slot(i);
      return { x: p.x + base.x - center.x, y: p.y + base.y - center.y };
    };
    const roundTime = T.bacCai.move + 3 * T.bacCai.stagger + T.bacCai.settle,
      elapsed = Math.max(0, t - T.bacCai.split),
      round = Math.min(4, Math.floor(elapsed / roundTime)),
      completed =
        t < T.bacCai.split ? 0 : Math.min(5, Math.floor(elapsed / roundTime)),
      within = elapsed - round * roundTime;
    s.swaps = completed;
    for (let i = 0; i < 8; i++) {
      const fromSlot = cloneSlot(i, completed),
        from = atSlot(fromSlot);
      let p = from;
      if (t < T.bacCai.split)
        p = lerp(
          { x: center.x + 100, y: center.y + 90 },
          atSlot(i),
          t / T.bacCai.split,
        );
      else if (completed < 5) {
        const pairIndex = clonePairs[round].findIndex((pair) =>
            pair.includes(fromSlot),
          ),
          pair = clonePairs[round][pairIndex],
          to = atSlot(pair[0] === fromSlot ? pair[1] : pair[0]);
        p = lerp(
          from,
          to,
          (within - pairIndex * T.bacCai.stagger) / T.bacCai.move,
        );
      }
      body('bc_boss', 'idle', p, 'down', t, {
        id: 'clone-' + i,
        alpha: i === 0 ? 1 : clamp(t / 0.5),
      });
    }
    s.phase =
      t < T.bacCai.split
        ? 'Từ vị trí lệch → tám vị trí quanh tâm sân'
        : `Tráo chéo · ${completed}/5 lượt`;
  }
  if (id === 'spiral') {
    const from = { x: center.x - 170, y: center.y + 95 },
      dash = candidate ? T.bacCai.dash : 0,
      release = dash + T.bacCai.release,
      age = t - release;
    Object.assign(b, candidate ? lerp(from, center, t / dash) : from);
    const origin = candidate ? center : from;
    s.dragonOrigin = { ...origin };
    s.releaseAt = release;
    pose =
      t < dash
        ? 'walk'
        : t < dash + T.bacCai.recovery
          ? 'dragon_release'
          : 'palm_stance';
    clock = t - release;
    const flight =
      T.bacCai.oldFlight / (candidate ? T.bacCai.dragonSpeedMultiplier : 1);
    s.flightDuration = flight;
    if (age >= 0 && age < flight) {
      const progress = age / flight,
        heading = progress * 6 * Math.PI,
        radius = 20 + progress * 290,
        p = {
          x: origin.x + Math.cos(heading) * radius,
          y: origin.y + Math.sin(heading) * radius * 0.7,
        };
      fx('bc_fx', 'fire_dragon', p, age, { rotation: heading + Math.PI / 2 });
      s.dragon = { ...p, radius, heading };
    }
    if (age > 0.65 && age % 1.4 < 0.7) {
      const n = age % 1.4;
      fx('bc_palm', 'dragon_projectile', { x: b.x + n * 380, y: b.y - 25 }, n, {
        sx: 0.7,
        sy: 0.7,
      });
    }
  }
  if (id === 'dogs') {
    pose = t < 0.8 ? 'staff_combo' : 'idle';
    s.dogCount = t >= 0.3 ? 4 : 0;
    if (t >= 0.3)
      for (let i = 0; i < 4; i++) {
        const target = heroes[i % heroes.length],
          from = {
            x: center.x - 60 + (i % 2) * 100,
            y: center.y - 40 + Math.floor(i / 2) * 70,
          },
          p = lerp(
            from,
            {
              x: target.x + (i % 2 ? -24 : 24),
              y: target.y + Math.floor(i / 2) * 28,
            },
            (t - 0.5) / 1.6,
          );
        const tag =
            t < 0.8
              ? 'idle_right'
              : t < 2.2
                ? 'walk_right'
                : t < 3
                  ? 'bite_right'
                  : t < 4
                    ? 'hurt_right'
                    : 'death_right',
          start = t < 0.8 ? 0.3 : t < 2.2 ? 0.8 : t < 3 ? 2.2 : t < 4 ? 3 : 4;
        const hp = t < 3 ? 100 : Math.max(0, 100 - (t - 3) * 100);
        s.dogHp.push(hp);
        layer('bc_dog', tag, p, t - start, {
          kind: 'dog',
          id: 'dog-' + i,
          flipX: target.x < center.x,
          loop: t < 3,
          hp,
          depth: p.y,
        });
        if (t < 0.8)
          fx('bc_fx', 'clone_smoke', p, t - 0.3, {
            sx: 0.5,
            sy: 0.5,
            alpha: 0.6,
          });
      }
  }
  if (id === 'vortex') {
    const age = t - T.bacCai.pullStart,
      spin = t < T.bacCai.pullEnd;
    pose = spin ? 'staff_spin' : 'staff_basic';
    bd = spin
      ? ['down', 'left', 'up', 'right'][Math.floor(t / 0.12) % 4]
      : 'down';
    clock = spin ? t : t - T.bacCai.pullEnd;
    s.pull = {
      start: T.bacCai.pullStart,
      end: T.bacCai.pullEnd,
      speed: candidate ? T.bacCai.pullSpeed : 160,
      stop: 40,
      center: { ...b },
      single: false,
      snap: candidate ? T.bacCai.snapDuration : 0,
      slow: candidate ? T.bacCai.walkSlow : 0,
    };
    if (age >= 0 && spin)
      for (let i = 0; i < 10; i++) {
        const n = (t / 1.2 + i / 10) % 1,
          heading = (i * Math.PI) / 5,
          r = 290 * (1 - n);
        fx(
          'bc_staff',
          'knockback_wake',
          {
            x: b.x + Math.cos(heading) * r,
            y: b.y + Math.sin(heading) * r * 0.7,
          },
          t + i * 0.1,
          {
            sx: 0.6,
            sy: 0.45,
            rotation: heading + Math.PI,
            alpha: 0.5,
            depth: 20,
          },
        );
      }
    if (t >= 0.4 && t < 4.4)
      fx(
        'bc_staff',
        spin ? 'staff_whirlwind' : 'ground_smash',
        b,
        spin ? t : t - 3.9,
        { sx: 1, sy: 0.8, depth: 18, alpha: 0.8 },
      );
    s.phase =
      age < 0
        ? 'Bắc Cái chuẩn bị xoay'
        : age < T.bacCai.snapDuration
          ? 'Kéo giật nhanh → gần Bắc Cái'
          : spin
            ? 'Hút + slow · Đi bộ thoát · Shift khóa'
            : 'Đập bổng · Hết hút, mở lại Shift';
  }
  if (s.pull && !s.pull.single && t >= s.pull.start) {
    heroes.slice(1).forEach((p) => {
      const distance = Math.hypot(p.x - s.pull.center.x, p.y - s.pull.center.y),
        elapsed = Math.min(t - s.pull.start, s.pull.end - s.pull.start);
      const remaining =
        s.pull.snap && elapsed >= s.pull.snap
          ? Math.max(s.pull.stop, 65 - s.pull.speed * (elapsed - s.pull.snap))
          : Math.max(s.pull.stop, distance - s.pull.speed * elapsed);
      const progress =
        s.pull.snap && elapsed < s.pull.snap ? clamp(elapsed / s.pull.snap) : 1;
      Object.assign(
        p,
        lerp(p, s.pull.center, progress * (1 - remaining / distance)),
      );
    });
  }
  if (bodyVisible) body(asset, pose, b, bd, Math.max(0, clock), { id: 'boss' });
  s.bossPosition = { x: b.x, y: b.y };
  s.heroes = heroes;
  return s;
}

/** Input demo only: demonstrate walk-vs-pull and confinement; never an authority implementation. */
export function advancePlayer(p, keys, dt, s, previousTime) {
  let dx = Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft')),
    dy = Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp'));
  const n = Math.hypot(dx, dy),
    q = { ...p };
  let walk = 180;
  const pull = s.pull,
    active = pull && s.t >= pull.start && s.t < pull.end;
  if (active && pull.slow) walk *= 1 - pull.slow;
  if (n) {
    q.x += (dx / n) * walk * dt;
    q.y += (dy / n) * walk * dt;
    q.dir = facing(Math.atan2(dy, dx));
  }
  if (active) {
    const distance = Math.hypot(q.x - pull.center.x, q.y - pull.center.y),
      heading = angle(q, pull.center);
    let amount = pull.speed * dt;
    if (pull.snap && previousTime < pull.start + pull.snap) {
      const fraction = clamp(
        dt /
          Math.max(
            dt,
            pull.start + pull.snap - Math.max(previousTime, pull.start),
          ),
      );
      amount = Math.max(amount, (distance - 65) * fraction);
    }
    amount = Math.min(Math.max(0, distance - pull.stop), amount);
    q.x += Math.cos(heading) * amount;
    q.y += Math.sin(heading) * amount;
  }
  return { ...q, ...(s.locked ? confine(q) : q), pose: n ? 'walk' : 'idle' };
}
