import { beforeAll, afterAll, afterEach, it, expect } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { Client } from '@colyseus/sdk';
import { createGameServer } from '../apps/game-server/src/app.config.js';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';
import {
  MATCH_ROOM,
  PROTOCOL_VERSION,
  type LobbyState,
} from '@volam/game-protocol';
import { m1Config } from '@volam/game-data';
const keys = [
  'NODE_ENV',
  'VOLAM_DEV_LEGACY_SKILLS',
  'VOLAM_DEV_SKILLS',
  'VOLAM_DEV_PRACTICE_CREEPS',
] as const;
const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
let server: ColyseusTestServer;
const client = new Client('http://localhost:2960');
beforeAll(async () => {
  process.env['VOLAM_DEV_PRACTICE_CREEPS'] = '1';
  const app = createGameServer();
  await app.listen(2960);
  server = new ColyseusTestServer(app);
});
afterEach(async () => {
  await server.cleanup();
  for (const k of keys) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});
afterAll(async () => {
  await server.shutdown();
});
const options = (nickname: string) => ({
  nickname,
  protocolVersion: PROTOCOL_VERSION,
});
async function start() {
  const p = await client.create<LobbyState>(MATCH_ROOM, options('Review'));
  p.onMessage('combat-event', () => {});
  p.onMessage('command-rejected', () => {});
  await expect.poll(() => p.state.players?.size).toBe(1);
  p.send('lobby-action', { action: 'start' });
  await expect.poll(() => p.state.phase).toBe('SCHOOL_SELECTION');
  p.send('lobby-action', { action: 'select', schoolId: 'thieu_lam' });
  if (p.state.requiresBranch)
    p.send('lobby-action', { action: 'branch', basicId: 'thieu_lam_quyen' });
  p.send('lobby-action', { action: 'confirm' });
  await expect.poll(() => p.state.phase).toBe('IN_GAME');
  return p;
}
it('server-only review flags grant max level/ranks, permit real repeated casts and apply loadouts for initial and late heroes', async () => {
  Object.assign(process.env, {
    NODE_ENV: 'development',
    VOLAM_DEV_LEGACY_SKILLS: '1',
    VOLAM_DEV_SKILLS: '1',
    VOLAM_DEV_PRACTICE_CREEPS: '1',
  });
  const p = await start(),
    room = server.getRoomById<MatchRoom>(p.roomId),
    h = room.simulation.hero(p.sessionId)!;
  expect(room.devSkillLoadout).toBe(true);
  expect(h.level).toBe(30);
  const own = Object.values(m1Config.progression!.skills).filter(
    (s) => s.schoolId === 'thieu_lam',
  );
  for (const s of own) expect(h.progression!.ranks[s.id]).toBe(s.ranks.length);
  const late = await client.joinById<LobbyState>(p.roomId, options('Late'));
  late.onMessage('combat-event', () => {});
  late.onMessage('command-rejected', () => {});
  late.send('lobby-action', { action: 'select', schoolId: 'vo_dang' });
  late.send('lobby-action', { action: 'confirm' });
  await expect
    .poll(() => late.state.players.get(late.sessionId)?.level)
    .toBe(30);
  for (const s of Object.values(m1Config.progression!.skills).filter(
    (s) => s.schoolId === 'vo_dang',
  ))
    expect(room.simulation.hero(late.sessionId)!.progression!.ranks[s.id]).toBe(
      s.ranks.length,
    );
  let sequence = 1;
  p.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: sequence++,
    kind: 'dev-loadout',
    ids: ['la_han_quyen', '', '', ''],
  });
  await expect
    .poll(() => p.state.players.get(p.sessionId)?.qSkill)
    .toBe('la_han_quyen');
  p.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: sequence++,
    kind: 'select-basic',
    id: 'thieu_lam_dao',
  });
  await expect.poll(() => h.basicId).toBe('thieu_lam_dao');
  const castEvents: number[] = [];
  p.onMessage('combat-event', (e) => {
    if (e.kind === 'cast' && e.abilityId === 'la_han_quyen')
      castEvents.push(e.id);
  });
  for (let n = 1; n <= 2; n++) {
    await expect.poll(() => h.actionUntil <= room.world.tick).toBe(true);
    p.send('input', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: sequence++,
      kind: 'cast',
      slot: 0,
    });
    await expect.poll(() => castEvents.length).toBe(n);
    await expect
      .poll(() => p.state.players.get(p.sessionId)?.qCooldown)
      .toBe(0);
    await expect.poll(() => h.mana).toBe(h.maxMana);
    expect(h.abilityCooldowns).toEqual({});
  }
  const rejection = p.waitForMessage('command-rejected');
  p.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: sequence++,
    kind: 'dev-loadout',
    ids: ['luong_nghi_thu', '', '', ''],
  });
  expect((await rejection).reason).toContain('không hợp lệ');
  expect(h.skillIds).toEqual(['la_han_quyen', '', '', '']);
});
it.each([
  { env: 'development', legacy: '0', skills: '1' },
  { env: 'development', legacy: '1', skills: '0' },
  { env: 'production', legacy: '1', skills: '1' },
])(
  'does not grant review power for $env / legacy=$legacy / skills=$skills',
  async ({ env, legacy, skills }) => {
    Object.assign(process.env, {
      NODE_ENV: env,
      VOLAM_DEV_LEGACY_SKILLS: legacy,
      VOLAM_DEV_SKILLS: skills,
      VOLAM_DEV_PRACTICE_CREEPS: '1',
    });
    const p = await start(),
      room = server.getRoomById<MatchRoom>(p.roomId),
      h = room.simulation.hero(p.sessionId)!;
    expect(room.devSkillLoadout).toBe(false);
    expect(h.level).toBe(1);
    h.abilityCooldowns = { la_han_quyen: room.world.tick + 120 };
    h.skillCooldowns = [room.world.tick + 120, 0, 0, 0];
    h.mana = 1;
    await new Promise((r) => setTimeout(r, 90));
    expect(h.abilityCooldowns['la_han_quyen']).toBeGreaterThan(room.world.tick);
    expect(h.mana).toBeLessThan(h.maxMana);
    const rejection = p.waitForMessage('command-rejected');
    p.send('input', {
      protocolVersion: PROTOCOL_VERSION,
      sequence: 1,
      kind: 'dev-loadout',
      ids: ['la_han_quyen', '', '', ''],
    });
    expect((await rejection).reason).toContain('đang tắt');
  },
);
