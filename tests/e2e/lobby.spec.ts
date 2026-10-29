import { expect, test } from '@playwright/test';

test('two separate browser contexts share a room, check count and leave', async ({
  browser,
}, testInfo) => {
  const contextA = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const contextB = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const a = await contextA.newPage();
  const b = await contextB.newPage();
  const errors: string[] = [];
  for (const page of [a, b]) {
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
  }
  try {
    await Promise.all([a.goto('/'), b.goto('/')]);
    for (const page of [a, b]) {
      await expect(page.locator('#game canvas')).toBeVisible();
      await expect(page.locator('#scene-status')).toHaveAttribute(
        'data-ready',
        'true',
      );
    }
    await a.screenshot({
      path: testInfo.outputPath('before-join.png'),
      fullPage: true,
    });
    await a.getByLabel('Nickname', { exact: true }).fill('Võ Lâm');
    await a.getByRole('button', { name: 'Create room', exact: true }).click();
    await expect(a.getByTestId('status')).toHaveText('Connected');
    const roomId = await a.getByTestId('room-id').innerText();
    expect(roomId).not.toBe('—');
    await b.getByLabel('Nickname', { exact: true }).fill('Thiếu Lâm');
    await b.getByLabel('Room ID', { exact: false }).fill(roomId);
    await b.getByRole('button', { name: 'Join room', exact: true }).click();
    for (const page of [a, b]) {
      await expect(page.getByTestId('player-count')).toHaveText('2 / 6');
      await expect(page.getByTestId('players')).toContainText('Võ Lâm');
      await expect(page.getByTestId('players')).toContainText('Thiếu Lâm');
    }
    await a.getByRole('button', { name: 'Check connection' }).click();
    await expect(a.locator('#ack')).toHaveText(
      'Server acknowledged check #1. Count: 1.',
    );
    for (const page of [a, b])
      await expect(
        page.getByTestId('players').locator('li').filter({ hasText: 'Võ Lâm' }),
      ).toContainText('Checks: 1');
    await a.screenshot({
      path: testInfo.outputPath('two-clients-a.png'),
      fullPage: true,
    });
    await b.screenshot({
      path: testInfo.outputPath('two-clients-b.png'),
      fullPage: true,
    });
    await b.getByRole('button', { name: 'Leave', exact: true }).click();
    await expect(b.getByTestId('status')).toContainText('Disconnected');
    await expect(a.getByTestId('player-count')).toHaveText('1 / 6');
    await expect(a.getByTestId('players')).not.toContainText('Thiếu Lâm');
    // Rejoin, then close the tab abruptly: the remaining browser must lose the seat.
    await b.getByRole('button', { name: 'Join room', exact: true }).click();
    await expect(a.getByTestId('player-count')).toHaveText('2 / 6');
    await b.close();
    await expect(a.getByTestId('player-count')).toHaveText('1 / 6');
    expect(errors).toEqual([]);
  } finally {
    await Promise.all([contextA.close(), contextB.close()]);
  }
});
