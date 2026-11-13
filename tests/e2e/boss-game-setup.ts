import { fileURLToPath } from 'node:url';
import { ColyseusTestServer } from '@colyseus/testing';
import { preview } from 'vite';
import {
  changeBuild,
  experienceAtLevel,
  gainExperience,
} from '@volam/game-core';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';
import {
  ownedQaServices,
  qaIdentityPlugin,
  qaSession,
  requireFreePorts,
  verifyQaIdentity,
} from '../../tools/qa-session.mjs';

export default async function setup() {
  const session = qaSession({
    profile: 'boss-game',
    serverPort: 45099,
    clientPort: 59763,
  });
  const owned = ownedQaServices();
  await requireFreePorts(session);
  process.env['VOLAM_QA_RUN_ID'] = session.runId;
  try {
    const server = createGameServer();
    await server.listen(session.serverPort, '127.0.0.1');
    owned.add(() => server.gracefullyShutdown(false));
    const rooms = new ColyseusTestServer(server);
    const client = await preview({
      root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
      configFile: false,
      preview: {
        host: '127.0.0.1',
        port: session.clientPort,
        strictPort: true,
      },
      plugins: [
        qaIdentityPlugin(session),
        {
          name: 'boss-game-test-fixture',
          configurePreviewServer(vite) {
            vite.middlewares.use('/__boss_game', (req, res) => {
              try {
                if (req.method !== 'POST') throw Error('POST required');
                const query = new URL(req.url ?? '/', session.clientUrl)
                  .searchParams;
                const room = rooms.getRoomById<MatchRoom>(
                  query.get('room') ?? '',
                );
                const match = room.simulation;
                const id = query.get('player') ?? '';
                const hero = match.hero(id);
                const zone = match.zoneOf(id);
                if (!hero || !zone) throw Error('Unknown test actor');
                if (query.get('action') === 'learn' && zone === match.arena) {
                  gainExperience(
                    hero,
                    experienceAtLevel(12, zone.config) - hero.xp,
                    zone.config,
                  );
                  const error = changeBuild(
                    zone.world,
                    hero,
                    zone.config,
                    hero.progression!.revision,
                    { action: 'upgrade-slot', slot: 4 },
                  );
                  if (error) throw Error(error);
                  hero.hp = hero.maxHp;
                } else if (
                  query.get('action') === 'line-up' &&
                  zone.encounter
                ) {
                  const encounter = zone.encounter;
                  encounter.clear(zone.world);
                  encounter.nextActionAt = Number.MAX_SAFE_INTEGER;
                  const boss = zone.world.creeps.get(encounter.bossId)!;
                  Object.assign(boss, encounter.definition.spawn);
                  // Start the real boss projectile once the test has pressed T.
                  const timer = setInterval(() => {
                    if (match.zoneOf(id) !== zone || hero.hp <= 0)
                      return clearInterval(timer);
                    if (hero.castAbilityId !== 'bach_liet_thien_kich') return;
                    clearInterval(timer);
                    encounter.begin(
                      zone.world,
                      zone.config,
                      'hong_liet_a1',
                      hero,
                    );
                  }, 15);
                  setTimeout(() => clearInterval(timer), 10000).unref();
                  Object.assign(hero, { x: boss.x, y: boss.y + 165 });
                } else throw Error('Unknown test action');
                res.end('ok');
              } catch (error) {
                res.statusCode = 400;
                res.end(String(error));
              }
            });
          },
        },
      ],
    });
    owned.add(() => client.close());
    await verifyQaIdentity(session.clientUrl + '/volam-build-endpoint.json', {
      serverUrl: session.serverUrl,
    });
    return () => owned.close();
  } catch (error) {
    await owned.close();
    throw error;
  }
}
