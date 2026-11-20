import { fileURLToPath } from 'node:url';
import { ColyseusTestServer } from '@colyseus/testing';
import {
  addCreep,
  gainExperience,
  spawnBossEncounter,
  type Pose,
} from '@volam/game-core';
import { lyMacSauEncounter, m1Config } from '@volam/game-data';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
import { startOwnedGameQa } from './owned-game-setup.js';
import { qaWorkflowSession } from '../../tools/qa-session.mjs';
export default async function setup() {
  const session = qaWorkflowSession('browser', [
    '--config',
    'playwright.ly-mac-sau.config.ts',
  ]);
  return startOwnedGameQa({
    session,
    environment: {},
    loadClientConfig: false,
    configure(server) {
      const authority = new ColyseusTestServer(server);
      let serial = 0;
      return {
        root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
        cacheDir: fileURLToPath(
          new URL('../../.cache/vite-ly-mac-sau', import.meta.url),
        ),
        configFile: false,
        server: {
          host: '127.0.0.1',
          port: session.clientPort,
          strictPort: true,
          watch: null,
          hmr: false,
        },
        define: {
          'import.meta.env.VITE_SERVER_URL': JSON.stringify(session.serverUrl),
        },
        plugins: [
          {
            name: 'ly-mac-sau-test-authority',
            configureServer(vite) {
              vite.middlewares.use('/__ly_mac_sau', (req, res) => {
                try {
                  if (req.method !== 'POST') throw Error('POST required');
                  const q = new URL(req.url ?? '/', 'http://127.0.0.1')
                    .searchParams;
                  const room = authority.getRoomById<MatchRoom>(
                    q.get('room') ?? '',
                  );
                  const z = room.simulation.zones.get('co_mo_shared');
                  if (!z) throw Error('Cổ Mộ shared instance required');
                  const mode = q.get('mode');
                  if (mode === 'grant') {
                    for (const h of z.world.heroes.values())
                      gainExperience(
                        h,
                        (15 - h.level) * m1Config.xpPerLevel,
                        z.config,
                      );
                  } else if (mode === 'reset') {
                    z.config.bossEncounter = structuredClone(lyMacSauEncounter);
                    spawnBossEncounter(z.world, z.config, z.id);
                    z.bossRespawnAt = undefined;
                    for (const [i, h] of [
                      ...z.world.heroes.values(),
                    ].entries()) {
                      h.x = 640 + (i < 3 ? -50 : 50);
                      h.y = 416 + (i % 3) * 32;
                      h.fx = i < 3 ? 1 : -1;
                      h.fy = 0;
                      h.moveX = h.moveY = 0;
                    }
                  } else if (mode === 'pose') {
                    const state = q.get('state') ?? 'idle';
                    const direction = q.get('direction') ?? 'down';
                    const dirs: Record<string, [number, number]> = {
                      down: [0, 1],
                      left: [-1, 0],
                      right: [1, 0],
                      up: [0, -1],
                    };
                    if (!dirs[direction]) throw Error('Bad direction');
                    const casts: Record<string, string> = {
                      needle_cast: 'bang_phach_ngan_cham',
                      palm_channel: 'xich_luyen_chuong',
                      fast_sweep: 'phat_tran_cong',
                      summon_cast: 'co_mo_kiem_phap',
                    };
                    if (
                      ![
                        'idle',
                        'walk',
                        'basic_attack',
                        'hurt',
                        'death',
                        ...Object.keys(casts),
                      ].includes(state)
                    )
                      throw Error('Bad pose');
                    z.config.bossEncounter = undefined;
                    z.world.creeps.clear();
                    z.world.projectiles.clear();
                    z.bossRespawnAt = room.simulation.tick + 10000;
                    for (const [i, h] of [
                      ...z.world.heroes.values(),
                    ].entries()) {
                      h.x = 640 + (i % 3) * 40;
                      h.y = 640 + Math.floor(i / 3) * 32;
                      h.moveX = h.moveY = 0;
                    }
                    for (const [archetype, x] of [
                      ['ly_mac_sau', 592],
                      ['co_mo_am_binh', 720],
                    ] as const) {
                      const id = `pose_${++serial}_${archetype}`;
                      const c = addCreep(z.world, id, { x, y: 480 }, z.config);
                      c.archetypeId = archetype;
                      c.encounterBoss = archetype === 'ly_mac_sau';
                      const selected =
                        archetype === 'co_mo_am_binh' && casts[state]
                          ? 'idle'
                          : state;
                      c.pose = (casts[selected] ? 'cast' : selected) as Pose;
                      c.castAbilityId = casts[selected] ?? '';
                      [c.fx, c.fy] = dirs[direction]!;
                      c.actionUntil = z.world.tick + 10000;
                      c.cooldown = c.actionUntil;
                      c.hp = selected === 'death' ? 0 : c.maxHp;
                      c.statuses = [
                        {
                          kind: 'stun',
                          sourceId: 'frame-fixture',
                          abilityId: 'frame-fixture',
                          durationTicks: 10000,
                          until: z.world.tick + 10000,
                          magnitude: 1,
                        },
                      ];
                      c.stats = {
                        ...m1Config.creep,
                        speed: 0,
                        damage: 0,
                        detectionRange: 0,
                      };
                      if (c.encounterBoss) {
                        z.world.boss!.actorId = id;
                        z.world.boss!.cast = undefined;
                        z.world.boss!.rewarded = true;
                      }
                    }
                  } else if (mode === 'position') {
                    const h = z.world.heroes.get(q.get('player') ?? '')!;
                    const x = Number(q.get('x')),
                      y = Number(q.get('y'));
                    if (!h || !Number.isFinite(x) || !Number.isFinite(y))
                      throw Error('Bad position');
                    h.x = x;
                    h.y = y;
                    h.moveX = h.moveY = 0;
                  } else throw Error('Bad fixture mode');
                  res.setHeader('content-type', 'application/json');
                  res.end(JSON.stringify({ tick: z.world.tick, mode }));
                } catch (error) {
                  res.statusCode = 400;
                  res.end(String(error));
                }
              });
            },
          },
        ],
      };
    },
  });
}
