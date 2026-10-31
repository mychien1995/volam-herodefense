import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';
export default async function setup() {
  const server = createGameServer();
  await server.listen(2587);
  try {
    const client = await preview({
      root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
      configFile: false,
      preview: { host: '127.0.0.1', port: 5187, strictPort: true },
    });
    return async () => {
      await client.close();
      await server.gracefullyShutdown(false);
    };
  } catch (e) {
    await server.gracefullyShutdown(false);
    throw e;
  }
}
