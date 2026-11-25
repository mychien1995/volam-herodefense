import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { arenaVariants, type ArenaId } from '@volam/game-data';
import { joinWaiting, startTogether } from './pregame-helper.js';
import { pressQaAndWait } from '../../tools/qa-browser.mjs';
const snap = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const art = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.presentation()');
async function place(p: Page, x: number, y: number) {
  const s = await snap(p);
  const r = await p.request.post(
    '/__m4d?' +
      new URLSearchParams({
        room: s.roomId,
        id: s.sessionId,
        op: 'place',
        x: String(x),
        y: String(y),
      }),
  );
  expect(r.ok(), await r.text()).toBe(true);
}
for (const id of ['dao_hoa_dao', 'tuong_duong', 'tu_hien_trang'] as ArenaId[]) {
  test(`M4D-R2 ${id}: create popup, solid feet, centered rows and living scenery`, async ({
    page,
    browser,
  }) => {
    const peer = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    });
    const b = await peer.newPage();
    const errors: string[] = [];
    for (const p of [page, b]) p.on('pageerror', (e) => errors.push(e.message));
    try {
      await page.goto('/?debug=1');
      await page.locator('[data-action=play]').click();
      await page.locator('#pre-nickname').fill('Review M4D');
      await page.getByRole('button', { name: 'Vào game', exact: true }).click();
      await expect(page.locator('#pre-arena')).toHaveCount(0);
      await expect(page.locator('#pre-portals')).toHaveCount(0);
      await page.locator('[data-action=create]').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.locator('#pre-arena').selectOption(id);
      await page.locator('#pre-portals').selectOption('4');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.locator('[data-action=create]').click();
      await expect(page.locator('#pre-arena')).toHaveValue(id);
      await page.locator('[data-action=confirm-create]').click();
      await expect(page.locator('#pregame .pre-title')).toHaveText('Phòng chờ');
      await joinWaiting(b, 'Review peer', (await snap(page)).roomId);
      await startTogether([page, b], ['cai_bang_bong', 'vo_dang_kiem'], 45000);
      const heroId = (await snap(page)).sessionId;
      expect((await snap(b)).state.defense.arenaId).toBe(id);
      const position =
        id === 'dao_hoa_dao'
          ? { x: 400, y: 440, max: 434 }
          : id === 'tuong_duong'
            ? { x: 375, y: 430, max: 407 }
            : { x: 175, y: 470, max: 217 };
      await place(page, position.x, position.y);
      await pressQaAndWait(
        page,
        'ArrowRight',
        ({ x }) => {
          const s = (window as any).__VOLAM__.snapshot();
          return s.state.players[s.sessionId].x > x + 5;
        },
        { x: position.x },
        { keyDelay: 650 },
      );
      const h = (await snap(page)).state.players[heroId];
      expect(h.x).toBeLessThan(position.max);
      await expect
        .poll(async () =>
          Math.abs((await snap(b)).state.players[heroId].x - h.x),
        )
        .toBeLessThan(1);
      await place(page, position.x, position.y);
      await page.bringToFront();
      await page.locator('#game canvas').focus();
      await page.keyboard.down('ArrowRight');
      await page.keyboard.press('Shift');
      await page.keyboard.up('ArrowRight');
      await expect
        .poll(async () => (await snap(page)).state.players[heroId].dashCharges)
        .toBe(1);
      expect((await snap(page)).state.players[heroId].x).toBeLessThan(
        position.max,
      );
      const first = (await art(page)).m4dArena.ambient;
      expect(
        id === 'tuong_duong' ? first.fireCount : first.waterPixels,
      ).toBeGreaterThan(0);
      await expect
        .poll(async () => (await art(page)).m4dArena.ambient.frame)
        .not.toBe(first.frame);
      if (id === 'tuong_duong') {
        await expect
          .poll(
            async () => (await art(page)).m4dArena.ambient.torches[0]?.frame,
          )
          .not.toBe(first.torches[0]?.frame);
      } else {
        await expect
          .poll(async () => (await art(page)).m4dArena.ambient.waterFrame)
          .not.toBe(first.waterFrame);
      }
      if (id === 'tu_hien_trang') {
        expect((await art(page)).m4dArena.ambient.lotusCount).toBeGreaterThan(
          0,
        );
        await expect
          .poll(async () => (await art(page)).m4dArena.ambient.lotusY)
          .not.toBe(first.lotusY);
      }
      const sceneArt = await art(page);
      await mkdir('docs/evidence/m4d-r3', { recursive: true });
      await page.screenshot({ path: `docs/evidence/m4d-r3/${id}.png` });
      await place(page, 920, 620);
      await place(b, 920, 660);
      const s = await snap(page);
      const r = await page.request.post(
        '/__m4d?' +
          new URLSearchParams({ room: s.roomId, id: heroId, op: 'invasion' }),
      );
      expect(r.ok()).toBe(true);
      await expect
        .poll(
          async () =>
            Object.keys((await snap(page)).state.creeps).filter((k) =>
              k.startsWith('invasion_'),
            ).length,
        )
        .toBeGreaterThanOrEqual(8);
      const creeps = Object.entries((await snap(page)).state.creeps).map(
        ([id, c]) => ({ ...(c as any), id }),
      );
      const road = arenaVariants[id].roadCenter;
      for (const lane of ['west', 'east']) {
        const rows = creeps.filter((c) => c.id?.includes(`_${lane}_0`));
        expect(rows).toHaveLength(2);
        expect((rows[0].y + rows[1].y) / 2).toBeCloseTo(road.y, 1);
        expect(Math.abs(rows[0].y - rows[1].y)).toBeCloseTo(36, 1);
      }
      await writeFile(
        `docs/evidence/m4d-r3/${id}.json`,
        JSON.stringify({ arena: sceneArt.m4dArena, errors }, null, 2),
      );
      expect(errors).toEqual([]);
    } finally {
      await peer.close();
    }
  });
}
