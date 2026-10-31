import { afterAll, afterEach, beforeAll, it, expect } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { Client } from '@colyseus/sdk';
import { createGameServer } from '../apps/game-server/src/app.config.js';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';
import {
  MATCH_ROOM,
  PROTOCOL_VERSION,
  buildActionSchema,
  type LobbyState,
} from '@volam/game-protocol';
import { gainExperience, type BuildChange } from '@volam/game-core';
import { m1Config, creepDungeon } from '@volam/game-data';
let server: ColyseusTestServer;
const client = new Client('http://localhost:2627');
const saved = {
  legacy: process.env['VOLAM_DEV_LEGACY_SKILLS'],
  skills: process.env['VOLAM_DEV_SKILLS'],
};
const previousPracticeCreeps = process.env['VOLAM_DEV_PRACTICE_CREEPS'];
beforeAll(async () => {
  process.env['VOLAM_DEV_PRACTICE_CREEPS'] = '1';
  delete process.env['VOLAM_DEV_LEGACY_SKILLS'];
  process.env['VOLAM_DEV_SKILLS'] = '1';
  const app = createGameServer();
  await app.listen(2627);
  server = new ColyseusTestServer(app);
});
afterEach(async () => {
  await server.cleanup();
});
afterAll(async () => {
  if (previousPracticeCreeps === undefined)
    delete process.env['VOLAM_DEV_PRACTICE_CREEPS'];
  else process.env['VOLAM_DEV_PRACTICE_CREEPS'] = previousPracticeCreeps;
  await server?.shutdown();
  for (const [k, v] of Object.entries({
    VOLAM_DEV_LEGACY_SKILLS: saved.legacy,
    VOLAM_DEV_SKILLS: saved.skills,
  }))
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
});
const opts = (nickname: string) => ({
  nickname,
  protocolVersion: PROTOCOL_VERSION,
});
const create = (name: string) =>
  client.create<LobbyState>(MATCH_ROOM, opts(name));
type Peer = Awaited<ReturnType<typeof create>>;
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
function send(
  p: Peer,
  change: BuildChange,
  sequence: number,
  revision = p.state.players.get(p.sessionId)!.build.revision,
) {
  p.send('build-action', {
    ...change,
    sequence,
    revision,
    protocolVersion: PROTOCOL_VERSION,
  });
}
async function commit(p: Peer, change: BuildChange, sequence: number) {
  const old = p.state.players.get(p.sessionId)!.build.revision;
  send(p, change, sequence, old);
  await expect
    .poll(() => p.state.players.get(p.sessionId)!.build.revision)
    .toBeGreaterThan(old);
}
it('replicates independent builds, point budgets, stats and real combat XP without changing another room', async () => {
  const a = await create('A'),
    b = await client.joinById<LobbyState>(a.roomId, opts('B')),
    c = await create('C');
  await start(a, b);
  await start(c);
  const authority = server.getRoomById<MatchRoom>(a.roomId),
    h = authority.simulation.hero(a.sessionId)!;
  expect(a.state.devSkillLoadout).toBe(false);
  expect(a.state.players.get(a.sessionId)!.build.available).toBe(1);
  await commit(
    a,
    { action: 'loadout', ids: ['hoa_van_chuong', 'hoanh_tao_bong', '', ''] },
    1,
  );
  await commit(a, { action: 'upgrade', skillId: 'hoa_van_chuong' }, 2);
  await commit(
    b,
    { action: 'loadout', ids: ['hoanh_tao_bong', '', '', ''] },
    1,
  );
  await commit(b, { action: 'upgrade', skillId: 'hoanh_tao_bong' }, 2);
  await expect
    .poll(() =>
      b.state.players.get(a.sessionId)!.build.ranks.get('hoa_van_chuong'),
    )
    .toBe(1);
  expect(
    a.state.players.get(b.sessionId)!.build.ranks.get('hoa_van_chuong'),
  ).toBeUndefined();
  expect(c.state.players.has(a.sessionId)).toBe(false);
  expect(c.state.players.get(c.sessionId)!.build.available).toBe(1);
  authority.world.random = () => 0.99;
  const enemy = authority.world.creeps.values().next().value!;
  authority.world.creeps.clear();
  authority.world.creeps.set(enemy.id, enemy);
  Object.assign(enemy, {
    x: 1000,
    y: 900,
    hp: 1,
    maxHp: 120,
    cooldown: 100000,
  });
  Object.assign(h, { x: 970, y: 900, fx: 1, fy: 0 });
  a.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 3,
    kind: 'basic',
  });
  await expect.poll(() => a.state.players.get(a.sessionId)!.level).toBe(2);
  expect(a.state.players.get(a.sessionId)!.xp).toBe(60);
  expect(a.state.players.get(a.sessionId)!.build.earned).toBe(2);
  expect(a.state.players.get(b.sessionId)!.level).toBe(1);
  expect(a.state.players.get(b.sessionId)!.xp).toBe(0);
  expect(a.state.players.get(a.sessionId)!.build.stats.maxHp).toBe(168);
});
it('rejects replay, stale concurrent upgrades, forged values, foreign IDs and point-budget spam', async () => {
  const a = await create('A');
  await start(a);
  await commit(
    a,
    { action: 'loadout', ids: ['hoa_van_chuong', 'hoanh_tao_bong', '', ''] },
    1,
  );
  const revision = a.state.players.get(a.sessionId)!.build.revision;
  const rejections: string[] = [];
  a.onMessage('command-rejected', (m) => rejections.push(m.reason));
  for (let i = 2; i < 12; i++)
    send(a, { action: 'upgrade', skillId: 'hoa_van_chuong' }, i, revision);
  await expect.poll(() => rejections.length).toBe(9);
  await expect
    .poll(() => a.state.players.get(a.sessionId)!.build.allocated)
    .toBe(1);
  await expect
    .poll(() => a.state.players.get(a.sessionId)!.build.available)
    .toBe(0);
  for (const ids of [
    ['__proto__', '', '', ''],
    ['la_han_quyen', '', '', ''],
    ['hoa_van_chuong', 'hoa_van_chuong', '', ''],
  ]) {
    const r = a.waitForMessage('command-rejected');
    send(a, { action: 'loadout', ids }, 20 + rejections.length);
    expect((await r).reason).toBeTruthy();
  }
  const replay = a.waitForMessage('command-rejected');
  send(a, { action: 'reset' }, 1);
  expect((await replay).reason).toContain('xử lý');
  expect(
    buildActionSchema.safeParse({
      protocolVersion: PROTOCOL_VERSION,
      sequence: 40,
      revision: 2,
      action: 'reset',
      skillPoints: 100,
      level: 30,
    }).success,
  ).toBe(false);
  const denial = a.waitForMessage('command-rejected');
  a.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 50,
    kind: 'dev-loadout',
    ids: ['hang_long_hoa_vu', '', '', ''],
  });
  expect((await denial).reason).toContain('disabled');
});
it('rejects all build changes inside a dungeon, preserves state on exit, then allows a free arena reset', async () => {
  const a = await create('A');
  await start(a);
  const authority = server.getRoomById<MatchRoom>(a.roomId),
    h = authority.simulation.hero(a.sessionId)!;
  gainExperience(h, 120, m1Config);
  await expect.poll(() => a.state.players.get(a.sessionId)!.level).toBe(3);
  await commit(
    a,
    { action: 'loadout', ids: ['hoa_van_chuong', '', '', ''] },
    1,
  );
  await commit(a, { action: 'upgrade', skillId: 'hoa_van_chuong' }, 2);
  await commit(a, { action: 'upgrade', skillId: 'hoa_van_chuong' }, 3);
  a.send('dungeon-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 4,
    action: 'enter',
    access: 'private',
  });
  await expect
    .poll(() => a.state.players.get(a.sessionId)!.zoneId)
    .not.toBe('arena');
  let seq = 5;
  for (const change of [
    { action: 'reset' },
    { action: 'loadout', ids: ['hoanh_tao_bong', '', '', ''] },
    { action: 'upgrade', skillId: 'hoa_van_chuong' },
    { action: 'basic', basicId: 'cai_bang_chuong' },
  ] as BuildChange[]) {
    const no = a.waitForMessage('command-rejected');
    send(a, change, seq++);
    expect((await no).reason).toContain('đấu trường');
  }
  expect(h.progression!.ranks['hoa_van_chuong']).toBe(2);
  expect(h.skillPoints).toBe(1);
  Object.assign(h, creepDungeon.exit);
  a.send('dungeon-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: seq++,
    action: 'exit',
  });
  await expect
    .poll(() => a.state.players.get(a.sessionId)!.zoneId)
    .toBe('arena');
  await commit(a, { action: 'reset' }, seq++);
  expect(h.progression!.ranks['hoa_van_chuong']).toBe(0);
  expect(h.skillPoints).toBe(3);
});
it('synchronizes30-point surplus builds and removes bonuses without resetting cooldowns or another player', async () => {
  const a = await create('A'),
    b = await client.joinById<LobbyState>(a.roomId, opts('B'));
  await start(a, b);
  const authority = server.getRoomById<MatchRoom>(a.roomId),
    h = authority.simulation.hero(a.sessionId)!;
  gainExperience(h, 10000, m1Config);
  await expect.poll(() => a.state.players.get(a.sessionId)!.level).toBe(30);
  const ids = [
    'hoa_van_chuong',
    'hoanh_tao_bong',
    'pha_giap_bong',
    'cam_long_cong',
  ];
  let seq = 1;
  await commit(a, { action: 'loadout', ids }, seq++);
  for (const id of ids)
    for (let i = 0; i < 4; i++)
      await commit(a, { action: 'upgrade', skillId: id }, seq++);
  await expect
    .poll(() => b.state.players.get(a.sessionId)!.build.surplus)
    .toBe(14);
  const power = a.state.players.get(a.sessionId)!.build.stats.attackPower;
  a.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: seq++,
    kind: 'cast',
    slot: 0,
  });
  await expect
    .poll(() => a.state.players.get(a.sessionId)!.qCooldown)
    .toBeGreaterThan(0);
  const expiry = h.abilityCooldowns!['hoa_van_chuong'];
  await commit(a, { action: 'reset' }, seq++);
  expect(h.abilityCooldowns!['hoa_van_chuong']).toBe(expiry);
  await expect
    .poll(() => b.state.players.get(a.sessionId)!.build.available)
    .toBe(30);
  expect(
    a.state.players.get(a.sessionId)!.build.stats.attackPower,
  ).toBeLessThan(power);
  expect(b.state.players.get(b.sessionId)!.build.earned).toBe(1);
});
it('ignores legacy and arbitrary loadout environment flags in production rooms', async () => {
  const old = process.env['NODE_ENV'];
  process.env['NODE_ENV'] = 'production';
  process.env['VOLAM_DEV_LEGACY_SKILLS'] = '1';
  try {
    const a = await create('Production');
    await start(a);
    expect(a.state.devSkillLoadout).toBe(false);
    expect(a.state.players.get(a.sessionId)!.build.enabled).toBe(true);
    expect(a.state.players.get(a.sessionId)!.build.available).toBe(1);
    expect(a.state.players.get(a.sessionId)!.qSkill).toBe('');
  } finally {
    if (old === undefined) delete process.env['NODE_ENV'];
    else process.env['NODE_ENV'] = old;
    delete process.env['VOLAM_DEV_LEGACY_SKILLS'];
  }
});
it('starts Thiếu Lâm with empty active slots and rejects foreign build requests', async () => {
  const a = await create('Future school');
  await expect.poll(() => a.state.players?.size).toBe(1);
  a.send('lobby-action', { action: 'start' });
  await expect.poll(() => a.state.phase).toBe('SCHOOL_SELECTION');
  a.send('lobby-action', { action: 'select', schoolId: 'thieu_lam' });
  a.send('lobby-action', { action: 'confirm' });
  await expect.poll(() => a.state.phase).toBe('IN_GAME');
  expect(a.state.players.get(a.sessionId)!.qSkill).toBe('');
  const refusal = a.waitForMessage('command-rejected');
  send(a, { action: 'loadout', ids: ['hoa_van_chuong', '', '', ''] }, 1);
  expect((await refusal).reason).toContain('không thuộc');
  const cast = a.waitForMessage('command-rejected');
  a.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 2,
    kind: 'cast',
    slot: 0,
  });
  expect((await cast).reason).toContain('chưa trang bị');
});
