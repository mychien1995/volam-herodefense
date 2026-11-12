import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { Client } from '@colyseus/sdk';
import { createGameServer } from '../apps/game-server/src/app.config.js';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';
import {
  MATCH_ROOM,
  PROTOCOL_VERSION,
  type LobbyState,
} from '@volam/game-protocol';

let server: ColyseusTestServer;
const sdk = new Client('http://localhost:2673');
const opts = (nickname: string) => ({
  nickname,
  protocolVersion: PROTOCOL_VERSION,
});
beforeAll(async () => {
  const app = createGameServer();
  await app.listen(2673);
  server = new ColyseusTestServer(app);
});
afterEach(async () => {
  await server.cleanup();
});
afterAll(async () => {
  await server.shutdown();
});
it('authorizes purchases, rejects replays/stale spends and replicates gear/resources to peers', async () => {
  const a = await sdk.create<LobbyState>(MATCH_ROOM, opts('Buyer'));
  const b = await sdk.joinById<LobbyState>(a.roomId, opts('Peer'));
  await expect.poll(() => a.state.players?.size).toBe(2);
  a.send('lobby-action', { action: 'start' });
  await expect.poll(() => a.state.phase).toBe('SCHOOL_SELECTION');
  for (const peer of [a, b]) {
    peer.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
    peer.send('lobby-action', { action: 'branch', basicId: 'cai_bang_bong' });
    peer.send('lobby-action', { action: 'confirm' });
  }
  await expect.poll(() => a.state.phase).toBe('IN_GAME');
  const room = server.getRoomById<MatchRoom>(a.roomId),
    h = room.simulation.hero(a.sessionId)!;
  for (const peer of [a, b])
    await expect
      .poll(() => {
        const potions = peer.state.players.get(peer.sessionId)?.inventory
          .potions;
        return [potions?.get('hp_small'), potions?.get('mp_small')];
      })
      .toEqual([10, 10]);
  h.gold = 100;
  h.hp = 50;
  await expect.poll(() => a.state.players.get(a.sessionId)!.gold).toBe(100);
  const request = {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 1,
    revision: 0,
    action: 'buy-basic',
    slot: 'weapon',
  };
  a.send('merchant-action', request);
  a.send('merchant-action', request);
  a.send('merchant-action', { ...request, sequence: 2 });
  await expect
    .poll(() =>
      a.state.players.get(a.sessionId)!.inventory.levels.get('weapon'),
    )
    .toBe(1);
  await expect.poll(() => b.state.players.get(a.sessionId)!.gold).toBe(70);
  expect(h.inventory!.revision).toBe(1);
  expect(h.inventory!.levels.weapon).toBe(1);
  expect(a.state.players.get(b.sessionId)!.inventory.levels.get('weapon')).toBe(
    0,
  );
  const buyPotion = {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 3,
    revision: 1,
    action: 'buy-potion',
    potionId: 'hp_small',
    quantity: 1,
  };
  a.send('merchant-action', buyPotion);
  await expect.poll(() => h.lastSequence).toBe(3);
  expect(h.inventory!.potions.hp_small).toBe(10);
  expect(h.inventory!.revision).toBe(1);
  expect(h.gold).toBe(70);

  a.send('merchant-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 4,
    revision: 1,
    action: 'use-potion',
    potionId: 'hp_small',
  });
  await expect.poll(() => a.state.players.get(a.sessionId)!.hp).toBeGreaterThanOrEqual(110);
  await expect
    .poll(() =>
      a.state.players.get(a.sessionId)!.inventory.potions.get('hp_small'),
    )
    .toBe(9);
  a.send('merchant-action', { ...buyPotion, sequence: 5, revision: 2 });
  await expect
    .poll(() =>
      b.state.players.get(a.sessionId)!.inventory.potions.get('hp_small'),
    )
    .toBe(10);
  a.send('merchant-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 6,
    revision: 3,
    action: 'use-potion',
    potionId: 'hp_small',
  });
  await expect.poll(() => h.lastSequence).toBe(6);
  expect(h.inventory!.potions.hp_small).toBe(10);
  expect(h.gold).toBe(66);
  const zoneError = room.simulation.enter(a.sessionId, 'private');
  expect(zoneError).toBeUndefined();
  a.send('merchant-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 7,
    revision: 3,
    action: 'buy-basic',
    slot: 'hat',
  });
  await expect.poll(() => h.lastSequence).toBe(7);
  expect(h.gold).toBe(66);
  expect(h.inventory!.levels.hat).toBe(0);
}, 20000);
