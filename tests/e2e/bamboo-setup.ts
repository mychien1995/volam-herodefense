import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';

/** Isolated services; no edits to user servers or compiled client endpoints. */
export default async function setup() {
  process.env['VOLAM_DEV_PRACTICE_CREEPS'] = '1'; // Explicit historical combat fixture.
const server = createGameServer();
  await server.listen(2587);
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
    });
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
