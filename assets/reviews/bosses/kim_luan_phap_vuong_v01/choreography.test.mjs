import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  T,
  tripleShots,
  enrageShots,
  enragePosition,
  fanShots,
  datMotion,
  stompWaves,
  elephantPlan,
  shelterFor,
} from './choreography.mjs';

const corners = [
  { x: 166, y: 280 },
  { x: 1114, y: 280 },
  { x: 166, y: 625 },
  { x: 1114, y: 625 },
];
test('reduced fan sequence leaves a wide safe lane while retaining multiple directions', () => {
  const safe = { x: 950, y: 560 };
  let closest = Infinity,
    maxActive = 0;
  const strikes = new Set();
  for (let time = 0; time < 3.6; time += 0.01) {
    const shots = tripleShots(time);
    maxActive = Math.max(maxActive, shots.length);
    for (const p of shots) {
      strikes.add(p.strike);
      const x = p.origin.x + Math.cos(p.angle) * p.distance,
        y = p.origin.y + Math.sin(p.angle) * p.distance;
      closest = Math.min(closest, Math.hypot(safe.x - x, safe.y - y));
    }
  }
  assert.ok(closest > T.triple.halfWidth + 20, closest);
  assert.ok(maxActive <= 12);
  assert.equal(strikes.size, 3);
  assert.ok(T.triple.gap >= 0.5);
  assert.equal(T.triple.rays, 4);
  assert.notEqual(tripleShots(0.8)[0].angle, tripleShots(4.4)[0].angle);
});
test('five wide gusts still leave angular lanes for sidestepping', () => {
  const shots = fanShots(1, 'gust');
  assert.equal(shots.length, 5);
  assert.ok(
    Math.max(...shots.map((p) => p.angle)) -
      Math.min(...shots.map((p) => p.angle)) >
      2.7,
  );
  assert.ok(shots.slice(1).every((p, i) => p.angle - shots[i].angle > 0.65));
});
test('rear nails cross a rear ranged-player marker quickly without retargeting', () => {
  const first = fanShots(0.8, 'nails'),
    later = fanShots(1.2, 'nails');
  assert.equal(first.length, 10);
  assert.equal(first.filter((p) => p.side === 1).length, 5);
  const a = first.find((p) => p.side === 1 && p.id.endsWith('-2')),
    b = later.find((p) => p.id === a.id);
  assert.ok(Math.sin(a.angle) < -0.99);
  assert.ok(Math.abs(b.distance - a.distance - 248) < 1e-8);
  assert.deepEqual(a.origin, b.origin);
  assert.equal(a.angle, b.angle);
});
test('Dat plants feet for casting then moves at capped slow speed in every facing', () => {
  assert.deepEqual(datMotion(0), datMotion(0.6));
  const facings = new Set();
  let previous = datMotion(0);
  for (let t = 0.01; t < 25; t += 0.01) {
    const next = datMotion(t);
    assert.ok(Math.hypot(next.x - previous.x, next.y - previous.y) <= 0.381);
    if (next.walking) facings.add(next.direction);
    previous = next;
  }
  assert.equal(facings.size, 4);
});
test('reduced stomp leaves all positions more than 280px from the boss outside its reach', () => {
  for (let t = 0; t < 7; t += 0.02)
    for (const wave of stompWaves(t)) assert.ok(wave.radius <= 280);
  assert.equal(stompWaves(0.44).length, 0);
  assert.equal(T.stomp.maxRadius, 280);
  assert.ok(stompWaves(0.96).some((w) => w.radius > 200));
});
test('enrage fires five straight wheels repeatedly from a moving origin without retargeting', () => {
  const cache = {};
  let target = { x: 900, y: 580 };
  const capture = (cycle) => (cache[cycle] ??= { ...target });
  const first = enrageShots(0.8, capture);
  assert.equal(first.length, 5);
  target = { x: 200, y: 300 };
  const later = enrageShots(1.1, capture);
  assert.deepEqual(
    later.map((p) => p.angle),
    first.map((p) => p.angle),
  );
  assert.deepEqual(later[0].origin, first[0].origin);
  assert.ok(
    Math.hypot(
      enragePosition(0.8).x - first[0].origin.x,
      enragePosition(0.8).y - first[0].origin.y,
    ) > 20,
  );
  const next = enrageShots(2.5, capture).filter((p) => p.cycle === 1);
  assert.equal(next.length, 5);
  assert.notDeepEqual(next[0].origin, first[0].origin);
  assert.notEqual(next[2].angle, first[2].angle);
});
test('dense herds traverse both directions, threaten all corners and preserve a turn warning', () => {
  for (const rage of [false, true]) {
    const found = corners.map(() => false),
      directions = new Set();
    const initial = elephantPlan(0, rage),
      settings = rage ? T.elephants.enrage : T.elephants.normal;
    for (let t = 0; t < initial.duration; t += 0.02)
      for (const e of elephantPlan(t, rage).elephants) {
        directions.add(e.direction);
        if (e.blocked) continue;
        corners.forEach((p, i) => {
          if (Math.abs(e.x - p.x) < 31 && Math.abs(e.y - p.y) < 35)
            found[i] = true;
        });
      }
    assert.ok(found.every(Boolean), JSON.stringify({ rage, found }));
    assert.equal(directions.size, 2);
    assert.ok(
      settings.volleyGap -
        (settings.rows - 1) * settings.rowGap -
        (T.elephants.bottom - T.elephants.top) / T.elephants.speed >
        0.8,
    );
  }
});
test('rock layouts repeat per seed, vary per cast and shelter the correct side only', () => {
  const down = elephantPlan(2),
    up = elephantPlan(5.6),
    rock = down.rocks[2];
  assert.deepEqual(down.rocks, up.rocks);
  assert.notDeepEqual(down.rocks, elephantPlan(down.duration + 2).rocks);
  assert.deepEqual(down.rocks, elephantPlan(2).rocks);
  assert.ok(shelterFor({ x: rock.x, y: rock.y + 75 }, down));
  assert.equal(shelterFor({ x: rock.x, y: rock.y + 75 }, up), null);
  assert.ok(shelterFor({ x: rock.x, y: rock.y - 75 }, up));
});
