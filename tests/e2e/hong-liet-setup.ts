import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';
/** Dedicated natural-gameplay services. No test health/ranks/positions or boss shortcuts. */
export default async function setup() {
  const names = [
    'NODE_ENV',
    'VOLAM_DEV_LEGACY_SKILLS',
    'VOLAM_DEV_SKILLS',
    'VOLAM_DEV_PRACTICE_CREEPS',
    'VOLAM_INVASION_INTERVAL_SECONDS',
    'VOLAM_DEV_STATUE_HP',
  ] as const;
  const old = Object.fromEntries(names.map((k) => [k, process.env[k]]));
  process.env['NODE_ENV'] = 'development';
  for (const k of names.slice(1)) delete process.env[k];
  const server = createGameServer();
  await server.listen(2791);
  const client = await createServer({
    root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
    configFile: false,
    cacheDir: '.cache/hong-liet-vite',
    server: {
      host: '127.0.0.1',
      port: 5391,
      strictPort: true,
      hmr: false,
      watch: null,
    },
    define: {
      'import.meta.env.VITE_SERVER_URL': JSON.stringify(
        'http://127.0.0.1:2791',
      ),
    },
  });
  await client.listen();
  return async () => {
    await client.close();
    await server.gracefullyShutdown(false);
    for (const k of names) {
      if (old[k] === undefined) delete process.env[k];
      else process.env[k] = old[k];
    }
  };
}
