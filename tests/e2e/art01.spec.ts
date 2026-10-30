import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { joinWaiting, startTogether } from './pregame-helper.js';

const evidence = resolve('docs/evidence/art01');
interface Hero {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  xp: number;
  level: number;
  gold: number;
  basicCooldown: number;
  qCooldown: number;
  wCooldown: number;
  lastSequence: number;
}
interface Snapshot {
  sessionId: string;
  roomId: string;
  state: { tick: number; players: Record<string, Hero> };
  events: Array<{ id: number; kind: string; sourceId: string }>;
}
const read = (page: Page): Promise<Snapshot> =>
  page.evaluate('window.__VOLAM__.snapshot()');
const hero = async (page: Page) => {
  const s = await read(page);
  return s.state.players[s.sessionId]!;
};
async function open(page: Page, menu: string) {
  if (!(await page.locator(`[data-menu=${menu}]`).count()))
    await page.locator('[data-menu=settings]').click();
  await page.locator(`[data-menu=${menu}]`).first().click();
  await expect(page.getByRole('dialog')).toHaveAttribute('data-menu', menu);
}
async function inside(page: Page, selector: string) {
  const b = (await page.locator(selector).boundingBox())!;
  const size = page.viewportSize()!;
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.y).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(size.width + 1);
  expect(b.y + b.height).toBeLessThanOrEqual(size.height + 1);
  return b;
}
for (const size of [
  { width: 954, height: 458 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
]) {
  test(`ART01 live arena and compact HUD ${size.width}x${size.height}`, async ({
    browser,
  }) => {
    test.setTimeout(60000);
    mkdirSync(evidence, { recursive: true });
    const context = await browser.newContext({ viewport: size });
    const page = await context.newPage();
    const errors: string[] = [];
    const badRequests: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('response', (r) => {
      if (r.url().includes('/assets/') && !r.ok())
        badRequests.push(`${r.status()} ${r.url()}`);
    });
    try {
      await joinWaiting(page, 'Tiêu Phong');
      await startTogether([page]);
      await expect(page.locator('#scene-status')).toHaveAttribute(
        'data-ready',
        'true',
      );
      const presentation = await page.evaluate<any>(
        'window.__VOLAM__.presentation()',
      );
      expect(presentation.zoom).toBe(1);
      expect(presentation.rotation).toBe(0);
      expect(presentation.art01.textures.every((t: any) => t.exists)).toBe(
        true,
      );
      expect(
        presentation.art01.objects.find(
          (o: any) => o.name === 'art01:statue_male',
        ),
      ).toMatchObject({ x: 800, y: 576, depth: 576 });
      const frame = presentation.art01.objects.find(
        (o: any) => o.name === 'art01:cascade',
      ).frame;
      await expect
        .poll(async () =>
          page.evaluate(
            'window.__VOLAM__.presentation().art01.objects.find(o=>o.name==="art01:cascade").frame',
          ),
        )
        .not.toBe(frame);
      if (size.width === 1280) {
        const observed = new Map<string, Set<string>>();
        for (let sample = 0; sample < 24; sample++) {
          const objects = await page.evaluate<
            Array<{ animation?: string; frame: string }>
          >('window.__VOLAM__.presentation().art01.objects');
          for (const object of objects)
            if (object.animation) {
              const frames =
                observed.get(object.animation) ?? new Set<string>();
              frames.add(object.frame);
              observed.set(object.animation, frames);
            }
          await page.waitForTimeout(50);
        }
        for (const key of ['cascade_flow', 'stream_pool_flow', 'lantern_glow'])
          expect(observed.get(key)?.size, key).toBe(4);
        writeFileSync(
          resolve(evidence, 'ambient-runtime-frames.json'),
          JSON.stringify(
            Object.fromEntries(
              [...observed].map(([key, frames]) => [key, [...frames]]),
            ),
            null,
            2,
          ),
        );
      }
      const heroBox = await inside(page, '.hero-hud'),
        utility = await inside(page, '.system-buttons');
      expect(heroBox.x + heroBox.width).toBeLessThan(utility.x);
      const bag = await inside(page, '.bag-cluster'),
        bar = await inside(page, '.hotbar');
      expect(bag.x + bag.width).toBeLessThan(bar.x);
      expect(
        await page
          .locator('.system-buttons button')
          .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label'))),
      ).toEqual(['Settings', 'Quit', 'Phó Bản', 'Thương Gia', 'Lôi Đài']);
      expect(
        await page.locator('.minimap,.world-status,.room-chip').count(),
      ).toBe(0);
      await expect(page.locator('#hero-name')).toHaveText('Tiêu Phong');
      await expect(page.locator('#hero-level')).toHaveText(
        String((await hero(page)).level),
      );
      await expect(page.locator('.live-gold').first()).toHaveText(
        String((await hero(page)).gold),
      );
      await page.screenshot({
        path: resolve(evidence, `gameplay_${size.width}x${size.height}.png`),
      });
      for (const menu of [
        'inventory',
        'settings',
        'dungeons',
        'merchant',
        'pvp',
        'skills',
        'party',
      ]) {
        await open(page, menu);
        await inside(page, '#game-dialog');
        if (menu === 'inventory' || menu === 'dungeons' || menu === 'settings')
          await page.screenshot({
            path: resolve(evidence, `${menu}_${size.width}x${size.height}.png`),
          });
        await page.keyboard.press('Escape');
        await expect(page.locator('#game canvas')).toBeFocused();
      }
      expect(errors).toEqual([]);
      expect(badRequests).toEqual([]);
      writeFileSync(
        resolve(evidence, `runtime_${size.width}x${size.height}.json`),
        JSON.stringify(
          {
            size,
            errors,
            badRequests,
            presentation,
            snapshot: await read(page),
            hud: { heroBox, utility, bag, bar },
          },
          null,
          2,
        ),
      );
    } finally {
      await context.close();
    }
  });
}

test('ART01 two clients retain movement/combat, menus and live server values', async ({
  browser,
}) => {
  test.setTimeout(90000);
  mkdirSync(evidence, { recursive: true });
  const aContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const bContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const a = await aContext.newPage(),
    b = await bContext.newPage();
  const errors: string[] = [];
  for (const page of [a, b])
    page.on('pageerror', (e) => errors.push(e.message));
  try {
    await joinWaiting(a, 'ART01 Host');
    await joinWaiting(b, 'ART01 Guest', (await read(a)).roomId);
    await startTogether([a, b]);
    const start = await hero(a);
    await a.keyboard.down('ArrowLeft');
    await expect.poll(async () => (await hero(a)).x).toBeLessThan(start.x - 45);
    await a.keyboard.up('ArrowLeft');
    const id = (await read(a)).sessionId;
    await expect
      .poll(async () =>
        Math.abs((await read(b)).state.players[id]!.x - (await hero(a)).x),
      )
      .toBeLessThan(0.01);
    await open(a, 'inventory');
    await a.waitForTimeout(150);
    const stopped = await hero(a),
      before = await read(a);
    for (const key of ['ArrowUp', 'KeyA', 'KeyQ', 'KeyW', 'KeyE', 'KeyR'])
      await a.keyboard.press(key);
    await a.waitForTimeout(200);
    expect((await hero(a)).lastSequence).toBe(stopped.lastSequence);
    const bStart = await hero(b);
    await b.keyboard.down('ArrowDown');
    await expect
      .poll(async () => (await hero(b)).y)
      .toBeGreaterThan(bStart.y + 10);
    await b.keyboard.up('ArrowDown');
    expect((await read(a)).state.tick).toBeGreaterThan(before.state.tick);
    await a.keyboard.press('Escape');
    await expect(a.locator('#game canvas')).toBeFocused();
    const resumed = await hero(a);
    await a.keyboard.down('ArrowLeft');
    await expect
      .poll(async () => (await hero(a)).x)
      .toBeLessThan(resumed.x - 10);
    await a.keyboard.up('ArrowLeft');
    await a.keyboard.press('KeyA');
    await a.keyboard.press('KeyQ');
    await a.keyboard.press('KeyW');
    await expect
      .poll(
        async () =>
          (await read(a)).events.filter(
            (e) => e.sourceId === id && e.kind === 'cast',
          ).length,
      )
      .toBe(2);
    await expect(a.locator('#slot-q')).toHaveClass(/cooling/);
    await expect(a.locator('#slot-w')).toHaveClass(/cooling/);
    await expect
      .poll(async () =>
        a.evaluate(
          `Number(document.querySelector('.meter.mp').getAttribute('aria-valuenow')) === window.__VOLAM__.snapshot().state.players[window.__VOLAM__.snapshot().sessionId].mana`,
        ),
      )
      .toBe(true);
    await a.screenshot({
      path: resolve(evidence, 'combat_cooldowns_two_clients.png'),
    });
    await open(a, 'skills');
    await a.getByLabel('Normal attack').selectOption('cai_bang_chuong');
    await a.keyboard.press('Escape');
    await expect(a.locator('#slot-a .pixel-icon')).toHaveClass(/icon-palm/);
    await a.keyboard.press('KeyE');
    await a.keyboard.press('KeyR');
    await expect(a.locator('#feedback')).toContainText('not equipped');
    await expect(a.locator('#hp-text')).toContainText('HP');
    await expect(a.locator('#xp-text')).toContainText('XP');
    await open(a, 'settings');
    await a.locator('[data-menu=party]').click();
    await a.locator('#check').click();
    await expect(a.locator('#ack')).toContainText('Server acknowledged');
    await a.keyboard.press('Escape');
    const final = await read(a);
    writeFileSync(
      resolve(evidence, 'multiplayer.json'),
      JSON.stringify(
        { errors, snapshot: final, guest: await read(b) },
        null,
        2,
      ),
    );
    expect(errors).toEqual([]);
    await b.locator('[data-action=quit]').click();
    await expect(b.locator('#pregame')).toBeVisible();
  } finally {
    await aContext.close();
    await bContext.close();
  }
});
