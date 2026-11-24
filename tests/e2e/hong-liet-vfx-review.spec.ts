import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { joinWaiting, startTogether } from './pregame-helper.js';

type Part = {
  id: string;
  part: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
};
type Cue = {
  abilityId: string;
  activeAt: number;
  length: number;
  x: number;
  y: number;
};

test('five Hồng Liệt effects use the live arena and server cues', async ({
  page,
  baseURL,
}) => {
  test.skip(
    baseURL !== 'http://127.0.0.1:59759',
    'Requires the dedicated Hồng Liệt VFX review service',
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await joinWaiting(
    page,
    'Hồng Liệt VFX QA',
    undefined,
    '/?bossVfx=hong_liet',
    40000,
  );
  await startTogether([page], ['thien_son_phien'], 40000);
  const skills = page.getByRole('combobox', { name: 'Chiêu VFX' });
  const replay = page.getByRole('button', { name: 'Phát lại' });
  const read = (): Promise<{
    zone: string;
    parts: Part[];
    cues: Record<string, Cue>;
  }> =>
    page.evaluate(`(() => {
      const game = window.__VOLAM__;
      const view = game.presentation();
      return { zone: view.zoneId, parts: view.hongLiet?.fire ?? [], cues: game.snapshot().state.bossEffects };
    })()`);
  await expect(replay).toBeVisible();
  await expect
    .poll(async () => (await read()).zone, { timeout: 20000 })
    .toBe('hong_liet_shared');

  const cases = [
    ['dung_nham_liet_dia', 'gather-0', 'burst', 'eruption'],
    ['hoa_son_bao_phat', 'gather-0', 'eruption', 'volcano'],
    ['van_ly_nham_hoa', 'meteor', 'burst', 'meteor'],
    ['liet_diem_phong_toa', 'crust-0', 'crust-2', 'trail'],
    ['hong_liet_a2', 'blade', 'blade', 'sweep'],
  ] as const;
  for (const [ability, first, second, screenshot] of cases) {
    const response = page.waitForResponse(
      (r) => new URL(r.url()).searchParams.get('ability') === ability,
    );
    if ((await skills.inputValue()) === ability) await replay.click();
    else await skills.selectOption(ability);
    expect((await response).ok()).toBe(true);
    const seen = new Set<string>();
    const motion = new Set<string>();
    const crustScale = new Set<number>();
    let anchorChecked = false;
    await expect
      .poll(
        async () => {
          const { parts, cues } = await read();
          for (const p of parts) {
            const cue = cues[p.id];
            if (cue?.abilityId !== ability) continue;
            seen.add(p.part);
            if (p.part === first)
              motion.add(p.x.toFixed(1) + ':' + p.y.toFixed(1));
            if (p.part.startsWith('crust-')) crustScale.add(p.scaleX);
            if (p.part === 'ground' || p.part === 'blade') {
              expect(p.x).toBeCloseTo(cue.x, 3);
              expect(p.y).toBeCloseTo(cue.y, 3);
              anchorChecked = true;
            }
          }
          return (
            seen.has(first) &&
            seen.has(second) &&
            (first !== 'meteor' || motion.size > 1) &&
            (screenshot === 'trail' ? crustScale.size === 1 : anchorChecked)
          );
        },
        { timeout: 10000, intervals: [20, 30, 50] },
      )
      .toBe(true);
    if (process.env['HONG_LIET_VFX_PNG'] === '1') {
      const cdp = await page.context().newCDPSession(page);
      const png = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      const file = test.info().outputPath(screenshot + '.png');
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, Buffer.from(png.data, 'base64'));
      await cdp.detach();
    }
  }
  await expect
    .poll(async () => (await read()).parts.length, { timeout: 4000 })
    .toBe(0);
  expect(errors).toEqual([]);
});
