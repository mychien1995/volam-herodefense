import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { joinWaiting, startTogether } from './pregame-helper.js';
const evidence = resolve('docs/evidence/arena-v2');
test.use({ actionTimeout: 10000 });
interface Hero {
  x: number;
  y: number;
  hp: number;
  basicCooldown: number;
  lastSequence: number;
  pose: string;
  zoneId: string;
}
interface Hit {
  id: number;
  kind: string;
  sourceId: string;
  targetId: string;
  damage: number;
  critical: boolean;
  x: number;
  y: number;
}
interface NumberView {
  id: number;
  targetId: string;
  damage: number;
  critical: boolean;
  anchor: { x: number; y: number };
  x: number;
  y: number;
  alpha: number;
  text: string;
  color: string;
  fontSize: string;
  background: string | null;
  scrollFactor: number;
}
interface View {
  camera: { x: number; y: number };
  zoom: number;
  trees: Array<{ x: number; y: number }>;
  damage: {
    active: NumberView[];
    history: Array<{
      id: number;
      targetId: string;
      damage: number;
      critical: boolean;
      anchor: { x: number; y: number };
    }>;
  };
}
interface Snapshot {
  sessionId: string;
  state: {
    tick: number;
    players: Record<string, Hero>;
    creeps: Record<string, Hero>;
  };
  events: Hit[];
}
const read = (p: Page): Promise<Snapshot> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const view = (p: Page): Promise<View> =>
  p.evaluate('window.__VOLAM__.presentation()');
const hero = async (p: Page) => {
  const s = await read(p);
  return s.state.players[s.sessionId]!;
};
function monitor(p: Page) {
  const errors: string[] = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  p.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  return errors;
}
async function inside(p: Page, selector: string) {
  const b = (await p.locator(selector).boundingBox())!,
    s = p.viewportSize()!;
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.y).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(s.width + 1);
  expect(b.y + b.height).toBeLessThanOrEqual(s.height + 1);
  return b;
}
async function walk(p: Page, x: number, y: number) {
  await p.locator('#game canvas').focus();
  for (const [axis, target, minus, plus] of [
    ['x', x, 'ArrowLeft', 'ArrowRight'],
    ['y', y, 'ArrowUp', 'ArrowDown'],
  ] as const) {
    const deadline = Date.now() + 14000;
    while (Date.now() < deadline) {
      const h = await hero(p),
        delta = target - h[axis];
      if (Math.abs(delta) <= 8) break;
      await p.keyboard.press(delta < 0 ? minus : plus, {
        delay: Math.min(120, Math.max(30, Math.abs(delta) * 5 - 25)),
      });
      await expect
        .poll(async () => (await hero(p)).lastSequence)
        .toBeGreaterThan(h.lastSequence);
      await expect.poll(async () => (await hero(p)).pose).not.toBe('walk');
    }
    expect(Math.abs((await hero(p))[axis] - target)).toBeLessThanOrEqual(8);
  }
}
for (const size of [
  { width: 944, height: 466 },
  { width: 1920, height: 1080 },
])
  test(`expanded arena and selector ${size.width}x${size.height}`, async ({
    browser,
  }) => {
    test.setTimeout(75000);
    mkdirSync(evidence, { recursive: true });
    const context = await browser.newContext({ viewport: size }),
      page = await context.newPage(),
      errors = monitor(page);
    try {
      await joinWaiting(page, 'Tiêu Phong');
      await startTogether([page]);
      await expect(page.locator('#scene-status')).toHaveAttribute(
        'data-ready',
        'true',
      );
      await page.screenshot({
        path: resolve(evidence, `arena-${size.width}.png`),
      });
      expect((await view(page)).zoom).toBe(1);
      expect(
        (await view(page)).trees.some((t) => t.x === 680 || t.x === 840),
      ).toBe(false);
      await walk(page, 650, 650);
      await walk(page, 720, 650); // through the removed authoritative trunk
      for (const selector of [
        '.hero-hud',
        '.system-buttons',
        '.hotbar',
        '.bag-cluster',
      ])
        await inside(page, selector);
      await page.locator('[data-menu=dungeons]').click();
      await expect(page.getByRole('dialog')).toHaveAttribute(
        'data-menu',
        'dungeons',
      );
      await inside(page, '#game-dialog');
      await inside(page, '#dialog-actions');
      await expect(page.locator('.destination-illustration')).toHaveCount(4);
      expect(
        await page
          .locator('.destination-illustration')
          .evaluateAll((nodes) =>
            nodes.every(
              (n) =>
                n instanceof HTMLImageElement &&
                n.complete &&
                n.naturalWidth === 512 &&
                n.naturalHeight === 768,
            ),
          ),
      ).toBe(true);
      for (const card of ['forest', 'desert', 'sea', 'hell'])
        await inside(page, `[data-destination=${card}]`);
      await expect(page.locator('[data-destination=forest]')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(page.locator('[data-destination=hell]')).toBeDisabled();
      await page.locator('[data-destination=hell]').focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#dungeon-availability')).toContainText(
        'Địa Ngục hiện chưa mở',
      );
      await expect(page.locator('[data-destination=forest]')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await page.locator('[data-destination=forest]').click();
      await page.getByRole('radio', { name: 'Chung', exact: true }).click();
      await expect(
        page.getByRole('radio', { name: 'Chung', exact: true }),
      ).toHaveAttribute('aria-checked', 'true');
      await expect(
        page.getByRole('radio', { name: 'Boss · Chưa mở', exact: true }),
      ).toBeDisabled();
      await expect(page.locator('#enter-dungeon')).toBeEnabled();
      await expect(page.locator('#dialog-content')).not.toContainText(
        /M1|M2A|backend|PREVIEW|milestone/,
      );
      await page.screenshot({
        path: resolve(evidence, `selector-${size.width}.png`),
      });
      await page.getByRole('button', { name: 'Đóng', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeHidden();
      await expect(page.locator('#game canvas')).toBeFocused();
      const h = await hero(page);
      await page.keyboard.press('ArrowRight', { delay: 80 });
      await expect.poll(async () => (await hero(page)).x).toBeGreaterThan(h.x);
      await page.locator('[data-menu=dungeons]').click();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });

test('real authoritative normal/critical and simultaneous hits float above their targets', async ({
  page,
}) => {
  test.setTimeout(150000);
  mkdirSync(evidence, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors = monitor(page);
  await joinWaiting(page, 'Hỏa Khách');
  await startTogether([page]);
  await page.locator('[data-menu=skills]').first().click();
  await page.getByLabel('Normal attack').selectOption('cai_bang_chuong');
  await page.keyboard.press('Escape');
  const id = (await read(page)).sessionId;
  await expect
    .poll(
      async () => {
        const s = await read(page),
          h = s.state.players[id]!;
        return Object.values(s.state.creeps).filter(
          (c) => c.hp > 0 && Math.hypot(c.x - h.x, c.y - h.y) < 60,
        ).length;
      },
      { timeout: 10000 },
    )
    .toBeGreaterThanOrEqual(2);
  await page.keyboard.press('KeyW');
  await page.keyboard.press('KeyQ');
  const captured = new Set<string>(),
    observed = new Map<number, NumberView>();
  let simultaneous = false;
  const deadline = Date.now() + 100000;
  while (Date.now() < deadline && (captured.size < 2 || !simultaneous)) {
    const s = await read(page),
      v = await view(page);
    const numbers = v.damage.active
      .filter((n) => n.targetId.startsWith('creep_') && n.alpha > 0.2)
      .sort((a, b) => Number(b.critical) - Number(a.critical));
    if (new Set(numbers.map((n) => n.targetId)).size >= 2) simultaneous = true;
    for (const n of numbers) {
      observed.set(n.id, n);
      const event = s.events.find((e) => e.id === n.id);
      if (event) {
        expect(n.anchor).toEqual({ x: event.x, y: event.y });
        expect(n.damage).toBe(event.damage);
        expect(n.critical).toBe(event.critical);
        expect(n.targetId).toBe(event.targetId);
      }
      expect(Math.abs(n.x - n.anchor.x)).toBeLessThanOrEqual(24);
      expect(n.y).toBeLessThan(n.anchor.y - 45);
      expect(n.scrollFactor).toBe(1);
      expect(n.background).toBeFalsy();
      const kind = n.critical ? 'critical' : 'normal';
      if (!captured.has(kind)) {
        captured.add(kind);
        expect(n.color).toBe(n.critical ? '#ffc85c' : '#fff4db');
        await page.screenshot({
          path: resolve(evidence, `damage-${kind}.png`),
        });
      }
    }
    if ((await hero(page)).hp > 0 && (await hero(page)).basicCooldown === 0)
      await page.keyboard.press('KeyA');
    // Keep the real server RNG/values; the server gates repeated cast requests.
    if (s.state.tick % 90 < 5) await page.keyboard.press('KeyQ');
    await page.waitForTimeout(35);
  }
  expect([...captured].sort()).toEqual(['critical', 'normal']);
  expect(simultaneous).toBe(true);
  expect(await page.locator('#feedback').textContent()).not.toMatch(
    /\d+ damage|Critical/,
  );
  const before = (await view(page)).damage.history;
  await walk(page, (await hero(page)).x - 40, (await hero(page)).y);
  // Completed/dead/disappeared targets do not hold a number at a screen anchor.
  await page.waitForTimeout(900);
  expect(
    (await view(page)).damage.active.every((n) => n.alpha >= 0 && n.alpha <= 1),
  ).toBe(true);
  writeFileSync(
    resolve(evidence, 'damage-events.json'),
    JSON.stringify(
      {
        observed: [...observed.values()],
        history: before,
        simultaneous,
        errors,
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
});
