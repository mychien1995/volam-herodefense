import { fileURLToPath } from 'node:url';
import { matchMaker } from '@colyseus/core';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
import type { TayDocAbility } from '@volam/game-core';
import { startQaHttpFixture } from '../../tools/qa-http-fixture.mjs';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
import { startOwnedGameQa } from './owned-game-setup.js';
import { qaWorkflowSession } from '../../tools/qa-session.mjs';
export default async function setup() {
  const session = qaWorkflowSession('browser', [
    '--config',
    'playwright.tay-doc.config.ts',
  ]);
  return startOwnedGameQa({
    session,
    environment: {
      NODE_ENV: 'development',
      VOLAM_DEV_TAY_DOC: '1',
      VOLAM_DEV_LEGACY_SKILLS: undefined,
      VOLAM_DEV_SKILLS: undefined,
      VOLAM_DEV_PRACTICE_CREEPS: undefined,
      VOLAM_INVASION_INTERVAL_SECONDS: undefined,
      VOLAM_DEV_STATUE_HP: undefined,
    },
    configure: async (_server, owned) => {
      await startQaHttpFixture(
        owned,
        {
          port: 2799,
          runId: session.runId,
          serverUrl: session.serverUrl,
          protocolVersion: PROTOCOL_VERSION,
        },
        async (req, res) => {
          try {
            let body = '';
            for await (const chunk of req) body += chunk;
            const input = JSON.parse(body || '{}') as {
              roomId: string;
              op: string;
              phase?: string;
              ability?: TayDocAbility;
              dir?: string;
            };
            const room = matchMaker.getLocalRoomById(
              input.roomId,
            ) as unknown as MatchRoom;
            if (!room) throw Error('Unknown owned QA room');
            const sim = room.simulation,
              e = sim.tayDoc!,
              w = room.world,
              b = w.creeps.get(e.bossId)!;
            if (input.op === 'arrange') {
              e.clear(w);
              e.phase = input.phase === 'phase2' ? 'phase2' : 'phase1';
              e.nextActionAt = Infinity;
              b.x = 700;
              b.y = 616;
              b.hp = input.phase === 'phase2' ? 1200 : b.maxHp;
              b.pose = 'idle';
              b.castAbilityId = '';
              const vector = (
                {
                  left: [-1, 0],
                  right: [1, 0],
                  up: [0, -1],
                  down: [0, 1],
                } as Record<string, number[]>
              )[input.dir ?? 'right']!;
              b.fx = vector[0]!;
              b.fy = vector[1]!;
              let i = 0;
              for (const h of w.heroes.values()) {
                h.x =
                  b.x +
                  vector[0]! *
                    (input.ability ? 230 : input.phase === 'walk' ? 220 : 90);
                h.y =
                  b.y +
                  vector[1]! *
                    (input.ability ? 230 : input.phase === 'walk' ? 220 : 90) +
                  i++ * 20;
                h.hp = h.maxHp = 100000;
                h.moveX = 0;
                h.moveY = 0;
              }
              if (input.phase === 'transition') b.hp = 1200;
              if (input.ability)
                e.begin(
                  w,
                  sim.arena.config,
                  input.ability,
                  [...w.heroes.values()][0]!,
                );
            } else if (input.op === 'death') {
              b.hp = 0;
              sim.step();
            } else if (input.op === 'depart') {
              sim.enter([...w.heroes.keys()][1]!, 'private');
            } else if (input.op === 'inspect') {
              /* Read only, including natural run. */
            } else throw Error('Unsupported fixture operation');
            res.setHeader('content-type', 'application/json');
            res.end(
              JSON.stringify({
                view: e.view(w),
                tick: sim.tick,
                statue: w.statue?.hp,
              }),
            );
          } catch (error) {
            res.statusCode = 500;
            res.end(String(error));
          }
        },
      );
      return {
        root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
        configFile: false,
        cacheDir: '.cache/tay-doc-vite',
        server: {
          host: '127.0.0.1',
          port: 5399,
          strictPort: true,
          hmr: false,
          watch: null,
        },
        define: {
          'import.meta.env.VITE_SERVER_URL': JSON.stringify(
            'http://127.0.0.1:2798',
          ),
        },
      };
    },
  });
}
