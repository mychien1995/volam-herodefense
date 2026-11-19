import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  observeQa,
  waitForGameReady,
  acknowledgeQaLobby,
  pressQaAndWait,
} from '../../tools/qa-browser.mjs';
import { waitForQa } from '../../tools/qa-wait.mjs';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
import { joinWaiting, startAuditTogether } from './pregame-helper.js';

test('QA helper requires scene readiness and server ack, not a changed button', async ({
  page,
}) => {
  await page.setContent(
    '<div id="scene-status" data-ready="false"></div><div id="pregame"><button data-action="confirm">Confirm</button></div>',
  );
  await page.evaluate(() => {
    const state = {
      phase: 'SCHOOL_SELECTION',
      tick: 1,
      players: { me: { confirmed: false } },
    };
    (window as any).__VOLAM__ = {
      snapshot: () => ({ sessionId: 'me', state }),
    };
    (window as any).clicks = 0;
    document.querySelector('button')!.addEventListener('click', () => {
      (window as any).clicks++;
      document.querySelector('button')!.setAttribute('aria-pressed', 'true');
      setTimeout(() => {
        state.players.me.confirmed = true;
      }, 120);
    });
  });
  await acknowledgeQaLobby(page, 'confirm', '', { timeout: 1500 });
  expect(
    await page.evaluate(
      () => (window as any).__VOLAM__.snapshot().state.players.me.confirmed,
    ),
  ).toBe(true);
  expect(await page.evaluate(() => (window as any).clicks)).toBe(1);
  await expect(waitForGameReady(page, { timeout: 100 })).rejects.toThrow(
    'scene + server ready',
  );
  await page.evaluate(() => {
    (window as any).__VOLAM__.snapshot().state.phase = 'IN_GAME';
    document.querySelector('#scene-status')!.setAttribute('data-ready', 'true');
  });
  await waitForGameReady(page);
});

test('QA helper benchmark compares equal delayed observations and driver calls', async ({
  page,
}) => {
  await page.setContent('<div id="scene-status" data-ready="true"></div>');
  const samples = [];
  for (let trial = 0; trial < 5; trial++) {
    for (const strategy of trial % 2 ? ['shared', 'old'] : ['old', 'shared']) {
      await page.evaluate(() => {
        (window as any).ack = false;
        setTimeout(() => {
          (window as any).ack = true;
        }, 180);
      });
      const start = performance.now();
      let driverCalls = 0;
      if (strategy === 'old')
        await waitForQa(
          () => {
            driverCalls++;
            return page.evaluate(() => (window as any).ack);
          },
          'synthetic ack',
          { timeout: 2000, interval: 30 },
        );
      else {
        const instrumented = {
          waitForFunction: async (...args: any[]) => {
            driverCalls++;
            const handle = await (page.waitForFunction as any)(...args);
            return {
              jsonValue: async () => {
                driverCalls++;
                return handle.jsonValue();
              },
              dispose: async () => {
                driverCalls++;
                return handle.dispose();
              },
            };
          },
        } as any;
        await observeQa(instrumented, () => (window as any).ack, undefined, {
          timeout: 2000,
          polling: 30,
        });
      }
      samples.push({
        trial,
        strategy,
        driverCalls,
        milliseconds: Math.round(performance.now() - start),
      });
    }
  }
  expect(
    samples
      .filter((s) => s.strategy === 'shared')
      .every((s) => s.driverCalls === 3),
  ).toBe(true);
  expect(
    samples.filter((s) => s.strategy === 'old').every((s) => s.driverCalls > 1),
  ).toBe(true);
  const directory = resolve(qaEvidenceDirectory('.cache/qa-helper-benchmark'));
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    resolve(directory, 'observations.json'),
    JSON.stringify(
      {
        scenario:
          'synthetic 180ms ack; same browser/polling; alternating order; not gameplay performance',
        samples,
      },
      null,
      2,
    ) + '\n',
  );
});

test('QA helper waits for real two-client movement and one authoritative projectile', async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  const context = await browser.newContext();
  const peer = await context.newPage();
  try {
    await joinWaiting(page, 'QA helper host');
    const room = await page.evaluate(
      () => (window as any).__VOLAM__.snapshot().roomId,
    );
    await joinWaiting(peer, 'QA helper peer', room);
    await startAuditTogether([
      [page, 'cai_bang', 'cai_bang_chuong'],
      [peer, 'cai_bang', 'cai_bang_bong'],
    ]);
    const before = await page.evaluate(() => {
      const s = (window as any).__VOLAM__.snapshot();
      return { id: s.sessionId, ...s.state.players[s.sessionId] };
    });
    const moved = await pressQaAndWait(
      page,
      'ArrowRight',
      (initial) => {
        const s = (window as any).__VOLAM__.snapshot();
        const hero = s.state.players[initial.id];
        return (
          hero.lastSequence > initial.lastSequence &&
          hero.x > initial.x && { x: hero.x, lastSequence: hero.lastSequence }
        );
      },
      before,
      { label: 'movement acknowledged', keyDelay: 80 },
    );
    expect(moved.x).toBeGreaterThan(before.x);
    await observeQa(
      peer,
      ({ id, sequence }) =>
        (window as any).__VOLAM__.snapshot().state.players[id]?.lastSequence >=
        sequence,
      { id: before.id, sequence: moved.lastSequence },
    );
    const oldIds = await page.evaluate(() =>
      Object.keys((window as any).__VOLAM__.snapshot().state.projectiles),
    );
    const projectile = await pressQaAndWait(
      page,
      'KeyA',
      (existing) => {
        const entries = Object.entries(
          (window as any).__VOLAM__.snapshot().state.projectiles,
        ) as Array<[string, { vx: number; vy: number }]>;
        return entries.find(([id]) => !existing.includes(id))?.[1];
      },
      oldIds,
      { label: 'real A projectile', polling: 20 },
    );
    expect(Math.hypot(projectile.vx, projectile.vy)).toBeCloseTo(360, 2);
  } finally {
    await context.close();
  }
});
