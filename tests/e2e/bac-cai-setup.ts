import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { ColyseusTestServer } from '@colyseus/testing';
import {
  BacCaiEncounter,
  bacCaiAbilities,
  isBacCaiActor,
  gainExperience,
  type BacCaiAbility,
} from '@volam/game-core';
import { bacCaiDefinition } from '@volam/game-data';
import { hurt } from '../../packages/game-core/src/combat.js';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
/** Explicit local test services. No fixture route or new gameplay command enters the shipped server. */
export default async function setup() {
  const names = [
    'NODE_ENV',
    'VOLAM_DEV_LEGACY_SKILLS',
    'VOLAM_DEV_SKILLS',
    'VOLAM_DEV_PRACTICE_CREEPS',
    'VOLAM_INVASION_INTERVAL_SECONDS',
    'VOLAM_DEV_STATUE_HP',
  ] as const;
  const old = Object.fromEntries(names.map((k) => [k, process.env[k]]));
  process.env['NODE_ENV'] = 'development';
  for (const k of names.slice(1)) delete process.env[k];
  const server = createGameServer(),
    serverPort = Number(process.env['VOLAM_QA_SERVER_PORT'] ?? 2797),
    clientPort = Number(process.env['VOLAM_QA_CLIENT_PORT'] ?? 5397);
  await server.listen(serverPort);
  const authority = new ColyseusTestServer(server);
  const vite = await preview({
    root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
    configFile: false,
    preview: {
      host: '127.0.0.1',
      port: clientPort,
      strictPort: true,
    },
    plugins: [
      {
        name: 'test-only-bac-cai',
        configurePreviewServer(v) {
          v.middlewares.use('/__bac_cai_fixture', (req, res) => {
            try {
              if (req.method !== 'POST') throw Error('POST required');
              const q = new URL(req.url ?? '/', 'http://127.0.0.1')
                .searchParams;
              const room = authority.getRoomById<MatchRoom>(
                  q.get('room') ?? '',
                ),
                z = room.simulation.arena,
                w = z.world,
                c = z.config,
                mode = q.get('mode');
              if (room.state.phase !== 'IN_GAME')
                throw Error('Running test match required');
              if (['spawn', 'cast', 'vote'].includes(mode ?? '')) {
                w.bacCai?.clear(w);
                for (const id of w.creeps.keys())
                  if (isBacCaiActor(id)) w.creeps.delete(id);
                delete w.bacCai;
                const d = structuredClone(bacCaiDefinition);
                if (mode !== 'spawn') {
                  d.actionGapMs = 1e6;
                  d.specialCooldownMs = 1e6;
                  d.preferences.voteEveryMs = mode === 'vote' ? 100 : 1e9;
                }
                const e = new BacCaiEncounter(d);
                e.initialize(w, c);
                const heroes = [...w.heroes.values()];
                heroes.forEach((h, i) => {
                  h.x = d.center.x - 100 + i * 45;
                  h.y = d.center.y + 90;
                  h.moveX = h.moveY = 0;
                  h.statuses = [];
                  if (mode === 'spawn') gainExperience(h, 1e8, c);
                  else h.maxHp = 1e6;
                  h.hp = h.maxHp;
                  h.mana = h.maxMana;
                });
                if (mode !== 'spawn') {
                  e.phase = 'combat';
                  const b = w.creeps.get(e.bossId)!;
                  b.x = d.center.x;
                  b.y = d.center.y;
                }
                if (mode === 'cast') {
                  const ability = q.get('ability') as BacCaiAbility;
                  if (!bacCaiAbilities.includes(ability))
                    throw Error('Invalid ability');
                  const h = heroes[0]!;
                  h.x = d.center.x + 180;
                  h.y = d.center.y;
                  const other = heroes[1];
                  if (other) {
                    other.x = d.center.x - 80;
                    other.y = d.center.y + 80;
                  }
                  if (!e.begin(w, c, ability, h)) throw Error('Cast rejected');
                }
              } else if (mode === 'clonehit') {
                const actor =
                  q.get('guess') === 'real'
                    ? w.creeps.get('bac_cai')
                    : [...w.creeps.values()].find(
                        (a) => a.archetypeId === 'bc_form',
                      );
                if (!actor) throw Error('No clone puzzle target');
                hurt(
                  w,
                  actor,
                  [...w.heroes.keys()][0]!,
                  'qa_clone_guess',
                  10,
                  c,
                );
              } else if (mode === 'continue') {
                const ability = q.get('ability') as BacCaiAbility;
                if (
                  !bacCaiAbilities.includes(ability) ||
                  !w.bacCai?.begin(w, c, ability)
                )
                  throw Error('Concurrent cast rejected');
              } else if (mode === 'stand') {
                const e = w.bacCai!,
                  view = e.view(w, c),
                  vote = view.vote;
                if (!vote) throw Error('No vote');
                const answer = q.get('answer') ?? 'correct';
                const correct = vote.options.find(
                    (o) => o.preference === view.preference,
                  )!,
                  wrong = vote.options.find((o) => o !== correct)!;
                [...w.heroes.values()].forEach((h, i) => {
                  const p =
                    answer === 'zero'
                      ? { x: 400, y: 1000 }
                      : answer === 'tie' && i % 2
                        ? wrong
                        : answer === 'wrong'
                          ? wrong
                          : correct;
                  h.x = p.x;
                  h.y = p.y;
                  h.moveX = h.moveY = 0;
                });
                w.creeps.get('bac_cai')!.hp =
                  w.creeps.get('bac_cai')!.maxHp * 0.5;
              } else if (mode === 'dogkillable') {
                const dog = [...w.creeps.values()].find(
                    (a) => a.archetypeId === 'bc_dog' && a.hp > 0,
                  )!,
                  h = [...w.heroes.values()][0]!;
                dog.hp = 1;
                h.x = dog.x - 20;
                h.y = dog.y;
                h.fx = 1;
                h.fy = 0;
                h.cooldown = 0;
                h.moveX = h.moveY = 0;
              } else if (mode === 'killable') {
                const b = w.creeps.get('bac_cai')!,
                  h = [...w.heroes.values()][0]!;
                w.bacCai!.cast = undefined;
                b.hp = 1;
                h.x = b.x - 30;
                h.y = b.y;
                h.fx = 1;
                h.fy = 0;
                h.cooldown = 0;
                h.moveX = h.moveY = 0;
              } else if (mode === 'separate') {
                let i = 0;
                for (const h of w.heroes.values()) {
                  h.x = 400 + i++ * 700;
                  h.y = 950;
                  h.moveX = h.moveY = 0;
                }
              } else throw Error('Unknown fixture');
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({ tick: w.tick, view: w.bacCai?.view(w, c) }),
              );
            } catch (error) {
              res.statusCode = 400;
              res.end(String(error));
            }
          });
        },
      },
    ],
  });
  return async () => {
    await vite.close();
    await server.gracefullyShutdown(false);
    for (const k of names)
      if (old[k] === undefined) delete process.env[k];
      else process.env[k] = old[k];
  };
}
