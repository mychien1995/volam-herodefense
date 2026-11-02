import { chromium, expect } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const output = fileURLToPath(
  new URL('../docs/evidence/tay-doc/', import.meta.url),
);
await mkdir(output, { recursive: true });
import { joinWaiting, startTogether } from '../tests/e2e/pregame-helper.js';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await joinWaiting(
    page,
    'UI Tây Độc',
    undefined,
    'http://127.0.0.1:5398/?debug=1',
  );
  await startTogether([page], ['cai_bang']);
  const checks = [];
  for (const menu of ['inventory', 'merchant', 'dungeons']) {
    await page.locator(`[data-menu="${menu}"]`).first().click();
    await expect(page.locator('#game-dialog')).toBeVisible();
    const viewport = (await page.locator('#viewport').boundingBox())!,
      dialog = (await page.locator('#game-dialog').boundingBox())!;
    expect(dialog.x).toBeGreaterThanOrEqual(viewport.x);
    expect(dialog.y).toBeGreaterThanOrEqual(viewport.y);
    expect(dialog.x + dialog.width).toBeLessThanOrEqual(
      viewport.x + viewport.width + 1,
    );
    expect(dialog.y + dialog.height).toBeLessThanOrEqual(
      viewport.y + viewport.height + 1,
    );
    checks.push({ menu, viewport, dialog });
    if (menu === 'inventory')
      await page.screenshot({ path: output + 'inventory-overlay.png' });
    await page.keyboard.press('Escape');
    await expect(page.locator('#game-dialog')).toBeHidden();
  }
  await page.locator('#game canvas').focus();
  const before: any = await page.evaluate('window.__VOLAM__.snapshot()');
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowLeft');
  const after: any = await page.evaluate('window.__VOLAM__.snapshot()');
  const h = before.state.players[before.sessionId],
    h2 = after.state.players[after.sessionId];
  expect(Math.hypot(h.x - h2.x, h.y - h2.y)).toBeGreaterThan(1);
  await page.keyboard.press('a');
  await page.keyboard.press('q');
  const presentation: any = await page.evaluate(
    'window.__VOLAM__.presentation()',
  );
  expect(presentation.zoom).toBe(1);
  expect(presentation.rotation).toBe(0);
  expect(errors).toEqual([]);
  await writeFile(
    output + 'menu-smoke.json',
    JSON.stringify(
      {
        status: 'PASS',
        url: page.url(),
        checks,
        movement: { before: h, after: h2 },
        phase: presentation.tayDoc.phase,
        zoom: presentation.zoom,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    'PASS: actual DEV gameplay, inventory/shop/dungeon overlays fit the game viewport; Escape and movement/A/Q resume; no page errors.',
  );
} finally {
  await context.close();
  await browser.close();
}
