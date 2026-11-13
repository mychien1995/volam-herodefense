import { resolve } from 'node:path';
import { preview } from 'vite';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';

export default async function setup() {
  if (process.env['VOLAM_DUONG_MON_USE_LIVE'] === '1') return;
  const env = {
    NODE_ENV: 'development',
    VOLAM_DEV_DUONG_MON: '1',
    VOLAM_DEV_PRACTICE_CREEPS: '1',
  };
  const old = Object.fromEntries(
    Object.keys(env).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, env);
  const server = createGameServer();
  try {
    await server.listen(Number(process.env['VOLAM_QA_SERVER_PORT'] ?? 2794));
    const client = await preview({
      configFile: false,
      root: resolve('apps/game-client'),
      preview: {
        host: '127.0.0.1',
        port: Number(process.env['VOLAM_QA_CLIENT_PORT'] ?? 5574),
        strictPort: true,
      },
    });
    return async () => {
      await Promise.all([
        server.gracefullyShutdown(false),
        new Promise<void>((done, reject) =>
          client.httpServer.close((error) => (error ? reject(error) : done())),
        ),
      ]);
      for (const [key, value] of Object.entries(old)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    };
  } catch (error) {
    await server.gracefullyShutdown(false);
    throw error;
  }
}
