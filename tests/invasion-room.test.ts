import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { m1Config } from '@volam/game-data';
import { MATCH_ROOM, PROTOCOL_VERSION } from '@volam/game-protocol';
import { startRoomTestServer } from './room-test-server.js';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';

let server: Awaited<ReturnType<typeof startRoomTestServer>>;
const previousLegacy = process.env['VOLAM_DEV_LEGACY_SKILLS'];
const previous = process.env['VOLAM_INVASION_INTERVAL_SECONDS'];
let client: Awaited<ReturnType<typeof startRoomTestServer>>['sdk'];
const options = (nickname: string) => ({
  nickname,
  protocolVersion: PROTOCOL_VERSION,
});
beforeAll(async () => {
  process.env['VOLAM_DEV_LEGACY_SKILLS'] = '1';
  process.env['VOLAM_INVASION_INTERVAL_SECONDS'] = '3';
  server = await startRoomTestServer();
  client = server.sdk;
});
afterEach(async () => {
  await server?.cleanup();
});
afterAll(async () => {
  if (previousLegacy === undefined)
    delete process.env['VOLAM_DEV_LEGACY_SKILLS'];
  else process.env['VOLAM_DEV_LEGACY_SKILLS'] = previousLegacy;
  await server?.shutdown();
  if (previous === undefined)
    delete process.env['VOLAM_INVASION_INTERVAL_SECONDS'];
  else process.env['VOLAM_INVASION_INTERVAL_SECONDS'] = previous;
});
type SDKRoom = Awaited<ReturnType<typeof create>>;
const create = (nickname: string) =>
  client.create<MatchRoom['state']>(MATCH_ROOM, options(nickname));
const join = (id: string, nickname: string) =>
  client.joinById<MatchRoom['state']>(id, options(nickname));
async function begin(a: SDKRoom, b?: SDKRoom) {
  await expect.poll(() => a.state.players?.size).toBe(b ? 2 : 1);
  a.send('lobby-action', { action: 'start' });
  await expect.poll(() => a.state.phase).toBe('SCHOOL_SELECTION');
  for (const c of b ? [a, b] : [a]) {
    c.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
    c.send('lobby-action', { action: 'confirm' });
  }
  await expect.poll(() => a.state.phase).toBe('IN_GAME');
}
function advance(room: MatchRoom, tick: number) {
  while (room.simulation.tick < tick) room.simulation.step();
}

it('publishes one match clock/warning across zones, filters enemies, and isolates another room', async () => {
  const a = await create('Arena'),
    b = await join(a.roomId, 'Dungeon'),
    c = await create('Separate');
  await begin(a, b);
  await begin(c);
  const room = server.getRoomById<MatchRoom>(a.roomId),
    other = server.getRoomById<MatchRoom>(c.roomId);
  b.send('dungeon-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 1,
    action: 'enter',
    access: 'private',
  });
  await expect
    .poll(() => b.state.players.get(b.sessionId)?.zoneId)
    .not.toBe('arena');
  const zone = b.state.players.get(b.sessionId)!.zoneId;
  advance(room, 31);
  await expect.poll(() => b.state.defense.noticeKind).toBe('warning');
  expect(b.state.defense.noticeLeadTicks).toBe(60);
  await expect
    .poll(() => a.state.defense.noticeId)
    .toBe(b.state.defense.noticeId);
  advance(room, 91);
  await expect.poll(() => a.state.defense.wave).toBe(1);
  await expect.poll(() => b.state.defense.wave).toBe(1);
  expect(b.state.players.get(b.sessionId)!.zoneId).toBe(zone);
  expect(
    [...a.state.creeps.values()].filter((e) => e.invasionWave === 1),
  ).toHaveLength(4); // A timed stream opens with two rows per gate, then continues.
  expect(a.state.defense.streamUntilTick).toBeGreaterThan(a.state.tick);
  expect(
    [...b.state.creeps.values()].every(
      (e) => e.zoneId === zone && e.invasionWave === 0,
    ),
  ).toBe(true);
  expect([...a.state.creeps.values()].every((e) => e.zoneId === 'arena')).toBe(
    true,
  );
  expect(other.simulation.invasion!.wave).toBe(0);
  room.world.statue!.hp = 1750;
  await expect.poll(() => a.state.defense.statueHp).toBe(1750);
  await expect.poll(() => b.state.defense.statueHp).toBe(1750);
  expect(other.world.statue!.hp).toBe(2000);
  advance(room, 181);
  await expect.poll(() => b.state.defense.wave).toBe(2);
  expect(
    [...a.state.creeps.values()].filter(
      (e) => e.invasionWave === 1 && e.hp > 0,
    ),
  ).toHaveLength(12); // t=90/128/166, two rows at each of two gates; player count was snapshotted at opening.
  expect(
    [...a.state.creeps.values()].filter((e) => e.invasionWave === 2),
  ).toHaveLength(4); // Wave two just opened with two rows per gate; the first stream remains active.
});

it('shares one enemy HP/death and one reward pool between two SDK attackers', async () => {
  const a = await create('First'),
    b = await join(a.roomId, 'Second');
  await begin(a, b);
  const room = server.getRoomById<MatchRoom>(a.roomId);
  advance(room, 91);
  // Both attackers must land a hit to test the split pool. A random first-hit
  // critical can kill this fixture early; crit mechanics have separate tests.
  room.world.random = () => 0.99;
  const enemy = [...room.world.creeps.values()].find((e) => e.invasion)!;
  // Server-owned fixture isolates one invader; commands still traverse the real SDK.
  room.world.creeps.clear();
  room.world.creeps.set(enemy.id, enemy);
  enemy.x = 900;
  enemy.y = 800;
  enemy.hp = 40;
  enemy.maxHp = 40;
  enemy.cooldown = 10000;
  const heroes = [a, b].map((c) => room.world.heroes.get(c.sessionId)!);
  for (const h of heroes) {
    h.x = 864;
    h.y = 800;
    h.fx = 1;
    h.fy = 0;
  }
  const before = heroes.map((h) => ({ xp: h.xp, gold: h.gold }));
  a.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 1,
    kind: 'basic',
  });
  await expect.poll(() => b.state.creeps.get(enemy.id)?.hp).toBeLessThan(40);
  expect(enemy.hp).toBeGreaterThan(0);
  await expect
    .poll(() => a.state.creeps.get(enemy.id)?.hp)
    .toBe(b.state.creeps.get(enemy.id)!.hp);
  b.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 1,
    kind: 'basic',
  });
  await expect.poll(() => a.state.creeps.get(enemy.id)?.hp).toBe(0);
  await expect.poll(() => b.state.creeps.get(enemy.id)?.hp).toBe(0);
  await expect
    .poll(() => a.state.players.get(a.sessionId)?.xp)
    .toBe(before[0]!.xp + 30);
  await expect
    .poll(() => b.state.players.get(b.sessionId)?.xp)
    .toBe(before[1]!.xp + 30);
  expect(heroes.reduce((n, h, i) => n + h.gold - before[i]!.gold, 0)).toBe(12);
  a.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 2,
    kind: 'basic',
  });
  expect(heroes.reduce((n, h, i) => n + h.gold - before[i]!.gold, 0)).toBe(12);
});

it('broadcasts death/respawn, then freezes the match at a single defeat', async () => {
  const a = await create('Defender'),
    b = await join(a.roomId, 'Witness');
  await begin(a, b);
  const room = server.getRoomById<MatchRoom>(a.roomId),
    h = room.world.heroes.get(a.sessionId)!;
  h.hp = 0;
  await expect.poll(() => b.state.players.get(a.sessionId)?.pose).toBe('death');
  const respawn = room.simulation.respawns.get(a.sessionId)!;
  advance(room, respawn + 1);
  await expect.poll(() => b.state.players.get(a.sessionId)?.hp).toBe(h.maxHp);
  expect(h.x).toBe(m1Config.spawn.x);
  expect(h.y).toBe(m1Config.spawn.y);
  room.world.statue!.hp = 0;
  await expect.poll(() => a.state.phase).toBe('DEFEAT');
  await expect.poll(() => b.state.phase).toBe('DEFEAT');
  await expect(
    client.joinById(a.roomId, options('Too late')),
  ).rejects.toThrow();
  const tick = a.state.tick,
    notice = a.state.defense.noticeId;
  expect(b.state.defense.statueHp).toBe(0);
  const rejected = a.waitForMessage('command-rejected');
  a.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 1,
    kind: 'move',
    x: 1,
    y: 0,
  });
  await rejected;
  // Let the room scheduler execute multiple callbacks after defeat.
  await new Promise((resolve) => setTimeout(resolve, 140));
  expect(a.state.tick).toBe(tick);
  expect(b.state.tick).toBe(tick);
  expect(a.state.defense.noticeId).toBe(notice);
});
