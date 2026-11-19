import { test, expect } from '@playwright/test';
import { joinWaiting, startAuditTogether } from './pregame-helper.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const evidence = join(
  'docs/evidence/sessions',
  process.env['VOLAM_QA_SESSION'] ?? 'pvp-repair',
  'pvp-repair',
);
test('statue opening stays fully visible in the normal zoomed viewport', async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  const other = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const guest = await other.newPage();
  try {
    await page.setViewportSize({ width: 1280, height: 720 });
    await joinWaiting(page, 'Lời dẫn');
    const id = (await page.evaluate(
      'window.__VOLAM__.snapshot().roomId',
    )) as string;
    await joinWaiting(guest, 'Đồng đội', id);
    await startAuditTogether([
      [page, 'cai_bang', 'cai_bang_chuong'],
      [guest, 'thieu_lam', 'thieu_lam_quyen'],
    ]);
    await page.bringToFront();
    const samples: unknown[] = [];
    try {
      await expect
        .poll(
          async () => {
            const v = (await page.evaluate(
              'window.__VOLAM__.progressionPresentation()',
            )) as { statueIntroduction: string };
            samples.push(v);
            return v.statueIntroduction;
          },
          { timeout: 6000, intervals: [100] },
        )
        .toContain('Long Hồn Thần Thạch');
      for (const size of [
        { width: 1280, height: 720 },
        { width: 850, height: 480 },
      ]) {
        await page.setViewportSize(size);
        await expect
          .poll(
            async () => {
              const v = (await page.evaluate(
                'window.__VOLAM__.progressionPresentation()',
              )) as {
                statueLayout: {
                  bounds: {
                    x: number;
                    y: number;
                    width: number;
                    height: number;
                  };
                  view: { x: number; y: number; width: number; height: number };
                  zoom: number;
                };
              };
              samples.push(v);
              const l = v.statueLayout;
              if (!l) return false;
              return (
                l.bounds.y >= l.view.y + 108 / l.zoom &&
                l.bounds.y + l.bounds.height <= l.view.y + l.view.height &&
                l.bounds.x >= l.view.x &&
                l.bounds.x + l.bounds.width <= l.view.x + l.view.width
              );
            },
            { timeout: 4000, intervals: [100] },
          )
          .toBe(true);
      }
    } finally {
      await mkdir(evidence, { recursive: true });
      await writeFile(
        join(evidence, 'statue-camera.json'),
        JSON.stringify(samples, null, 2),
      );
      await page.screenshot({ path: join(evidence, 'statue-camera.png') });
    }
  } finally {
    await other.close();
  }
});
