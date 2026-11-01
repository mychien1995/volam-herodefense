import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createServer as netServer } from 'node:net';
import { ColyseusTestServer } from '@colyseus/testing';
import { gainExperience, CHU_BOSS_ID, type ChuPhase } from '@volam/game-core';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
async function free(port: number) {
  const s = netServer();
  await new Promise<void>((resolve, reject) =>
    s.once('error', reject).listen(port, '127.0.0.1', resolve),
  );
  await new Promise<void>((r) => s.close(() => r()));
}
export default async function setup() {
  await free(2799);
  await free(5399);
  process.env['NODE_ENV'] = 'development';
  const server = createGameServer();
  await server.listen(2799);
  const authority = new ColyseusTestServer(server);
  const vite = await createServer({
    root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
    cacheDir: fileURLToPath(new URL('../../.cache/vite-chu', import.meta.url)),
    configFile: false,
    server: {
      host: '127.0.0.1',
      port: 5399,
      strictPort: true,
      watch: null,
      hmr: false,
    },
    define: {
      'import.meta.env.VITE_SERVER_URL': JSON.stringify(
        'http://127.0.0.1:2799',
      ),
    },
    plugins: [
      {
        name: 'test-only-chu-authority',
        configureServer(v) {
          v.middlewares.use('/__chu', (req, res) => {
            try {
              if (req.method !== 'POST') throw Error('POST required');
              const q = new URL(req.url ?? '/', 'http://127.0.0.1')
                .searchParams;
              const room = authority.getRoomById<MatchRoom>(
                q.get('room') ?? '',
              );
              const z = room.simulation.zones.get(
                q.get('zone') ?? 'chu_ba_thong_shared',
              );
              if (!z?.world.chu) throw Error('Boss dungeon required');
              const s = z.world.chu,
                b = z.world.creeps.get(CHU_BOSS_ID)!;
              const mode = q.get('mode');
              if (mode === 'park' || mode === 'phase' || mode === 'combat') {
                const phase = (
                  mode === 'phase' ? q.get('phase') : 'idle'
                ) as ChuPhase;
                const i = s.definition.phases.findIndex((p) => p.id === phase);
                if (i < 0) throw Error('Unknown phase');
                b.x = 640;
                b.y = 300;
                s.phaseIndex =
                  (i + s.definition.phases.length - 1) %
                  s.definition.phases.length;
                s.until = z.world.tick;
                s.missiles = [];
                s.hands = [];
                delete s.trap;
                if (mode === 'park') {
                  s.phase = 'idle';
                  s.phaseIndex = 0;
                  s.started = z.world.tick;
                  s.until = z.world.tick + 100000;
                }
                for (const [j, h] of [...z.world.heroes.values()].entries()) {
                  if (mode === 'combat') {
                    gainExperience(h, 100000, z.config);
                    const angle = (2 * Math.PI * j) / z.world.heroes.size;
                    h.x = b.x + Math.cos(angle) * 42;
                    h.y = b.y + Math.sin(angle) * 42;
                    h.fx = -Math.cos(angle);
                    h.fy = -Math.sin(angle);
                  } else {
                    // Keep the ranged dodge witness far enough away to observe
                    // release and straight travel over the network before contact.
                    h.x =
                      phase === 'palm'
                        ? j === 0
                          ? 640
                          : 860 + j * 30
                        : 580 + (j % 3) * 55;
                    h.y =
                      phase === 'palm'
                        ? j === 0
                          ? 550
                          : 590
                        : 430 + Math.floor(j / 3) * 30;
                  }
                  if (mode !== 'park') {
                    h.hp = h.maxHp;
                    h.mana = h.maxMana;
                    room.simulation.respawns.delete(h.id);
                  }
                  h.moveX = h.moveY = 0;
                }
              } else if (mode === 'exit') {
                const h = room.simulation.hero(q.get('hero') ?? '');
                if (!h) throw Error('Unknown hero');
                h.x = z.dungeon!.exit.x;
                h.y = z.dungeon!.exit.y;
              } else throw Error('Unknown fixture');
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  tick: z.world.tick,
                  hp: b.hp,
                  heroes: z.world.heroes.size,
                }),
              );
            } catch (e) {
              res.statusCode = 400;
              res.end(String(e));
            }
          });
        },
      },
    ],
  });
  try {
    await vite.listen();
    return async () => {
      await vite.close();
      await server.gracefullyShutdown(false);
    };
  } catch (e) {
    await vite.close();
    await server.gracefullyShutdown(false);
    throw e;
  }
}
