import { beforeAll, afterAll, expect, it } from 'vitest';
import { startRoomTestServer } from './room-test-server.js';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';
import { MATCH_ROOM, PROTOCOL_VERSION } from '@volam/game-protocol';
let server: Awaited<ReturnType<typeof startRoomTestServer>>;
const keys = [
  'NODE_ENV',
  'VOLAM_DEV_WAVE_BOSSES',
  'VOLAM_DEV_BOSS_PROGRESSION',
  'VOLAM_DEV_FINAL_BOSS',
] as const;
const before = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
beforeAll(async () => {
  Object.assign(process.env, {
    NODE_ENV: 'development',
    VOLAM_DEV_WAVE_BOSSES: '1',
    VOLAM_DEV_BOSS_PROGRESSION: '1',
    VOLAM_DEV_FINAL_BOSS: '1',
  });
  server = await startRoomTestServer();
});
afterAll(async () => {
  await server?.cleanup();
  await server?.shutdown();
  for (const key of keys) {
    if (before[key] === undefined) delete process.env[key];
    else process.env[key] = before[key];
  }
});
it('only the test-room host can skip, the exact next preset reaches both peers and stale stage is rejected', async () => {
  const a = await server.sdk.create<MatchRoom>(MATCH_ROOM, {
    nickname: 'Host',
    protocolVersion: PROTOCOL_VERSION,
  });
  const b = await server.sdk.joinById<MatchRoom>(a.roomId, {
    nickname: 'Peer',
    protocolVersion: PROTOCOL_VERSION,
  });
  const rejected: string[] = [];
  for (const r of [a, b]) {
    r.onMessage('combat-event', () => {});
    r.onMessage('command-rejected', (m) => rejected.push(m.reason));
  }
  a.send('lobby-action', { action: 'start' });
  for (const r of [a, b]) {
    await expect.poll(() => r.state?.phase).toBe('SCHOOL_SELECTION');
    r.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
    r.send('lobby-action', { action: 'branch', basicId: 'cai_bang_bong' });
    r.send('lobby-action', { action: 'confirm' });
  }
  await expect.poll(() => a.state.phase).toBe('IN_GAME');
  const room = server.getRoomById<MatchRoom>(a.roomId);
  b.send('boss-test-skip', {
    stage: 'vuong_notes',
    sequence: 100,
    protocolVersion: PROTOCOL_VERSION,
  });
  await expect.poll(() => rejected.length).toBe(1);
  expect(room.world.waveBossTest!.stage).toBe('dong_ta');
  a.send('boss-test-skip', {
    stage: 'dong_ta',
    sequence: 100,
    protocolVersion: PROTOCOL_VERSION,
  });
  for (const r of [a, b])
    await expect.poll(() => r.state.players.get(r.sessionId)?.level).toBe(12);
  expect(room.world.waveBossTest!.stage).toBe('tay_doc');
  expect(room.world.campaign!.cleared.size).toBe(0);
  for (const r of [a, b])
    expect(
      r.state.players.get(r.sessionId)!.inventory.crafted.get('boots'),
    ).toBe('cleanse');
  a.send('boss-test-skip', {
    stage: 'dong_ta',
    sequence: 101,
    protocolVersion: PROTOCOL_VERSION,
  });
  await expect.poll(() => rejected.length).toBe(2);
  expect(room.world.waveBossTest!.stage).toBe('tay_doc');
  delete process.env.VOLAM_DEV_WAVE_BOSSES;
  delete process.env.VOLAM_DEV_BOSS_PROGRESSION;
  const normal = await server.sdk.create<MatchRoom>(MATCH_ROOM, {
    nickname: 'Normal',
    protocolVersion: PROTOCOL_VERSION,
  });
  normal.onMessage('command-rejected', (m) => rejected.push(m.reason));
  normal.send('boss-test-skip', {
    stage: 'vuong_notes',
    sequence: 1,
    protocolVersion: PROTOCOL_VERSION,
  });
  await expect.poll(() => rejected.length).toBe(3);
  expect(
    server.getRoomById<MatchRoom>(normal.roomId).world.waveBossTest,
  ).toBeUndefined();
  await normal.leave();
  await a.leave();
  await b.leave();
});

it('only the DEV host starts Nam De dark, synchronizes level18 and preserves the clear ledger', async () => {
  Object.assign(process.env, {
    NODE_ENV: 'development',
    VOLAM_DEV_WAVE_BOSSES: '1',
    VOLAM_DEV_BOSS_PROGRESSION: '1',
    VOLAM_DEV_FINAL_BOSS: '1',
  });
  const a = await server.sdk.create<MatchRoom>(MATCH_ROOM, {
    nickname: 'Dark host',
    protocolVersion: PROTOCOL_VERSION,
  });
  const b = await server.sdk.joinById<MatchRoom>(a.roomId, {
    nickname: 'Dark peer',
    protocolVersion: PROTOCOL_VERSION,
  });
  const rejected: string[] = [];
  for (const r of [a, b]) {
    r.onMessage('combat-event', () => {});
    r.onMessage('command-rejected', (m) => rejected.push(m.reason));
  }
  a.send('lobby-action', { action: 'start' });
  for (const r of [a, b]) {
    await expect.poll(() => r.state.phase).toBe('SCHOOL_SELECTION');
    r.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
    r.send('lobby-action', { action: 'branch', basicId: 'cai_bang_bong' });
    r.send('lobby-action', { action: 'confirm' });
  }
  await expect.poll(() => a.state.phase).toBe('IN_GAME');
  b.send('boss-test-skip', {
    stage: 'nam_de_dark',
    sequence: 10,
    protocolVersion: PROTOCOL_VERSION,
  });
  await expect.poll(() => rejected.length).toBe(1);
  const room = server.getRoomById<MatchRoom>(a.roomId);
  expect(room.world.namDe!.dark).toBeUndefined();
  a.send('boss-test-skip', {
    stage: 'nam_de_dark',
    sequence: 10,
    protocolVersion: PROTOCOL_VERSION,
  });
  for (const r of [a, b])
    await expect.poll(() => r.state.players.get(r.sessionId)?.level).toBe(18);
  expect(room.world.namDe!.dark!.shield).toBe(true);
  expect(room.world.namDe!.dark!.reflections).toBe(0);
  expect(room.world.campaign!.cleared.size).toBe(0);
  expect(room.world.namDe!.dark!.reflections).toBe(0);
  await a.leave();
  await b.leave();
});
