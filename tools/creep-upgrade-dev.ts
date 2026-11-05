import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createGameServer } from '../apps/game-server/dist/app.config.js';
import { qaSession, requireFreePorts, ownedQaServices } from './qa-session.mjs';
if (process.env['NODE_ENV'] === 'production')
  throw Error('This helper is development-only');
process.env['NODE_ENV'] = 'development';
const session = qaSession({
  serverPort: 2931,
  clientPort: 5531,
  profile: 'creep-upgrade-dev',
});
await requireFreePorts(session);
const owned = ownedQaServices();
try {
  const server = createGameServer();
  await server.listen(session.serverPort);
  owned.add(() => server.gracefullyShutdown(false));
  const client = await createServer({
    root: fileURLToPath(new URL('../apps/game-client', import.meta.url)),
    configFile: false,
    cacheDir: '.cache/vite-creep-upgrade-dev',
    define: {
      'import.meta.env.VITE_SERVER_URL': JSON.stringify(session.serverUrl),
    },
    server: {
      host: '127.0.0.1',
      port: session.clientPort,
      strictPort: true,
      hmr: false,
      watch: null,
    },
  });
  await client.listen();
  owned.add(() => client.close());
  console.info(
    `Creep upgrade: ${session.clientUrl} — ${session.serverUrl} — DEV_CREEP_TEST=${process.env['VOLAM_DEV_CREEP_TEST'] ?? 'off'}`,
  );
  for (const event of ['SIGINT', 'SIGTERM'] as const)
    process.once(event, () => {
      void owned.close().then(() => process.exit(0));
    });
} catch (error) {
  await owned.close();
  throw error;
}
