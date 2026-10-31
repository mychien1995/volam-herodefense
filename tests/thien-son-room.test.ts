import { afterAll, afterEach, beforeAll, it, expect } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { Client } from '@colyseus/sdk';
import { createGameServer } from '../apps/game-server/src/app.config.js';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';
import {
  MATCH_ROOM,
  PROTOCOL_VERSION,
  type LobbyState,
} from '@volam/game-protocol';
import { gainExperience, addCreep, type BuildChange } from '@volam/game-core';
import { m1Config, creepDungeon } from '@volam/game-data';
let server: ColyseusTestServer;
const client = new Client('http://localhost:2637');
const saved = process.env['VOLAM_DEV_LEGACY_SKILLS'];
beforeAll(async () => {
  delete process.env['VOLAM_DEV_LEGACY_SKILLS'];
  const app = createGameServer();
  await app.listen(2637);
  server = new ColyseusTestServer(app);
});
afterEach(async () => {
  await server.cleanup();
});
afterAll(async () => {
  await server?.shutdown();
  if (saved === undefined) delete process.env['VOLAM_DEV_LEGACY_SKILLS'];
  else process.env['VOLAM_DEV_LEGACY_SKILLS'] = saved;
});
const opts = (nickname: string) => ({
  nickname,
  protocolVersion: PROTOCOL_VERSION,
});
const create = (name: string) =>
  client.create<LobbyState>(MATCH_ROOM, opts(name));
type Peer = Awaited<ReturnType<typeof create>>;
async function start(a: Peer, b: Peer) {
  await expect.poll(() => a.state.players?.size).toBe(2);
  a.send('lobby-action', { action: 'start' });
  await expect.poll(() => a.state.phase).toBe('SCHOOL_SELECTION');
  a.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
  a.send('lobby-action', { action: 'confirm' });
  b.send('lobby-action', { action: 'select', schoolId: 'thien_son' });
  b.send('lobby-action', { action: 'confirm' });
  await expect.poll(() => b.state.phase).toBe('IN_GAME');
}
let seq = 0;
async function build(p: Peer, c: BuildChange) {
  const old = p.state.players.get(p.sessionId)!.build.revision;
  p.send('build-action', {
    ...c,
    sequence: ++seq,
    revision: old,
    protocolVersion: PROTOCOL_VERSION,
  });
  await expect
    .poll(() => p.state.players.get(p.sessionId)!.build.revision)
    .toBeGreaterThan(old);
}
it('synchronizes mixed-school shared combat, independent builds/rewards, dash position and zone cleanup with room isolation', async () => {
  seq = 0;
  const a = await create('Fire'),
    b = await client.joinById<LobbyState>(a.roomId, opts('Wind')),
    isolated = await create('Isolated');
  await start(a, b);
  const room = server.getRoomById<MatchRoom>(a.roomId),
    h = room.simulation.hero(b.sessionId)!;
  expect(h.basicId).toBe('thien_son_phien');
  expect(h.maxHp).toBe(135);
  expect(b.state.players.get(b.sessionId)!.build.available).toBe(1);
  await build(a, { action: 'loadout', ids: ['hoa_van_chuong', '', '', ''] });
  await build(a, { action: 'upgrade', skillId: 'hoa_van_chuong' });
  await build(b, {
    action: 'loadout',
    ids: ['luc_duong_chuong', 'luu_phong_bo', '', ''],
  });
  await build(b, { action: 'upgrade', skillId: 'luc_duong_chuong' });
  gainExperience(h, 60, m1Config);
  await expect.poll(() => b.state.players.get(b.sessionId)!.level).toBe(2);
  await build(b, { action: 'upgrade', skillId: 'luu_phong_bo' });
  const errors: unknown[] = [];
  b.onMessage('command-rejected', (m) => errors.push(m));
  b.send('build-action', {
    action: 'loadout',
    ids: ['hoa_van_chuong', '', '', ''],
    sequence: ++seq,
    revision: h.progression!.revision,
    protocolVersion: PROTOCOL_VERSION,
  });
  await expect.poll(() => errors.length).toBe(1);
  for (const p of [a, b]) {
    p.send('dungeon-action', {
      action: 'enter',
      access: 'shared',
      sequence: ++seq,
      protocolVersion: PROTOCOL_VERSION,
    });
  }
  await expect
    .poll(() => b.state.players.get(b.sessionId)!.zoneId)
    .not.toBe('arena');
  await expect
    .poll(() => a.state.players.get(b.sessionId)?.zoneId)
    .toBe(b.state.players.get(b.sessionId)!.zoneId);
  const zone = room.simulation.zoneOf(b.sessionId)!,
    fire = room.simulation.hero(a.sessionId)!;
  zone.world.creeps.clear();
  zone.world.random = () => 0.99;
  Object.assign(h, { x: 500, y: 400, fx: 1, fy: 0 });
  Object.assign(fire, { x: 480, y: 400, fx: 1, fy: 0 });
  const target = addCreep(
    zone.world,
    'shared_dummy',
    { x: 540, y: 400 },
    zone.config,
  );
  target.stats = {
    ...zone.config.creep,
    hp: 1000,
    speed: 0,
    defense: 0,
    detectionRange: 1,
  };
  target.hp = 1000;
  target.maxHp = 1000;
  const ea: Array<{ abilityId: string; kind: string }> = [],
    eb: typeof ea = [];
  a.onMessage('combat-event', (e) => ea.push(e));
  b.onMessage('combat-event', (e) => eb.push(e));
  for (const p of [a, b])
    p.send('input', {
      kind: 'cast',
      slot: 0,
      sequence: ++seq,
      protocolVersion: PROTOCOL_VERSION,
    });
  await expect
    .poll(() => ea.filter((e) => e.kind === 'hit').length, { timeout: 5000 })
    .toBeGreaterThanOrEqual(9);
  await expect
    .poll(() => eb.filter((e) => e.kind === 'hit').length)
    .toBe(ea.filter((e) => e.kind === 'hit').length);
  expect(ea.some((e) => e.abilityId === 'hoa_van_chuong')).toBe(true);
  expect(ea.some((e) => e.abilityId === 'luc_duong_chuong')).toBe(true);
  expect(a.state.creeps.get(zone.id + ':shared_dummy')!.hp).toBe(
    b.state.creeps.get(zone.id + ':shared_dummy')!.hp,
  );
  expect(
    a.state.players.get(a.sessionId)!.build.ranks.has('luc_duong_chuong'),
  ).toBe(false);
  expect(isolated.state.players.has(b.sessionId)).toBe(false);
  await expect.poll(() => zone.world.actions?.length ?? 0).toBe(0);
  const x = h.x;
  b.send('input', {
    kind: 'cast',
    slot: 1,
    sequence: ++seq,
    protocolVersion: PROTOCOL_VERSION,
  });
  await expect
    .poll(() => a.state.players.get(b.sessionId)!.x)
    .toBeGreaterThan(x + 100);
  await expect.poll(() => zone.world.actions?.length ?? 0).toBe(0);
  target.hp = 1;
  Object.assign(h, { x: target.x - 25, y: target.y, fx: 1, fy: 0 });
  b.send('input', {
    kind: 'basic',
    sequence: ++seq,
    protocolVersion: PROTOCOL_VERSION,
  });
  await expect.poll(() => b.state.players.get(b.sessionId)!.xp).toBe(90);
  await expect.poll(() => a.state.players.get(a.sessionId)!.xp).toBe(30);
  Object.assign(h, creepDungeon.exit);
  b.send('dungeon-action', {
    action: 'exit',
    sequence: ++seq,
    protocolVersion: PROTOCOL_VERSION,
  });
  await expect
    .poll(() => b.state.players.get(b.sessionId)!.zoneId)
    .toBe('arena');
  expect(h.statuses).toEqual([]);
  expect(zone.world.actions ?? []).toHaveLength(0);
  expect(b.state.players.get(b.sessionId)!.wCooldown).toBeGreaterThan(0);
  await a.leave();
  await b.leave();
  await isolated.leave();
});
