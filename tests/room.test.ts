import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { CloseCode, ServerError } from '@colyseus/core';
import type { Room } from '@colyseus/sdk';
import {
  PROTOCOL_VERSION,
  MATCH_ROOM,
  connectionAckSchema,
  type JoinOptions,
} from '@volam/game-protocol';
import { startRoomTestServer } from './room-test-server.js';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';

let server: Awaited<ReturnType<typeof startRoomTestServer>>;
const previousLegacy = process.env['VOLAM_DEV_LEGACY_SKILLS'];
let client: Awaited<ReturnType<typeof startRoomTestServer>>['sdk'];
const options = (nickname: string): JoinOptions => ({
  nickname,
  protocolVersion: PROTOCOL_VERSION,
});
const previousPracticeCreeps = process.env['VOLAM_DEV_PRACTICE_CREEPS'];
beforeAll(async () => {
  process.env['VOLAM_DEV_PRACTICE_CREEPS'] = '1';
  process.env['VOLAM_DEV_LEGACY_SKILLS'] = '1';
  server = await startRoomTestServer();
  client = server.sdk;
});
afterEach(async () => {
  await server?.cleanup();
});
afterAll(async () => {
  if (previousPracticeCreeps === undefined)
    delete process.env['VOLAM_DEV_PRACTICE_CREEPS'];
  else process.env['VOLAM_DEV_PRACTICE_CREEPS'] = previousPracticeCreeps;
  if (previousLegacy === undefined)
    delete process.env['VOLAM_DEV_LEGACY_SKILLS'];
  else process.env['VOLAM_DEV_LEGACY_SKILLS'] = previousLegacy;
  await server?.shutdown();
});

describe('real Colyseus room + SDK clients', () => {
  it('exposes health readiness', async () => {
    const response = await server.http.get('/health');
    expect(response.data).toEqual({
      status: 'ok',
      milestone: 'M3B',
      protocolVersion: PROTOCOL_VERSION,
      ...(process.env['VOLAM_QA_RUN_ID']
        ? {
            service: 'volam-game-server',
            runId: process.env['VOLAM_QA_RUN_ID'],
          }
        : {}),
    });
  });
  it('joins two clients by ID and synchronizes a server-owned check', async () => {
    const a = await client.create(MATCH_ROOM, options('Võ Lâm'));
    const b = await client.joinById<MatchRoom>(a.roomId, options('Thiếu Lâm'));
    const authoritative = server.getRoomById<MatchRoom>(a.roomId);
    await expect.poll(() => a.state.players?.size).toBe(2);
    await expect.poll(() => b.state.players?.size).toBe(2);
    const ack = a.waitForMessage('connection-ack');
    a.send('connection-check', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 1,
    });
    expect(connectionAckSchema.parse(await ack)).toEqual({
      protocolVersion: PROTOCOL_VERSION,
      sequence: 1,
      checks: 1,
    });
    await expect.poll(() => b.state.players.get(a.sessionId)?.checks).toBe(1);
    expect(authoritative.state.players.get(a.sessionId)?.checks).toBe(1);
    expect(authoritative.state.players.get(b.sessionId)?.checks).toBe(0);
    const replay = a.waitForMessage('connection-ack');
    a.send('connection-check', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 1,
    });
    expect(connectionAckSchema.parse(await replay).checks).toBe(1);
    await a.leave();
    await expect.poll(() => b.state.players.size).toBe(1);
  });
  it('enforces six seats and permits a new join after one leaves', async () => {
    const first = await client.create(MATCH_ROOM, options('Hero1'));
    for (let i = 2; i <= 6; i++)
      await client.joinById<MatchRoom>(first.roomId, options(`Hero${i}`));
    const authoritative = server.getRoomById<MatchRoom>(first.roomId);
    expect(authoritative.state.players.size).toBe(6);
    await expect(
      client.joinById<MatchRoom>(first.roomId, options('Seventh')),
    ).rejects.toThrow();
    expect(authoritative.state.players.size).toBe(6);
    await first.leave();
    await expect.poll(() => authoritative.state.players.size).toBe(5);
    const replacement = await client.joinById<MatchRoom>(
      first.roomId,
      options('Replacement'),
    );
    await expect.poll(() => replacement.state.players?.size).toBe(6);
  });
  it('isolates room state with duplicate display nicknames', async () => {
    const a = await client.create(MATCH_ROOM, options('Hero'));
    const b = await client.create(MATCH_ROOM, options('Hero'));
    await expect.poll(() => b.state?.players?.has(b.sessionId)).toBe(true);
    const ack = a.waitForMessage('connection-ack');
    a.send('connection-check', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 1,
    });
    await ack;
    expect(a.roomId).not.toBe(b.roomId);
    expect(b.state.players.has(a.sessionId)).toBe(false);
    expect(b.state.players.get(b.sessionId)?.checks).toBe(0);
  });
  it('cleans up a drop when the reconnect reservation is rejected', async () => {
    const host = await client.create(MATCH_ROOM, options('Host'));
    const guest = await client.joinById<MatchRoom>(
      host.roomId,
      options('Guest'),
    );
    const room = server.getRoomById<MatchRoom>(host.roomId);
    const rejected = Promise.reject(new ServerError(400, 'Join incomplete'));
    // Keep the test runner alive while checking that the room observes the rejection.
    void rejected.catch(() => undefined);
    const handleRejection = vi.spyOn(rejected, 'catch');
    // Colyseus returns a native rejected promise before a reservation exists.
    const reserve = vi
      .spyOn(room, 'allowReconnection')
      .mockReturnValue(
        rejected as unknown as ReturnType<MatchRoom['allowReconnection']>,
      );
    try {
      guest.reconnection.enabled = false;
      guest.connection.close();
      await expect
        .poll(() => room.state.players.has(guest.sessionId))
        .toBe(false);
      expect(reserve).toHaveBeenCalledOnce();
      expect(handleRejection).toHaveBeenCalledOnce();
      expect(room.state.players.has(host.sessionId)).toBe(true);
    } finally {
      reserve.mockRestore();
      handleRejection.mockRestore();
    }
  });
  it('rejects invalid joins before adding players', async () => {
    const a = await client.create(MATCH_ROOM, options('Hero'));
    for (const nickname of ['', '<script>', 'x'.repeat(21)]) {
      await expect(
        client.joinById<MatchRoom>(a.roomId, options(nickname)),
      ).rejects.toThrow();
    }
    await expect(
      Reflect.apply(client.joinById, client, [
        a.roomId,
        { nickname: 'Hero', protocolVersion: 999 },
      ]),
    ).rejects.toThrow();
    expect(server.getRoomById<MatchRoom>(a.roomId).state.players.size).toBe(1);
  });
  it('rejects a forged packet without accepting client state', async () => {
    const a = await client.create(MATCH_ROOM, options('Honest'));
    const b = await client.joinById<MatchRoom>(a.roomId, options('Forged'));
    await expect.poll(() => a.state.players?.size).toBe(2);
    const left = new Promise<number>((resolve) => b.onLeave.once(resolve));
    Reflect.apply(b.send, b, [
      'connection-check',
      {
        protocolVersion: PROTOCOL_VERSION,
        sequence: 1,
        checks: 999,
        sessionId: a.sessionId,
      },
    ]);
    expect(await left).toBe(CloseCode.WITH_ERROR);
    await expect
      .poll(() => a.state.players.get(b.sessionId)?.connected)
      .toBe(false);
    expect(
      server.getRoomById<MatchRoom>(a.roomId).simulation.hero(b.sessionId),
    ).toBeUndefined();
    expect(a.state.players.get(b.sessionId)?.checks).toBe(0);
    expect(a.state.players.get(a.sessionId)?.checks).toBe(0);
  });
  it('disposes an empty room and rejects its expired ID', async () => {
    const a = await client.create(MATCH_ROOM, options('Hero'));
    const id = a.roomId;
    await a.leave();
    await expect.poll(() => server.getRoomById(id)).toBeUndefined();
    await expect(
      client.joinById<MatchRoom>(id, options('Late')),
    ).rejects.toThrow();
  });
});

async function begin(a: Room<MatchRoom>, b?: Room<MatchRoom>) {
  await expect.poll(() => a.state.players?.size).toBe(b ? 2 : 1);
  a.send('lobby-action', { action: 'start' });
  await expect.poll(() => a.state.phase).toBe('SCHOOL_SELECTION');
  for (const c of b ? [a, b] : [a]) {
    c.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
    c.send('lobby-action', { action: 'confirm' });
  }
  await expect.poll(() => a.state.phase).toBe('IN_GAME');
  if (b) await expect.poll(() => b.state.phase).toBe('IN_GAME');
}
describe('M1 authoritative room gameplay', () => {
  it('synchronizes normalized movement and input acknowledgements to two clients', async () => {
    const a = await client.create(MATCH_ROOM, options('First'));
    const b = await client.joinById<MatchRoom>(a.roomId, options('Observer'));
    await expect.poll(() => b.state.players?.size).toBe(2);
    await begin(a, b);
    const initial = a.state.players.get(a.sessionId)!.x;
    a.send('input', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 1,
      kind: 'move',
      x: 1,
      y: -1,
    });
    await expect
      .poll(() => b.state.players.get(a.sessionId)?.x)
      .toBeGreaterThan(initial + 10);
    a.send('input', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 2,
      kind: 'move',
      x: 0,
      y: 0,
    });
    await expect
      .poll(() => b.state.players.get(a.sessionId)?.lastSequence)
      .toBe(2);
    await expect
      .poll(() => a.state.players.get(a.sessionId)?.x)
      .toBe(b.state.players.get(a.sessionId)?.x);
    const authoritative = server
      .getRoomById<MatchRoom>(a.roomId)
      .world.heroes.get(a.sessionId)!;
    expect(authoritative.x).toBeCloseTo(a.state.players.get(a.sessionId)!.x, 3);
  });
  it('broadcasts one accepted attack and agrees on shared enemy HP', async () => {
    const a = await client.create(MATCH_ROOM, options('Fighter'));
    const b = await client.joinById<MatchRoom>(a.roomId, options('Observer'));
    await begin(a, b);
    const authoritative = server.getRoomById<MatchRoom>(a.roomId);
    const hero = authoritative.world.heroes.get(a.sessionId)!;
    const enemy = authoritative.world.creeps.get('creep_0')!;
    enemy.x = hero.x + 36;
    enemy.y = hero.y;
    enemy.hp = 1000;
    enemy.maxHp = 1000;
    await expect.poll(() => b.state.creeps.get('creep_0')?.hp).toBe(1000);
    const received = b.waitForMessage('combat-event');
    a.send('input', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 1,
      kind: 'basic',
    });
    await received;
    await expect
      .poll(() => b.state.creeps.get('creep_0')?.hp)
      .toBeLessThan(1000);
    a.send('input', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 2,
      kind: 'basic',
    });
    a.send('input', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 3,
      kind: 'basic',
    });
    const hp = enemy.hp;
    await expect.poll(() => a.state.creeps.get('creep_0')?.hp).toBe(hp);
    expect(b.state.creeps.get('creep_0')?.hp).toBe(hp);
    expect(
      authoritative.world.heroes.get(a.sessionId)?.lastSequence,
    ).toBeGreaterThanOrEqual(1);
  });
  it('rejects empty slots and forged movement/damage messages without affecting another room', async () => {
    const a = await client.create(MATCH_ROOM, options('First'));
    const other = await client.create(MATCH_ROOM, options('Other room'));
    await expect.poll(() => a.state?.players?.has(a.sessionId)).toBe(true);
    await expect
      .poll(() => other.state?.players?.has(other.sessionId))
      .toBe(true);
    await begin(a);
    await begin(other);
    const rejection = a.waitForMessage('command-rejected');
    a.send('input', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 1,
      kind: 'cast',
      slot: 3,
    });
    expect((await rejection).reason).toContain('chưa được trang bị');
    const initial = server
      .getRoomById<MatchRoom>(other.roomId)
      .world.heroes.get(other.sessionId)!.x;
    a.send('input', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 2,
      kind: 'cast',
      slot: 0,
    });
    await expect
      .poll(
        () =>
          server.getRoomById<MatchRoom>(a.roomId).world.creeps.get('creep_0')
            ?.hp,
      )
      .toBeLessThan(120);
    expect(
      server.getRoomById<MatchRoom>(other.roomId).world.creeps.get('creep_0')
        ?.hp,
    ).toBe(120);
    expect(
      server
        .getRoomById<MatchRoom>(other.roomId)
        .world.heroes.get(other.sessionId)?.xp,
    ).toBe(0);
    const closed = new Promise<number>((resolve) => a.onLeave.once(resolve));
    Reflect.apply(a.send, a, [
      'input',
      {
        protocolVersion: PROTOCOL_VERSION,
        sequence: 2,
        kind: 'move',
        x: 10000,
        y: 0,
        damage: 999,
        sessionId: other.sessionId,
      },
    ]);
    expect(await closed).toBe(CloseCode.WITH_ERROR);
    expect(
      server
        .getRoomById<MatchRoom>(other.roomId)
        .world.heroes.get(other.sessionId)?.x,
    ).toBe(initial);
    expect(other.state.players.size).toBe(1);
  });
});

describe('authoritative pre-game phases', () => {
  it('host gates start, rejects gameplay early, waits for all confirmations and permits duplicates', async () => {
    const a = await client.create(MATCH_ROOM, options('Host')),
      b = await client.joinById<MatchRoom>(a.roomId, options('Guest'));
    const room = server.getRoomById<MatchRoom>(a.roomId);
    const reject = b.waitForMessage('command-rejected');
    b.send('lobby-action', { action: 'start' });
    expect((await reject).reason).toContain('host');
    expect(room.state.phase).toBe('WAITING_LOBBY');
    expect(room.world.heroes.size).toBe(0);
    expect(room.world.tick).toBe(0);
    const early = a.waitForMessage('command-rejected');
    a.send('input', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 1,
      kind: 'basic',
    });
    expect((await early).reason).toContain('chưa bắt đầu');
    a.send('lobby-action', { action: 'start' });
    await expect.poll(() => room.state.phase).toBe('SCHOOL_SELECTION');
    const empty = b.waitForMessage('command-rejected');
    b.send('lobby-action', { action: 'confirm' });
    expect((await empty).reason).toContain('Hãy chọn');
    a.send('lobby-action', { action: 'select', schoolId: 'vo_dang' });
    a.send('lobby-action', { action: 'select', schoolId: 'thieu_lam' });
    a.send('lobby-action', { action: 'confirm' });
    await expect
      .poll(() => room.state.players.get(a.sessionId)?.confirmed)
      .toBe(true);
    expect(room.state.phase).toBe('SCHOOL_SELECTION');
    expect(room.world.tick).toBe(0);
    const locked = a.waitForMessage('command-rejected');
    a.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
    expect((await locked).reason).toContain('Không thể đổi');
    const late = await client.joinById<MatchRoom>(a.roomId, options('Late'));
    b.send('lobby-action', { action: 'select', schoolId: 'thieu_lam' });
    b.send('lobby-action', { action: 'confirm' });
    await expect
      .poll(() => room.state.players.get(b.sessionId)?.confirmed)
      .toBe(true);
    expect(room.state.phase).toBe('SCHOOL_SELECTION');
    expect(room.world.tick).toBe(0);
    late.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
    late.send('lobby-action', { action: 'confirm' });
    await expect.poll(() => room.state.phase).toBe('IN_GAME');
    expect(room.world.heroes.size).toBe(3);
    expect(room.world.heroes.get(a.sessionId)?.schoolId).toBe('thieu_lam');
    expect(room.world.heroes.get(b.sessionId)?.level).toBe(1);
  });
  it('lets a late player select and spawn without resetting the active match', async () => {
    const a = await client.create(MATCH_ROOM, options('Host'));
    await begin(a);
    const room = server.getRoomById<MatchRoom>(a.roomId),
      original = room.world.heroes.get(a.sessionId)!;
    original.xp = 45;
    original.gold = 19;
    room.world.statue!.hp = 1750;
    const tick = room.world.tick,
      deadline = room.simulation.invasion!.nextWaveTick;
    const b = await client.joinById(a.roomId, options('Late'));
    await expect.poll(() => b.state.players?.size).toBe(2);
    expect(b.state.phase).toBe('IN_GAME');
    expect(b.state.players.get(b.sessionId).confirmed).toBe(false);
    expect(room.simulation.hero(b.sessionId)).toBeUndefined();
    const early = b.waitForMessage('command-rejected');
    b.send('input', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 1,
      kind: 'basic',
    });
    expect((await early).reason).toContain('xác nhận');
    const dungeon = b.waitForMessage('command-rejected');
    b.send('dungeon-action', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 2,
      action: 'enter',
      access: 'private',
    });
    expect((await dungeon).reason).toContain('xác nhận');
    b.send('lobby-action', { action: 'select', schoolId: 'vo_dang' });
    b.send('lobby-action', { action: 'confirm' });
    await expect
      .poll(() => b.state.players.get(b.sessionId)?.confirmed)
      .toBe(true);
    await expect
      .poll(() => a.state.players.get(b.sessionId)?.hp)
      .toBe(room.simulation.base.maxHp);
    expect(room.simulation.hero(b.sessionId)).toMatchObject({
      schoolId: 'vo_dang',
      level: 1,
      xp: 0,
      gold: 0,
      skillPoints: 1,
    });
    expect(room.world.heroes.get(a.sessionId)).toBe(original);
    expect(original).toMatchObject({ xp: 45, gold: 19 });
    expect(room.world.statue!.hp).toBe(1750);
    expect(room.world.tick).toBeGreaterThan(tick);
    expect(room.simulation.invasion!.nextWaveTick).toBe(deadline);
    const repeated = b.waitForMessage('command-rejected');
    b.send('lobby-action', { action: 'confirm' });
    expect((await repeated).reason).toContain('Không thể đổi');
    expect(room.world.heroes.size).toBe(2);
  });
  it('keeps the six-seat limit and reopens an active seat after a pending entrant leaves', async () => {
    const a = await client.create(MATCH_ROOM, options('Host'));
    await begin(a);
    const guests = [];
    for (let n = 0; n < 5; n++)
      guests.push(await client.joinById(a.roomId, options(`Late${n}`)));
    await expect(
      client.joinById(a.roomId, options('Seventh')),
    ).rejects.toThrow();
    await guests[0]!.leave();
    const replacement = await client.joinById(a.roomId, options('Replacement'));
    await expect.poll(() => replacement.state.players?.size).toBe(6);
    expect(server.getRoomById<MatchRoom>(a.roomId).world.heroes.size).toBe(1);
  });
  it('holds selection safely after a disconnect without timeout or auto-selection', async () => {
    const a = await client.create(MATCH_ROOM, options('Host')),
      b = await client.joinById<MatchRoom>(a.roomId, options('Guest'));
    const room = server.getRoomById<MatchRoom>(a.roomId);
    a.send('lobby-action', { action: 'start' });
    await expect.poll(() => room.state.phase).toBe('SCHOOL_SELECTION');
    await b.leave();
    await expect
      .poll(() => room.state.players.get(b.sessionId)?.connected)
      .toBe(false);
    a.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
    a.send('lobby-action', { action: 'confirm' });
    await expect
      .poll(() => room.state.players.get(a.sessionId)?.confirmed)
      .toBe(true);
    expect(room.state.phase).toBe('SCHOOL_SELECTION');
    expect(room.world.tick).toBe(0);
    expect(room.state.players.get(b.sessionId)?.schoolId).toBe('');
  });
});
