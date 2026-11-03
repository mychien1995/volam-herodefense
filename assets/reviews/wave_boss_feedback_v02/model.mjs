/** Seekable presentation only. No game-core, room, protocol or authoritative damage. */
import {
  sceneAt as oldScene,
  advancePlayer as oldAdvance,
  confine,
  center,
  random,
  clamp,
  mix,
  lerp,
  angle,
  vector,
  facing,
} from '../wave_boss_feedback_v01/model.mjs';
import { tuning, modes, bosses } from './tuning.mjs';
export {
  tuning,
  modes,
  bosses,
  confine,
  center,
  random,
  clamp,
  mix,
  lerp,
  angle,
  vector,
  facing,
};
export const shiftLocked = (id, t, revision = 'candidate') =>
  revision === 'candidate' &&
  id === 'mai_pull' &&
  t >= tuning.mai.pullStart &&
  t < tuning.mai.lockEnd;
export function movingTarget(t) {
  return confine({
    x: 980 - 12 * t,
    y: 616 + Math.sin((t - 0.2) * 1.45) * 115,
    dir: 'down',
    pose: 'walk',
  });
}
export function burstPlan(seed = 42, count = 'random', sample = movingTarget) {
  const rng = random(Math.imul(seed ^ 0x9e3779b9, 2654435761) >>> 0),
    n = count === 'random' ? 1 + Math.floor(rng() * 5) : Number(count);
  return Array.from({ length: n }, (_, i) => {
    const release = 0.55 + i * tuning.burst.interval,
      p = { ...sample(release) };
    return {
      index: i,
      release,
      target: p,
      origin: { x: center.x, y: center.y - 24 },
      heading: angle(
        { x: center.x, y: center.y - 24 },
        { x: p.x, y: p.y - 24 },
      ),
    };
  });
}
export function skyPlan(seed = 42) {
  const rng = random(seed);
  return Array.from({ length: tuning.sky.count }, (_, i) => {
    const a = rng() * Math.PI * 2,
      r = Math.sqrt(rng()) * 0.88;
    return {
      x: center.x + Math.cos(a) * r * (tuning.field.rx - 28),
      y: center.y + Math.sin(a) * r * (tuning.field.ry - 28),
      release: tuning.sky.startup + i * tuning.sky.interval,
      radius: 24,
    };
  });
}
/** Nine independent seeded paths. Rebuilding from elapsed time keeps pause/seek exact. */
export function spinPositions(seed = 42, elapsed = 0) {
  const { count, radius, moveSpeed, minLeg } = tuning.vortex;
  const rx = tuning.field.rx - radius - 8,
    ry = tuning.field.ry - radius - 8;
  return Array.from({ length: count + 1 }, (_, i) => {
    const rng = random(
      Math.imul(seed ^ Math.imul(i + 1, 0x9e3779b9), 0x85ebca6b) >>> 0,
    );
    const initialAngle =
      i === 0 ? 0 : ((i - 1) * Math.PI) / 4 + (rng() - 0.5) * 0.35;
    const initialRadius = i === 0 ? 0 : 0.55 + rng() * 0.35;
    let p = {
      x: center.x + Math.cos(initialAngle) * initialRadius * rx,
      y: center.y + Math.sin(initialAngle) * initialRadius * ry,
    };
    let remaining = Math.max(0, Math.min(tuning.vortex.active, elapsed));
    while (remaining > 0) {
      let target, distance;
      // The inset ellipse is convex: every travel segment keeps the entire hit circle inside.
      do {
        const a = rng() * Math.PI * 2,
          r = Math.sqrt(rng()) * 0.97;
        target = {
          x: center.x + Math.cos(a) * r * rx,
          y: center.y + Math.sin(a) * r * ry,
        };
        distance = Math.hypot(target.x - p.x, target.y - p.y);
      } while (distance < minLeg);
      const duration = distance / moveSpeed;
      if (remaining <= duration) return lerp(p, target, remaining / duration);
      remaining -= duration;
      p = target;
    }
    return p;
  });
}
export function pillarPlan() {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3,
      p = { x: center.x + Math.cos(a) * 285, y: center.y + Math.sin(a) * 245 };
    const inward = angle(p, center);
    return {
      ...p,
      heading: inward,
      shots: [-0.4, 0, 0.4].map((d) => inward + d),
    };
  });
}
const skillNames = {
  shout: 'Lạc Anh Kiếm Pháp',
  mai_claws: 'Bạch Cốt Trảo',
  mai_pull: 'Âm Phong Hấp Lực',
  pillars: 'Hỗn Thiên Phục Long Chấn',
  stomp: 'Cáp Mô Chấn Kích',
  small_finger: 'Tiểu Nhất Dương Chỉ',
  barrage: 'Liên Hoàn Nhất Dương Chỉ',
  spotlight: 'Phật Quang Phổ Chiếu',
  sky: 'Nhất Dương Quy Tông',
  clones: 'Mục Hạ Vô Nhân',
  vortex: 'Thiên Hạ Vô Cẩu',
  shout_ly: 'Băng Phách Ngân Châm',
  shout_hong: 'Hỏa Sơn Bạo Phát',
  shout_chu: 'Song Thủ Hỗ Bác',
  shout_kim: 'Long Tượng Bát Nhã Công',
};
const inside = (p, margin = 0) =>
  Math.hypot(
    (p.x - center.x) / (tuning.field.rx - margin),
    (p.y - center.y) / (tuning.field.ry - margin),
  ) <= 1;
export function sceneAt(id, t, opts = {}) {
  const mode = modes.find((m) => m.id === id);
  if (!mode) throw Error('Unknown v02 mode ' + id);
  const dir = opts.facing ?? 'right',
    seed = opts.seed ?? 42,
    old = opts.revision === 'original';
  if (
    old &&
    ['mai_claws', 'mai_pull', 'stomp', 'clones', 'vortex'].includes(id)
  ) {
    const s = oldScene(id, t, { ...opts, revision: 'candidate' });
    s.duration = mode.duration;
    s.note = 'Đối chiếu: bản v01 đã tích hợp. ' + mode.note;
    return s;
  }
  const s = oldScene('aura', 0, { ...opts, revision: 'candidate' });
  Object.assign(s, {
    id,
    t,
    boss: mode.boss,
    phase: mode.name,
    note: mode.note,
    duration: mode.duration,
    layers: [],
    labels: [],
    projectiles: [],
    shouts: [],
    damageZones: [],
    pull: null,
    followup: null,
    shiftLocked: shiftLocked(id, t),
    bossPosition: { ...center },
    bossVisible: true,
    dialogue: null,
    autoTarget: opts.autoTarget,
  });
  const b = s.bossPosition,
    asset = bosses[mode.boss].asset;
  let pose = 'idle',
    bodyAsset = asset,
    bodyClip = null,
    bodyClock = t;
  if (['small_finger', 'spotlight'].includes(id) && opts.autoTarget !== false) {
    s.heroes[0] = { ...s.heroes[0], ...movingTarget(t) };
  }
  const hero = s.heroes[0];
  const fx = (asset, clip, p, clock = t, o = {}) => {
    const l = {
      id: 'v02:' + s.layers.length,
      asset,
      clip,
      x: p.x,
      y: p.y,
      clock,
      depth: p.y + 0.2,
      ...o,
    };
    s.layers.push(l);
    return l;
  };
  const body = (p, clip, clock = t, o = {}) =>
    fx(asset, clip + '_' + dir, p, clock, { kind: 'actor', depth: p.y, ...o });
  const shout = (name, at = 0, p = b) => {
    const age = t - at;
    if (age >= 0 && age < 1.25)
      s.shouts.push({
        text: name,
        x: p.x,
        y: p.y - 85 - 10 * clamp(age / 0.35),
        alpha: 1 - clamp((age - 0.9) / 0.35),
        age,
      });
  };
  if (skillNames[id]) shout(skillNames[id], 0.05);
  if (id === 'shout') {
    const base = oldScene('four_slash', t, { ...opts, revision: 'candidate' });
    s.layers = base.layers;
    s.bossPosition = base.bossPosition;
    s.heroes = base.heroes;
    bodyClip = '';
  }
  if (id === 'mai_claws') {
    pose = t < 1.25 ? 'claw_attack' : 'idle';
    const a = Math.atan2(vector[dir][1], vector[dir][0]);
    for (let i = 0; i < 2; i++) {
      const age = t - 0.5 - i * 0.055;
      if (age < 0 || age > 0.48) continue;
      const p = clamp(age / 0.42),
        forward = mix(32, 200, p),
        side = (i === 0 ? 1 : -1) * mix(-92, 92, p);
      const q = {
        x: b.x + Math.cos(a) * forward - Math.sin(a) * side,
        y: b.y - 20 + Math.sin(a) * forward + Math.cos(a) * side,
      };
      fx('dt_maifx', i === 0 ? 'claw_left' : 'claw_right', q, age, {
        sx: 0.9,
        sy: 0.9,
        rotation: a + i * Math.PI,
        id: 'frontal-claw:' + i,
      });
    }
    s.clawReach = 200;
  }
  if (id === 'mai_pull') {
    const m = tuning.mai;
    pose =
      t < m.pullEnd
        ? 'pull_cast'
        : t < m.release + 0.85
          ? 'claw_attack'
          : 'idle';
    s.pull =
      t >= m.pullStart && t < m.pullEnd
        ? {
            center: { ...b },
            start: m.pullStart,
            end: m.pullEnd,
            speed: 1600,
            snap: 0.15,
            stop: 58,
          }
        : null;
    if (t >= 0.12 && t < m.pullEnd)
      fx('dt_maifx', 'suction', { x: b.x, y: b.y - 20 }, t, { sx: 1, sy: 1 });
    s.evasionWindow = { start: m.pullEnd, end: m.release, duration: 0.8 };
    s.dashLockUntil = m.lockEnd;
    if (t >= m.pullEnd && t < m.release) {
      s.labels.push({
        text: '0,80s né · ' + Math.max(0, m.release - t).toFixed(2) + 's',
        x: b.x,
        y: b.y - 102,
      });
    }
    const aim = opts.releaseTarget ?? { x: b.x + 58, y: b.y };
    const heading = angle({ x: b.x, y: b.y - 20 }, { x: aim.x, y: aim.y - 20 });
    if (t >= m.pullEnd && t < m.release)
      s.projectiles.push({
        kind: 'warning',
        x: b.x,
        y: b.y - 20,
        heading,
        length: 500,
        age: t - m.pullEnd,
      });
    if (t >= m.release) {
      shout('Ma Ảnh Tróc Hồn', m.release);
      for (let i = 0; i < 5; i++) {
        const age = t - m.release - i * 0.14;
        if (age < 0 || age > 1) continue;
        const p = {
          x: b.x + Math.cos(heading) * 520 * age,
          y: b.y - 20 + Math.sin(heading) * 520 * age,
        };
        fx('dt_maifx', 'ranged_claw', p, age, {
          sx: 0.75,
          sy: 0.75,
          rotation: heading,
        });
        s.projectiles.push({
          kind: 'claw',
          ...p,
          heading,
          release: m.release + i * 0.14,
        });
      }
    }
  }
  if (id === 'pillars') {
    pose = t < 0.8 ? 'large_spell_cast' : 'idle';
    s.pillars = pillarPlan();
    for (const [i, p] of s.pillars.entries()) {
      fx('td_snake8', 'snake_facing_8', p, t, {
        sx: 1,
        sy: 1,
        depth: p.y,
        id: 'pillar:' + i,
        frameIndex: ((Math.round(p.heading / (Math.PI / 4)) % 8) + 8) % 8,
      });
      for (let volley = 0; volley < 4; volley++)
        for (const heading of p.shots) {
          const release = 1.1 + volley * 0.8,
            age = t - release;
          if (age < 0 || age > 1.7) continue;
          const q = {
            x: p.x + Math.cos(heading) * age * 340,
            y: p.y - 20 + Math.sin(heading) * age * 340,
          };
          if (!inside({ ...q, y: q.y + 20 }, 4)) continue;
          fx('snake_bolt', 'loop', q, age, { rotation: heading });
          s.projectiles.push({
            kind: 'snake',
            ...q,
            heading,
            origin: { x: p.x, y: p.y },
            release,
            volley,
            pillar: i,
          });
        }
    }
  }
  if (id === 'poison_bolt') {
    pose = t < 0.7 ? 'poison_cast' : 'idle';
    const origin = { x: b.x, y: b.y - 24 },
      target = { x: hero.x, y: hero.y - 24 },
      heading = angle(origin, target),
      age = t - 0.65;
    if (age >= 0 && age < 2) {
      const q = {
        x: origin.x + Math.cos(heading) * age * 360,
        y: origin.y + Math.sin(heading) * age * 360,
      };
      fx('poison_bolt', 'loop', q, age, { rotation: heading });
      s.projectiles.push({ kind: 'poison', ...q, heading, release: 0.65 });
    }
  }
  if (id === 'stomp') {
    const original = oldScene('stomp', t, { ...opts, revision: 'candidate' });
    s.layers = original.layers;
    s.bossPosition = original.bossPosition;
    bodyClip = '';
    s.effectRadius = 405 * 0.9;
    for (const l of s.layers)
      if (l.kind !== 'actor') {
        l.x = b.x + (l.x - b.x) * 0.9;
        l.y = b.y + (l.y - b.y) * 0.9;
        l.sx = (l.sx ?? 1) * 0.9;
        l.sy = (l.sy ?? l.sx / 0.9) * 0.9;
      }
  }
  if (id === 'small_finger') {
    const sample = (release) =>
      opts.shotAims?.find((p) => Math.abs(p.release - release) < 0.001)
        ?.target ?? (opts.autoTarget === false ? hero : movingTarget(release));
    const plan = burstPlan(seed, opts.burst ?? 'random', sample);
    s.burst = plan;
    pose = t < 0.55 + plan.length * 0.16 ? 'rapid_fingers' : 'idle';
    for (const shot of plan) {
      const age = t - shot.release;
      if (age < 0 || age > 1.4) continue;
      const q = {
        x: shot.origin.x + Math.cos(shot.heading) * 900 * age,
        y: shot.origin.y + Math.sin(shot.heading) * 900 * age,
      };
      fx(
        old ? 'nd_feedback01' : 'gold_bolt',
        old ? 'rapid_projectile' : 'loop',
        q,
        age,
        { rotation: shot.heading, ...(old ? { sx: 0.55, sy: 0.3 } : {}) },
      );
      s.projectiles.push({ kind: 'gold', ...q, ...shot });
    }
  }
  if (id === 'barrage') {
    pose = t < 1 ? 'finger_charge' : 'rapid_fingers';
    const elapsed = t - 1,
      period = 12.8 / (old ? 1 : 1.5),
      interval = 0.8 / (old ? 1 : 1.5),
      heading = (Math.max(0, elapsed) * Math.PI * 2) / period;
    s.rotationSpeed = ((old ? 1 : 1.5) * Math.PI * 2) / 12.8;
    const n = Math.floor(elapsed / interval);
    for (let volley = Math.max(0, n); volley <= Math.min(15, n + 1); volley++)
      for (let j = 0; j < 4; j++) {
        const active = 1 + volley * interval,
          age = t - active,
          a = (volley * interval * Math.PI * 2) / period + (j * Math.PI) / 2;
        if (age >= -0.32 && age < 0.267)
          s.projectiles.push({
            kind: age < 0 ? 'warning' : 'beam',
            x: b.x,
            y: b.y - 24,
            heading: a,
            length: 2000,
            age: Math.max(0, age),
            release: active,
          });
      }
    s.rotation = heading;
  }
  if (id === 'spotlight') {
    pose = t < 0.4 ? 'palm_attack' : 'idle';
    if (t >= 0.4 && t < 2.7) {
      fx('spotlight', 'loop', hero, t - 0.4, {
        alpha: 0.7,
        depth: hero.y - 0.1,
      });
      s.spotlightTarget = { ...hero, id: 'P1' };
    }
  }
  if (id === 'sky') {
    const start = { x: 970, y: 720 },
      p = clamp(t / 0.3);
    Object.assign(b, lerp(start, center, p));
    pose = t < 0.3 ? 'walk' : t < 1.5 ? 'ultimate_charge' : 'ultimate_release';
    s.sky = skyPlan(seed);
    for (const [i, q] of s.sky.entries()) {
      const age = t - q.release;
      if (age < -0.3 || age > 0.4) continue;
      if (age < 0)
        fx('nam_de_ring', 'pulse', q, 0, {
          sx: 0.14,
          sy: 0.14,
          alpha: 0.65,
          depth: 10,
          id: 'sky-warning:' + i,
        });
      else
        fx('nd_rework', 'sky_ray', q, age, {
          sx: 0.43,
          sy: 1.65,
          origin: [0.5, 0.94],
          id: 'sky-fall:' + i,
        });
    }
  }
  if (id === 'clones') {
    const base = oldScene('clones', t, { ...opts, revision: 'candidate' });
    s.layers = base.layers;
    s.bossPosition = base.bossPosition;
    bodyClip = '';
    s.dialogue = null;
    s.shouts = [];
    shout(skillNames[id], 0.05, s.bossPosition);
  }
  if (id === 'vortex') {
    const active =
      t >= tuning.vortex.windup &&
      t < tuning.vortex.windup + tuning.vortex.active;
    pose = active ? 'staff_spin' : t < 0.85 ? 'ultimate_charge' : 'idle';
    s.pull = null;
    s.shiftLocked = false;
    s.spinPositions = spinPositions(
      seed,
      Math.min(tuning.vortex.active, Math.max(0, t - tuning.vortex.windup)),
    );
    Object.assign(b, s.spinPositions[0]);
    bodyClock = Math.max(0, t - tuning.vortex.windup);
    for (const [i, q] of s.spinPositions.slice(1).entries()) {
      if (t < 0.3 || t > 5) continue;
      if (t < 0.85)
        fx('bc_fx', 'clone_smoke', q, t - 0.3, {
          alpha: 0.7,
          sx: 0.7,
          sy: 0.7,
        });
      body(q, active ? 'staff_spin' : 'idle', Math.max(0, t - 0.85), {
        id: 'spinning-clone:' + i,
        alpha: clamp((t - 0.3) / 0.2) * clamp((5 - t) / 0.3),
        loop: active,
      });
      if (active) {
        fx('bc_staff', 'staff_whirlwind', q, t - 0.85, {
          sx: 1,
          sy: 0.65,
          depth: q.y + 0.2,
          loop: true,
        });
        s.damageZones.push({ ...q, radius: 72, owner: 'clone:' + i });
      }
    }
    if (active) {
      fx('bc_staff', 'staff_whirlwind', b, t - 0.85, {
        sx: 1,
        sy: 0.65,
        loop: true,
      });
      s.damageZones.push({ ...b, radius: 72, owner: 'boss' });
    }
  }
  if (id === 'dialogue') {
    s.dialogue = 'Ai còn nhớ lời lão phu?';
  }
  if (id === 'cleanup') {
    s.layers = [];
    bodyClip = '';
    s.corpseVisible = t < 1.4;
    s.bacEntered = t >= 1.55;
    if (s.corpseVisible)
      fx('nd_boss', 'death_down', center, Math.min(t, 0.5), {
        kind: 'actor',
        alpha: 1 - clamp((t - 0.7) / 0.7),
        depth: center.y,
      });
    if (s.bacEntered) {
      const p = lerp({ x: 1110, y: 410 }, center, (t - 1.55) / 1.1);
      Object.assign(b, p);
      body(p, t < 2.65 ? 'walk' : 'idle', t - 1.55);
    }
    s.bossVisible = s.bacEntered;
  }
  if (id.startsWith('shout_')) {
    if (mode.boss === 'ly') pose = t < 1.25 ? 'needle_cast' : 'idle';
    if (mode.boss === 'hong') {
      bodyAsset =
        t < 1.3 ? 'dungeon_hong_boss_casts' : 'dungeon_hong_boss_locomotion';
      bodyClip = (t < 1.3 ? 'stomp_' : 'idle_') + dir;
    }
    if (mode.boss === 'chu') {
      bodyAsset = t < 1.3 ? 'dungeon_chu_boss' : 'dungeon_chu_base';
      bodyClip = t < 1.3 ? 'spin' : 'idle_' + dir;
    }
    if (mode.boss === 'kim') {
      bodyAsset =
        t < 1.3 ? 'dungeon_kim_luan_actions' : 'dungeon_kim_luan_base';
      bodyClip = t < 1.3 ? 'invoke' : 'idle_' + dir;
    }
  }
  if (bodyClip !== '' && s.bossVisible) {
    fx(bodyAsset, bodyClip ?? pose + '_' + dir, b, bodyClock, {
      kind: 'actor',
      id: 'boss',
      depth: b.y,
      loop: id === 'vortex' && pose === 'staff_spin',
    });
  }
  for (const q of s.shouts) {
    q.x = s.bossPosition.x;
    q.y = s.bossPosition.y - 85 - 10 * clamp(q.age / 0.35);
  }
  return s;
}
export function advancePlayer(p, keys, dt, s, previous) {
  if (
    ['small_finger', 'spotlight'].includes(s.id) &&
    s.autoTarget !== false &&
    keys.size === 0
  )
    return movingTarget(s.t);
  if (
    s.id === 'mai_pull' &&
    s.t >= tuning.mai.pullStart &&
    previous < tuning.mai.pullEnd
  ) {
    const q = oldAdvance(p, keys, dt, { ...s, pull: null }, previous),
      dist = Math.hypot(q.x - center.x, q.y - center.y);
    const fraction = clamp(
      dt /
        Math.max(
          dt,
          tuning.mai.pullEnd - Math.max(previous, tuning.mai.pullStart),
        ),
    );
    const amount = Math.max(0, dist - 58) * fraction,
      heading = angle(q, center);
    return confine({
      ...q,
      x: q.x + Math.cos(heading) * amount,
      y: q.y + Math.sin(heading) * amount,
    });
  }
  return oldAdvance(p, keys, dt, s, previous);
}
