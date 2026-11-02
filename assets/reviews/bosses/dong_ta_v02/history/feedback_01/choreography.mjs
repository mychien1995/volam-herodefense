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
  dash: {
    start: 0.7,
    approach: 0.18,
    segment: 0.32,
    halfWidth: 68,
    trailStep: 44,
  },
  petals: { count: 48, minSeparation: 48, delay: 2.8 },
  mai: { chaseSpeed: 135, attackRange: 62, attackInterval: 1.15 },
};

export const PATHS = {
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

export function dashPath(name, facing) {
  const a = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[
    facing
  ];
  return PATHS[name].map(([x, y]) => ({
    x: DEMO.field.x + x * Math.cos(a) - y * Math.sin(a),
    y: DEMO.field.y + x * Math.sin(a) + y * Math.cos(a),
  }));
}

export function clawStrokes(mai) {
  const center = { x: mai.x, y: mai.y - 20 };
  return [
    {
      id: 'down',
      from: { x: center.x - 48, y: center.y - 88 },
      to: { x: center.x + 48, y: center.y + 88 },
      start: 0,
      art: 'claw_left',
      artAngle: 0,
    },
    {
      id: 'up',
      from: { x: center.x - 48, y: center.y + 88 },
      to: { x: center.x + 48, y: center.y - 88 },
      start: 0.07,
      art: 'claw_right',
      artAngle: Math.PI,
    },
  ];
}
