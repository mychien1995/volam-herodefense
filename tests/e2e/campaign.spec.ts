import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { joinWaiting, startTogether } from './pregame-helper.js';
const snap = (p: Page) =>
  p.evaluate('window.__VOLAM__.snapshot()') as Promise<any>;
const hero = async (p: Page) => {
  const s = await snap(p);
  return s.state.players[s.sessionId];
};
test('fresh campaign heroes see their starter potions and the new XP curve', async ({
  page,
  browser,
}) => {
  const peer = await browser.newContext();
  const b = await peer.newPage();
  const errors: string[] = [];
  for (const p of [page, b]) p.on('pageerror', (e) => errors.push(e.message));
  try {
    await joinWaiting(page, 'Cái Bang mới');
    await joinWaiting(b, 'Võ Đang mới', (await snap(page)).roomId);
    await startTogether([page, b], ['cai_bang_chuong', 'vo_dang']);
    for (const p of [page, b]) {
      await expect(p.locator('#xp-text')).toHaveText('KN 0 / 45');
      await expect(p.locator('[data-potion-resource="hp"] em')).toHaveText('5');
      await expect(p.locator('[data-potion-resource="mp"] em')).toHaveText('5');
      expect((await hero(p)).inventory.potions).toMatchObject({
        hp_small: 5,
        mp_small: 5,
      });
    }

    await enter(page);
    await fixture(page, 'finisher', { id: (await snap(page)).sessionId });
    await page.locator('#game canvas').focus();
    await page.keyboard.press('a');
    // The first-clear pool scales to two players, but only the attacker qualifies.
    await expect.poll(async () => (await hero(page)).xp).toBe(300);
    await expect(page.locator('#hero-level')).toHaveText('4');
    await expect(page.locator('#xp-text')).toHaveText('KN 30 / 180');
    expect((await hero(b)).xp).toBe(0);
    expect(errors).toEqual([]);
  } finally {
    await peer.close();
  }
});
test('campaign HUD formats pearl stats and keeps lives clear of the defense HUD', async ({
  page,
}) => {
  await joinWaiting(page, 'Kiểm tra HUD');
  await startTogether([page]);
  await enter(page);
  const lives = await page.locator('#boss-lives').boundingBox(),
    defense = await page.locator('#defense-hud').boundingBox();
  expect(lives!.y).toBeGreaterThan(defense!.y + defense!.height);
  await fixture(page, 'finisher', { id: (await snap(page)).sessionId });
  await page.locator('#game canvas').focus();
  await page.keyboard.press('a');
  await expect
    .poll(async () => JSON.parse((await hero(page)).inventory.campaign).pearls)
    .toBe(1);
  await expect(page.locator('#hp-text')).toHaveText(/^SL \d+ \/ \d+$/);
  await expect(page.locator('#mp-text')).toHaveText(/^NL \d+ \/ \d+$/);
  await page.setViewportSize({ width: 944, height: 720 });
  await page.getByRole('button', { name: 'Túi đồ', exact: true }).click();
  await expect(page.getByTestId('dragon-pearls')).toContainText(
    'Long Châu 1/8 · +4%',
  );
  await mkdir('docs/evidence/campaign', { recursive: true });
  await page.screenshot({ path: 'docs/evidence/campaign/pearl-inventory.png' });
});
async function fixture(
  p: Page,
  op: string,
  extra: Record<string, string> = {},
) {
  const r = await p.request.post(
    '/__campaign?' +
      new URLSearchParams({ room: (await snap(p)).roomId, op, ...extra }),
  );
  expect(r.ok(), await r.text()).toBe(true);
}
async function enter(p: Page) {
  await p
    .getByRole('button', { name: /Phó Bản/ })
    .first()
    .click();
  await p.locator('[data-destination="co_mo"]').click();
  await p.locator('#enter-dungeon').click();
  await expect.poll(async () => (await hero(p)).zoneId).toBe('co_mo_shared');
  const no = p
    .locator('#boss-party-dialog button')
    .filter({ hasText: /Không|Để sau/ });
  if (await no.isVisible()) await no.click();
}
for (const kind of ['dungeon', 'wave'])
  test(`two Phaser peers complete real ${kind} deaths, vote at 50%, and retry in the same match`, async ({
    browser,
  }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
    ]);
    const [a, b] = (await Promise.all(contexts.map((c) => c.newPage()))) as [
      Page,
      Page,
    ];
    const errors: string[] = [];
    for (const p of [a, b]) p.on('pageerror', (e) => errors.push(e.message));
    try {
      await joinWaiting(a, 'Chiến dịch A');
      await joinWaiting(b, 'Chiến dịch B', (await snap(a)).roomId);
      await startTogether([a, b], ['cai_bang', 'vo_dang']);
      if (kind === 'dungeon') {
        await enter(a);
        await enter(b);
      } else {
        await fixture(a, 'wave');
        await expect
          .poll(
            async () =>
              JSON.parse((await hero(a)).inventory.campaign).retry?.phase,
          )
          .toBe('fighting');
      }
      for (let death = 0; death < 4; death++) {
        await fixture(a, 'arm');
        for (const p of [a, b])
          await expect
            .poll(async () => (await hero(p)).hp)
            .toBeLessThanOrEqual(0);
        if (death < 3)
          for (const p of [a, b])
            await expect
              .poll(async () => (await hero(p)).hp, { timeout: 10000 })
              .toBeGreaterThan(0);
      }
      for (const p of [a, b])
        await expect(p.locator('#boss-retry-dialog')).toBeVisible();
      await expect(a.locator('[data-retry-votes]')).toContainText('0/1');
      await a.keyboard.press('p');
      await a.keyboard.press('Escape');
      await expect(a.locator('#boss-retry-dialog')).toBeVisible();
      const roomId = (await snap(a)).roomId;
      const box = await a.locator('#boss-retry-dialog > section').boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(720);
      await mkdir('docs/evidence/campaign', { recursive: true });
      await a.screenshot({ path: `docs/evidence/campaign/${kind}-retry.png` });
      await a.setViewportSize({ width: 944, height: 720 });
      const narrow = await a
        .locator('#boss-retry-dialog > section')
        .boundingBox();
      expect(narrow!.x + narrow!.width).toBeLessThanOrEqual(944);
      await a.locator('[data-retry-yes]').click();
      await expect(a.locator('[data-retry-yes]')).toBeDisabled();
      await b.locator('[data-retry-no]').click();
      await expect(a.locator('#boss-retry-dialog')).toBeHidden();
      await expect.poll(async () => (await hero(a)).hp).toBeGreaterThan(0);
      await expect
        .poll(
          async () =>
            JSON.parse((await hero(a)).inventory.campaign).retry?.attempt,
        )
        .toBe(2);
      expect((await snap(a)).roomId).toBe(roomId);
      if (kind === 'dungeon') {
        await expect.poll(async () => (await hero(b)).zoneId).toBe('arena');
        await fixture(a, 'finisher', { id: (await snap(a)).sessionId });
        await a.locator('#game canvas').focus();
        await a.keyboard.press('a');
        await expect
          .poll(
            async () => JSON.parse((await hero(a)).inventory.campaign).pearls,
          )
          .toBe(1);
        expect((await hero(b)).xp).toBe(0);
        await a.getByRole('button', { name: 'Túi đồ', exact: true }).click();
        await expect(a.getByTestId('dragon-pearls')).toContainText(
          'Long Châu 1/8 · +4%',
        );
        await a.screenshot({
          path: 'docs/evidence/campaign/pearl-inventory.png',
        });
      } else
        await expect.poll(async () => (await hero(b)).bossSpectator).toBe(true);
      expect(errors).toEqual([]);
    } finally {
      await Promise.all(contexts.map((c) => c.close()));
    }
  });
