import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
import { joinWaiting, startTogether } from './pregame-helper.js';
import { observeQa, pressQaAndWait } from '../../tools/qa-browser.mjs';

for (const mode of [
  {
    name: 'normal',
    client: 'http://127.0.0.1:5178',
    server: 'http://127.0.0.1:2574',
    other: 'http://127.0.0.1:2576',
  },
  {
    name: 'legacy',
    client: 'http://127.0.0.1:5180',
    server: 'http://127.0.0.1:2576',
    other: 'http://127.0.0.1:2574',
  },
])
  test(`owned ${mode.name} service has isolated room authority and two live Phaser peers`, async ({
    browser,
    request,
  }, info) => {
    const contexts = await Promise.all(
      [0, 1].map(() =>
        browser.newContext({
          baseURL: mode.client,
          viewport: { width: 1280, height: 720 },
        }),
      ),
    );
    const pages = await Promise.all(contexts.map((c) => c.newPage()));
    const [a, b] = pages;
    const errors: string[] = [];
    let failPage: (e: Error) => void = () => {};
    const pageFault = new Promise<never>((_done, reject) => {
      failPage = reject;
    });
    pageFault.catch(() => {});
    for (const page of pages) {
      page.on('pageerror', (e) => {
        errors.push(e.message);
        failPage(e);
      });
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
    }
    try {
      const health = await (await request.get(mode.server + '/health')).json();
      const identity = await (
        await request.get(mode.client + '/__volam_qa_identity')
      ).json();
      const other = await (await request.get(mode.other + '/health')).json();
      expect(health).toMatchObject({
        service: 'volam-game-server',
        runId: identity.runId,
        protocolVersion: PROTOCOL_VERSION,
      });
      expect(identity.serverUrl).toBe(mode.server);
      expect(other.runId).not.toBe(health.runId);
      await joinWaiting(a!, `Owned ${mode.name} host`);
      const roomId = await a!.evaluate(
        () => (window as any).__VOLAM__.snapshot().roomId,
      );
      await joinWaiting(b!, `Owned ${mode.name} peer`, roomId);
      await Promise.race([
        startTogether(pages, ['cai_bang_chuong', 'cai_bang_bong']),
        pageFault,
      ]);
      const before = await a!.evaluate(() => {
        const s = (window as any).__VOLAM__.snapshot();
        const h = s.state.players[s.sessionId];
        return { id: s.sessionId, x: h.x, sequence: h.lastSequence };
      });
      const moved = await pressQaAndWait(
        a!,
        'ArrowRight',
        (initial) => {
          const s = (window as any).__VOLAM__.snapshot(),
            h = s.state.players[initial.id];
          return h.hp > 0 &&
            h.lastSequence > initial.sequence &&
            h.x > initial.x + 2
            ? { x: h.x, sequence: h.lastSequence, tick: s.state.tick }
            : false;
        },
        before,
        { keyDelay: 180 },
      );
      const replicated = await observeQa(
        b!,
        (initial) => {
          const s = (window as any).__VOLAM__.snapshot(),
            h = s.state.players[initial.id];
          return h?.x > initial.x + 2 &&
            h.lastSequence > initial.sequence &&
            (window as any).__VOLAM__
              .presentation()
              ?.actors.some((v: any) => v.id === initial.id)
            ? { x: h.x, sequence: h.lastSequence, tick: s.state.tick }
            : false;
        },
        before,
      );
      const foreignRooms = await (
        await request.get(mode.other + '/rooms')
      ).json();
      expect(foreignRooms.some((r: any) => r.roomId === roomId)).toBe(false);
      expect(errors).toEqual([]);
      writeFileSync(
        info.outputPath('service-room.json'),
        JSON.stringify(
          {
            mode: mode.name,
            health,
            identity,
            roomId,
            before,
            moved,
            replicated,
            otherRunId: other.runId,
            foreignRoomLeaked: false,
            errors,
          },
          null,
          2,
        ) + '\n',
      );
    } catch (cause) {
      const diagnostics = await Promise.all(
        pages.map((page) =>
          page
            .evaluate(() => {
              const s = (window as any).__VOLAM__?.snapshot();
              return {
                phase: s?.state?.phase,
                roomId: s?.roomId,
                ready: document.querySelector('#scene-status')?.outerHTML,
              };
            })
            .catch(() => null),
        ),
      );
      writeFileSync(
        info.outputPath('failure.json'),
        JSON.stringify({ errors, diagnostics, cause: String(cause) }, null, 2) +
          '\n',
      );
      throw new Error(errors.length ? errors.join('\n') : String(cause), {
        cause,
      });
    } finally {
      await Promise.all(contexts.map((c) => c.close()));
    }
  });
