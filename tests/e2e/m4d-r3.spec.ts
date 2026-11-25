import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { joinWaiting, startTogether } from './pregame-helper.js';
const snap = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const art = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.presentation()');
async function place(p: Page, x: number, y: number) {
  const s = await snap(p);
  const response = await p.request.post(
    '/__m4d?' +
      new URLSearchParams({
        room: s.roomId,
        id: s.sessionId,
        op: 'place',
        x: String(x),
        y: String(y),
      }),
  );
  expect(response.ok(), await response.text()).toBe(true);
  await expect
    .poll(async () =>
      Math.abs((await snap(p)).state.players[s.sessionId].x - x),
    )
    .toBeLessThan(0.1);
}
async function settledView(p: Page, x = 1000) {
  const own = (await snap(p)).sessionId;
  await expect
    .poll(async () =>
      Math.abs((await art(p)).actors.find((a: any) => a.id === own)?.x - x),
    )
    .toBeLessThan(0.1);
  let previous: any;
  await expect
    .poll(async () => {
      const view = (await art(p)).worldView;
      const delta = previous
        ? Math.abs(view.x - previous.x) + Math.abs(view.y - previous.y)
        : Infinity;
      previous = view;
      return delta;
    })
    .toBeLessThan(0.1);
  return (await art(p)).worldView;
}

for (const id of ['dao_hoa_dao', 'tuong_duong', 'tu_hien_trang'])
  test(`M4D-R3 ${id}: dense ground and anchored environment motion`, async ({
    page,
    browser,
  }) => {
    const context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
      }),
      after = await context.newPage();
    const errors: string[] = [];
    for (const p of [page, after])
      p.on('pageerror', (e) => errors.push(e.message));
    try {
      await page.goto('/?debug=1&groundDetail=off');
      await page.locator('[data-action=play]').click();
      await page.locator('#pre-nickname').fill('Nền trước');
      await page.getByRole('button', { name: 'Vào game', exact: true }).click();
      await page.locator('[data-action=create]').click();
      await page.locator('#pre-arena').selectOption(id);
      await page.locator('[data-action=confirm-create]').click();
      await expect(page.locator('#pregame .pre-title')).toHaveText('Phòng chờ');
      await joinWaiting(after, 'Nền sau', (await snap(page)).roomId);
      await startTogether(
        [page, after],
        ['vo_dang_kiem', 'vo_dang_kiem'],
        45000,
      );
      expect((await art(page)).m4dArena.groundSurface.enabled).toBe(false);
      const surface = (await art(after)).m4dArena.groundSurface;
      expect(surface.renderPixelsPerWorld).toBeGreaterThanOrEqual(2);
      expect(surface.materialPixelsPerWorld).toBeGreaterThan(3);
      expect(surface.plaza).toBe(true);
      expect(Math.min(...surface.plazaPixelsPerWorld)).toBeGreaterThan(1.75);
      // Equal camera, body, floor point and facing. Two peers take turns at the same legal position.
      await place(page, 1000, 700);
      await place(after, 920, 650);
      await mkdir('docs/evidence/m4d-r3', { recursive: true });
      const beforeView = await settledView(page);
      const beforeOwn = (await snap(page)).sessionId;
      const beforeBody = (await art(page)).actors.find(
        (a: any) => a.id === beforeOwn,
      );
      await page.screenshot({ path: `docs/evidence/m4d-r3/${id}-before.png` });
      await place(page, 920, 650);
      await place(after, 1000, 700);
      const actorId = (await snap(after)).sessionId;
      await expect
        .poll(async () =>
          Math.abs(
            (await art(after)).actors.find((a: any) => a.id === actorId)?.x -
              1000,
          ),
        )
        .toBeLessThan(1);
      const initial = (await art(after)).m4dArena.ambient;
      expect(initial.waterPixels).toBeGreaterThan(0);
      await expect
        .poll(async () => (await art(after)).m4dArena.ambient.waterFrame)
        .not.toBe(initial.waterFrame);
      if (id === 'tuong_duong') {
        expect(surface.protectedRiverRockAlpha).toBe(0);
        expect(initial.detachedFlames).toBe(0);
        expect(initial.torches).toHaveLength(4);
        for (const torch of initial.torches) {
          const source = (await art(after)).m4dArena.props.find(
            (p: any) => p.name === torch.source,
          );
          expect(torch.flamePixels).toBeGreaterThan(30);
          expect(Math.abs(torch.x - source.x)).toBeLessThan(25);
          expect(torch.y).toBeLessThan(source.y - 20);
        }
        await expect
          .poll(
            async () => (await art(after)).m4dArena.ambient.torches[0].frame,
          )
          .not.toBe(initial.torches[0].frame);
      }
      const afterView = await settledView(after);
      const afterBody = (await art(after)).actors.find(
        (a: any) => a.id === actorId,
      );
      expect(afterBody.texture).toBe(beforeBody.texture);
      expect(afterBody.scale).toEqual(beforeBody.scale);
      expect(afterBody.filterMode).toBe(beforeBody.filterMode);
      expect(
        Math.abs(beforeView.x - afterView.x) +
          Math.abs(beforeView.y - afterView.y),
      ).toBeLessThan(1);
      await after.screenshot({ path: `docs/evidence/m4d-r3/${id}-after.png` });
      if (id === 'tuong_duong') {
        await place(after, 330, 300);
        await settledView(after, 330);
        await after.screenshot({
          path: 'docs/evidence/m4d-r3/tuong-duong-torches-stream.png',
        });
      }
      await writeFile(
        `docs/evidence/m4d-r3/${id}.json`,
        JSON.stringify(
          { art: (await art(after)).m4dArena, beforeView, afterView, errors },
          null,
          2,
        ),
      );
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
