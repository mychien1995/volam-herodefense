import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

interface Effect {
  frame: string;
  x: number;
  y: number;
  depth: number;
}

interface Preview {
  facing: string;
  x: number;
  y: number;
  frame: string;
  seen: string[];
  effects: Effect[];
  depth: number;
}

const observe = (page: Page) =>
  page.evaluate<Preview>('window.__SHAOLIN_DAO_PREVIEW__()');

test('Thiếu Lâm Đao artwork plays in Phaser', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(response.url());
  });
  await page.goto('/shaolin-dao-preview.html?debug=1');
  await expect(page.locator('#visual-game canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'A Đao khí' })).toBeEnabled();
  await expect.poll(async () => (await observe(page)).frame).toBe('idle_right');

  for (const [key, facing] of [
    ['ArrowDown', 'down'],
    ['ArrowUp', 'up'],
    ['ArrowLeft', 'left'],
    ['ArrowRight', 'right'],
  ]) {
    await page.keyboard.down(key!);
    try {
      await expect
        .poll(async () => (await observe(page)).seen)
        .toEqual(
          expect.arrayContaining([`walk_1_${facing}`, `walk_2_${facing}`]),
        );
    } finally {
      await page.keyboard.up(key!);
    }
    await expect
      .poll(async () => (await observe(page)).frame)
      .toBe(`idle_${facing}`);
  }

  await page.keyboard.press('a');
  const crescent = () =>
    page.evaluate<Effect[]>(
      `window.__SHAOLIN_DAO_PREVIEW__().effects.filter((effect) => effect.frame === 'crescent')`,
    );
  await expect.poll(crescent, { intervals: [30, 40] }).toHaveLength(1);
  const first = (await crescent())[0]!;
  await expect
    .poll(async () => (await crescent())[0]?.x, { intervals: [25, 35] })
    .toBeGreaterThan(first.x + 20);
  expect((await crescent())[0]?.y).toBe(first.y);
  await expect.poll(crescent).toHaveLength(0);

  await page.keyboard.press('q');
  await expect
    .poll(
      async () => {
        const { effects, depth, x } = await observe(page);
        return (
          effects.some(
            (effect) =>
              effect.frame === 'arhat' &&
              effect.depth < depth &&
              effect.x - x >= -16 &&
              effect.x < x,
          ) &&
          effects.some(
            (effect) =>
              effect.frame === 'sweep' &&
              effect.depth > depth &&
              effect.x - x === 88,
          )
        );
      },
      { intervals: [35, 40] },
    )
    .toBe(true);
  await expect.poll(async () => (await observe(page)).effects).toHaveLength(0);

  const ultimate = page.getByRole('button', { name: 'T Như Lai Thiên Diệp' });
  await expect.poll(async () => (await observe(page)).frame).toBe('idle_right');
  await ultimate.click();
  await expect(ultimate).toHaveAttribute('aria-pressed', 'true');
  const awakened = await observe(page);
  expect(awakened.frame).toBe('lotus_right');
  expect(awakened.effects).toEqual([
    expect.objectContaining({ frame: 'lotus_ring', depth: awakened.depth - 1 }),
  ]);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await observe(page)).frame).toBe('lotus_left');
  await ultimate.click();
  await expect(ultimate).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(async () => (await observe(page)).effects).toHaveLength(0);
  expect(errors).toEqual([]);
});
