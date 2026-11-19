import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { joinWaiting, startAuditTogether } from './pregame-helper.js';
import { acknowledgeQaLobby, pressQaAndWait } from '../../tools/qa-browser.mjs';

const directory = join(
  'docs/evidence/sessions',
  process.env['VOLAM_QA_SESSION'] ?? 'ui-camera',
  'shared-ui-camera',
);
const snapshot = (page: Page) =>
  page.evaluate<any>('window.__VOLAM__.snapshot()');
const view = async (page: Page) =>
  JSON.parse((await snapshot(page)).state.pvp.json);
const hero = async (page: Page) => {
  const s = await snapshot(page);
  return s.state.players[s.sessionId];
};

test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return;
  await mkdir(directory, { recursive: true });
  await page
    .screenshot({ path: join(directory, 'failure.png') })
    .catch(() => {});
  await writeFile(
    join(directory, 'failure.json'),
    JSON.stringify(
      {
        snapshot: await snapshot(page).catch(() => null),
        presentation: await page
          .evaluate('window.__VOLAM__.presentation()')
          .catch(() => null),
      },
      null,
      2,
    ),
  );
});

async function pickerSample(page: Page, mode: string) {
  const dialog = page.locator('.branch-dialog:visible');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('group', { name: 'Hệ phái' })).toBeVisible();
  const sample = await dialog.evaluate((element) => {
    const button = element.querySelector<HTMLButtonElement>(
      '.pre-actions button',
    )!;
    const style = getComputedStyle(button),
      rect = element.getBoundingClientRect();
    return {
      background: style.backgroundImage,
      border: style.border,
      color: style.color,
      fontFamily: style.fontFamily,
      viewport: { width: innerWidth, height: innerHeight },
      bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    };
  });
  expect(sample.bounds.x).toBeGreaterThanOrEqual(0);
  expect(sample.bounds.y).toBeGreaterThanOrEqual(0);
  expect(sample.bounds.x + sample.bounds.width).toBeLessThanOrEqual(
    sample.viewport.width,
  );
  expect(sample.bounds.y + sample.bounds.height).toBeLessThanOrEqual(
    sample.viewport.height,
  );
  await page.screenshot({ path: join(directory, `${mode}-picker.png`) });
  return { mode, ...sample };
}

async function cameraSamples(
  page: Page,
  mode: string,
  world?: { width: number; height: number },
) {
  const samples = [];
  for (const size of [
    { width: 1280, height: 720 },
    { width: 1872, height: 800 },
    { width: 850, height: 480 },
  ]) {
    await page.setViewportSize(size);
    await expect
      .poll(async () =>
        page.evaluate<any>(`(() => {
      const p=window.__VOLAM__.presentation(); return p?.worldView && Math.abs(p.worldView.width*p.zoom-innerWidth)<2 && Math.abs(p.worldView.height*p.zoom-innerHeight)<2;
    })()`),
      )
      .toBe(true);
    const presentation = await page.evaluate<any>(
      'window.__VOLAM__.presentation()',
    );
    expect(presentation.zoom).toBeGreaterThanOrEqual(
      size.width >= 960 && size.height >= 600 ? 2 : 1,
    );
    const v = presentation.worldView;
    if (world) {
      expect(v.x).toBeGreaterThanOrEqual(-1);
      expect(v.y).toBeGreaterThanOrEqual(-1);
      expect(v.x + v.width).toBeLessThanOrEqual(world.width + 1);
      expect(v.y + v.height).toBeLessThanOrEqual(world.height + 1);
    }
    const controls = await page
      .locator('.system-buttons button:visible')
      .evaluateAll((elements) =>
        elements.map((e) => e.getBoundingClientRect().width),
      );
    const expectedWidth =
      (Math.min(360, Math.max(236, size.width * 0.2)) - 16) / 5;
    for (const width of controls) expect(width).toBeCloseTo(expectedWidth, 1);
    const viewport = await page.locator('#viewport').boundingBox();
    expect(viewport!.width).toBe(size.width);
    expect(viewport!.height).toBe(size.height);
    if (size.width !== 1280)
      await page.screenshot({
        path: join(directory, `${mode}-${size.width}.png`),
      });
    samples.push({
      mode,
      size,
      zoom: presentation.zoom,
      worldView: v,
      controls,
    });
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  return samples;
}

test('shared UI and camera contracts hold in real Defense, Practice and all five PvP maps', async ({
  page,
}) => {
  await mkdir(directory, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const pickers: Awaited<ReturnType<typeof pickerSample>>[] = [];
  const cameras: Awaited<ReturnType<typeof cameraSamples>> = [];
  await joinWaiting(page, 'QA helper host');
  await startAuditTogether(
    [[page, 'vo_dang', 'vo_dang_kiem']],
    60000,
    async () => {
      await acknowledgeQaLobby(page, 'school', 'vo_dang');
      pickers.push(await pickerSample(page, 'defense'));
    },
  );
  cameras.push(...(await cameraSamples(page, 'defense')));
  const before = await hero(page);
  await pressQaAndWait(
    page,
    'ArrowRight',
    ({ x }) => {
      const s = (window as any).__VOLAM__.snapshot();
      return s.state.players[s.sessionId].x > x;
    },
    { x: before.x },
    { keyDelay: 180 },
  );

  // A fresh local entry leaves the previous room; no simulation state is injected.
  await page.goto('/?debug');
  await page.getByRole('button', { name: 'Phòng test', exact: true }).click();
  await page.locator('#practice-nickname').fill('Dùng chung');
  await page
    .getByRole('button', { name: 'Chọn nhân vật', exact: true })
    .click();
  await page.locator('[data-practice=school][data-school=vo_dang]').click();
  pickers.push(await pickerSample(page, 'practice'));
  await page
    .locator('[data-practice=branch][data-branch=vo_dang_kiem]')
    .click();
  await page.locator('[data-practice=confirm]').click();
  await expect(page.locator('#practice-ui')).toBeHidden({ timeout: 60000 });
  cameras.push(
    ...(await cameraSamples(page, 'practice', { width: 1280, height: 720 })),
  );

  await page.goto('/?debug');
  await page.getByRole('button', { name: 'Lôi Đài', exact: true }).click();
  await page.locator('#pvp-nickname').fill('Dùng chung');
  await page.locator('#pvp-entry-map').selectOption('rung_truc');
  await page.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
  await expect(page.locator('.pvp-lobby')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#scene-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 60000 },
  );
  await page.locator('[data-pvp=character]').click();
  await page.locator('[data-pvp=school][data-school=vo_dang]').click();
  pickers.push(await pickerSample(page, 'pvp'));
  await page.locator('[data-pvp=branch][data-branch=vo_dang_kiem]').click();
  const session = (await snapshot(page)).sessionId;
  expect(
    (await view(page)).members.find((m: any) => m.id === session).ready,
  ).toBe(false);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.locator('.pvp-school-picker')).toBeHidden();
  expect(
    (await view(page)).members.find((m: any) => m.id === session).ready,
  ).toBe(false);
  for (const [map, width, height] of [
    ['hong_moc', 836, 470],
    ['rung_truc', 1280, 720],
    ['dia_nguc', 1120, 630],
    ['tuong_duong', 1120, 630],
    ['kiem_ho', 1120, 630],
  ] as const) {
    await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
    await page.locator(`[data-pvp=map][data-map=${map}]`).click();
    await expect
      .poll(() => page.evaluate('window.__VOLAM__.presentation()?.pvpMap'), {
        timeout: 45000,
      })
      .toBe(map);
    await page.getByRole('button', { name: 'Quay lại', exact: true }).click();
    cameras.push(
      ...(await cameraSamples(page, `pvp-${map}`, { width, height })),
    );
  }
  for (const picker of pickers.slice(1)) {
    expect(picker.background).toBe(pickers[0]!.background);
    expect(picker.border).toBe(pickers[0]!.border);
    expect(picker.color).toBe(pickers[0]!.color);
    expect(picker.fontFamily).toBe(pickers[0]!.fontFamily);
  }
  expect(errors).toEqual([]);
  await writeFile(
    join(directory, 'contracts.json'),
    JSON.stringify({ pickers, cameras, errors }, null, 2),
  );
});
