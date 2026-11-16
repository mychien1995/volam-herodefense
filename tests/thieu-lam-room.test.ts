import { initializeProgression } from '@volam/game-core';
import { afterAll, afterEach, beforeAll, it, expect } from 'vitest';
import { startRoomTestServer } from './room-test-server.js';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';
import {
  MATCH_ROOM,
  PROTOCOL_VERSION,
  type LobbyState,
} from '@volam/game-protocol';
import { gainExperience, addCreep, type BuildChange } from '@volam/game-core';
import { m1Config } from '@volam/game-data';
let server: Awaited<ReturnType<typeof startRoomTestServer>>;
let client: Awaited<ReturnType<typeof startRoomTestServer>>['sdk'];
const saved = process.env['VOLAM_DEV_LEGACY_SKILLS'];
const previousProgression = process.env['VOLAM_TEST_LEGACY_PROGRESSION'];
beforeAll(async () => {
  process.env['VOLAM_TEST_LEGACY_PROGRESSION'] = '1';
  delete process.env['VOLAM_DEV_LEGACY_SKILLS'];
  server = await startRoomTestServer();
  client = server.sdk;
});
afterEach(async () => {
  await server?.cleanup();
});
afterAll(async () => {
  if (previousProgression === undefined)
    delete process.env['VOLAM_TEST_LEGACY_PROGRESSION'];
  else process.env['VOLAM_TEST_LEGACY_PROGRESSION'] = previousProgression;
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
it('four schools share authoritative combos, support, damage and rewards; zones/rooms and forged requests remain isolated', async () => {
  seq = 0;
  const peers = [await create('Gold')];
  for (const name of ['Fire', 'Wind', 'Yin Yang'])
    peers.push(await client.joinById<LobbyState>(peers[0]!.roomId, opts(name)));
  const [gold, fire, wind, yin] = peers as [Peer, Peer, Peer, Peer],
    isolate = await create('Isolate');
  await expect.poll(() => gold.state.players.size).toBe(4);
  gold.send('lobby-action', { action: 'start' });
  await expect.poll(() => gold.state.phase).toBe('SCHOOL_SELECTION');
  for (const [i, p] of peers.entries()) {
    p.send('lobby-action', {
      action: 'select',
      schoolId: ['thieu_lam', 'cai_bang', 'thien_son', 'vo_dang'][i],
    });
    p.send('lobby-action', { action: 'confirm' });
  }
  await expect.poll(() => gold.state.phase).toBe('IN_GAME');
  const room = server.getRoomById<MatchRoom>(gold.roomId),
    h = room.simulation.hero(gold.sessionId)!;
  for (const peer of peers)
    initializeProgression(
      room.simulation.hero(peer.sessionId)!,
      m1Config,
      'custom',
    );
  await expect
    .poll(() => gold.state.players.get(gold.sessionId)!.build.mode)
    .toBe('custom');
  expect(h.maxHp).toBe(220);
  expect(h.basicId).toBe('thieu_lam_quyen');
  expect(h.skillIds).toEqual(['', '', '', '']);
  for (const p of peers)
    gainExperience(room.simulation.hero(p.sessionId)!, 840, m1Config);
  await expect
    .poll(() => gold.state.players.get(gold.sessionId)!.level)
    .toBe(15);
  const builds = [
    [
      'la_han_quyen',
      'vi_da_quyen',
      'dai_luc_kim_cuong_chuong',
      'kim_quang_ho_tran',
    ],
    ['hoa_van_chuong', '', '', ''],
    ['luc_duong_chuong', '', '', ''],
    ['luong_nghi_thu', '', '', ''],
  ];
  for (const [i, p] of peers.entries()) {
    await build(p, { action: 'loadout', ids: builds[i]! });
    for (const id of builds[i]!.filter(Boolean))
      await build(p, { action: 'upgrade', skillId: id });
  }
  const refusals: unknown[] = [];
  gold.onMessage('command-rejected', (m) => refusals.push(m));
  gold.send('build-action', {
    action: 'loadout',
    ids: ['hoa_van_chuong', '', '', ''],
    sequence: ++seq,
    revision: h.progression!.revision,
    protocolVersion: PROTOCOL_VERSION,
  });
  await expect.poll(() => refusals.length).toBe(1);
  for (const p of peers)
    p.send('dungeon-action', {
      action: 'enter',
      access: 'shared',
      destination: 'hong_liet',
      sequence: ++seq,
      protocolVersion: PROTOCOL_VERSION,
    });
  for (const p of peers)
    await expect
      .poll(() => p.state.players.get(p.sessionId)!.zoneId)
      .not.toBe('arena');
  await expect
    .poll(() => room.simulation.zoneOf(gold.sessionId)!.world.heroes.size)
    .toBe(4);
  const zone = room.simulation.zoneOf(gold.sessionId)!;
  zone.world.creeps.clear();
  zone.world.random = () => 0.99;
  for (const [i, p] of peers.entries())
    Object.assign(room.simulation.hero(p.sessionId)!, {
      x: 500 - i * 10,
      y: 400,
      fx: 1,
      fy: 0,
    });
  const target = addCreep(
    zone.world,
    'gold_target',
    { x: 540, y: 400 },
    zone.config,
  );
  target.hp = target.maxHp = 2000;
  target.stats = {
    ...zone.config.creep,
    hp: 2000,
    speed: 0,
    defense: 0,
    detectionRange: 1,
  };
  const observed: Array<
    Array<{
      id: number;
      kind: string;
      sourceId: string;
      abilityId: string;
      stage?: string;
      damage: number;
    }>
  > = peers.map(() => []);
  peers.forEach((p, i) =>
    p.onMessage('combat-event', (e) => observed[i]!.push(e)),
  );
  cast(gold, 0);
  await expect
    .poll(
      () => JSON.parse(gold.state.players.get(gold.sessionId)!.combos)[0]?.step,
    )
    .toBe(1);
  // Vi Đà now detonates 189px ahead; keep the same target inside that footprint.
  h.x -= 126;
  cast(gold, 1);
  await expect
    .poll(
      () => JSON.parse(fire.state.players.get(gold.sessionId)!.combos)[0]?.step,
    )
    .toBe(2);
  h.x += 126;
  cast(gold, 2);
  await expect
    .poll(
      () =>
        observed[1]!.filter(
          (e) =>
            e.kind === 'hit' &&
            e.abilityId === 'dai_luc_kim_cuong_chuong' &&
            e.stage === 'empowered',
        ).length,
    )
    .toBe(1);
  await expect
    .poll(() => gold.state.players.get(gold.sessionId)!.combos)
    .toBe('[]');
  await expect
    .poll(() => gold.state.players.get(gold.sessionId)!.actionState)
    .toBe('');
  cast(gold, 3);
  await expect
    .poll(() => fire.state.players.get(fire.sessionId)!.build.stats.defense)
    .toBeGreaterThan(10);
  for (const p of [fire, wind, yin]) cast(p, 0);
  await expect.poll(() => Object.keys(target.hits).length).toBe(4);
  await expect
    .poll(
      () =>
        new Set(
          observed[3]!.filter((e) => e.kind === 'hit').map((e) => e.sourceId),
        ).size,
    )
    .toBe(4);
  expect(isolate.state.creeps.has(zone.id + ':gold_target')).toBe(false);
  const ids = observed[0]!.filter((e) => e.kind === 'hit').map((e) => e.id);
  await expect
    .poll(() => observed[2]!.filter((e) => e.kind === 'hit').map((e) => e.id))
    .toEqual(ids);
  // Server fixture weakens only this already-hit enemy; clients still deliver its killing hit.
  await expect
    .poll(() => yin.state.players.get(yin.sessionId)!.qCooldown, {
      timeout: 5000,
    })
    .toBe(0);
  target.hp = 1;
  cast(yin, 0);
  await expect.poll(() => target.hp).toBe(0);
  const reward = peers.map((p) => room.simulation.hero(p.sessionId)!.xp - 840);
  expect(reward.reduce((a, b) => a + b, 0)).toBe(zone.config.creep.xp);
  expect(reward.every((x) => x > 0)).toBe(true);
  const count = refusals.length;
  gold.send('build-action', {
    action: 'reset',
    sequence: ++seq,
    revision: h.progression!.revision,
    protocolVersion: PROTOCOL_VERSION,
  });
  await expect.poll(() => refusals.length).toBe(count + 1);
  // Leaving a zone cancels the caster-owned aura, including allied defensive linger.
  Object.assign(h, zone.dungeon!.exit);
  gold.send('dungeon-action', {
    action: 'exit',
    sequence: ++seq,
    protocolVersion: PROTOCOL_VERSION,
  });
  await expect
    .poll(() => gold.state.players.get(gold.sessionId)!.zoneId)
    .toBe('arena');
  expect(zone.world.supports ?? []).toHaveLength(0);
  expect(zone.world.combos ?? []).toHaveLength(0);
  await expect
    .poll(() => gold.state.players.get(gold.sessionId)!.statuses)
    .toBe('[]');
  await expect
    .poll(() => fire.state.players.get(fire.sessionId)!.statuses)
    .not.toContain('defense_buff');
  for (const p of peers) await p.leave();
  await isolate.leave();
}, 30000);
