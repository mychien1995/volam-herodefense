import { createServer } from 'vite';
import { resolve } from 'node:path';
import { createGameServer } from '../apps/game-server/dist/app.config.js';
import {
  qaSession,
  requireFreePorts,
  qaIdentityPlugin,
  ownedQaServices,
  verifyQaIdentity,
} from './qa-session.mjs';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
if (process.env.NODE_ENV === 'production')
  throw Error('Wave boss review is development-only');
const session = qaSession({
    profile: 'renovation-wave-boss-review',
    serverPort: 2948,
    clientPort: 5548,
  }),
  owned = ownedQaServices();
try {
  await requireFreePorts(session);
  Object.assign(process.env, {
    NODE_ENV: 'development',
    VOLAM_QA_RUN_ID: session.runId,
    VOLAM_DEV_LEGACY_SKILLS: '1',
    VOLAM_DEV_SKILLS: '1',
    VOLAM_DEV_PRACTICE_CREEPS: '1',
    VOLAM_DEV_WAVE_BOSSES: '1',
    VOLAM_DEV_FINAL_BOSS: '1',
  });
  const server = createGameServer();
  await server.listen(session.serverPort);
  owned.add(() => server.gracefullyShutdown(false));
  await verifyQaIdentity(session.serverUrl + '/health', {
    runId: session.runId,
    protocolVersion: PROTOCOL_VERSION,
  });
  const client = await createServer({
    root: resolve('apps/game-client'),
    configFile: false,
    plugins: [qaIdentityPlugin(session)],
    cacheDir: session.cacheDir,
    server: { host: '127.0.0.1', port: session.clientPort, strictPort: true },
    define: {
      'import.meta.env.VITE_SERVER_URL': JSON.stringify(session.serverUrl),
    },
  });
  await client.listen();
  owned.add(() => client.close());
  console.log(
    'Wave boss review: ' + session.clientUrl + '/?debug=1&skillPreview=1',
  );
  console.log(
    'Level30 / max skills / no skill cooldown / invulnerable / boss hit -5% / all five real encounters in order.',
  );
  const close = async () => {
    await owned.close();
    process.exit(0);
  };
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
} catch (e) {
  await owned.close();
  throw e;
}
