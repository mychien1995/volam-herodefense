import { startOwnedGameQa } from './owned-game-setup.js';
import { ColyseusTestServer } from '@colyseus/testing';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
import { addCreep, gainExperience } from '@volam/game-core';
import { blocked } from '../../packages/game-core/src/geometry.js';
export default () =>
  startOwnedGameQa({
    config: 'playwright.performance.config.ts',
    loadClientConfig: true,
    environment: { NODE_ENV: 'development', VOLAM_DEV_PRACTICE_CREEPS: '0' },
    configure(server) {
      const authority = new ColyseusTestServer(server);
      return {
        plugins: [
          {
            name: 'performance-prerequisites',
            configureServer: middleware,
            configurePreviewServer: middleware,
          },
        ],
      };
      function middleware(vite: any) {
        vite.middlewares.use('/__performance', (req: any, res: any) => {
          try {
            if (req.method !== 'POST') throw Error('POST required');
            const query = new URL(req.url ?? '/', 'http://fixture')
              .searchParams;
            const room = authority.getRoomById<MatchRoom>(
              query.get('room') ?? '',
            );
            const id = query.get('id') ?? '',
              hero = room.simulation.hero(id);
            if (!hero || !hero.nickname.startsWith('Perf '))
              throw Error('Named performance room required');
            const { world, config } = room.simulation.arena;
            if (room.simulation.invasion)
              room.simulation.invasion.nextWaveTick = 1e9;
            if (world.statue) world.statue.invulnerable = true;
            let index = 0;
            for (const h of world.heroes.values()) {
              if (!room.state.pvp.enabled) gainExperience(h, 1e9, config);
              h.hp = h.maxHp = 1e6;
              h.x = room.state.pvp.enabled
                ? 580 + index * 280
                : 720 + index * 40;
              h.y = room.state.pvp.enabled ? 360 : 900;
              h.fx = index ? -1 : 1;
              h.fy = 0;
              h.moveX = h.moveY = 0;
              h.autoBasic = false;
              index++;
            }
            if (query.get('op') === 'crowd') {
              world.creeps.clear();
              for (
                let n = 0, candidate = 0;
                n < 200 && candidate < 5000;
                candidate++
              ) {
                const position = {
                  x: 880 + (candidate % 25) * 20,
                  y: 820 + Math.floor(candidate / 25) * 20,
                };
                if (
                  blocked(
                    position,
                    config.creep.radius,
                    config.width,
                    config.height,
                    config.collision,
                  )
                )
                  continue;
                const enemy = addCreep(
                  world,
                  'perf_creep_' + n,
                  position,
                  config,
                );
                enemy.hp = enemy.maxHp = 1e6;
                enemy.neverRespawn = true;
                enemy.stats = { ...config.creep, speed: 0, damage: 0 };
                enemy.invasion = {
                  wave: 1,
                  lane: 'east',
                  targetId: '',
                  chaseOrigin: { ...position },
                  reacquireAt: 0,
                  chaseRange: 700,
                  aggroRestTicks: 30,
                };
                n++;
              }
              if (world.creeps.size !== 200)
                throw Error('Could not place 200 legal enemies');
            }
            res.setHeader('content-type', 'application/json');
            res.end(
              JSON.stringify({
                heroes: world.heroes.size,
                creeps: world.creeps.size,
              }),
            );
          } catch (error) {
            res.statusCode = 400;
            res.end(String(error));
          }
        });
      }
    },
  });
