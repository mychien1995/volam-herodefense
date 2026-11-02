import { beforeAll, afterAll, it, expect } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { Client } from '@colyseus/sdk';
import { createGameServer } from '../apps/game-server/src/app.config.js';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';
import { MATCH_ROOM, PROTOCOL_VERSION } from '@volam/game-protocol';
import { BacCaiEncounter, type BacCaiView } from '@volam/game-core';
import { bacCaiDefinition } from '@volam/game-data';
let server: ColyseusTestServer;
beforeAll(async () => {
  const game = createGameServer();
  await game.listen(2807);
  server = new ColyseusTestServer(game);
});
afterAll(async () => {
  await server.cleanup();
  await server.shutdown();
});
it('real SDK: late snapshots, no real-form leak, zone filtering, authoritative HP and disconnect tether cleanup', async () => {
  const client = new Client('http://127.0.0.1:2807'),
    opts = (nickname: string) =>
      ({ nickname, protocolVersion: PROTOCOL_VERSION }) as const;
  const a = await client.create<MatchRoom>(MATCH_ROOM, opts('Bắc A')),
    b = await client.joinById<MatchRoom>(a.roomId, opts('Bắc B'));
  for (const r of [a, b]) r.onMessage('combat-event', () => {});
  for (const r of [a, b])
    await expect.poll(() => r.state?.players.has(r.sessionId)).toBe(true);
  a.send('lobby-action', { action: 'start' });
  for (const r of [a, b]) {
    await expect.poll(() => r.state.phase).toBe('SCHOOL_SELECTION');
    r.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
    r.send('lobby-action', { action: 'confirm' });
  }
  for (const r of [a, b])
    await expect.poll(() => r.state.phase).toBe('IN_GAME');
  const authority = server.getRoomById<MatchRoom>(a.roomId),
    z = authority.simulation.arena,
    w = z.world,
    c = z.config;
  const d = structuredClone(bacCaiDefinition);
  d.preferences.voteEveryMs = 1e9;
  d.actionGapMs = 1e6;
  const e = new BacCaiEncounter(d);
  e.initialize(w, c);
  e.phase = 'combat';
  const boss = w.creeps.get(e.bossId)!;
  boss.x = 800;
  boss.y = 780;
  for (const h of w.heroes.values()) {
    h.x = 800;
    h.y = 850;
    h.hp = h.maxHp = 100000;
  }
  e.begin(w, c, 'spiral');
  const view = (r: typeof a) =>
    JSON.parse(
      r.state.bacCai.get('arena')?.snapshot || 'null',
    ) as BacCaiView | null;
  await expect
    .poll(() => view(a)?.effects.some((x) => x.kind === 'spiral'))
    .toBe(true);
  await expect
    .poll(() => view(b)?.effects.some((x) => x.kind === 'spiral'))
    .toBe(true);
  const late = await client.joinById<MatchRoom>(a.roomId, opts('Bắc Late'));
  late.onMessage('combat-event', () => {});
  await expect
    .poll(() => view(late)?.effects.some((x) => x.kind === 'spiral'))
    .toBe(true);
  late.send('lobby-action', { action: 'select', schoolId: 'vo_dang' });
  late.send('lobby-action', { action: 'confirm' });
  await expect
    .poll(() => late.state.players.get(late.sessionId)?.confirmed)
    .toBe(true);
  late.send('dungeon-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 1,
    action: 'enter',
    access: 'private',
    destination: 'forest',
  });
  await expect
    .poll(() => late.state.players.get(late.sessionId)?.zoneId)
    .toContain('forest_');
  await expect
    .poll(() => late.state.bacCai.get('arena')?.snapshot ?? '')
    .toBe('');
  e.cast = undefined;
  e.begin(w, c, 'clones');
  await expect.poll(() => view(a)?.forms.length).toBe(8);
  expect(a.state.creeps.has('bac_cai')).toBe(false);
  expect(
    [...a.state.creeps.keys()].some((id) => id.startsWith('bc_form_')),
  ).toBe(false);
  expect(view(a)?.boss).toBeNull();
  const publicState = JSON.stringify(a.state.toJSON());
  for (const key of ['realIndex', 'realSlot', 'isReal', 'cloneStart', 'slots'])
    expect(publicState).not.toContain(key);
  // Cancel only through the server fixture; ordinary clients have no encounter control API.
  e.clear(w);
  delete w.bacCai;
  w.creeps.delete('bac_cai');
  const pair = new BacCaiEncounter(d);
  pair.initialize(w, c);
  pair.phase = 'combat';
  const target = w.creeps.get('bac_cai')!;
  target.x = 800;
  target.y = 780;
  pair.begin(w, c, 'tether');
  await expect
    .poll(() => [...pair.effects.values()].some((x) => x.kind === 'tether'))
    .toBe(true);
  await b.leave();
  await expect.poll(() => w.heroes.has(b.sessionId)).toBe(false);
  expect(
    [...pair.effects.values()].filter((x) => x.kind === 'tether'),
  ).toHaveLength(0);
  const hp = w.heroes.get(a.sessionId)!.hp;
  await expect
    .poll(() => view(a)?.effects.some((x) => x.kind === 'tether'))
    .toBe(false);
  expect(w.heroes.get(a.sessionId)!.hp).toBeGreaterThanOrEqual(hp);
  pair.cast = undefined;
  target.hp = 1;
  const h = w.heroes.get(a.sessionId)!;
  h.x = target.x - 24;
  h.y = target.y;
  h.fx = 1;
  h.fy = 0;
  h.cooldown = 0;
  a.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: 1,
    kind: 'basic',
  });
  await expect.poll(() => view(a)?.phase).toBe('defeated');
  expect(target.hp).toBe(0);
  expect(w.statue!.hp).toBe(w.statue!.maxHp);
  expect(h.gold).toBe(d.reward.gold);
  expect(h.bossLoot ?? []).toHaveLength(0);
  await a.leave();
  await late.leave();
}, 15000);
