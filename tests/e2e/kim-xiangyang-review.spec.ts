import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { joinWaiting, startTogether } from './pregame-helper.js';

interface CourtSnapshot {
  zone: string;
  arena: {
    width: number;
    height: number;
    scaleX: number;
    scaleY: number;
    camera: { width: number; height: number };
  };
  zoom: number;
  rotation: number;
  effects: Array<{ abilityId: string; kind: string }>;
  entities: Array<{ asset: string }>;
  hero: { y: number; zoneId: string };
}

test('Xiangyang preview fits the complete court and plays live Kim Luân effects', async ({
  page,
  baseURL,
}) => {
  test.skip(
    baseURL !== 'http://127.0.0.1:59760',
    'Requires the dedicated Xiangyang preview service',
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await joinWaiting(
    page,
    'Tương Dương QA',
    undefined,
    '/?bossVfx=kim_luan',
    40000,
  );
  await startTogether([page], ['thien_son_phien'], 40000);
  const read = () =>
    page.evaluate<CourtSnapshot>(`(() => {
    const view = window.__VOLAM__.presentation();
    const snapshot = window.__VOLAM__.snapshot();
    const state = snapshot.state;
    return { zone: view.zoneId, arena: view.kimArena, zoom: view.zoom, rotation: view.rotation,
      effects: Object.values(state.bossEffects), entities: view.kim?.entities,
      hero: state.players[snapshot.sessionId] };
  })()`);
  await expect
    .poll(async () => (await read()).zone, { timeout: 20000 })
    .toBe('kim_luan_shared');
  const court = await read();
  expect(court.arena.width).toBeCloseTo(1190, 3);
  expect(court.arena.height).toBeCloseTo(680, 3);
  expect(court.arena.scaleX).toBeCloseTo(court.arena.scaleY, 6);
  expect(court.arena.camera).toMatchObject({ width: 1190, height: 680 });
  expect(court.rotation).toBe(0);
  expect(court.zoom * 1190).toBeLessThanOrEqual(1440.01);
  expect(court.zoom * 680).toBeLessThanOrEqual(900.01);
  const skills = page.getByRole('combobox', { name: 'Chiêu VFX' });
  const replay = page.getByRole('button', { name: 'Phát lại' });
  for (const [ability, kind, visible] of [
    ['thiet_phien_lien_hoan', 'shot', /hoac_do/],
    ['dai_luc_pha_son', 'line', /dat_nhi_ba/],
    ['long_tuong_bat_nha_cong', 'elephant', /kim_elephant/],
  ] as const) {
    const response = page.waitForResponse(
      (r) => new URL(r.url()).searchParams.get('ability') === ability,
    );
    if ((await skills.inputValue()) === ability) await replay.click();
    else await skills.selectOption(ability);
    expect((await response).ok()).toBe(true);
    await expect
      .poll(
        async () => {
          const { effects, entities } = await read();
          return (
            effects.some(
              (e: { abilityId: string; kind: string }) =>
                e.abilityId === ability && e.kind === kind,
            ) && entities.some((e: { asset: string }) => visible.test(e.asset))
          );
        },
        { timeout: 12000 },
      )
      .toBe(true);
  }
  if (process.env['KIM_XIANGYANG_PNG'] === '1') {
    const file = test.info().outputPath('xiangyang-elephants.png');
    await mkdir(dirname(file), { recursive: true });
    const cdp = await page.context().newCDPSession(page);
    const png = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    await writeFile(file, Buffer.from(png.data, 'base64'));
    await cdp.detach();
  }
  await page.locator('#game canvas').focus();
  await page.keyboard.down('ArrowDown');
  try {
    await expect
      .poll(async () => (await read()).hero.y, { timeout: 8000 })
      .toBeGreaterThan(615);
  } finally {
    await page.keyboard.up('ArrowDown');
  }
  await expect(page.locator('#dungeon-exit-hint')).toBeVisible();
  await page.keyboard.press('Space');
  await expect.poll(async () => (await read()).hero.zoneId).toBe('arena');
  expect(errors).toEqual([]);
});
