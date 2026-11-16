import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { joinWaiting, startTogether } from './pregame-helper.js';
import { m1Config } from '@volam/game-data';

test.use({ viewport: { width: 1280, height: 800 } });

test('home links, three guide tabs and saved settings work before joining', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(
    page.getByRole('navigation', { name: 'Menu chính' }).getByRole('button'),
  ).toHaveCount(3);
  await expect(page.locator('#pre-nickname')).toHaveCount(0);
  await page.getByRole('button', { name: 'Hướng dẫn' }).click();
  const tabs = page.getByRole('tab');
  await expect(tabs).toHaveCount(3);
  await expect(page.getByRole('tabpanel')).toContainText('Long Hồn Thần Thạch');
  await expect(
    page.getByAltText('Các hiệp khách bảo vệ Tượng Võ Thần'),
  ).toHaveJSProperty('complete', true);
  await page.screenshot({ path: info.outputPath('huong-dan.png') });
  await tabs.nth(0).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toBeFocused();
  const school = page.locator('#guide-school');
  const ids = await school
    .locator('option')
    .evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value),
    );
  for (const id of ids) {
    await school.selectOption(id);
    await expect(page.locator('.guide-branches > section')).toHaveCount(2);
    await expect(page.locator('.guide-skill').first()).toBeVisible();
  }
  await school.selectOption('vo_dang');
  await page
    .getByRole('tabpanel')
    .getByText('Thất Tinh Kiếm', { exact: true })
    .click();
  await expect(
    page
      .locator('.guide-skill[open]')
      .getByText('Bậc 4 · cấp 7', { exact: true }),
  ).toBeVisible();
  await tabs.nth(2).click();
  await expect(page.locator('#guide-boss option')).toHaveCount(9);
  await page.locator('#guide-boss').selectOption('vuong');
  await expect(
    page.getByText('Thất Tuyệt Lôi Âm', { exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Cài đặt' }).click();
  await page.getByRole('slider', { name: 'Âm lượng' }).focus();
  await page.keyboard.press('End');
  await page.getByRole('switch', { name: 'Tự đánh thường' }).check();
  await page.getByRole('radio', { name: 'Chuột' }).check();
  await expect(page.locator('#pregame output')).toHaveText('100%');
  await expect(page.locator('label[for=pre-volume]')).toHaveCSS(
    'color',
    'rgb(54, 40, 28)',
  );
  await page.screenshot({ path: info.outputPath('cai-dat.png') });
  await page.reload();
  await page.getByRole('button', { name: 'Cài đặt' }).click();
  await expect(page.getByRole('switch')).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Chuột' })).toBeChecked();
  await expect(page.locator('#pregame output')).toHaveText('100%');
  await expect(page.locator('#match-music')).toHaveJSProperty('volume', 1);
  await page.getByRole('button', { name: 'Quay lại' }).click();
  await page.getByRole('button', { name: 'Vào game' }).click();
  await expect(page.locator('#pre-nickname')).toBeFocused();
  await expect(
    page.getByRole('button', { name: 'Quay lại', exact: true }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});

type Point = { x: number; y: number };
type Body = Point & { hp: number; lastSequence: number };
interface Snapshot {
  sessionId: string;
  roomId: string;
  state: {
    tick: number;
    players: Record<string, Body>;
    creeps: Record<string, Body>;
  };
  events: { kind: string; sourceId: string; targetId: string }[];
}
const snapshot = (page: Page) =>
  page.evaluate<Snapshot>('window.__VOLAM__.snapshot()');
const self = async (page: Page) => {
  const state = await snapshot(page);
  return state.state.players[state.sessionId]!;
};

test('O + Q learns a skill and hotbar icons show live tooltips', async ({
  browser,
}, info) => {
  test.setTimeout(240_000);
  const host = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  const peer = await browser.newPage();
  const errors: string[] = [];
  host.on('pageerror', (error) => errors.push(error.message));
  peer.on('pageerror', (error) => errors.push(error.message));
  try {
    await joinWaiting(host, 'Skill Hotkey', undefined, '/?debug=1', 90_000);
    const { roomId, sessionId } = await snapshot(host);
    await joinWaiting(peer, 'Skill Observer', roomId, '/?debug=1', 90_000);
    await startTogether(
      [host, peer],
      ['cai_bang_chuong', 'vo_dang_quyen'],
      90_000,
    );
    await host.bringToFront();
    await expect(host.locator('#fixed-skill-points')).toContainText(
      'Giữ O + QWERT',
    );
    const q = host.locator('#slot-q');
    const qTip = q.getByRole('tooltip');
    const definitions = m1Config.progression!.skills;
    await expect(qTip).toBeHidden();
    await q.locator('.pixel-icon').hover();
    await expect(qTip).toBeVisible();
    await expect(qTip).toContainText('Hỏa Vân Chưởng');
    await expect(qTip).toContainText(
      definitions['hoa_van_chuong']!.descriptionVi,
    );
    await expect(qTip).toContainText('Chưa học · Cấp 1');
    await expect(qTip.locator('.skill-tip-stats')).toBeHidden();

    await host.keyboard.down('KeyO');
    await host.keyboard.press('KeyQ');
    await host.keyboard.up('KeyO');
    await expect(q.locator('.skill-rank')).toHaveText('1');
    await expect(qTip).toContainText('Bậc 1');
    const stats = qTip.locator('.skill-tip-stats');
    await expect(stats).toContainText('Sát thương cơ bản · 18 mỗi phát');
    await expect(stats).toContainText('Nội lực · 18');
    await expect(stats).toContainText('Hồi chiêu cơ bản · 3 giây');
    await host.screenshot({ path: info.outputPath('skill-tooltip.png') });
    const casts = async () =>
      (await snapshot(peer)).events.filter(
        (event) => event.kind === 'cast' && event.sourceId === sessionId,
      ).length;
    expect(await casts()).toBe(0);
    await host.keyboard.press('KeyQ');
    await expect.poll(casts).toBe(1);
    await expect(qTip).toContainText('Đang hồi chiêu');

    const w = host.locator('#slot-w');
    await w.locator('.pixel-icon').hover();
    await expect(qTip).toBeHidden();
    await expect(w.getByRole('tooltip')).toContainText(
      definitions['cuong_long_loan_vu']!.descriptionVi,
    );
    await host.mouse.move(640, 400);
    await expect(w.getByRole('tooltip')).toBeHidden();

    await host.setViewportSize({ width: 520, height: 600 });
    const t = host.locator('#slot-t');
    await t.locator('.pixel-icon').hover();
    await expect(t.getByRole('tooltip')).toContainText('Chưa học · Cấp 6');
    const bounds = await t.getByRole('tooltip').boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(520);
    expect(errors).toEqual([]);
  } finally {
    await host.close();
    await peer.close();
  }
});

async function screenPoint(page: Page, position: Point, actorId?: string) {
  return page.evaluate(
    ({ position, actorId }) => {
      const canvas = document.querySelector<HTMLCanvasElement>('#game canvas')!;
      const rect = canvas.getBoundingClientRect();
      const { cameraMatrix, actors } = (window as any).__VOLAM__.presentation();
      const target = actorId
        ? ((actors as Array<Point & { id: string }>).find(
            (actor) => actor.id === actorId,
          ) ?? position)
        : position;
      return {
        x:
          rect.left +
          ((target.x - cameraMatrix.origin.x) /
            cameraMatrix.step /
            canvas.width) *
            rect.width,
        y:
          rect.top +
          ((target.y - cameraMatrix.origin.y - (actorId ? 12 : 0)) /
            cameraMatrix.step /
            canvas.height) *
            rect.height,
      };
    },
    { position, actorId },
  );
}

test('right-click moves on both clients, shows the ground marker and attacks without moving arrows', async ({
  page,
  browser,
}, info) => {
  test.setTimeout(100_000);
  await page.addInitScript(() =>
    localStorage.setItem(
      'volam:preferences',
      JSON.stringify({ volume: 0, controls: 'mouse', autoBasic: false }),
    ),
  );
  await joinWaiting(page, 'Chuột');
  const { roomId } = await snapshot(page);
  const peer = await browser.newPage();
  try {
    await joinWaiting(peer, 'Bàn phím', roomId);
    await startTogether(
      [page, peer],
      ['cai_bang_chuong', 'cai_bang_bong'],
      35_000,
    );
    await page.bringToFront();
    await expect(page.locator('#scene-status')).toHaveAttribute(
      'data-ready',
      'true',
      { timeout: 35_000 },
    );
    await expect(page.locator('#game canvas')).toHaveCSS('cursor', /url\(/);
    const before = await self(page);
    await page.keyboard.press('ArrowRight', { delay: 240 });
    expect(await self(page)).toMatchObject({
      x: before.x,
      y: before.y,
      lastSequence: before.lastSequence,
    });
    const { sessionId } = await snapshot(page);
    const destination = { x: before.x - 90, y: before.y + 37 };
    const click = await screenPoint(page, destination);
    await page.evaluate(() => {
      const world = document.querySelector('#game')!;
      const canvas = world.querySelector('canvas')!;
      const bridge = window as any;
      bridge.moveMarkerFrame = new Promise((resolve, reject) => {
        const deadline = window.setTimeout(
          () => reject(new Error('No rendered click marker')),
          4_000,
        );
        world.addEventListener(
          'pointerdown',
          () => {
            const marker = bridge.__VOLAM__.presentation().moveMarker;
            bridge.__VOLAM__.afterRender(() => {
              clearTimeout(deadline);
              resolve({ marker, png: canvas.toDataURL('image/png') });
            });
          },
          { once: true },
        );
      });
    });
    await page.mouse.click(click.x, click.y, { button: 'right' });
    const moveMarker = () =>
      page.evaluate<
        { x: number; y: number; scale: number; alpha: number } | undefined
      >('window.__VOLAM__.presentation().moveMarker');
    const { marker: first, png } = await page.evaluate<{
      marker?: { x: number; y: number; scale: number; alpha: number };
      png: string;
    }>('window.moveMarkerFrame');
    expect(first).toBeDefined();
    expect(Math.abs(first!.x - destination.x)).toBeLessThan(3);
    expect(Math.abs(first!.y - destination.y)).toBeLessThan(3);
    await mkdir(info.outputDir, { recursive: true });
    await writeFile(
      info.outputPath('diem-di-chuyen.png'),
      Buffer.from(png.split(',')[1]!, 'base64'),
    );
    const later = await moveMarker();
    expect(
      !later || (later.alpha < first!.alpha && later.scale > first!.scale),
    ).toBe(true);
    await expect.poll(moveMarker).toBeUndefined();
    await expect
      .poll(async () =>
        Math.hypot(
          (await self(page)).x - destination.x,
          (await self(page)).y - destination.y,
        ),
      )
      .toBeLessThan(2);
    await expect
      .poll(async () => (await snapshot(peer)).state.players[sessionId]!.x)
      .toBeLessThan(before.x - 85);

    // Walk within the ranged branch's reach using actual clicks and attack a rendered actor.
    const current = await self(page);
    const [id, enemy] = Object.entries(
      (await snapshot(page)).state.creeps,
    ).sort(
      ([, a], [, b]) =>
        Math.hypot(a.x - current.x, a.y - current.y) -
        Math.hypot(b.x - current.x, b.y - current.y),
    )[0]!;
    const basic = m1Config.basics['cai_bang_chuong']!;
    if (basic.effect.mode !== 'projectile')
      throw new Error('Expected Chưởng to be ranged');
    if (
      Math.hypot(enemy.x - current.x, enemy.y - current.y) >
      basic.effect.range - 30
    ) {
      const closer = await screenPoint(page, {
        x: (enemy.x + current.x) / 2,
        y: (enemy.y + current.y) / 2,
      });
      await page.mouse.click(closer.x, closer.y, { button: 'right' });
    }
    await expect
      .poll(async () => {
        const s = await snapshot(page);
        const target = s.state.creeps[id]!;
        const h = s.state.players[s.sessionId]!;
        return Math.hypot(h.x - target.x, h.y - target.y);
      })
      .toBeLessThan(basic.effect.range - 8);
    const target = await screenPoint(
      page,
      (await snapshot(page)).state.creeps[id]!,
      id,
    );
    await page.mouse.click(target.x, target.y, { button: 'right' });
    await expect
      .poll(async () =>
        (await snapshot(page)).events.some(
          (e) => e.kind === 'attack' && e.sourceId === sessionId,
        ),
      )
      .toBe(true);
    await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
    await expect(page.locator('.settings-controls')).toContainText(
      'Chuột phải xuống đất · Di chuyển',
    );
    const dialog = page.locator('#game-dialog');
    await dialog.getByRole('radio', { name: 'Bàn phím' }).check();
    await expect(page.locator('#viewport')).not.toHaveAttribute(
      'data-mouse-controls',
      '',
    );
    await page.locator('#close-menu').click();
    const oldX = (await self(page)).x;
    await page.keyboard.press('ArrowLeft', { delay: 160 });
    await expect.poll(async () => (await self(page)).x).toBeLessThan(oldX - 2);
  } finally {
    await peer.close();
  }
});

test('in-match settings apply immediately and persist for the next visit', async ({
  page,
}, info) => {
  test.setTimeout(80_000);
  await joinWaiting(page, 'Auto');
  await startTogether([page], ['cai_bang_chuong'], 35_000);
  await expect(page.locator('#scene-status')).toHaveAttribute(
    'data-ready',
    'true',
  );
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  const dialog = page.locator('#game-dialog');
  const auto = dialog.getByRole('switch', { name: 'Tự đánh thường' });
  await expect(auto).not.toBeChecked();
  await dialog.getByRole('slider', { name: 'Âm lượng' }).focus();
  await page.keyboard.press('End');
  await expect(page.locator('#match-music')).toHaveJSProperty('volume', 1);
  await dialog.getByRole('radio', { name: 'Chuột' }).check();
  await expect(page.locator('#game canvas')).toHaveCSS('cursor', /url\(/);
  await auto.check();
  await expect
    .poll(async () => {
      const s = await snapshot(page);
      return s.events.some(
        (e) =>
          e.kind === 'hit' &&
          e.sourceId === s.sessionId &&
          e.targetId.startsWith('creep_'),
      );
    })
    .toBe(true);
  await page.screenshot({ path: info.outputPath('cai-dat-trong-tran.png') });

  const prior = (await self(page)).lastSequence;
  await auto.uncheck();
  await expect
    .poll(async () => (await self(page)).lastSequence)
    .toBeGreaterThan(prior);
  const stopped = await snapshot(page);
  const attacks = (s: Snapshot) =>
    s.events.filter(
      (event) => event.kind === 'attack' && event.sourceId === s.sessionId,
    ).length;
  await expect
    .poll(async () => (await snapshot(page)).state.tick)
    .toBeGreaterThan(stopped.state.tick + 30);
  expect(attacks(await snapshot(page))).toBe(attacks(stopped));

  await page.reload();
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await expect(
    page.getByRole('switch', { name: 'Tự đánh thường' }),
  ).not.toBeChecked();
  await expect(page.getByRole('radio', { name: 'Chuột' })).toBeChecked();
  await expect(page.locator('#pregame output')).toHaveText('100%');
});
