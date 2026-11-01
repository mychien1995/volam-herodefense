import { WebSocketTransport } from '@colyseus/ws-transport';
// Test-owned services: reporting backpressure must never pause a room clock.
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';
const preview = process.argv[2] === 'preview';
process.env.NODE_ENV = 'development';
if (preview) {
  process.env.VOLAM_DEV_LEGACY_SKILLS = '1';
  process.env.VOLAM_DEV_SKILLS = '1';
} else {
  delete process.env.VOLAM_DEV_LEGACY_SKILLS;
  delete process.env.VOLAM_DEV_SKILLS;
}
// Animation review needs canonical pacing while six clients configure legal builds.
process.env.VOLAM_INVASION_INTERVAL_SECONDS = process.env.VOLAM_ANIMATION_CHANGE
  ? '180'
  : '30';
process.env.VOLAM_DEV_STATUE_HP = '100000';
const offset = Number(process.env.VOLAM_TEST_PORT_OFFSET ?? 0);
const serverPort = (preview ? 2588 : 2586) + offset,
  clientPort = (preview ? 5192 : 5190) + offset;
process.env['VOLAM_DEV_PRACTICE_CREEPS'] = '1'; // Explicit historical combat fixture.
// Loading six raster clients can stall the headless host beyond the default heartbeat.
// Only this QA-owned transport gets a longer allowance; production defaults stay intact.
const server = createGameServer(
  process.env.VOLAM_ANIMATION_CHANGE
    ? new WebSocketTransport({
        maxPayload: 2048,
        pingInterval: 10000,
        pingMaxRetries: 6,
      })
    : undefined,
);
const client = await createServer({
  root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
  cacheDir: fileURLToPath(
    new URL(
      '../../.cache/vite-m3c3-' +
        (preview ? 'preview' : 'normal') +
        '-' +
        offset,
      import.meta.url,
    ),
  ),
  configFile: false,
  server: {
    host: '127.0.0.1',
    port: clientPort,
    strictPort: true,
    watch: null,
    hmr: false,
  },
  define: {
    'import.meta.env.VITE_SERVER_URL': JSON.stringify(
      'http://localhost:' + serverPort,
    ),
  },
});
await server.listen(serverPort);
await client.listen();
if (!(await fetch('http://127.0.0.1:' + serverPort + '/health')).ok)
  throw Error('Server health failed');
process.on('message', async (message) => {
  if (message === 'stop') {
    await client.close();
    await server.gracefullyShutdown(false);
    process.exit(0);
  }
});
process.send?.({ ready: true });
