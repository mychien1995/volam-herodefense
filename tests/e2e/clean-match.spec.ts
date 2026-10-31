import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { invasionCreepName } from '@volam/game-data';
import { joinWaiting } from './pregame-helper.js';
import { read, hero, view, monitor, enter, moveTo } from './m3c1-helpers.js';
const out = 'docs/evidence/clean-match';
test('approved monk avatar, clean spawn, unnamed creeps and synchronized next-wave roster', async ({
  browser,
}) => {
  const contexts = await Promise.all(
    [1280, 1920].map((width) =>
      browser.newContext({
        viewport: { width, height: width === 1280 ? 720 : 1080 },
      }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage())),
    [a, b] = pages as [(typeof pages)[number], (typeof pages)[number]],
    errors = pages.map(monitor);
  await mkdir(out, { recursive: true });
  try {
    await joinWaiting(a, 'Monk');
    await joinWaiting(b, 'Observer', (await read(a)).roomId);
    await a.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    for (const p of pages) {
      await expect(p.locator('#pregame .pre-title')).toHaveText(
        'Chọn môn phái',
      );
      await expect(p.locator('[data-school=thieu_lam] [role=img]')).toHaveCSS(
        'background-image',
        /hero_thieu_lam_idle\.png/,
      );
    }
    await a.screenshot({ path: out + '/school-selection.png' });
    await a.locator('[data-school=thieu_lam]').click();
    await b.locator('[data-school=cai_bang]').click();
    for (const p of pages)
      await p.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    for (const p of pages) await expect(p.locator('#pregame')).toBeHidden();
    for (const p of pages) {
      expect(Object.keys((await read(p)).state.creeps)).toHaveLength(0);
      await expect(p.locator('#next-invasion-creep')).toHaveText(
        'Sắp tới: ' + invasionCreepName(1),
      );
    }
    const initial = await read(a);
    await a.locator('#game canvas').focus();
    await a.keyboard.press('ArrowDown', { delay: 200 });
    expect((await hero(a)).y).toBeGreaterThan(
      initial.state.players[initial.sessionId]!.y,
    );
    await a.screenshot({ path: out + '/clean-arena.png' });
    await enter(a);
    await expect
      .poll(async () => Object.keys((await read(a)).state.creeps).length)
      .toBeGreaterThan(0);
    const unnamed = async (p: typeof a) => {
      const s = await read(p),
        v = await p.evaluate<{
          actors: Array<{
            id: string;
            label: { text: string; visible: boolean };
            healthBarVisible: boolean;
          }>;
        }>('window.__VOLAM__.presentation()');
      for (const [id] of Object.entries(s.state.creeps).filter(
        ([, c]) => c.hp > 0,
      )) {
        const actor = v.actors.find((a) => a.id === id);
        expect(actor).toBeDefined();
        expect(actor!.label).toEqual({ text: '', visible: false });
        expect(actor!.healthBarVisible).toBe(true);
      }
      return v;
    };
    await expect
      .poll(async () => (await view(a)).actors.length)
      .toBeGreaterThan(1);
    const dungeon = await unnamed(a);
    const panel = (await a.locator('#defense-hud').boundingBox())!;
    const zone = (await a.locator('#zone-status').boundingBox())!;
    expect(zone.y).toBeGreaterThanOrEqual(panel.y + panel.height);

    await expect
      .poll(async () => (await read(b)).state.defense.wave, { timeout: 15000 })
      .toBe(1);
    for (const p of pages)
      await expect(p.locator('#next-invasion-creep')).toHaveText(
        'Sắp tới: ' + invasionCreepName(2),
      );
    await expect(b.locator('#invasion-warning')).toContainText(
      invasionCreepName(1),
    );
    await expect
      .poll(async () => (await view(b)).actors.length)
      .toBeGreaterThan(2);
    const invasion = await unnamed(b),
      s = await read(b);
    expect(
      invasion.actors.find((a) => a.id === s.sessionId)!.label.visible,
    ).toBe(true);
    await moveTo(b, 1250, 576);
    await b.screenshot({ path: out + '/unlabeled-invasion.png' });
    expect(errors.flat()).toEqual([]);
    await writeFile(
      out + '/observations.json',
      JSON.stringify({ initial, dungeon, invasion, final: s, errors }, null, 2),
    );
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
