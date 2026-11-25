import { beforeAll, afterAll, afterEach, it, expect } from 'vitest';
import { startRoomTestServer } from './room-test-server.js';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';
import { MATCH_ROOM, PROTOCOL_VERSION } from '@volam/game-protocol';
import { spawnNamDeIfReady, beginNamDeCast } from '@volam/game-core';
let server: Awaited<ReturnType<typeof startRoomTestServer>>;
let client: Awaited<ReturnType<typeof startRoomTestServer>>['sdk'];
beforeAll(async () => {
  server = await startRoomTestServer();
  client = server.sdk;
});
afterEach(async () => server?.cleanup());
afterAll(async () => server?.shutdown());
it('real SDK reveals only owner QTE; rejects forged owner/order/replay, closes after10 valid keys', async () => {
  const a = await client.create<MatchRoom>(MATCH_ROOM, {
      nickname: 'Nam A',
      protocolVersion: PROTOCOL_VERSION,
    }),
    b = await client.joinById<MatchRoom>(a.roomId, {
      nickname: 'Nam B',
      protocolVersion: PROTOCOL_VERSION,
    });
  for (const r of [a, b])
    await expect.poll(() => r.state?.players.has(r.sessionId)).toBe(true);
  a.send('lobby-action', { action: 'start' });
  for (const r of [a, b]) {
    await expect.poll(() => r.state.phase).toBe('SCHOOL_SELECTION');
    r.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
    r.send('lobby-action', { action: 'branch', basicId: 'cai_bang_bong' });
    r.send('lobby-action', { action: 'confirm' });
  }
  await expect.poll(() => a.state.phase).toBe('IN_GAME');
  const room = server.getRoomById<MatchRoom>(a.roomId),
    w = room.world,
    s = w.namDe!,
    h = w.heroes.get(a.sessionId)!;
  s.phase = 'rest';
  s.spawnAt = 0;
  spawnNamDeIfReady(w, room.simulation.arena.config, room.simulation.tick);
  room.simulation.step(); // Complete the shared recall before arranging QTE geometry.
  s.phase = 'idle';
  s.nextActionAt = 1e9;
  const boss = w.creeps.get('boss_nam_de')!;
  boss.x = s.definition.entrance.x;
  boss.y = s.definition.entrance.y + 70;
  h.x = boss.x - 40;
  h.y = boss.y;
  h.fx = 1;
  h.fy = 0;
  for (const hero of w.heroes.values()) hero.autoBasic = false;
  await expect.poll(() => boss.invulnerable).toBe(false);
  a.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 1,
    kind: 'basic',
  });
  await expect.poll(() => boss.provoked).toBe(true);
  beginNamDeCast(w, room.simulation.arena.config, 'dai_ly_phong_huyet', h.id);
  await expect.poll(() => s.controls.get(h.id)?.qte?.state).toBe('pending');
  await expect.poll(() => a.state.namDeControls.has(h.id)).toBe(true);
  expect(b.state.namDeControls.has(h.id)).toBe(false);
  const q = s.controls.get(h.id)!.qte!;
  b.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 1,
    kind: 'nam-de-key',
    castId: q.id,
    index: 0,
    key: q.keys[0]!,
  });
  a.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 2,
    kind: 'nam-de-key',
    castId: q.id,
    index: 1,
    key: q.keys[1]!,
  });
  await expect.poll(() => h.lastSequence).toBe(2);
  expect(q.index).toBe(0);
  for (let i = 0; i < 10; i++)
    a.send('input', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 3 + i,
      kind: 'nam-de-key',
      castId: q.id,
      index: i,
      key: q.keys[i]!,
    });
  await expect.poll(() => q.state).toBe('success');
  await expect
    .poll(() => JSON.parse(a.state.namDeControls.get(h.id)!.payload).qte.state)
    .toBe('success');
  expect(h.namDeLocked).toBe(false);
  const hp = h.hp,
    bhp = boss.hp;
  a.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 12,
    kind: 'nam-de-key',
    castId: q.id,
    index: 9,
    key: 'up',
  });
  await expect.poll(() => h.lastSequence).toBe(12);
  expect(q.state).toBe('success');
  expect(h.hp).toBeGreaterThanOrEqual(hp);
  expect(boss.hp).toBe(bhp);
  await a.leave();
  await expect.poll(() => s.controls.has(h.id)).toBe(false);
  await b.leave();
}, 20000);
