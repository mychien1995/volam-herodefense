import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { MATCH_ROOM } from '@volam/game-protocol';
import { qaSession } from '../../tools/qa-session.mjs';
import { joinWaiting, startTogether } from './pregame-helper.js';
import { observeQa } from '../../tools/qa-browser.mjs';
import { profileQaPage } from '../../tools/qa-page-cost.mjs';

test('iteration starts fresh and replicates movement in two real Phaser clients', async ({
  browser,
  request,
}, info) => {
  test.setTimeout(60000);
  const session = qaSession();
  expect(
    await (await request.get(session.serverUrl + '/rooms')).json(),
  ).toEqual([]);
  const contexts = await Promise.all(
    [0, 1].map(() =>
      browser.newContext({
        baseURL: session.clientUrl,
        viewport: { width: 1280, height: 720 },
      }),
    ),
  );
  const [a, b] = await Promise.all(contexts.map((c) => c.newPage()));
  const pageCosts = process.env['VOLAM_QA_BROWSER_COST_OUTPUT']
    ? await Promise.all([a!, b!].map(profileQaPage))
    : [];
  const errors: string[] = [];
  const stages: Array<{ label: string; milliseconds: number }> = [];
  const started = performance.now();
  const mark = (label: string) =>
    stages.push({ label, milliseconds: performance.now() - started });
  for (const page of [a!, b!]) {
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
  }
  try {
    await joinWaiting(a!, 'Iteration host');
    mark('host joined');
    const roomId = await a!.evaluate(
      () => (window as any).__VOLAM__.snapshot().roomId,
    );
    await joinWaiting(b!, 'Iteration peer', roomId);
    mark('peer joined');
    await startTogether([a!, b!], ['cai_bang_chuong', 'cai_bang_bong']);
    mark('both scenes/server ready');
    await a!.bringToFront();
    await a!.locator('#game canvas').focus();
    const before = await a!.evaluate(() => {
      const s = (window as any).__VOLAM__.snapshot(),
        h = s.state.players[s.sessionId];
      return { id: s.sessionId, x: h.x, sequence: h.lastSequence, hp: h.hp };
    });
    expect(before.hp).toBeGreaterThan(0);
    const movement = observeQa(
      a!,
      (v) => {
        const s = (window as any).__VOLAM__.snapshot(),
          h = s.state.players[v.id];
        return h.hp > 0 && h.x > v.x + 2 && h.lastSequence > v.sequence
          ? { x: h.x, sequence: h.lastSequence }
          : false;
      },
      before,
      { label: 'one held Right until authoritative movement' },
    );
    movement.catch(() => {});
    let moved;
    try {
      await a!.keyboard.down('ArrowRight');
      moved = await movement;
    } finally {
      await a!.keyboard.up('ArrowRight');
    }
    mark('movement acknowledged');
    const peer = await observeQa(
      b!,
      (v) => {
        const s = (window as any).__VOLAM__.snapshot(),
          h = s.state.players[v.id];
        return h?.x > v.x + 2 &&
          h.lastSequence > v.sequence &&
          (window as any).__VOLAM__
            .presentation()
            ?.actors.some((actor: any) => actor.id === v.id)
          ? { x: h.x, sequence: h.lastSequence }
          : false;
      },
      before,
    );
    expect(errors).toEqual([]);
    mark('peer actor replicated');
    // Reserve a legal unused seat: the parent must dispose this room before reuse.
    const reserved = await request.post(
      `${session.serverUrl}/matchmake/create/${MATCH_ROOM}`,
      { data: { nickname: 'Iteration reserved seat' } },
    );
    expect(reserved.ok()).toBe(true);
    const seat = await reserved.json();
    expect(seat.roomId).toBeTruthy();
    writeFileSync(
      info.outputPath('iteration-room.json'),
      JSON.stringify(
        {
          runId: process.env['VOLAM_QA_ITERATION_RUN_ID'],
          roomId,
          leftoverRoomId: seat.roomId,
          before,
          moved,
          peer,
          errors,
        },
        null,
        2,
      ),
    );
  } catch (cause) {
    writeFileSync(
      info.outputPath('iteration-failure.json'),
      JSON.stringify({ stages, errors, cause: String(cause) }, null, 2),
    );
    throw cause;
  } finally {
    for (let index = 0; index < pageCosts.length; index++) {
      const data = await pageCosts[index]!().catch((error: Error) => ({
        error: error.message,
      }));
      writeFileSync(
        info.outputPath(`page-cost-${index}.json`),
        JSON.stringify(data, null, 2),
      );
    }
    writeFileSync(
      info.outputPath('iteration-stages.json'),
      JSON.stringify(stages, null, 2),
    );
    await Promise.all(contexts.map((context) => context.close()));
  }
});
