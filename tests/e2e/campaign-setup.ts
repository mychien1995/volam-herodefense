import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { ColyseusTestServer } from '@colyseus/testing';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
import {
  qaSession,
  requireFreePorts,
  ownedQaServices,
  qaIdentityPlugin,
  verifyQaIdentity,
} from '../../tools/qa-session.mjs';
export default async function setup() {
  const s = qaSession({
    profile: 'campaign',
    serverPort: 2946,
    clientPort: 5546,
  });
  await requireFreePorts(s);
  const owned = ownedQaServices(),
    server = createGameServer();
  try {
    await server.listen(s.serverPort);
    owned.add(() => server.gracefullyShutdown(false));
    const authority = new ColyseusTestServer(server);
    const client = await preview({
      configFile: false,
      root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
      preview: { host: '127.0.0.1', port: s.clientPort, strictPort: true },
      plugins: [
        qaIdentityPlugin(s),
        {
          name: 'campaign-test-prerequisites',
          configurePreviewServer(vite) {
            vite.middlewares.use('/__campaign', (req, res) => {
              try {
                if (req.method !== 'POST') throw Error('POST required');
                const q = new URL(req.url ?? '/', 'http://local').searchParams;
                const room = authority.getRoomById<MatchRoom>(
                  q.get('room') ?? '',
                );
                if (
                  room.state.phase !== 'IN_GAME' ||
                  !room.simulation.base.campaign
                )
                  throw Error('Join a campaign room first');
                const m = room.simulation,
                  w = room.world,
                  op = q.get('op');
                if (op === 'wave') {
                  m.dongTa!.restartCampaign(w, m.arena.config);
                } else if (op === 'arm') {
                  // Only legal HP/position prerequisites: real server AI must deliver every death.
                  for (const id of m.membership.keys()) {
                    const h = m.hero(id)!,
                      z = m.zoneOf(id)!,
                      boss = z.world.creeps.get(m.campaignBossId(z) ?? '');
                    if (!boss || h.hp <= 0) continue;
                    h.hp = 1;
                    h.x = boss.x + 34;
                    h.y = boss.y;
                    h.moveX = h.moveY = 0;
                  }
                } else if (op === 'finisher') {
                  const h = m.hero(q.get('id') ?? '')!,
                    z = m.zoneOf(h.id)!,
                    boss = z.world.creeps.get(m.campaignBossId(z)!)!;
                  boss.hp = 1;
                  h.x = boss.x - 30;
                  h.y = boss.y;
                  h.fx = 1;
                  h.fy = 0;
                  h.hp = h.maxHp;
                } else throw Error('Unknown fixture');
                res.setHeader('content-type', 'application/json');
                res.end(JSON.stringify({ ok: true }));
              } catch (e) {
                res.statusCode = 400;
                res.end(String(e));
              }
            });
          },
        },
      ],
    });
    owned.add(() => client.close());
    await verifyQaIdentity(s.clientUrl + '/volam-build-endpoint.json', {
      serverUrl: s.serverUrl,
    });
    return () => owned.close();
  } catch (e) {
    await owned.close();
    throw e;
  }
}
