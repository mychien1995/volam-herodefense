import { createServer } from 'node:http';
import { ColyseusTestServer } from '@colyseus/testing';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createGameServer } from '../apps/game-server/src/app.config.js';
import { browserSocketOptions } from '../apps/game-server/src/socket-config.js';

export async function startRoomTestServer(port = 0) {
  const http = createServer();
  const game = createGameServer(
    new WebSocketTransport({ ...browserSocketOptions, server: http }),
  );
  let rejectBinding!: (cause: Error) => void;
  const bindingFailure = new Promise<never>((_, reject) => {
    rejectBinding = reject;
  });
  // The SDK's listen promise starts observing HTTP errors after binding.
  http.once('error', rejectBinding);
  try {
    await Promise.race([game.listen(port, '127.0.0.1'), bindingFailure]);
  } catch (cause) {
    await game.gracefullyShutdown(false);
    throw cause;
  } finally {
    http.off('error', rejectBinding);
  }
  const address = http.address();
  if (!address || typeof address === 'string')
    throw Error('Room test server has no TCP address');
  // The upstream test adapter reads Server.port, which retains the requested
  // port (0) when the operating system chooses the actual listening port.
  Object.assign(game, { port: address.port });
  return new ColyseusTestServer(game);
}
