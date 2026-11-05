import { preview } from 'vite';
import { resolve } from 'node:path';
import { createGameServer } from '../apps/game-server/dist/app.config.js';
import {
  qaSession,
  requireFreePorts,
  qaIdentityPlugin,
  ownedQaServices,
  verifyQaIdentity,
} from './qa-session.mjs';
const session = qaSession({
  profile: 'renovation-play',
  serverPort: 2926,
  clientPort: 5529,
});
const owned = ownedQaServices();
try {
  await requireFreePorts(session);
  process.env.NODE_ENV = 'development';
  process.env.VOLAM_QA_RUN_ID = session.runId;
  const server = createGameServer();
  await server.listen(session.serverPort);
  owned.add(() => server.gracefullyShutdown(false));
  const client = await preview({
    root: resolve('apps/game-client'),
    configFile: false,
    plugins: [qaIdentityPlugin(session)],
    preview: { host: '127.0.0.1', port: session.clientPort, strictPort: true },
  });
  owned.add(() => client.close());
  await verifyQaIdentity(session.clientUrl + '/volam-build-endpoint.json', {
    serverUrl: session.serverUrl,
  });
  console.log(
    'Renovated normal game: ' +
      session.clientUrl +
      ' (new rooms; no QA encounter fixtures)',
  );
  const close = async () => {
    await owned.close();
    process.exit(0);
  };
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
} catch (error) {
  await owned.close();
  throw error;
}
