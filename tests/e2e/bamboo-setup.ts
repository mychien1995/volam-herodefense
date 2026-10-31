import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';
import { ColyseusTestServer } from '@colyseus/testing';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { PROTOCOL_VERSION, type ServerMessages } from '@volam/game-protocol';
import { forestTypes } from '../../apps/game-client/src/forest-creeps.js';

/** Isolated services; no edits to user servers or compiled client endpoints. */
export default async function setup() {
  process.env['VOLAM_DEV_PRACTICE_CREEPS'] = '1'; // Explicit historical combat fixture.
  const server = createGameServer();
  await server.listen(2587);
  const authority = new ColyseusTestServer(server);
  const reviewEvents = new Map<string, ServerMessages['combat-event']>();
  try {
    const client = await createServer({
      root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
      configFile: false,
      server: {
        host: '127.0.0.1',
        port: 5187,
        strictPort: true,
        watch: null,
        hmr: false,
      },
      define: {
        'import.meta.env.VITE_SERVER_URL': JSON.stringify(
          'http://127.0.0.1:2587',
        ),
      },
      plugins: [
        {
          name: 'bamboo-test-pose-fixture',
          configureServer(client) {
            client.middlewares.use('/__bamboo-pose', poseFixture);
          },
        },
      ],
    });
    // Test-service-only pose fixture. Never shipped in the game/client protocol.
    // Ordinary dungeon tests still exercise natural AI, hits and rewards separately.
    function poseFixture(req: IncomingMessage, res: ServerResponse) {
      try {
        const query = new URL(req.url ?? '/', 'http://127.0.0.1').searchParams;
        const pose = query.get('pose');
        if (
          req.method !== 'POST' ||
          !['idle', 'walk', 'basic_attack', 'cast', 'hurt', 'death'].includes(
            pose ?? '',
          )
        )
          throw Error('Invalid test pose');
        const room = authority.getRoomById<MatchRoom>(query.get('room') ?? '');
        const zone = [...room.simulation.zones.values()].find(
          (z) => z.access === 'shared',
        );
        if (!zone || zone.world.creeps.size < 2)
          throw Error('Expected populated shared forest');
        const directions = {
          down: [0, 1],
          left: [-1, 0],
          right: [1, 0],
          up: [0, -1],
        } as const;
        const direction =
          directions[query.get('direction') as keyof typeof directions];
        if (!direction) throw Error('Invalid test direction');
        const ids: string[] = [];
        const archetype = query.get('archetype');
        if (
          archetype &&
          !forestTypes.includes(archetype as (typeof forestTypes)[number])
        )
          throw Error('Unknown forest review type');
        if (query.get('remove') === '1') {
          const first = zone.world.creeps.keys().next().value!;
          zone.world.creeps.delete(first);
          res.end(JSON.stringify({ removed: `${zone.id}:${first}` }));
          return;
        }
        for (const [i, creep] of [...zone.world.creeps.values()].entries()) {
          creep.statuses = [
            {
              kind: 'stun',
              sourceId: 'test',
              abilityId: 'pose_fixture',
              durationTicks: 3000,
              magnitude: 1,
              until: zone.world.tick + 3000,
            },
          ];
          creep.cooldown = creep.actionUntil = zone.world.tick + 3000;
          creep.hurtUntil = 0;
          if (i >= (archetype ? 2 : 1)) continue; // Keep a living wave sentinel.
          if (archetype) creep.archetypeId = archetype;
          creep.x = 400 + i * 72;
          creep.y = 400;
          [creep.fx, creep.fy] = direction;
          creep.hp = pose === 'death' ? 0 : creep.maxHp;
          creep.pose = pose as typeof creep.pose;
          ids.push(`${zone.id}:${creep.id}`);
        }
        let emitted: ServerMessages['combat-event'] | undefined;
        const kind = query.get('emit');
        if (kind) {
          if (!archetype)
            throw Error('Controlled Forest event requires explicit archetype');
          if (kind === 'replay') emitted = reviewEvents.get(room.roomId);
          else {
            if (!['attack', 'hit'].includes(kind))
              throw Error('Unsupported review event');
            const target = zone.world.heroes.values().next().value!;
            // Test service only: use the real room event sequence and delivery ordering.
            // This visual fixture does not execute a hit or mutate HP/rewards.
            const sequence = room as unknown as { eventSequence: number };
            emitted = {
              protocolVersion: PROTOCOL_VERSION,
              id: ++sequence.eventSequence,
              kind: kind as 'hit' | 'attack',
              sourceId: ids[0]!,
              targetId: target.id,
              abilityId: 'creep_strike',
              damage: 0,
              critical: false,
              x: target.x,
              y: target.y,
              zoneId: zone.id,
              fx: direction[0],
              fy: direction[1],
            };
            reviewEvents.set(room.roomId, emitted);
          }
          if (!emitted) throw Error('No event available to replay');
          room.broadcast('combat-event', emitted, { afterNextPatch: true });
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ids, event: emitted }));
      } catch (e) {
        res.statusCode = 400;
        res.end(String(e));
      }
    }
    await client.listen();
    return async () => {
      await client.close();
      await server.gracefullyShutdown(false);
    };
  } catch (e) {
    await server.gracefullyShutdown(false);
    throw e;
  }
}
