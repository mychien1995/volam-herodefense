// Test-owned services: reporting backpressure must never pause a room clock.
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';
const preview = false;
process.env.NODE_ENV = 'development';
if (preview) {
  process.env.VOLAM_DEV_LEGACY_SKILLS = '1';
  process.env.VOLAM_DEV_SKILLS = '1';
} else {
  delete process.env.VOLAM_DEV_LEGACY_SKILLS;
  delete process.env.VOLAM_DEV_SKILLS;
}
process.env.VOLAM_INVASION_INTERVAL_SECONDS = '8';
process.env.VOLAM_DEV_STATUE_HP = '100000';
const serverPort = preview ? 2594 : 2592,
  clientPort = preview ? 5198 : 5196;
delete process.env['VOLAM_DEV_PRACTICE_CREEPS'];
const server = createGameServer();
const client = await createServer({
  root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
  cacheDir: fileURLToPath(
    new URL(
      '../../.cache/vite-clean-match-' + (preview ? 'preview' : 'normal'),
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
