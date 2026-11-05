import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { ColyseusTestServer } from '@colyseus/testing';
import { addCreep, stepCreepHazards, blocked } from '@volam/game-core';
import { creepProfiles, creepCombatDefinition } from '@volam/game-data';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';
import {
  qaSession,
  requireFreePorts,
  qaIdentityPlugin,
  verifyQaIdentity,
  ownedQaServices,
} from '../../tools/qa-session.mjs';
export default async function setup() {
  const session = qaSession({
    serverPort: 2928,
    clientPort: 5528,
    profile: 'creep-upgrade',
  });
  await requireFreePorts(session);
  const names = [
    'NODE_ENV',
    'VOLAM_QA_RUN_ID',
    'VOLAM_DEV_CREEP_TEST',
    'VOLAM_DEV_WAVE_BOSSES',
    'VOLAM_DEV_PRACTICE_CREEPS',
  ];
  const saved = Object.fromEntries(names.map((n) => [n, process.env[n]]));
  process.env['NODE_ENV'] = 'development';
  process.env['VOLAM_DEV_CREEP_TEST'] = '1';
  process.env['VOLAM_QA_RUN_ID'] = session.runId;
  delete process.env['VOLAM_DEV_WAVE_BOSSES'];
  delete process.env['VOLAM_DEV_PRACTICE_CREEPS'];
  const owned = ownedQaServices();
  const cleanup = async () => {
    await owned.close();
    for (const [n, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[n];
      else process.env[n] = v;
    }
  };
  try {
    const server = createGameServer();
    await server.listen(session.serverPort);
    owned.add(() => server.gracefullyShutdown(false));
    const authority = new ColyseusTestServer(server);
    await verifyQaIdentity(`${session.serverUrl}/health`, {
      service: 'volam-game-server',
      runId: session.runId,
      protocolVersion: PROTOCOL_VERSION,
    });
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
          name: 'creep-upgrade-qa-only',
          configurePreviewServer(v) {
            v.middlewares.use('/__creep_fixture', (req, res) => {
              try {
                if (req.method !== 'POST') throw Error('POST required');
                const q = new URL(req.url ?? '/', 'http://local').searchParams,
                  room = authority.getRoomById<MatchRoom>(q.get('room') ?? ''),
                  m = room.simulation,
                  op = q.get('op');
                if (room.state.phase !== 'IN_GAME')
                  throw Error('Enter a real match first');
                const heroId = q.get('hero') ?? [...m.membership.keys()][0]!,
                  hero = m.hero(heroId)!;
                if (op === 'arena') {
                  for (const id of m.membership.keys()) {
                    const z = m.zoneOf(id)!;
                    if (z.id !== 'arena') {
                      Object.assign(m.hero(id)!, z.dungeon!.exit);
                      const error = m.exit(id);
                      if (error) throw Error(error);
                    }
                  }
                }
                if (op === 'enter') {
                  const error = m.enter(
                    heroId,
                    'private',
                    q.get('zone') ?? 'forest',
                  );
                  if (error) throw Error(error);
                }
                const zone = m.zoneOf(heroId)!,
                  w = zone.world,
                  c = zone.config;
                if (op === 'stream') {
                  m.invasion!.nextWaveTick = m.arena.world.tick + 1;
                } else if (op === 'crowd') {
                  w.creeps.clear();
                  w.creepCombat = { actors: new Map(), effects: new Map() };
                  m.invasion!.nextWaveTick = 10000000;
                  let peer = 0;
                  for (const h of w.heroes.values()) {
                    const angle = (peer++ * Math.PI * 2) / 6;
                    Object.assign(h, {
                      x: 800 + Math.cos(angle) * 150,
                      y: 640 + Math.sin(angle) * 110,
                      invulnerable: true,
                      hp: h.maxHp,
                    });
                  }
                  let count = 0;
                  for (let row = 0; row < 14 && count < 120; row++)
                    for (let col = 0; col < 18 && count < 120; col++) {
                      const p = { x: 600 + col * 24, y: 440 + row * 24 };
                      if (
                        blocked(
                          p,
                          c.creep.radius,
                          c.width,
                          c.height,
                          c.collision,
                        )
                      )
                        continue;
                      const wave = (count % 20) + 1,
                        e = addCreep(w, `crowd_${count}`, p, c);
                      e.archetypeId = creepCombatDefinition.waveIds[wave - 1]!;
                      e.stats = { ...c.creep, speed: 0 };
                      e.hp = e.maxHp = 100000;
                      e.invasion = {
                        wave,
                        lane: 'west',
                        targetId: heroId,
                        chaseOrigin: { ...p },
                        reacquireAt: 0,
                        chaseRange: 500,
                        aggroRestTicks: 90,
                      };
                      count++;
                    }
                } else if (op === 'spawn') {
                  const id = q.get('id')!;
                  if (!creepProfiles[id]) throw Error('Unknown profile');
                  m.invasion!.nextWaveTick = 10000000;
                  w.creeps.clear();
                  w.projectiles.clear();
                  w.creepCombat = { actors: new Map(), effects: new Map() };
                  w.events = [];
                  const origin = zone.dungeon?.creepSpawns[0] ?? {
                    x: 760,
                    y: 616,
                  };
                  let index = 0;
                  for (const h of w.heroes.values()) {
                    const angle = (index++ * Math.PI * 2) / 5;
                    Object.assign(h, {
                      x:
                        origin.x +
                        (h.id === heroId ? 40 : Math.cos(angle) * 120),
                      y:
                        origin.y +
                        (h.id === heroId ? 0 : Math.sin(angle) * 120),
                      hp: 10000,
                      maxHp: 10000,
                      mana: h.maxMana,
                      invulnerable: true,
                      fx: -1,
                      fy: 0,
                    });
                  }
                  const enemy = addCreep(w, `review_${id}`, origin, c);
                  enemy.archetypeId = id;
                  enemy.stats = { ...c.creep, speed: 0, damage: 20 };
                  enemy.hp = enemy.maxHp = 100000;
                  const wave = creepCombatDefinition.waveIds.indexOf(id) + 1;
                  if (wave)
                    enemy.invasion = {
                      wave,
                      lane: 'west',
                      targetId: heroId,
                      chaseOrigin: { ...origin },
                      reacquireAt: 0,
                      chaseRange: 240,
                      aggroRestTicks: 90,
                    };
                  stepCreepHazards(w, c);
                  w.creepCombat.actors.get(enemy.id)!.nextSpecial = w.tick + 12;
                  if (creepProfiles[id]!.death) {
                    enemy.hp = 1;
                    hero.invulnerable = false;
                  }
                }
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    zone: zone.id,
                    tick: w.tick,
                    creeps: w.creeps.size,
                    hero: heroId,
                  }),
                );
              } catch (error) {
                res.statusCode = 500;
                res.end(String(error));
              }
            });
          },
        },
      ],
    });
    owned.add(() => client.close());
    await verifyQaIdentity(`${session.clientUrl}/volam-build-endpoint.json`, {
      serverUrl: session.serverUrl,
    });
    return cleanup;
  } catch (error) {
    await cleanup();
    throw error;
  }
}
