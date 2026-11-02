import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { joinWaiting, startTogether } from './pregame-helper.js';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
const dir = qaEvidenceDirectory('docs/evidence/m3d-milestone');
const snap = (p: Page) => p.evaluate<any>('window.__VOLAM__.snapshot()');
async function key(p: Page, k: string) {
  await p.bringToFront();
  await p.locator('#game canvas').focus();
  await expect.poll(() => p.evaluate(() => document.hasFocus())).toBe(true);
  await p.keyboard.press(k, { delay: 60 });
}
test('milestone composition retains Hell private entry, dash plus Z and inventory overlays', async ({
  browser,
}) => {
  const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
    ]),
    pages = await Promise.all(contexts.map((c) => c.newPage())),
    [a, b] = pages as [Page, Page],
    errors: string[] = [];
  pages.forEach((p) => p.on('pageerror', (e) => errors.push(e.message)));
  try {
    await joinWaiting(a, 'Hell merged');
    await joinWaiting(b, 'Peer merged', (await snap(a)).roomId);
    await startTogether(pages, ['cai_bang', 'thieu_lam']);
    // Presentation/entry fixture only: keep the two level1 observers alive in Hell.
    for (const p of pages) {
      const s = await snap(p),
        r = await fetch(
          'http://127.0.0.1:' +
            process.env['VOLAM_QA_FIXTURE_PORT'] +
            '/fixture',
          {
            method: 'POST',
            body: JSON.stringify({
              roomId: s.roomId,
              sessionId: s.sessionId,
              action: 'endurance',
            }),
          },
        );
      expect(r.ok, await r.text()).toBe(true);
    }
    await expect(a.locator('#dash-status')).toBeVisible();
    await expect(a.locator('#slot-z')).toBeVisible();
    await key(a, 'o');
    await expect(a.locator('#dialog-title')).toHaveText('Võ Công');
    await key(a, 'Escape');
    await key(a, 'p');
    await expect(a.locator('#dungeon-access')).toHaveCount(0);
    await expect(a.locator('[data-menu=party]')).toHaveCount(0);
    const cards = await a
      .locator('.destination')
      .evaluateAll((es) =>
        es.map((e) => (e as HTMLElement).dataset['destination']),
      );
    expect(cards).toEqual([
      'forest',
      'desert',
      'sea',
      'hell',
      'co_mo',
      'hong_liet',
      'chu_ba_thong',
      'kim_luan',
    ]);
    await a.locator('[data-destination=hell]').click();
    await a.locator('#enter-dungeon').click();
    await key(b, 'p');
    await b.locator('[data-destination=hell]').click();
    await b.locator('#enter-dungeon').click();
    const readHero = async (p: Page) => {
      const s = await snap(p);
      return s.state.players[s.sessionId];
    };
    await expect
      .poll(async () => (await readHero(a)).zoneId)
      .toMatch(/^hell_private_/);
    await expect
      .poll(async () => (await readHero(b)).zoneId)
      .toMatch(/^hell_private_/);
    expect((await readHero(a)).zoneId).not.toBe((await readHero(b)).zoneId);
    await expect
      .poll(async () => Object.values((await snap(a)).state.creeps).length)
      .toBeGreaterThanOrEqual(6);
    const s = await snap(a),
      units: any[] = Object.values(s.state.creeps).filter((e: any) => e.hp > 0);
    expect(new Set(units.map((e) => e.archetypeId)).size).toBe(1);
    expect(units[0].archetypeId).toMatch(/^hell_/);
    await a.getByRole('button', { name: 'Túi đồ', exact: true }).click();
    await expect(a.locator('#item-menu')).toBeVisible();
    await key(a, 'Escape');
    await key(a, 'a');
    await a.waitForTimeout(300);
    const presentation = await a.evaluate<any>(
      'window.__VOLAM__.presentation()',
    );
    expect(presentation.zoom).toBe(1);
    await mkdir(dir, { recursive: true });
    await a.screenshot({ path: dir + '/hell-merged.png' });
    await writeFile(
      dir + '/composition.json',
      JSON.stringify(
        {
          cards,
          errors,
          presentation,
          snapshot: await snap(a),
          peer: await readHero(b),
        },
        null,
        2,
      ),
    );
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
