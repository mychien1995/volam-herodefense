// Isolated test process only. Fixture controls never ship with the game server/client.
import { preview } from 'vite';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { matchMaker } from '@colyseus/core';
import { gainExperience, addCreep } from '@volam/game-core';
import { m1Config } from '@volam/game-data';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';
process.env.NODE_ENV = 'development';
delete process.env.VOLAM_DEV_LEGACY_SKILLS;
delete process.env.VOLAM_DEV_SKILLS;
delete process.env.VOLAM_DEV_PRACTICE_CREEPS;
process.env.VOLAM_DEV_STATUE_HP = '100000';
process.env.VOLAM_INVASION_INTERVAL_SECONDS = '180';
const server = createGameServer();
await server.listen(2667);
const client = await preview({
  root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
  configFile: false,
  preview: { host: '127.0.0.1', port: 5207, strictPort: true },
});
const fixture = createServer(async (req, res) => {
  try {
    if (req.method !== 'POST' || req.url !== '/fixture') {
      res.writeHead(404).end();
      return;
    }
    let body = '';
    for await (const chunk of req) body += chunk;
    const input = JSON.parse(body),
      room = matchMaker.getLocalRoomById(input.roomId);
    const h = room?.simulation.hero(input.sessionId),
      z = room?.simulation.zoneOf(input.sessionId);
    if (!h || !z) throw Error('Unknown fixture hero');
    if (input.action === 'xp') gainExperience(h, input.amount, m1Config);
    else if (input.action === 'position') {
      h.x = input.x;
      h.y = input.y;
      h.moveX = h.moveY = 0;
    } else if (input.action === 'death') h.hp = 0;
    else if (input.action === 'target') {
      z.world.creeps.clear();
      z.world.random = () => 0.99;
      const c = addCreep(
        z.world,
        'fixture_target',
        { x: h.x + 35, y: h.y },
        z.config,
      );
      c.hp = c.maxHp = 1;
      c.stats = { ...z.config.creep, hp: 1, speed: 0, damage: 0 };
      h.fx = 1;
      h.fy = 0;
    } else throw Error('Unknown fixture action');
    res
      .writeHead(200, { 'Content-Type': 'application/json' })
      .end(JSON.stringify({ ok: true }));
  } catch (e) {
    res.writeHead(400).end(String(e));
  }
});
await new Promise((resolve) => fixture.listen(2668, '127.0.0.1', resolve));
if (!(await fetch('http://127.0.0.1:2667/health')).ok)
  throw Error('Game health failed');
process.on('message', async (message) => {
  if (message === 'stop') {
    await new Promise((resolve) => fixture.close(resolve));
    await client.close();
    await server.gracefullyShutdown(false);
    process.exit(0);
  }
});
process.send?.({ ready: true });
