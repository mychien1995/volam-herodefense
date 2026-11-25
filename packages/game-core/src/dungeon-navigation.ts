import { blocked, distance, segmentRect } from './geometry.js';
import type { Creep, Actor, Point, Rect, SimulationConfig } from './types.js';
const cell = 32;
const directions = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
] as const;
const grids = new Map<string, { passable: Uint8Array; links: Uint8Array }>();
/** Geometry-only cache: bounds callbacks remain per query, and mutable walls change the key. */
function navigationGrid(
  width: number,
  height: number,
  radius: number,
  walls: Rect[],
) {
  const key = [
    width,
    height,
    radius,
    ...walls.flatMap((w) => [w.x, w.y, w.width, w.height]),
  ].join(',');
  const cached = grids.get(key);
  if (cached) return cached;
  const cols = Math.ceil(width / cell),
    rows = Math.ceil(height / cell);
  const point = (n: number) => ({
    x: ((n % cols) + 0.5) * cell,
    y: (Math.floor(n / cols) + 0.5) * cell,
  });
  const passable = new Uint8Array(cols * rows),
    links = new Uint8Array(cols * rows);
  for (let n = 0; n < passable.length; n++)
    passable[n] = Number(!blocked(point(n), radius, width, height, walls));
  for (let n = 0; n < passable.length; n++)
    if (passable[n])
      directions.forEach(([dx, dy], index) => {
        const x = (n % cols) + dx,
          y = Math.floor(n / cols) + dy,
          next = y * cols + x;
        if (
          x >= 0 &&
          x < cols &&
          y >= 0 &&
          y < rows &&
          passable[next] &&
          !walls.some(
            (w) =>
              segmentRect(
                point(n),
                point(next),
                w,
                Math.max(0, radius - 1e-7),
              ) !== undefined,
          )
        )
          links[n]! |= 1 << index;
      });
  if (grids.size >= 32) grids.delete(grids.keys().next().value!);
  const result = { passable, links };
  grids.set(key, result);
  return result;
}
/** Small deterministic grid search only for dungeon creeps blocked by scenery. */
export function dungeonWaypoint(
  enemy: Creep,
  hero: Actor,
  tick: number,
  config: SimulationConfig,
): Point {
  const radius = (enemy.stats ?? config.creep).radius;
  const clear = (a: Point, b: Point) =>
    !config.collision.some((w) => segmentRect(a, b, w, radius) !== undefined);
  if (clear(enemy, hero)) {
    delete enemy.navigation;
    return hero;
  }
  const gx = Math.floor(hero.x / cell),
    gy = Math.floor(hero.y / cell);
  let nav = enemy.navigation;
  if (
    !nav ||
    nav.targetId !== hero.id ||
    nav.gx !== gx ||
    nav.gy !== gy ||
    tick >= nav.repathAt
  ) {
    const waypoints = findWalkPath(
      enemy,
      hero,
      radius,
      config,
      config.collision,
    );
    nav = {
      targetId: hero.id,
      gx,
      gy,
      repathAt: tick + config.tickRate,
      waypoints,
    };
    enemy.navigation = nav;
  }
  while (nav.waypoints.length && distance(enemy, nav.waypoints[0]!) < 5)
    nav.waypoints.shift();
  return nav.waypoints[0] ?? hero;
}

export function findWalkPath(
  from: Point,
  to: Point,
  radius: number,
  { width, height }: Pick<SimulationConfig, 'width' | 'height'>,
  walls: Rect[],
  insideBounds: (position: Point) => boolean = () => true,
): Point[] {
  // Walking collision permits tangency. Do not trap an actor starting flush
  // against a wall by treating the first endpoint as a swept collision.
  const padding = Math.max(0, radius - 1e-7);
  const clear = (a: Point, b: Point) =>
    !walls.some((w) => segmentRect(a, b, w, padding) !== undefined);
  if (!insideBounds(to) || blocked(to, radius, width, height, walls)) return [];
  if (clear(from, to)) return [{ x: to.x, y: to.y }];
  const cols = Math.ceil(width / cell),
    rows = Math.ceil(height / cell);
  const grid = navigationGrid(width, height, radius, walls);
  const point = (n: number) => ({
    x: ((n % cols) + 0.5) * cell,
    y: (Math.floor(n / cols) + 0.5) * cell,
  });
  const valid = (n: number) =>
    n >= 0 && n < cols * rows && !!grid.passable[n] && insideBounds(point(n));
  const near = (p: Point) => {
    const choices: number[] = [];
    for (
      let y = Math.max(0, Math.floor(p.y / cell) - 2);
      y <= Math.min(rows - 1, Math.floor(p.y / cell) + 2);
      y++
    )
      for (
        let x = Math.max(0, Math.floor(p.x / cell) - 2);
        x <= Math.min(cols - 1, Math.floor(p.x / cell) + 2);
        x++
      ) {
        const n = y * cols + x;
        if (valid(n) && clear(p, point(n))) choices.push(n);
      }
    return choices.sort(
      (a, b) => distance(point(a), p) - distance(point(b), p) || a - b,
    )[0];
  };
  const start = near(from),
    goal = near(to),
    waypoints: Point[] = [];
  if (start !== undefined && goal !== undefined) {
    const previous = new Int32Array(cols * rows).fill(-1),
      queue = [start];
    previous[start] = start;
    for (let head = 0; head < queue.length && previous[goal] === -1; head++) {
      const n = queue[head]!;
      for (const [index, [dx, dy]] of directions.entries()) {
        const x = (n % cols) + dx!,
          y = Math.floor(n / cols) + dy!,
          next = y * cols + x;
        if (
          x < 0 ||
          x >= cols ||
          y < 0 ||
          y >= rows ||
          previous[next] !== -1 ||
          !valid(next) ||
          !(grid.links[n]! & (1 << index))
        )
          continue;
        previous[next] = n;
        queue.push(next);
      }
    }
    if (previous[goal] !== -1) {
      for (let n = goal; n !== start; n = previous[n]!)
        waypoints.unshift(point(n));
      waypoints.unshift(point(start));
      waypoints.push({ x: to.x, y: to.y });
    }
  }
  return waypoints;
}
