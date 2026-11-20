import { matchMaker } from '@colyseus/core';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
import { qaSession } from './qa-session.mjs';
import { serveQaChild } from './qa-children.mjs';
import { startOwnedGameQa } from './qa-game-services.mjs';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createGameServer } from '../apps/game-server/dist/app.config.js';
import { browserSocketOptions } from '../apps/game-server/dist/socket-config.js';

class IterationTransport extends WebSocketTransport {
  async clearSockets() {
    for (const socket of this.wss.clients) socket.terminate();
    const deadline = Date.now() + 3000;
    while (this.wss.clients.size && Date.now() < deadline)
      await new Promise((done) => setTimeout(done, 20));
    if (this.wss.clients.size) throw Error('QA reset left sockets behind');
    return this.wss.clients.size;
  }
}
const transport = new IterationTransport({ ...browserSocketOptions });

const session = qaSession();
let resetting = false;
process.on('message', async (message) => {
  if (message?.type !== 'reset' || message.runId !== session.runId) return;
  try {
    if (resetting) throw Error('Overlapping QA reset');
    resetting = true;
    const rooms = await matchMaker.query({});
    await Promise.all(
      rooms.map(({ roomId }) => {
        const room = matchMaker.getLocalRoomById(roomId);
        if (!room) throw Error('QA reset found a non-local room');
        return room.disconnect();
      }),
    );
    const remaining = await matchMaker.query({});
    if (remaining.length) throw Error('QA reset left rooms behind');
    const sockets = await transport.clearSockets();
    process.send?.({
      type: 'reset-result',
      runId: session.runId,
      requestId: message.requestId,
      pid: process.pid,
      disposed: rooms.length,
      remaining: 0,
      sockets,
    });
  } catch (error) {
    process.send?.({
      type: 'reset-result',
      runId: session.runId,
      requestId: message.requestId,
      error: error.message,
    });
  } finally {
    resetting = false;
  }
});
await serveQaChild(session, PROTOCOL_VERSION, () =>
  startOwnedGameQa({
    session,
    clientMode: 'development',
    serverFactory: () => createGameServer(transport),
    environment: { NODE_ENV: 'development', VOLAM_DEV_PRACTICE_CREEPS: '1' },
  }),
);
