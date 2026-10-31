import { beforeAll, afterAll, afterEach, it, expect } from 'vitest';
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
const client = new Client('http://localhost:2654');
const saved = {
  node: process.env['NODE_ENV'],
  practice: process.env['VOLAM_DEV_PRACTICE_CREEPS'],
};
beforeAll(async () => {
  process.env['NODE_ENV'] = 'development';
  delete process.env['VOLAM_DEV_PRACTICE_CREEPS'];
  const app = createGameServer();
  await app.listen(2654);
  server = new ColyseusTestServer(app);
});
afterEach(async () => {
  await server.cleanup();
  process.env['NODE_ENV'] = 'development';
  delete process.env['VOLAM_DEV_PRACTICE_CREEPS'];
});
afterAll(async () => {
  await server?.shutdown();
  for (const [key, value] of [
    ['NODE_ENV', saved.node],
    ['VOLAM_DEV_PRACTICE_CREEPS', saved.practice],
  ]) {
    if (value === undefined) delete process.env[key!];
    else process.env[key!] = value;
  }
});
const create = () =>
  client.create<LobbyState>(MATCH_ROOM, {
    nickname: 'Clean arena',
    protocolVersion: PROTOCOL_VERSION,
  });
it('regular multiplayer matches start empty and do not respawn practice enemies', async () => {
  const a = await create(),
    b = await client.joinById<LobbyState>(a.roomId, {
      nickname: 'Observer',
      protocolVersion: PROTOCOL_VERSION,
    });
  await expect.poll(() => a.state.players.size).toBe(2);
  a.send('lobby-action', { action: 'start' });
  await expect.poll(() => a.state.phase).toBe('SCHOOL_SELECTION');
  for (const p of [a, b]) {
    p.send('lobby-action', { action: 'select', schoolId: 'thieu_lam' });
    p.send('lobby-action', { action: 'confirm' });
  }
  await expect.poll(() => a.state.phase).toBe('IN_GAME');
  const room = server.getRoomById<MatchRoom>(a.roomId);
  expect(room.world.creeps.size).toBe(0);
  for (let i = 0; i < 270; i++) room.simulation.step();
  expect(room.world.creeps.size).toBe(0);
  expect(a.state.creeps.size).toBe(0);
  expect(b.state.creeps.size).toBe(0);
});
it('practice targets require the explicit development fixture flag', async () => {
  process.env['VOLAM_DEV_PRACTICE_CREEPS'] = '1';
  const a = await create();
  const room = server.getRoomById<MatchRoom>(a.roomId);
  expect(room.world.creeps.size).toBe(3);
});
it('production ignores the practice-target fixture flag', async () => {
  process.env['NODE_ENV'] = 'production';
  process.env['VOLAM_DEV_PRACTICE_CREEPS'] = '1';
  const a = await create();
  const room = server.getRoomById<MatchRoom>(a.roomId);
  expect(room.world.creeps.size).toBe(0);
});
