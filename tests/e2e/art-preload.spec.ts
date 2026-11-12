import { expect, test } from '@playwright/test';
import { joinWaiting, startTogether } from './pregame-helper.js';

test('arena art starts at room join and a failed dungeon pack can be retried', async ({
  page,
}) => {
  test.setTimeout(100_000);
  const desertManifest = '/assets/desert/manifest.json';
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', (request) =>
    requests.push(new URL(request.url()).pathname),
  );
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?debug=1', { waitUntil: 'networkidle' });
  await expect(page.locator('#pre-nickname')).toBeVisible();
  await expect(page.locator('#game canvas')).toHaveCount(0);
  expect(
    requests.some((path) => /\/(phaser\.esm|arena-scene)-/.test(path)),
  ).toBe(false);
  expect(requests).not.toContain('/assets/renovation-v2/arena-ground.png');

  await joinWaiting(page, 'Preload');
  await startTogether([page], ['cai_bang_bong'], 35_000);
  await expect(page.locator('#scene-status')).toHaveAttribute(
    'data-ready',
    'true',
  );
  expect(requests).toContain('/assets/renovation-v2/arena-ground.png');
  expect(requests).not.toContain('/assets/renovation-v1/forest-ground.png');
  expect(requests).not.toContain(desertManifest);
  expect(requests).not.toContain(
    '/assets/renovation-v1/chu_ba_thong-ground.png',
  );

  const authoritativeZone = () =>
    page.evaluate<string>(`(() => {
    const { sessionId, state } = window.__VOLAM__.snapshot();
    return state.players[sessionId].zoneId;
  })()`);
  const enterDesert = async () => {
    await page.getByRole('button', { name: 'Phó Bản', exact: true }).click();
    await page.locator('[data-destination=desert]').click();
    await page.locator('#enter-dungeon').click();
  };

  await page.route(`**${desertManifest}`, (route) => route.abort());
  await enterDesert();
  await expect(page.locator('#feedback')).toContainText(
    'Không tải được hình ảnh khu vực',
    { timeout: 25_000 },
  );
  expect(await authoritativeZone()).toBe('arena');

  await page.unroute(`**${desertManifest}`);
  const manifest = page.waitForResponse(
    (response) => response.url().endsWith(desertManifest) && response.ok(),
  );
  await enterDesert();
  await manifest;
  await expect
    .poll(authoritativeZone, { timeout: 25_000 })
    .toMatch(/^desert_private_/);
  const zone = await authoritativeZone();
  await expect
    .poll(() => page.evaluate('window.__VOLAM__.presentation().zoneId'))
    .toBe(zone);
  await expect
    .poll(() =>
      page.evaluate<number>(`window.__VOLAM__.presentation().actors.length`),
    )
    .toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
