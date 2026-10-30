import { joinWaiting, startTogether } from './pregame-helper.js';
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const evidence = resolve('assets/reviews/cai_bang_v1_6_v2');
const captured = resolve('artifacts/cai_bang_v1_6_v2');
const snapshot = (page: Page) =>
  page.evaluate<{
    sessionId: string;
    state: {
      players: Record<
        string,
        { x: number; y: number; fx: number; fy: number; pose: string }
      >;
    };
  }>('window.__VOLAM__.snapshot()');
const presentation = (page: Page) =>
  page.evaluate<{
    actors: Array<{ id: string; animation: string; frame: string }>;
  }>('window.__VOLAM__.presentation()');
async function enter(page: Page, defer = false) {
  await joinWaiting(page, 'Art Review');
  if (!defer) {
    await startTogether([page]);
    // Sample art outside enemy detection range so hurt cannot replace a short attack.
    await page.keyboard.down('ArrowLeft');
    try {
      await expect
        .poll(async () => {
          const s = await snapshot(page);
          return s.state.players[s.sessionId]!.x;
        })
        .toBeLessThan(560);
    } finally {
      await page.keyboard.up('ArrowLeft');
    }
  }
}

test('Cái Bang real match: four facing walk/idle/staff poses at normal 2x display', async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  mkdirSync(evidence, { recursive: true });
  mkdirSync(captured, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const log: unknown[] = [];
  for (const [direction, key] of [
    ['down', 'ArrowDown'],
    ['left', 'ArrowLeft'],
    ['right', 'ArrowRight'],
    ['up', 'ArrowUp'],
  ] as const) {
    await enter(page);
    const state = await snapshot(page);
    const actor = async () =>
      (await presentation(page)).actors.find((a) => a.id === state.sessionId)!;
    await page.keyboard.down(key);
    await expect
      .poll(async () => (await actor()).animation)
      .toBe(`hero_cai_bang:walk:${direction}`);
    const first = (await actor()).frame;
    await expect.poll(async () => (await actor()).frame).not.toBe(first);
    await page.screenshot({
      path: resolve(evidence, `walk_${direction}_1280x720.png`),
    });
    await page.keyboard.up(key);
    await expect
      .poll(async () => (await actor()).animation)
      .toBe(`hero_cai_bang:idle:${direction}`);
    await page.screenshot({
      path: resolve(evidence, `idle_${direction}_1280x720.png`),
    });
    await page.keyboard.press('KeyA');
    await expect
      .poll(async () => (await actor()).animation, { intervals: [10, 20, 20] })
      .toBe(`hero_cai_bang:basic_attack:${direction}`);
    await page.waitForTimeout(80);
    await page.screenshot({
      path: resolve(evidence, `attack_${direction}_1280x720.png`),
    });
    const after = await snapshot(page);
    expect(after.state.players[state.sessionId]).toBeDefined();
    log.push({
      direction,
      after: after.state.players[state.sessionId],
      rendered: await actor(),
    });
  }
  // A fresh room captures the candidate with normal gameplay HUD/environment.
  await enter(page);
  await page.screenshot({ path: resolve(evidence, 'gameplay_1280x720.png') });
  await page
    .locator('#game canvas')
    .screenshot({ path: resolve(evidence, 'canvas_2x.png') });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: resolve(evidence, 'gameplay_1920x1080.png') });
  expect(errors).toEqual([]);
  writeFileSync(
    resolve(evidence, 'match-capture.json'),
    JSON.stringify(
      { viewport: '1280x720 and 1920x1080', errors, facings: log },
      null,
      2,
    ),
  );
  copyFileSync(
    resolve(evidence, 'gameplay_1280x720.png'),
    info.outputPath('gameplay.png'),
  );
});

test('Cái Bang Phaser animation preview loops both styles and twenty-four authored tags', async ({
  browser,
}) => {
  test.setTimeout(45_000);
  mkdirSync(captured, { recursive: true });
  mkdirSync(evidence, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 960, height: 1040 },
    recordVideo: { dir: captured, size: { width: 960, height: 1040 } },
  });
  const page = await context.newPage();
  const video = page.video()!;
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?artPreview=1&caiBangReview=1');
  await expect(page.locator('#scene-status')).toHaveAttribute(
    'data-ready',
    'true',
  );
  const read = () =>
    page.evaluate<{
      ready: boolean;
      sprites: Array<{ animation: string; frame: string; total: number }>;
    }>('window.__VOLAM__.presentation()');
  const initial = await read();
  expect(initial.ready).toBe(true);
  expect(initial.sprites).toHaveLength(24);
  expect(new Set(initial.sprites.map((sprite) => sprite.animation)).size).toBe(
    24,
  );
  const observed = new Map<string, Set<string>>();
  for (let i = 0; i < 140; i++) {
    for (const sprite of (await read()).sprites) {
      const set = observed.get(sprite.animation) ?? new Set<string>();
      set.add(sprite.frame);
      observed.set(sprite.animation, set);
    }
    await page.waitForTimeout(40);
  }
  for (const sprite of initial.sprites)
    expect(observed.get(sprite.animation)?.size, sprite.animation).toBe(
      sprite.total,
    );
  await page
    .locator('#game canvas')
    .screenshot({ path: resolve(evidence, 'phaser_animation_gallery.png') });
  expect(errors).toEqual([]);
  writeFileSync(
    resolve(evidence, 'animation-capture.json'),
    JSON.stringify(
      {
        errors,
        observations: 140,
        capture: 'continuous Playwright WebM video, 960x1040',
        observed: Object.fromEntries(
          [...observed].map(([key, frames]) => [key, [...frames]]),
        ),
      },
      null,
      2,
    ),
  );
  await context.close();
  await video.saveAs(resolve(evidence, 'phaser_animation_preview.webm'));
});

test('Chưởng normal selection uses unarmed walk, idle and palm art in four directions', async ({
  page,
}) => {
  test.setTimeout(60_000);
  mkdirSync(evidence, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const captures: unknown[] = [];
  for (const [direction, key] of [
    ['down', 'ArrowDown'],
    ['left', 'ArrowLeft'],
    ['right', 'ArrowRight'],
    ['up', 'ArrowUp'],
  ] as const) {
    await enter(page);
    const state = await snapshot(page);
    const actor = async () =>
      (await presentation(page)).actors.find((a) => a.id === state.sessionId)!;
    await page.locator('[data-menu=skills]').first().click();
    await page.getByLabel('Normal attack').selectOption('cai_bang_chuong');
    await page.getByRole('button', { name: 'Close menu', exact: true }).click();
    await expect
      .poll(async () => (await actor()).animation)
      .toContain('hero_cai_bang_chuong:');
    await expect(page.locator('#viewport')).toHaveAttribute(
      'data-basic-style',
      'chuong',
    );
    await expect(page.locator('#slot-a .pixel-icon')).toHaveClass(/icon-palm/);
    await page.keyboard.down(key);
    await expect
      .poll(async () => (await actor()).animation)
      .toBe(`hero_cai_bang_chuong:walk:${direction}`);
    const first = (await actor()).frame;
    await expect.poll(async () => (await actor()).frame).not.toBe(first);
    await page.screenshot({
      path: resolve(evidence, `chuong_walk_${direction}_1280x720.png`),
    });
    await page.keyboard.up(key);
    await expect
      .poll(async () => (await actor()).animation)
      .toBe(`hero_cai_bang_chuong:idle:${direction}`);
    await page.screenshot({
      path: resolve(evidence, `chuong_idle_${direction}_1280x720.png`),
    });
    await page.keyboard.press('KeyA');
    await expect
      .poll(async () => (await actor()).animation, { intervals: [10, 20, 20] })
      .toMatch(/^hero_cai_bang_chuong:basic_attack:/);
    await page.waitForTimeout(80);
    await page.screenshot({
      path: resolve(evidence, `chuong_attack_after_${direction}_1280x720.png`),
    });
    const attackState = await snapshot(page);
    const hero = attackState.state.players[state.sessionId]!;
    const attackFacing =
      Math.abs(hero.fx) >= Math.abs(hero.fy)
        ? hero.fx < 0
          ? 'left'
          : 'right'
        : hero.fy < 0
          ? 'up'
          : 'down';
    // A live enemy can apply hurt during screenshot capture; facing still follows the server.
    expect((await actor()).animation.split(':').at(-1)).toBe(attackFacing);
    captures.push({ movement: direction, hero, rendered: await actor() });
    if (direction === 'right') {
      await page.locator('[data-menu=skills]').first().click();
      await page.getByLabel('Normal attack').selectOption('cai_bang_bong');
      await page
        .getByRole('button', { name: 'Close menu', exact: true })
        .click();
      await expect
        .poll(async () => (await actor()).animation)
        .toContain('hero_cai_bang:');
      await expect(page.locator('#viewport')).toHaveAttribute(
        'data-basic-style',
        'bong',
      );
    }
  }
  expect(errors).toEqual([]);
  writeFileSync(
    resolve(evidence, 'chuong-capture.json'),
    JSON.stringify({ errors, captures }, null, 2),
  );
});
test('six Cái Bang players remain readable at normal gameplay zoom', async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const contexts = await Promise.all(
    Array.from({ length: 6 }, (_, i) =>
      browser.newContext({
        viewport:
          i === 0 ? { width: 1280, height: 720 } : { width: 960, height: 600 },
      }),
    ),
  );
  const errors: string[] = [];
  try {
    const pages = await Promise.all(
      contexts.map((context) => context.newPage()),
    );
    for (const page of pages)
      page.on('pageerror', (error) => errors.push(error.message));
    await enter(pages[0]!, true);
    const roomId = await pages[0]!.evaluate<string>(
      'window.__VOLAM__.snapshot().roomId',
    );
    for (let i = 1; i < pages.length; i++) {
      const page = pages[i]!;
      await joinWaiting(page, `Cai Bang ${i + 1}`, roomId);
    }
    await startTogether(pages);
    const targets = [
      [800, 800],
      [740, 750],
      [800, 720],
      [860, 750],
      [740, 830],
      [860, 830],
    ];
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]!;
      for (const [axis, negative, positive] of [
        ['x', 'ArrowLeft', 'ArrowRight'],
        ['y', 'ArrowUp', 'ArrowDown'],
      ] as const) {
        const target = targets[i]![axis === 'x' ? 0 : 1]!;
        const current = async () => {
          const state = await snapshot(page);
          return state.state.players[state.sessionId]![axis];
        };
        // Short feedback-controlled taps tolerate six-page/CDP latency and overshoot.
        for (let attempt = 0; attempt < 40; attempt++) {
          const value = await current();
          if (Math.abs(value - target) < 12) break;
          const key = value < target ? positive : negative;
          await page.keyboard.down(key);
          await page.waitForTimeout(
            Math.min(120, Math.max(25, Math.abs(value - target) * 5 - 30)),
          );
          await page.keyboard.up(key);
          // Wait for authoritative idle before measuring another correction;
          // stale movement patches can otherwise make the feedback oscillate.
          await expect
            .poll(async () => {
              const s = await snapshot(page);
              return s.state.players[s.sessionId]!.pose;
            })
            .not.toBe('walk');
        }
        expect(Math.abs((await current()) - target)).toBeLessThan(18);
      }
    }
    await pages[0]!.waitForTimeout(200);
    await expect
      .poll(
        async () =>
          Object.keys((await snapshot(pages[0]!)).state.players).length,
      )
      .toBe(6);
    await pages[0]!.screenshot({
      path: resolve(evidence, 'six_players_1280x720.png'),
    });
    expect(
      (await presentation(pages[0]!)).actors.filter((actor) =>
        actor.animation.startsWith('hero_cai_bang:'),
      ),
    ).toHaveLength(6);
    expect(errors).toEqual([]);
    writeFileSync(
      resolve(evidence, 'six-player-capture.json'),
      JSON.stringify(
        {
          snapshot: await snapshot(pages[0]!),
          presentation: await presentation(pages[0]!),
          errors,
        },
        null,
        2,
      ),
    );
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
