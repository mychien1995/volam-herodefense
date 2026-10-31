import {
  matchMaker,
  defineServer,
  defineRoom,
  createEndpoint,
  createRouter,
} from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { PROTOCOL_VERSION, MATCH_ROOM } from '@volam/game-protocol';
import { MatchRoom } from './rooms/MatchRoom.js';
import { serverInvasionDefinition } from './invasion-config.js';

export function createGameServer() {
  serverInvasionDefinition(); // Fail startup, rather than the first room, for invalid dev tuning.
  return defineServer({
    transport: new WebSocketTransport({ maxPayload: 2048 }),
    rooms: { [MATCH_ROOM]: defineRoom(MatchRoom) },
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
        }));
      }),
      health: createEndpoint('/health', { method: 'GET' }, async () => ({
        status: 'ok',
        milestone: 'M3B',
        protocolVersion: PROTOCOL_VERSION,
      })),
    }),
  });
}
