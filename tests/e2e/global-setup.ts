import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
import {
  qaSession,
  requireFreePorts,
  verifyQaIdentity,
  qaIdentityPlugin,
  ownedQaServices,
} from '../../tools/qa-session.mjs';

/** Own both services; never borrow or stop another session's healthy port. */
export default async function setup(): Promise<() => Promise<void>> {
  const session = qaSession();
  const owned = ownedQaServices();
  const originalRun = process.env['VOLAM_QA_RUN_ID'];
  const originalPractice = process.env['VOLAM_DEV_PRACTICE_CREEPS'];
  const originalNodeEnv = process.env['NODE_ENV'];
  const cleanup = async () => {
    try {
      await owned.close();
    } finally {
      for (const [key, value] of Object.entries({
        VOLAM_QA_RUN_ID: originalRun,
        VOLAM_DEV_PRACTICE_CREEPS: originalPractice,
        NODE_ENV: originalNodeEnv,
      })) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  };
  const started = performance.now();
  try {
    await requireFreePorts(session);
    // Vite preview otherwise defaults this shared process to production,
    // disabling the existing server-only historical combat fixture.
    process.env['NODE_ENV'] = 'development';
    process.env['VOLAM_QA_RUN_ID'] = session.runId;
    process.env['VOLAM_DEV_PRACTICE_CREEPS'] = '1'; // Explicit historical combat fixture.
    const server = createGameServer();
    await server.listen(session.serverPort);
    owned.add(() => server.gracefullyShutdown(false));
    await verifyQaIdentity(`${session.serverUrl}/health`, {
      service: 'volam-game-server',
      runId: session.runId,
      protocolVersion: PROTOCOL_VERSION,
    });
    const client = await preview({
      root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
      configFile: false,
      plugins: [qaIdentityPlugin(session)],
      preview: {
        host: '127.0.0.1',
        port: session.clientPort,
        strictPort: true,
      },
    });
    owned.add(() => client.close());
    await verifyQaIdentity(`${session.clientUrl}/__volam_qa_identity`, {
      service: 'volam-qa-client',
      runId: session.runId,
      serverUrl: session.serverUrl,
    });
    await verifyQaIdentity(`${session.clientUrl}/volam-build-endpoint.json`, {
      serverUrl: session.serverUrl,
    });
    console.info(
      `[QA] owned services verified in ${((performance.now() - started) / 1000).toFixed(2)}s; run=${session.runId}; client=${session.clientUrl}; server=${session.serverUrl}`,
    );
    return cleanup;
  } catch (error) {
    await cleanup();
    throw error;
  }
}
