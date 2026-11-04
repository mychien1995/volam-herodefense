import { startWaveFeedback } from './wave-boss-feedback-setup.js';
import { createM3dFixture } from './m3d-feedback-setup.js';
import { matchMaker } from '@colyseus/core';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
import { runtimeArtCases } from '../../tools/art-revision/runtime-review-cases.js';
import type { Plugin } from 'vite';
import { initializeProgression } from '@volam/game-core';

export default async function setup() {
  const randomByRoom = new Map<string, () => number>();
  const plugin: Plugin = {
    name: 'isolated-runtime-art-review',
    configurePreviewServer(v) {
      v.middlewares.use('/__visual_review', async (req, res) => {
        try {
          const q = new URL(req.url ?? '/', 'http://local').searchParams;
          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(runtimeArtCases));
            return;
          }
          if (req.method !== 'POST') throw Error('POST required');
          const room = matchMaker.getLocalRoomById(q.get('room') ?? '') as
            MatchRoom | undefined;
          if (!room || room.state.phase !== 'IN_GAME')
            throw Error('Join and start a match first');
          const c = runtimeArtCases.find((c) => c.id === q.get('case'));
          if (!c) throw Error('Unknown case');
          const m = room.simulation,
            w = room.world;
          if (!randomByRoom.has(room.roomId))
            randomByRoom.set(room.roomId, w.random);
          const fixture = async (data: Record<string, unknown>) => {
            const r = await fetch(
              `http://127.0.0.1:${process.env['VOLAM_QA_FIXTURE_PORT'] ?? 2878}/fixture`,
              {
                method: 'POST',
                body: JSON.stringify({
                  roomId: room.roomId,
                  sessionId: q.get('player'),
                  ...data,
                }),
              },
            );
            if (!r.ok) throw Error(await r.text());
          };
          const wave = async (data: Record<string, string>) => {
            const r = await fetch(
              `http://127.0.0.1:${process.env['VOLAM_QA_CLIENT_PORT'] ?? 5504}/__wave_feedback?` +
                new URLSearchParams({ room: room.roomId, ...data }),
              { method: 'POST' },
            );
            if (!r.ok) throw Error(await r.text());
          };
          // This endpoint exists only in this explicitly started local QA service.
          // Reset encounter prerequisites, never ship these controls in production.
          if (q.get('op') === 'prepare') {
            w.random = randomByRoom.get(room.roomId)!;
            m.dongTa!.casts = [];
            m.dongTa!.effects = [];
            m.dongTa!.phase = 'cleared';
            m.tayDoc!.clear(w);
            m.tayDoc!.phase = 'dead';
            if (w.namDe) {
              w.namDe.phase = 'defeated';
              w.namDe.nextActionAt = Infinity;
            }
            w.bacCai?.clear(w);
            delete w.bacCai;
            m.waveArena = undefined;
            m.invasion!.nextWaveTick = m.arenaTick + 100000;
            await fixture({ action: 'travel' });
            if (c.kind === 'hero') {
              const h = m.hero(q.get('player')!)!;
              h.schoolId = c.group.split(':')[0]!;
              room.state.players.get(h.id)!.schoolId = h.schoolId;
              initializeProgression(h, m.arena.config);
              await fixture({
                action: 'build',
                basic: c.basic,
                ids:
                  c.skill === 'vo_anh_cuoc'
                    ? [c.skill, 'toan_phong_thoai', 'hoanh_tao_cuoc', '']
                    : c.skill
                      ? [c.skill, '', '', '']
                      : ['', '', '', ''],
              });
              await fixture({ action: 'restore' });
              h.basicChains = {};
              delete h.basicChainDeadline;
              await fixture({ action: 'endurance' });
              await fixture({
                action: 'position',
                x: 1000,
                y: 700,
                fx: 1,
                fy: 0,
              });
              await fixture({
                action: 'targets',
                points:
                  c.skill === 'nhu_lai_thien_diep'
                    ? [
                        { x: 1160, y: 705 },
                        { x: 865, y: 750 },
                        { x: 980, y: 575 },
                        { x: 1080, y: 828 },
                      ]
                    : [
                        { x: c.skill === 'vo_anh_cuoc' ? 1220 : 1190, y: 700 },
                        { x: 1230, y: 700 },
                        { x: 1250, y: 740 },
                      ],
              });
              // The legacy target fixture pins RNG for combat assertions. This
              // visual review needs the real seeded placement RNG for bosses.
              w.random = randomByRoom.get(room.roomId)!;
            } else if (c.destination) {
              await fixture({ action: 'travel', destination: c.destination });
              await fixture({ action: 'endurance' });
              const zone = m.zoneOf(q.get('player')!)!;
              zone.kim?.initialize(zone.world, zone.config);
              const actor = [...zone.world.creeps.values()].find(
                (a) => a.hp > 0,
              )!;
              if (actor)
                await fixture({
                  action: 'position',
                  x: actor.x + (c.ability === 'ly_mac_sau_basic' ? 100 : 180),
                  y: actor.y + 20,
                  fx: -1,
                  fy: 0,
                });
            } else {
              const boss = ['mai_sieu_phong', 'hoang_dung'].includes(c.actor!)
                ? 'dong_ta'
                : c.actor!;
              await wave({ op: 'spawn', boss });
              if (c.actor === 'mai_sieu_phong' || c.actor === 'hoang_dung') {
                await wave({
                  op: 'cast',
                  boss: 'dong_ta',
                  ability: 'trieu_hon_dong_hai',
                });
                const deadline = Date.now() + 6000;
                while (!w.creeps.has(c.actor!) && Date.now() < deadline)
                  await new Promise((r) => setTimeout(r, 50));
                if (!w.creeps.has(c.actor!))
                  throw Error('Summon did not appear');
              }
            }
          } else if (q.get('op') === 'cast' && c.kind === 'boss') {
            if (c.destination)
              await fixture({
                action: 'boss-cast',
                actor: c.actor === 'hong_liet' ? 'hong_liet_boss' : c.actor,
                ability: c.ability,
              });
            else
              await wave({ op: 'cast', boss: c.actor!, ability: c.ability! });
            if (c.destination) {
              const zone = m.zoneOf(q.get('player')!)!;
              const readActual = () =>
                c.destination === 'co_mo'
                  ? zone.world.boss?.cast?.id
                  : c.destination === 'hong_liet'
                    ? zone.encounter?.cast?.abilityId
                    : c.destination === 'chu_ba_thong'
                      ? zone.world.chu?.phase
                      : zone.kim?.casts.get(c.actor!)?.abilityId;
              const deadline = Date.now() + 3000;
              while (readActual() !== c.ability && Date.now() < deadline)
                await new Promise((r) => setTimeout(r, 25));
              const actual = readActual();
              if (actual !== c.ability)
                throw Error(
                  'Server did not acknowledge requested boss cast: ' +
                    c.id +
                    ' / ' +
                    actual,
                );
            }
          } else
            throw Error(
              'Prepare a case, then use A / Q for a hero or Cast for a boss',
            );
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              ok: true,
              case: c,
              castAcknowledged: q.get('op') === 'cast',
            }),
          );
        } catch (e) {
          res.statusCode = 400;
          res.end(String(e));
        }
      });
    },
  };
  return createM3dFixture(() => startWaveFeedback([plugin]));
}
