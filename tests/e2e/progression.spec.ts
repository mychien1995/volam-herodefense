import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { skillArt } from '@volam/game-data';
import { joinWaiting, startTogether } from './pregame-helper.js';
interface Hero {
  x: number;
  y: number;
  hp: number;
  mana: number;
  level: number;
  xp: number;
  gold: number;
  zoneId: string;
  pose: string;
  lastSequence: number;
  basicId: string;
  basicCooldown: number;
  qCooldown: number;
  qSkill: string;
  wSkill: string;
  eSkill: string;
  rSkill: string;
  build: {
    enabled: boolean;
    revision: number;
    earned: number;
    allocated: number;
    available: number;
    surplus: number;
    ranks: Record<string, number>;
    stats: Record<string, number>;
  };
}
interface Snapshot {
  sessionId: string;
  roomId: string;
  state: {
    tick: number;
    players: Record<string, Hero>;
    creeps: Record<string, Hero & { invasionWave: number }>;
    defense: { wave: number; noticeId: number };
  };
  events: Array<{
    id: number;
    kind: string;
    sourceId: string;
    targetId: string;
    abilityId: string;
    damage: number;
  }>;
}
interface Presentation {
  camera: { x: number; y: number };
  interactions: Array<{ id: string; x: number; y: number }>;
  skills: {
    loadedComponents: number;
    registeredAnimations: number;
    played: string[];
    observedFrames: string[];
  };
}
const read = (p: Page): Promise<Snapshot> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const view = (p: Page): Promise<Presentation> =>
  p.evaluate('window.__VOLAM__.presentation()');
const hero = async (p: Page) => {
  const s = await read(p);
  return s.state.players[s.sessionId]!;
};
const out = 'docs/evidence/m3b';
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
async function menu(p: Page) {
  await p.locator('.loadout-toggle').click();
  await expect(p.locator('#skill-management')).toBeVisible();
  if ((await p.locator('#skill-mode').inputValue()) === 'default') {
    await p.locator('#skill-mode').selectOption('custom');
    await expect
      .poll(async () => p.locator('#skill-mode').inputValue())
      .toBe('custom');
    await p.locator('#reset-skills').click();
    await expect(p.locator('#reset-skills')).toBeDisabled();
  }
}
async function close(p: Page) {
  await p.keyboard.press('Escape');
  await expect(p.getByRole('dialog')).toBeHidden();
  await expect(p.locator('#game canvas')).toBeFocused();
}
async function loadout(p: Page, ids: string[]) {
  for (let i = 0; i < 4; i++)
    await p.locator(`#loadout-${'qwer'[i]}`).selectOption(ids[i] ?? '');
  const before = (await hero(p)).build.revision;
  await p.locator('#apply-loadout').click();
  await expect
    .poll(async () => (await hero(p)).build.revision)
    .toBeGreaterThan(before);
}
async function upgrade(p: Page, id: string) {
  const before = (await hero(p)).build.revision;
  await p.locator(`[data-upgrade="${id}"]`).click();
  await expect
    .poll(async () => (await hero(p)).build.revision)
    .toBeGreaterThan(before);
}
async function moveTo(p: Page, x: number, y: number) {
  await p.bringToFront();
  await p.locator('#game canvas').focus();
  const xAxis = ['x', x, 'ArrowLeft', 'ArrowRight'] as const,
    yAxis = ['y', y, 'ArrowUp', 'ArrowDown'] as const;
  // From the east return marker, walk south before crossing the solid pedestal.
  const axes =
    (await hero(p)).zoneId === 'arena' ? [yAxis, xAxis] : [xAxis, yAxis];
  for (const [axis, target, negative, positive] of axes) {
    const end = Date.now() + 25000;
    while (Date.now() < end) {
      const h = await hero(p),
        d = target - h[axis];
      if (Math.abs(d) <= 9) break;
      await p.keyboard.press(d < 0 ? negative : positive, {
        delay: Math.min(900, Math.max(70, (Math.abs(d) * 1000) / 160 - 30)),
      });
      await expect
        .poll(async () => (await hero(p)).lastSequence)
        .toBeGreaterThan(h.lastSequence);
      await expect.poll(async () => (await hero(p)).pose).not.toBe('walk');
    }
    expect(Math.abs((await hero(p))[axis] - target)).toBeLessThanOrEqual(9);
  }
}
async function enter(p: Page, access: 'private' | 'shared') {
  await expect
    .poll(async () => (await hero(p)).hp, { timeout: 7500 })
    .toBeGreaterThan(0);
  await p.locator('[data-menu=dungeons]').click();
  await p
    .getByRole('radio', {
      name: access === 'private' ? 'Riêng' : 'Chung',
      exact: true,
    })
    .click();
  await p.locator('#enter-dungeon').click();
  await expect.poll(async () => (await hero(p)).zoneId).not.toBe('arena');
}
async function exit(p: Page) {
  await moveTo(p, 160, 320);
  await p.keyboard.press('Space');
  await expect.poll(async () => (await hero(p)).zoneId).toBe('arena');
}
async function farm(p: Page, minimumLevel: number) {
  await moveTo(p, 500, 320);
  const end = Date.now() + 35000;
  while ((await hero(p)).level < minimumLevel && Date.now() < end) {
    const h = await hero(p);
    expect(h.hp).toBeGreaterThan(0);
    await expect.poll(async () => (await hero(p)).basicCooldown).toBe(0);
    if (h.qCooldown === 0 && h.mana >= 18) await p.keyboard.press('KeyQ');
    await p.keyboard.press('KeyA');
    await p.waitForTimeout(300);
  }
  expect((await hero(p)).level).toBeGreaterThanOrEqual(minimumLevel);
  await moveTo(p, 240, 320);
}
test('M3B two players earn independently, upgrade mixed builds, return, respec and resume farming', async ({
  browser,
}) => {
  const ca = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    }),
    cb = await browser.newContext({ viewport: { width: 1920, height: 1080 } }),
    a = await ca.newPage(),
    b = await cb.newPage(),
    errors = [monitor(a), monitor(b)];
  try {
    await mkdir(out, { recursive: true });
    await joinWaiting(a, 'Chưởng Khách');
    await joinWaiting(b, 'Bổng Khách', (await read(a)).roomId);
    await startTogether([a, b]);
    expect((await hero(a)).build).toMatchObject({
      enabled: true,
      earned: 1,
      allocated: 1,
      available: 0,
      surplus: 0,
    });
    await menu(a);
    await expect(a.locator('[data-skill-card]')).toHaveCount(10);
    await expect(a.locator('.skill-style')).toHaveCount(2);
    await a.screenshot({ path: `${out}/skill-menu-1280.png` });
    await loadout(a, [
      'hoa_van_chuong',
      'hoanh_tao_bong',
      'pha_giap_bong',
      'truy_phong_bong',
    ]);
    await upgrade(a, 'hoa_van_chuong');
    await expect(a.locator('[data-upgrade=hoanh_tao_bong]')).toBeDisabled();
    await a.getByLabel('Đánh thường · A').selectOption('cai_bang_chuong');
    await expect
      .poll(async () => (await hero(a)).basicId)
      .toBe('cai_bang_chuong');
    await close(a);
    await menu(b);
    await loadout(b, [
      'hoanh_tao_bong',
      'cam_long_cong',
      'khang_long_huu_hoi',
      'phi_long_tai_thien',
    ]);
    await upgrade(b, 'hoanh_tao_bong');
    await close(b);
    await moveTo(b, 800, 980);
    expect((await hero(b)).build.ranks['hoa_van_chuong']).toBeUndefined();
    await enter(a, 'private');
    await menu(a);
    await expect(a.locator('#skill-readonly')).toContainText('Chỉ xem');
    await expect(a.locator('#reset-skills')).toBeDisabled();
    await expect(a.locator('#basic-style')).toBeDisabled();
    await a.screenshot({ path: `${out}/dungeon-readonly.png` });
    await close(a);
    await farm(a, 3);
    expect((await hero(b)).xp).toBe(0);
    expect((await hero(b)).level).toBe(1);
    await exit(a);
    await menu(a);
    await upgrade(a, 'hoa_van_chuong');
    await upgrade(a, 'hoanh_tao_bong');
    await a.screenshot({ path: `${out}/rank2-mixed-loadout.png` });
    const earned = (await hero(a)).build.earned;
    await a.locator('#reset-skills').click();
    await expect.poll(async () => (await hero(a)).build.available).toBe(earned);
    expect((await hero(a)).build.allocated).toBe(0);
    await upgrade(a, 'hoanh_tao_bong');
    await loadout(a, [
      'hoanh_tao_bong',
      'hoa_van_chuong',
      'pha_giap_bong',
      'truy_phong_bong',
    ]);
    await close(a);
    await moveTo(a, 800, 980);
    await enter(b, 'private');
    await farm(b, 2);
    expect((await hero(a)).level).toBeGreaterThanOrEqual(3);
    await exit(b);
    await menu(b);
    await b.locator('#reset-skills').click();
    await expect.poll(async () => (await hero(b)).build.allocated).toBe(0);
    await upgrade(b, 'cam_long_cong');
    await close(b);
    await enter(a, 'private');
    await expect.poll(async () => (await hero(a)).zoneId).toContain('private');
    expect((await hero(a)).build.ranks['hoanh_tao_bong']).toBe(1);
    await farm(a, 4);
    await writeFile(
      `${out}/independent-builds.json`,
      JSON.stringify({ a: await read(a), b: await read(b) }, null, 2),
    );
    expect(errors.flat()).toEqual([]);
  } finally {
    await ca.close();
    await cb.close();
  }
});
test('M3B live modal preserves controls and invasion warnings while two players see learned skill effects', async ({
  browser,
}) => {
  const ca = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    }),
    cb = await browser.newContext({ viewport: { width: 1280, height: 720 } }),
    a = await ca.newPage(),
    b = await cb.newPage(),
    errors = [monitor(a), monitor(b)];
  try {
    await joinWaiting(a, 'Hỏa Khách');
    await joinWaiting(b, 'Bổng Đồng Đội', (await read(a)).roomId);
    await startTogether([a, b]);
    await menu(a);
    await loadout(a, ['hoa_van_chuong', '', '', '']);
    await upgrade(a, 'hoa_van_chuong');
    await close(a);
    await menu(b);
    await loadout(b, ['hoanh_tao_bong', '', '', '']);
    await upgrade(b, 'hoanh_tao_bong');
    await close(b);
    await moveTo(a, 800, 680);
    await moveTo(b, 760, 680);
    await a.keyboard.press('KeyQ');
    await b.keyboard.press('KeyQ');
    await expect
      .poll(async () =>
        (await view(b)).skills.played.some((k) =>
          k.includes('hoa_van_chuong_character'),
        ),
      )
      .toBe(true);
    await expect
      .poll(async () =>
        (await view(a)).skills.played.some((k) =>
          k.includes('hoanh_tao_bong_vfx'),
        ),
      )
      .toBe(true);
    await a.screenshot({ path: `${out}/two-player-casts.png` });
    await moveTo(a, 800, 900);
    await menu(a);
    const before = await read(a),
      h = await hero(a),
      event = before.events.at(-1)?.id ?? 0;
    await a.keyboard.press('KeyA');
    await a.keyboard.press('KeyQ');
    await a.keyboard.press('ArrowRight');
    await a.waitForTimeout(350);
    const now = await hero(a);
    expect(now.x).toBeCloseTo(h.x);
    expect(now.y).toBeCloseTo(h.y);
    expect(
      (await read(a)).events.some(
        (e) =>
          e.id > event &&
          e.sourceId === before.sessionId &&
          ['cast', 'attack'].includes(e.kind),
      ),
    ).toBe(false);
    await expect
      .poll(() => a.locator('#invasion-warning').isVisible(), {
        timeout: 35000,
      })
      .toBe(true);
    expect((await read(a)).state.tick).toBeGreaterThan(before.state.tick);
    await a.screenshot({ path: `${out}/menu-invasion-warning.png` });
    await close(a);
    await moveTo(a, 900, 680);
    await expect
      .poll(async () => (await read(a)).state.defense.wave, { timeout: 35000 })
      .toBeGreaterThan(0);
    await a.keyboard.press('KeyQ');
    await expect.poll(async () => (await hero(a)).qCooldown).toBeGreaterThan(0);
    const actor = (await read(a)).sessionId,
      deadline = Date.now() + 18000;
    while (
      Date.now() < deadline &&
      !(await read(a)).events.some(
        (e) =>
          e.kind === 'hit' &&
          e.sourceId === actor &&
          e.targetId.startsWith('invasion_'),
      )
    ) {
      await a.keyboard.press('KeyA');
      if ((await hero(a)).qCooldown === 0) await a.keyboard.press('KeyQ');
      await a.waitForTimeout(650);
    }
    expect(
      (await read(a)).events.some(
        (e) =>
          e.kind === 'hit' &&
          e.sourceId === actor &&
          e.targetId.startsWith('invasion_'),
      ),
    ).toBe(true);
    expect((await view(a)).skills.loadedComponents).toBe(
      skillArt.assets.length,
    );
    expect((await view(a)).skills.registeredAnimations).toBe(
      skillArt.assets.reduce((n, a) => n + a.animations.length, 0),
    );
    await writeFile(
      `${out}/live-effects.json`,
      JSON.stringify({ a: await view(a), b: await view(b) }, null, 2),
    );
    expect(errors.flat()).toEqual([]);
  } finally {
    await ca.close();
    await cb.close();
  }
});
test('M3B skill menu stays inside compact and large full game viewports', async ({
  browser,
}) => {
  const context = await browser.newContext({
      viewport: { width: 944, height: 466 },
    }),
    p = await context.newPage(),
    errors = monitor(p);
  try {
    await joinWaiting(p, 'Võ Học');
    await startTogether([p]);
    await menu(p);
    for (const size of [
      { width: 944, height: 466 },
      { width: 1920, height: 1080 },
    ]) {
      await p.setViewportSize(size);
      await expect
        .poll(() => p.locator('#game canvas').boundingBox())
        .toMatchObject({ x: 0, y: 0, ...size });
      const box = (await p.getByRole('dialog').boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(size.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(size.height + 1);
      await p.screenshot({ path: `${out}/skill-menu-${size.width}.png` });
      expect(
        await p
          .locator('#dialog-content')
          .evaluate((n) => n.scrollWidth <= n.clientWidth),
      ).toBe(true);
    }
    await loadout(p, ['hoa_van_chuong', '', '', '']);
    await upgrade(p, 'hoa_van_chuong');
    await close(p);
    await expect(p.locator('#slot-q .skill-rank')).toBeVisible();
    await expect(p.locator('#slot-q .skill-rank')).toHaveText('1');
    await expect(p.locator('#available-points')).toHaveText('0');
    await p.screenshot({ path: `${out}/hotbar-rank-1920.png` });
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
test('M3C3 Thiếu Lâm uses its own thirteen-skill catalogue and starts with empty slots', async ({
  page,
}) => {
  const errors = monitor(page);
  await joinWaiting(page, 'Thiếu Lâm');
  await startTogether([page], ['thieu_lam']);
  await page.locator('.loadout-toggle').click();
  await expect(page.locator('#skill-management')).toContainText(
    'Dịch Cân Kinh',
  );
  await expect(page.locator('[data-upgrade]')).toHaveCount(13);
  await expect(
    page.locator('#loadout-q option[value=hoa_van_chuong]'),
  ).toHaveCount(0);
  expect((await hero(page)).qSkill).toBe('');
  await close(page);
  expect(errors).toEqual([]);
});
