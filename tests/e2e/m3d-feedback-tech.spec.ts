import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
import { joinWaiting, startTogether } from './pregame-helper.js';
type Actor = {
  x: number;
  y: number;
  hp: number;
  zoneId: string;
  dashCharges: number;
  dashRechargeTicks: number;
  blinkTicks: number;
  basicId: string;
  lastSequence: number;
};
type Event = {
  id: number;
  kind: string;
  abilityId: string;
  sourceId: string;
  targetId: string;
  stage?: string;
};
type Snapshot = {
  sessionId: string;
  roomId: string;
  events: Event[];
  state: {
    players: Record<string, Actor>;
    creeps: Record<string, Actor & { targetId: string }>;
    projectiles: Record<
      string,
      {
        abilityId: string;
        stage: string;
        x: number;
        y: number;
        lingerTicks: number;
      }
    >;
    areas: Record<string, { abilityId: string; x: number; y: number }>;
  };
};
const read = (p: Page) => p.evaluate<Snapshot>('window.__VOLAM__.snapshot()');
const hero = async (p: Page) => {
  const s = await read(p);
  return s.state.players[s.sessionId]!;
};
const evidence = qaEvidenceDirectory('docs/evidence/m3d-feedback-tech');
async function fixture(p: Page, data: Record<string, unknown>) {
  const s = await read(p),
    r = await fetch('http://127.0.0.1:2878/fixture', {
      method: 'POST',
      body: JSON.stringify({
        roomId: s.roomId,
        sessionId: s.sessionId,
        ...data,
      }),
    });
  expect(r.ok, await r.text()).toBe(true);
}
async function focus(p: Page) {
  await p.bringToFront();
  await p.locator('#game canvas').focus();
}
async function position(p: Page, x = 1000, y = 700) {
  await fixture(p, { action: 'position', x, y });
  await expect
    .poll(async () => Math.abs((await hero(p)).x - x))
    .toBeLessThan(1);
}
function monitor(p: Page) {
  const errors: string[] = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}
async function actors(p: Page) {
  return p.evaluate<{
    actors: Array<{
      id: string;
      texture: string;
      frame: string;
      filterMode: number;
      origin: number[];
      scale: number[];
    }>;
    observedHeroFrames: Record<string, string[]>;
    skills: unknown;
  }>('window.__VOLAM__.presentation()');
}
test('two clients: Vietnamese UI, Shift charges, A press-only and instance-wide dungeon aggro', async ({
  page,
  browser,
}) => {
  const peer = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    }),
    b = await peer.newPage(),
    errors = [monitor(page), monitor(b)];
  await joinWaiting(page, 'Võ Đang');
  const room = (await read(page)).roomId;
  await joinWaiting(b, 'Thiếu Lâm', room);
  await mkdir(evidence, { recursive: true });
  await page.screenshot({ path: evidence + '/lobby-font.png' });
  await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
  await expect(page.locator('#pregame .pre-title')).toHaveText('Chọn môn phái');
  await page.screenshot({ path: evidence + '/school-font.png' });
  for (const [p, school] of [
    [page, 'vo_dang'],
    [b, 'thieu_lam'],
  ] as const) {
    await p.locator(`#pregame button[data-school=${school}]`).click();
    await p.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  }
  await expect(page.locator('#pregame')).toBeHidden();
  await expect(b.locator('#pregame')).toBeHidden();
  await expect(page.locator('#school-name')).toHaveText('Võ Đang');
  const fonts = await page.locator('#hero-name').evaluate((el) => ({
    family: getComputedStyle(el).fontFamily,
    unicode: el.textContent === el.textContent?.normalize('NFC'),
  }));
  expect(fonts.family).toContain('Segoe UI');
  expect(fonts.unicode).toBe(true);
  await focus(page);
  const start = await hero(page);
  await page.keyboard.press('Shift');
  await expect.poll(async () => (await hero(page)).dashCharges).toBe(1);
  await expect
    .poll(async () =>
      Math.hypot(
        (await hero(page)).x - start.x,
        (await hero(page)).y - start.y,
      ),
    )
    .toBeGreaterThan(80);
  await page.keyboard.press('Shift');
  await expect.poll(async () => (await hero(page)).dashCharges).toBe(0);
  const id = (await read(page)).sessionId;
  await expect
    .poll(async () => (await read(b)).state.players[id]!.dashCharges)
    .toBe(0);
  await expect(page.locator('#dash-charges')).toHaveText('0');
  await page.screenshot({ path: evidence + '/arena-dash-font.png' });
  await expect
    .poll(async () => (await hero(page)).dashCharges, { timeout: 8000 })
    .toBe(1);
  await expect
    .poll(async () => (await hero(page)).dashCharges, { timeout: 8000 })
    .toBe(2);
  const before = (await read(page)).events.filter(
    (e) => e.kind === 'attack' && e.sourceId === id,
  ).length;
  await page.keyboard.down('a');
  await page.waitForTimeout(900);
  await page.keyboard.down('a');
  await page.waitForTimeout(300);
  await page.keyboard.up('a');
  expect(
    (await read(page)).events.filter(
      (e) => e.kind === 'attack' && e.sourceId === id,
    ),
  ).toHaveLength(before + 1);
  await page.keyboard.press('a');
  await expect
    .poll(
      async () =>
        (await read(page)).events.filter(
          (e) => e.kind === 'attack' && e.sourceId === id,
        ).length,
    )
    .toBe(before + 2);
  await page.getByRole('button', { name: 'Phó Bản', exact: true }).click();
  await page.screenshot({ path: evidence + '/dungeon-menu-font.png' });
  await page.locator('#enter-dungeon').click();
  await expect.poll(async () => (await hero(page)).zoneId).toContain('forest_');
  await expect
    .poll(
      async () =>
        Object.values((await read(page)).state.creeps).filter((e) => e.hp > 0)
          .length,
    )
    .toBe(6);
  await expect
    .poll(async () =>
      Object.values((await read(page)).state.creeps).every(
        (e) => e.targetId === id,
      ),
    )
    .toBe(true);
  await page.waitForTimeout(1000);
  const presentation = await actors(page);
  expect(presentation.actors.every((a) => a.filterMode === 1)).toBe(true);
  await page.screenshot({ path: evidence + '/forest-aggro.png' });
  await writeFile(
    evidence + '/natural-observation.json',
    JSON.stringify(
      { fonts, presentation, snapshot: await read(page), errors },
      null,
      2,
    ),
  );
  expect(errors.flat()).toEqual([]);
  await peer.close();
});
test('legal-build fixture: sword travels, pierces, lingers and recasts from the assigned E slot', async ({
  page,
}) => {
  const errors = monitor(page);
  await joinWaiting(page, 'Kiếm');
  await startTogether([page], ['vo_dang']);
  await fixture(page, {
    action: 'build',
    basic: 'vo_dang_kiem',
    ids: [
      'luong_nghi_thu',
      'huyen_am_chuong',
      'nhan_kiem_hop_nhat',
      'duong_khi_kich',
    ],
  });
  await position(page);
  await fixture(page, {
    action: 'targets',
    points: [
      { x: 1100, y: 700 },
      { x: 1220, y: 700 },
    ],
  });
  await focus(page);
  await page.keyboard.press('e');
  await expect
    .poll(async () =>
      Object.values((await read(page)).state.projectiles).some(
        (s) => s.abilityId === 'nhan_kiem_hop_nhat',
      ),
    )
    .toBe(true);
  await expect(page.locator('#slot-e')).toHaveAttribute(
    'data-recast-ready',
    'true',
  );
  await page.screenshot({ path: evidence + '/sword-flight.png' });
  await expect
    .poll(
      async () =>
        Object.values((await read(page)).state.projectiles).some(
          (s) => s.stage === 'sword_linger',
        ),
      { timeout: 6000 },
    )
    .toBe(true);
  const shot = Object.values((await read(page)).state.projectiles).find(
    (s) => s.stage === 'sword_linger',
  )!;
  await page.screenshot({ path: evidence + '/sword-linger.png' });
  await page.keyboard.press('e');
  await expect
    .poll(async () => Math.abs((await hero(page)).x - shot.x))
    .toBeLessThan(1);
  expect(
    (await read(page)).events.some((e) => e.stage === 'blink_arrive'),
  ).toBe(true);
  const hits = (await read(page)).events.filter(
    (e) => e.kind === 'hit' && e.abilityId === 'nhan_kiem_hop_nhat',
  );
  expect(new Set(hits.map((h) => h.targetId)).size).toBe(2);
  expect(hits).toHaveLength(2);
  await page.screenshot({ path: evidence + '/sword-blink-arrive.png' });
  expect(errors).toEqual([]);
});
test('legal-build fixture: monk four stages, forward ground strikes and longer cast', async ({
  page,
}) => {
  const errors = monitor(page);
  await joinWaiting(page, 'Thiếu Lâm');
  await startTogether([page], ['thieu_lam']);
  await fixture(page, {
    action: 'build',
    basic: 'thieu_lam_quyen',
    ids: [
      'la_han_quyen',
      'vi_da_quyen',
      'nhu_lai_niet_ban',
      'tam_gioi_quy_thien',
    ],
  });
  await position(page);
  await fixture(page, { action: 'targets', points: [{ x: 1080, y: 700 }] });
  await focus(page);
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('a');
    await page.waitForTimeout(1050);
  }
  expect(
    (await read(page)).events
      .filter((e) => e.kind === 'attack' && e.abilityId === 'thieu_lam_quyen')
      .map((e) => e.stage),
  ).toEqual(['left_fist', 'right_fist', 'front_kick', 'roundhouse_kick']);
  for (const key of ['q', 'w', 'e', 'r']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(1500);
  }
  const monk = await actors(page);
  await page.screenshot({ path: evidence + '/monk-skills.png' });
  await writeFile(
    evidence + '/monk-observation.json',
    JSON.stringify(
      {
        scope: 'Explicit legal-build/position/immortal-target fixture',
        monk,
        snapshot: await read(page),
        errors,
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
});
test('legal-build fixture: Cái Bang moving rank4 burn and foot-aligned armor slam', async ({
  page,
}) => {
  const errors = monitor(page);
  await joinWaiting(page, 'Cái Bang');
  await startTogether([page], ['cai_bang']);
  await fixture(page, {
    action: 'build',
    ids: [
      'khang_long_huu_hoi',
      'pha_giap_bong',
      'phi_long_tai_thien',
      'hoa_van_chuong',
    ],
  });
  await position(page);
  await focus(page);
  await page.keyboard.press('q');
  await expect
    .poll(async () =>
      Object.values((await read(page)).state.areas).some(
        (a) => a.abilityId === 'khang_long_huu_hoi',
      ),
    )
    .toBe(true);
  await page.keyboard.press('ArrowRight', { delay: 500 });
  await expect
    .poll(async () => {
      const s = await read(page),
        a = Object.values(s.state.areas).find(
          (a) => a.abilityId === 'khang_long_huu_hoi',
        );
      return a ? Math.abs(a.x - s.state.players[s.sessionId]!.x) : 999;
    })
    .toBeLessThan(1);
  await page.keyboard.press('w');
  await page.waitForTimeout(300);
  await page.screenshot({ path: evidence + '/armor-slam-burn.png' });
  const slam = await page.evaluate<
    { x: number; y: number; origin: number[] } | undefined
  >(
    "window.__VOLAM__.presentation().skills.feedback.transient.find(v => v.texture === 'bong_controls_v2_ground')",
  );
  expect(slam).toBeDefined();
  expect(slam!.origin).toEqual([0.5, 0.625]);
  expect(Math.abs(slam!.y - (await hero(page)).y)).toBeLessThan(1);
  await writeFile(
    evidence + '/cai-bang-observation.json',
    JSON.stringify(
      { presentation: await actors(page), snapshot: await read(page), errors },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
});
test('legal-build fixture: Thiên Sơn overhead windup and longer ten-hit finisher', async ({
  page,
}) => {
  const errors = monitor(page);
  await joinWaiting(page, 'Thiên Sơn');
  await startTogether([page], ['thien_son']);
  await fixture(page, {
    action: 'build',
    basic: 'thien_son_dao',
    ids: [
      'liet_phong_dao',
      'bach_liet_thien_kich',
      'luu_phong_bo',
      'chiet_mai_thu',
    ],
  });
  await position(page);
  await fixture(page, { action: 'targets', points: [{ x: 1080, y: 700 }] });
  await focus(page);
  await page.keyboard.press('q');
  await page.waitForTimeout(250);
  await page.screenshot({ path: evidence + '/blade-windup.png' });
  await page.waitForTimeout(1100);
  await page.keyboard.press('w');
  await page.waitForTimeout(1700);
  const events = (await read(page)).events;
  expect(
    events.filter(
      (e) => e.kind === 'hit' && e.abilityId === 'bach_liet_thien_kich',
    ),
  ).toHaveLength(11);
  const presentation = await actors(page);
  await writeFile(
    evidence + '/thien-son-observation.json',
    JSON.stringify(
      { presentation, snapshot: await read(page), errors },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
});
