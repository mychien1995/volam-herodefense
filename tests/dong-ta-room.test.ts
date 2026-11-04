import { beforeAll, afterAll, afterEach, it, expect } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { Client } from '@colyseus/sdk';
import { MATCH_ROOM, PROTOCOL_VERSION } from '@volam/game-protocol';
import { createGameServer } from '../apps/game-server/src/app.config.js';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';
import type { DongView } from '@volam/game-core';
let server: ColyseusTestServer;
const client = new Client('http://127.0.0.1:2723');
const options = (nickname: string) => ({
  nickname,
  protocolVersion: PROTOCOL_VERSION,
});
beforeAll(async () => {
  const game = createGameServer();
  await game.listen(2723);
  server = new ColyseusTestServer(game);
});
afterEach(async () => {
  await server.cleanup();
});
afterAll(async () => {
  await server.shutdown();
});
it('two SDK clients observe authoritative recall, bounds, attacks, retry and clear; forged state is rejected', async () => {
  const a = await client.create<MatchRoom['state']>(
      MATCH_ROOM,
      options('Đông-1'),
    ),
    b = await client.joinById<MatchRoom['state']>(a.roomId, options('Đông-2'));
  a.send('lobby-action', { action: 'start' });
  await expect.poll(() => a.state.phase).toBe('SCHOOL_SELECTION');
  for (const peer of [a, b]) {
    peer.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
    peer.send('lobby-action', { action: 'branch', basicId: 'cai_bang_bong' });
    peer.send('lobby-action', { action: 'confirm' });
  }
  await expect.poll(() => a.state.phase).toBe('IN_GAME');
  const room = server.getRoomById<MatchRoom>(a.roomId),
    m = room.simulation,
    w = room.world,
    e = m.dongTa!;
  const d = e.definition;
  d.restTicks = 2;
  d.entryTicks = 3;
  d.retryTicks = 5;
  expect(m.enter(b.sessionId, 'private', 'co_mo')).toBeUndefined();
  m.hero(b.sessionId)!.hp = 0;
  w.statue!.hp = 1234;
  m.invasion!.wave = 5;
  for (let n = 0; n < 10; n++) m.step();
  const view = () => JSON.parse(a.state.defense.dongTa) as DongView;
  await expect.poll(() => view().phase).toBe('fighting');
  await expect
    .poll(() => b.state.players.get(b.sessionId)?.zoneId)
    .toBe('arena');
  expect(b.state.players.get(b.sessionId)!.hp).toBeGreaterThan(0);
  expect(a.state.defense.statueHp).toBe(1234);
  expect(b.state.defense.statueHp).toBe(1234);
  await expect
    .poll(() =>
      [...b.state.creeps.values()].some((c) => c.archetypeId === 'dong_ta'),
    )
    .toBe(true);
  const hp = w.creeps.get('dong_ta')!.hp;
  const forged = await client.joinById<MatchRoom['state']>(
    a.roomId,
    options('Forged'),
  );
  forged.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 100,
    kind: 'basic',
    damage: 1e9,
    x: 800,
    y: 616,
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(w.creeps.get('dong_ta')!.hp).toBe(hp);
  const hero = m.hero(a.sessionId)!;
  hero.x = 1105;
  hero.y = 616;
  a.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 101,
    kind: 'move',
    x: 1,
    y: 0,
  });
  await expect
    .poll(() => a.state.players.get(a.sessionId)!.lastSequence)
    .toBe(101);
  for (let n = 0; n < 50; n++) m.step();
  expect(hero.x).toBeLessThanOrEqual(1116);
  a.send('dungeon-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 200,
    action: 'enter',
    access: 'private',
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(m.zoneOf(a.sessionId)!.id).toBe('arena');
  for (const h of w.heroes.values()) h.hp = 0;
  m.step();
  await expect.poll(() => view().attempt).toBe(2);
  expect(w.creeps.get('dong_ta')!.hp).toBe(w.creeps.get('dong_ta')!.maxHp);
  w.creeps.get('dong_ta')!.hits[a.sessionId] = w.tick;
  w.creeps.get('dong_ta')!.hp = 0;
  m.step();
  await expect.poll(() => view().phase).toBe('cleared');
  await expect
    .poll(() => JSON.parse(b.state.defense.dongTa).phase)
    .toBe('cleared');
  expect(a.state.players.get(a.sessionId)!.gold).toBe(d.gold);
  expect(a.state.defense.statueHp).toBe(1234);
  expect(m.arena.config.heroBounds).toBeUndefined();
  expect(m.enter(a.sessionId, 'private')).toBeUndefined();
  await b.leave();
  await a.leave();
});
