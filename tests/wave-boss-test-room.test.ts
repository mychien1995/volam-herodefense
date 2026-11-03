import { beforeAll, afterAll, it, expect } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { Client } from '@colyseus/sdk';
import { createGameServer } from '../apps/game-server/src/app.config.js';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';
import { MATCH_ROOM, PROTOCOL_VERSION } from '@volam/game-protocol';
let server: ColyseusTestServer;
const oldMode = process.env['VOLAM_DEV_WAVE_BOSSES'],
  oldNode = process.env['NODE_ENV'];
beforeAll(async () => {
  process.env['NODE_ENV'] = 'development';
  process.env['VOLAM_DEV_WAVE_BOSSES'] = '1';
  const app = createGameServer();
  await app.listen(2826);
  server = new ColyseusTestServer(app);
});
afterAll(async () => {
  await server.cleanup();
  await server.shutdown();
  for (const [key, value] of Object.entries({
    VOLAM_DEV_WAVE_BOSSES: oldMode,
    NODE_ENV: oldNode,
  }))
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
});
it('env-enabled real room waits for school confirmation, then synchronizes stage and dev rules to peers', async () => {
  const client = new Client('http://127.0.0.1:2826');
  const a = await client.create<MatchRoom>(MATCH_ROOM, {
      nickname: 'God A',
      protocolVersion: PROTOCOL_VERSION,
    }),
    b = await client.joinById<MatchRoom>(a.roomId, {
      nickname: 'God B',
      protocolVersion: PROTOCOL_VERSION,
    });
  for (const r of [a, b]) r.onMessage('combat-event', () => {});
  for (const r of [a, b])
    await expect.poll(() => r.state?.defense.devWaveBosses).toBe(true);
  const actual = server.getRoomById<MatchRoom>(a.roomId);
  expect(actual.world.tick).toBe(0);
  expect(actual.world.waveBossTest!.bossHitFraction).toBe(0.05);
  expect(actual.world.waveBossTest!.runSpeedMultiplier).toBe(3);
  a.send('lobby-action', { action: 'start' });
  for (const r of [a, b]) {
    await expect.poll(() => r.state.phase).toBe('SCHOOL_SELECTION');
    r.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
    r.send('lobby-action', { action: 'confirm' });
  }
  for (const r of [a, b])
    await expect.poll(() => r.state.phase).toBe('IN_GAME');
  for (const r of [a, b])
    await expect.poll(() => r.state.defense.devWaveBossStage).toBe('dong_ta');
  expect(actual.world.creeps.size).toBe(0);
  expect(actual.simulation.dongTa!.definition.restTicks).toBe(90);
  expect(actual.simulation.tayDoc!.definition.gateRest).toBe(150);
  await expect
    .poll(() => actual.world.creeps.has('dong_ta'), { timeout: 5000 })
    .toBe(true);
  expect([...actual.world.creeps.values()].some((c) => c.invasion)).toBe(false);
  expect(actual.world.heroes.get(a.sessionId)!.hp).toBe(
    actual.world.heroes.get(a.sessionId)!.maxHp,
  );
  await a.leave();
  await b.leave();
}, 10000);
