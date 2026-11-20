import { fileURLToPath } from 'node:url';
import { ColyseusTestServer } from '@colyseus/testing';
import { VUONG_ID, gainExperience } from '@volam/game-core';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
import { startOwnedGameQa } from './owned-game-setup.js';
import { qaWorkflowSession } from '../../tools/qa-session.mjs';
export default async function setup() {
  const session = qaWorkflowSession('browser', [
    '--config',
    'playwright.vuong-trung-duong.config.ts',
  ]);
  return startOwnedGameQa({
    session,
    environment: {},
    configure(server) {
      const authority = new ColyseusTestServer(server);
      return {
        configFile: false,
        root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
        preview: {
          host: '127.0.0.1',
          port: session.clientPort,
          strictPort: true,
        },
        plugins: [
          {
            name: 'vuong-trung-duong-test-prerequisites',
            configurePreviewServer(vite) {
              vite.middlewares.use('/__vtd', (req, res) => {
                try {
                  if (req.method !== 'POST') throw Error('POST required');
                  const q = new URL(req.url ?? '/', 'http://local')
                    .searchParams;
                  const room = authority.getRoomById<MatchRoom>(
                    q.get('room') ?? '',
                  );
                  if (room.state.phase !== 'IN_GAME')
                    throw Error('Join a real match first');
                  const m = room.simulation,
                    w = room.world;
                  if (q.get('op') === 'start') {
                    // Prerequisites only. The actual final gate initializes the encounter.
                    for (const id of [
                      'dong_ta',
                      'tay_doc',
                      'nam_de',
                      'bac_cai',
                    ] as const)
                      m.mainBosses!.recordDefeat(id);
                    m.dongTa!.phase = 'cleared';
                    m.tayDoc!.phase = 'dead';
                    m.tayDocGate.spawned = true;
                    w.namDe!.phase = 'defeated';
                    m.invasion!.wave = 20;
                    for (const h of w.heroes.values()) {
                      gainExperience(h, 1e8, m.arena.config);
                      h.hp = h.maxHp;
                    }
                  } else if (q.get('op') === 'arrange') {
                    const boss = w.creeps.get(VUONG_ID)!;
                    if (!boss || !w.vuong)
                      throw Error('Wait for the final encounter');
                    for (const [i, h] of [...w.heroes.values()].entries()) {
                      const angle =
                        q.get('qteSafe') === '1'
                          ? (i * Math.PI) / 2
                          : (i * Math.PI) / 3;
                      const spread =
                        q.get('spread') === '1' || q.get('qteSafe') === '1';
                      const distance = q.get('qteSafe') === '1' ? 163 : 104;
                      h.x = spread
                        ? boss.x + Math.cos(angle) * distance
                        : boss.x + 30 + i * 5;
                      h.y = spread
                        ? boss.y + Math.sin(angle) * distance
                        : boss.y;
                      h.fx = -1;
                      h.fy = 0;
                      h.moveX = h.moveY = 0;
                      if (
                        q.get('threshold') === '1' ||
                        q.get('qteSafe') === '1'
                      ) {
                        h.hp = h.maxHp;
                        h.mana = h.maxMana;
                      }
                    }
                    if (q.get('slice') === '1') w.vuong.lightningHits = 3;
                    if (q.get('threshold') === '1')
                      boss.hp =
                        Math.ceil(boss.maxHp * w.vuong.definition.phase2Hp) + 1;
                    if (q.get('threshold') === 'notes') {
                      if (w.vuong.phase !== 2) throw Error('Phase 2 required');
                      boss.hp =
                        Math.floor(boss.maxHp * w.vuong.definition.notesHp) + 1;
                    }
                  } else throw Error('Unknown operation');
                  res.setHeader('content-type', 'application/json');
                  res.end(JSON.stringify({ ok: true }));
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
