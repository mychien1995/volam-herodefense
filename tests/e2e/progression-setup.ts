import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';
/** Own isolated services; no borrowed user server and no test XP/rank/HP mutation. */
export default async function setup() {
  const keys = [
    'NODE_ENV',
    'VOLAM_DEV_LEGACY_SKILLS',
    'VOLAM_DEV_SKILLS',
    'VOLAM_INVASION_INTERVAL_SECONDS',
    'VOLAM_DEV_STATUE_HP',
  ] as const;
  const old = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  process.env['NODE_ENV'] = 'development';
  delete process.env['VOLAM_DEV_LEGACY_SKILLS'];
  delete process.env['VOLAM_DEV_SKILLS'];
  process.env['VOLAM_INVASION_INTERVAL_SECONDS'] = '30';
  process.env['VOLAM_DEV_STATUE_HP'] = '100000';
  const closers: Array<() => Promise<unknown>> = [];
  const cleanup = async () => {
    await Promise.all(closers.reverse().map((c) => c()));
    for (const k of keys) {
      if (old[k] === undefined) delete process.env[k];
      else process.env[k] = old[k];
    }
  };
  try {
    process.env['VOLAM_DEV_PRACTICE_CREEPS'] = '1'; // Explicit historical combat fixture.
const server = createGameServer();
    await server.listen(2574);
    closers.push(() => server.gracefullyShutdown(false));
    const browser = await createServer({
      root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
      configFile: false,
      server: {
        host: '127.0.0.1',
        port: 5178,
        strictPort: true,
        watch: null,
        hmr: false,
      },
      define: {
        'import.meta.env.VITE_SERVER_URL': JSON.stringify(
          'http://localhost:2574',
        ),
      },
    });
    await browser.listen();
    closers.push(() => browser.close());
    return cleanup;
  } catch (e) {
    await cleanup();
    throw e;
  }
}
