import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  previews,
  type PreviewState,
  type Facing,
  type Outcome,
} from '../../apps/game-client/src/bac-cai-preview-model.js';
import {
  cloneRoundMs,
  cloneShuffleEnd,
  cloneDecisionAt,
} from '../../apps/game-client/src/bac-cai-preview-tuning.js';
interface Snapshot {
  ready: boolean;
  time: number;
  cycles: number;
  state: PreviewState;
  errors: string[];
  seen: string[];
  camera: { zoom: number; rotation: number };
  actors: {
    id: string;
    asset: string;
    frame: string;
    origin: number[];
    scale: number[];
    x: number;
    y: number;
    depth: number;
    alpha: number;
  }[];
  clips: { key: string; frames: string[]; duration: number }[];
}
interface Bridge {
  snapshot(): Snapshot;
  choose(id: string, d?: Facing, b?: Outcome, n?: number): void;
  seek(t: number): void;
  play(): void;
  pause(): void;
  speed(n: number): void;
  zoom(n: number): void;
}
declare global {
  interface Window {
    __BAC_CAI_PREVIEW__: Bridge;
  }
}
const snap = (p: Page) =>
  p.evaluate(() => window.__BAC_CAI_PREVIEW__.snapshot());
const choose = (
  p: Page,
  id: string,
  d: Facing = 'right',
  b: Outcome = 'success',
  n = 6,
) =>
  p.evaluate(
    ([id, d, b, n]) => window.__BAC_CAI_PREVIEW__.choose(id, d, b, n),
    [id, d, b, n] as const,
  );
const seek = (p: Page, t: number) =>
  p.evaluate((t) => window.__BAC_CAI_PREVIEW__.seek(t), t);
// Historical v03 evidence is approval-locked. Reverification always writes fresh evidence.
const output = process.env['BAC_CAI_PREVIEW_EVIDENCE_DIR'] ?? 'docs/evidence/bac-cai-runtime/gallery-regression';
test.use({ video: 'off', trace: 'off' });

test('Bắc Cái sprite / VFX: real Phaser frames, final-brief branches and six-model readability', async ({
  browser,
}) => {
  test.setTimeout(240000);
  await mkdir(output, { recursive: true });
  await mkdir('.cache/bac-cai-preview-captures-v03', { recursive: true });
  const errors: string[] = [],
    sockets: string[] = [],
    observations: unknown[] = [];
  const contexts = await Promise.all(
    [1280, 1920].map((width) =>
      browser.newContext({
        viewport: { width, height: width === 1280 ? 720 : 1080 },
      }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  try {
    for (const p of pages) {
      p.on('pageerror', (e) => errors.push(e.message));
      p.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      p.on('websocket', (w) => sockets.push(w.url()));
    }
    await Promise.all(
      pages.map(async (p) => {
        await p.goto('/bac-cai-preview.html');
        await p.waitForFunction(
          () => window.__BAC_CAI_PREVIEW__?.snapshot().ready,
        );
        await p.evaluate(() => window.__BAC_CAI_PREVIEW__.speed(2));
      }),
    );
    const [a, b] = pages as [Page, Page];
    const clips = (await snap(a)).clips.filter(
      (c) => !c.key.startsWith('hero_'),
    );
    let frameCount = 0;
    // Actual successive render ticks and complete cycles, rather than seek-only checks.
    for (const c of clips) {
      await Promise.all(
        pages.map(async (p) => {
          await choose(p, c.key);
          await p.evaluate(() => window.__BAC_CAI_PREVIEW__.play());
        }),
      );
      await expect
        .poll(
          async () =>
            Promise.all(
              pages.map(async (p) => {
                const s = await snap(p);
                return (
                  c.frames.every((f) =>
                    s.seen.includes(c.key.split(':')[0] + ':' + f),
                  ) && s.cycles >= 1
                );
              }),
            ),
          { timeout: 5000, intervals: [70, 120] },
        )
        .toEqual([true, true]);
      const s = await snap(a);
      expect(s.errors).toEqual([]);
      const actor = s.actors.find((v) => v.id === 'audition')!;
      expect(actor.scale).toEqual([1, 1]);
      expect(actor.depth).toBe(actor.y);
      if (
        c.key.startsWith('boss_bac_cai:') ||
        c.key.startsWith('bac_cai_rework_character:')
      )
        expect(actor.origin).toEqual([0.5, 88 / 112]);
      frameCount += c.frames.length;
      observations.push({
        clip: c.key,
        seen: s.seen.filter((f) => f.startsWith(c.key.split(':')[0] + ':')),
        cycles: s.cycles,
      });
    }
    expect(frameCount).toBe(408); // Prior 404 cels retained + four native-width beam cels.
    for (const d of ['down', 'up', 'left', 'right'] as Facing[]) {
      await choose(a, 'staff', d);
      await seek(a, 1200);
      expect((await snap(a)).errors).toEqual([]);
      await choose(a, 'field', d);
      await seek(a, 800);
      expect(
        (await snap(a)).state.layers.find((l) => l.id === 'field')?.tag,
      ).toBe('field_impact');
    }
    await choose(a, 'clones');
    await seek(a, 0);
    expect((await snap(a)).actors.find((v) => v.id === 'clone-0')!.x).toBe(640);
    await seek(a, 750);
    const forming = (await snap(a)).actors;
    expect(forming.find((v) => v.id === 'clone-0')!.x).toBeGreaterThan(640);
    expect(forming.find((v) => v.id === 'clone-1')!.x).toBeCloseTo(
      640 + Math.cos(Math.PI / 4) * 265,
      0,
    );
    await choose(a, 'clones');
    await a.evaluate(() => {
      window.__BAC_CAI_PREVIEW__.speed(1);
      window.__BAC_CAI_PREVIEW__.play();
    });
    const crossing: { time: number; x: number; y: number }[] = [];
    await expect
      .poll(
        async () => {
          const s = await snap(a),
            actor = s.actors.find((v) => v.id === 'clone-0')!;
          crossing.push({ time: s.time, x: actor.x, y: actor.y });
          return s.time;
        },
        { timeout: 10000, intervals: [100] },
      )
      .toBeGreaterThan(2900);
    expect(crossing.some((p) => p.time > 1500 && p.x > 640 && p.x < 905)).toBe(
      true,
    );
    expect(crossing.some((p) => p.time > 2200 && p.x < 640)).toBe(true);
    observations.push({ liveCrossing: crossing });
    for (const t of [
      1499,
      1500,
      ...Array.from({ length: 5 }, (_, i) => 1500 + (i + 1) * cloneRoundMs),
    ]) {
      await choose(a, 'clones');
      await seek(a, t);
      const s = await snap(a);
      expect(
        s.state.layers.filter((l) => /^clone-\d$/.test(l.id)),
      ).toHaveLength(8);
      expect(s.state.immune).toBe(t >= 1500 && t < cloneShuffleEnd);
      observations.push({
        clonesAt: t,
        swaps: s.state.swaps,
        immune: s.state.immune,
      });
    }
    await choose(a, 'clones', 'right', 'success');
    await seek(a, cloneDecisionAt + 300);
    expect(
      (await snap(a)).state.layers.filter((l) => /^clone-\d$/.test(l.id)),
    ).toHaveLength(1);
    await choose(a, 'clones', 'right', 'failure');
    await seek(a, cloneDecisionAt + 300);
    expect(
      (await snap(a)).state.layers.filter((l) => l.id.startsWith('map-hit-')),
    ).toHaveLength(6);
    await choose(a, 'tether', 'right', 'failure', 1);
    await seek(a, 2000);
    expect((await snap(a)).state.tetherActive).toBe(false);
    for (const branch of ['success', 'failure'] as Outcome[]) {
      await choose(a, 'tether', 'right', branch);
      await seek(a, 3500);
      expect((await snap(a)).state.tetherActive).toBe(branch === 'failure');
      await choose(a, 'preferences', 'right', branch);
      await seek(a, 16000);
      const state = (await snap(a)).state;
      if (branch === 'success') expect(state.sleepRemaining).toBe(8000);
      else expect(state.bossHp).toBe(80);
      observations.push({ branch, state });
    }
    await choose(a, 'beam');
    await seek(a, 450);
    const beam = (await snap(a)).actors.find((v) => v.id === 'beam')!;
    expect(beam.asset).toBe('bac_cai_beam_v03');
    expect(beam.scale).toEqual([1, 1]);
    await choose(a, 'field');
    await seek(a, 560);
    const landing = (await snap(a)).actors;
    expect(landing.find((v) => v.id === 'field')!.depth).toBeLessThan(
      landing.find((v) => v.id === 'boss')!.depth,
    );
    expect(landing.find((v) => v.id === 'field')!.alpha).toBeLessThanOrEqual(
      0.6,
    );
    await choose(a, 'preferences');
    await seek(a, 450);
    const spoken = await snap(a);
    expect(spoken.state.captions.some((c) => c.id === 'dialog')).toBe(true);
    expect(spoken.actors.some((v) => v.id === 'concurrent-beam')).toBe(true);
    await choose(a, 'spiral');
    await seek(a, 1100);
    const detached = await snap(a);
    expect(detached.actors.some((v) => v.id === 'spiral-0')).toBe(true);
    expect(detached.actors.some((v) => v.id === 'concurrent-beam')).toBe(true);
    expect(detached.state.dragonReleased).toBe(true);
    observations.push({
      nativeBeam: beam,
      landing,
      dialogueAndCast: spoken.state,
      detachedDragon: detached.state,
    });
    // Required director-review artwork: genuine rendered phase stills, no recordings.
    const times: Record<string, number> = {
      entrance: 1900,
      staff: 400,
      palms: 550,
      beam: 500,
      dogs: 2400,
      clones: 2400,
      vortex: 2200,
      tether: 2100,
      field: 560,
      spiral: 1100,
      preferences: 450,
    };
    for (const [id] of previews) {
      await choose(a, id);
      await seek(a, times[id]!);
      await a.screenshot({
        path: '.cache/bac-cai-preview-captures-v03/' + id + '.png',
      });
      expect((await snap(a)).errors).toEqual([]);
    }
    await choose(a, 'field');
    await seek(a, 560);
    await a.screenshot({ path: output + '/arena-field-six-models-1x.png' });
    await choose(b, 'spiral');
    await seek(b, 1100);
    await b.screenshot({
      path: output + '/arena-spiral-six-models-display.png',
    });
    await a.evaluate(() => window.__BAC_CAI_PREVIEW__.zoom(2));
    expect((await snap(a)).camera).toEqual({ zoom: 2, rotation: 0 });
    const layout = await a.evaluate(() => ({
      canvas: document
        .querySelector('canvas')!
        .getBoundingClientRect()
        .toJSON(),
      controls: document
        .getElementById('review-controls')!
        .getBoundingClientRect()
        .toJSON(),
      viewport: document
        .getElementById('bac-cai-viewport')!
        .getBoundingClientRect()
        .toJSON(),
    }));
    expect(layout.canvas.width).toBe(layout.viewport.width);
    expect(layout.controls.right).toBeLessThanOrEqual(layout.viewport.right);
    expect(sockets).toEqual([]);
    expect(errors).toEqual([]);
    await writeFile(
      output + '/verification.json',
      JSON.stringify(
        {
          status: 'PASS',
          scope:
            'Art preview only; two independent render contexts, six scripted hero models; no boss server/multiplayer-combat acceptance',
          frameCount,
          clipCount: clips.length,
          viewports: [1280, 1920],
          observations,
          errors,
          sockets,
          recordingsCreated: false,
          approval: 'PENDING_DIRECTOR_REVIEW',
        },
        null,
        2,
      ) + '\n',
    );
  } catch (error) {
    await pages[0]?.screenshot({ path: output + '/failure.png' });
    throw error;
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
