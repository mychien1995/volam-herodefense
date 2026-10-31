import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Client, type Room } from '@colyseus/sdk';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
import { joinWaiting, startTogether } from './pregame-helper.js';
import {
  forestTypes,
  forestArtStatus,
  forestStrikeEffects,
} from '../../apps/game-client/src/forest-creeps.js';
const inspect = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.presentation()');
const snapshot = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.snapshot()');
test('controlled server forest types reach the normal renderer; event dedup and lifecycle stay visual only', async ({
  browser,
}) => {
  const players = Number(process.env['FOREST_REVIEW_PLAYERS'] ?? 6);
  test.setTimeout(players === 6 ? 360000 : 180000);
  const out = `${process.env['FOREST_EVIDENCE_DIR'] ?? 'docs/evidence/forest-creep-runtime-2026-10-31'}/wire-${players}`;
  mkdirSync(out, { recursive: true });
  const contexts = await Promise.all(
    Array.from({ length: 2 }, () =>
      browser.newContext({ viewport: { width: 1920, height: 1080 } }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const bots: Room<MatchRoom>[] = [];
  const client = new Client('http://127.0.0.1:2587');
  const errors: string[] = [];
  for (const p of pages) {
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
  }
  const coverage: Record<string, string[]> = {};
  try {
    await joinWaiting(pages[0]!, 'Candidate fixture 1');
    const room = (await snapshot(pages[0]!)).roomId;
    for (let i = 1; i < pages.length; i++)
      await joinWaiting(pages[i]!, `Candidate fixture ${i + 1}`, room);
    for (let i = pages.length; i < players; i++) {
      const peer = await client.joinById<MatchRoom>(room, {
        nickname: `Forest peer ${i + 1}`,
        protocolVersion: PROTOCOL_VERSION,
      });
      peer.onMessage('*', () => {});
      bots.push(peer);
      await expect.poll(() => peer.state.phase).toBe('WAITING_LOBBY');
    }
    await Promise.all([
      startTogether(pages),
      ...bots.map(async (peer) => {
        await expect.poll(() => peer.state.phase).toBe('SCHOOL_SELECTION');
        peer.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
        peer.send('lobby-action', { action: 'confirm' });
      }),
    ]);
    await Promise.all(
      bots.map(async (peer) => {
        await expect.poll(() => peer.state.phase).toBe('IN_GAME');
        peer.send('dungeon-action', {
          protocolVersion: PROTOCOL_VERSION,
          sequence: 1,
          action: 'enter',
          access: 'shared',
          destination: 'forest',
        });
        await expect
          .poll(() => peer.state.players.get(peer.sessionId)?.zoneId)
          .toBe('forest_shared');
      }),
    );
    await Promise.all(
      pages.map(async (p) => {
        await p.getByRole('button', { name: 'Phó Bản', exact: true }).click();
        await p.getByRole('radio', { name: 'Chung', exact: true }).click();
        await p.locator('#enter-dungeon').click();
        await expect
          .poll(async () => {
            const s = await snapshot(p);
            return s.state.players[s.sessionId].zoneId;
          })
          .toBe('forest_shared');
        await expect(p.locator('#zone-status')).toContainText('placeholder');
      }),
    );
    const call = async (params: Record<string, string>) => {
      const q = new URLSearchParams({
        room,
        pose: 'idle',
        direction: 'down',
        ...params,
      });
      const r = await pages[0]!.request.post(
        'http://127.0.0.1:5187/__bamboo-pose?' + q,
      );
      expect(r.ok(), await r.text()).toBe(true);
      return r.json();
    };
    for (const type of forestTypes) {
      const { ids } = await call({ archetype: type });
      await Promise.all(
        bots.map((peer) =>
          expect
            .poll(() =>
              ids.every(
                (id: string) => peer.state.creeps.get(id)?.archetypeId === type,
              ),
            )
            .toBe(true),
        ),
      );
      for (const p of pages)
        await expect
          .poll(async () => {
            const v = await inspect(p);
            return ids.every((id: string) =>
              v.actors.some(
                (a: any) =>
                  a.id === id &&
                  a.texture === 'forest_' + type &&
                  a.artStatus === forestArtStatus(type),
              ),
            );
          })
          .toBe(true);
      for (const direction of ['down', 'left', 'right', 'up']) {
        const before = await Promise.all(
          pages.map(async (p) => (await inspect(p)).creepEffects.spawned),
        );
        await call({
          archetype: type,
          direction,
          pose: 'basic_attack',
          emit: 'hit',
        });
        await Promise.all(
          pages.map(async (p, i) => {
            const expected = forestStrikeEffects(
              type,
              'hit',
              'creep_strike',
              direction,
            ).map((c) => c.id);
            await expect
              .poll(
                async () => {
                  const fx = (await inspect(p)).creepEffects;
                  return (
                    fx.spawned > before[i] &&
                    expected.every((id) => fx.completed.includes(id)) &&
                    fx.contacts === 0
                  );
                },
                { timeout: 10000 },
              )
              .toBe(true);
            const v = await inspect(p);
            for (const a of v.actors.filter((a: any) => ids.includes(a.id))) {
              expect(a.origin).toEqual([0.5, 106 / 128]);
              expect(a.scale).toEqual([1, 1]);
              expect(a.depth).toBe(a.y);
            }
            coverage[type + ':' + direction] = expected;
          }),
        );
        const count = (await inspect(pages[0]!)).creepEffects.spawned;
        await call({
          archetype: type,
          direction,
          pose: 'basic_attack',
          emit: 'replay',
        });
        // Replay arrives through the real room connection; no new effect may start.
        await pages[0]!.waitForTimeout(100);
        expect((await inspect(pages[0]!)).creepEffects.spawned).toBe(count);
      }
    }
    await pages[0]!.screenshot({
      path: out + '/normal-renderer-controlled-types.png',
    });
    await pages[0]!.bringToFront();
    const sceneTime = (await inspect(pages[0]!)).sceneTime;
    await expect
      .poll(async () => (await inspect(pages[0]!)).sceneTime)
      .toBeGreaterThan(sceneTime);
    const active = () =>
      pages[0]!.waitForFunction(
        'window.__VOLAM__.presentation().creepEffects.contacts > 0',
        undefined,
        { polling: 'raf', timeout: 10000 },
      );
    const [first] = await Promise.all([
      active(),
      call({ archetype: 'son_vien', pose: 'basic_attack', emit: 'attack' }),
    ]);
    await first.dispose();
    await call({ archetype: 'son_vien', remove: '1' });
    await expect
      .poll(async () => (await inspect(pages[0]!)).creepEffects.contacts)
      .toBe(0);
    // Real exit control: clear scene-owned effects and candidate actors on disconnect.
    const [second] = await Promise.all([
      active(),
      call({ archetype: 'son_vien', pose: 'basic_attack', emit: 'attack' }),
    ]);
    await second.dispose();
    await pages[0]!.getByRole('button', { name: 'Quit', exact: true }).click();
    await expect(pages[0]!.locator('#pregame')).toBeVisible();
    await expect
      .poll(async () => (await inspect(pages[0]!)).actors.length)
      .toBe(0);
    await expect
      .poll(async () => (await inspect(pages[0]!)).creepEffects.contacts)
      .toBe(0);
    expect(errors).toEqual([]);
    writeFileSync(
      out + '/observations.json',
      JSON.stringify(
        {
          status: 'PASS',
          browserClients: pages.length,
          networkClients: players,
          sdkClients: bots.length,
          controlledServerFixture: true,
          naturalForestSpawn: false,
          damageAndRewardsVerified: false,
          directorApproved: forestTypes.every(
            (type) => forestArtStatus(type) === 'approved',
          ),
          coverage,
          errors,
        },
        null,
        2,
      ) + '\n',
    );
  } catch (e) {
    writeFileSync(
      out + '/failure-state.json',
      JSON.stringify(
        {
          coverage,
          snapshot: await snapshot(pages[0]!).catch(() => null),
          presentation: await inspect(pages[0]!).catch(() => null),
        },
        null,
        2,
      ),
    );
    writeFileSync(
      out + '/failure-errors.json',
      JSON.stringify(errors, null, 2),
    );
    await pages[0]?.screenshot({ path: out + '/failure.png' }).catch(() => {});
    throw e;
  } finally {
    await Promise.allSettled(bots.map((peer) => peer.leave()));
    await Promise.allSettled(contexts.map((c) => c.close()));
  }
});
