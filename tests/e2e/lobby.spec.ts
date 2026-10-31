import { expect, test } from '@playwright/test';
import { joinWaiting, startTogether } from './pregame-helper.js';

test('two clients share a waiting room, rejoin before start, check connection and leave', async ({
  browser,
}, testInfo) => {
  const ca = await browser.newContext(),
    cb = await browser.newContext();
  const a = await ca.newPage(),
    b = await cb.newPage();
  const errors: string[] = [];
  for (const p of [a, b]) p.on('pageerror', (e) => errors.push(e.message));
  try {
    await joinWaiting(a, 'Võ Lâm');
    const id = await a.evaluate<string>('window.__VOLAM__.snapshot().roomId');
    await joinWaiting(b, 'Thiếu Lâm', id);
    await expect(a.locator('.pre-players')).toContainText('Thiếu Lâm');
    await b.getByRole('button', { name: 'Rời phòng', exact: true }).click();
    await expect(b.locator('.pre-title')).toHaveText('Danh sách phòng');
    await expect(a.locator('.pre-players')).not.toContainText('Thiếu Lâm');
    await b
      .locator('#pregame')
      .getByLabel('Mã phòng', { exact: true })
      .fill(id);
    await b.getByRole('button', { name: 'Vào bằng mã', exact: true }).click();
    await expect(a.locator('.pre-players')).toContainText('Thiếu Lâm');
    await startTogether([a, b]);
    for (const p of [a, b]) {
      await p.locator('[data-menu=settings]').click();
      await p.locator('[data-menu=party]').first().click();
      await expect(p.getByTestId('player-count')).toHaveText('2 / 6');
    }
    await a.getByRole('button', { name: 'Kiểm tra kết nối' }).click();
    await expect(a.locator('#ack')).toHaveText(
      /Server đã nhận kiểm tra #\d+\. Tổng: 1\./,
    );
    for (const p of [a, b])
      await expect(
        p.getByTestId('players').locator('li').filter({ hasText: 'Võ Lâm' }),
      ).toContainText('Lần kiểm tra: 1');
    await a.screenshot({ path: testInfo.outputPath('two-clients-a.png') });
    await b.close();
    await expect(a.getByTestId('player-count')).toHaveText('1 / 6');
    expect(errors).toEqual([]);
  } finally {
    await ca.close();
    await cb.close();
  }
});
