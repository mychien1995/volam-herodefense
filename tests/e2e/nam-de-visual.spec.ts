import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { joinWaiting, startTogether } from './pregame-helper.js';
test('ring raster visibility and geometry', async ({ page }) => {
  await joinWaiting(page, 'Ring QA');
  await startTogether([page]);
  const s = (await page.evaluate('window.__VOLAM__.snapshot()')) as {
    roomId: string;
  };
  const fixture = async (mode: string, extra = '') => {
    const r = await page.request.post(
      '/__nam_de?room=' + s.roomId + '&mode=' + mode + extra,
    );
    expect(r.ok()).toBe(true);
  };
  await fixture('gate');
  await fixture('park');
  await fixture('cast', '&ability=nam_de_aura');
  await page.waitForTimeout(200);
  await page.screenshot({
    path: 'docs/evidence/nam-de-runtime/ring-early.png',
  });
  const early = (await page.evaluate(
    'window.__VOLAM__.presentation().namDe.sprites.find(s=>s.frame.startsWith("plain_ring"))',
  )) as {
    x: number;
    y: number;
    width: number;
    visible: boolean;
    renderFlags: number;
  };
  expect(early.visible).toBe(true);
  expect(early.renderFlags).toBe(15);
  await page.waitForTimeout(500);
  const middle = (await page.evaluate(
    'window.__VOLAM__.presentation().namDe.sprites.find(s=>s.frame.startsWith("plain_ring"))',
  )) as typeof early;
  expect([middle.x, middle.y]).toEqual([early.x, early.y]);
  expect(middle.width).toBeGreaterThan(early.width);
  await page.screenshot({
    path: 'docs/evidence/nam-de-runtime/ring-middle.png',
  });
  writeFileSync(
    'docs/evidence/nam-de-runtime/ring-diagnostic.json',
    JSON.stringify(
      await page.evaluate('window.__VOLAM__.presentation()'),
      null,
      2,
    ),
  );
});
