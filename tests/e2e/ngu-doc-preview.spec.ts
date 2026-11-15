import { expect, test, type Page } from '@playwright/test';

type Review = {
  branch: string;
  frame: string;
  direction: string;
  x: number;
  y: number;
  cameraZoom: number;
  q: boolean;
  e: boolean;
  effects: string[];
  summons: { type: string; frame: string }[];
  stages: { name: string; time: number }[];
};

async function state(page: Page): Promise<Review> {
  return page.evaluate(() =>
    (
      window as unknown as { __nguDocPreview: { read(): Review } }
    ).__nguDocPreview.read(),
  );
}

async function boot(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.text().includes('Texture frame missing'))
      errors.push(msg.text());
  });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/ngu-doc-preview.html');
  await page.waitForFunction(() => '__nguDocPreview' in window);
  return errors;
}

test('both designs walk in four directions at native scale and Bích Cổ previews all cues', async ({
  page,
}, info) => {
  const errors = await boot(page);
  expect(
    await page.locator('canvas').evaluate((node: HTMLCanvasElement) => {
      const { width, height } = node.getBoundingClientRect();
      return [node.width, node.height, width, height];
    }),
  ).toEqual([1366, 768, 1366, 768]);
  expect((await state(page)).cameraZoom).toBe(1);
  for (const branch of ['bich-co', 'am-linh']) {
    await page.locator('[data-branch="' + branch + '"]').click();
    for (const [key, direction] of [
      ['ArrowLeft', 'left'],
      ['ArrowRight', 'right'],
      ['ArrowUp', 'up'],
      ['ArrowDown', 'down'],
    ]) {
      const start = await state(page);
      await page.keyboard.down(key!);
      await expect
        .poll(async () => (await state(page)).frame)
        .toMatch('walk_' + direction);
      const live = (await state(page)).frame;
      await expect.poll(async () => (await state(page)).frame).not.toBe(live);
      await page.keyboard.up(key!);
      await expect
        .poll(async () => (await state(page)).frame)
        .toBe('idle_' + direction + '_0');
      const after = await state(page);
      expect(Math.hypot(after.x - start.x, after.y - start.y)).toBeGreaterThan(
        3,
      );
    }
  }

  await page.getByRole('button', { name: 'Bích Cổ Tà Hiệp' }).click();
  await page.keyboard.press('p');
  await expect.poll(async () => (await state(page)).effects).toContain('soul');
  await page.keyboard.press('a');
  await expect.poll(async () => (await state(page)).effects).toContain('palm');
  await page.keyboard.press('q');
  expect(
    (await state(page)).effects.filter((effect) => effect === 'flame'),
  ).toHaveLength(2);
  await page.keyboard.press('a');
  await expect
    .poll(async () => (await state(page)).effects)
    .toContain('toxic_palm');
  await expect
    .poll(async () => (await state(page)).effects)
    .toContain('ankles');

  await page.keyboard.press('w');
  await expect
    .poll(async () => (await state(page)).stages.map((stage) => stage.name))
    .toContain('W:boss');
  await page.locator('#target').selectOption('creep');
  await page.keyboard.press('w');
  await expect
    .poll(async () => (await state(page)).stages.map((stage) => stage.name))
    .toContain('W:creep');
  await page.locator('#target').selectOption('none');
  await page.keyboard.press('w');
  await expect
    .poll(async () => (await state(page)).stages.map((stage) => stage.name))
    .toContain('W:front');
  await page.locator('#target').selectOption('boss');
  await page.keyboard.press('e');
  await page.keyboard.press('r');
  await expect.poll(async () => (await state(page)).effects).toContain('armor');
  await page.keyboard.press('t');
  await expect
    .poll(
      async () =>
        (await state(page)).effects.filter((effect) => effect === 'grasp')
          .length,
    )
    .toBeGreaterThanOrEqual(3);
  await page.screenshot({ path: info.outputPath('bich-co-1366.png') });
  await page.keyboard.press('e');
  await page.keyboard.press('q');
  expect((await state(page)).effects).not.toContain('flame');
  await expect.poll(async () => (await state(page)).e).toBe(false);
  expect((await state(page)).effects).not.toContain('ring');
  expect(
    (await state(page)).stages.filter((stage) => stage.name === 'bich-co:T'),
  ).toHaveLength(1);
  await page.locator('#reset').click();
  expect((await state(page)).effects).toEqual([]);
  expect(errors).toEqual([]);
});

test('Âm Linh previews cương thi on W, zombie on R, the three second mark and all Reaper actions', async ({
  page,
}, info) => {
  const errors = await boot(page);
  await page.getByRole('button', { name: 'Âm Linh Cổ Sư' }).click();
  await expect(page.locator('[data-skill=R]')).toContainText('Vô Hình Ma Cổ');
  for (const count of [1, 2, 3, 4]) {
    await page.locator('#reset').click();
    await page.locator('#rank').selectOption(String(count));
    await page.keyboard.press('w');
    await expect
      .poll(async () =>
        (await state(page)).summons.map((minion) => minion.type),
      )
      .toEqual(Array(count).fill('jiangshi'));
  }
  await expect
    .poll(async () => (await state(page)).summons.map((minion) => minion.frame))
    .toContain('jiangshi_attack');
  await page.screenshot({ path: info.outputPath('am-linh-yeu-co-1366.png') });
  await page.locator('#reset').click();
  await page.keyboard.press('a');
  await expect
    .poll(async () => (await state(page)).effects)
    .toContain('staff_bolt');
  expect((await state(page)).summons).toEqual([]);
  await page.keyboard.press('q');
  await expect
    .poll(
      async () =>
        (await state(page)).effects.filter((frame) => frame === 'grub').length,
    )
    .toBe(4);
  await page.keyboard.press('r');
  await expect
    .poll(async () => (await state(page)).summons.map((minion) => minion.type))
    .toEqual(['zombie']);
  await expect
    .poll(async () => (await state(page)).summons.map((minion) => minion.frame))
    .toContain('zombie_attack');
  await page.screenshot({
    path: info.outputPath('am-linh-vo-hinh-ma-co-1366.png'),
  });
  await page.keyboard.press('e');
  await expect
    .poll(async () => (await state(page)).effects)
    .toContain('countdown');
  await expect.poll(async () => (await state(page)).effects).toContain('stun');
  const { stages } = await state(page);
  const elapsed =
    stages.find((stage) => stage.name === 'E:burst')!.time -
    stages.find((stage) => stage.name === 'E:attached')!.time;
  expect(elapsed).toBeGreaterThanOrEqual(2975);
  expect(elapsed).toBeLessThan(3210);
  await page.locator('#reset').click();
  await page.keyboard.press('t');
  expect((await state(page)).frame).toBe('ritual_down_0');
  await expect
    .poll(async () => (await state(page)).summons.map((minion) => minion.type))
    .toEqual(['reaper']);
  await expect
    .poll(async () => (await state(page)).effects)
    .toContain('scythe_arc');
  await page.screenshot({ path: info.outputPath('am-linh-thi-quy-1366.png') });
  await expect
    .poll(async () => (await state(page)).effects)
    .toContain('poison_wave');
  await expect
    .poll(async () => (await state(page)).stages.map((stage) => stage.name))
    .toContain('T:slam-impact');
  const reaper = (await state(page)).stages;
  expect(reaper.filter((stage) => stage.name === 'am-linh:T')).toHaveLength(1);
  const report = { tamHinhCoAttachedToBurstMs: elapsed, reaper };
  await info.attach('frame-observations', {
    body: JSON.stringify(report, null, 2),
    contentType: 'application/json',
  });
  await expect
    .poll(async () => (await state(page)).summons.length, { timeout: 7000 })
    .toBe(0);
  expect((await state(page)).effects).toEqual([]);
  expect(errors).toEqual([]);
});
