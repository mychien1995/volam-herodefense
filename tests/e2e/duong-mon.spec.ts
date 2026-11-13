import { expect, test, type Page } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { verify } =
  require('../../assets/reviews/duong-mon-vfx-v2/verify-preview.cjs') as {
    verify(page: Page, entry: string, evidence: string): Promise<void>;
  };

test('Đường Môn uses the approved sprites and effects in the native Phaser scene', async ({
  page,
}, info) => {
  const evidence = resolve('assets/reviews/duong-mon-vfx-v2/phaser');
  await mkdir(evidence, { recursive: true });
  const entry = new URL('/duong-mon.html?inspect', info.project.use.baseURL);
  await verify(page, entry.href, evidence);
});

test('Phaser backing pixels follow the device pixel ratio', async ({
  browser,
}, info) => {
  const page = await browser.newPage({
    viewport: { width: 900, height: 600 },
    deviceScaleFactor: 2,
  });
  try {
    await page.goto(
      new URL('/duong-mon.html?inspect', info.project.use.baseURL).href,
    );
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('width', '1800');
    await expect(canvas).toHaveAttribute('height', '1200');
    expect(
      await canvas.evaluate((node) => [node.clientWidth, node.clientHeight]),
    ).toEqual([900, 600]);
    await expect(page.getByRole('status')).toHaveText('Tuần sa · Sẵn sàng');
  } finally {
    await page.close();
  }
});
