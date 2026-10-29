import {
  defineServer,
  defineRoom,
  createEndpoint,
  createRouter,
} from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { PROTOCOL_VERSION, MATCH_ROOM } from '@volam/game-protocol';
import { MatchRoom } from './rooms/MatchRoom.js';

export function createGameServer() {
  return defineServer({
    transport: new WebSocketTransport({ maxPayload: 2048 }),
    rooms: { [MATCH_ROOM]: defineRoom(MatchRoom) },
    routes: createRouter({
      health: createEndpoint('/health', { method: 'GET' }, async () => ({
        status: 'ok',
        milestone: 'M0',
        protocolVersion: PROTOCOL_VERSION,
      })),
    }),
  });
}
