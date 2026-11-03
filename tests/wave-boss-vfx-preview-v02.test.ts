import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const path = '../assets/reviews/wave_boss_feedback_v02/model.mjs';
const {
  sceneAt,
  modes,
  burstPlan,
  movingTarget,
  skyPlan,
  spinPositions,
  pillarPlan,
  shiftLocked,
  tuning,
  center,
  advancePlayer,
} = await import(path);
const data = JSON.parse(
  readFileSync('assets/reviews/wave_boss_feedback_v02/data.json', 'utf8'),
);
it('denser sky fall triples the rate within the same active window', () => {
  const plan = skyPlan(42);
  expect(plan).toHaveLength(96);
  expect(plan[1].release - plan[0].release).toBeCloseTo(1 / 18);
  expect(plan.at(-1).release + 1 / 18 - plan[0].release).toBeCloseTo(32 / 6);
});
it('Nam waves once and illuminates the player without any connecting beam or hand-charge VFX', () => {
  const wave = sceneAt('spotlight', 0.2);
  expect(wave.layers.find((l: any) => l.id === 'boss').clip).toBe(
    'palm_attack_right',
  );
  for (let t = 0.4; t < 2.7; t += 0.1) {
    const s = sceneAt('spotlight', t);
    expect(s.projectiles).toHaveLength(0);
    expect(s.layers.some((l: any) => l.asset === 'nd_finger')).toBe(false);
    expect(s.layers.filter((l: any) => l.asset === 'spotlight')).toHaveLength(
      1,
    );
    expect(s.layers.find((l: any) => l.id === 'boss').clip).toBe('idle_right');
  }
});
it('all nine actors spin and wander independently, including the original boss', () => {
  const ids = [
    'boss',
    ...Array.from({ length: 8 }, (_, i) => 'spinning-clone:' + i),
  ];
  const samples = Array.from({ length: 11 }, (_, i) =>
    sceneAt('vortex', 1.2 + i * 0.1),
  );
  for (const [i, id] of ids.entries()) {
    let distance = 0;
    for (let k = 0; k < samples.length; k++) {
      const s = samples[k],
        p = s.layers.find((l: any) => l.id === id);
      expect(p.clip).toBe('staff_spin_right');
      const zone = s.damageZones.find(
        (z: any) => z.owner === (i === 0 ? 'boss' : 'clone:' + (i - 1)),
      );
      expect(zone.x).toBe(p.x);
      expect(zone.y).toBe(p.y);
      if (k) {
        const previous = samples[k - 1].layers.find((l: any) => l.id === id);
        distance += Math.hypot(p.x - previous.x, p.y - previous.y);
      }
    }
    expect(distance, id + ' must move while spinning').toBeGreaterThan(80);
  }
  expect(samples[0].bossPosition).not.toEqual(center);
  const paths = ids.map((id) =>
    samples.map((s) => {
      const p = s.layers.find((l: any) => l.id === id);
      return { x: p.x, y: p.y };
    }),
  );
  for (const path of paths) {
    const radii = path.map((p) => Math.hypot(p.x - center.x, p.y - center.y));
    expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(10);
  }
});
it('random wander is seekable, seed-specific, continuous and keeps nine damage footprints inside arena', () => {
  expect(spinPositions(42, 2)).toEqual(spinPositions(42, 2));
  expect(spinPositions(42, 2)).not.toEqual(spinPositions(43, 2));
  expect(spinPositions(42, 0)[0]).toEqual(center);
  for (const seed of [1, 7, 42, 99, 371]) {
    let previous = spinPositions(seed, 0);
    expect(previous).toHaveLength(9);
    for (let elapsed = 0.025; elapsed < 3.9; elapsed += 0.025) {
      const positions = spinPositions(seed, elapsed);
      for (let i = 0; i < 9; i++) {
        const p = positions[i];
        expect(
          Math.hypot(
            (p.x - center.x) / (tuning.field.rx - 72),
            (p.y - center.y) / (tuning.field.ry - 72),
          ),
        ).toBeLessThan(1);
        expect(
          Math.hypot(p.x - previous[i].x, p.y - previous[i].y),
        ).toBeLessThanOrEqual(tuning.vortex.moveSpeed * 0.025 + 1e-6);
      }
      previous = positions;
    }
  }
});
it('resolves actual retained/new PNG clips for every mode and facing', () => {
  for (const m of modes)
    for (const facing of ['right', 'down', 'left', 'up'])
      for (let t = 0; t < m.duration; t += 0.07) {
        const s = sceneAt(m.id, t, { facing, players: 6, burst: '5' });
        for (const l of s.layers)
          expect(
            data.bundles[l.asset]?.clips[l.clip],
            `${m.id}:${l.asset}:${l.clip}`,
          ).toBeDefined();
      }
});
it('keeps approved review inputs untouched; pre-integration production baseline is historical', () => {
  const manifest = JSON.parse(
    readFileSync('assets/reviews/wave_boss_feedback_v02/manifest.json', 'utf8'),
  );
  const approval = JSON.parse(
    readFileSync('assets/approved_wave_boss_feedback_v02.lock.json', 'utf8'),
  );
  expect(approval.status).toBe('APPROVED_PREVIEW_VFX');
  expect(approval.historicalProductionBaseline).toEqual(
    manifest.productionBaseline,
  );
  const hash = (p: string) =>
    createHash('sha256').update(readFileSync(p)).digest('hex');
  for (const [p, h] of Object.entries({
    ...manifest.protected,
    ...JSON.parse(
      readFileSync('assets/approved_wave_boss_feedback_v02.lock.json', 'utf8'),
    ).files,
  }))
    expect(hash(p), p).toBe(h);
  for (const a of manifest.new) {
    expect(hash(a.source)).toBe(a.sha256);
    expect(
      hash(`assets/reviews/wave_boss_feedback_v02/exports/${a.id}.png`),
    ).toBe(a.exportSha256);
    expect(a.sharedScale).toBeLessThan(1);
    expect(a.cellSize[0]).toBeGreaterThanOrEqual(50);
  }
});
it('Mai has exactly0.8seconds after tug, five-second dash lock and no early Ma Anh', () => {
  expect(tuning.mai.release - tuning.mai.pullEnd).toBeCloseTo(0.8);
  expect(tuning.mai.lockEnd - tuning.mai.pullStart).toBe(5);
  expect(shiftLocked('mai_pull', 0.39)).toBe(false);
  expect(shiftLocked('mai_pull', 5.39)).toBe(true);
  expect(shiftLocked('mai_pull', 5.4)).toBe(false);
  expect(
    sceneAt('mai_pull', 1.34).projectiles.filter((p: any) => p.kind === 'claw'),
  ).toHaveLength(0);
  expect(
    sceneAt('mai_pull', 1.35).projectiles.filter((p: any) => p.kind === 'claw'),
  ).toHaveLength(1);
  let p = { x: 960, y: 646, dir: 'left', pose: 'idle' };
  for (let t = 0.4; t <= 0.550001; t += 0.005)
    p = advancePlayer(p, new Set(), 0.005, sceneAt('mai_pull', t), t - 0.005);
  expect(Math.hypot(p.x - center.x, p.y - center.y)).toBeCloseTo(58, 1);
  const walk = advancePlayer(
    p,
    new Set(['ArrowDown']),
    0.1,
    sceneAt('mai_pull', 0.8),
    0.7,
  );
  expect(walk.y).toBeGreaterThan(p.y + 17);
});
it('frontal claws travel further with opposite vertical sweeps without enlarged sprites', () => {
  const a = sceneAt('mai_claws', 0.63).layers.filter((l: any) =>
    l.id.startsWith('frontal-claw'),
  );
  const b = sceneAt('mai_claws', 0.88).layers.filter((l: any) =>
    l.id.startsWith('frontal-claw'),
  );
  expect(a).toHaveLength(2);
  expect(b).toHaveLength(2);
  expect(b[0].x).toBeGreaterThan(a[0].x + 70);
  expect(b[0].y).toBeGreaterThan(a[0].y);
  expect(b[1].y).toBeLessThan(a[1].y);
  expect(Math.abs(b[1].rotation - b[0].rotation)).toBeCloseTo(Math.PI);
  expect(b.every((l: any) => l.sx === 0.9)).toBe(true);
});
it('all six rim pillars emit exactly three inward directions; stomp shrinks10percent', () => {
  const pillars = pillarPlan();
  expect(pillars).toHaveLength(6);
  for (const p of pillars) {
    expect(p.shots).toHaveLength(3);
    for (const a of p.shots)
      expect(
        Math.cos(a) * (center.x - p.x) + Math.sin(a) * (center.y - p.y),
      ).toBeGreaterThan(0);
  }
  expect(sceneAt('stomp', 1.5).effectRadius).toBeCloseTo(364.5);
  expect(sceneAt('poison_bolt', 0.8).shouts).toHaveLength(0);
});
it('gold burst counts1–5 and re-aims each release, while each released shot remains straight', () => {
  const counts = new Set<number>();
  for (let seed = 0; seed < 200; seed++) counts.add(burstPlan(seed).length);
  expect([...counts].sort()).toEqual([1, 2, 3, 4, 5]);
  for (let t = 0; t < 3.6; t += 0.01) {
    const a = movingTarget(t),
      b = movingTarget(t + 0.001);
    expect(Math.hypot(b.x - a.x, b.y - a.y) / 0.001).toBeLessThanOrEqual(180);
  }
  const plan = burstPlan(42, '5');
  expect(plan).toHaveLength(5);
  expect(new Set(plan.map((p: any) => p.heading)).size).toBe(5);
  for (const p of plan) {
    expect(p.release).toBeCloseTo(0.55 + p.index * 0.16);
    expect(p.target).toBeDefined();
  }
  const one = sceneAt('small_finger', 0.7, { burst: '5' }).projectiles.find(
    (p: any) => p.index === 0,
  );
  const two = sceneAt('small_finger', 1, { burst: '5' }).projectiles.find(
    (p: any) => p.index === 0,
  );
  expect(one.heading).toBe(two.heading);
  expect(Math.hypot(two.x - one.x, two.y - one.y)).toBeCloseTo(270);
  expect(
    sceneAt('barrage', 2).rotationSpeed /
      sceneAt('barrage', 2, { revision: 'original' }).rotationSpeed,
  ).toBeCloseTo(1.5);
});
it('Nam De centers before sky fall; all96footprints remain inside arena; one spotlight target', () => {
  for (let seed = 0; seed < 30; seed++)
    for (const p of skyPlan(seed))
      expect(
        Math.hypot(
          (p.x - center.x) / (tuning.field.rx - 24),
          (p.y - center.y) / (tuning.field.ry - 24),
        ),
      ).toBeLessThan(1);
  expect(skyPlan()).toHaveLength(96);
  expect(sceneAt('sky', 0.31).bossPosition).toEqual(center);
  const entry = sceneAt('sky', 0.15);
  expect(entry.shouts[0].x).toBe(entry.bossPosition.x);
  const light = sceneAt('spotlight', 1, { players: 6 });
  expect(light.spotlightTarget.id).toBe('P1');
  expect(light.layers.filter((l: any) => l.asset === 'spotlight')).toHaveLength(
    1,
  );
});
it('vortex replaces pull/slow/slam with nine independently moving spinners', () => {
  const s = sceneAt('vortex', 2, { players: 6 });
  expect(s.pull).toBeNull();
  expect(s.shiftLocked).toBe(false);
  expect(s.bossPosition).not.toEqual(center);
  expect(s.damageZones).toHaveLength(9);
  expect(s.layers.filter((l: any) => l.kind === 'actor')).toHaveLength(9);
  expect(
    s.layers.filter((l: any) => l.clip === 'staff_whirlwind'),
  ).toHaveLength(9);
  expect(s.layers.some((l: any) => l.clip === 'ground_smash')).toBe(false);
  expect(spinPositions()).toHaveLength(9);
  expect(sceneAt('clones', 3).dialogue).toBeNull();
  expect(sceneAt('clones', 3).shouts).toHaveLength(0);
  expect(sceneAt('dialogue', 1).dialogue).toBe('Ai còn nhớ lời lão phu?');
});
it('dungeon actors share overhead skill shouts, and Nam corpse never overlaps Bac entry', () => {
  for (const id of ['shout_ly', 'shout_hong', 'shout_chu', 'shout_kim']) {
    const s = sceneAt(id, 0.4);
    expect(s.shouts).toHaveLength(1);
    expect(s.layers.some((l: any) => l.kind === 'actor')).toBe(true);
  }
  for (let t = 0; t < 5; t += 0.01) {
    const s = sceneAt('cleanup', t);
    expect(s.corpseVisible && s.bacEntered).toBe(false);
  }
});
