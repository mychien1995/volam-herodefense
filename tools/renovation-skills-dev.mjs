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

// Isolated review process, using the existing server-authorized practice commands.
// Normal matches do not enable any of these development flags.
if (process.env.NODE_ENV === 'production')
  throw Error('Skill review is development-only.');
const session = qaSession({
  profile: 'renovation-skills-review',
  serverPort: 2937,
  clientPort: 5537,
});
const owned = ownedQaServices();
try {
  await requireFreePorts(session);
  Object.assign(process.env, {
    NODE_ENV: 'development',
    VOLAM_QA_RUN_ID: session.runId,
    VOLAM_DEV_LEGACY_SKILLS: '1',
    VOLAM_DEV_SKILLS: '1',
    VOLAM_DEV_PRACTICE_CREEPS: '1',
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
    cacheDir: session.cacheDir ?? '.cache/vite-renovation-skills-review',
    server: { host: '127.0.0.1', port: session.clientPort, strictPort: true },
    define: {
      'import.meta.env.VITE_SERVER_URL': JSON.stringify(session.serverUrl),
    },
  });
  await client.listen();
  owned.add(() => client.close());
  console.log(
    'Skill review: ' + session.clientUrl + '/?debug=1&skillPreview=1',
  );
  console.log(
    'Original skills: ' +
      session.clientUrl +
      '/?debug=1&skillPreview=1&renovationSkills=old',
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
