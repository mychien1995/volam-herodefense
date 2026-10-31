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
const client = new Client('http://localhost:2638');
const saved = process.env['VOLAM_DEV_LEGACY_SKILLS'];
beforeAll(async () => {
  delete process.env['VOLAM_DEV_LEGACY_SKILLS'];
  const app = createGameServer();
  await app.listen(2638);
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
let seq = 0;
async function build(p: Peer, c: BuildChange) {
  const revision = p.state.players.get(p.sessionId)!.build.revision;
  p.send('build-action', {
    ...c,
    sequence: ++seq,
    revision,
    protocolVersion: PROTOCOL_VERSION,
  });
  await expect
    .poll(() => p.state.players.get(p.sessionId)!.build.revision)
    .toBeGreaterThan(revision);
}
function cast(p: Peer, slot: number) {
  p.send('input', {
    kind: 'cast',
    slot,
    sequence: ++seq,
    protocolVersion: PROTOCOL_VERSION,
  });
}
it('three schools share dungeon/arena combat, authoritative shield/counter/refund/areas and rewards without room/zone leaks', async () => {
  seq = 0;
  const a = await create('Fire'),
    b = await client.joinById<LobbyState>(a.roomId, opts('Wind')),
    c = await client.joinById<LobbyState>(a.roomId, opts('Yin Yang')),
    isolate = await create('Isolate');
  await expect.poll(() => a.state.players.size).toBe(3);
  a.send('lobby-action', { action: 'start' });
  await expect.poll(() => a.state.phase).toBe('SCHOOL_SELECTION');
  for (const [p, schoolId] of [
    [a, 'cai_bang'],
    [b, 'thien_son'],
    [c, 'vo_dang'],
  ] as const) {
    p.send('lobby-action', { action: 'select', schoolId });
    p.send('lobby-action', { action: 'confirm' });
  }
  await expect.poll(() => c.state.phase).toBe('IN_GAME');
  const room = server.getRoomById<MatchRoom>(a.roomId),
    h = room.simulation.hero(c.sessionId)!;
  expect(h.maxMana).toBe(180);
  expect(h.basicId).toBe('vo_dang_quyen');
  expect(h.progression).toBeDefined();
  for (const p of [a, b, c])
    gainExperience(room.simulation.hero(p.sessionId)!, 840, m1Config);
  await expect.poll(() => c.state.players.get(c.sessionId)!.level).toBe(15);
  for (const [p, ids] of [
    [a, ['hoa_van_chuong', '', '', '']],
    [b, ['luc_duong_chuong', '', '', '']],
    [
      c,
      [
        'thai_cuc_than_cong',
        'toa_sat_bac_do',
        'bat_quai_kiem_tran',
        'duong_khi_kich',
      ],
    ],
  ] as const) {
    await build(p, { action: 'loadout', ids: [...ids] });
    for (const id of ids.filter(Boolean))
      await build(p, { action: 'upgrade', skillId: id });
  }
  const rejected: unknown[] = [];
  c.onMessage('command-rejected', (m) => rejected.push(m));
  c.send('build-action', {
    action: 'loadout',
    ids: ['hoa_van_chuong', '', '', ''],
    sequence: ++seq,
    revision: h.progression!.revision,
    protocolVersion: PROTOCOL_VERSION,
  });
  await expect.poll(() => rejected.length).toBe(1);
  c.send('skill-preview-action', { action: 'attacker' });
  await new Promise((r) => setTimeout(r, 80));
  expect(
    [...room.world.creeps.keys()].some((id) => id.startsWith('preview_')),
  ).toBe(false);
  for (const p of [a, b, c])
    p.send('dungeon-action', {
      action: 'enter',
      access: 'shared',
      sequence: ++seq,
      protocolVersion: PROTOCOL_VERSION,
    });
  await expect
    .poll(() => c.state.players.get(c.sessionId)!.zoneId)
    .not.toBe('arena');
  const zone = room.simulation.zoneOf(c.sessionId)!;
  await expect.poll(() => zone.world.heroes.size).toBe(3);
  zone.world.creeps.clear();
  zone.world.random = () => 0.99;
  const fire = room.simulation.hero(a.sessionId)!,
    wind = room.simulation.hero(b.sessionId)!;
  Object.assign(fire, { x: 460, y: 400, fx: 1, fy: 0 });
  Object.assign(wind, { x: 480, y: 400, fx: 1, fy: 0 });
  Object.assign(h, { x: 500, y: 400, fx: 1, fy: 0 });
  const dummy = addCreep(zone.world, 'target', { x: 540, y: 400 }, zone.config);
  dummy.hp = dummy.maxHp = 5000;
  dummy.stats = {
    ...zone.config.creep,
    hp: 5000,
    speed: 0,
    defense: 0,
    detectionRange: 1,
  };
  const events: Array<
    Array<{
      kind: string;
      abilityId: string;
      stage?: string;
      targetId: string;
      sourceId: string;
      damage: number;
    }>
  > = [[], [], []];
  [a, b, c].forEach((p, i) =>
    p.onMessage('combat-event', (e) => events[i]!.push(e)),
  );
  cast(c, 0);
  await expect
    .poll(() => c.state.players.get(c.sessionId)!.statuses)
    .toContain('mana_shield');
  cast(c, 1);
  cast(c, 2);
  cast(c, 3);
  cast(a, 0);
  cast(b, 0);
  await expect.poll(() => c.state.areas.size).toBe(1);
  await expect.poll(() => a.state.areas.size).toBe(1);
  expect(isolate.state.areas.size).toBe(0);
  const attacker = addCreep(
    zone.world,
    'attacker',
    { x: 524, y: 400 },
    zone.config,
  );
  attacker.hp = attacker.maxHp = 10000;
  attacker.stats = {
    ...zone.config.creep,
    hp: 10000,
    speed: 0,
    damage: 20,
    detectionRange: 60,
    attackRange: 40,
    attackCooldownTicks: 90,
    xp: 0,
    gold: 0,
  };
  await expect
    .poll(() => events[0]!.some((e) => e.stage === 'absorb'))
    .toBe(true);
  await expect
    .poll(() => events[1]!.some((e) => e.stage === 'counter'))
    .toBe(true);
  expect(h.hp).toBeLessThan(h.maxHp);
  await expect
    .poll(() => events[2]!.some((e) => e.stage === 'refund'))
    .toBe(true);
  expect(wind.statuses?.some((s) => s.kind === 'mana_shield')).toBe(false);
  await expect
    .poll(
      () =>
        events[0]!.filter(
          (e) => e.abilityId === 'bat_quai_kiem_tran' && e.kind === 'hit',
        ).length,
      { timeout: 7000 },
    )
    .toBeGreaterThanOrEqual(4);
  for (const ability of [
    'hoa_van_chuong',
    'luc_duong_chuong',
    'bat_quai_kiem_tran',
  ])
    expect(
      events.every((es) =>
        es.some((e) => e.abilityId === ability && e.kind === 'hit'),
      ),
    ).toBe(true);
  await expect
    .poll(() => a.state.creeps.get(zone.id + ':target')?.hp)
    .toBe(c.state.creeps.get(zone.id + ':target')?.hp);
  expect(isolate.state.players.has(c.sessionId)).toBe(false);
  expect(c.state.maxPlayers).toBe(6);
  zone.world.creeps.delete('attacker');
  await expect.poll(() => zone.world.actions?.length ?? 0).toBe(0);
  dummy.hp = 1;
  Object.assign(h, { x: dummy.x - 25, y: dummy.y, fx: 1, fy: 0 });
  c.send('input', {
    kind: 'basic',
    sequence: ++seq,
    protocolVersion: PROTOCOL_VERSION,
  });
  await expect.poll(() => dummy.hp).toBe(0);
  const xp = [fire.xp, wind.xp, h.xp],
    gold = [fire.gold, wind.gold, h.gold];
  expect(xp.reduce((x, y) => x + y, 0)).toBe(2520 + zone.config.creep.xp);
  expect(gold.reduce((x, y) => x + y, 0)).toBe(zone.config.creep.gold);
  await new Promise((r) => setTimeout(r, 100));
  expect([fire.xp, wind.xp, h.xp]).toEqual(xp);
  Object.assign(h, creepDungeon.exit);
  c.send('dungeon-action', {
    action: 'exit',
    sequence: ++seq,
    protocolVersion: PROTOCOL_VERSION,
  });
  await expect
    .poll(() => c.state.players.get(c.sessionId)!.zoneId)
    .toBe('arena');
  expect(h.statuses).toEqual([]);
  expect(zone.world.areas ?? []).toHaveLength(0);
  await expect.poll(() => a.state.areas.size).toBe(0);
  expect(c.state.areas.size).toBe(0);
  // The same real ranked formation works in arena defense; target is an invasion entity.
  await build(c, {
    action: 'loadout',
    ids: ['thai_cuc_tran', 'nhan_kiem_hop_nhat', '', ''],
  });
  await build(c, { action: 'upgrade', skillId: 'thai_cuc_tran' });
  await build(c, { action: 'upgrade', skillId: 'nhan_kiem_hop_nhat' });
  const inv = addCreep(
    room.world,
    'invasion_probe',
    { x: h.x + 40, y: h.y },
    m1Config,
  );
  inv.hp = inv.maxHp = 1000;
  inv.stats = { ...m1Config.creep, hp: 1000, speed: 0, detectionRange: 1 };
  inv.invasion = {
    wave: 1,
    lane: 'west',
    targetId: '',
    chaseOrigin: { x: inv.x, y: inv.y },
    reacquireAt: 99999,
    chaseRange: 200,
    aggroRestTicks: 90,
  };
  cast(c, 0);
  cast(c, 1);
  await expect.poll(() => inv.hp).toBeLessThan(1000);
  await expect.poll(() => c.state.areas.size).toBe(1);
  expect(a.state.areas.size).toBe(0); // other peers remain in dungeon
  await c.leave();
  await expect.poll(() => room.world.areas?.length ?? 0).toBe(0);
  await a.leave();
  await b.leave();
  await isolate.leave();
});
