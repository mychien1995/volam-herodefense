import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { Client } from '@colyseus/sdk';
import { MATCH_ROOM, PROTOCOL_VERSION } from '@volam/game-protocol';
import { createGameServer } from '../apps/game-server/src/app.config.js';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';
import type { TayDocView } from '@volam/game-core';
let server: ColyseusTestServer;
const previous = process.env['VOLAM_DEV_TAY_DOC'];
const client = new Client('http://localhost:2594');
const options = (nickname: string) => ({
  nickname,
  protocolVersion: PROTOCOL_VERSION,
});
const create = () =>
  client.create<MatchRoom['state']>(MATCH_ROOM, options('Tay QA'));
type SDKRoom = Awaited<ReturnType<typeof create>>;
const projection = (r: SDKRoom) =>
  JSON.parse(r.state.tayDoc?.get('arena')?.json ?? 'null') as TayDocView | null;
beforeAll(async () => {
  process.env['VOLAM_DEV_TAY_DOC'] = '1';
  const game = createGameServer();
  await game.listen(2594);
  server = new ColyseusTestServer(game);
});
afterEach(async () => {
  await server.cleanup();
});
afterAll(async () => {
  await server.shutdown();
  if (previous === undefined) delete process.env['VOLAM_DEV_TAY_DOC'];
  else process.env['VOLAM_DEV_TAY_DOC'] = previous;
});
async function start(a: SDKRoom, b: SDKRoom) {
  await expect.poll(() => a.state.players?.size).toBe(2);
  a.send('lobby-action', { action: 'start' });
  await expect.poll(() => a.state.phase).toBe('SCHOOL_SELECTION');
  for (const c of [a, b]) {
    c.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
    c.send('lobby-action', { action: 'branch', basicId: 'cai_bang_bong' });
    c.send('lobby-action', { action: 'confirm' });
  }
  await expect.poll(() => projection(a)?.phase).toBe('enter');
}
it('two SDK clients share authority; forged/replayed inputs cannot create damage/phase; projection is removed across zones', async () => {
  const a = await create(),
    b = await client.joinById<MatchRoom['state']>(a.roomId, options('Other'));
  await start(a, b);
  const room = server.getRoomById<MatchRoom>(a.roomId),
    e = room.simulation.tayDoc!,
    boss = room.world.creeps.get(e.bossId)!;
  const hp = boss.hp;
  a.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 100,
    kind: 'move',
    x: 0,
    y: 0,
  });
  await expect
    .poll(() => room.world.heroes.get(a.sessionId)?.lastSequence)
    .toBe(100);
  a.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 100,
    kind: 'basic',
  });
  await new Promise((r) => setTimeout(r, 150));
  expect(boss.hp).toBe(hp);
  expect(e.phase).toBe('enter');
  expect(e.pillars.size).toBe(0);
  await expect.poll(() => projection(b)?.bossId).toBe(e.bossId);
  expect(a.state.creeps.get(e.bossId)?.hp).toBe(
    b.state.creeps.get(e.bossId)?.hp,
  );
  let rejected = '';
  b.onMessage('command-rejected', (m) => {
    rejected = m.reason;
  });
  b.send('dungeon-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 1,
    action: 'enter',
    access: 'private',
  });
  await expect.poll(() => rejected).not.toBe('');
  expect(b.state.players.get(b.sessionId)?.zoneId).toBe('arena');
  expect(projection(b)?.bossId).toBe(e.bossId);
  a.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 101,
    kind: 'move',
    x: 0,
    y: 0,
    damage: 999999,
    phase: 'phase2',
    spawn: 'pillar',
  });
  await expect.poll(() => room.world.heroes.has(a.sessionId)).toBe(false);
  expect(boss.hp).toBe(hp);
  expect(e.pillars.size).toBe(0);
  // A real victory releases the common field before testing zone filtering.
  const h = room.world.heroes.get(b.sessionId)!;
  e.phase = 'phase1';
  e.cast = undefined;
  e.nextActionAt = Infinity;
  boss.x = 800;
  boss.y = 616;
  boss.hp = 1;
  boss.invulnerable = false;
  h.x = 770;
  h.y = 616;
  h.fx = 1;
  h.fy = 0;
  h.cooldown = 0;
  h.actionUntil = room.world.tick;
  h.statuses = [];
  b.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 2,
    kind: 'basic',
  });
  await expect.poll(() => e.phase).toBe('dead');
  b.send('dungeon-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 3,
    action: 'enter',
    access: 'private',
  });
  await expect
    .poll(() => b.state.players.get(b.sessionId)?.zoneId)
    .not.toBe('arena');
  await expect.poll(() => projection(b)).toBeNull();
  expect(b.state.creeps.has(e.bossId)).toBe(false);
});
it('A through SDK damages/destructs pillars; disconnect and dispose clear owned hazards and marks', async () => {
  const a = await create(),
    b = await client.joinById<MatchRoom['state']>(a.roomId, options('Other'));
  await start(a, b);
  const room = server.getRoomById<MatchRoom>(a.roomId),
    sim = room.simulation,
    w = room.world,
    e = sim.tayDoc!,
    h = w.heroes.get(a.sessionId)!,
    boss = w.creeps.get(e.bossId)!;
  e.phase = 'phase1';
  e.nextActionAt = Infinity;
  boss.x = 600;
  boss.y = 650;
  h.x = 720;
  h.y = 650;
  e.begin(w, sim.arena.config, 'hon_thien_phuc_long_chan', h);
  for (let i = 0; i < 28; i++) sim.step();
  expect(e.pillars.size).toBe(6);
  e.cast = undefined;
  e.nextActionAt = Infinity;
  const p = [...e.pillars.values()][0]!,
    pillar = w.creeps.get(p.id)!;
  h.x = p.x - 30;
  h.y = p.y;
  h.fx = 1;
  h.fy = 0;
  boss.x = 100;
  boss.y = 616;
  const gold = h.gold;
  let sequence = 1;
  for (let i = 0; i < 18 && pillar.hp > 0; i++) {
    a.send('input', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: sequence++,
      kind: 'basic',
    });
    await new Promise((r) => setTimeout(r, 35));
    for (let t = 0; t < 35; t++) sim.step();
  }
  expect(pillar.hp).toBeLessThanOrEqual(0);
  expect(h.gold).toBe(gold);
  e.marks.set(b.sessionId, {
    id: 'sdk-mark',
    targetId: b.sessionId,
    at: w.tick,
    until: w.tick + 100,
  });
  await b.leave();
  await expect.poll(() => e.marks.has(b.sessionId)).toBe(false);
  e.clear(w);
  expect(
    e.projectiles.size + e.pools.size + e.pillars.size + e.poisons.size,
  ).toBe(0);
  room.onDispose();
  expect(e.marks.size).toBe(0);
});
