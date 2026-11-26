import { expect, test } from '@playwright/test';
import { observeQa, waitForGameReady } from '../../tools/qa-browser.mjs';

for (const mode of ['test', 'loi-dai', 'defense']) {
  test(`name entered in ${mode} is remembered across reloads and all modes`, async ({
    page,
  }) => {
    await page.goto('/?debug');
    const name = 'Võ Lâm ' + mode;
    if (mode === 'test') {
      await page
        .getByRole('button', { name: 'Phòng test', exact: true })
        .click();
      await page.locator('#practice-nickname').fill(name);
      await page
        .getByRole('button', { name: 'Chọn nhân vật', exact: true })
        .click();
      await expect(page.locator('#practice-ui .school-grid')).toBeVisible();
    } else if (mode === 'loi-dai') {
      await page.getByRole('button', { name: 'Lôi Đài', exact: true }).click();
      await page.locator('#pvp-nickname').fill(name);
      // Submitting the real form also remembers the name before a room code exists.
      await page
        .getByRole('button', { name: 'Vào phòng', exact: true })
        .click();
    } else {
      await page.locator('[data-action=play]').click();
      await page.locator('#pre-nickname').fill(name);
      await page.getByRole('button', { name: 'Vào game', exact: true }).click();
      await expect(page.locator('[data-action=create]')).toBeVisible();
    }
    expect(
      await page.evaluate(() => localStorage.getItem('volam:nickname')),
    ).toBe(name);
    await page.reload();
    await page.getByRole('button', { name: 'Phòng test', exact: true }).click();
    await expect(page.locator('#practice-nickname')).toHaveValue(name);
    await page.locator('[data-practice=back]').click();
    await page.getByRole('button', { name: 'Lôi Đài', exact: true }).click();
    await expect(page.locator('#pvp-nickname')).toHaveValue(name);
    await page.locator('[data-pvp=back]').click();
    await page.locator('[data-action=play]').click();
    await expect(page.locator('#pre-nickname')).toHaveValue(name);
    // A shared-room link on a fresh page also receives the remembered name.
    await page.goto('/?debug&pvp=remembered-room');
    await expect(page.locator('#pvp-nickname')).toHaveValue(name);
  });
}

test('IME skill releases reach the server once and rapid Shift right clicks suppress native menus', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem(
      'volam:preferences',
      JSON.stringify({ controls: 'mouse' }),
    );
  });
  await page.goto('/?debug');
  await page.getByRole('button', { name: 'Phòng test', exact: true }).click();
  await page.locator('#practice-nickname').fill('IME test');
  await page
    .getByRole('button', { name: 'Chọn nhân vật', exact: true })
    .click();
  await page.locator('[data-practice=school][data-school=cai_bang]').click();
  await page
    .locator('[data-practice=branch][data-branch=cai_bang_bong]')
    .click();
  await page
    .getByRole('button', { name: 'Vào phòng test', exact: true })
    .click();
  await waitForGameReady(page, { timeout: 60000 });
  await expect(page.locator('#practice-ui')).toBeHidden();
  await page.locator('#game canvas').focus();
  for (const code of ['KeyW', 'KeyR']) {
    const previous = await page.evaluate(() => {
      const s = (window as any).__VOLAM__.snapshot();
      return s.state.players[s.sessionId].lastSequence;
    });
    await page.evaluate((code) => {
      const canvas = document.querySelector('#game canvas')!;
      canvas.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Process',
          code: '',
          keyCode: 229,
          isComposing: true,
          bubbles: true,
        }),
      );
      canvas.dispatchEvent(
        new KeyboardEvent('keyup', {
          key: code.slice(3).toLowerCase(),
          code,
          bubbles: true,
        }),
      );
    }, code);
    await observeQa(
      page,
      (before) => {
        const s = (window as any).__VOLAM__.snapshot();
        return s.state.players[s.sessionId].lastSequence === before + 1;
      },
      previous,
      { label: `${code} server input receipt` },
    );
  }
  await page.evaluate(() => {
    (window as any).nativeMenus = [];
    document.addEventListener('contextmenu', (event) => {
      (window as any).nativeMenus.push(event.defaultPrevented);
    });
  });
  const canvas = await page.locator('#game canvas').boundingBox();
  if (!canvas) throw new Error('missing game canvas');
  await page.keyboard.down('Shift');
  for (let i = 0; i < 4; i++) {
    await page.mouse.click(
      canvas.x + canvas.width / 2 + i * 5,
      canvas.y + canvas.height / 2,
      { button: 'right' },
    );
  }
  await page.keyboard.up('Shift');
  // HUD siblings previously bypassed the listener on #game.
  await page
    .locator('#slot-w')
    .click({ button: 'right', modifiers: ['Shift'] });
  expect(await page.evaluate(() => (window as any).nativeMenus)).toEqual([
    true,
    true,
    true,
    true,
    true,
  ]);
  expect(errors).toEqual([]);
});
