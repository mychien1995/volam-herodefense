import { expect, test, type Page } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import {
  forestTypes,
  forestArtStatus,
} from '../../apps/game-client/src/forest-creeps.js';
const root = 'assets/sprites/creeps/dungeons/forest/';
interface Animation {
  state: string;
  direction: string;
  frames: string[];
  repeat: number;
}
interface Asset {
  id: string;
  typeId: string;
  footPivot: number[];
  animations: Animation[];
}
interface View {
  sharedRuntimeRenderer: boolean;
  ready: boolean;
  time: number;
  zoom: number;
  rotation: number;
  heroCount: number;
  actorCount: number;
  observed: Record<string, string[]>;
  repeats: Record<string, number>;
  completed: Array<{ actor: string; key: string; at: number }>;
  actors: Array<{
    id: string;
    texture: string;
    frame: string;
    animation: string;
    x: number;
    y: number;
    depth: number;
    origin: number[];
    scale: number[];
  }>;
  trees: Array<{ x: number; y: number; depth: number }>;
  effectFrames: Record<string, string[]>;
  effectCompleted: string[];
  effectRepeats: Record<string, number>;
  activeEffects: number;
}
const view = (p: Page): Promise<View> =>
  p.evaluate('window.__FOREST_REVIEW__.inspect()');
test('isolated forest candidate: directional cycles, pivots, depth, VFX and six-hero readability', async ({
  browser,
}) => {
  const players = Number(process.env['FOREST_REVIEW_PLAYERS'] ?? '6');
  expect([2, 6]).toContain(players);
  const filter = process.env['FOREST_REVIEW_ENEMY'];
  const batch = JSON.parse(
    readFileSync(root + 'forest_manifest_v01.json', 'utf8'),
  ) as { assets: Asset[] };
  const assets = batch.assets.filter((a) => !filter || a.typeId === filter);
  const hasEffects = existsSync('assets/effects/dungeons/forest/manifest.json');
  const fx = hasEffects
    ? (JSON.parse(
        readFileSync('assets/effects/dungeons/forest/manifest.json', 'utf8'),
      ) as {
        sequences: Array<{ name: string; frames: string[]; repeat: number }>;
      })
    : undefined;
  const out = `${process.env['FOREST_EVIDENCE_DIR'] ?? 'docs/evidence/forest-creep-runtime-2026-10-31'}/${players === 2 ? 'iteration-2' : 'final-6'}`;
  mkdirSync(out, { recursive: true });
  const contexts = await Promise.all(
    Array.from({ length: players }, () =>
      browser.newContext({ viewport: { width: 1920, height: 1080 } }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const errors: string[] = [];
  for (const p of pages) {
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    p.on('response', (r) => {
      if (r.status() >= 400) errors.push(r.status() + ' ' + r.url());
    });
  }
  const coverage: Record<string, string[]> = {};
  const durations: Record<string, number> = {};
  try {
    const url = `/forest-creep-review.html?players=${players}${filter ? '&enemy=' + filter : ''}${hasEffects ? '&vfx=1' : ''}`;
    await Promise.all(
      pages.map(async (p) => {
        await p.goto(url);
        await expect(p.locator('#review-ready')).toHaveAttribute(
          'data-ready',
          'true',
          { timeout: 30000 },
        );
      }),
    );
    const a = pages[0]!;
    for (const p of pages) {
      const v = await view(p);
      expect(v.sharedRuntimeRenderer).toBe(true);
      expect(v.heroCount).toBe(players);
      expect(v.actorCount).toBe(assets.length * 2);
      expect(v.zoom).toBe(1);
      expect(v.rotation).toBe(0);
    }
    await a.screenshot({ path: out + '/candidate-scale.png' });
    for (const state of ['idle', 'walk', 'basic_attack', 'hurt', 'death'])
      for (const direction of ['down', 'left', 'right', 'up']) {
        await Promise.all(
          pages.map(async (p) => {
            await p.locator('#review-pose').selectOption(state);
            await p.locator('#review-direction').selectOption(direction);
          }),
        );
        const started = (await view(a)).time;
        await Promise.all(
          pages.map((p) =>
            expect
              .poll(
                async () => {
                  const v = await view(p);
                  return assets.every((asset) => {
                    const anim = asset.animations.find(
                      (n) => n.state === state && n.direction === direction,
                    )!;
                    const key = asset.id + ':' + state + ':' + direction;
                    return (
                      anim.frames.every((f) =>
                        (v.observed[key] ?? []).includes(f),
                      ) &&
                      (anim.repeat === -1
                        ? (v.repeats[key] ?? 0) >= 1
                        : v.completed.some((c) => c.key === key))
                    );
                  });
                },
                { timeout: 12000, intervals: [70] },
              )
              .toBe(true),
          ),
        );
        const v = await view(a);
        durations[state + ':' + direction] = v.time - started;
        for (const asset of assets) {
          const key = asset.id + ':' + state + ':' + direction;
          coverage[key] = v.observed[key]!;
        }
        for (const actor of v.actors) {
          expect(actor.depth).toBe(actor.y);
          expect(actor.scale).toEqual([1, 1]);
          expect(actor.origin).toEqual([0.5, 106 / 128]);
        }
        if (state === 'basic_attack' && direction === 'down')
          await a.screenshot({ path: out + '/candidate-attacks.png' });
      }
    await a.locator('#review-pose').selectOption('idle');
    await a.locator('#review-independent').check();
    await expect
      .poll(async () => {
        const v = await view(a);
        return assets.every(
          (_, i) =>
            v.actors[i * 2]!.animation !== v.actors[i * 2 + 1]!.animation,
        );
      })
      .toBe(true);
    await a.locator('#review-independent').uncheck();
    for (const [mode, y] of [
      ['behind', 192],
      ['front', 280],
    ] as const) {
      await a.locator(`[data-depth=${mode}]`).click();
      const v = await view(a);
      expect(v.actors[0]!.depth).toBe(y);
      expect(
        v.trees.some((t) => t.x === 440 && t.y === 240 && t.depth === 240),
      ).toBe(true);
      if (mode === 'behind') expect(v.actors[0]!.depth).toBeLessThan(240);
      else expect(v.actors[0]!.depth).toBeGreaterThan(240);
      await a.screenshot({ path: out + '/depth-' + mode + '.png' });
    }
    await a.locator('[data-depth=reset]').click();
    const effectCoverage: Record<string, string[]> = {};
    for (const seq of fx?.sequences ?? []) {
      await a.locator('#review-effect').selectOption(seq.name);
      await a.locator('#review-play-effect').click();
      await expect
        .poll(
          async () => {
            const v = await view(a);
            return (
              seq.frames.every((f) =>
                (v.effectFrames[seq.name] ?? []).includes(f),
              ) &&
              v.activeEffects === 0 &&
              (seq.repeat !== -1 || (v.effectRepeats[seq.name] ?? 0) >= 1) &&
              v.effectCompleted.some((c) => c.startsWith(seq.name))
            );
          },
          { timeout: 5000, intervals: [60] },
        )
        .toBe(true);
      effectCoverage[seq.name] = (await view(a)).effectFrames[seq.name]!;
    }
    if (fx) {
      for (const name of [
        'truc_xa_bite_contact',
        'doc_chu_web_impact',
        'son_vien_slam_impact',
        'moc_linh_root_emerge',
        'truc_yeu_splinter_impact',
      ]) {
        await a.locator('#review-direction').selectOption('down');
        await a.locator('#review-hold-effect').check();
        await a.locator('#review-effect').selectOption(name);
        await a.locator('#review-play-effect').click();
        await expect
          .poll(async () =>
            (await view(a)).effectFrames[name]?.includes(name + '_2'),
          )
          .toBe(true);
        await a.screenshot({ path: out + '/aligned-' + name + '-held.png' });
      }
      await a.locator('#review-direction').selectOption('right');
      await a.locator('#review-hold-effect').check();
      await a
        .locator('#review-effect')
        .selectOption('truc_lam_kiem_khach_slash_right');
      await a.locator('#review-play-effect').click();
      await expect
        .poll(async () =>
          (await view(a)).effectFrames[
            'truc_lam_kiem_khach_slash_right'
          ]?.includes('truc_lam_kiem_khach_slash_right_2'),
        )
        .toBe(true);
      await a.screenshot({ path: out + '/candidate-vfx-held-contact.png' });
      await a.locator('#review-hold-effect').uncheck();
      await a.locator('#review-play-effect').click();
      await expect.poll(async () => (await view(a)).activeEffects).toBe(0);
    }
    await a.setViewportSize({ width: 1280, height: 720 });
    expect(await a.locator('#review-game canvas').boundingBox()).toEqual({
      x: 0,
      y: 0,
      width: 1280,
      height: 720,
    });
    expect(errors).toEqual([]);
    writeFileSync(
      out + '/observations.json',
      JSON.stringify(
        {
          status: 'PASS',
          browserClients: players,
          heroScaleStandIns: players,
          controlledArtReview: true,
          sharedRuntimeRenderer: true,
          naturalCombat: false,
          rewards: false,
          gameplayIntegration: false,
          directorApproved: forestTypes.every(
            (type) => forestArtStatus(type) === 'approved',
          ),
          coverage,
          durations,
          effectCoverage,
          errors,
        },
        null,
        2,
      ) + '\n',
    );
  } catch (e) {
    writeFileSync(
      out + '/failure-errors.json',
      JSON.stringify(errors, null, 2),
    );
    await pages[0]?.screenshot({ path: out + '/failure.png' }).catch(() => {});
    throw e;
  } finally {
    await Promise.allSettled(contexts.map((c) => c.close()));
  }
});
