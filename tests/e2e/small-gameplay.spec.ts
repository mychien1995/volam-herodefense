import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { Client } from '@colyseus/sdk';
import { PROTOCOL_VERSION, type LobbyState } from '@volam/game-protocol';
import { creepDungeon, desertDungeon, m1Config } from '@volam/game-data';
import { joinWaiting, startTogether } from './pregame-helper.js';
interface Hero {
  x: number;
  y: number;
  hp: number;
  level: number;
  zoneId: string;
  respawnTicks: number;
  pose: string;
  qSkill: string;
  wSkill: string;
  eSkill: string;
  rSkill: string;
  gold: number;
  xp: number;
  build: {
    mode: string;
    branchId: string;
    allocated: number;
    available: number;
    revision: number;
    ranks: Record<string, number>;
    slotSkills: string[];
  };
}
interface Snapshot {
  sessionId: string;
  roomId: string;
  state: { tick: number; players: Record<string, Hero> };
  events: Array<{ kind: string; sourceId: string }>;
}
const read = (p: Page) => p.evaluate<Snapshot>('window.__VOLAM__.snapshot()');
const hero = async (p: Page) => {
  const s = await read(p);
  return s.state.players[s.sessionId]!;
};
const out = 'docs/evidence/small-gameplay';
async function fixture(p: Page, input: Record<string, unknown>) {
  const s = await read(p);
  const r = await fetch('http://127.0.0.1:2668/fixture', {
    method: 'POST',
    body: JSON.stringify({
      roomId: s.roomId,
      sessionId: s.sessionId,
      ...input,
    }),
  });
  expect(r.ok, await r.text()).toBe(true);
}
async function walk(p: Page, x: number, y: number) {
  await p.bringToFront();
  await p.locator('#game canvas').focus();
  for (const [axis, target, negative, positive] of [
    ['x', x, 'ArrowLeft', 'ArrowRight'],
    ['y', y, 'ArrowUp', 'ArrowDown'],
  ] as const) {
    const end = Date.now() + 15000;
    while (Date.now() < end) {
      const delta = target - (await hero(p))[axis];
      if (Math.abs(delta) < 8) break;
      await p.keyboard.press(delta < 0 ? negative : positive, {
        delay: Math.min(500, Math.max(65, (Math.abs(delta) * 1000) / 160 - 25)),
      });
      await expect
        .poll(async () => Math.abs((await hero(p))[axis] - target))
        .toBeLessThan(Math.abs(delta));
      await expect.poll(async () => (await hero(p)).pose).not.toBe('walk');
    }
    expect(Math.abs((await hero(p))[axis] - target)).toBeLessThan(8);
  }
}
function monitor(p: Page) {
  const errors: string[] = [];
  p.on('pageerror', (e) => errors.push(e.stack ?? e.message));
  p.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  p.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  return errors;
}
test('Vietnamese six-player school selection fits supported desktop sizes without scrolling', async ({
  page,
}) => {
  await mkdir(out, { recursive: true });
  const errors = monitor(page),
    peers: Array<{ leave(): Promise<unknown> }> = [];
  await page.goto('/?debug=1');
  await page.locator('#pre-nickname').fill('Phím P');
  await page.locator('#pre-nickname').press('p');
  await expect(page.locator('#modal-layer')).toBeHidden();
  await page.getByRole('button', { name: 'Vào game', exact: true }).click();
  await page.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
  await expect(page.locator('.pre-title')).toHaveText('Phòng chờ');
  const roomId = (await read(page)).roomId;
  const client = new Client('http://127.0.0.1:2667');
  try {
    for (let i = 0; i < 5; i++)
      peers.push(
        await client.joinById<LobbyState>(roomId, {
          nickname: 'Đồng đội ' + i,
          protocolVersion: PROTOCOL_VERSION,
        }),
      );
    await expect(page.locator('.pre-players li')).toHaveCount(6);
    await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    await page.locator('[data-school=cai_bang]').click();
    for (const size of [
      { width: 944, height: 466 },
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(size);
      const fit = await page.locator('.school-window').evaluate((n) => ({
        scroll: n.scrollHeight,
        height: n.clientHeight,
        top: n.getBoundingClientRect().top,
        bottom: n.getBoundingClientRect().bottom,
      }));
      expect(fit.scroll).toBeLessThanOrEqual(fit.height + 1);
      expect(fit.top).toBeGreaterThanOrEqual(0);
      expect(fit.bottom).toBeLessThanOrEqual(size.height + 1);
      const leave = (await page.locator('[data-action=leave]').boundingBox())!,
        confirm = (await page.locator('[data-action=confirm]').boundingBox())!;
      expect(leave.x).toBeLessThan(confirm.x);
      expect(leave.y + leave.height).toBeLessThanOrEqual(fit.bottom - 6);
      expect(confirm.y + confirm.height).toBeLessThanOrEqual(fit.bottom - 6);
      await page.screenshot({ path: `${out}/selection-${size.width}.png` });
    }
    expect(await page.locator('#pregame').innerText()).not.toMatch(
      /Confirm|Selection|Level|Players|Ready|Room/,
    );
    expect(errors).toEqual([]);
  } finally {
    for (const p of peers) await p.leave();
  }
});
test('two clients synchronize automatic QWER, slot replacement and custom mixing; P respects focus', async ({
  browser,
}) => {
  const ca = await browser.newContext(),
    cb = await browser.newContext();
  const a = await ca.newPage(),
    b = await cb.newPage();
  const errors = [...[a, b].map(monitor)];
  try {
    await joinWaiting(a, 'Tự động');
    await joinWaiting(b, 'Đồng đội', (await read(a)).roomId);
    await startTogether([a, b], ['cai_bang', 'vo_dang']);
    await expect
      .poll(async () => (await hero(a)).qSkill)
      .toBe('hoanh_tao_bong');
    expect((await hero(a)).wSkill).toBe('');
    await a.keyboard.press('p');
    await expect(a.locator('#skill-mode')).toHaveValue('default');
    await a.locator('#skill-branch').selectOption('cai_bang_chuong');
    await expect
      .poll(async () => (await hero(a)).build.branchId)
      .toBe('cai_bang_chuong');
    await expect(a.locator('[data-skill-card=hoanh_tao_bong]')).toBeHidden();
    await a.locator('#skill-branch').press('p');
    await expect(a.locator('#game-dialog')).toBeVisible();
    await a.locator('#close-menu').focus();
    await a.keyboard.press('p');
    await expect(a.locator('#game-dialog')).toBeHidden();
    await fixture(a, { action: 'target' });
    await a.keyboard.press('a');
    await expect.poll(async () => (await hero(a)).level).toBe(2);
    await expect
      .poll(async () => (await hero(a)).wSkill)
      .toBe('cuong_long_loan_vu');
    const id = (await read(a)).sessionId;
    await expect
      .poll(async () => (await read(b)).state.players[id]!.wSkill)
      .toBe('cuong_long_loan_vu');
    expect((await hero(b)).level).toBe(1);
    await fixture(a, { action: 'xp', amount: 240 });
    await expect.poll(async () => (await hero(a)).level).toBe(6);
    await a.keyboard.press('p');
    expect((await hero(a)).build.slotSkills).toHaveLength(4);
    const before = (await hero(a)).build.revision;
    await a.locator('#loadout-q').selectOption('phi_long_tai_thien');
    await a.locator('#loadout-e').selectOption('hoa_van_chuong');
    await a.locator('#apply-loadout').click();
    await expect
      .poll(async () => (await hero(a)).build.revision)
      .toBeGreaterThan(before);
    expect((await hero(a)).build.ranks).toMatchObject({
      phi_long_tai_thien: 2,
      cuong_long_loan_vu: 2,
      hoa_van_chuong: 1,
      khang_long_huu_hoi: 1,
    });
    await a.screenshot({ path: `${out}/skills-default-1280.png` });
    await a.locator('#skill-mode').selectOption('custom');
    await expect.poll(async () => (await hero(a)).build.mode).toBe('custom');
    await a.locator('#reset-skills').click();
    await expect.poll(async () => (await hero(a)).build.allocated).toBe(0);
    await a.locator('#loadout-q').selectOption('hoanh_tao_bong');
    await a.locator('#apply-loadout').click();
    await expect
      .poll(async () => (await hero(a)).qSkill)
      .toBe('hoanh_tao_bong');
    await a.locator('[data-upgrade=hoanh_tao_bong]').click();
    await expect
      .poll(async () => (await hero(a)).build.ranks['hoanh_tao_bong'])
      .toBe(1);
    await a.locator('#dialog-content').evaluate((n) => {
      n.scrollTop = 0;
    });
    await a.screenshot({ path: `${out}/skills-custom-1280.png` });
    const tick = (await read(a)).state.tick;
    await expect
      .poll(async () => (await read(a)).state.tick)
      .toBeGreaterThan(tick);
    expect(errors.flat()).toEqual([]);
  } finally {
    await ca.close();
    await cb.close();
  }
});
test('both dungeon doors require walking near and a fresh Space; clicks and distant/held Space do not exit', async ({
  page,
}) => {
  const errors = monitor(page);
  await joinWaiting(page, 'Cửa phó bản');
  await startTogether([page]);
  for (const d of [creepDungeon, desertDungeon]) {
    await page.locator('[data-menu=dungeons]').click();
    await page.locator(`[data-destination=${d.id}]`).click();
    await page.locator('#enter-dungeon').click();
    await expect.poll(async () => (await hero(page)).zoneId).toContain(d.id);
    await page.keyboard.press('p');
    await expect(page.locator('#skill-mode')).toBeDisabled();
    await expect(page.locator('#skill-readonly')).toBeVisible();
    await page.locator('#close-menu').focus();
    await page.keyboard.press('p');
    // Controlled far-position fixture, then real keyboard movement to the physical door.
    await fixture(page, { action: 'position', x: d.exit.x + 100, y: d.exit.y });
    await expect
      .poll(async () => (await hero(page)).x)
      .toBeCloseTo(d.exit.x + 100, 0);
    await page.keyboard.down('Space');
    await walk(page, d.exit.x + 30, d.exit.y);
    await expect(page.locator('#dungeon-exit-hint')).toBeVisible();
    // Browser repeat keydown while Space is held must never activate a new interaction.
    await page
      .locator('#game canvas')
      .dispatchEvent('keydown', { code: 'Space', repeat: true, bubbles: true });
    expect((await hero(page)).zoneId).not.toBe('arena');
    const view = await page.evaluate<{ camera: { x: number; y: number } }>(
      'window.__VOLAM__.presentation()',
    );
    const canvas = page.locator('#game canvas'),
      box = (await canvas.boundingBox())!,
      z = await canvas.evaluate(
        (n) => n.clientWidth / (n as HTMLCanvasElement).width,
      );
    await page.mouse.click(
      box.x + (d.exit.x - view.camera.x) * z,
      box.y + (d.exit.y - 20 - view.camera.y) * z,
    );
    expect((await hero(page)).zoneId).not.toBe('arena');
    await page.screenshot({ path: `${out}/door-${d.id}.png` });
    await page.keyboard.up('Space');
    await page.keyboard.press('Space');
    await expect.poll(async () => (await hero(page)).zoneId).toBe('arena');
    await expect(page.locator('#dungeon-exit-hint')).toBeHidden();
  }
  expect(errors).toEqual([]);
});
test('death grays only the local world, blocks controls and respawns centrally; quit requires confirmation', async ({
  browser,
}) => {
  const ca = await browser.newContext(),
    cb = await browser.newContext();
  const a = await ca.newPage(),
    b = await cb.newPage();
  const errors = [monitor(a), monitor(b)];
  try {
    await joinWaiting(a, 'Hồi sinh');
    await joinWaiting(b, 'Còn sống', (await read(a)).roomId);
    await startTogether([a, b]);
    for (const destination of ['forest', 'desert', 'arena']) {
      if (destination !== 'arena') {
        await a.locator('[data-menu=dungeons]').click();
        await a.locator(`[data-destination=${destination}]`).click();
        await a.locator('#enter-dungeon').click();
        await expect
          .poll(async () => (await hero(a)).zoneId)
          .toContain(destination);
      }
      await fixture(a, { action: 'death' });
      await expect(a.locator('#respawn-overlay')).toBeVisible();
      await expect(a.locator('#game')).toHaveCSS('filter', 'grayscale(1)');
      await expect(b.locator('#game')).toHaveCSS('filter', 'none');
      const h = await hero(a);
      await a.keyboard.press('ArrowRight', { delay: 180 });
      await a.keyboard.press('a');
      await a.keyboard.press('q');
      expect((await hero(a)).x).toBe(h.x);
      expect((await hero(a)).y).toBe(h.y);
      if (destination === 'forest')
        await a.screenshot({ path: `${out}/death-local.png` });
      await expect(a.locator('#respawn-overlay')).toBeHidden({ timeout: 8000 });
      await expect.poll(async () => (await hero(a)).zoneId).toBe('arena');
      expect(await hero(a)).toMatchObject({ ...m1Config.spawn });
      await expect(a.locator('#game')).toHaveCSS('filter', 'none');
    }
    await a.keyboard.press('ArrowRight', { delay: 150 });
    await expect
      .poll(async () => (await hero(a)).x)
      .toBeGreaterThan(m1Config.spawn.x);
    expect(
      await a
        .locator('.system-buttons button')
        .first()
        .getAttribute('data-action'),
    ).toBe('quit');
    await a.locator('[data-action=quit]').click();
    await expect(a.locator('#dialog-content')).toContainText(
      'Bạn có muốn rời trận? Tiến trình trong trận sẽ không được lưu.',
    );
    await a.keyboard.press('p');
    await expect(a.locator('#game-dialog')).toHaveAttribute(
      'data-menu',
      'quit',
    );
    await a.screenshot({ path: `${out}/quit-confirm.png` });
    await a.locator('#cancel-quit').click();
    await expect(a.locator('#game-dialog')).toBeHidden();
    await a.locator('[data-action=quit]').click();
    await a.locator('#confirm-quit').click();
    await expect(a.locator('#pregame')).toBeVisible();
    await expect(a.locator('#game')).toHaveCSS('filter', 'none');
    expect(errors.flat()).toEqual([]);
  } finally {
    await ca.close();
    await cb.close();
  }
});
