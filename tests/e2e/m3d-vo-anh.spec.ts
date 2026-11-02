import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { joinWaiting, startTogether } from './pregame-helper.js';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
const dir = qaEvidenceDirectory('docs/evidence/m3d-vo-anh');
const snap = (p: Page) => p.evaluate<any>('window.__VOLAM__.snapshot()');
async function fixture(p: Page, data: Record<string, unknown>) {
  const s = await snap(p),
    r = await fetch(
      'http://127.0.0.1:' + process.env['VOLAM_QA_FIXTURE_PORT'] + '/fixture',
      {
        method: 'POST',
        body: JSON.stringify({
          roomId: s.roomId,
          sessionId: s.sessionId,
          ...data,
        }),
      },
    );
  expect(r.ok, await r.text()).toBe(true);
}
async function key(p: Page, k: string) {
  await p.bringToFront();
  await p.locator('#game canvas').focus();
  await expect.poll(() => p.evaluate(() => document.hasFocus())).toBe(true);
  await p.keyboard.press(k, { delay: 60 });
}
test('vo anh actual QWE: normal single foot and same-target six-foot finisher synchronize two clients', async ({
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
    await joinWaiting(a, 'Shaolin combo');
    await joinWaiting(b, 'Observer', (await snap(a)).roomId);
    await startTogether(pages, ['thieu_lam', 'cai_bang']);
    await fixture(a, {
      action: 'build',
      ids: ['toan_phong_thoai', 'hoanh_tao_cuoc', 'vo_anh_cuoc', ''],
    });
    const owner = (await snap(a)).sessionId,
      report: any[] = [];
    for (const success of [false, true]) {
      await fixture(a, { action: 'restore' });
      await fixture(a, { action: 'position', x: 850, y: 650, fx: 1, fy: 0 });
      await fixture(a, { action: 'targets', points: [{ x: 1070, y: 650 }] });
      await a.waitForTimeout(150);
      const ids = [new Set<string>(), new Set<string>()];
      let still: any;
      // Observe metadata only; export one PNG if the live phase is present.
      await a.evaluate(
        (minimum) => {
          const w = window as any;
          w.__voAnhStill = undefined;
          const until = Date.now() + 8000;
          const inspect = () => {
            const v = w.__VOLAM__.presentation(),
              e = v.skills.r3.entities.filter((x: any) =>
                x.asset.includes('foot_force'),
              );
            if (e.length >= minimum) {
              w.__voAnhStill = {
                png: document
                  .querySelector<HTMLCanvasElement>('#game canvas')!
                  .toDataURL('image/png'),
                entities: e,
                zoom: v.zoom,
              };
              return;
            }
            if (Date.now() < until) requestAnimationFrame(inspect);
          };
          requestAnimationFrame(inspect);
        },
        success ? 3 : 1,
      );
      if (success) {
        await key(a, 'q');
        await expect
          .poll(async () =>
            JSON.parse((await snap(a)).state.players[owner].combos).some(
              (x: any) => x.id === 'phat_dong_b' && x.step === 1,
            ),
          )
          .toBe(true);
        await key(a, 'w');
      }
      await key(a, 'e');
      const until = Date.now() + 2400;
      while (Date.now() < until) {
        const states = await Promise.all(pages.map(snap));
        states.forEach((s, i) => {
          for (const [id, p] of Object.entries(s.state.projectiles) as [
            string,
            any,
          ][])
            if (p.abilityId === 'vo_anh_cuoc' && p.ownerId === owner)
              ids[i]!.add(id);
        });
        await a.waitForTimeout(25);
      }
      expect(ids.map((x) => x.size)).toEqual(success ? [6, 6] : [1, 1]);
      expect([...ids[0]!].sort()).toEqual([...ids[1]!].sort());
      still = await a.evaluate<any>('window.__voAnhStill');
      expect(still).toBeDefined();
      expect(still.zoom).toBe(1);
      await mkdir(dir, { recursive: true });
      await writeFile(
        dir + '/' + (success ? 'empowered' : 'normal') + '-foot.png',
        Buffer.from(still.png.split(',')[1], 'base64'),
      );
      delete still.png;
      const state = await snap(a);
      if (success)
        expect(
          state.events.some(
            (e: any) =>
              e.abilityId === 'vo_anh_cuoc' &&
              e.kind === 'hit' &&
              e.stage === 'empowered',
          ),
        ).toBe(true);
      report.push({
        success,
        ids: ids.map((x) => [...x]),
        still,
        events: state.events.filter((e: any) =>
          ['vo_anh_cuoc', 'hoanh_tao_cuoc', 'toan_phong_thoai'].includes(
            e.abilityId,
          ),
        ),
      });
    }
    expect(errors).toEqual([]);
    await writeFile(
      dir + '/combo-observations.json',
      JSON.stringify(
        {
          scope:
            'two live production Phaser clients, real Q W E inputs/hits; fixtures only legal build/position/HP dummy, no injected combo progress',
          errors,
          report,
        },
        null,
        2,
      ),
    );
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
