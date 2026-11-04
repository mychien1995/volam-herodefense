import { test, expect, type Page } from '@playwright/test';
import { joinWaiting } from './pregame-helper.js';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const out = resolve('artifacts/small-gameplay-pregame');
const snapshot = (p: Page) =>
  p.evaluate<{
    roomId: string;
    sessionId: string;
    state: {
      phase: string;
      tick: number;
      matchElapsedMs: number;
      players: Record<string, { schoolId: string; level: number }>;
    };
  }>('window.__VOLAM__.snapshot()');
test('dedicated selection after host start synchronizes different schools', async ({
  browser,
}) => {
  test.setTimeout(60000);
  mkdirSync(out, { recursive: true });
  const ca = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    }),
    cb = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const a = await ca.newPage(),
    b = await cb.newPage();
  const errors: string[] = [];
  for (const p of [a, b]) p.on('pageerror', (e) => errors.push(e.message));
  try {
    await a.goto('/?debug=1');
    await a.screenshot({ path: resolve(out, '01-landing-1280.png') });
    expect(await a.locator('#pregame input').count()).toBe(1);
    await a.locator('#pre-nickname').fill('Thanh Phong');
    await a.getByRole('button', { name: 'Vào game', exact: true }).click();
    await expect(a.locator('.pre-title')).toHaveText('Danh sách phòng');
    await a.screenshot({ path: resolve(out, '02-browser-1280.png') });
    await a.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
    await expect(a.locator('.pre-title')).toHaveText('Phòng chờ');
    const id = (await snapshot(a)).roomId;
    await joinWaiting(b, 'Bạch Vân', id);
    await expect(a.locator('#pregame .pre-players')).toContainText('Bạch Vân');
    await expect(a.locator('#pregame button[data-school]')).toHaveCount(0);
    await expect(
      b.getByRole('button', { name: 'Bắt đầu', exact: true }),
    ).toBeDisabled();
    expect((await snapshot(a)).state.tick).toBe(0);
    await a.screenshot({ path: resolve(out, '03-waiting-1280.png') });
    await expect(a.locator('#pregame .pre-players li')).toHaveCount(2, {
      timeout: 15000,
    });
    await a.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    for (const p of [a, b])
      await expect(p.locator('.pre-title')).toHaveText('Chọn môn phái');
    await a.locator('#pregame button[data-school=cai_bang]').click();
    await expect(
      a.locator('#pregame button[data-school=cai_bang]'),
    ).toHaveAttribute('aria-pressed', 'true');
    await a.locator('#pregame button[data-school=vo_dang]').click();
    await a.locator('[data-branch=vo_dang_quyen]').click();
    await a.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(b.getByTestId('selection-ready')).toHaveText(
      '1/2 đã sẵn sàng',
    );
    expect((await snapshot(b)).state.matchElapsedMs).toBe(0);
    await b.locator('#pregame button[data-school=thieu_lam]').click();
    await expect(
      b.locator('#pregame button[data-school=thieu_lam]'),
    ).toHaveAttribute('aria-pressed', 'true');
    await a.screenshot({ path: resolve(out, '04-school-selection-1280.png') });
    await b.screenshot({ path: resolve(out, '04-school-selection-1920.png') });
    await b.locator('[data-branch=thieu_lam_quyen]').click();
    await b.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    for (const p of [a, b]) await expect(p.locator('#pregame')).toBeHidden();
    const sa = await snapshot(a),
      sb = await snapshot(b);
    expect(sa.roomId).toBe(sb.roomId);
    expect(sa.state.phase).toBe('IN_GAME');
    expect(sa.state.players[sa.sessionId]!.schoolId).toBe('vo_dang');
    expect(sb.state.players[sb.sessionId]!.schoolId).toBe('thieu_lam');
    expect(sa.state.players[sa.sessionId]!.level).toBe(1);
    await expect
      .poll(async () => (await snapshot(a)).state.matchElapsedMs)
      .toBeGreaterThan(0);
    await a.screenshot({ path: resolve(out, '05-same-arena-1280.png') });
    expect(errors).toEqual([]);
  } catch (error) {
    console.log(await a.locator('#pregame').innerText(), errors);
    throw error;
  } finally {
    await ca.close();
    await cb.close();
  }
});

test('live room list, blank nickname, join error and waiting-host disconnect', async ({
  browser,
}) => {
  const ca = await browser.newContext(),
    cb = await browser.newContext();
  const a = await ca.newPage(),
    b = await cb.newPage();
  try {
    await joinWaiting(a, 'Host');
    const id = (await snapshot(a)).roomId;
    await b.goto('/?debug=1');
    await b.getByRole('button', { name: 'Vào game', exact: true }).click();
    await expect(b.locator('#pre-nickname')).toBeVisible();
    await b.locator('#pre-nickname').fill('Guest');
    await b.getByRole('button', { name: 'Vào game', exact: true }).click();
    await expect(b.locator('tbody tr').filter({ hasText: id })).toContainText(
      '1/6',
    );
    await b
      .locator('#pregame')
      .getByLabel('Mã phòng', { exact: true })
      .fill('no-such-room');
    await b.getByRole('button', { name: 'Vào bằng mã', exact: true }).click();
    await expect(b.locator('.pre-error')).toContainText('Không thể kết nối');
    await b
      .locator('tbody tr')
      .filter({ hasText: id })
      .getByRole('button', { name: 'Vào phòng', exact: true })
      .click();
    await expect(b.locator('.pre-title')).toHaveText('Phòng chờ');
    await a.getByRole('button', { name: 'Rời phòng', exact: true }).click();
    await expect(b.locator('#pregame')).toContainText('Host đã mất kết nối');
    await expect(
      b.getByRole('button', { name: 'Bắt đầu', exact: true }),
    ).toBeDisabled();
  } finally {
    await ca.close();
    await cb.close();
  }
});

test('selection disconnect visibly holds the room without automatic choice', async ({
  browser,
}) => {
  const ca = await browser.newContext(),
    cb = await browser.newContext();
  const a = await ca.newPage(),
    b = await cb.newPage();
  try {
    await joinWaiting(a, 'Host');
    await joinWaiting(b, 'Guest', (await snapshot(a)).roomId);
    await expect(a.locator('#pregame .pre-players li')).toHaveCount(2, {
      timeout: 15000,
    });
    await a.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    await expect(b.locator('.pre-title')).toHaveText('Chọn môn phái');
    await b.close();
    await expect(a.locator('.pre-warning')).toContainText(
      'người chơi mất kết nối',
    );
    await a.locator('#pregame button[data-school=thien_son]').click();
    await expect(
      a.locator('#pregame button[data-school=thien_son]'),
    ).toHaveAttribute('aria-pressed', 'true');
    await a.locator('[data-branch=thien_son_phien]').click();
    await a.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(a.getByTestId('selection-ready')).toHaveText(
      '1/2 đã sẵn sàng',
    );
    expect((await snapshot(a)).state.phase).toBe('SCHOOL_SELECTION');
    expect((await snapshot(a)).state.tick).toBe(0);
  } finally {
    await ca.close();
    await cb.close();
  }
});
