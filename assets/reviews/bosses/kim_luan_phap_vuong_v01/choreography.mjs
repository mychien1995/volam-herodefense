// Art-review trajectories only. These functions never resolve gameplay hits.
export const T = {
  bounds: { left: 150, right: 1130, top: 260, bottom: 645 },
  fissureDelay: 0.5,
  wardPeriod: 4,
  ringLifetime: 20,
  ringSpeed: 260,
  orbitRadius: 145,
  orbitTime: 3,
  orbitAngularSpeed: 6,
  orbitReleaseSpeed: 680,
  orbitCycle: 6,
  cageBreakHits: 3,
  normalSpeed: 100,
  enrageMultiplier: 1.6,
  dat: { speed: 38, cycle: 3.2, planted: 0.7 },
  triple: {
    cycle: 3.6,
    delay: 0.6,
    gap: 0.5,
    rays: 4,
    speed: 440,
    lifetime: 2,
    halfWidth: 48,
  },
  gust: {
    cycle: 3.6,
    delay: 0.5,
    count: 5,
    step: (Math.PI * 2) / 9,
    speed: 280,
    lifetime: 3.7,
  },
  nails: {
    cycle: 3.2,
    delay: 0.5,
    countPerFan: 5,
    step: Math.PI / 5,
    speed: 620,
    lifetime: 2.2,
  },
  stomp: {
    cycle: 3.2,
    delay: 0.45,
    count: 3,
    gap: 0.28,
    speed: 900,
    maxRadius: 280,
    fade: 0.25,
    artRadius: 61,
    artOrigin: [124 / 256, 159 / 256],
  },
  enrageFire: {
    interval: 1.8,
    delay: 0.55,
    speed: 430,
    lifetime: 2,
    rays: 5,
    step: 0.34,
  },
  elephants: {
    seed: 337,
    rocks: 5,
    speed: 480,
    top: 160,
    bottom: 750,
    halfWidth: 31,
    rockHalfWidth: 51,
    shelterDepth: 135,
    normal: {
      lanes: 12,
      rows: 3,
      rowGap: 0.45,
      volleyGap: 3.8,
      volleys: 3,
      warning: 1.6,
      rest: 0.9,
    },
    enrage: {
      lanes: 14,
      rows: 4,
      rowGap: 0.32,
      volleyGap: 3.3,
      volleys: 3,
      warning: 1.4,
      rest: 0.7,
    },
  },
};
const TAU = Math.PI * 2;
export function hoacPosition(time) {
  return {
    x: 535 + Math.sin(time * 1.7) * 110,
    y: 350 + Math.sin(time * 2.1) * 38,
  };
}
export function datMotion(
  time,
  anchor = { x: 640, y: 410 },
  cycle = T.dat.cycle,
) {
  const phase = time % cycle;
  const walkingTime =
    Math.floor(time / cycle) * (cycle - T.dat.planted) +
    Math.max(0, phase - T.dat.planted);
  const points = [
    [0, 0],
    [100, 0],
    [100, 60],
    [-60, 60],
    [-60, -60],
    [0, -60],
    [0, 0],
  ];
  let distance = (walkingTime * T.dat.speed) % 560;
  for (let i = 0; i < points.length - 1; i++) {
    const [x, y] = points[i],
      [nx, ny] = points[i + 1],
      length = Math.hypot(nx - x, ny - y);
    if (distance <= length)
      return {
        x: anchor.x + x + ((nx - x) * distance) / length,
        y: anchor.y + y + ((ny - y) * distance) / length,
        direction: nx > x ? 'right' : nx < x ? 'left' : ny > y ? 'down' : 'up',
        walking: phase > T.dat.planted,
        speed: T.dat.speed,
      };
    distance -= length;
  }
}
function recentCycles(time, cycle, visit) {
  for (
    let index = Math.max(0, Math.floor(time / cycle) - 1);
    index <= Math.floor(time / cycle);
    index++
  )
    visit(index, index * cycle);
}
export function tripleShots(time) {
  const c = T.triple,
    shots = [];
  recentCycles(time, c.cycle, (cycle, start) => {
    for (let strike = 0; strike < 3; strike++) {
      const release = start + c.delay + strike * c.gap,
        age = time - release;
      if (age < 0 || age >= c.lifetime) continue;
      const origin = hoacPosition(release);
      for (let ray = 0; ray < c.rays; ray++)
        shots.push({
          id: `fan-${cycle}-${strike}-${ray}`,
          origin,
          angle:
            (ray * TAU) / c.rays +
            (strike * Math.PI) / 18 +
            (cycle * Math.PI) / 6,
          distance: age * c.speed,
          age,
          speed: c.speed,
          strike,
          halfWidth: c.halfWidth,
        });
    }
  });
  return shots;
}
export function enragePosition(time) {
  return {
    x: 640 + Math.sin(time * 1.9) * 200,
    y: 410 + Math.sin(time * 1.3) * 60,
  };
}
export function enrageShots(
  time,
  targetForRelease = () => ({ x: 640, y: 555 }),
) {
  const c = T.enrageFire,
    shots = [];
  recentCycles(time, c.interval, (cycle, start) => {
    const release = start + c.delay,
      age = time - release;
    if (age < 0 || age >= c.lifetime) return;
    const origin = enragePosition(release),
      target = targetForRelease(cycle),
      heading = Math.atan2(target.y - origin.y, target.x - origin.x);
    for (let ray = 0; ray < c.rays; ray++)
      shots.push({
        id: `enrage-wheel-${cycle}-${ray}`,
        origin,
        angle: heading + (ray - (c.rays - 1) / 2) * c.step,
        distance: age * c.speed,
        age,
        cycle,
        release,
      });
  });
  return shots;
}
export function fanShots(time, kind) {
  const c = kind === 'gust' ? T.gust : T.nails,
    shots = [];
  recentCycles(time, c.cycle, (cycle, start) => {
    const release = start + c.delay,
      age = time - release;
    if (age < 0 || age >= c.lifetime) return;
    const origin = hoacPosition(release),
      count = c.count ?? c.countPerFan;
    for (let side = 0; side < (kind === 'gust' ? 1 : 2); side++)
      for (let ray = 0; ray < count; ray++)
        shots.push({
          id: `${kind}-${cycle}-${side}-${ray}`,
          origin,
          angle:
            Math.PI / 2 + side * Math.PI + (ray - (count - 1) / 2) * c.step,
          distance: age * c.speed,
          speed: c.speed,
          age,
          side,
        });
  });
  return shots;
}
export function stompWaves(time) {
  const c = T.stomp,
    waves = [];
  recentCycles(time, c.cycle, (cycle, start) => {
    for (let i = 0; i < c.count; i++) {
      const age = time - start - c.delay - i * c.gap;
      if (age < 0 || age > c.maxRadius / c.speed + c.fade) continue;
      waves.push({
        id: `stomp-${cycle}-${i}`,
        age,
        radius: Math.min(c.maxRadius, age * c.speed),
        alpha: Math.min(1, (c.maxRadius / c.speed + c.fade - age) / c.fade),
      });
    }
  });
  return waves;
}
function random(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
export function elephantPlan(time, enraged = false) {
  const c = T.elephants,
    p = enraged ? c.enrage : c.normal,
    travel = (c.bottom - c.top) / c.speed;
  const duration =
    p.warning +
    (p.volleys - 1) * p.volleyGap +
    (p.rows - 1) * p.rowGap +
    travel +
    p.rest;
  const cast = Math.floor(time / duration),
    local = time - cast * duration,
    rand = random(c.seed + cast * 7919 + (enraged ? 419 : 0));
  const rocks = Array.from({ length: c.rocks }, (_, i) => ({
    x: 240 + i * 195 + (rand() - 0.5) * 75,
    y: 320 + rand() * 225,
  }));
  const lanes = Array.from(
    { length: p.lanes },
    (_, i) => 160 + (i * 960) / (p.lanes - 1) + (rand() - 0.5) * 14,
  );
  const elephants = [],
    warnings = [];
  let direction = (cast * p.volleys) % 2 === 0 ? 'down' : 'up';
  for (let volley = 0; volley < p.volleys; volley++) {
    const release = p.warning + volley * p.volleyGap,
      dir = (cast * p.volleys + volley) % 2 === 0 ? 'down' : 'up';
    if (local >= release - 0.8) direction = dir;
    if (local >= release - 0.8 && local < release)
      warnings.push({ direction: dir, remaining: release - local });
    for (let row = 0; row < p.rows; row++) {
      const age = local - release - row * p.rowGap;
      if (age < 0 || age > travel) continue;
      for (let lane = 0; lane < lanes.length; lane++) {
        const x = lanes[lane],
          y = dir === 'down' ? c.top + age * c.speed : c.bottom - age * c.speed;
        const blockers = rocks.filter(
          (r) => Math.abs(r.x - x) < c.rockHalfWidth,
        );
        const rock = blockers.sort((a, b) =>
          dir === 'down' ? a.y - b.y : b.y - a.y,
        )[0];
        const blocked =
          !!rock && (dir === 'down' ? y >= rock.y - 26 : y <= rock.y + 26);
        elephants.push({
          id: `elephant-${cast}-${volley}-${row}-${lane}`,
          x,
          y,
          age,
          direction: dir,
          blocked,
          rock: rock || null,
        });
      }
    }
  }
  return {
    cast,
    local,
    duration,
    rocks,
    lanes,
    elephants,
    warnings,
    direction,
    laneCount: p.lanes,
    rows: p.rows,
    speed: c.speed,
  };
}
export function shelterFor(point, plan) {
  // Cover reverses when the next warned volley reverses. Never a permanent safe side.
  return (
    plan.rocks.find(
      (r) =>
        Math.abs(point.x - r.x) < T.elephants.rockHalfWidth &&
        (plan.direction === 'down'
          ? point.y > r.y && point.y < r.y + T.elephants.shelterDepth
          : point.y < r.y && point.y > r.y - T.elephants.shelterDepth),
    ) || null
  );
}
