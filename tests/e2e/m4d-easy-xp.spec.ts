import { expect, test, type Page } from '@playwright/test';
import { observeQa, pressQaAndWait } from '../../tools/qa-browser.mjs';
import { startTogether } from './pregame-helper.js';
const snap = (page: Page): Promise<any> =>
  page.evaluate('window.__VOLAM__.snapshot()');
async function fixture(page: Page, op: string) {
  const s = await snap(page);
  const r = await page.request.post(
    '/__m4d?' + new URLSearchParams({ room: s.roomId, id: s.sessionId, op }),
  );
  expect(r.ok(), await r.text()).toBe(true);
  return r.json();
}

test('Easy and Hard rooms award their own wave EXP through a real A kill with identical gold', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const difficulty of ['easy', 'hard']) {
    await page.goto('/?debug=1');
    await page.locator('[data-action=play]').click();
    await page.locator('#pre-nickname').fill(`EXP ${difficulty}`);
    await page.getByRole('button', { name: 'Vào game', exact: true }).click();
    await page.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
    await page.locator('#pre-difficulty').selectOption(difficulty);
    await page.locator('[data-action=confirm-create]').click();
    await expect(page.locator('#pregame .pre-title')).toHaveText('Phòng chờ');
    await startTogether([page], ['cai_bang_bong']);
    expect((await snap(page)).state.defense.difficulty).toBe(difficulty);
    const before = await fixture(page, 'reward-balance');
    await fixture(page, 'invasion');
    await observeQa(
      page,
      () => (window as any).__VOLAM__.snapshot().state.defense.wave === 1,
      undefined,
      { label: 'first invasion begins' },
    );
    const target = await fixture(page, 'invasion-reward-target');
    expect(target.xp).toBeCloseTo((difficulty === 'easy' ? 110 : 100) / 240);
    expect(target.gold).toBeCloseTo(70 / 240);
    await observeQa(
      page,
      (id: string) => {
        const s = (window as any).__VOLAM__.snapshot();
        return (
          s.state.creeps[id]?.hp === 1 &&
          s.state.players[s.sessionId].basicCooldown === 0
        );
      },
      target.target,
      { label: 'real attack prerequisite acknowledged' },
    );
    await pressQaAndWait(
      page,
      'a',
      (id: string) =>
        (window as any).__VOLAM__.snapshot().state.creeps[id]?.hp === 0,
      target.target,
      { label: 'real A kills invasion creep' },
    );
    const after = await fixture(page, 'reward-balance');
    expect(after.xp - before.xp).toBeCloseTo(target.xp);
    expect(after.gold - before.gold).toBeCloseTo(target.gold);
  }
  expect(errors).toEqual([]);
});
