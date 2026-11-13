import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { joinWaiting, startTogether } from './pregame-helper.js';

const ultimate = 'bach_liet_thien_kich';

async function fixture(page: Page, action: string) {
  const params = (await page.evaluate(`(() => {
    const { sessionId, roomId } = window.__VOLAM__.snapshot();
    return { player: sessionId, room: roomId };
  })()`)) as Record<string, string>;
  const result = await page.request.post(
    '/__boss_game?' + new URLSearchParams({ ...params, action }),
  );
  expect(result.ok(), await result.text()).toBe(true);
}

const player = (page: Page) =>
  page.evaluate<{
    zoneId: string;
    x: number;
    y: number;
    level: number;
  }>(`(() => {
  const s = window.__VOLAM__.snapshot();
  return s.state.players[s.sessionId];
})()`);

async function enter(page: Page, boss: string) {
  await page.getByRole('button', { name: 'Phó Bản', exact: true }).click();
  await page.locator('[data-destination="' + boss + '"]').click();
  await page.locator('#enter-dungeon').click();
  await expect
    .poll(async () => (await player(page)).zoneId, { timeout: 20000 })
    .toBe(boss + '_shared');
  await page.locator('#game canvas').focus();
}

test('Bách Liệt keeps all four shadows when a real Hồng Liệt hit changes the caster pose', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await joinWaiting(page, 'Thiên Sơn QA');
  await startTogether([page], ['thien_son_dao']);
  await fixture(page, 'learn');
  await expect.poll(async () => (await player(page)).level).toBe(12);
  await enter(page, 'hong_liet');
  await fixture(page, 'line-up');
  await page.keyboard.press('t');
  const report = await page.evaluate<{
    hit: boolean;
    activeHurtFrames: number;
    missingHurtFrames: number;
    shadows: string[];
    blades: string[];
    cleaned: boolean;
  }>(`new Promise(resolve => {
    const game = window.__VOLAM__;
    const started = performance.now();
    const shadows = new Set(), blades = new Set();
    let activeHurtFrames = 0, missingHurtFrames = 0, hit = false, cleaned = false;
    function sample() {
      const {sessionId, state, events} = game.snapshot();
      const hero = state.players[sessionId];
      const sprites = game.presentation().skills?.thienSon ?? [];
      const copies = sprites.filter(s => s.id.startsWith('shadow:' + sessionId + ':') && s.alpha > 0.1);
      for (const s of copies) shadows.add(s.frame);
      for (const s of sprites) if (s.texture === 'thien-son-x-crescents') blades.add(s.frame);
      const action = hero.actionState ? JSON.parse(hero.actionState) : null;
      if (action?.abilityId === '${ultimate}' && hero.pose === 'hurt') {
        activeHurtFrames++;
        if (copies.length !== 4) missingHurtFrames++;
      }
      if (events.some(e => e.kind === 'hit' && e.abilityId === 'hong_liet_a1' && e.targetId === sessionId)) hit = true;
      if (hit && !action && copies.length === 0 && sprites.length === 0) cleaned = true;
      if (performance.now() - started < 3600) game.afterRender(sample);
      else resolve({ hit, activeHurtFrames, missingHurtFrames, shadows: [...shadows], blades: [...blades], cleaned });
    }
    game.afterRender(sample);
  })`);
  expect(report.hit).toBe(true);
  expect(report.activeHurtFrames).toBeGreaterThan(0);
  expect(report.shadows.length).toBeGreaterThan(4);
  expect(report.blades.length).toBe(4);
  expect(report.cleaned).toBe(true);
  expect(report.missingHurtFrames).toBe(0);
  expect(errors).toEqual([]);
});

test('the normal dungeon menu loads the approved full Tương Dương court and its south exit', async ({
  page,
}) => {
  await joinWaiting(page, 'Tương Dương QA');
  await startTogether([page], ['vo_dang']);
  await enter(page, 'kim_luan');
  const inspect = () =>
    page.evaluate<
      | { width: number; height: number; scaleX: number; scaleY: number }
      | undefined
    >('window.__VOLAM__.presentation().kimArena');
  await expect.poll(inspect).toMatchObject({ width: 1190, height: 680 });
  const court = (await inspect())!;
  expect(court.scaleX).toBeCloseTo(court.scaleY, 8);
  expect(new URL(page.url()).searchParams.has('kimArenaRevision')).toBe(false);
  const cdp = await page.context().newCDPSession(page);
  const screenshot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
  });
  const path = test.info().outputPath('tuong-duong-main-game.png');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, Buffer.from(screenshot.data, 'base64'));
  await cdp.detach();
  await page.keyboard.down('ArrowDown');
  try {
    await expect.poll(async () => (await player(page)).y).toBeGreaterThan(615);
  } finally {
    await page.keyboard.up('ArrowDown');
  }
  await expect(page.locator('#dungeon-exit-hint')).toBeVisible();
  await page.keyboard.press('Space');
  await expect.poll(async () => (await player(page)).zoneId).toBe('arena');
});

test('six players share the full Tương Dương court during natural combat', async ({
  browser,
}) => {
  test.setTimeout(240000);
  const pages: Page[] = [];
  try {
    const errors: string[] = [];
    let roomId: string | undefined;
    for (let i = 0; i < 6; i++) {
      const page = await browser.newPage();
      pages.push(page);
      page.on('pageerror', (error) => errors.push(error.message));
      await joinWaiting(
        page,
        `Tương Dương ${i + 1}`,
        roomId,
        '/?debug=1',
        40000,
      );
      roomId ??= await page.evaluate<string>(
        'window.__VOLAM__.snapshot().roomId',
      );
    }
    await startTogether(
      pages,
      [
        'vo_dang',
        'thien_son_dao',
        'thien_son_phien',
        'cai_bang',
        'thieu_lam',
        'vo_dang_kiem',
      ],
      40000,
    );
    for (const page of pages) {
      await page.bringToFront();
      await enter(page, 'kim_luan');
    }
    for (const page of pages) {
      await expect
        .poll(() =>
          page.evaluate(`(() => {
        const game = window.__VOLAM__;
        const {state} = game.snapshot();
        const view = game.presentation();
        return { players: Object.values(state.players).filter(p => p.zoneId === 'kim_luan_shared').length,
          width: view.kimArena?.width, height: view.kimArena?.height };
      })()`),
        )
        .toEqual({ players: 6, width: 1190, height: 680 });
    }
    const attacker = pages[2]!;
    await attacker.bringToFront();
    await attacker.locator('#game canvas').focus();
    const combatObserved = () =>
      attacker.evaluate<boolean>(`(() => {
        const {state, events} = window.__VOLAM__.snapshot();
        return Object.values(state.creeps).some(e => e.zoneId === 'kim_luan_shared' && e.hp < e.maxHp)
          || events.some(e => e.kind === 'hit' && /:(hoac_do|dat_nhi_ba)$/.test(e.sourceId));
      })()`);
    await expect
      .poll(
        async () => {
          await attacker.keyboard.press('ArrowUp', { delay: 130 });
          await attacker.keyboard.press('1');
          await attacker.keyboard.press('a');
          return combatObserved();
        },
        { timeout: 20000 },
      )
      .toBe(true);
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(pages.map((page) => page.close()));
  }
});
