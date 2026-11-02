import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';
import { createM3dFixture } from './m3d-feedback-setup.js';
import productionSetup from './global-setup.js';
import { qaSession, requireFreePorts } from '../../tools/qa-session.mjs';

export default async function setup() {
  if (process.env['VOLAM_QA_DEV_CLIENT'] !== '1')
    return createM3dFixture(productionSetup);
  return createM3dFixture(async () => {
    const s = qaSession();
    await requireFreePorts(s);
    const previous = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'development';
    const server = createGameServer();
    await server.listen(s.serverPort);
    const vite = await createViteServer({
      root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
      server: { host: '127.0.0.1', port: s.clientPort, strictPort: true },
      ...(s.cacheDir ? { cacheDir: s.cacheDir } : {}),
    });
    try {
      await vite.listen();
    } catch (e) {
      await server.gracefullyShutdown(false);
      throw e;
    }
    console.info(
      `[r3 dev iteration] ${s.clientUrl} / ${s.serverUrl}; no production bundle changed`,
    );
    return async () => {
      await vite.close();
      await server.gracefullyShutdown(false);
      if (previous === undefined) delete process.env['NODE_ENV'];
      else process.env['NODE_ENV'] = previous;
    };
  });
}
