import { test, expect, type Page } from '@playwright/test';
import { joinWaiting } from './pregame-helper.js';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const out = resolve('docs/evidence/phase1');
const snapshot = (p: Page) =>
  p.evaluate<{
    roomId: string;
    sessionId: string;
    state: {
      phase: string;
      tick: number;
      matchElapsedMs: number;
      players: Record<string, { schoolId: string; level: number }>;
    };
  }>('window.__VOLAM__.snapshot()');
test('dedicated selection after host start synchronizes different schools', async ({
  browser,
}) => {
  test.setTimeout(60000);
  mkdirSync(out, { recursive: true });
  const ca = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    }),
    cb = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const a = await ca.newPage(),
    b = await cb.newPage();
  const errors: string[] = [];
  for (const p of [a, b]) p.on('pageerror', (e) => errors.push(e.message));
  try {
    await a.goto('/?debug=1');
    await a.screenshot({ path: resolve(out, '01-landing-1280.png') });
    expect(await a.locator('#pregame input').count()).toBe(1);
    await a.locator('#pre-nickname').fill('Thanh Phong');
    await a.getByRole('button', { name: 'Enter Game', exact: true }).click();
    await expect(a.locator('.pre-title')).toHaveText('Room Browser');
    await a.screenshot({ path: resolve(out, '02-browser-1280.png') });
    await a.getByRole('button', { name: 'Create room', exact: true }).click();
    await expect(a.locator('.pre-title')).toHaveText('Waiting Lobby');
    const id = (await snapshot(a)).roomId;
    await joinWaiting(b, 'Bạch Vân', id);
    await expect(a.locator('#pregame .pre-players')).toContainText('Bạch Vân');
    await expect(a.locator('[data-school]')).toHaveCount(0);
    await expect(
      b.getByRole('button', { name: 'Start Game', exact: true }),
    ).toBeDisabled();
    expect((await snapshot(a)).state.tick).toBe(0);
    await a.screenshot({ path: resolve(out, '03-waiting-1280.png') });
    await a.getByRole('button', { name: 'Start Game', exact: true }).click();
    for (const p of [a, b])
      await expect(p.locator('.pre-title')).toHaveText('School Selection');
    await a.locator('[data-school=cai_bang]').click();
    await expect(a.locator('[data-school=cai_bang]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await a.locator('[data-school=vo_dang]').click();
    await a
      .getByRole('button', { name: 'Confirm Selection', exact: true })
      .click();
    await expect(b.getByTestId('selection-ready')).toHaveText('1/2 Ready');
    expect((await snapshot(b)).state.matchElapsedMs).toBe(0);
    await b.locator('[data-school=thieu_lam]').click();
    await expect(b.locator('[data-school=thieu_lam]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await a.screenshot({ path: resolve(out, '04-school-selection-1280.png') });
    await b.screenshot({ path: resolve(out, '04-school-selection-1920.png') });
    await b
      .getByRole('button', { name: 'Confirm Selection', exact: true })
      .click();
    for (const p of [a, b]) await expect(p.locator('#pregame')).toBeHidden();
    const sa = await snapshot(a),
      sb = await snapshot(b);
    expect(sa.roomId).toBe(sb.roomId);
    expect(sa.state.phase).toBe('IN_GAME');
    expect(sa.state.players[sa.sessionId]!.schoolId).toBe('vo_dang');
    expect(sb.state.players[sb.sessionId]!.schoolId).toBe('thieu_lam');
    expect(sa.state.players[sa.sessionId]!.level).toBe(1);
    await expect
      .poll(async () => (await snapshot(a)).state.matchElapsedMs)
      .toBeGreaterThan(0);
    await a.screenshot({ path: resolve(out, '05-same-arena-1280.png') });
    expect(errors).toEqual([]);
  } catch (error) {
    console.log(await a.locator('#pregame').innerText(), errors);
    throw error;
  } finally {
    await ca.close();
    await cb.close();
  }
});

test('live room list, blank nickname, join error and waiting-host disconnect', async ({
  browser,
}) => {
  const ca = await browser.newContext(),
    cb = await browser.newContext();
  const a = await ca.newPage(),
    b = await cb.newPage();
  try {
    await joinWaiting(a, 'Host');
    const id = (await snapshot(a)).roomId;
    await b.goto('/?debug=1');
    await b.getByRole('button', { name: 'Enter Game', exact: true }).click();
    await expect(b.locator('#pre-nickname')).toBeVisible();
    await b.locator('#pre-nickname').fill('Guest');
    await b.getByRole('button', { name: 'Enter Game', exact: true }).click();
    await expect(b.locator('tbody tr').filter({ hasText: id })).toContainText(
      '1/6',
    );
    await b.getByLabel('Room code', { exact: true }).fill('no-such-room');
    await b.getByRole('button', { name: 'Join by code', exact: true }).click();
    await expect(b.locator('.pre-error')).toContainText('Could not connect');
    await b
      .locator('tbody tr')
      .filter({ hasText: id })
      .getByRole('button', { name: 'Join', exact: true })
      .click();
    await expect(b.locator('.pre-title')).toHaveText('Waiting Lobby');
    await a.getByRole('button', { name: 'Leave room', exact: true }).click();
    await expect(b.locator('#pregame')).toContainText('Host disconnected');
    await expect(
      b.getByRole('button', { name: 'Start Game', exact: true }),
    ).toBeDisabled();
  } finally {
    await ca.close();
    await cb.close();
  }
});

test('selection disconnect visibly holds the room without automatic choice', async ({
  browser,
}) => {
  const ca = await browser.newContext(),
    cb = await browser.newContext();
  const a = await ca.newPage(),
    b = await cb.newPage();
  try {
    await joinWaiting(a, 'Host');
    await joinWaiting(b, 'Guest', (await snapshot(a)).roomId);
    await a.getByRole('button', { name: 'Start Game', exact: true }).click();
    await expect(b.locator('.pre-title')).toHaveText('School Selection');
    await b.close();
    await expect(a.locator('.pre-warning')).toContainText(
      'participant disconnected',
    );
    await a.locator('[data-school=thien_son]').click();
    await expect(a.locator('[data-school=thien_son]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await a
      .getByRole('button', { name: 'Confirm Selection', exact: true })
      .click();
    await expect(a.getByTestId('selection-ready')).toHaveText('1/2 Ready');
    expect((await snapshot(a)).state.phase).toBe('SCHOOL_SELECTION');
    expect((await snapshot(a)).state.tick).toBe(0);
  } finally {
    await ca.close();
    await cb.close();
  }
});
