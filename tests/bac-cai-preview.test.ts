import { describe, expect, it } from 'vitest';
import {
  previewState,
  ids,
} from '../apps/game-client/src/bac-cai-preview-model.js';
import {
  cloneRoundMs,
  cloneShuffleEnd,
  cloneDecisionAt,
  bacCaiPreviewTiming,
} from '../apps/game-client/src/bac-cai-preview-tuning.js';

describe('Bắc Cái final-brief art choreography', () => {
  it('shows the original flying from the center while copies form at their corners', () => {
    const start = previewState('clones', 0).layers.find(
      (l) => l.id === 'clone-0',
    )!;
    const a = previewState('clones', 400).layers;
    const b = previewState('clones', 1000).layers;
    expect(start.x).toBe(640);
    expect(b.find((l) => l.id === 'clone-0')!.x).toBeGreaterThan(
      a.find((l) => l.id === 'clone-0')!.x,
    );
    for (let i = 1; i < 8; i++) {
      const before = a.find((l) => l.id === 'clone-' + i)!,
        after = b.find((l) => l.id === 'clone-' + i)!;
      expect([before.x, before.y]).toEqual([after.x, after.y]);
    }
  });
  it('splits into eight identical figures, shuffles five times and protects only that interval', () => {
    const split = previewState('clones', 1499);
    expect(
      split.layers.filter(
        (l) => l.id.startsWith('clone-') && !l.id.startsWith('clone-fx'),
      ),
    ).toHaveLength(8);
    expect(split.immune).toBe(false);
    expect(previewState('clones', 1500).immune).toBe(true);
    for (let i = 0; i < 5; i++)
      expect(previewState('clones', 1500 + i * cloneRoundMs + 1).swaps).toBe(i);
    const done = previewState('clones', cloneShuffleEnd);
    expect(done.swaps).toBe(5);
    expect(done.immune).toBe(false);
    const actors = done.layers.filter((l) => l.id.startsWith('clone-'));
    expect(actors).toHaveLength(8);
    expect(
      new Set(actors.map((l) => `${l.asset}:${l.tag}:${l.alpha ?? 1}`)).size,
    ).toBe(1);
    const good = previewState(
      'clones',
      cloneDecisionAt + 100,
      'right',
      'success',
    );
    expect(good.layers.filter((l) => /^clone-\d$/.test(l.id))).toHaveLength(1);
    const bad = previewState(
      'clones',
      cloneDecisionAt + 100,
      'right',
      'failure',
      6,
    );
    expect(bad.layers.filter((l) => l.id.startsWith('map-hit-'))).toHaveLength(
      6,
    );
  });
  it('shows exactly four living attackable dogs, hurt and death', () => {
    expect(previewState('dogs', 1000).dogHp).toEqual([100, 100, 100, 100]);
    const hurt = previewState('dogs', 3500);
    expect(hurt.dogHp.every((h) => h > 0 && h < 100)).toBe(true);
    expect(
      hurt.layers
        .filter((l) => l.asset === ids.dog)
        .every((l) => l.tag === 'hurt_right'),
    ).toBe(true);
    expect(previewState('dogs', 4500).dogHp).toEqual([0, 0, 0, 0]);
  });
  it('tethers the two players to each other and disables the cast in solo', () => {
    expect(
      previewState('tether', 2000, 'right', 'failure', 1).tetherActive,
    ).toBe(false);
    const pair = previewState('tether', 2000, 'right', 'failure', 6);
    const rope = pair.layers.find((l) => l.id === 'pair-rope')!;
    const heroes = pair.layers.filter(
      (l) => l.id === 'hero-0' || l.id === 'hero-1',
    );
    expect(rope.x).toBe((heroes[0]!.x + heroes[1]!.x) / 2);
    expect(previewState('tether', 3500, 'right', 'success').tetherActive).toBe(
      false,
    );
    expect(previewState('tether', 3500, 'right', 'failure').tetherActive).toBe(
      true,
    );
  });
  it('retains final preference, shows three options, ten-second sleep or exactly ten-percent heal', () => {
    expect(
      new Set(
        Array.from(
          { length: 6 },
          (_, i) => previewState('preferences', i * 1800 + 1).preference,
        ),
      ).size,
    ).toBe(6);
    const vote = previewState('preferences', 12000);
    expect(vote.layers.filter((l) => l.id.startsWith('choice-'))).toHaveLength(
      3,
    );
    expect(vote.preference).toBe(5);
    expect(vote.votes).toEqual([1, 4, 1]);
    expect(previewState('preferences', 14000).sleepRemaining).toBe(10000);
    expect(previewState('preferences', 23999).sleepRemaining).toBe(1);
    expect(previewState('preferences', 24000).sleepRemaining).toBe(0);
    expect(
      previewState('preferences', 16000, 'right', 'failure').bossHp -
        previewState('preferences', 13000, 'right', 'failure').bossHp,
    ).toBe(10);
  });
  it('holds pulled positions across the slam and shows attacks during the sleep window', () => {
    const before = previewState('vortex', 3499).layers.filter((l) =>
      l.id.startsWith('hero-'),
    );
    const impact = previewState('vortex', 3500).layers.filter((l) =>
      l.id.startsWith('hero-'),
    );
    expect(
      impact.every(
        (h, i) =>
          Math.abs(h.x - before[i]!.x) < 1 && Math.abs(h.y - before[i]!.y) < 1,
      ),
    ).toBe(true);
    const sleep = previewState('preferences', 16000);
    expect(
      sleep.layers
        .filter((l) => l.id.startsWith('hero-'))
        .every((l) => l.tag.startsWith('basic_attack_')),
    ).toBe(true);
    expect(
      previewState('preferences', 12000, 'right', 'success', 1).votes.reduce(
        (a, b) => a + b,
        0,
      ),
    ).toBe(1);
  });
  it('keeps an increasing spiral radius and a straight beam with a short warning', () => {
    expect(previewState('beam', 349).layers.some((l) => l.id === 'beam')).toBe(
      false,
    );
    expect(previewState('beam', 350).layers.some((l) => l.id === 'beam')).toBe(
      true,
    );
    const radii = [0, 1000, 3000, 5900].map(
      (t) => previewState('spiral', t).spiralRadius,
    );
    expect(radii.every((r, i) => i === 0 || r > radii[i - 1]!)).toBe(true);
    expect(
      previewState('field', 800).layers.find((l) => l.id === 'field')?.tag,
    ).toBe('field_impact');
  });
  it('crosses opposite corners through the center slowly, pauses and preserves eight unique slots', () => {
    expect(bacCaiPreviewTiming.clones.moveMs).toBeGreaterThanOrEqual(1000);
    const mid = previewState('clones', 2200);
    for (const id of ['clone-0', 'clone-4']) {
      const actor = mid.layers.find((l) => l.id === id)!;
      expect(actor.x).toBeCloseTo(640);
      expect(actor.y).toBeCloseTo(350);
    }
    const a = previewState('clones', 3000).layers.find(
      (l) => l.id === 'clone-0',
    )!;
    const b = previewState('clones', 3500).layers.find(
      (l) => l.id === 'clone-0',
    )!;
    expect([a.x, a.y]).toEqual([b.x, b.y]);
    for (let n = 1; n <= 5; n++) {
      const s = previewState('clones', 1500 + n * cloneRoundMs);
      const bodies = s.layers.filter((l) => /^clone-\d$/.test(l.id));
      expect(new Set(bodies.map((l) => `${l.x},${l.y}`)).size).toBe(8);
      expect(s.swaps).toBe(n);
    }
  });
  it('keeps the native-width beam at uniform scale and returns the body from the jab', () => {
    const beam = previewState('beam', 450).layers.find((l) => l.id === 'beam')!;
    expect(beam.asset).toBe(ids.beam);
    expect([beam.sx, beam.sy]).toEqual([1, 1]);
    expect(
      previewState('beam', 800).layers.find((l) => l.id === 'boss')!.tag,
    ).toBe('idle_right');
  });
  it('places the field beneath the fully opaque boss and lets the landing recover', () => {
    const state = previewState('field', 560),
      ground = state.layers.find((l) => l.id === 'field')!,
      actor = state.layers.find((l) => l.id === 'boss')!;
    expect(ground.depth).toBeLessThan(actor.depth!);
    expect(ground.alpha).toBeLessThanOrEqual(0.6);
    expect(actor.alpha ?? 1).toBe(1);
    expect(
      previewState('field', 1000).layers.find((l) => l.id === 'boss')!.tag,
    ).toBe('idle_right');
  });
  it('shows spoken preferences and another skill simultaneously, then locks combat for sleep', () => {
    const state = previewState('preferences', 450);
    expect(state.captions.some((c) => c.id === 'dialog')).toBe(true);
    expect(state.bossAction).toBe('beam');
    expect(state.layers.some((l) => l.id === 'concurrent-beam')).toBe(true);
    expect(previewState('preferences', 2450).bossAction).toBe('palms');
    expect(
      previewState('preferences', 16000).layers.some((l) =>
        l.id.startsWith('concurrent-'),
      ),
    ).toBe(false);
  });
  it('releases one independent dragon and uses another skill while its radius grows', () => {
    expect(
      previewState('spiral', 399).layers.some((l) => l.id === 'spiral-0'),
    ).toBe(false);
    const state = previewState('spiral', 1100);
    expect(state.dragonReleased).toBe(true);
    expect(state.bossAction).toBe('beam');
    expect(state.layers.some((l) => l.id === 'spiral-0')).toBe(true);
    expect(state.layers.some((l) => l.id === 'concurrent-beam')).toBe(true);
    expect(previewState('spiral', 1800).spiralRadius).toBeGreaterThan(
      state.spiralRadius,
    );
  });
});
