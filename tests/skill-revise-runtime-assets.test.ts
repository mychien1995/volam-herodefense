import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { m1Config } from '@volam/game-data';
import assets from '../apps/game-client/src/skill-revise-assets.generated.json' with { type: 'json' };
it('loads the exact tracked raster bytes and atlas frames for the runtime banks', () => {
  expect(assets).toHaveLength(26);
  for (const a of assets) {
    const path = a.png.replace('/assets/', 'assets/exports/'),
      atlas = JSON.parse(
        readFileSync(a.atlas.replace('/assets/', 'assets/exports/'), 'utf8'),
      ) as { frames: Record<string, unknown> };
    expect(
      createHash('sha256').update(readFileSync(path)).digest('hex'),
      a.id,
    ).toBe(a.sha256);
    expect(Object.keys(atlas.frames), a.id).toEqual(a.frames);
  }
});

it('uses the compact sweep model with unchanged timing, pivot and exact retained neutral', () => {
  const bank = assets.find((a) => a.id === 'hammer-sweep-v8')!;
  const manifest = JSON.parse(
    readFileSync(
      'assets/exports/skill-revise-thien-su-v08/hammer-sweep-v8/manifest.json',
      'utf8',
    ),
  ) as {
    frames: { name: string; sha256: string }[];
    clips: { name: string; durations: number[] }[];
  };
  const old = JSON.parse(
    readFileSync(
      'assets/exports/skill-revise-feedback-v04/hammer-coherent-v4/manifest.json',
      'utf8',
    ),
  ) as { frames: { name: string; sha256: string }[] };
  const hashes = new Map(manifest.frames.map((f) => [f.name, f.sha256]));
  expect(bank.frames).toHaveLength(48);
  expect(bank.scale).toBe(0.5);
  expect(bank.pivot).toEqual([0.5, 320 / 448]);
  for (const d of [
    'right',
    'left',
    'down',
    'up',
    'down_right',
    'down_left',
    'up_right',
    'up_left',
  ]) {
    const neutral = old.frames.find((f) => f.name === 'idle_0_' + d)!.sha256;
    expect(hashes.get('sweep_0_' + d)).toBe(neutral);
    expect(hashes.get('sweep_5_' + d)).toBe(neutral);
    expect(
      manifest.clips.find((c) => c.name === 'sweep_' + d)!.durations,
    ).toEqual([25, 60, 85, 85, 80, 40]);
  }
  expect(m1Config.basics['con_luan_thien_su']!.minIntervalTicks).toBe(12);
});

it('uses enlarged sweep art without changing neutral/slam pixels and fits slower clips into the server beat', () => {
  const load = (v: number) =>
    JSON.parse(
      readFileSync(
        `assets/exports/skill-revise-thien-su-v0${v}/hammer-combo-v${v}/manifest.json`,
        'utf8',
      ),
    ) as {
      frames: { name: string; sha256: string }[];
      clips: { name: string; durations: number[] }[];
    };
  const prior = load(6),
    current = load(7),
    hashes = new Map(prior.frames.map((f) => [f.name, f.sha256]));
  const bank = assets.find((a) => a.id === 'hammer-combo-v7')!;
  expect(bank.frames).toHaveLength(96);
  expect(bank.scale).toBe(0.5);
  for (const frame of current.frames) {
    const [stage, index] = frame.name.split('_');
    if (stage === 'slam' || index === '0' || index === '5')
      expect(frame.sha256).toBe(hashes.get(frame.name));
    else expect(frame.sha256).not.toBe(hashes.get(frame.name));
  }
  expect(m1Config.basics['con_luan_thien_su']!.basicPoseTicks).toBe(12);
  for (const clip of current.clips) {
    expect(clip.durations.reduce((a, b) => a + b, 0)).toBe(375);
    expect(375).toBeLessThan((12 / m1Config.tickRate) * 1000);
  }
});

it('integrates the approved sweep/overhead poses with neutral continuity and complete eight-way clips', () => {
  const bank = assets.find((a) => a.id === 'hammer-combo-v6')!;
  const manifest = JSON.parse(
    readFileSync(
      'assets/exports/skill-revise-thien-su-v06/hammer-combo-v6/manifest.json',
      'utf8',
    ),
  ) as {
    frames: { name: string; sha256: string }[];
    clips: { name: string; frames: string[]; durations: number[] }[];
  };
  const old = JSON.parse(
    readFileSync(
      'assets/exports/skill-revise-feedback-v04/hammer-coherent-v4/manifest.json',
      'utf8',
    ),
  ) as { frames: { name: string; sha256: string }[] };
  const hashes = new Map(manifest.frames.map((f) => [f.name, f.sha256]));
  expect(bank.scale).toBe(0.5);
  expect(bank.pivot).toEqual([0.5, 320 / 448]);
  expect(bank.frames).toHaveLength(96);
  expect(manifest.clips).toHaveLength(16);
  for (const d of [
    'right',
    'left',
    'down',
    'up',
    'down_right',
    'down_left',
    'up_right',
    'up_left',
  ])
    for (const stage of ['slam', 'sweep']) {
      const neutral = old.frames.find((f) => f.name === 'idle_0_' + d)!.sha256;
      expect(hashes.get(`${stage}_0_${d}`)).toBe(neutral);
      expect(hashes.get(`${stage}_5_${d}`)).toBe(neutral);
      const clip = manifest.clips.find((c) => c.name === stage + '_' + d)!;
      expect(clip.frames).toEqual(
        Array.from({ length: 6 }, (_, i) => `${stage}_${i}_${d}`),
      );
      expect(
        new Set(clip.frames.slice(1, 5).map((n) => hashes.get(n))).size,
      ).toBe(4);
      expect(clip.durations.reduce((a, b) => a + b, 0)).toBe(285);
      expect(285).toBeLessThanOrEqual(
        (m1Config.basics['con_luan_thien_su']!.basicPoseTicks! /
          m1Config.tickRate) *
          1000,
      );
    }
});
it('registers all six authored hammer cels at one body scale and foot pivot in every facing', () => {
  const directions = [
    'down',
    'down_right',
    'right',
    'up_right',
    'up',
    'up_left',
    'left',
    'down_left',
  ];
  for (const [id, stages] of [
    ['hammer-coherent-v4', ['thrust', 'rising', 'sweep', 'slam']],
  ] as const) {
    const a = assets.find((a) => a.id === id)!;
    expect(a.scale).toBe(0.5);
    expect(a.pivot).toEqual([0.5, 320 / 448]);
    for (const stage of stages)
      for (const d of directions)
        for (let i = 0; i < 6; i++)
          expect(a.frames).toContain(`${stage}_${i}_${d}`);
  }
  expect(assets.some((a) => a.id === 'wind-crescent')).toBe(true);
  expect(assets.some((a) => a.id === 'wind-gust')).toBe(false);
});

it('keeps the exact idle body pixels at every A entry/recovery and clears the overhead silhouette', () => {
  const manifest = JSON.parse(
    readFileSync(
      'assets/exports/skill-revise-feedback-v04/hammer-coherent-v4/manifest.json',
      'utf8',
    ),
  ) as { frames: { name: string; sha256: string }[] };
  const hashes = new Map(manifest.frames.map((f) => [f.name, f.sha256]));
  const atlas = JSON.parse(
    readFileSync(
      'assets/exports/skill-revise-feedback-v04/hammer-coherent-v4/body.json',
      'utf8',
    ),
  ) as { frames: Record<string, { spriteSourceSize: { y: number } }> };
  for (const d of [
    'down',
    'down_right',
    'right',
    'up_right',
    'up',
    'up_left',
    'left',
    'down_left',
  ]) {
    for (const stage of ['thrust', 'rising', 'sweep', 'slam']) {
      expect(hashes.get(`${stage}_0_${d}`)).toBe(hashes.get(`idle_0_${d}`));
      expect(hashes.get(`${stage}_5_${d}`)).toBe(hashes.get(`idle_0_${d}`));
    }
    const headTop =
      d === 'up' ? 242 : atlas.frames[`idle_0_${d}`]!.spriteSourceSize.y;
    expect(atlas.frames[`slam_2_${d}`]!.spriteSourceSize.y).toBeLessThan(
      headTop - 8,
    );
  }
});

it('provides ten distinct lift/contact/recovery phases for the two-hand slam in all facings', () => {
  const bank = assets.find((a) => a.id === 'hammer-slam-v5')!;
  const manifest = JSON.parse(
    readFileSync(
      'assets/exports/skill-revise-thien-su-v05/hammer-slam-v5/manifest.json',
      'utf8',
    ),
  ) as {
    frames: { name: string; sha256: string }[];
    clips: { name: string; durations: number[] }[];
  };
  const hashes = new Map(manifest.frames.map((f) => [f.name, f.sha256]));
  const neutral = JSON.parse(
    readFileSync(
      'assets/exports/skill-revise-feedback-v04/hammer-coherent-v4/manifest.json',
      'utf8',
    ),
  ) as { frames: { name: string; sha256: string }[] };
  for (const d of [
    'down',
    'down_left',
    'down_right',
    'left',
    'right',
    'up',
    'up_left',
    'up_right',
  ]) {
    for (let i = 0; i < 10; i++)
      expect(bank.frames).toContain(`slam_${i}_${d}`);
    const same = neutral.frames.find((f) => f.name === `idle_0_${d}`)!.sha256;
    expect(hashes.get(`slam_0_${d}`)).toBe(same);
    expect(hashes.get(`slam_9_${d}`)).toBe(same);
    expect(
      new Set(
        Array.from({ length: 10 }, (_, i) => hashes.get(`slam_${i}_${d}`)),
      ).size,
    ).toBeGreaterThanOrEqual(8);
    expect(
      manifest.clips
        .find((c) => c.name === 'slam_' + d)!
        .durations.reduce((a, b) => a + b, 0),
    ).toBeLessThanOrEqual(
      (m1Config.basics['con_luan_thien_su']!.basicPoseTicks! /
        m1Config.tickRate) *
        1000,
    );
  }
});
