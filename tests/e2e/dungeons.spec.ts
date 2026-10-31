import { expect, test, type Page } from '@playwright/test';
import { joinWaiting, startTogether } from './pregame-helper.js';
test.use({ actionTimeout: 10000 });

interface Actor {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  gold: number;
  xp: number;
  zoneId: string;
  pose: string;
  lastSequence: number;
  basicCooldown: number;
  basicId: string;
  mana: number;
}
interface Snapshot {
  sessionId: string;
  roomId: string;
  state: {
    tick: number;
    players: Record<string, Actor>;
    creeps: Record<string, Actor>;
    projectiles: Record<string, { zoneId: string }>;
    dungeons: Record<
      string,
      {
        tick: number;
        wave: number;
        paused: boolean;
        occupants: number;
        living: number;
      }
    >;
  };
  events: Array<{ id: number; kind: string; zoneId: string; sourceId: string }>;
}
interface Presentation {
  zoneId: string;
  camera: { x: number; y: number };
  actors: Array<{ id: string; texture: string }>;
  interactions: Array<{ id: string; x: number; y: number }>;
}
const read = (page: Page): Promise<Snapshot> =>
  page.evaluate('window.__VOLAM__.snapshot()');
const view = (page: Page): Promise<Presentation> =>
  page.evaluate('window.__VOLAM__.presentation()');
const hero = async (page: Page) => {
  const s = await read(page);
  return s.state.players[s.sessionId]!;
};
async function moveTo(page: Page, x: number, y: number) {
  await page.bringToFront();
  await page.locator('#game canvas').focus();
  for (const [axis, target, negative, positive] of [
    ['x', x, 'ArrowLeft', 'ArrowRight'],
    ['y', y, 'ArrowUp', 'ArrowDown'],
  ] as const) {
    const deadline = Date.now() + 25000;
    while (Date.now() < deadline) {
      const h = await hero(page),
        delta = target - h[axis];
      if (Math.abs(delta) <= 8) break;
      await page.keyboard.press(delta < 0 ? negative : positive, {
        delay: Math.min(900, Math.max(70, (Math.abs(delta) * 1000) / 160 - 30)),
      });
      await expect
        .poll(async () => (await hero(page)).lastSequence)
        .toBeGreaterThan(h.lastSequence);
      await expect.poll(async () => (await hero(page)).pose).not.toBe('walk');
    }
    expect(
      Math.abs((await hero(page))[axis] - target),
      `walk ${axis} to ${target}`,
    ).toBeLessThanOrEqual(8);
  }
}
async function clickWorld(page: Page, id: string) {
  // Read-only evidence bridge converts an actual Phaser object to a mouse click.
  const p = await view(page),
    object = p.interactions.find((o) => o.id === id)!;
  expect(object).toBeDefined();
  const canvas = page.locator('#game canvas'),
    box = (await canvas.boundingBox())!;
  const scale = await canvas.evaluate(
    (n) => n.clientWidth / (n as HTMLCanvasElement).width,
  );
  await page.mouse.click(
    box.x + (object.x - p.camera.x) * scale,
    box.y + (object.y - 20 - p.camera.y) * scale,
  );
}
async function enterDungeon(page: Page, access: 'private' | 'shared') {
  await page.getByRole('button', { name: 'Phó Bản', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveAttribute(
    'data-menu',
    'dungeons',
  );
  await expect(page.locator('#enter-dungeon')).toBeEnabled();
  const dialog = (await page.getByRole('dialog').boundingBox())!,
    size = page.viewportSize()!;
  expect(dialog.x).toBeGreaterThanOrEqual(0);
  expect(dialog.y + dialog.height).toBeLessThanOrEqual(size.height + 1);
  await page
    .getByRole('radio', {
      name: access === 'private' ? 'Riêng' : 'Chung',
      exact: true,
    })
    .click();
  await page.locator('#enter-dungeon').click();
  await expect.poll(async () => (await hero(page)).zoneId).not.toBe('arena');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#game canvas')).toBeFocused();
  await expect
    .poll(async () => (await view(page)).zoneId)
    .toBe((await hero(page)).zoneId);
}
async function exitDungeon(page: Page) {
  expect((await hero(page)).zoneId).not.toBe('arena');
  await moveTo(page, 160, 320);
  await clickWorld(page, 'dungeon-exit');
  await expect.poll(async () => (await hero(page)).zoneId).toBe('arena');
  await expect.poll(async () => (await view(page)).zoneId).toBe('arena');
  const h = await hero(page);
  expect(h.x).toBe(960);
  expect(h.y).toBe(576);
}
function monitor(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  return errors;
}
async function ranged(page: Page) {
  await page.locator('[data-menu=settings]').click();
  await page.locator('#dialog-content [data-menu=skills]').click();
  await page.getByLabel('Normal attack').selectOption('cai_bang_chuong');
  await expect
    .poll(async () => (await hero(page)).basicId)
    .toBe('cai_bang_chuong');
  // Normal progression rooms start with one point and no learned actives.
  // Spend that real point before the reward fixture uses Q in the dungeon.
  if (await page.locator('#skill-management').isVisible()) {
    await page.locator('#loadout-q').selectOption('hoa_van_chuong');
    await page.locator('#apply-loadout').click();
    await expect(page.locator('[data-upgrade=hoa_van_chuong]')).toBeEnabled();
    await page.locator('[data-upgrade=hoa_van_chuong]').click();
    await expect(page.locator('[data-rank=hoa_van_chuong]')).toContainText(
      '1/4',
    );
  }
  await page.keyboard.press('Escape');
  await expect
    .poll(async () => (await hero(page)).basicId)
    .toBe('cai_bang_chuong');
}
async function earnReward(page: Page) {
  const before = await hero(page),
    id = (await read(page)).sessionId;
  // Fight inside aggro range. At long range the intentionally non-homing M1
  // shots can miss the patrol, so a fixed number of distant shots is not a kill.
  await moveTo(page, 500, 320);
  await page.keyboard.press('KeyQ');
  await page.keyboard.press('KeyW');
  for (let n = 0; n < 9 && (await hero(page)).xp === before.xp; n++) {
    await expect.poll(async () => (await hero(page)).basicCooldown).toBe(0);
    const attacks = (await read(page)).events.filter(
      (e) => e.sourceId === id && e.kind === 'attack',
    ).length;
    await page.keyboard.press('KeyA');
    // Wait on authoritative cadence; projectiles may still be in flight.
    await expect
      .poll(
        async () =>
          (await read(page)).events.filter(
            (e) => e.sourceId === id && e.kind === 'attack',
          ).length,
      )
      .toBeGreaterThan(attacks);
    await expect.poll(async () => (await hero(page)).basicCooldown).toBe(0);
  }
  await expect
    .poll(async () => (await hero(page)).xp)
    .toBeGreaterThan(before.xp);
  expect((await hero(page)).gold).toBeGreaterThan(before.gold);
  // Retreat before screenshots/second-client inspection: the live dungeon must
  // continue attacking while the test driver is busy, just as an open menu does.
  await moveTo(page, 240, 320);
  expect((await hero(page)).hp).toBeGreaterThan(0);
}

test('two real clients share one creep wave, menu entry and physical exit', async ({
  browser,
}, info) => {
  test.setTimeout(150000);
  const ca = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    }),
    cb = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const a = await ca.newPage(),
    b = await cb.newPage(),
    errors = monitor(a),
    otherErrors = monitor(b);
  try {
    await joinWaiting(a, 'Dungeon A');
    await joinWaiting(b, 'Dungeon B', (await read(a)).roomId);
    await startTogether([a, b]);
    await a.locator('[data-menu=dungeons]').click();
    await expect(a.locator('#enter-dungeon')).toBeEnabled();
    expect(
      (await view(a)).interactions.some((o) => o.id === 'dungeon-guide'),
    ).toBe(false);
    await a.screenshot({ path: info.outputPath('menu-entry.png') });
    await a.keyboard.press('Escape');
    await ranged(a);
    await enterDungeon(a, 'shared');
    await enterDungeon(b, 'shared');
    const zone = (await hero(a)).zoneId,
      aId = (await read(a)).sessionId,
      bId = (await read(b)).sessionId;
    expect((await hero(b)).zoneId).toBe(zone);
    await expect
      .poll(
        async () =>
          (await view(a)).actors.filter((o) => [aId, bId].includes(o.id))
            .length,
      )
      .toBe(2);
    await expect
      .poll(async () => (await read(a)).state.dungeons[zone]?.occupants)
      .toBe(2);
    expect(Object.keys((await read(a)).state.creeps)).toEqual(
      Object.keys((await read(b)).state.creeps),
    );
    await earnReward(a);
    const killed = Object.entries((await read(a)).state.creeps).find(
      ([, c]) => c.hp === 0,
    )![0];
    await expect
      .poll(async () => (await read(b)).state.creeps[killed]?.hp)
      .toBe(0);
    expect((await hero(b)).xp).toBe(0); // present without contributing never receives a kill share
    await expect
      .poll(async () =>
        (await read(b)).events.some(
          (e) => e.zoneId === zone && e.sourceId === aId && e.kind === 'hit',
        ),
      )
      .toBe(true);
    const status = (await a.locator('#zone-status').boundingBox())!,
      toast = await a.locator('#feedback').boundingBox();
    if (toast) expect(status.y + status.height).toBeLessThanOrEqual(toast.y);
    await a.screenshot({ path: info.outputPath('shared-combat-a.png') });
    await b.screenshot({ path: info.outputPath('shared-combat-b.png') });
    await a.locator('[data-menu=settings]').click();
    await a.locator('#dialog-content [data-menu=skills]').click();
    await expect(a.locator('#basic-style')).toBeDisabled();
    await a.keyboard.press('Escape');
    await a.keyboard.press('KeyE');
    await expect(a.locator('#feedback')).toContainText(
      /not equipped|chưa trang bị/,
    );
    await exitDungeon(a);
    expect(
      Object.values((await read(a)).state.creeps).every(
        (c) => c.zoneId === 'arena',
      ),
    ).toBe(true);
    await expect
      .poll(async () => (await view(a)).actors.some((o) => o.id === bId))
      .toBe(false);
    const active = (await read(b)).state.dungeons[zone]!.tick;
    await expect
      .poll(async () => (await read(b)).state.dungeons[zone]!.tick)
      .toBeGreaterThan(active + 5);
    await exitDungeon(b);
    await expect
      .poll(async () => (await read(a)).state.dungeons[zone]!.paused)
      .toBe(true);
    const paused = (await read(a)).state.dungeons[zone]!.tick,
      start = (await read(a)).state.tick;
    await expect
      .poll(async () => (await read(a)).state.tick)
      .toBeGreaterThan(start + 12);
    expect((await read(a)).state.dungeons[zone]!.tick).toBe(paused);
    await enterDungeon(a, 'shared');
    expect((await hero(a)).zoneId).toBe(zone);
    await expect
      .poll(async () => (await read(a)).state.dungeons[zone]!.tick)
      .toBeGreaterThan(paused);
    await a.screenshot({ path: info.outputPath('shared-resumed.png') });
    expect(errors.concat(otherErrors)).toEqual([]);
  } finally {
    await Promise.all([ca.close(), cb.close()]);
  }
});

test('two real clients farm separate private instances and retain empty wave snapshots', async ({
  browser,
}, info) => {
  test.setTimeout(150000);
  const ca = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    }),
    cb = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const a = await ca.newPage(),
    b = await cb.newPage(),
    errors = monitor(a),
    otherErrors = monitor(b);
  try {
    await joinWaiting(a, 'Private A');
    await joinWaiting(b, 'Private B', (await read(a)).roomId);
    await startTogether([a, b]);
    await ranged(a);
    await enterDungeon(a, 'private');
    await enterDungeon(b, 'private');
    const za = (await hero(a)).zoneId,
      zb = (await hero(b)).zoneId,
      aId = (await read(a)).sessionId,
      bId = (await read(b)).sessionId;
    expect(za).not.toBe(zb);
    await expect
      .poll(async () => (await view(a)).actors.some((o) => o.id === bId))
      .toBe(false);
    await expect
      .poll(async () => (await view(b)).actors.some((o) => o.id === aId))
      .toBe(false);
    expect((await read(a)).state.dungeons[zb]).toBeUndefined();
    expect((await read(b)).state.dungeons[za]).toBeUndefined();
    await earnReward(a);
    expect((await hero(b)).xp).toBe(0);
    expect((await hero(b)).gold).toBe(0);
    expect(
      Object.values((await read(b)).state.creeps).every(
        (c) => c.hp === c.maxHp && c.zoneId === zb,
      ),
    ).toBe(true);
    expect((await read(b)).events.some((e) => e.zoneId === za)).toBe(false);
    await a.screenshot({ path: info.outputPath('private-a-1280.png') });
    await b.screenshot({ path: info.outputPath('private-b-1920.png') });
    const saved = (await read(a)).state.creeps;
    await exitDungeon(a);
    await expect
      .poll(async () => (await read(a)).state.dungeons[za]!.paused)
      .toBe(true);
    const local = (await read(a)).state.dungeons[za]!.tick,
      global = (await read(a)).state.tick;
    await expect
      .poll(async () => (await read(a)).state.tick)
      .toBeGreaterThan(global + 12);
    expect((await read(a)).state.dungeons[za]!.tick).toBe(local);
    expect(
      Object.keys((await read(a)).state.creeps).some((id) => id.startsWith(za)),
    ).toBe(false);
    await enterDungeon(a, 'private');
    expect((await hero(a)).zoneId).toBe(za);
    for (const [id, c] of Object.entries(saved))
      expect((await read(a)).state.creeps[id]?.hp).toBe(c.hp);
    await expect
      .poll(async () => (await read(a)).state.dungeons[za]!.tick)
      .toBeGreaterThan(local);
    await a.screenshot({ path: info.outputPath('private-resumed.png') });
    expect(errors.concat(otherErrors)).toEqual([]);
  } finally {
    await Promise.all([ca.close(), cb.close()]);
  }
});
