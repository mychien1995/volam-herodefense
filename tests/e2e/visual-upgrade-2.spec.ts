import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Review {
  phaser: string;
  canvas: number[];
  viewport: number[];
  zoom: number;
  hero: {
    x: number;
    y: number;
    direction: string;
    frame: string;
    animation: string;
    scale: number;
    pivot: number[];
  };
  seen: string[];
  casts: string[];
  frames: Record<string, number[]>;
  effects: Array<{
    skill: string;
    frame: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
  }>;
  actors: number;
  companionFeet: Array<{ x: number; y: number }>;
  scenery: Array<{ name: string; depth: number }>;
}
const evidence = resolve('assets/reviews/visual-upgrade-2');
const snapshot = (page: Page): Promise<Review> =>
  page.evaluate('window.__VISUAL_UPGRADE__.snapshot()');
async function open(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (response) => {
    if (response.url().includes('/assets/') && response.status() >= 400)
      errors.push(response.url());
  });
  await page.goto('/visual-upgrade-2.html');
  await page.waitForFunction('window.__VISUAL_UPGRADE__?.ready');
  return errors;
}

test('native canvas, four authored walks, menu input and six-character readability', async ({
  page,
  browser,
}) => {
  mkdirSync(evidence, { recursive: true });
  await page.setViewportSize({ width: 1366, height: 768 });
  const errors = await open(page);
  const initial = await snapshot(page);
  expect(initial.canvas).toEqual([1366, 768]);
  expect(initial.phaser).toBe('4.2.1');
  expect(initial.zoom).toBe(1);
  for (const [direction, key] of [
    ['right', 'ArrowRight'],
    ['down', 'ArrowDown'],
    ['left', 'ArrowLeft'],
    ['up', 'ArrowUp'],
  ]) {
    const before = await snapshot(page);
    await page.keyboard.down(key!);
    await expect
      .poll(async () => (await snapshot(page)).hero.direction)
      .toBe(direction);
    await page.waitForTimeout(650);
    await page.keyboard.up(key!);
    await expect
      .poll(async () => (await snapshot(page)).hero.animation)
      .toBe('idle-' + direction);
    const after = await snapshot(page);
    expect(
      Math.hypot(after.hero.x - before.hero.x, after.hero.y - before.hero.y),
    ).toBeGreaterThan(70);
    expect(after.hero.pivot).toEqual([0.5, 0.8]);
    for (let frame = 0; frame < 4; frame++)
      expect(after.seen).toContain(`upgrade-hero:walk_${direction}_${frame}`);
  }
  await page.getByRole('button', { name: 'Bộ chiêu', exact: true }).click();
  const menuStart = await snapshot(page);
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(160);
  await page.keyboard.up('ArrowDown');
  expect((await snapshot(page)).hero.y).toBe(menuStart.hero.y);
  await page.keyboard.press('Escape');
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(30);
  await page.keyboard.up('ArrowDown');
  await expect
    .poll(async () => (await snapshot(page)).hero.animation)
    .toBe('idle-down');
  await page.screenshot({ path: resolve(evidence, 'arena-native-1366.png') });
  await page.getByRole('button', { name: '6 nhân vật', exact: true }).click();
  expect((await snapshot(page)).actors).toBe(6);
  await page.waitForTimeout(600);
  const hotbar = await page.locator('.hotbar').boundingBox();
  for (const feet of (await snapshot(page)).companionFeet) {
    expect(feet.y).toBeLessThan(hotbar!.y);
    expect(feet.y - 88).toBeGreaterThan(0);
  }
  await page.screenshot({
    path: resolve(evidence, 'arena-six-characters.png'),
  });
  const other = await browser.newPage({
    viewport: { width: 960, height: 640 },
  });
  const otherErrors = await open(other);
  expect((await snapshot(other)).canvas).toEqual([960, 640]);
  await other.close();
  expect(errors).toEqual([]);
  expect(otherErrors).toEqual([]);
  writeFileSync(
    resolve(evidence, 'walking-and-layout.json'),
    JSON.stringify(
      {
        initial,
        final: await snapshot(page),
        errors,
        sceneOnly: true,
        networkAcceptance: false,
      },
      null,
      2,
    ),
  );
});

test('all five sword effects show their source cels and release their scene objects', async ({
  page,
}) => {
  mkdirSync(evidence, { recursive: true });
  await page.setViewportSize({ width: 1366, height: 768 });
  const errors = await open(page);
  const ids = [
    'that_tinh_kiem',
    'nhan_kiem_hop_nhat',
    'bat_quai_kiem_tran',
    'toa_sat_bac_do',
    'van_kiem_quy_tong',
  ];
  for (const id of ids) {
    await page.evaluate((id) => {
      const review = (
        window as unknown as { __VISUAL_UPGRADE__: { cast(id: string): void } }
      ).__VISUAL_UPGRADE__;
      review.cast(id);
    }, id);
    await expect
      .poll(async () =>
        (await snapshot(page)).effects.some((effect) => effect.skill === id),
      )
      .toBe(true);
    if (id === 'nhan_kiem_hop_nhat') {
      const first = (await snapshot(page)).effects[0]!;
      await page.waitForTimeout(300);
      const next = (await snapshot(page)).effects[0]!;
      expect(next.vx).toBe(first.vx);
      expect(next.vy).toBe(first.vy);
      expect(next.y).toBeGreaterThan(first.y);
      expect(next.x).toBe(first.x);
    }
    if (id === 'bat_quai_kiem_tran') {
      await page.waitForTimeout(400);
      await page.screenshot({
        path: resolve(evidence, 'bat-quai-kiem-tran.png'),
      });
    }
    await expect
      .poll(async () => (await snapshot(page)).effects.length, {
        timeout: 7000,
      })
      .toBe(0);
    const seen = (await snapshot(page)).seen;
    for (let frame = 0; frame < (id === 'that_tinh_kiem' ? 8 : 4); frame++)
      expect(seen).toContain(`${id}:phase_${frame}`);
  }
  await page.getByRole('button', { name: 'Bộ chiêu', exact: true }).click();
  await page
    .getByRole('button', { name: 'Đổi chiêu ô R', exact: true })
    .click();
  await page.keyboard.press('r');
  expect((await snapshot(page)).casts.at(-1)).toBe('van_kiem_quy_tong');
  expect(errors).toEqual([]);
  writeFileSync(
    resolve(evidence, 'skills-frames.json'),
    JSON.stringify(
      {
        state: await snapshot(page),
        errors,
        sceneOnly: true,
        combatAcceptance: false,
      },
      null,
      2,
    ),
  );
});
