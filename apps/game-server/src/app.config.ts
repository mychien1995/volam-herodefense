import {
  matchMaker,
  defineServer,
  defineRoom,
  createEndpoint,
  createRouter,
} from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Encoder } from '@colyseus/schema';
import { PROTOCOL_VERSION, MATCH_ROOM } from '@volam/game-protocol';
import { MatchRoom } from './rooms/MatchRoom.js';
import { StandaloneLoiDaiRoom } from './rooms/StandaloneLoiDaiRoom.js';
import { PVP_ROOM, PRACTICE_ROOM } from '@volam/game-protocol';
import { PracticeRoom } from './rooms/PracticeRoom.js';
import { serverInvasionDefinition } from './invasion-config.js';
import { browserSocketOptions } from './socket-config.js';

export function createGameServer(transport?: WebSocketTransport) {
  // Dense boss waves use delta state, but the initial full snapshot needs room.
  Encoder.BUFFER_SIZE = Math.max(Encoder.BUFFER_SIZE, 128 * 1024);
  const validationRunId = process.env['VOLAM_QA_RUN_ID'];
  serverInvasionDefinition(); // Fail startup, rather than the first room, for invalid dev tuning.
  return defineServer({
    transport: transport ?? new WebSocketTransport({ ...browserSocketOptions }),
    rooms: {
      [MATCH_ROOM]: defineRoom(MatchRoom),
      [PVP_ROOM]: defineRoom(StandaloneLoiDaiRoom),
      [PRACTICE_ROOM]: defineRoom(PracticeRoom),
    },
    routes: createRouter({
      rooms: createEndpoint('/rooms', { method: 'GET' }, async () => {
        const rooms = await matchMaker.query({
          name: MATCH_ROOM,
          private: false,
        });
        return rooms.map((room) => ({
          roomId: room.roomId,
          clients: room.clients,
          maxClients: room.maxClients,
          locked: room.locked,
          phase: room.metadata?.phase ?? 'WAITING_LOBBY',
          arenaId: room.metadata?.arenaId ?? 'dao_hoa_dao',
        }));
      }),
      health: createEndpoint('/health', { method: 'GET' }, async () => ({
        status: 'ok',
        ...(validationRunId
          ? { service: 'volam-game-server', runId: validationRunId }
          : {}),
        milestone: 'M3B',
        protocolVersion: PROTOCOL_VERSION,
      })),
    }),
  });
}
