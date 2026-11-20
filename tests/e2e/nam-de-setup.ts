import { fileURLToPath } from 'node:url';
import { ColyseusTestServer } from '@colyseus/testing';
import {
  beginNamDeCast,
  clearNamDe,
  NAM_DE_ID,
  type NamDeAbility,
} from '@volam/game-core';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
import { startOwnedGameQa } from './owned-game-setup.js';
import { qaWorkflowSession } from '../../tools/qa-session.mjs';
export default async function setup() {
  const session = qaWorkflowSession('browser', [
    '--config',
    'playwright.nam-de-gameplay.config.ts',
  ]);
  return startOwnedGameQa({
    session,
    environment: { NODE_ENV: 'development' },
    loadClientConfig: false,
    configure(server) {
      const authority = new ColyseusTestServer(server);
      return {
        root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
        cacheDir: fileURLToPath(
          new URL('../../.cache/vite-nam-de', import.meta.url),
        ),
        configFile: false,
        server: {
          host: '127.0.0.1',
          port: 5415,
          strictPort: true,
          watch: null,
          hmr: false,
        },
        define: {
          'import.meta.env.VITE_SERVER_URL': JSON.stringify(
            'http://127.0.0.1:2813',
          ),
        },
        plugins: [
          {
            name: 'test-only-nam-de',
            configureServer(v) {
              v.middlewares.use('/__nam_de', (req, res) => {
                try {
                  if (req.method !== 'POST') throw Error('POST required');
                  const q = new URL(req.url ?? '/', 'http://local')
                      .searchParams,
                    room = authority.getRoomById<MatchRoom>(
                      q.get('room') ?? '',
                    ),
                    m = room.simulation,
                    w = m.arena.world,
                    s = w.namDe!,
                    mode = q.get('mode');
                  if (mode === 'gate') {
                    // Earlier chapters are setup prerequisites; their real defeat path
                    // is separately covered by m3d-nam-de-integration.test.ts.
                    if (m.dongTa) m.dongTa.phase = 'cleared';
                    if (m.tayDoc) {
                      m.tayDoc.phase = 'dead';
                      m.tayDocGate.spawned = true;
                    }
                    w.creeps.clear();
                    m.invasion!.wave = 14;
                    m.invasion!.nextWaveTick = m.arenaTick + 1;
                    m.step();
                    for (const e of w.creeps.values()) {
                      e.hp = 0;
                      e.respawnAt = w.tick;
                    }
                    m.step();
                    for (let i = 0; i < s.definition.restTicks; i++) m.step();
                  } else if (mode === 'cast' || mode === 'park') {
                    const b = w.creeps.get(NAM_DE_ID);
                    if (!b) throw Error('Gate first');
                    clearNamDe(w);
                    s.phase = 'idle';
                    s.nextActionAt = w.tick + 100000;
                    s.definition.actionRestTicks = 100000;
                    b.x = 800;
                    b.y = 790;
                    b.hp = b.maxHp;
                    b.pose = 'idle';
                    for (const [i, h] of [...w.heroes.values()].entries()) {
                      h.x =
                        mode === 'cast' &&
                        q.get('ability') === 'dai_ly_phong_huyet'
                          ? 760
                          : 680 + (i % 3) * 120;
                      h.y =
                        mode === 'cast' &&
                        q.get('ability') === 'dai_ly_phong_huyet'
                          ? 790
                          : 850 + Math.floor(i / 3) * 90;
                      h.hp = h.maxHp;
                      h.moveX = h.moveY = 0;
                      h.statuses = [];
                      m.respawns.delete(h.id);
                    }
                    if (
                      mode === 'cast' &&
                      !beginNamDeCast(
                        w,
                        m.arena.config,
                        q.get('ability') as NamDeAbility,
                        q.get('target') ?? [...w.heroes.keys()][0],
                      )
                    )
                      throw Error('Cast rejected');
                  } else if (mode === 'overlap') {
                    m.invasion!.nextWaveTick = m.arenaTick + 1;
                  } else if (mode === 'kill') {
                    const b = w.creeps.get(NAM_DE_ID)!;
                    b.hp = 1;
                    for (const h of w.heroes.values()) {
                      h.x = b.x - 30;
                      h.y = b.y;
                      h.fx = 1;
                      h.fy = 0;
                      b.hits[h.id] = w.tick;
                    }
                  } else if (mode === 'face') {
                    const b = w.creeps.get(NAM_DE_ID)!;
                    const h = w.heroes.get(q.get('target') ?? '')!;
                    h.x = b.x + Number(q.get('x'));
                    h.y = b.y + Number(q.get('y'));
                    s.nextActionAt = w.tick;
                  } else if (mode !== 'inspect') throw Error('Unknown fixture');
                  res.setHeader('Content-Type', 'application/json');
                  res.end(
                    JSON.stringify({
                      tick: w.tick,
                      view: s,
                      statue: w.statue?.hp,
                      controls: Object.fromEntries(s.controls),
                      boss: w.creeps.get(NAM_DE_ID),
                      wave: m.invasion!.wave,
                      spawnCount: s.spawnCount,
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
      };
    },
  });
}
