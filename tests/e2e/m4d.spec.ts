import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { pressQaAndWait } from '../../tools/qa-browser.mjs';
import { joinWaiting, startTogether } from './pregame-helper.js';
const snap = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const art = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.presentation()');
async function create(p: Page, id: string) {
  await p.goto('/?debug=1');
  await p.locator('[data-action=play]').click();
  await p.locator('#pre-nickname').fill('M4D chủ phòng');
  await p.getByRole('button', { name: 'Vào game', exact: true }).click();
  await p.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
  await p.locator('#pre-arena').selectOption(id);
  await p.locator('[data-action="confirm-create"]').click();
  await expect(p.locator('#pregame .pre-title')).toHaveText('Phòng chờ');
}
async function fixture(
  p: Page,
  op: string,
  extra: Record<string, string> = {},
) {
  const s = await snap(p);
  const r = await p.request.post(
    '/__m4d?' +
      new URLSearchParams({ room: s.roomId, id: s.sessionId, op, ...extra }),
  );
  expect(r.ok(), await r.text()).toBe(true);
}
test('DH-B representative layered slice: two peers, shading and preserved sprite scale', async ({
  page,
  browser,
}) => {
  const peer = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    }),
    b = await peer.newPage();
  const errors: string[] = [];
  for (const p of [page, b]) {
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('response', (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
  }
  try {
    await create(page, 'dao_hoa_dao');
    await joinWaiting(b, 'M4D đồng đội', (await snap(page)).roomId);
    await startTogether([page, b], ['cai_bang_bong', 'vo_dang_kiem'], 45000);
    await expect
      .poll(async () => (await art(page))?.m4dArena?.props?.length)
      .toBeGreaterThan(4);
    const a = await art(page);
    expect(a.m4dArena.ground).toBe('m4d-ground-dao_hoa_dao');
    expect(
      a.m4dArena.props.every(
        (p: any) => p.scale[0] === p.scale[1] && p.depth === p.y,
      ),
    ).toBe(true);
    expect(a.worldDepth.enabled).toBe(true);
    expect((await snap(b)).state.defense.arenaId).toBe('dao_hoa_dao');
    await expect(page.locator('#slot-z')).toHaveCount(0);
    const id = (await snap(page)).sessionId;
    const before = (await snap(b)).state.players[id].x;
    await page.locator('#game canvas').focus();
    await page.keyboard.down('ArrowRight');
    await expect
      .poll(async () => (await snap(b)).state.players[id].x)
      .toBeGreaterThan(before + 12);
    await page.keyboard.up('ArrowRight');
    await mkdir('docs/evidence/m4d-r3', { recursive: true });
    await page.screenshot({ path: 'docs/evidence/m4d-r3/dh-b-slice.png' });
    await writeFile(
      'docs/evidence/m4d-r3/dh-b-slice.json',
      JSON.stringify(
        {
          stage: 'two-player-slice',
          art: a.m4dArena,
          shading: a.worldDepth,
          errors,
        },
        null,
        2,
      ),
    );
    expect(errors).toEqual([]);
  } finally {
    await peer.close();
  }
});

test('TD-B layered night fortress, room selection and peer overhead status', async ({
  page,
  browser,
}) => {
  const peer = await browser.newContext({
      viewport: { width: 1366, height: 768 },
    }),
    b = await peer.newPage();
  const errors: string[] = [];
  for (const p of [page, b]) p.on('pageerror', (e) => errors.push(e.message));
  try {
    await create(page, 'tuong_duong');
    await joinWaiting(b, 'Đồng đội Tương Dương', (await snap(page)).roomId);
    await startTogether([page, b], ['cai_bang_bong', 'vo_dang_kiem'], 45000);
    await expect
      .poll(async () => (await art(page))?.m4dArena?.id)
      .toBe('tuong_duong');
    expect((await snap(b)).state.defense.arenaId).toBe('tuong_duong');
    const id = (await snap(page)).sessionId;
    await fixture(page, 'status');
    await expect
      .poll(
        async () =>
          (await art(b)).statusPresentation.find((s: any) => s.id === id)?.icons
            .length,
      )
      .toBe(3);
    const first = (await art(b)).statusPresentation.find(
      (s: any) => s.id === id,
    ).icons;
    await expect
      .poll(
        async () =>
          (await art(b)).statusPresentation.find((s: any) => s.id === id)
            ?.icons[0]?.x,
      )
      .not.toBe(first[0].x);
    const actor = (await art(b)).actors.find((s: any) => s.id === id);
    expect(actor.label.text).not.toContain('Choáng');
    expect(actor.label.text).not.toContain('\n');
    await mkdir('docs/evidence/m4d-r3', { recursive: true });
    await page.screenshot({ path: 'docs/evidence/m4d-r3/td-b-night.png' });
    await expect
      .poll(
        async () =>
          (await art(b)).statusPresentation.find((s: any) => s.id === id),
        { timeout: 10000 },
      )
      .toBeUndefined();
    expect(errors).toEqual([]);
  } finally {
    await peer.close();
  }
});

test('TH-B six-player lotus bridges, two creep rows, death identity and boss statue cluster', async ({
  browser,
}) => {
  test.setTimeout(240000);
  const began = performance.now();
  const stage = (label: string) =>
    console.info(
      `[m4d] ${label}: ${((performance.now() - began) / 1000).toFixed(1)}s`,
    );
  const contexts = await Promise.all(
    Array.from({ length: 6 }, () =>
      browser.newContext({ viewport: { width: 1366, height: 768 } }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage())),
    a = pages[0]!,
    b = pages[1]!;
  const errors: string[] = [];
  for (const p of pages) {
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('response', (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
  }
  try {
    await create(a, 'tu_hien_trang');
    const room = (await snap(a)).roomId;
    stage('created');
    for (let i = 1; i < 6; i++)
      await joinWaiting(pages[i]!, `Tụ Hiền ${i}`, room, '/?debug=1', 45000);
    stage('six peers joined');
    await startTogether(
      pages,
      [
        'cai_bang_bong',
        'vo_dang_kiem',
        'thieu_lam_quyen',
        'thien_son_dao',
        'duong_mon_am_khi',
        'ngu_doc_ta_hiep',
      ],
      45000,
    );
    stage('six Phaser clients ready');
    for (const p of pages)
      expect((await snap(p)).state.defense.arenaId).toBe('tu_hien_trang');
    await fixture(a, 'place', { x: '1024', y: '670' });
    await a.locator('#game canvas').focus();
    await a.keyboard.down('ArrowDown');
    const id = (await snap(a)).sessionId;
    const bankTick = (await snap(a)).state.tick;
    await expect
      .poll(async () => (await snap(a)).state.tick)
      .toBeGreaterThan(bankTick + 45);
    await a.keyboard.up('ArrowDown');
    // Inner south-east pond bank: the next downward movement is blocked by authoritative water.
    expect((await snap(a)).state.players[id].y).toBeLessThan(706);
    await fixture(a, 'place', { x: '800', y: '820' });
    await a.locator('#game canvas').focus();
    await a.keyboard.down('ArrowDown');
    await expect
      .poll(async () => (await snap(b)).state.players[id].y)
      .toBeGreaterThan(860);
    await a.keyboard.up('ArrowDown');
    stage('bank and bridge movement acknowledged');
    await fixture(a, 'invasion');
    await expect
      .poll(
        async () =>
          Object.keys((await snap(a)).state.creeps).filter((k) =>
            k.startsWith('invasion_'),
          ).length,
      )
      .toBeGreaterThanOrEqual(8);
    const all = (await snap(a)).state.creeps;
    const first = Object.keys(all).find((k) => k === 'invasion_1_west_0')!;
    expect(all[first + '_r2']).toBeDefined();
    expect(Math.abs(all[first].y - all[first + '_r2'].y)).toBeGreaterThan(20);
    stage('two rows spawned');
    await fixture(a, 'target', { target: first });
    await expect
      .poll(
        async () =>
          (await art(a)).actors.find((e: any) => e.id === first)?.texture,
      )
      .toContain('renovated-');
    const live = (await art(a)).actors.find((e: any) => e.id === first);
    await expect
      .poll(async () =>
        JSON.parse((await snap(a)).state.players[id].statuses).some((s: any) =>
          ['stun', 'disarm'].includes(s.kind),
        ),
      )
      .toBe(false);
    stage('stationary target ready');
    await pressQaAndWait(
      a,
      'a',
      (target: string) => {
        const s = (window as any).__VOLAM__.snapshot();
        return s.state.creeps[target]?.hp === 0;
      },
      first,
      { label: 'actual attack kills stationary creep' },
    );
    stage('real A delivered HP0');
    const dead = (await art(a)).actors.find((e: any) => e.id === first);
    expect(dead.texture).toBe(live.texture);
    expect(dead.scale[0]).toBe(live.scale[0]);
    expect(dead.alpha).toBe(1);
    await fixture(a, 'place', { x: '800', y: '710' });
    await mkdir('docs/evidence/m4d-r3', { recursive: true });
    await a.screenshot({ path: 'docs/evidence/m4d-r3/th-b-six-player.png' });
    stage('six-player screenshot');
    await fixture(a, 'wave');
    await expect
      .poll(async () =>
        (await art(a)).m4dArena.cluster.every((p: any) => p.visible === false),
      )
      .toBe(true);
    await expect
      .poll(async () => (await snap(a)).state.creeps.dong_ta?.hp)
      .toBeGreaterThan(0);
    const hp = (await snap(a)).state.players[id].hp;
    const startTick = (await snap(a)).state.tick;
    await expect
      .poll(async () => (await snap(a)).state.tick)
      .toBeGreaterThan(startTick + 60);
    expect((await snap(a)).state.players[id].hp).toBeGreaterThanOrEqual(hp);
    stage('boss cluster hidden and waiting');
    await fixture(a, 'boss-target');
    await a.bringToFront();
    await a.locator('#game canvas').focus();
    await a.keyboard.press('a');
    await expect
      .poll(async () =>
        (await snap(a)).events.some(
          (e: any) =>
            e.kind === 'hit' && e.targetId === 'dong_ta' && e.sourceId === id,
        ),
      )
      .toBe(true);
    await writeFile(
      'docs/evidence/m4d-r3/six-player.json',
      JSON.stringify(
        {
          players: 6,
          arena: (await art(a)).m4dArena,
          shading: (await art(a)).worldDepth,
          errors,
        },
        null,
        2,
      ),
    );
    expect(errors).toEqual([]);
  } catch (error) {
    await mkdir('docs/evidence/m4d-r3', { recursive: true });
    await a
      .screenshot({
        path: 'docs/evidence/m4d-r3/th-failure.png',
        timeout: 3000,
      })
      .catch(() => {});
    const s = await snap(a).catch(() => null);
    if (s)
      await writeFile(
        'docs/evidence/m4d-r3/th-failure.json',
        JSON.stringify(
          { actor: s.state.players[s.sessionId], events: s.events.slice(-20) },
          null,
          2,
        ),
      );
    throw error;
  } finally {
    await Promise.allSettled(contexts.map((c) => c.close()));
  }
});

test('TH-B clean art review at normal gameplay zoom', async ({ page }) => {
  await create(page, 'tu_hien_trang');
  await startTogether([page], ['cai_bang_bong'], 45000);
  await fixture(page, 'place', { x: '920', y: '620' });
  await expect(page.locator('#viewport')).not.toHaveAttribute(
    'data-statue-intro',
    '',
  );
  const id = (await snap(page)).sessionId;
  await expect
    .poll(async () =>
      Math.abs((await art(page)).actors.find((a: any) => a.id === id).x - 920),
    )
    .toBeLessThan(0.5);
  await mkdir('docs/evidence/m4d-r3', { recursive: true });
  await page.screenshot({ path: 'docs/evidence/m4d-r3/th-b-clean.png' });
});
