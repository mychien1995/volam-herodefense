import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  PVP_ROOM,
  MATCH_ROOM,
  PROTOCOL_VERSION,
  type PvpAction,
  type PvpJoinOptions,
} from '@volam/game-protocol';
import type { PvpSnapshot } from '@volam/game-core';
import { startRoomTestServer } from './room-test-server.js';
import type { StandaloneLoiDaiRoom } from '../apps/game-server/src/rooms/StandaloneLoiDaiRoom.js';
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
const opts = (nickname: string): PvpJoinOptions => ({
  nickname,
  protocolVersion: PROTOCOL_VERSION,
  pvp: true,
});
const create = (nickname = 'Chủ phòng') =>
  server.sdk.create<StandaloneLoiDaiRoom>(PVP_ROOM, opts(nickname));
type Peer = Awaited<ReturnType<typeof create>>;
type Request = PvpAction extends infer A
  ? A extends PvpAction
    ? Omit<A, 'protocolVersion' | 'sequence'>
    : never
  : never;
const seq = new WeakMap<object, number>();
function action(p: Peer, a: Request) {
  const n = (seq.get(p) ?? 0) + 1;
  seq.set(p, n);
  p.send('pvp-action', {
    ...a,
    sequence: n,
    protocolVersion: PROTOCOL_VERSION,
  });
}
const view = (p: Peer) => JSON.parse(p.state.pvp.json) as PvpSnapshot;
async function selected(
  p: Peer,
  schoolId: 'cai_bang' | 'vo_dang' = 'cai_bang',
) {
  action(p, {
    action: 'choose',
    schoolId,
    branchId: schoolId === 'cai_bang' ? 'cai_bang_bong' : 'vo_dang_kiem',
  });
  await expect
    .poll(() => view(p).members.find((m) => m.id === p.sessionId)?.ready)
    .toBe(true);
}
async function battle(host: Peer, guest: Peer) {
  await selected(host);
  await selected(guest, 'vo_dang');
  action(host, { action: 'assign', playerId: host.sessionId, team: 'chinh' });
  action(host, { action: 'assign', playerId: guest.sessionId, team: 'ta' });
  await expect
    .poll(() => view(guest).members.find((m) => m.id === guest.sessionId)?.team)
    .toBe('ta');
  action(host, { action: 'start' });
  await expect.poll(() => view(guest).phase).toBe('countdown');
}
describe('standalone Lôi Đài real room / SDK', () => {
  it('creates an isolated shareable eight-seat room, everyone initially spectator', async () => {
    const host = await create(),
      guest = await server.sdk.joinById<StandaloneLoiDaiRoom>(
        host.roomId,
        opts('Khách'),
      );
    await expect.poll(() => guest.state.players.size).toBe(2);
    expect(host.state.maxPlayers).toBe(8);
    expect(guest.state.defense.enabled).toBe(false);
    expect(
      view(guest).members.every((m) => m.team === 'spectator' && !m.ready),
    ).toBe(true);
    const defense = await server.sdk.create(MATCH_ROOM, {
      nickname: 'Defense',
      protocolVersion: PROTOCOL_VERSION,
    });
    await expect.poll(() => defense.state.players?.size).toBe(1);
    expect(guest.state.players.has(defense.sessionId)).toBe(false);
  });
  it('keeps room namespaces distinct and validates malformed choices', async () => {
    const host = await create();
    await expect(
      server.sdk.joinById(host.roomId, {
        nickname: 'Sai phiên',
        protocolVersion: PROTOCOL_VERSION,
      }),
    ).rejects.toThrow();
    const rejected = host.waitForMessage('command-rejected');
    action(host, {
      action: 'choose',
      schoolId: 'vo_dang',
      branchId: 'cai_bang_bong',
    });
    expect((await rejected).reason).toContain('không hợp lệ');
    expect(view(host).members[0]?.ready).toBe(false);
  });
  it('enforces ready and host-only commands, including forged player IDs', async () => {
    const host = await create(),
      guest = await server.sdk.joinById<StandaloneLoiDaiRoom>(
        host.roomId,
        opts('Khách'),
      );
    await expect.poll(() => guest.state.hostId).toBe(host.sessionId);
    let reject = host.waitForMessage('command-rejected');
    action(host, { action: 'assign', playerId: guest.sessionId, team: 'ta' });
    expect((await reject).reason).toContain('chưa chọn');
    await selected(guest);
    reject = guest.waitForMessage('command-rejected');
    action(guest, {
      action: 'assign',
      playerId: host.sessionId,
      team: 'chinh',
    });
    expect((await reject).reason).toContain('Chỉ chủ');
    reject = host.waitForMessage('command-rejected');
    action(host, { action: 'assign', playerId: 'forged', team: 'chinh' });
    expect((await reject).reason).toContain('không còn');
  });
  it('enforces eight seats including spectators and frees a departed spectator seat', async () => {
    const host = await create();
    const guests: Peer[] = [];
    for (let i = 0; i < 7; i++)
      guests.push(
        await server.sdk.joinById<StandaloneLoiDaiRoom>(
          host.roomId,
          opts('Khách ' + i),
        ),
      );
    await expect.poll(() => host.state.players.size).toBe(8);
    await expect(
      server.sdk.joinById<StandaloneLoiDaiRoom>(host.roomId, opts('Thứ chín')),
    ).rejects.toThrow();
    await guests[0]!.leave();
    await expect.poll(() => host.state.players.size).toBe(7);
    await server.sdk.joinById<StandaloneLoiDaiRoom>(
      host.roomId,
      opts('Thay thế'),
    );
    await expect.poll(() => host.state.players.size).toBe(8);
  });
  it('retains eight connected seats when browser pongs arrive nine seconds late', async () => {
    const host = await create(),
      peers: Peer[] = [host];
    for (let i = 1; i < 8; i++)
      peers.push(
        await server.sdk.joinById<StandaloneLoiDaiRoom>(
          host.roomId,
          opts('Heartbeat ' + i),
        ),
      );
    await expect.poll(() => host.state.players.size).toBe(8);
    const room = server.getRoomById<StandaloneLoiDaiRoom>(host.roomId);
    const guest = peers[1]!;
    guest.reconnection.enabled = false;
    const socket = room.clients.find(
      (c) => c.sessionId === guest.sessionId,
    )!.ref;
    // Fault injection at the real transport: discard pongs temporarily, then
    // restore its original handlers. No room state or membership is injected.
    const handlers = socket.listeners('pong');
    socket.removeAllListeners('pong');
    try {
      await new Promise((resolve) => setTimeout(resolve, 9500));
      for (const handler of handlers)
        socket.on('pong', handler as (...args: any[]) => void);
      await expect
        .poll(() => host.state.players.size, { timeout: 1000 })
        .toBe(8);
      expect(room.pvp.members.size).toBe(8);
      expect(guest.connection.isOpen).toBe(true);
      await expect
        .poll(() => (socket as unknown as { pingCount: number }).pingCount, {
          timeout: 4000,
        })
        .toBe(0);
      await guest.leave();
      await expect
        .poll(() => host.state.players.size, { timeout: 1000 })
        .toBe(7);
    } finally {
      socket.removeAllListeners('pong');
      for (const handler of handlers)
        socket.on('pong', handler as (...args: any[]) => void);
    }
  }, 18000);
  it('still terminates a persistently unresponsive fighter and forfeits the series', async () => {
    const host = await create(),
      guest = await server.sdk.joinById<StandaloneLoiDaiRoom>(
        host.roomId,
        opts('Im lặng'),
      );
    host.onMessage('combat-event', () => {});
    guest.onMessage('combat-event', () => {});
    guest.reconnection.enabled = false;
    await battle(host, guest);
    const room = server.getRoomById<StandaloneLoiDaiRoom>(host.roomId);
    const socket = room.clients.find(
      (c) => c.sessionId === guest.sessionId,
    )!.ref;
    const handlers = socket.listeners('pong');
    socket.removeAllListeners('pong');
    try {
      await expect
        .poll(() => room.pvp.result?.reason, { timeout: 19500, interval: 100 })
        .toBe('disconnect');
      expect(room.pvp.score.chinh).toBe(3);
      expect(room.pvp.members.has(guest.sessionId)).toBe(false);
      expect(guest.reconnection.enabled).toBe(false);
    } finally {
      for (const handler of handlers)
        socket.on('pong', handler as (...args: any[]) => void);
    }
  }, 26000);
  it('preserves every connected member across repeated full-room seat replacement', async () => {
    const host = await create(),
      peers: Peer[] = [host];
    for (let i = 1; i < 8; i++)
      peers.push(
        await server.sdk.joinById<StandaloneLoiDaiRoom>(
          host.roomId,
          opts('Ghế ' + i),
        ),
      );
    const room = server.getRoomById<StandaloneLoiDaiRoom>(host.roomId);
    room.pvp.definition.countdownTicks = 3;
    room.pvp.definition.resultTicks = 3;
    const lifecycle: unknown[] = [];
    const observe = (p: Peer) => {
      p.reconnection.enabled = false;
      p.onLeave((code) =>
        lifecycle.push({ id: p.sessionId, code, tick: room.pvp.tick }),
      );
    };
    peers.forEach(observe);
    for (let cycle = 0; cycle < 30; cycle++) {
      const index = 1 + (cycle % 7);
      if (cycle) {
        await peers[index]!.leave();
        await expect.poll(() => room.pvp.members.size).toBe(7);
        await expect.poll(() => room.pvp.phase).toBe('lobby');
        peers[index] = await server.sdk.joinById<StandaloneLoiDaiRoom>(
          host.roomId,
          opts('Trở lại ' + cycle),
        );
        observe(peers[index]!);
      }
      await expect.poll(() => view(host).members.length).toBe(8);
      const expected = [...room.pvp.members.keys()].sort();
      try {
        for (const peer of peers)
          await expect
            .poll(() => [...peer.state.players.keys()].sort())
            .toEqual(expected);
        expect([...room.state.players.keys()].sort()).toEqual(expected);
        expect(Array.from(room.clients, (c) => c.sessionId).sort()).toEqual(
          expected,
        );
        for (const peer of peers) await selected(peer);
        for (const [i, peer] of peers.entries())
          action(host, {
            action: 'assign',
            playerId: peer.sessionId,
            team: i % 2 ? 'ta' : 'chinh',
          });
        const maps = [
          'hong_moc',
          'rung_truc',
          'dia_nguc',
          'tuong_duong',
          'kiem_ho',
        ] as const;
        action(host, {
          action: 'settings',
          mapId: maps[cycle % 5]!,
          hazardsEnabled: false,
        });
        action(host, { action: 'start' });
        await expect.poll(() => view(host).phase).toBe('fighting');
        expect(room.pvp.snapshot().alive).toEqual({ chinh: 4, ta: 4 });
        for (const peer of peers)
          await expect
            .poll(() => [...peer.state.players.keys()].sort())
            .toEqual(expected);
      } catch (error) {
        throw new Error(
          JSON.stringify({
            cycle,
            lifecycle,
            members: expected,
            server: [...room.state.players.keys()],
            views: peers.map((p) => ({
              id: p.sessionId,
              players: [...p.state.players.keys()],
              members: view(p).members.map((m) => m.id),
            })),
          }),
          { cause: error },
        );
      }
    }
  }, 60000);
  it('freezes accepted input in countdown and rejects Defense/shop/build bypasses', async () => {
    const host = await create(),
      guest = await server.sdk.joinById<StandaloneLoiDaiRoom>(
        host.roomId,
        opts('Khách'),
      );
    await battle(host, guest);
    const room = server.getRoomById<StandaloneLoiDaiRoom>(host.roomId);
    const x = room.pvp.hero(host.sessionId)!.x;
    let reject = host.waitForMessage('command-rejected');
    host.send('input', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 20,
      kind: 'move',
      x: 1,
      y: 0,
    });
    expect((await reject).reason).toContain('khóa');
    expect(room.pvp.hero(host.sessionId)!.x).toBe(x);
    reject = host.waitForMessage('command-rejected');
    host.send('lobby-action', { action: 'confirm' });
    expect((await reject).reason).toContain('không dùng');
    reject = host.waitForMessage('command-rejected');
    host.send('merchant-action', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 21,
      revision: 0,
      action: 'use-potion',
      potionId: 'hp_small',
    });
    expect((await reject).reason).toContain('không dùng');
    reject = host.waitForMessage('command-rejected');
    host.send('build-action', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 22,
      revision: 0,
      action: 'upgrade-slot',
      slot: 0,
    });
    expect((await reject).reason).toContain('khóa');
    expect(room.pvp.hero(host.sessionId)!.level).toBe(30);
  });
  it('forfeits the whole series immediately on a dropped fighter, no reconnection reservation', async () => {
    const host = await create(),
      guest = await server.sdk.joinById<StandaloneLoiDaiRoom>(
        host.roomId,
        opts('Khách'),
      );
    await battle(host, guest);
    const room = server.getRoomById<StandaloneLoiDaiRoom>(host.roomId);
    guest.reconnection.enabled = false;
    guest.connection.close();
    await expect.poll(() => room.pvp.phase).toBe('series_over');
    expect(room.pvp.score.chinh).toBe(3);
    expect(room.pvp.result?.reason).toBe('disconnect');
    expect(room.pvp.members.has(guest.sessionId)).toBe(false);
  });
  it('closes every peer when the host leaves', async () => {
    const host = await create(),
      guest = await server.sdk.joinById<StandaloneLoiDaiRoom>(
        host.roomId,
        opts('Khách'),
      );
    await expect.poll(() => guest.state.players.size).toBe(2);
    const left = new Promise<number>((resolve) => guest.onLeave(resolve));
    guest.reconnection.enabled = false;
    await host.leave();
    expect(await left).toBe(4011);
  });
});
