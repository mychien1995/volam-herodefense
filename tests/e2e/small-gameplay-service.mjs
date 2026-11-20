// Isolated test process only. Fixture controls never ship with the game server/client.
import { fileURLToPath } from 'node:url';
import { matchMaker } from '@colyseus/core';
import { gainExperience, addCreep } from '@volam/game-core';
import { m1Config } from '@volam/game-data';
process.env.NODE_ENV = 'development';
delete process.env.VOLAM_DEV_LEGACY_SKILLS;
delete process.env.VOLAM_DEV_SKILLS;
delete process.env.VOLAM_DEV_PRACTICE_CREEPS;
process.env.VOLAM_DEV_STATUE_HP = '100000';
process.env.VOLAM_INVASION_INTERVAL_SECONDS = '180';

import { qaSession } from '../../tools/qa-session.mjs';
import { startOwnedGameQa } from '../../tools/qa-game-services.mjs';
import { serveQaChild } from '../../tools/qa-children.mjs';
import { startQaHttpFixture } from '../../tools/qa-http-fixture.mjs';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
const session = qaSession({
  profile: 'small-gameplay',
  serverPort: 2667,
  clientPort: 5207,
});
await serveQaChild(session, PROTOCOL_VERSION, () =>
  startOwnedGameQa({
    session,
    clientMode: 'preview',
    client: {
      root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
      configFile: false,
      preview: { host: '127.0.0.1', port: 5207, strictPort: true },
    },
    configure: async (_server, owned) => {
      await startQaHttpFixture(
        owned,
        {
          port: 2668,
          runId: session.runId,
          serverUrl: session.serverUrl,
          protocolVersion: PROTOCOL_VERSION,
        },
        async (req, res) => {
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
            if (input.action === 'xp')
              gainExperience(h, input.amount, m1Config);
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
        },
      );
    },
  }),
);
