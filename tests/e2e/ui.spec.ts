import { joinWaiting, startTogether } from './pregame-helper.js';
import { test, expect, type Page, type BrowserContext } from '@playwright/test';
// Explicit PNGs and state assertions provide UI evidence; avoid large DOM trace
// archives when closing six manually-created game contexts.
test.use({ trace: 'off' });
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
  { width: 944, height: 466 },
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
      await inViewport(page, '#slot-z');
      await expect(page.locator('#slot-z')).toHaveAttribute(
        'aria-label',
        /chưa mở/,
      );
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
          page.getByRole('button', { name: 'Đóng menu', exact: true }),
        ).toBeVisible();
        if (menu === 'inventory') {
          await expect(page.locator('.equipment-slot')).toHaveCount(4);
          await expect(page.locator('.bag-grid button')).toHaveCount(12);
          await expect(
            page.getByRole('button', { name: 'Trang bị', exact: true }),
          ).toBeDisabled();
        }
        if (menu === 'merchant') {
          await expect(page.locator('[data-ui-action=buy]')).toBeDisabled();
          await page.getByRole('tab', { name: 'Chế tạo' }).click();
          await expect(
            page.getByRole('button', {
              name: 'Chế tạo · Chưa mở',
              exact: true,
            }),
          ).toBeDisabled();
          await page.getByRole('tab', { name: 'Bình dược' }).click();
          await page
            .locator('[data-ui-action="potion"][data-value="potion_mp"]')
            .click();
          await expect(page.locator('.item-detail')).toContainText('Bình mana');
          await expect(page.locator('.item-detail')).toContainText('5 giây');
          await expect(
            page.locator('[data-ui-action=buy-potion]'),
          ).toBeDisabled();
          await page
            .getByRole('tab', { name: 'Trang bị', exact: true })
            .click();
          await expect(page.locator('.item-catalogue button')).toHaveCount(4);
          await page
            .locator('[data-ui-action="gear"][data-value="hat"]')
            .click();
          await expect(page.locator('.item-detail')).toContainText(
            'Hồi máu · Hồi mana',
          );
          await expect(page.locator('#game-dialog')).not.toContainText('400');
          for (const image of await page.locator('#item-menu img').all())
            await expect
              .poll(() =>
                image.evaluate((img) => (img as HTMLImageElement).naturalWidth),
              )
              .toBeGreaterThan(0);
        }
        if (menu === 'dungeons')
          await expect(
            page.getByRole('button', { name: 'Vào phó bản', exact: true }),
          ).toBeEnabled();
        expect(await page.locator('#game-dialog').innerText()).not.toMatch(
          /\b(Empty|Preview|Unavailable|Equip|Drop|Sell|Room|Nickname|Settings|Quit|Ready|Catalogue|pending)\b/,
        );
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
  test.setTimeout(60000);
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
      await a.locator('#skill-branch').selectOption('cai_bang_chuong');
      await expect(a.locator('#slot-q')).toHaveAttribute(
        'data-skill-id',
        'hoa_van_chuong',
      );
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
    for (const key of [
      'ArrowRight',
      'KeyA',
      'KeyQ',
      'KeyW',
      'KeyE',
      'KeyR',
      'KeyZ',
    ])
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
  await page.getByRole('button', { name: 'Xem bản mẫu rừng' }).click();
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
  await page.getByRole('button', { name: 'Về đấu trường' }).click();
  await expect(page.locator('#study-banner')).toBeHidden();
  await expect(page.locator('#game canvas')).toBeFocused();
  await open(page, 'settings');
  await page.getByRole('button', { name: 'Xem bản mẫu rừng' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#study-banner')).toBeHidden();
});

test('merchant exposes the twelve approved branches without inventing transactions', async ({
  page,
}) => {
  await enter(page, 'Thợ Rèn');
  const before = await hero(page);
  await open(page, 'merchant');
  await page.getByRole('tab', { name: 'Chế tạo', exact: true }).click();
  for (const [slot, material, branch] of [
    ['boots', 'Ngọc Uyên Ương', 'Thanh Tâm'],
    ['armor', 'Đại Kim Chiến Giáp', 'Phản đòn'],
    ['hat', 'Đại Hồ Lô', 'Hồi phục'],
    ['weapon', 'Kim Luân', 'Đánh lan'],
  ]) {
    await page
      .locator(`[data-ui-action="recipe"][data-value="${slot}"]`)
      .click();
    await expect(page.locator('.item-recipe')).toContainText(material!);
    await expect(page.locator('.item-branches button')).toHaveCount(3);
    await expect(page.locator('.item-branches')).toContainText(branch!);
    await page.locator('[data-ui-action="branch"][data-value="2"]').click();
    await expect(
      page.locator('[data-ui-action="branch"][data-value="2"]'),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('button', { name: 'Chế tạo · Chưa mở', exact: true }),
    ).toBeDisabled();
  }
  await expect(page.locator('.item-branches')).toContainText('Xuyên giáp');
  await expect(page.locator('.item-branches')).not.toContainText('stun');
  await page.getByRole('tab', { name: 'Trang bị', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Bình dược' })).toBeFocused();
  expect((await hero(page)).gold).toBe(before.gold);
  await page.keyboard.press('Escape');
  await expect(page.locator('#game canvas')).toBeFocused();
});

test('six-player inventory HUD preserves natural combat and peer synchronization', async ({
  browser,
}, info) => {
  test.setTimeout(180000);
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  const errors: string[] = [];
  try {
    let room: string | undefined;
    for (let i = 0; i < 6; i++) {
      const context = await browser.newContext({
        viewport:
          i === 0 ? { width: 1920, height: 1080 } : { width: 944, height: 466 },
      });
      contexts.push(context);
      const page = await context.newPage();
      pages.push(page);
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/?debug=1');
      await page.locator('#pre-nickname').fill(`Đồng Đội ${i + 1}`);
      await page.getByRole('button', { name: 'Vào game', exact: true }).click();
      // The existing six-player art QA joins through the room list: a refresh
      // can replace the code form between filling and submitting it.
      if (room)
        await page.locator(`[data-action="join"][data-room="${room}"]`).click();
      else
        await page
          .getByRole('button', { name: 'Tạo phòng', exact: true })
          .click();
      await expect
        .poll(
          async () => {
            const state = await read(page);
            return !!state.roomId && !!state.state?.players?.[state.sessionId];
          },
          { timeout: 30000 },
        )
        .toBe(true);
      const joined = await read(page);
      room ??= joined.roomId;
      expect(joined.roomId).toBe(room);
      console.log(`[UI6] joined ${i + 1}/6 in ${room}`);
    }
    await startTogether(pages, [], 30000);
    const a = pages[0]!;
    await expect(a.getByTestId('player-count')).toHaveText('6 / 6');
    for (const page of pages) {
      await open(page, 'skills');
      await page.locator('#skill-branch').selectOption('cai_bang_chuong');
      await page.keyboard.press('Escape');
    }
    // Real keyboard attacks, server hit events and shared HP, with no state mutation fixture.
    for (let i = 0; i < 8; i++) {
      await Promise.all(pages.map((page) => page.keyboard.press('KeyA')));
      if (i === 0)
        await Promise.all(pages.map((page) => page.keyboard.press('KeyQ')));
      await a.waitForTimeout(450);
    }
    await expect
      .poll(async () =>
        (await read(a)).events.some((event) => event.kind === 'hit'),
      )
      .toBe(true);
    // Walk the real party into a compact 3x2 formation for normal-zoom readability.
    // The normal spawn line otherwise extends beyond the host's narrow viewport.
    const anchor = await hero(a);
    await Promise.all(
      pages.map(async (page, i) => {
        for (const [axis, target, negative, positive] of [
          ['x', anchor.x + ((i % 3) - 1) * 100, 'ArrowLeft', 'ArrowRight'],
          ['y', anchor.y + Math.floor(i / 3) * 100, 'ArrowUp', 'ArrowDown'],
        ] as const) {
          const difference = target - (await hero(page))[axis];
          if (Math.abs(difference) > 8)
            await page.keyboard.press(difference < 0 ? negative : positive, {
              delay: Math.round((Math.abs(difference) / 160) * 1000),
            });
          await expect
            .poll(async () => Math.abs((await hero(page))[axis] - target))
            .toBeLessThan(30);
        }
      }),
    );
    const observation = await a.evaluate<{
      zoom: number;
      camera: { x: number; y: number };
      actors: Array<{
        id: string;
        x: number;
        y: number;
        frame: string;
        playing: boolean;
      }>;
    }>('window.__VOLAM__.presentation()');
    const playerIds = Object.keys((await read(a)).state.players);
    const visible = observation.actors.filter((actor) =>
      playerIds.includes(actor.id),
    );
    expect(visible).toHaveLength(6);
    expect(observation.zoom).toBe(1);
    for (const actor of visible) {
      expect(actor.x - observation.camera.x).toBeGreaterThan(40);
      expect(actor.x - observation.camera.x).toBeLessThan(1880);
      expect(actor.y - observation.camera.y).toBeGreaterThan(140);
      expect(actor.y - observation.camera.y).toBeLessThan(940);
    }
    await info.attach('six-player-observation', {
      body: JSON.stringify({
        zoom: observation.zoom,
        actors: visible,
        hits: (await read(a)).events.filter((event) => event.kind === 'hit')
          .length,
      }),
      contentType: 'application/json',
    });
    await a.screenshot({ path: info.outputPath('six-player-arena.png') });
    await open(a, 'inventory');
    await expect(a.locator('.equipment-slot')).toHaveCount(4);
    await inViewport(a, '#game-dialog');
    const tick = (await read(a)).state.tick;
    const peer = pages[5]!,
      id = (await read(peer)).sessionId;
    const position = await hero(peer);
    await peer.keyboard.press('ArrowDown', { delay: 200 });
    await expect
      .poll(async () => (await read(a)).state.players[id]!.y)
      .toBeGreaterThan(position.y + 5);
    await expect
      .poll(async () => (await read(a)).state.tick)
      .toBeGreaterThan(tick + 3);
    await a.screenshot({ path: info.outputPath('six-player-inventory.png') });
    await a.keyboard.press('Escape');
    await open(a, 'merchant');
    await a.getByRole('tab', { name: 'Chế tạo', exact: true }).click();
    await a.screenshot({ path: info.outputPath('six-player-crafting.png') });
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
