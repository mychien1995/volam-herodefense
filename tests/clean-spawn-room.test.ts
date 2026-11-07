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
    p.send('lobby-action', { action: 'branch', basicId: 'thieu_lam_quyen' });
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

it('requires a branch from the selected school, freezes the choice and validates rank requests', async () => {
  const a = await create();
  a.send('lobby-action', { action: 'start' });
  await expect.poll(() => a.state.phase).toBe('SCHOOL_SELECTION');
  a.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
  const noBranch = a.waitForMessage('command-rejected');
  a.send('lobby-action', { action: 'confirm' });
  expect((await noBranch).reason).toMatch(/chọn nhánh/);
  const wrongSchool = a.waitForMessage('command-rejected');
  a.send('lobby-action', { action: 'branch', basicId: 'vo_dang_kiem' });
  expect((await wrongSchool).reason).toMatch(/không thuộc/);
  a.send('lobby-action', { action: 'branch', basicId: 'cai_bang_chuong' });
  const self = () => a.state.players.get(a.sessionId)!;
  await expect.poll(() => self().selectedBranch).toBe('cai_bang_chuong');
  a.send('lobby-action', { action: 'select', schoolId: 'thieu_lam' });
  await expect.poll(() => self().selectedBranch).toBe('');
  a.send('lobby-action', { action: 'branch', basicId: 'thieu_lam_quyen' });
  a.send('lobby-action', { action: 'confirm' });
  await expect.poll(() => a.state.phase).toBe('IN_GAME');
  expect(self().basicId).toBe('thieu_lam_quyen');
  expect(self().build.slotSkills.length).toBe(5);
  expect(self().qSkill).toBe('');
  const locked = a.waitForMessage('command-rejected');
  a.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
  expect((await locked).reason).toMatch(/Không thể đổi/);
  const earlyUltimate = a.waitForMessage('command-rejected');
  a.send('build-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 1,
    revision: self().build.revision,
    action: 'upgrade-slot',
    slot: 4,
  });
  expect((await earlyUltimate).reason).toMatch(/cấp 6/);
  a.send('build-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 2,
    revision: self().build.revision,
    action: 'upgrade-slot',
    slot: 0,
  });
  await expect.poll(() => self().qSkill).toBe('la_han_quyen');
  const replay = a.waitForMessage('command-rejected');
  a.send('build-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 2,
    revision: self().build.revision,
    action: 'upgrade-slot',
    slot: 1,
  });
  expect((await replay).reason).toMatch(/đã được xử lý/);
  expect(self().build.allocated).toBe(1);
  a.send('build-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 3,
    revision: self().build.revision,
    action: 'stance',
  });
  await expect.poll(() => self().qSkill).toBe('toan_phong_thoai');
  expect(self().build.ranks.get('toan_phong_thoai')).toBe(1);
});
