import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Raw-browser ESM deliberately stays outside game-core and the production bundle.
const modulePath = '../assets/reviews/wave_boss_feedback_v01/model.mjs';
const {
  sceneAt,
  dashPlan,
  samplePath,
  modes,
  shiftLocked,
  advancePlayer,
  center,
  tuning,
  confine,
} = await import(modulePath);
const data = JSON.parse(
  readFileSync('assets/reviews/wave_boss_feedback_v01/data.json', 'utf8'),
);

describe('wave-boss visual feedback contract (no authoritative gameplay)', () => {
  it('resolves every referenced atlas/clip through all directions, revisions and phases', () => {
    for (const revision of ['candidate', 'original'])
      for (const facing of ['right', 'down', 'left', 'up'])
        for (const mode of modes) {
          for (let t = 0; t < mode.duration; t += 0.07) {
            const s = sceneAt(mode.id, t, { revision, facing, players: 6 });
            for (const layer of s.layers)
              expect(
                data.bundles[layer.asset]?.clips[layer.clip],
                `${mode.id} ${facing} ${t}: ${layer.asset}:${layer.clip}`,
              ).toBeDefined();
          }
        }
  });
  it('changes only Lạc Anh normal to polygon travel and keeps active four-way slash stationary', () => {
    for (const shape of ['triangle', 'square', 'diamond', 'z'])
      for (const dir of ['right', 'down', 'left', 'up']) {
        const plan = dashPlan(42, shape, dir);
        for (const p of plan.points)
          expect(
            Math.hypot(
              (p.x - center.x) / (tuning.field.rx - 8),
              (p.y - center.y) / (tuning.field.ry - 8),
            ),
          ).toBeLessThanOrEqual(1.000001);
        expect(samplePath(plan, 0.7).moving).toBe(true);
        expect(
          sceneAt('lac_anh', 0.7, { shape, facing: dir }).bossPosition,
        ).not.toEqual(center);
      }
    expect(sceneAt('four_slash', 0.8).bossPosition).toEqual(center);
    expect(
      sceneAt('four_slash', 0.8).layers.filter(
        (l: any) => l.asset === 'dt_fan',
      ),
    ).toHaveLength(4);
  });
  it('renders exactly two opposing frontal claws and preserves the forward region in four facings', () => {
    for (const dir of ['right', 'down', 'left', 'up']) {
      const s = sceneAt('mai_claws', 0.7, { facing: dir });
      const claws = s.layers.filter((l: any) => l.asset === 'dt_maifx');
      expect(claws).toHaveLength(2);
      expect(Math.abs(claws[0].rotation - claws[1].rotation)).toBeCloseTo(
        Math.PI,
      );
      const v: [number, number] =
        dir === 'right'
          ? [1, 0]
          : dir === 'left'
            ? [-1, 0]
            : dir === 'down'
              ? [0, 1]
              : [0, -1];
      for (const l of claws)
        expect(
          (l.x - center.x) * v[0] + (l.y + 20 - center.y) * v[1],
        ).toBeGreaterThan(0);
    }
  });
  it('Mai ends pull directly into straight released claws and bounds Shift lock to pull', () => {
    expect(shiftLocked('mai_pull', 2)).toBe(true);
    expect(shiftLocked('mai_pull', 2.1)).toBe(false);
    expect(
      sceneAt('mai_pull', 2.1).projectiles.filter((p: any) => p.kind === 'mai'),
    ).toHaveLength(1);
    expect(
      sceneAt('mai_pull', 2.35).projectiles.filter(
        (p: any) => p.kind === 'mai',
      ),
    ).toHaveLength(3);
  });
  it('slows needles exactly 20%, preserves range and halves only the large finger charge', () => {
    expect(sceneAt('needles', 1.1).needleSpeed).toBe(360 * 0.8);
    expect(sceneAt('beam', 0.6).releaseAt).toBe(1.5 * 0.5);
    expect(sceneAt('beam', 0.76).projectiles[0].kind).toBe('beam');
    expect(sceneAt('beam', 0.7).projectiles[0].kind).toBe('warning');
    expect(sceneAt('needles', 3.8).projectiles).toHaveLength(0);
  });
  it('supports both immediate post-dash follow-ups without adding a small-ray charge', () => {
    expect(
      sceneAt('nam_dash', 0.61, { branch: 'small' }).projectiles.some(
        (p: any) => p.kind === 'small',
      ),
    ).toBe(true);
    expect(
      sceneAt('nam_dash', 0.75, { branch: 'aura' }).layers.some(
        (l: any) => l.asset === 'nam_de_ring',
      ),
    ).toBe(true);
    expect(
      sceneAt('palm', 0.7).layers.some((l: any) => l.clip === 'palm_trail'),
    ).toBe(true);
  });
  it('uses the fixed arena center for clones and detached dragon release with faster flight', () => {
    expect(sceneAt('clones', 2).cloneCenter).toEqual(center);
    expect(sceneAt('clones', 12.5).swaps).toBe(5);
    const s = sceneAt('spiral', 1);
    expect(s.dragonOrigin).toEqual(center);
    expect(s.bossPosition).toEqual(center);
    expect(s.flightDuration).toBeCloseTo(5.6 / 1.3);
    expect(s.dragon).toBeDefined();
    expect(
      sceneAt('dogs', 1).layers.filter((l: any) => l.kind === 'dog'),
    ).toHaveLength(4);
  });
  it('quick-pulls over time, allows walking against sustained pull and keeps confinement', () => {
    let p = { x: 1060, y: 616, dir: 'right' },
      time = 0;
    for (; time < 0.7; time += 1 / 60)
      p = advancePlayer(
        p,
        new Set(),
        1 / 60,
        sceneAt('vortex', time + 1 / 60, { player: p }),
        time,
      );
    expect(Math.hypot(p.x - center.x, p.y - center.y)).toBeLessThan(70);
    expect(Math.hypot(p.x - center.x, p.y - center.y)).toBeGreaterThan(0);
    const before = p.x;
    for (; time < 2; time += 1 / 60)
      p = advancePlayer(
        p,
        new Set(['ArrowRight']),
        1 / 60,
        sceneAt('vortex', time + 1 / 60, { player: p }),
        time,
      );
    expect(p.x).toBeGreaterThan(before + 50);
    expect(shiftLocked('vortex', 3.89)).toBe(true);
    expect(shiftLocked('vortex', 3.9)).toBe(false);
    const edge = confine({ x: 9999, y: 9999 });
    expect(
      Math.hypot(
        (edge.x - center.x) / (tuning.field.rx - 8),
        (edge.y - center.y) / (tuning.field.ry - 8),
      ),
    ).toBeCloseTo(1);
  });
  it('shows the common entry/statue/retry contract for all four wave bosses', () => {
    for (const boss of ['dong', 'tay', 'nam', 'bac']) {
      expect(sceneAt('entry', 1, { boss }).statueVisible).toBe(true);
      expect(sceneAt('entry', 2.3, { boss }).locked).toBe(true);
      expect(sceneAt('entry', 2.3, { boss }).statueVisible).toBe(false);
      expect(sceneAt('retry', 2.1, { boss }).bossHp).toBe(100);
    }
  });
});
