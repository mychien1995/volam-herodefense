import { beforeAll, afterAll, afterEach, it, expect } from 'vitest';
import {
  PRACTICE_ROOM,
  MATCH_ROOM,
  PVP_ROOM,
  PROTOCOL_VERSION,
  type PracticeJoinOptions,
} from '@volam/game-protocol';
import { startRoomTestServer } from './room-test-server.js';
import type { PracticeRoom } from '../apps/game-server/src/rooms/PracticeRoom.js';
let server: Awaited<ReturnType<typeof startRoomTestServer>>;
beforeAll(async () => {
  server = await startRoomTestServer();
});
afterEach(async () => {
  await server.cleanup();
});
afterAll(async () => {
  await server.shutdown();
});
const opts: PracticeJoinOptions = {
  nickname: 'Phòng thử',
  protocolVersion: PROTOCOL_VERSION,
  schoolId: 'cai_bang' as const,
  branchId: 'cai_bang_chuong',
};
const create = () => server.sdk.create<PracticeRoom>(PRACTICE_ROOM, opts);

it('switches the authenticated hero in place and rejects stale or cross-school selections', async () => {
  const p = await create();
  await expect.poll(() => p.state.players.size).toBe(1);
  const id = p.sessionId,
    roomId = p.roomId,
    initial = p.state.players.get(id)!;
  const x = initial.x,
    y = initial.y;
  const dogs = [...p.state.creeps.keys()];
  const choose = (
    sequence: number,
    schoolId: 'vo_dang' | 'cai_bang',
    branchId: string,
  ) =>
    p.send('practice-select', {
      protocolVersion: PROTOCOL_VERSION,
      sequence,
      schoolId,
      branchId,
    });
  choose(1, 'vo_dang', 'vo_dang_kiem');
  await expect
    .poll(() => p.state.players.get(id)?.selectedBranch)
    .toBe('vo_dang_kiem');
  expect(p.roomId).toBe(roomId);
  expect(p.state.players.size).toBe(1);
  expect(p.state.players.get(id)).toMatchObject({
    nickname: opts.nickname,
    schoolId: 'vo_dang',
    level: 30,
    x,
    y,
    lastSequence: 1,
  });
  expect([...p.state.creeps.keys()]).toEqual(dogs);
  const invalid = p.waitForMessage('command-rejected');
  choose(2, 'vo_dang', 'cai_bang_bong');
  expect((await invalid).reason).toContain('không hợp lệ');
  expect(p.state.players.get(id)?.selectedBranch).toBe('vo_dang_kiem');
  const stale = p.waitForMessage('command-rejected');
  choose(1, 'cai_bang', 'cai_bang_bong');
  expect((await stale).reason).toContain('đã xử lý');
  choose(3, 'vo_dang', 'vo_dang_quyen');
  await expect
    .poll(() => p.state.players.get(id)?.selectedBranch)
    .toBe('vo_dang_quyen');
  const events: any[] = [];
  p.onMessage('combat-event', (e) => events.push(e));
  p.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 4,
    kind: 'cast',
    slot: 0,
  });
  await expect
    .poll(() =>
      events.some(
        (e) =>
          e.kind === 'cast' && e.abilityId === p.state.players.get(id)?.qSkill,
      ),
    )
    .toBe(true);
  const h = p.state.players.get(id)!;
  expect([
    h.qCooldown,
    h.wCooldown,
    h.eCooldown,
    h.rCooldown,
    h.tCooldown,
  ]).toEqual([0, 0, 0, 0, 0]);
  expect(h.mana).toBe(h.maxMana);
});

it('creates an isolated single-seat practice session with max skills and replicated dogs', async () => {
  const p = await create();
  p.reconnection.enabled = false;
  await expect.poll(() => p.state.creeps.size).toBe(3);
  const h = p.state.players.get(p.sessionId)!;
  expect(p.state.practice.enabled).toBe(true);
  expect(p.state.pvp.enabled).toBe(false);
  expect(p.state.defense.enabled).toBe(false);
  expect(h.level).toBe(30);
  expect(h.confirmed).toBe(true);
  expect(h.selectedBranch).toBe('cai_bang_chuong');
  expect(p.state.maxPlayers).toBe(1);
  expect(
    [...p.state.creeps.values()].every(
      (c) => c.archetypeId === 'practice_dog' && c.invasionWave === 1,
    ),
  ).toBe(true);
  await expect(server.sdk.joinById(p.roomId, opts)).rejects.toThrow();
  const other = await create();
  expect(other.roomId).not.toBe(p.roomId);
  await expect.poll(() => other.state.players?.size).toBe(1);
  expect(other.state.players.has(p.sessionId)).toBe(false);
});
it('auth rejects wrong school/branch and rejects practice privileges in Defense/PvP namespaces', async () => {
  await expect(
    server.sdk.create(PRACTICE_ROOM, { ...opts, branchId: 'vo_dang_kiem' }),
  ).rejects.toThrow();
  await expect(server.sdk.create(MATCH_ROOM, opts)).rejects.toThrow();
  await expect(
    server.sdk.create(PVP_ROOM, { ...opts, pvp: true }),
  ).rejects.toThrow();
  await expect(
    server.sdk.create(PRACTICE_ROOM, {
      ...opts,
      protocolVersion: PROTOCOL_VERSION - 1,
    }),
  ).rejects.toThrow();
});
it('runs real hits with full HP and blocks shop, travel and loadout bypasses', async () => {
  const p = await create();
  const events: any[] = [];
  p.onMessage('combat-event', (e) => events.push(e));
  p.reconnection.enabled = false;
  p.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 1,
    kind: 'basic',
  });
  await expect
    .poll(() => events.some((e) => e.kind === 'hit' && e.damage > 0))
    .toBe(true);
  expect([...p.state.creeps.values()].every((c) => c.hp === c.maxHp)).toBe(
    true,
  );
  const rejected = p.waitForMessage('command-rejected');
  p.send('merchant-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 2,
    revision: 0,
    action: 'use-potion',
    potionId: 'hp_small',
  });
  expect((await rejected).reason).toContain('phòng test');
  const bypass = p.waitForMessage('command-rejected');
  p.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 3,
    kind: 'dev-loadout',
    ids: ['', '', '', ''],
  });
  expect((await bypass).reason).toContain('khóa');
  expect(events.some((e) => e.kind === 'death')).toBe(false);
});
