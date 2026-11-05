import { beforeAll, afterAll, afterEach, it, expect } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { Client, type Room } from '@colyseus/sdk';
import { createGameServer } from '../apps/game-server/src/app.config.js';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';
import { MATCH_ROOM, PROTOCOL_VERSION } from '@volam/game-protocol';
let server: ColyseusTestServer;
const client = new Client('http://127.0.0.1:2803');
const seq = new Map<string, number>();
const next = (r: Room<MatchRoom>) => {
  const n = (seq.get(r.sessionId) ?? 0) + 1;
  seq.set(r.sessionId, n);
  return n;
};
beforeAll(async () => {
  const game = createGameServer();
  await game.listen(2803);
  server = new ColyseusTestServer(game);
});
afterEach(async () => {
  await server.cleanup();
  seq.clear();
});
afterAll(async () => {
  await server.shutdown();
});
it('real SDK filters encounters and awards only personal materials to eligible participants', async () => {
  const a = await client.create<MatchRoom>(MATCH_ROOM, {
    nickname: 'Boss A',
    protocolVersion: PROTOCOL_VERSION,
  });
  const b = await client.joinById<MatchRoom>(a.roomId, {
    nickname: 'Boss B',
    protocolVersion: PROTOCOL_VERSION,
  });
  const c = await client.joinById<MatchRoom>(a.roomId, {
    nickname: 'Boss C',
    protocolVersion: PROTOCOL_VERSION,
  });
  const rooms = [a, b, c];
  for (const r of rooms)
    await expect.poll(() => r.state?.players.has(r.sessionId)).toBe(true);
  a.send('lobby-action', { action: 'start' });
  for (const r of rooms) {
    await expect.poll(() => r.state.phase).toBe('SCHOOL_SELECTION');
    r.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
    r.send('lobby-action', { action: 'branch', basicId: 'cai_bang_bong' });
    r.send('lobby-action', { action: 'confirm' });
  }
  for (const r of rooms) await expect.poll(() => r.state.phase).toBe('IN_GAME');
  for (const r of rooms)
    r.send('dungeon-action', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: next(r),
      action: 'enter',
      access: r === c ? 'private' : 'shared',
      destination: r === c ? 'forest' : 'kim_luan',
    });
  for (const r of rooms)
    await expect
      .poll(() => r.state.players.get(r.sessionId)?.zoneId)
      .toContain(r === c ? 'forest_' : 'kim_luan_');
  await expect
    .poll(() => a.state.dungeons.get('kim_luan_shared')?.encounter.length ?? 0)
    .toBeGreaterThan(0);
  expect(c.state.dungeons.has('kim_luan_shared')).toBe(false);
  expect(a.state.dungeons.has('kim_luan_private_' + c.sessionId)).toBe(false);
  const authority = server.getRoomById<MatchRoom>(a.roomId),
    z = authority.simulation.zoneOf(a.sessionId)!,
    encounter = z.kim!;
  z.world.creeps.get('hoac_do')!.hp = 0;
  expect(z.world.creeps.has('kim_luan_phap_vuong')).toBe(false);
  z.world.creeps.get('dat_nhi_ba')!.hp = 0;
  encounter.step(z.world, z.config);
  const boss = z.world.creeps.get('kim_luan_phap_vuong')!;
  boss.hp = 1;
  boss.hits[a.sessionId] = boss.hits[b.sessionId] = z.world.tick;
  const h = z.world.heroes.get(a.sessionId)!;
  h.x = boss.x - 24;
  h.y = boss.y;
  h.fx = 1;
  h.fy = 0;
  a.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: next(a),
    kind: 'basic',
  });
  const materials = (peer: typeof a) =>
    peer.state.players.get(peer.sessionId)!.inventory.materials.get('weapon');
  await expect.poll(() => materials(a)).toBe(1);
  expect(materials(b)).toBe(0);
  expect(materials(c)).toBe(0);
  expect(z.kim!.rewards.loot).toHaveLength(0);
  expect(h.inventory?.materials?.weapon).toBe(1);
  expect(h.bossItems ?? []).toHaveLength(0);
  const rejected = c.waitForMessage('command-rejected');
  c.send('boss-loot-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: next(c),
    lootId: 1,
    action: 'roll',
  });
  expect((await rejected).reason).toContain('cá nhân');
}, 30000);
