import { afterAll, afterEach, beforeAll, it, expect } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { Client } from '@colyseus/sdk';
import {
  MATCH_ROOM,
  PROTOCOL_VERSION,
  type LobbyState,
} from '@volam/game-protocol';
import { createGameServer } from '../apps/game-server/src/app.config.js';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';
let server: ColyseusTestServer;
const previousLegacy = process.env['VOLAM_DEV_LEGACY_SKILLS'];
const previous = process.env['VOLAM_DEV_SKILLS'];
const client = new Client('http://localhost:2626');
const opts = (nickname: string) => ({
  nickname,
  protocolVersion: PROTOCOL_VERSION,
});
const create = (name: string) =>
  client.create<LobbyState>(MATCH_ROOM, opts(name));
type Peer = Awaited<ReturnType<typeof create>>;
const previousPracticeCreeps = process.env['VOLAM_DEV_PRACTICE_CREEPS'];
beforeAll(async () => {
  process.env['VOLAM_DEV_PRACTICE_CREEPS'] = '1';
  process.env['VOLAM_DEV_LEGACY_SKILLS'] = '1';
  process.env['VOLAM_DEV_SKILLS'] = '1';
  const gameServer = createGameServer();
  await gameServer.listen(2626);
  server = new ColyseusTestServer(gameServer);
});
afterEach(async () => {
  await server.cleanup();
});
afterAll(async () => {
  if (previousPracticeCreeps === undefined)
    delete process.env['VOLAM_DEV_PRACTICE_CREEPS'];
  else process.env['VOLAM_DEV_PRACTICE_CREEPS'] = previousPracticeCreeps;
  if (previousLegacy === undefined)
    delete process.env['VOLAM_DEV_LEGACY_SKILLS'];
  else process.env['VOLAM_DEV_LEGACY_SKILLS'] = previousLegacy;
  await server?.shutdown();
  if (previous === undefined) delete process.env['VOLAM_DEV_SKILLS'];
  else process.env['VOLAM_DEV_SKILLS'] = previous;
});
async function start(a: Peer, b?: Peer) {
  await expect.poll(() => a.state.players?.size).toBe(b ? 2 : 1);
  a.send('lobby-action', { action: 'start' });
  await expect.poll(() => a.state.phase).toBe('SCHOOL_SELECTION');
  for (const p of b ? [a, b] : [a]) {
    p.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
    p.send('lobby-action', { action: 'confirm' });
  }
  await expect.poll(() => a.state.phase).toBe('IN_GAME');
}
async function equip(p: Peer, ids: string[], sequence = 1) {
  p.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence,
    kind: 'dev-loadout',
    ids,
  });
  await expect
    .poll(() => p.state.players.get(p.sessionId)?.qSkill)
    .toBe(ids[0]);
}
it('synchronizes four equipped skills and resource-safe simultaneous projectile casts', async () => {
  const a = await create('A'),
    b = await client.joinById<LobbyState>(a.roomId, opts('B'));
  await start(a, b);
  const room = server.getRoomById<MatchRoom>(a.roomId);
  await equip(a, [
    'hoa_van_chuong',
    'phi_long_tai_thien',
    'khang_long_huu_hoi',
    'cam_long_cong',
  ]);
  await equip(b, [
    'hoa_van_chuong',
    'hoanh_tao_bong',
    'truy_phong_bong',
    'thien_ha_vo_cau',
  ]);
  const enemy = room.world.creeps.get('creep_0')!;
  room.world.creeps.clear();
  room.world.creeps.set(enemy.id, enemy);
  Object.assign(enemy, { x: 1000, y: 900, hp: 1000, maxHp: 1000 });
  for (const p of [a, b])
    Object.assign(room.simulation.hero(p.sessionId)!, {
      x: 920,
      y: 900,
      fx: 1,
      fy: 0,
    });
  const seen: unknown[] = [];
  a.onMessage('combat-event', (e) => seen.push(e));
  for (const p of [a, b])
    for (let i = 2; i < 7; i++)
      p.send('input', {
        protocolVersion: PROTOCOL_VERSION,
        sequence: i,
        kind: 'cast',
        slot: 0,
      });
  await expect
    .poll(() => a.state.players.get(a.sessionId)?.qCooldown)
    .toBeGreaterThan(0);
  await expect.poll(() => b.state.creeps.get(enemy.id)?.hp).toBeLessThan(1000);
  expect(room.simulation.hero(a.sessionId)!.mana).toBeGreaterThanOrEqual(82);
  expect(room.simulation.hero(b.sessionId)!.mana).toBeGreaterThanOrEqual(82);
  expect(
    (seen as Array<{ kind: string }>).filter((e) => e.kind === 'cast'),
  ).toHaveLength(2);
  await expect
    .poll(() => a.state.creeps.get(enemy.id)?.hp)
    .toBe(b.state.creeps.get(enemy.id)!.hp);
});
it('cleans self buffs, queued effects and channels on zone travel without leaking private casts', async () => {
  const a = await create('A'),
    b = await client.joinById<LobbyState>(a.roomId, opts('B'));
  await start(a, b);
  const room = server.getRoomById<MatchRoom>(a.roomId);
  await equip(a, ['khang_long_huu_hoi', 'thien_ha_vo_cau', '', '']);
  a.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 2,
    kind: 'cast',
    slot: 0,
  });
  await expect
    .poll(() => a.state.players.get(a.sessionId)?.statuses)
    .toContain('crit_buff');
  a.send('dungeon-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 3,
    action: 'enter',
    access: 'private',
  });
  await expect
    .poll(() => a.state.players.get(a.sessionId)?.zoneId)
    .not.toBe('arena');
  expect(room.simulation.hero(a.sessionId)!.statuses).toEqual([]);
  expect(room.world.actions ?? []).toHaveLength(0);
  const observed: Array<{ sourceId: string; kind: string }> = [];
  b.onMessage('combat-event', (e) => observed.push(e));
  a.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 4,
    kind: 'cast',
    slot: 1,
  });
  await expect
    .poll(() => a.state.players.get(a.sessionId)?.statuses)
    .toContain('channel');
  expect(observed.some((e) => e.sourceId === a.sessionId)).toBe(false);
  const invalid = a.waitForMessage('command-rejected');
  a.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 5,
    kind: 'dev-loadout',
    ids: ['cam_long_cong', '', '', ''],
  });
  expect((await invalid).reason).toContain('đấu trường');
  const h = room.simulation.hero(a.sessionId)!;
  h.hp = 0;
  await expect
    .poll(() => room.simulation.zoneOf(a.sessionId)!.world.actions?.length ?? 0)
    .toBe(0);
});
it('rejects duplicate/unknown loadouts and disables development changes without a server flag', async () => {
  const a = await create('A');
  await start(a);
  for (const ids of [
    ['cam_long_cong', 'cam_long_cong', '', ''],
    ['unknown', '', '', ''],
    ['__proto__', '', '', ''],
    ['constructor', '', '', ''],
  ]) {
    const rejected = a.waitForMessage('command-rejected');
    a.send('input', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 1,
      kind: 'dev-loadout',
      ids,
    });
    expect((await rejected).reason).toContain('không hợp lệ hoặc bị trùng');
  }
  process.env['VOLAM_DEV_SKILLS'] = '0';
  try {
    const b = await create('Disabled');
    await start(b);
    expect(b.state.devSkillLoadout).toBe(false);
    const rejected = b.waitForMessage('command-rejected');
    b.send('input', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 1,
      kind: 'dev-loadout',
      ids: ['cam_long_cong', '', '', ''],
    });
    expect((await rejected).reason).toContain('đang tắt');
  } finally {
    process.env['VOLAM_DEV_SKILLS'] = '1';
  }
});
