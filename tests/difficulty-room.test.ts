import { beforeAll, afterAll, expect, it } from 'vitest';
import { startRoomTestServer } from './room-test-server.js';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';
import { MATCH_ROOM, PROTOCOL_VERSION } from '@volam/game-protocol';
import { campaignDefinition, dongTaDefinition } from '@volam/game-data';
let server: Awaited<ReturnType<typeof startRoomTestServer>>;
beforeAll(async () => {
  server = await startRoomTestServer();
});
afterAll(async () => {
  await server?.cleanup();
  await server?.shutdown();
});
it('creator chooses the room difficulty; peers cannot override it; default and separate hard rooms remain unchanged', async () => {
  const a = await server.sdk.create<MatchRoom>(MATCH_ROOM, {
    nickname: 'Easy',
    protocolVersion: PROTOCOL_VERSION,
    difficulty: 'easy',
  });
  const b = await server.sdk.joinById<MatchRoom>(a.roomId, {
    nickname: 'Peer',
    protocolVersion: PROTOCOL_VERSION,
    difficulty: 'hard',
  });
  const hard = await server.sdk.create<MatchRoom>(MATCH_ROOM, {
    nickname: 'Hard',
    protocolVersion: PROTOCOL_VERSION,
  });
  for (const peer of [a, b])
    await expect.poll(() => peer.state?.defense.difficulty).toBe('easy');
  await expect.poll(() => hard.state?.defense.difficulty).toBe('hard');
  const e = server.getRoomById<MatchRoom>(a.roomId),
    h = server.getRoomById<MatchRoom>(hard.roomId);
  expect(e.simulation.base.difficulty).toBe('easy');
  expect(e.simulation.base.campaign!.invasionXp).toEqual([
    110, 450, 750, 750, 750,
  ]);
  expect(e.simulation.arena.config.campaign!.invasionXp).toEqual([
    110, 450, 750, 750, 750,
  ]);
  expect(e.simulation.base.campaign).toEqual({
    ...campaignDefinition,
    invasionXp: [110, 450, 750, 750, 750],
  });
  expect(h.simulation.base.campaign).toEqual(campaignDefinition);
  expect(h.simulation.base.campaign!.invasionXp).toEqual([
    100, 300, 450, 650, 650,
  ]);
  expect(
    e.simulation.dongTa!.definition.abilities.lac_anh_normal.damage,
  ).toBeCloseTo(26 * 0.85);
  expect(h.simulation.dongTa!.definition.abilities).toEqual(
    dongTaDefinition.abilities,
  );
  await expect(
    server.sdk.create(MATCH_ROOM, {
      nickname: 'Bad',
      protocolVersion: PROTOCOL_VERSION,
      difficulty: 'impossible',
    }),
  ).rejects.toThrow();
  await a.leave();
  await b.leave();
  await hard.leave();
});
