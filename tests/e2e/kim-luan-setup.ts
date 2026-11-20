import { fileURLToPath } from 'node:url';
import { ColyseusTestServer } from '@colyseus/testing';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
import { kimAbilities, type KimAbility } from '@volam/game-core';
import { startOwnedGameQa } from './owned-game-setup.js';
import { qaWorkflowSession } from '../../tools/qa-session.mjs';
export default async function setup() {
  const session = qaWorkflowSession('browser', [
    '--config',
    'playwright.kim-luan.config.ts',
  ]);
  const { serverPort, clientPort } = session;
  return startOwnedGameQa({
    session,
    environment: {
      NODE_ENV: 'development',
      VOLAM_DEV_LEGACY_SKILLS: undefined,
      VOLAM_DEV_SKILLS: undefined,
      VOLAM_DEV_PRACTICE_CREEPS: undefined,
      VOLAM_INVASION_INTERVAL_SECONDS: undefined,
      VOLAM_DEV_STATUE_HP: undefined,
    },
    loadClientConfig: true,
    configure(server) {
      const authority = new ColyseusTestServer(server);
      return {
        root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
        cacheDir: '.cache/kim-luan-vite',
        server: {
          host: '127.0.0.1',
          port: clientPort,
          strictPort: true,
          hmr: false,
          watch: null,
        },
        define: {
          'import.meta.env.VITE_KIM_FRAME_TEST': 'true',
          'import.meta.env.VITE_SERVER_URL': JSON.stringify(
            `http://127.0.0.1:${serverPort}`,
          ),
        },
        plugins: [
          {
            name: 'test-only-kim-fixtures',
            configureServer(v) {
              v.middlewares.use('/__kim_fixture', (req, res) => {
                try {
                  if (req.method !== 'POST') throw Error('POST required');
                  const q = new URL(req.url ?? '/', 'http://127.0.0.1')
                    .searchParams;
                  const room = authority.getRoomById<MatchRoom>(
                      q.get('room') ?? '',
                    ),
                    z = room.simulation.zones.get('kim_luan_shared');
                  if (!z?.kim) throw Error('Kim test room required');
                  const e = z.kim,
                    w = z.world,
                    mode = q.get('mode');
                  if (mode === 'park') {
                    e.clear(w);
                    for (const h of w.heroes.values()) {
                      h.hp = h.maxHp = 1e8;
                      h.moveX = h.moveY = 0;
                      h.x = 640;
                      h.y = 600;
                    }
                  } else if (mode === 'boss') {
                    w.creeps.get('hoac_do')!.hp = 0;
                    w.creeps.get('dat_nhi_ba')!.hp = 0;
                    e.step(w, z.config);
                  } else if (mode === 'cast') {
                    const id = q.get('ability') as KimAbility;
                    if (!kimAbilities.includes(id))
                      throw Error('Invalid ability');
                    e.clear(w);
                    for (const b of w.creeps.values()) b.castAbilityId = '';
                    const actor = q.get('actor') ?? 'kim_luan_phap_vuong',
                      h = [...w.heroes.values()][0]!;
                    h.hp = h.maxHp;
                    h.x = 880;
                    h.y = 540;
                    h.moveX = h.moveY = 0;
                    e.begin(w, z.config, actor, id, h);
                  } else if (mode === 'enrage')
                    w.creeps.get('kim_luan_phap_vuong')!.hp = 1200;
                  else if (mode === 'exit') {
                    const h = [...w.heroes.values()][0]!;
                    h.hp = h.maxHp;
                    h.x = z.dungeon!.exit.x;
                    h.y = z.dungeon!.exit.y;
                  } else throw Error('Unknown fixture');
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ tick: w.tick, phase: e.phase }));
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
