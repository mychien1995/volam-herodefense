import { beforeAll, afterAll, afterEach, it, expect } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { Client, type Room } from '@colyseus/sdk';
import { createGameServer } from '../apps/game-server/src/app.config.js';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';
import { MATCH_ROOM, PROTOCOL_VERSION } from '@volam/game-protocol';
let server: ColyseusTestServer;
const client = new Client('http://127.0.0.1:2798');
const seq = new Map<string, number>();
const next = (r: Room<MatchRoom>) => {
  const n = (seq.get(r.sessionId) ?? 0) + 1;
  seq.set(r.sessionId, n);
  return n;
};
beforeAll(async () => {
  const game = createGameServer();
  await game.listen(2798);
  server = new ColyseusTestServer(game);
});
afterEach(async () => {
  await server.cleanup();
  seq.clear();
});
afterAll(async () => {
  await server.shutdown();
});
it('real SDK filters encounter instances and rejects forged/replayed loot ownership', async () => {
  const a = await client.create<MatchRoom>(MATCH_ROOM, {
    nickname: 'Boss A',
    protocolVersion: PROTOCOL_VERSION,
  });
  const b = await client.joinById<MatchRoom>(a.roomId, {
    nickname: 'Boss B',
    protocolVersion: PROTOCOL_VERSION,
  });
  const c = await client.joinById<MatchRoom>(a.roomId, {
    nickname: 'Boss C',
    protocolVersion: PROTOCOL_VERSION,
  });
  const rooms = [a, b, c];
  for (const r of rooms)
    await expect.poll(() => r.state?.players.has(r.sessionId)).toBe(true);
  a.send('lobby-action', { action: 'start' });
  for (const r of rooms) {
    await expect.poll(() => r.state.phase).toBe('SCHOOL_SELECTION');
    r.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
    r.send('lobby-action', { action: 'confirm' });
  }
  for (const r of rooms) await expect.poll(() => r.state.phase).toBe('IN_GAME');
  for (const r of rooms)
    r.send('dungeon-action', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: next(r),
      action: 'enter',
      access: r === c ? 'private' : 'shared',
      destination: 'chu_ba_thong',
    });
  for (const r of rooms)
    await expect
      .poll(() => r.state.players.get(r.sessionId)?.zoneId)
      .toContain('chu_ba_thong_');
  await expect
    .poll(
      () => a.state.dungeons.get('chu_ba_thong_shared')?.encounter.length ?? 0,
    )
    .toBeGreaterThan(0);
  expect(c.state.dungeons.has('chu_ba_thong_shared')).toBe(false);
  expect(a.state.dungeons.has('chu_ba_thong_private_' + c.sessionId)).toBe(
    false,
  );
  const authority = server.getRoomById<MatchRoom>(a.roomId),
    z = authority.simulation.zoneOf(a.sessionId)!,
    boss = z.world.creeps.get('chu_ba_thong')!;
  boss.hp = 1;
  boss.hits[a.sessionId] = boss.hits[b.sessionId] = z.world.tick;
  const h = z.world.heroes.get(a.sessionId)!;
  h.x = boss.x - 24;
  h.y = boss.y;
  h.fx = 1;
  h.fy = 0;
  a.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: next(a),
    kind: 'basic',
  });
  await expect.poll(() => z.world.chu!.loot.length).toBe(1);
  const loot = z.world.chu!.loot[0]!;
  const rejected = c.waitForMessage('command-rejected');
  c.send('boss-loot-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: next(c),
    lootId: loot.id,
    action: 'roll',
  });
  expect((await rejected).reason).toContain('khu vực');
  const sequence = next(a);
  a.send('boss-loot-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence,
    lootId: loot.id,
    action: 'roll',
  });
  a.send('boss-loot-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence,
    lootId: loot.id,
    action: 'roll',
  });
  b.send('boss-loot-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: next(b),
    lootId: loot.id,
    action: 'pass',
  });
  await expect
    .poll(() => JSON.parse(a.state.players.get(a.sessionId)!.bossItems).length)
    .toBe(1);
  expect(loot.state).toBe('claimed');
  expect(h.bossItems).toHaveLength(1);
  const gold = h.gold;
  a.send('boss-item-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: next(a),
    index: 0,
    itemId: 'toan_chan_tien_tuu',
    action: 'sell',
  });
  await expect.poll(() => h.gold).toBe(gold + 120);
  expect(h.bossItems).toHaveLength(0);
  const bad = a.waitForMessage('command-rejected');
  a.send('boss-item-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: next(a),
    index: 0,
    itemId: 'toan_chan_tien_tuu',
    action: 'sell',
  });
  await bad;
  expect(h.gold).toBe(gold + 120);
}, 30000);
