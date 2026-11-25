import { fileURLToPath } from 'node:url';
import { ColyseusTestServer } from '@colyseus/testing';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
import { startOwnedGameQa } from './owned-game-setup.js';
import { qaWorkflowSession } from '../../tools/qa-session.mjs';
export default async function setup() {
  const session = qaWorkflowSession('browser', [
    '--config',
    'playwright.campaign.config.ts',
  ]);
  const s = session;
  return startOwnedGameQa({
    session,
    environment: {},
    configure(server) {
      const authority = new ColyseusTestServer(server);
      return {
        configFile: false,
        root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
        preview: { host: '127.0.0.1', port: s.clientPort, strictPort: true },
        plugins: [
          {
            name: 'campaign-test-prerequisites',
            configurePreviewServer(vite) {
              vite.middlewares.use('/__campaign', (req, res) => {
                try {
                  if (req.method !== 'POST') throw Error('POST required');
                  const q = new URL(req.url ?? '/', 'http://local')
                    .searchParams;
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
                      h.fx = -1;
                      h.fy = 0;
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
      };
    },
  });
}
