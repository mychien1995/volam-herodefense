import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';
// Own services and ports; no changes to skill mechanics or another chat's servers.
export default async function setup(): Promise<() => Promise<void>> {
  // These historical M1/M3A gameplay fixtures predate point-validated M3B loadouts.
  // docs/M3B_RULES.md explicitly reserves this non-production adapter for them.
  const previousLegacy = process.env['VOLAM_DEV_LEGACY_SKILLS'];
  process.env['VOLAM_DEV_LEGACY_SKILLS'] = '1';
  const restoreLegacy = (): void => {
    if (previousLegacy === undefined)
      delete process.env['VOLAM_DEV_LEGACY_SKILLS'];
    else process.env['VOLAM_DEV_LEGACY_SKILLS'] = previousLegacy;
  };
  process.env['VOLAM_DEV_PRACTICE_CREEPS'] = '1'; // Explicit historical combat fixture.
const server = createGameServer();
  const client = await createServer({
    root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
    configFile: false,
    cacheDir: fileURLToPath(
      new URL('../../.cache/vite-vo-dang-skills', import.meta.url),
    ),
    define: {
      'import.meta.env.VITE_SERVER_URL': JSON.stringify(
        'http://127.0.0.1:2626',
      ),
    },
    server: {
      host: '127.0.0.1',
      port: 5216,
      strictPort: true,
      watch: null,
      hmr: false,
    },
  });
  try {
    await server.listen(2626);
    await client.listen();
    if (!(await fetch('http://127.0.0.1:2626/health')).ok)
      throw new Error('Dedicated skill-art regression server not healthy');
  } catch (error) {
    await client.close();
    await server.gracefullyShutdown(false);
    restoreLegacy();
    throw error;
  }
  return async () => {
    await client.close();
    await server.gracefullyShutdown(false);
    restoreLegacy();
  };
}
