import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { boot, type ColyseusTestServer } from '@colyseus/testing';
import { CloseCode } from '@colyseus/core';
import { Client } from '@colyseus/sdk';
import {
  PROTOCOL_VERSION,
  MATCH_ROOM,
  connectionAckSchema,
  type JoinOptions,
} from '@volam/game-protocol';
import { createGameServer } from '../apps/game-server/src/app.config.js';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';

let server: ColyseusTestServer;
const client = new Client<ReturnType<typeof createGameServer>>(
  'http://localhost:2568',
);
const options = (nickname: string): JoinOptions => ({
  nickname,
  protocolVersion: PROTOCOL_VERSION,
});
beforeAll(async () => {
  server = await boot(createGameServer(), 2568);
});
afterEach(async () => {
  await server.cleanup();
});
afterAll(async () => {
  await server.shutdown();
});

describe('real Colyseus room + SDK clients', () => {
  it('exposes health readiness', async () => {
    const response = await server.http.get('/health');
    expect(response.data).toEqual({
      status: 'ok',
      milestone: 'M1',
      protocolVersion: PROTOCOL_VERSION,
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
    await b.waitForInitialState();
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
    await expect.poll(() => a.state.players.size).toBe(1);
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

describe('M1 authoritative room gameplay', () => {
  it('synchronizes normalized movement and input acknowledgements to two clients', async () => {
    const a = await client.create(MATCH_ROOM, options('First'));
    const b = await client.joinById<MatchRoom>(a.roomId, options('Observer'));
    await expect.poll(() => b.state.players?.size).toBe(2);
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
    await a.waitForInitialState();
    await other.waitForInitialState();
    const rejection = a.waitForMessage('command-rejected');
    a.send('input', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 1,
      kind: 'cast',
      slot: 3,
    });
    expect((await rejection).reason).toContain('not equipped');
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
