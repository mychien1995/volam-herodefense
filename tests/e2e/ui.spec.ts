import { joinWaiting, startTogether } from './pregame-helper.js';
import { test, expect, type Page } from '@playwright/test';
interface Snapshot {
  sessionId: string;
  roomId: string;
  state: {
    tick: number;
    players: Record<
      string,
      {
        x: number;
        y: number;
        hp: number;
        mana: number;
        gold: number;
        xp: number;
        basicCooldown: number;
        basicId: string;
        lastSequence: number;
        build?: { enabled: boolean };
      }
    >;
  };
  events: Array<{ kind: string; sourceId: string }>;
}
const read = async (page: Page): Promise<Snapshot> =>
  page.evaluate('window.__VOLAM__.snapshot()');
const hero = async (page: Page) => {
  const s = await read(page);
  return s.state.players[s.sessionId]!;
};
async function enter(
  page: Page,
  name: string,
  room?: string,
  defer = false,
): Promise<void> {
  await joinWaiting(page, name, room);
  if (!defer) await startTogether([page]);
}

async function open(page: Page, menu: string): Promise<void> {
  if (!(await page.locator(`[data-menu="${menu}"]`).count()))
    await page.locator('[data-menu="settings"]').click();
  await page.locator(`[data-menu="${menu}"]`).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
}
async function inViewport(page: Page, selector: string): Promise<void> {
  const box = await page.locator(selector).boundingBox();
  const view = page.viewportSize()!;
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(view.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(view.height + 1);
}
for (const size of [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
  { width: 900, height: 640 },
]) {
  test(`world and in-game menus fit ${size.width}x${size.height}`, async ({
    browser,
  }, info) => {
    test.setTimeout(60000);
    const context = await browser.newContext({ viewport: size });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    try {
      await enter(page, 'Thanh Phong');
      const view = await page.locator('#viewport').boundingBox();
      expect(view).toEqual({ x: 0, y: 0, ...size });
      const canvas = await page.locator('#game canvas').boundingBox();
      expect(canvas!.width).toBeGreaterThanOrEqual(size.width);
      expect(canvas!.height).toBeGreaterThanOrEqual(size.height);
      expect(
        await page.evaluate(
          () =>
            document.body.scrollWidth === innerWidth &&
            document.body.scrollHeight === innerHeight,
        ),
      ).toBe(true);
      await inViewport(page, '.hero-hud');
      await inViewport(page, '.hotbar');
      await inViewport(page, '.system-buttons');
      await inViewport(page, '.bag-cluster');
      await expect(page.locator('.minimap')).toHaveCount(0);
      await page.screenshot({ path: info.outputPath('hub.png') });
      const gold = (await hero(page)).gold;
      for (const menu of [
        'inventory',
        'merchant',
        'dungeons',
        'skills',
        'party',
        'pvp',
      ]) {
        await open(page, menu);
        await inViewport(page, '#game-dialog');
        if (await page.locator('#dialog-actions').count())
          await inViewport(page, '#dialog-actions');
        await expect(
          page.getByRole('button', { name: 'Close menu', exact: true }),
        ).toBeVisible();
        if (menu === 'inventory') {
          await expect(page.locator('.equipment-slot')).toHaveCount(4);
          await expect(page.locator('.bag-grid button')).toHaveCount(12);
          await expect(
            page.getByRole('button', { name: 'Equip', exact: true }),
          ).toBeDisabled();
        }
        if (menu === 'merchant') {
          await expect(
            page.getByRole('button', {
              name: 'Buy · unavailable',
              exact: true,
            }),
          ).toBeDisabled();
          await page.getByRole('tab', { name: 'Chế tạo' }).click();
          await expect(
            page.getByRole('button', {
              name: 'Craft · unavailable',
              exact: true,
            }),
          ).toBeDisabled();
          await page.getByRole('tab', { name: 'Cửa hàng' }).click();
        }
        if (menu === 'dungeons')
          await expect(
            page.getByRole('button', { name: 'Enter dungeon', exact: true }),
          ).toBeEnabled();
        await page.screenshot({ path: info.outputPath(`${menu}.png`) });
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toBeHidden();
        await expect(page.locator('#game canvas')).toBeFocused();
      }
      expect((await hero(page)).gold).toBe(gold);
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}
test('menus release held movement, trap focus and preserve live two-client simulation', async ({
  browser,
}, info) => {
  const ca = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    }),
    cb = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const a = await ca.newPage(),
    b = await cb.newPage();
  try {
    await enter(a, 'Trúc Lâm', undefined, true);
    await enter(b, 'Đồng đội', (await read(a)).roomId, true);
    await startTogether([a, b]);
    const progressed = !!(await hero(a)).build?.enabled;
    if (progressed) {
      // M3B starts with one earned point, rather than the historical two free
      // M1 skills. Learn Q through the real UI before testing input recovery.
      await open(a, 'skills');
      await a.locator('#loadout-q').selectOption('hoa_van_chuong');
      await a.locator('#apply-loadout').click();
      await expect(a.locator('#slot-q')).toHaveAttribute(
        'data-skill-id',
        'hoa_van_chuong',
      );
      await a.locator('[data-upgrade=hoa_van_chuong]').click();
      await expect(a.locator('#available-points')).toHaveText('0');
      await a.keyboard.press('Escape');
    }
    await expect(a.getByTestId('player-count')).toHaveText('2 / 6');
    const start = await hero(a);
    await a.keyboard.down('ArrowDown');
    await expect
      .poll(async () => (await hero(a)).y)
      .toBeGreaterThan(start.y + 5);
    await open(a, 'inventory');
    await a.waitForTimeout(160);
    const stopped = await hero(a);
    const before = await read(a);
    const attacks = before.events.filter(
      (e) =>
        e.sourceId === before.sessionId && ['attack', 'cast'].includes(e.kind),
    ).length;
    // Mouse focus, arrow keys and canonical combat keys all belong to the modal.
    for (const key of ['ArrowRight', 'KeyA', 'KeyQ', 'KeyW', 'KeyE', 'KeyR'])
      await a.keyboard.press(key);
    await a.keyboard.up('ArrowDown');
    const otherStart = await hero(b);
    await b.keyboard.down('ArrowLeft');
    await expect
      .poll(async () => (await hero(b)).x)
      .toBeLessThan(otherStart.x - 8);
    await b.keyboard.up('ArrowLeft');
    await expect
      .poll(async () => (await read(a)).state.tick)
      .toBeGreaterThan(before.state.tick + 3);
    expect((await hero(a)).x).toBeCloseTo(stopped.x, 3);
    expect((await hero(a)).y).toBeCloseTo(stopped.y, 3);
    expect((await hero(a)).lastSequence).toBe(stopped.lastSequence);
    expect(
      (await read(a)).events.filter(
        (e) =>
          e.sourceId === before.sessionId &&
          ['attack', 'cast'].includes(e.kind),
      ),
    ).toHaveLength(attacks);
    const bId = (await read(b)).sessionId;
    await expect
      .poll(async () =>
        Math.abs((await read(a)).state.players[bId]!.x - (await hero(b)).x),
      )
      .toBeLessThan(0.01);
    for (let n = 0; n < 4; n++) {
      await a.keyboard.press('Tab');
      expect(
        await a
          .getByRole('dialog')
          .evaluate((el) => el.contains(document.activeElement)),
      ).toBe(true);
    }
    await a.screenshot({ path: info.outputPath('two-clients-menu.png') });
    await a.keyboard.press('Escape');
    await expect(a.locator('#game canvas')).toBeFocused();
    const resumed = await hero(a);
    await a.keyboard.down('ArrowLeft');
    await expect
      .poll(async () => (await hero(a)).x)
      .toBeLessThan(resumed.x - 8);
    await a.keyboard.up('ArrowLeft');
    await expect.poll(async () => (await hero(a)).basicCooldown).toBe(0);
    await a.keyboard.press('KeyA');
    await expect
      .poll(
        async () =>
          (await read(a)).events.filter(
            (e) => e.sourceId === before.sessionId && e.kind === 'attack',
          ).length,
      )
      .toBeGreaterThan(0);
    await a.keyboard.press('KeyQ');
    await a.keyboard.press('KeyW');
    await expect
      .poll(
        async () =>
          (await read(a)).events.filter(
            (e) => e.sourceId === before.sessionId && e.kind === 'cast',
          ).length,
      )
      .toBe(progressed ? 1 : 2);
  } finally {
    await Promise.all([ca.close(), cb.close()]);
  }
});
test('utility menus open and forest art study stays presentation-only', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await enter(page, 'Lữ Khách');
  await page.locator('[data-menu=merchant]').click();
  await expect(page.getByRole('dialog')).toHaveAttribute(
    'data-menu',
    'merchant',
  );
  await page.keyboard.press('Escape');
  await page.locator('[data-menu=dungeons]').click();
  await expect(page.getByRole('dialog')).toHaveAttribute(
    'data-menu',
    'dungeons',
  );
  const before = await read(page);
  await page.keyboard.press('Escape');
  await open(page, 'settings');
  await page.getByRole('button', { name: 'View forest art study' }).click();
  await expect(page.locator('#study-banner')).toBeVisible();
  await page.waitForTimeout(200);
  await page.screenshot({ path: info.outputPath('forest-study.png') });
  await expect
    .poll(async () => (await read(page)).state.tick)
    .toBeGreaterThan(before.state.tick);
  const pos = await hero(page);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('KeyA');
  await page.waitForTimeout(150);
  expect((await hero(page)).x).toBeCloseTo(pos.x, 3);
  expect((await hero(page)).y).toBeCloseTo(pos.y, 3);
  expect((await read(page)).roomId).toBe(before.roomId);
  await page.getByRole('button', { name: 'Return to arena' }).click();
  await expect(page.locator('#study-banner')).toBeHidden();
  await expect(page.locator('#game canvas')).toBeFocused();
  await open(page, 'settings');
  await page.getByRole('button', { name: 'View forest art study' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#study-banner')).toBeHidden();
});
