import {
  beforeAll,
  afterAll,
  afterEach,
  describe,
  it,
  expect,
  vi,
} from 'vitest';
import type { Room } from '@colyseus/sdk';
import { startRoomTestServer } from './room-test-server.js';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';
import {
  MATCH_ROOM,
  PROTOCOL_VERSION,
  type DungeonAction,
} from '@volam/game-protocol';
import { creepDungeon, hongLietDungeon } from '@volam/game-data';
let server: Awaited<ReturnType<typeof startRoomTestServer>>;
let client: Awaited<ReturnType<typeof startRoomTestServer>>['sdk'];
const sequence = new Map<string, number>();
type Request<T = DungeonAction> = T extends DungeonAction
  ? Omit<T, 'protocolVersion' | 'sequence'>
  : never;
const send = (r: Room<MatchRoom>, action: Request) => {
  const next = (sequence.get(r.sessionId) ?? 0) + 1;
  sequence.set(r.sessionId, next);
  r.send('dungeon-action', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: next,
    ...action,
  });
};
beforeAll(async () => {
  server = await startRoomTestServer();
  client = server.sdk;
});
afterEach(async () => {
  await server?.cleanup();
  sequence.clear();
  vi.unstubAllEnvs();
});
afterAll(async () => {
  await server?.shutdown();
});
async function join() {
  const a = await client.create<MatchRoom>(MATCH_ROOM, {
    nickname: 'A',
    protocolVersion: PROTOCOL_VERSION,
  });
  const b = await client.joinById<MatchRoom>(a.roomId, {
    nickname: 'B',
    protocolVersion: PROTOCOL_VERSION,
  });
  await expect.poll(() => a.state?.players?.size).toBe(2);
  a.send('lobby-action', { action: 'start' });
  for (const r of [a, b]) {
    await expect.poll(() => r.state.phase).toBe('SCHOOL_SELECTION');
    r.send('lobby-action', { action: 'select', schoolId: 'thieu_lam' });
    r.send('lobby-action', { action: 'branch', basicId: 'thieu_lam_quyen' });
    r.send('lobby-action', { action: 'confirm' });
  }
  await expect.poll(() => b.state.phase).toBe('IN_GAME');
  return { a, b, authority: server.getRoomById<MatchRoom>(a.roomId) };
}
describe('M3D party SDK/schema integration', () => {
  it('enforces access, sends recipient invitations, replicates exterior pause and resumes on exit', async () => {
    const { a, b, authority } = await join();
    for (const r of [a, b])
      send(r, { action: 'enter', access: 'shared', destination: 'forest' });
    await expect
      .poll(() => b.state.players.get(b.sessionId)?.zoneId)
      .toBe('forest_private_' + b.sessionId);
    expect(authority.simulation.zoneOf(a.sessionId)).not.toBe(
      authority.simulation.zoneOf(b.sessionId),
    );
    for (const r of [a, b]) {
      Object.assign(authority.simulation.hero(r.sessionId)!, creepDungeon.exit);
      send(r, { action: 'exit' });
      await expect
        .poll(() => r.state.players.get(r.sessionId)?.zoneId)
        .toBe('arena');
    }
    send(a, {
      action: 'enter',
      access: 'private',
      destination: 'hong_liet',
      summonHelp: true,
    });
    await expect
      .poll(() => a.state.players.get(a.sessionId)?.zoneId)
      .toBe('hong_liet_shared');
    await expect
      .poll(
        () =>
          JSON.parse(b.state.players.get(b.sessionId)?.bossInvitation || 'null')
            ?.id,
      )
      .toBeGreaterThan(0);
    const invitation = JSON.parse(
      b.state.players.get(b.sessionId)!.bossInvitation,
    );
    expect(invitation.recipientId).toBe(b.sessionId);
    expect(invitation.expiresAtMs - Date.now()).toBeGreaterThan(28_000);
    send(b, {
      action: 'reply-invitation',
      invitationId: invitation.id,
      accept: true,
    });
    await expect
      .poll(() => b.state.players.get(b.sessionId)?.zoneId)
      .toBe('hong_liet_shared');
    await expect.poll(() => a.state.defense.paused).toBe(true);
    const tick = a.state.tick,
      statue = a.state.defense.statueHp;
    await new Promise((r) => setTimeout(r, 160));
    expect(a.state.tick).toBe(tick);
    expect(a.state.defense.statueHp).toBe(statue);
    expect(
      authority.simulation.zoneOf(a.sessionId)!.world.tick,
    ).toBeGreaterThan(0);
    send(a, { action: 'summon-help' });
    await new Promise((r) => setTimeout(r, 70));
    expect(
      JSON.parse(b.state.players.get(b.sessionId)!.bossInvitation),
    ).toBeNull();
    Object.assign(
      authority.simulation.hero(b.sessionId)!,
      hongLietDungeon.exit,
    );
    send(b, { action: 'exit' });
    await expect.poll(() => a.state.defense.paused).toBe(false);
    await expect.poll(() => a.state.tick).toBeGreaterThan(tick);
  });
  it('keeps elimination across real transport reconnect and returns the same hero to the main arena', async () => {
    vi.stubEnv('VOLAM_TEST_LEGACY_PROGRESSION', '1');
    const { a, b, authority } = await join();
    send(a, { action: 'enter', destination: 'hong_liet' });
    await expect
      .poll(() => a.state.players.get(a.sessionId)?.zoneId)
      .toBe('hong_liet_shared');
    const m = authority.simulation,
      h = m.hero(a.sessionId)!,
      zone = m.zoneOf(a.sessionId)!;
    h.hp = 0;
    m.step();
    expect(m.party.life(zone, a.sessionId).revivalUsed).toBe(true);
    await expect
      .poll(() => a.state.players.get(a.sessionId)?.bossRevivalUsed)
      .toBe(true);
    for (let i = 0; i < 150; i++) m.step();
    expect(h.hp).toBe(h.maxHp);
    h.hp = 0;
    m.step();
    await expect
      .poll(() => a.state.players.get(a.sessionId)?.bossSpectator)
      .toBe(true);
    const token = a.reconnectionToken,
      oldId = a.sessionId;
    a.reconnection.enabled = false;
    a.connection.close();
    await expect
      .poll(() => authority.state.players.get(oldId)?.connected)
      .toBe(false);
    expect(zone.world.heroes.has(oldId)).toBe(false);
    const again = await client.reconnect<MatchRoom>(token);
    await expect
      .poll(() => again.state.players.get(oldId)?.connected)
      .toBe(true);
    expect(again.sessionId).toBe(oldId);
    expect(again.state.players.get(oldId)!.zoneId).toBe('arena');
    send(again, { action: 'enter', destination: 'hong_liet' });
    await expect
      .poll(() => again.state.players.get(oldId)?.zoneId)
      .toBe('hong_liet_shared');
    await expect
      .poll(() => again.state.players.get(oldId)?.bossSpectator)
      .toBe(true);
    expect(m.party.life(zone, oldId)).toEqual({
      revivalUsed: true,
      eliminated: true,
    });
    expect(b.state.players.has(oldId)).toBe(true);
    await again.leave();
  });
});
