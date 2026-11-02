/* Cosmetic demo geometry only. This module has no gameplay authority. */
export const DEMO = {
  field: { x: 640, y: 376, radiusX: 324, radiusY: 294, rim: 24, feet: 8 },
  entry: { fromX: 1300, arriveAt: 3, gatherFlash: 0.45 },
  thrust: {
    range: 380,
    angle: Math.PI,
    count: 13,
    spacing: 0.08,
    start: 0.35,
    life: 0.3,
  },
  referenceBasics: { cai_bang_chuong: 320, thien_son_phien: 220 },
  pebbles: {
    minDirections: 8,
    maxDirections: 14,
    release: 0.55,
    speed: 680,
    life: 0.95,
  },
  fourSlash: { start: 0.55, travel: 0.5, life: 0.7, range: 280, halfWidth: 68 },
  petals: { count: 40, minSeparation: 48, delay: 2.8 },
  mai: {
    chaseSpeed: 135,
    attackRange: 62,
    attackInterval: 1.15,
    clawRange: 112,
    clawHalfWidth: 56,
    clawOffset: 58,
  },
};

export function random(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function fieldDistance(p, padding = DEMO.field.feet) {
  const f = DEMO.field;
  return Math.hypot(
    (p.x - f.x) / (f.radiusX - padding),
    (p.y - f.y) / (f.radiusY - padding),
  );
}

export function constrain(p, padding = DEMO.field.feet) {
  const n = fieldDistance(p, padding);
  if (n <= 1) return { ...p };
  const f = DEMO.field;
  return { x: f.x + (p.x - f.x) / n, y: f.y + (p.y - f.y) / n };
}

export function formation(index) {
  const angles = [0.06, 0.95, 2.15, 3.2, 4.25, 5.2];
  const a = angles[index],
    radius = index === 0 ? 235 : 185;
  return {
    x: DEMO.field.x + Math.cos(a) * radius,
    y: DEMO.field.y + Math.sin(a) * radius * 0.9,
  };
}

export function radialPlan(seed) {
  const next = random(seed ^ 0x9e3779b9),
    s = DEMO.pebbles;
  const count =
    s.minDirections +
    Math.floor(next() * (s.maxDirections - s.minDirections + 1));
  const phase = next() * Math.PI * 2;
  return {
    count,
    angles: Array.from(
      { length: count },
      (_, i) => phase + (i * Math.PI * 2) / count,
    ),
  };
}

export function petalPlan(seed) {
  const next = random(seed ^ 0x7f4a7c15),
    f = DEMO.field,
    points = [];
  for (
    let attempt = 0;
    attempt < 10000 && points.length < DEMO.petals.count;
    attempt++
  ) {
    const a = next() * Math.PI * 2,
      r = Math.sqrt(next());
    const p = {
      x: f.x + Math.cos(a) * r * (f.radiusX - 36),
      y: f.y + Math.sin(a) * r * (f.radiusY - 36),
    };
    if (
      points.some(
        (q) => Math.hypot(q.x - p.x, q.y - p.y) < DEMO.petals.minSeparation,
      )
    )
      continue;
    const arrival = 0.75 + next() * 0.6;
    points.push({
      ...p,
      arrival,
      blast: arrival + DEMO.petals.delay,
      framePhase: next() * 0.4,
    });
  }
  if (points.length !== DEMO.petals.count)
    throw Error('Could not place all demo petals');
  return points;
}

export const FACING = {
  right: [1, 0],
  left: [-1, 0],
  up: [0, -1],
  down: [0, 1],
};

export function fourSlashPlan(seed, choice = 'random') {
  const kind =
    choice === 'random'
      ? random(seed ^ 0x53a9d1f3)() < 0.5
        ? 'cross'
        : 'x'
      : choice;
  if (!['cross', 'x'].includes(kind))
    throw Error('Unknown slash pattern: ' + kind);
  const offset = kind === 'x' ? Math.PI / 4 : 0;
  return {
    kind,
    angles: Array.from({ length: 4 }, (_, i) => offset + (i * Math.PI) / 2),
  };
}

export function clawFrontContains(mai, facing, target) {
  const [fx, fy] = FACING[facing],
    dx = target.x - mai.x,
    dy = target.y - mai.y;
  const forward = dx * fx + dy * fy,
    side = -dx * fy + dy * fx;
  return (
    forward >= 16 &&
    forward <= DEMO.mai.clawRange &&
    Math.abs(side) <= DEMO.mai.clawHalfWidth
  );
}

export function clawStrokes(mai, facing = 'right') {
  const [fx, fy] = FACING[facing],
    px = -fy,
    py = fx;
  const at = (forward, side) => ({
    x: mai.x + fx * forward + px * side,
    y: mai.y - 20 + fy * forward + py * side,
  });
  return [
    {
      id: 'down',
      from: at(24, -50),
      to: at(92, 50),
      start: 0,
      art: 'claw_left',
      artAngle: 0,
    },
    {
      id: 'up',
      from: at(24, 50),
      to: at(92, -50),
      start: 0.07,
      art: 'claw_right',
      artAngle: Math.PI,
    },
  ];
}
