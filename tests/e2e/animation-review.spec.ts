import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { reviewSkills } from '../../apps/game-client/src/animation-review-plans.js';
interface Snapshot {
  completedCycles: number;
  ready: boolean;
  timeMs: number;
  playing: boolean;
  rootMotion: number;
  insideLotus: boolean;
  camera: { zoom: number; rotation: number };
  counter: { reflect: number };
  errors: string[];
  observedFrames: string[];
  actors: { origin: number[]; scale: number; y: number; depth: number }[];
  effects: { phase: string; x: number; y: number }[];
  displayScale: number;
  resources: { bodies: number; effects: number };
}
type Bridge = {
  snapshot(): Snapshot;
  choose(id: string, d?: string, mode?: string, branch?: string): void;
  seek(t: number): void;
  play(): void;
  pause(): void;
  clear(): void;
};
const bridge = (p: Page, action: 'snapshot' | 'play' | 'pause' | 'clear') =>
  p.evaluate(
    (key) =>
      (
        window as unknown as { __ANIMATION_REVIEW__: Bridge }
      ).__ANIMATION_REVIEW__[key](),
    action,
  ) as Promise<Snapshot>;
const choose = (
  p: Page,
  id: string,
  d = 'right',
  mode = 'single',
  branch = 'threshold',
) =>
  p.evaluate(
    ([id, d, m, b]) =>
      (
        window as unknown as { __ANIMATION_REVIEW__: Bridge }
      ).__ANIMATION_REVIEW__.choose(id, d, m, b),
    [id, d, mode, branch] as const,
  );
const seek = (p: Page, t: number) =>
  p.evaluate(
    (t) =>
      (
        window as unknown as { __ANIMATION_REVIEW__: Bridge }
      ).__ANIMATION_REVIEW__.seek(t),
    t,
  );
const output = 'docs/evidence/animation-review-v01';

test('animation review: live four-facing timing, retreat, lotus, both counter branches, readability and isolation', async ({
  browser,
}) => {
  test.setTimeout(150000);
  await mkdir(output, { recursive: true });
  const contexts = await Promise.all(
    [1280, 1920].map((width) =>
      browser.newContext({
        viewport: { width, height: width === 1280 ? 720 : 1080 },
      }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const errors: string[] = [],
    sockets: string[] = [],
    observations: unknown[] = [];
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
        await p.goto('/?artPreview=1&animationReview=1');
        await p.waitForFunction(
          () =>
            (
              window as unknown as { __ANIMATION_REVIEW__?: Bridge }
            ).__ANIMATION_REVIEW__?.snapshot().ready,
        );
      }),
    );
    const [a, b] = pages as [Page, Page];
    await Promise.all(
      pages.map((p) => p.getByLabel('Độ phóng').selectOption('1')),
    );
    // Observe actual successive rendered cels while both independent scenes run.
    for (const [id] of reviewSkills) {
      await Promise.all(pages.map((p) => choose(p, id, 'right', 'four')));
      await expect
        .poll(
          async () =>
            (await bridge(a, 'snapshot')).observedFrames.filter(
              (f) => !f.startsWith('hero_'),
            ).length,
        )
        .toBeGreaterThan(4);
      const first = await bridge(a, 'snapshot');
      await expect
        .poll(async () => (await bridge(a, 'snapshot')).timeMs)
        .toBeGreaterThan(first.timeMs + 150);
      await expect
        .poll(async () => (await bridge(a, 'snapshot')).completedCycles, {
          timeout: 10000,
        })
        .toBeGreaterThanOrEqual(1);
      await Promise.all(pages.map((p) => bridge(p, 'pause')));
      const state = await bridge(a, 'snapshot');
      const peer = await bridge(b, 'snapshot');
      expect(peer.completedCycles).toBeGreaterThanOrEqual(1);
      for (const asset of ['review_lotus', 'review_palm', 'review_sword']) {
        const frames = state.observedFrames.filter((f) =>
          f.startsWith(asset + ':'),
        );
        if (frames.length) expect(frames.length, id + ':' + asset).toBe(8);
      }
      expect(state.actors).toHaveLength(4);
      expect(
        state.actors.every(
          (s) =>
            s.origin[0] === 0.5 &&
            s.origin[1] === 0.8 &&
            s.scale === 1 &&
            s.depth === s.y,
        ),
      ).toBe(true);
      expect(state.errors).toEqual([]);
      expect(state.observedFrames.some((f) => f.includes('_up_'))).toBe(true);
      expect(state.observedFrames.some((f) => f.includes('_left_'))).toBe(true);
      observations.push({ id, live: state });
    }
    // Gather and strike must share the same position at the transition in all facings.
    for (const d of ['right', 'down', 'left', 'up']) {
      await choose(a, 'that_tinh_kiem', d);
      await seek(a, 499);
      const before = (await bridge(a, 'snapshot')).effects.find(
        (e) => e.phase === 'seven_stars_gather',
      )!;
      await seek(a, 500);
      const after = (await bridge(a, 'snapshot')).effects.find(
        (e) => e.phase === 'seven_sword_strike',
      )!;
      expect(after.x).toBe(before.x);
      expect(after.y).toBe(before.y);
    }
    await a.getByLabel('Độ phóng').selectOption('2');
    expect((await bridge(a, 'snapshot')).displayScale).toBe(2);
    await choose(a, 'phong_anh_hoan_vi');
    await seek(a, 430);
    let state = await bridge(a, 'snapshot');
    expect(state.rootMotion).toBeLessThan(-100);
    expect(
      state.effects.filter((e) => e.phase === 'light_afterimage').length,
    ).toBeGreaterThan(3);
    await a.screenshot({ path: `${output}/retreat.png` });
    await seek(a, 1700);
    expect((await bridge(a, 'snapshot')).effects).toHaveLength(0);
    await choose(a, 'lien_hoa_phien');
    await seek(a, 900);
    state = await bridge(a, 'snapshot');
    const lotusX = state.effects.find((e) => e.phase === 'lotus_ground')!.x;
    expect(state.insideLotus).toBe(true);
    await a.screenshot({ path: `${output}/lotus-inside.png` });
    await seek(a, 3000);
    state = await bridge(a, 'snapshot');
    expect(state.insideLotus).toBe(false);
    expect(state.effects.find((e) => e.phase === 'lotus_ground')!.x).toBe(
      lotusX,
    );
    expect(state.effects.some((e) => e.phase === 'protected_inside')).toBe(
      false,
    );
    await a.screenshot({ path: `${output}/lotus-outside.png` });
    await seek(a, 4600);
    expect((await bridge(a, 'snapshot')).insideLotus).toBe(true);
    for (const branch of ['threshold', 'expiry']) {
      await choose(a, 'toa_sat_bac_do', 'right', 'single', branch);
      const release = branch === 'threshold' ? 2800 : 5000;
      await seek(a, release - 1);
      expect(
        (await bridge(a, 'snapshot')).effects.some(
          (e) => e.phase === 'counter_release',
        ),
      ).toBe(false);
      await seek(a, release + 130);
      state = await bridge(a, 'snapshot');
      expect(state.effects.some((e) => e.phase === 'counter_release')).toBe(
        true,
      );
      expect(state.counter.reflect).toBe(branch === 'threshold' ? 210 : 150);
      await expect(a.locator('#review-readout')).toContainText(
        `phản ${state.counter.reflect}`,
      );
      await a.screenshot({ path: `${output}/counter-${branch}.png` });
    }
    for (const [id, at] of [
      ['that_tinh_kiem', 650],
      ['dai_luc_kim_cuong_chuong', 700],
      ['tam_gioi_quy_thien', 850],
      ['bat_dong_minh_vuong', 2400],
      ['nhu_lai_thien_diep', 1700],
    ] as const) {
      await choose(a, id);
      await seek(a, at);
      await a.screenshot({ path: `${output}/${id}.png` });
    }
    await choose(a, 'van_kiem_quy_tong');
    await seek(a, 4800);
    state = await bridge(a, 'snapshot');
    expect(state.effects.some((e) => e.phase === 'radial_release')).toBe(true);
    await a.screenshot({ path: `${output}/swords-sustained.png` });
    // This is a six-copy art readability fixture, explicitly not multiplayer combat.
    await choose(b, 'van_kiem_quy_tong', 'right', 'six');
    await b.getByLabel('Độ phóng').selectOption('2');
    await seek(b, 2400);
    expect((await bridge(b, 'snapshot')).actors).toHaveLength(6);
    await b.screenshot({ path: `${output}/six-copy-readability-1920.png` });
    await choose(a, 'thieu_lam_dao');
    await a.locator('#review-pause').click();
    await a.getByLabel('Tua animation').fill('200');
    expect((await bridge(a, 'snapshot')).playing).toBe(false);
    await a.locator('#review-pause').click();
    await expect
      .poll(async () => (await bridge(a, 'snapshot')).timeMs)
      .toBeGreaterThan(350);
    await a.getByLabel('Nền preview').selectOption('light');
    await a.getByLabel('Nền preview').selectOption('arena');
    for (let i = 0; i < 12; i++)
      await choose(a, i % 2 ? 'phong_anh_hoan_vi' : 'van_kiem_quy_tong');
    await choose(a, 'lien_hoa_phien');
    state = await bridge(a, 'snapshot');
    expect(state.resources.bodies).toBe(1);
    expect(state.resources.effects).toBe(4);
    for (const p of pages) {
      const bounds = await p.evaluate(() => {
        const canvas = document
            .querySelector('canvas')!
            .getBoundingClientRect(),
          viewport = document
            .querySelector('#viewport')!
            .getBoundingClientRect();
        return {
          width: canvas.width,
          height: canvas.height,
          vw: viewport.width,
          vh: viewport.height,
        };
      });
      expect(bounds.width).toBe(bounds.vw);
      expect(bounds.height).toBe(bounds.vh);
      expect((await bridge(p, 'snapshot')).camera).toEqual({
        zoom: 1,
        rotation: 0,
      });
      expect(
        await p.evaluate(
          () =>
            (
              window as unknown as {
                __VOLAM__: { snapshot(): { roomId?: string } };
              }
            ).__VOLAM__.snapshot().roomId,
        ),
      ).toBeUndefined();
    }
    expect(sockets).toEqual([]);
    expect(errors).toEqual([]);
    await writeFile(
      `${output}/observations.json`,
      JSON.stringify(
        {
          scope:
            'Art-only preview; no real combat, HP, rewards or multiplayer acceptance claimed',
          observations,
          errors,
          sockets,
          recordingsCreated: false,
        },
        null,
        2,
      ),
    );
  } catch (e) {
    await pages[0]?.screenshot({ path: `${output}/failure.png` });
    throw e;
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
