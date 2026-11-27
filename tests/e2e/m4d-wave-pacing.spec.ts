import { expect, test, type Page } from '@playwright/test';
import { observeQa, pressQaAndWait } from '../../tools/qa-browser.mjs';
import { joinWaiting, startTogether } from './pregame-helper.js';
test.use({ actionTimeout: 10000 });
const snap = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.snapshot()');
async function fixture(p: Page, op: string) {
  const s = await snap(p);
  const r = await p.request.post(
    '/__m4d?' + new URLSearchParams({ room: s.roomId, id: s.sessionId, op }),
  );
  expect(r.ok(), await r.text()).toBe(true);
  return r.json();
}

test('wave countdown starts after spawning and agrees across two Phaser peers', async ({
  page,
  browser,
}) => {
  const context = await browser.newContext();
  const peer = await context.newPage();
  const errors: string[] = [];
  for (const p of [page, peer])
    p.on('pageerror', (e) => errors.push(e.message));
  try {
    await joinWaiting(page, 'Nhịp wave');
    await joinWaiting(peer, 'Đồng đội', (await snap(page)).roomId);
    await startTogether([page, peer], ['cai_bang_bong', 'vo_dang_kiem']);
    // Observe each rendered phase in-page before starting the clock. Sequential
    // remote reads can miss a short phase while another Phaser peer is busy.
    await Promise.all(
      [page, peer].map((p) =>
        p.evaluate(() => {
          const phases: any[] = [];
          (window as any).__M4D_PHASES__ = phases;
          const timer = window.setInterval(() => {
            const s = (window as any).__VOLAM__.snapshot();
            const d = s.state.defense;
            const text =
              document.querySelector('#invasion-countdown')?.textContent ?? '';
            const streaming = d.streamUntilTick > s.state.tick;
            const phase =
              d.wave === 1 && streaming && text.includes('Đợt 1 đang ra quái')
                ? 'stream1'
                : d.wave === 1 &&
                    d.streamUntilTick === 0 &&
                    text.includes('Đợt 2 sau')
                  ? 'rest1'
                  : d.wave === 2 &&
                      streaming &&
                      text.includes('Đợt 2 đang ra quái')
                    ? 'stream2'
                    : undefined;
            if (!phase || phases.some((p) => p.phase === phase)) return;
            phases.push({
              phase,
              tick: s.state.tick,
              next: d.nextWaveTick,
              until: d.streamUntilTick,
              survivors: Object.values(s.state.creeps).some(
                (e: any) => e.invasionWave === 1 && e.hp > 0,
              ),
            });
            if (phase === 'stream2') window.clearInterval(timer);
          }, 100);
        }),
      ),
    );
    await fixture(page, 'pacing');
    await Promise.all(
      [page, peer].map((p) =>
        observeQa(
          p,
          () =>
            (window as any).__M4D_PHASES__.some(
              (p: any) => p.phase === 'stream2',
            ),
          undefined,
          {
            label: 'record stream, full rest and second stream on each peer',
            timeout: 45000,
          },
        ),
      ),
    );
    for (const p of [page, peer]) {
      const phases = await p.evaluate(() => (window as any).__M4D_PHASES__);
      expect(phases.map((p: any) => p.phase)).toEqual([
        'stream1',
        'rest1',
        'stream2',
      ]);
      const [stream, rest, second] = phases;
      expect(stream.next - stream.until).toBe(300);
      expect(rest.until).toBe(0);
      expect(rest.next - rest.tick).toBeGreaterThan(0);
      expect(rest.next - rest.tick).toBeLessThanOrEqual(300);
      expect(rest.survivors).toBe(true);
      expect(second.tick).toBeGreaterThanOrEqual(rest.next);
    }
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('a real dungeon kill awards the increased fractional gold and EXP', async ({
  page,
}) => {
  await joinWaiting(page, 'Thưởng phó bản');
  await startTogether([page], ['cai_bang_bong']);
  await page.locator('[data-menu=dungeons]').click();
  await expect(page.getByRole('dialog')).toHaveAttribute(
    'data-menu',
    'dungeons',
  );
  await page.locator('[data-destination=forest]').click();
  await expect(page.locator('#dungeon-kind')).toHaveText('Quái thường · Riêng');
  await expect(page.locator('#enter-dungeon')).toBeEnabled();
  await page.locator('#enter-dungeon').click();
  await observeQa(
    page,
    () => {
      const s = (window as any).__VOLAM__.snapshot();
      return s.state.players[s.sessionId].zoneId !== 'arena';
    },
    undefined,
    { label: 'server acknowledges private dungeon' },
  );
  const before = await snap(page);
  for (let kill = 0; kill < 2; kill++) {
    const prepared = await fixture(page, 'farm-target');
    expect(prepared.xp).toBeCloseTo(2.25);
    expect(prepared.gold).toBeCloseTo(0.6);
    await observeQa(
      page,
      (target: string) => {
        const s = (window as any).__VOLAM__.snapshot();
        return (
          s.state.creeps[target]?.hp === 1 &&
          s.state.players[s.sessionId].basicCooldown === 0
        );
      },
      prepared.target,
      { label: 'server acknowledges target and attack ready' },
    );
    await pressQaAndWait(
      page,
      'a',
      (target: string) => {
        const s = (window as any).__VOLAM__.snapshot();
        return s.state.creeps[target]?.hp === 0;
      },
      prepared.target,
      { label: 'real A kills dungeon creep' },
    );
  }
  const after = await snap(page);
  expect(
    after.state.players[after.sessionId].xp -
      before.state.players[before.sessionId].xp,
  ).toBe(4);
  expect(
    after.state.players[after.sessionId].gold -
      before.state.players[before.sessionId].gold,
  ).toBe(1);
});
