import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';
// Owned art-test services. No existing chat's server is borrowed.
export default async function setup(): Promise<() => Promise<void>> {
  // Existing gameplay regression expects the explicit legacy development loadout.
  // These process-local fixture flags do not alter production rules or Thiên Sơn kits.
  const keys = [
    'NODE_ENV',
    'VOLAM_DEV_SKILLS',
    'VOLAM_DEV_LEGACY_SKILLS',
  ] as const;
  const old = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  process.env['NODE_ENV'] = 'development';
  process.env['VOLAM_DEV_SKILLS'] = '1';
  process.env['VOLAM_DEV_LEGACY_SKILLS'] = '1';
  const restore = () => {
    for (const k of keys) {
      if (old[k] === undefined) delete process.env[k];
      else process.env[k] = old[k];
    }
  };
  process.env['VOLAM_DEV_PRACTICE_CREEPS'] = '1'; // Explicit historical combat fixture.
const server = createGameServer();
  const client = await createServer({
    root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
    configFile: false,
    cacheDir: fileURLToPath(
      new URL('../../.cache/vite-thien-son-skills', import.meta.url),
    ),
    define: {
      'import.meta.env.VITE_SERVER_URL': JSON.stringify(
        'http://127.0.0.1:2596',
      ),
    },
    server: {
      host: '127.0.0.1',
      port: 5196,
      strictPort: true,
      watch: null,
      hmr: false,
    },
  });
  try {
    await server.listen(2596);
    await client.listen();
    if (!(await fetch('http://127.0.0.1:2596/health')).ok)
      throw new Error('Art-test server not healthy');
  } catch (error) {
    await client.close();
    await server.gracefullyShutdown(false);
    restore();
    throw error;
  }
  return async () => {
    await client.close();
    try {
      await server.gracefullyShutdown(false);
    } finally {
      restore();
    }
  };
}
