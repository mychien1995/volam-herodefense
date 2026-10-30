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
    await b.getByRole('button', { name: 'Leave room', exact: true }).click();
    await expect(b.locator('.pre-title')).toHaveText('Room Browser');
    await expect(a.locator('.pre-players')).not.toContainText('Thiếu Lâm');
    await b.getByLabel('Room code', { exact: true }).fill(id);
    await b.getByRole('button', { name: 'Join by code', exact: true }).click();
    await expect(a.locator('.pre-players')).toContainText('Thiếu Lâm');
    await startTogether([a, b]);
    for (const p of [a, b]) {
      await p.locator('[data-menu=settings]').click();
      await p.locator('[data-menu=party]').first().click();
      await expect(p.getByTestId('player-count')).toHaveText('2 / 6');
    }
    await a.getByRole('button', { name: 'Check connection' }).click();
    await expect(a.locator('#ack')).toHaveText(
      /Server acknowledged check #\d+\. Count: 1\./,
    );
    for (const p of [a, b])
      await expect(
        p.getByTestId('players').locator('li').filter({ hasText: 'Võ Lâm' }),
      ).toContainText('Checks: 1');
    await a.screenshot({ path: testInfo.outputPath('two-clients-a.png') });
    await b.close();
    await expect(a.getByTestId('player-count')).toHaveText('1 / 6');
    expect(errors).toEqual([]);
  } finally {
    await ca.close();
    await cb.close();
  }
});
