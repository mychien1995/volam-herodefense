import { expect, test, type Page } from '@playwright/test';
import { joinWaiting, startTogether } from './pregame-helper.js';
test.use({ viewport: { width: 1280, height: 720 }, trace: 'off' });
const read = (page: Page) => page.evaluate<any>('window.__VOLAM__.snapshot()');
const hero = async (page: Page) => {
  const state = await read(page);
  return state.state.players[state.sessionId];
};
test('farms real gold, buys auto-equipped gear and uses a purchased potion', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await joinWaiting(page, 'Thương Khách');
  await startTogether([page]);
  await page.getByRole('button', { name: 'Võ Học · P', exact: true }).click();
  await page.locator('#skill-branch').selectOption('cai_bang_chuong');
  await page.keyboard.press('Escape');
  const deadline = Date.now() + 65000;
  while ((await hero(page)).gold < 34 && Date.now() < deadline) {
    await page.keyboard.press('KeyA');
    await page.keyboard.press('KeyQ');
    await page.waitForTimeout(450);
  }
  const before = await hero(page);
  expect(before.gold).toBeGreaterThanOrEqual(34);
  await page.getByRole('button', { name: 'Thương Gia', exact: true }).click();
  await expect(page.locator('[data-ui-action=buy]')).toHaveText(
    'Mua · 30 vàng',
  );
  await page.locator('[data-ui-action=buy]').click();
  await expect
    .poll(async () => (await hero(page)).inventory.levels.weapon)
    .toBe(1);
  expect((await hero(page)).gold).toBe(before.gold - 30);
  expect((await hero(page)).build.stats.attackPower).toBeCloseTo(
    before.build.stats.attackPower + 4,
  );
  await expect(page.locator('[data-ui-action=buy]')).toHaveText(
    'Nâng cấp · 60 vàng',
  );
  await page.getByRole('tab', { name: 'Bình dược', exact: true }).click();
  await expect(page.locator('[data-ui-action=buy-potion]')).toHaveText(
    'Mua bình · 4 vàng',
  );
  await page.locator('[data-ui-action=buy-potion]').click();
  await expect
    .poll(async () => (await hero(page)).inventory.potions.hp_small)
    .toBe(1);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Túi đồ', exact: true }).click();
  await expect(page.locator('.item-equip-0')).toContainText('Cấp 1/5');
  await expect(page.locator('.bag-grid')).toContainText('Bình máu nhỏ');
  await page.screenshot({ path: info.outputPath('purchased-inventory.png') });
  await page.keyboard.press('Escape');
  await expect
    .poll(async () => (await hero(page)).hp)
    .toBeLessThan((await hero(page)).maxHp);
  const injured = await hero(page);
  await page.locator('[data-potion-resource=hp]').click();
  await expect
    .poll(async () => (await hero(page)).inventory.potions.hp_small)
    .toBe(0);
  const healed = await hero(page);
  expect(healed.hp).toBeGreaterThan(injured.hp);
  expect(healed.hp).toBeLessThanOrEqual(healed.maxHp);
  expect(healed.inventory.potionCooldownTicks).toBeGreaterThan(0);
  expect(healed.gold).toBe(before.gold - 34);
  await page.screenshot({ path: info.outputPath('potion-used.png') });
  expect(errors).toEqual([]);
});
