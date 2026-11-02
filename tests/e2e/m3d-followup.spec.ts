import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { joinWaiting, startTogether } from './pregame-helper.js';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
const dir = qaEvidenceDirectory('docs/evidence/m3d-followup');
const snap = (p: Page) => p.evaluate<any>('window.__VOLAM__.snapshot()');
const view = (p: Page) => p.evaluate<any>('window.__VOLAM__.presentation()');
test('followup private creep pack separates in live Phaser without merging sprites into one point', async ({
  page,
}) => {
  await joinWaiting(page, 'Creep review');
  await startTogether([page], ['thieu_lam']);
  await fixture(page, { action: 'travel', destination: 'forest' });
  await fixture(page, { action: 'endurance' });
  await expect
    .poll(
      async () =>
        Object.values((await snap(page)).state.creeps).filter(
          (e: any) => e.hp > 0,
        ).length,
    )
    .toBeGreaterThanOrEqual(6);
  const before = await snap(page),
    first: any = Object.values(before.state.creeps).find((e: any) => e.hp > 0);
  await fixture(page, { action: 'position', x: first.x - 80, y: first.y });
  await fixture(page, {
    action: 'targets',
    mobile: true,
    points: Array.from({ length: 6 }, () => ({ x: first.x, y: first.y })),
  });
  await page.waitForTimeout(4000);
  const after = await snap(page),
    units: any[] = Object.values(after.state.creeps).filter(
      (e: any) => e.hp > 0,
    );
  expect(units).toHaveLength(6);
  let nearest = Infinity;
  for (let i = 0; i < units.length; i++)
    for (let j = i + 1; j < units.length; j++)
      nearest = Math.min(
        nearest,
        Math.hypot(units[i].x - units[j].x, units[i].y - units[j].y),
      );
  expect(nearest).toBeGreaterThan(8);
  expect((await view(page)).zoom).toBe(1);
  await capture(page, 'private-creep-pack');
  await mkdir(dir, { recursive: true });
  await writeFile(
    dir + '/creep-pack-observation.json',
    JSON.stringify(
      {
        scope:
          'six real mobile actors initially coincident via QA fixture; unmodified server AI/separation, four seconds at normal clock',
        nearest,
        units,
      },
      null,
      2,
    ),
  );
});
async function fixture(p: Page, data: Record<string, unknown>) {
  const s = await snap(p);
  const r = await fetch(
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
async function capture(p: Page, name: string) {
  if (process.env['VOLAM_QA_DEV_CLIENT'] === '1') return;
  await mkdir(dir, { recursive: true });
  await p.screenshot({ path: dir + '/' + name + '.png' });
}
test('followup solo: no summon modal, centered I, arena card and second death auto return', async ({
  page,
}) => {
  await joinWaiting(page, 'Solo review');
  await startTogether([page], ['thieu_lam']);
  await key(page, 'p');
  const image = page.locator('[data-destination="chu_ba_thong"] img');
  await expect(image).toHaveAttribute(
    'src',
    '/assets/m3d_followup/chu_arena.png',
  );
  const icon = page.locator('.boss-information').first();
  const metrics = await icon.evaluate((e) => {
    const s = getComputedStyle(e);
    return { display: s.display, padding: s.padding, line: s.lineHeight };
  });
  expect(metrics.display).toBe('grid');
  expect(metrics.padding).toBe('0px');
  await capture(page, 'dungeon-information-and-chu-arena');
  await page.locator('[data-destination="hong_liet"]').click();
  await page.locator('#enter-dungeon').click();
  await expect
    .poll(
      async () =>
        (await snap(page)).state.players[(await snap(page)).sessionId].zoneId,
    )
    .toBe('hong_liet_shared');
  await expect(page.locator('#boss-party-dialog')).toBeHidden();
  await expect(page.locator('#boss-help-button')).toBeHidden();
  await fixture(page, { action: 'kill' });
  await expect
    .poll(
      async () =>
        (await snap(page)).state.players[(await snap(page)).sessionId].hp,
    )
    .toBe(0);
  await expect
    .poll(
      async () =>
        (await snap(page)).state.players[(await snap(page)).sessionId].hp,
      { timeout: 7000 },
    )
    .toBeGreaterThan(0);
  await fixture(page, { action: 'kill' });
  await expect
    .poll(
      async () =>
        (await snap(page)).state.players[(await snap(page)).sessionId].zoneId,
    )
    .toBe('arena');
});
test('followup live Phaser: diagonal slam, giant Buddha, wine kill/drink, reflect and independent artillery', async ({
  browser,
}) => {
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const [a, b] = pages as [Page, Page],
    errors: string[] = [];
  pages.forEach((p) => p.on('pageerror', (e) => errors.push(e.message)));
  await joinWaiting(a, 'Bong review');
  await joinWaiting(b, 'Monk review', (await snap(a)).roomId);
  await startTogether(pages, ['cai_bang', 'thieu_lam']);
  await fixture(a, { action: 'build', ids: ['pha_giap_bong', '', '', ''] });
  await fixture(a, {
    action: 'position',
    x: 850,
    y: 650,
    fx: Math.SQRT1_2,
    fy: Math.SQRT1_2,
  });
  await a.waitForTimeout(150);
  await a.evaluate(() => {
    const w = window as any,
      deadline = Date.now() + 8000;
    w.__followupStill = new Promise((resolve) => {
      const inspect = () => {
        const v = w.__VOLAM__.presentation(),
          e = v.skills.r3.entities.find(
            (e: any) =>
              e.asset.endsWith('b3_pha_giap_vfx') &&
              e.frame.startsWith('impact_'),
          );
        if (e)
          return resolve({
            entity: e,
            zoom: v.zoom,
            png: document
              .querySelector<HTMLCanvasElement>('#game canvas')!
              .toDataURL('image/png'),
          });
        if (Date.now() > deadline)
          return resolve({ error: 'diagonal impact not observed' });
        requestAnimationFrame(inspect);
      };
      requestAnimationFrame(inspect);
    });
  });
  await key(a, 'q');
  const still = await a.evaluate<any>('window.__followupStill');
  expect(
    still.error,
    JSON.stringify({ snapshot: await snap(a), view: await view(a) }),
  ).toBeUndefined();
  expect(Math.abs(still.entity.rotation)).toBeCloseTo(Math.PI / 4);
  expect(still.zoom).toBe(1);
  if (process.env['VOLAM_QA_DEV_CLIENT'] !== '1') {
    await mkdir(dir, { recursive: true });
    await writeFile(
      dir + '/diagonal-slam.png',
      Buffer.from(still.png.split(',')[1], 'base64'),
    );
    delete still.png;
    await writeFile(
      dir + '/diagonal-observation.json',
      JSON.stringify(still, null, 2),
    );
  }
  await a.waitForTimeout(700);
  expect(
    Object.keys((await view(a)).skills.r3.frames).some((k) =>
      k.includes('b3_pha_giap_vfx:impact_'),
    ),
  ).toBe(true);
  await fixture(b, {
    action: 'build',
    ids: ['nhu_lai_niet_ban', 'vo_anh_cuoc', 'tam_gioi_quy_thien', ''],
  });
  await fixture(b, { action: 'position', x: 850, y: 720, fx: 1, fy: 0 });
  await b.waitForTimeout(100);
  await key(b, 'q');
  await expect
    .poll(
      async () =>
        (await view(b)).skills.r3.entities.find(
          (e: any) => e.asset === 'review3_r3_buddha',
        )?.scale[0],
      { intervals: [10, 20] },
    )
    .toBe(2);
  await capture(b, 'double-buddha');
  expect(
    await b
      .locator('#slot-e .pixel-icon')
      .evaluate((e) => (e as HTMLElement).style.backgroundImage),
  ).toContain('/assets/m3d_followup/su_tu_hong-icon.png');
  for (const p of pages) {
    await fixture(p, { action: 'travel', destination: 'chu_ba_thong' });
    await fixture(p, { action: 'endurance' });
  }
  await fixture(a, { action: 'boss-cast', ability: 'drink' });
  await expect
    .poll(async () => (await view(a)).chu.state.disciples.length)
    .toBe(2);
  const s = await snap(a),
    d: any = Object.values(s.state.creeps).find(
      (e: any) => e.archetypeId === 'chu_wine_disciple',
    );
  expect(d).toBeDefined();
  await fixture(a, { action: 'position', x: d.x - 30, y: d.y, fx: 1, fy: 0 });
  for (let n = 0; n < 4; n++) {
    const current = (await snap(a)).state.creeps[d.id];
    if (current?.hp > 0)
      await fixture(a, {
        action: 'position',
        x: current.x - 20,
        y: current.y,
        fx: 1,
        fy: 0,
      });
    await key(a, 'a');
    await a.waitForTimeout(400);
  }
  await expect
    .poll(async () => (await view(a)).chu.state.wine.length)
    .toBeGreaterThan(0);
  const bottle = (await view(a)).chu.state.wine[0];
  await fixture(a, { action: 'position', x: bottle.x, y: bottle.y });
  await a.waitForTimeout(150);
  await key(a, 'Space');
  await expect
    .poll(async () => (await view(a)).chu.state.wineDrinkers.length)
    .toBe(1);
  await expect
    .poll(async () => (await view(b)).chu.state.wineDrinkers.length)
    .toBe(1);
  await capture(a, 'wine-drink');
  await fixture(a, { action: 'boss-cast', ability: 'reflect' });
  const h = (await snap(a)).state.players[(await snap(a)).sessionId];
  await key(a, 'Shift');
  await a.waitForTimeout(180);
  expect(
    (await snap(a)).state.players[(await snap(a)).sessionId].dashCharges,
  ).toBe(h.dashCharges);
  for (const p of pages)
    await fixture(p, { action: 'travel', destination: 'hong_liet' });
  await fixture(a, { action: 'boss-cast', ability: 'hoa_phao_thien_la' });
  await a.waitForTimeout(2100);
  await expect
    .poll(async () =>
      (await snap(a)).events.some(
        (e: any) => e.kind === 'cast' && e.abilityId.startsWith('hong_liet_a'),
      ),
    )
    .toBe(true);
  await capture(a, 'artillery-and-basics');
  expect(errors).toEqual([]);
  await mkdir(dir, { recursive: true });
  await writeFile(
    dir + '/live-observations.json',
    JSON.stringify(
      {
        errors,
        views: await Promise.all(pages.map(view)),
        snapshots: await Promise.all(pages.map(snap)),
      },
      null,
      2,
    ),
  );
  await Promise.all(contexts.map((c) => c.close()));
});
