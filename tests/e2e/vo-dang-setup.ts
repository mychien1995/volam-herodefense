import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';
// Own both services/ports and output paths. Never borrow another chat's dev/test server.
export default async function setup(): Promise<() => Promise<void>> {
  process.env['VOLAM_DEV_PRACTICE_CREEPS'] = '1'; // Explicit historical combat fixture.
const server = createGameServer();
  const client = await createServer({
    root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
    configFile: false,
    cacheDir: fileURLToPath(
      new URL('../../.cache/vite-vo-dang', import.meta.url),
    ),
    define: {
      'import.meta.env.VITE_SERVER_URL': JSON.stringify(
        'http://127.0.0.1:2602',
      ),
    },
    server: {
      host: '127.0.0.1',
      port: 5192,
      strictPort: true,
      watch: null,
      hmr: false,
    },
  });
  try {
    await server.listen(2602);
    await client.listen();
    const response = await fetch('http://127.0.0.1:2602/health');
    if (!response.ok) throw new Error('Dedicated art-test server not healthy');
  } catch (e) {
    await client.close();
    await server.gracefullyShutdown(false);
    throw e;
  }
  return async () => {
    await client.close();
    await server.gracefullyShutdown(false);
  };
}
