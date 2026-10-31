import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';

/** Isolated real services. No runtime mutation/debug commands or reused dev servers. */
export default async function setup() {
  const original = {
    NODE_ENV: process.env['NODE_ENV'],
    VOLAM_INVASION_INTERVAL_SECONDS:
      process.env['VOLAM_INVASION_INTERVAL_SECONDS'],
    VOLAM_DEV_STATUE_HP: process.env['VOLAM_DEV_STATUE_HP'],
  };
  process.env['NODE_ENV'] = 'development';
  process.env['VOLAM_INVASION_INTERVAL_SECONDS'] = '6';
  process.env['VOLAM_DEV_STATUE_HP'] = '300';
  const closers: Array<() => Promise<unknown>> = [];
  const cleanup = async () => {
    await Promise.all(closers.reverse().map((close) => close()));
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
  try {
    process.env['VOLAM_DEV_PRACTICE_CREEPS'] = '1'; // Explicit historical combat fixture.
const server = createGameServer();
    await server.listen(2570);
    closers.push(() => server.gracefullyShutdown(false));
    const client = await createServer({
      root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
      configFile: false,
      server: {
        host: '127.0.0.1',
        port: 5174,
        strictPort: true,
        watch: null,
        hmr: false,
      },
      define: {
        'import.meta.env.VITE_SERVER_URL': JSON.stringify(
          'http://localhost:2570',
        ),
      },
    });
    await client.listen();
    closers.push(() => client.close());
    return cleanup;
  } catch (error) {
    await cleanup();
    throw error;
  }
}
