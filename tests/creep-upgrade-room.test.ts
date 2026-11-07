import { beforeAll, afterAll, afterEach, it, expect } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { Client } from '@colyseus/sdk';
import {
  MATCH_ROOM,
  PROTOCOL_VERSION,
  type LobbyState,
} from '@volam/game-protocol';
import { createGameServer } from '../apps/game-server/src/app.config.js';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';
import { addCreep, stepCreepHazards } from '@volam/game-core';
let server: ColyseusTestServer;
const saved = process.env['VOLAM_DEV_CREEP_TEST'];
beforeAll(async () => {
  process.env['VOLAM_DEV_CREEP_TEST'] = '1';
  const game = createGameServer();
  await game.listen(2930);
  server = new ColyseusTestServer(game);
});
afterEach(async () => {
  await server.cleanup();
});
afterAll(async () => {
  await server.shutdown();
  if (saved === undefined) delete process.env['VOLAM_DEV_CREEP_TEST'];
  else process.env['VOLAM_DEV_CREEP_TEST'] = saved;
});
const client = new Client('http://127.0.0.1:2930');
const opts = (nickname: string, portalCount = 2) => ({
  nickname,
  protocolVersion: PROTOCOL_VERSION,
  portalCount,
});
it('rejects invalid create options and a joiner cannot replace the host gate setting', async () => {
  await expect(client.create(MATCH_ROOM, opts('Invalid', 5))).rejects.toThrow();
  const a = await client.create<LobbyState>(MATCH_ROOM, opts('Host', 4)),
    b = await client.joinById<LobbyState>(a.roomId, opts('Peer', 2));
  await expect.poll(() => b.state.defense?.portalCount).toBe(4);
  expect(a.state.defense.portalCount).toBe(4);
  expect(
    server.getRoomById<MatchRoom>(a.roomId).simulation.invasion!.definition
      .portalCount,
  ).toBe(4);
});
it('serializes real warned attacks and projectiles to both clients, while retaining server-owned damage', async () => {
  const a = await client.create<LobbyState>(MATCH_ROOM, opts('Host', 3)),
    b = await client.joinById<LobbyState>(a.roomId, opts('Peer', 4));
  for (const r of [a, b]) r.onMessage('*', () => {});
  a.send('lobby-action', { action: 'start' });
  await expect.poll(() => a.state.phase).toBe('SCHOOL_SELECTION');
  for (const r of [a, b]) {
    r.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
    r.send('lobby-action', { action: 'branch', basicId: 'cai_bang_bong' });
    r.send('lobby-action', { action: 'confirm' });
  }
  await expect.poll(() => a.state.phase).toBe('IN_GAME');
  const room = server.getRoomById<MatchRoom>(a.roomId),
    w = room.world,
    c = room.simulation.arena.config;
  room.simulation.invasion!.nextWaveTick = 100000;
  const hero = w.heroes.get(a.sessionId)!;
  Object.assign(hero, { x: 800, y: 616 });
  const enemy = addCreep(w, 'sdk_archer', { x: 720, y: 616 }, c);
  enemy.archetypeId = 'wave_04';
  enemy.stats = { ...c.creep, speed: 0 };
  stepCreepHazards(w, c);
  w.creepCombat!.actors.get(enemy.id)!.nextSpecial = w.tick;
  await expect
    .poll(() =>
      [...a.state.bossEffects.values()].some(
        (e) => e.abilityId === 'creep_wave_04_special',
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      [...b.state.bossEffects.values()].some(
        (e) => e.abilityId === 'creep_wave_04_special',
      ),
    )
    .toBe(true);
  expect(
    [...a.state.bossEffects.values()].find(
      (e) => e.abilityId === 'creep_wave_04_special',
    )!.kind,
  ).toBe('creep_projectile');
  expect(w.heroes.get(a.sessionId)!.hp).toBe(w.heroes.get(a.sessionId)!.maxHp); // explicit DEV invulnerability
  expect(a.state.defense.devCreepTest).toBe(true);
});
