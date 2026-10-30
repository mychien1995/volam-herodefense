import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { joinWaiting, startTogether } from './pregame-helper.js';
interface Snapshot {
  roomId: string;
  sessionId: string;
  state: {
    phase: string;
    tick: number;
    players: Record<
      string,
      {
        confirmed: boolean;
        schoolId: string;
        x: number;
        y: number;
        hp: number;
        xp: number;
        gold: number;
        lastSequence: number;
      }
    >;
    defense: { nextWaveTick: number; statueHp: number };
  };
}
const read = (p: Page): Promise<Snapshot> =>
  p.evaluate('window.__VOLAM__.snapshot()');
async function joinListed(p: Page, id: string) {
  await p.goto('/?debug=1');
  await p.locator('#pre-nickname').fill('Late guest');
  await p.getByRole('button', { name: 'Enter Game', exact: true }).click();
  const row = p.locator('#pregame tbody tr').filter({ hasText: id });
  await expect(
    row.getByRole('button', { name: 'Join', exact: true }),
  ).toBeEnabled();
  await row.getByRole('button', { name: 'Join', exact: true }).click();
  await expect(p.locator('#pregame .pre-title')).toHaveText('School Selection');
}
function errors(p: Page) {
  const result: string[] = [];
  p.on('pageerror', (e) => result.push(e.message));
  p.on('console', (m) => {
    if (m.type() === 'error') result.push(m.text());
  });
  return result;
}
test('Join remains enabled after host starts school selection', async ({
  browser,
}) => {
  const ca = await browser.newContext(),
    cb = await browser.newContext();
  const a = await ca.newPage(),
    b = await cb.newPage(),
    failures = [errors(a), errors(b)];
  try {
    await joinWaiting(a, 'Host');
    const id = (await read(a)).roomId;
    await a.getByRole('button', { name: 'Start Game', exact: true }).click();
    await a.locator('[data-school=cai_bang]').click();
    await joinListed(b, id);
    await a
      .getByRole('button', { name: 'Confirm Selection', exact: true })
      .click();
    await expect(b.getByTestId('selection-ready')).toHaveText('1/2 Ready');
    expect((await read(a)).state.tick).toBe(0);
    await b.locator('[data-school=vo_dang]').click();
    await b
      .getByRole('button', { name: 'Confirm Selection', exact: true })
      .click();
    await expect(a.locator('#pregame')).toBeHidden();
    await expect(b.locator('#pregame')).toBeHidden();
    expect(failures.flat()).toEqual([]);
  } finally {
    await ca.close();
    await cb.close();
  }
});
test('Join active match, choose school with stable focus, spawn without resetting host or clock', async ({
  browser,
}) => {
  const ca = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    }),
    cb = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const a = await ca.newPage(),
    b = await cb.newPage(),
    failures = [errors(a), errors(b)];
  try {
    await mkdir('docs/evidence/late-join', { recursive: true });
    await joinWaiting(a, 'Active host');
    await startTogether([a]);
    const before = await read(a),
      id = before.roomId;
    await joinListed(b, id);
    const guest = (await read(b)).sessionId;
    await b.locator('[data-school=thien_son]').click();
    const choice = b.locator('[data-school=thien_son]');
    await expect(choice).toHaveAttribute('aria-pressed', 'true');
    await choice.focus();
    const focused = await choice.elementHandle();
    await a.locator('#game canvas').focus();
    await a.keyboard.press('ArrowLeft', { delay: 200 });
    await expect
      .poll(async () => (await read(a)).state.players[before.sessionId]!.x)
      .toBeLessThan(before.state.players[before.sessionId]!.x);
    expect(await focused!.evaluate((n) => n.isConnected)).toBe(true);
    await expect(choice).toBeFocused();
    expect((await read(a)).state.players[guest]!.confirmed).toBe(false);
    const visible = (await a.evaluate(
      'window.__VOLAM__.presentation().actors',
    )) as Array<{ id: string }>;
    expect(visible.some((v) => v.id === guest)).toBe(false);
    await b.keyboard.press('ArrowRight');
    await b.keyboard.press('KeyA');
    expect((await read(b)).state.players[guest]!.lastSequence).toBe(0);
    await b.screenshot({
      path: 'docs/evidence/late-join/active-school-selection.png',
    });
    await b
      .getByRole('button', { name: 'Confirm Selection', exact: true })
      .click();
    await expect(b.locator('#pregame')).toBeHidden();
    await expect
      .poll(async () => (await read(a)).state.players[guest]!.hp)
      .toBeGreaterThan(0);
    const after = await read(a);
    expect(after.state.tick).toBeGreaterThan(before.state.tick);
    expect(after.state.defense.nextWaveTick).toBe(
      before.state.defense.nextWaveTick,
    );
    expect(after.state.defense.statueHp).toBe(before.state.defense.statueHp);
    expect(after.state.players[guest]).toMatchObject({
      schoolId: 'thien_son',
      confirmed: true,
      xp: 0,
      gold: 0,
    });
    await b.locator('#game canvas').focus();
    await b.keyboard.press('ArrowRight', { delay: 150 });
    await expect
      .poll(async () => (await read(a)).state.players[guest]!.lastSequence)
      .toBeGreaterThan(0);
    await a.screenshot({ path: 'docs/evidence/late-join/both-in-arena.png' });
    expect(failures.flat()).toEqual([]);
  } finally {
    await ca.close();
    await cb.close();
  }
});
