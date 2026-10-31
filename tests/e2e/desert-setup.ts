import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { ColyseusTestServer } from '@colyseus/testing';
import { addCreep, type Pose } from '@volam/game-core';
import { desertRoster } from '@volam/game-data';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';

/** Test-owned ports and authority arrangements. No runtime/debug travel API. */
export interface DungeonArtQaOptions {
  prefix: string;
  destination: string;
  roster: readonly string[];
  serverPort: number;
  clientPort: number;
  actorStates?: Record<string, string[]>;
}
export async function setupDungeonArt(options: DungeonArtQaOptions) {
  const { prefix, destination, roster, serverPort, clientPort } = options;
  process.env['VOLAM_DEV_PRACTICE_CREEPS'] = '1'; // Existing forest regression fixtures.
  const server = createGameServer();
  await server.listen(serverPort);
  const authority = new ColyseusTestServer(server);
  const client = await createServer({
    root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
    cacheDir: fileURLToPath(
      new URL(`../../.cache/vite-${prefix}`, import.meta.url),
    ),
    configFile: false,
    server: {
      host: '127.0.0.1',
      port: clientPort,
      strictPort: true,
      watch: null,
      hmr: false,
    },
    define: {
      'import.meta.env.VITE_SERVER_URL': JSON.stringify(
        `http://127.0.0.1:${serverPort}`,
      ),
    },
    plugins: [
      {
        name: `${prefix}-test-authority`,
        configureServer(vite) {
          vite.middlewares.use(`/__${prefix}`, (req, res) => {
            try {
              if (req.method !== 'POST') throw Error('POST required');
              const q = new URL(req.url ?? '/', 'http://127.0.0.1')
                .searchParams;
              const room = authority.getRoomById<MatchRoom>(
                q.get('room') ?? '',
              );
              const z = room.simulation.zones.get(`${destination}_shared`);
              if (!z) throw Error('Shared desert required');
              const mode = q.get('mode');
              if (mode === 'pose') {
                const pose = q.get('pose') ?? '';
                if (
                  ![
                    'idle',
                    'walk',
                    'basic_attack',
                    'hurt',
                    'death',
                    'aim',
                    'fire',
                    'cast',
                    'water_attack',
                  ].includes(pose)
                )
                  throw Error('Invalid pose');
                const dirs = {
                  down: [0, 1],
                  left: [-1, 0],
                  right: [1, 0],
                  up: [0, -1],
                } as const;
                const dir = dirs[q.get('direction') as keyof typeof dirs];
                if (!dir) throw Error('Invalid direction');
                z.world.creeps.clear();
                if (prefix === 'beach')
                  for (const [i, h] of [...z.world.heroes.values()].entries()) {
                    h.x = 768;
                    h.y = 552 + i * 24;
                    h.moveX = h.moveY = 0;
                  }
                for (const [i, archetype] of roster.entries()) {
                  const selectedPose =
                    options.actorStates &&
                    !options.actorStates[archetype]?.includes(pose)
                      ? 'idle'
                      : pose;
                  const c = addCreep(
                    z.world,
                    `review_${pose}_${q.get('direction')}_${archetype}`,
                    {
                      x: 576 + (i % 3) * 192,
                      y: 512 + Math.floor(i / 3) * (prefix === 'beach' ? 96 : 128),
                    },
                    z.config,
                  );
                  c.archetypeId = archetype;
                  c.pose = selectedPose as Pose;
                  [c.fx, c.fy] = dir;
                  c.hp = selectedPose === 'death' ? 0 : c.maxHp;
                  c.cooldown = c.actionUntil = z.world.tick + 3000;
                  c.statuses = [
                    {
                      kind: 'stun',
                      sourceId: 'fixture',
                      abilityId: 'art-review',
                      durationTicks: 3000,
                      magnitude: 1,
                      until: z.world.tick + 3000,
                    },
                  ];
                }
                // Prevent the authored death gallery from advancing a gameplay wave.
                z.nextWaveAt = z.world.tick + 3000;
              } else if (mode === 'combat') {
                z.world.creeps.clear();
                z.nextWaveAt = undefined;
                for (const [i, id] of [...z.world.heroes.keys()].entries()) {
                  const h = z.world.heroes.get(id)!;
                  // Use real stats and inputs; only arrange an unobstructed encounter.
                  h.x = 640 + (i % 3) * (prefix === 'beach' ? 64 : 48);
                  h.y =
                    720 + Math.floor(i / 3) * (prefix === 'beach' ? 64 : 48);
                  h.fx = 0;
                  h.fy = -1;
                  h.moveX = h.moveY = 0;
                }
                for (const [i, archetype] of roster.entries()) {
                  const c = addCreep(
                    z.world,
                    'combat_' + archetype,
                    {
                      x: 640 + (i % 3) * (prefix === 'beach' ? 64 : 48),
                      y: 624 + Math.floor(i / 3) * 32,
                    },
                    z.config,
                  );
                  c.archetypeId = archetype;
                }
              } else throw Error('Unknown fixture');
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  ids: [...z.world.creeps.keys()].map((id) => `${z.id}:${id}`),
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
    await client.listen();
    if (!(await fetch(`http://127.0.0.1:${serverPort}/health`)).ok)
      throw Error('Desert server health failed');
    return async () => {
      await client.close();
      await server.gracefullyShutdown(false);
    };
  } catch (e) {
    await client.close();
    await server.gracefullyShutdown(false);
    throw e;
  }
}
export default async function setup() {
  return setupDungeonArt({
    prefix: 'desert',
    destination: 'desert',
    roster: desertRoster,
    serverPort: 2596,
    clientPort: 5196,
  });
}
