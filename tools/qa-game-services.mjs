import { resolve } from 'node:path';
import { createServer, preview } from 'vite';
import { createGameServer } from '../apps/game-server/dist/app.config.js';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
import { qaWorkflowSession, qaIdentityPlugin } from './qa-session.mjs';
import { verifyQaBuild } from './qa-preflight.mjs';
import { runQaFixture } from './qa-fixture.mjs';
/** Preserve each fixture's flags/plugins; only lifecycle is shared. */
export async function startOwnedGameQa(options = {}) {
  const session =
    options.session ??
    qaWorkflowSession('browser', [
      '--config',
      options.config ?? 'playwright.config.ts',
    ]);
  if (options.config && !session.contract)
    throw Error('Owned QA requires a registered profile or explicit session');
  const isPreview =
    (options.clientMode ?? session.contract?.clientMode) !== 'development';
  const hasServer = !session.contract?.services.every(
    (service) => service.serverPort === undefined,
  );
  return runQaFixture({
    session,
    environment: options.environment ?? {},
    protocolVersion: PROTOCOL_VERSION,
    preview: isPreview,
    verifyBuild: () =>
      verifyQaBuild(
        resolve('.'),
        session.contract
          ? {
              ...session,
              contract: { ...session.contract, clientMode: 'preview' },
            }
          : session,
      ),
    ...(hasServer
      ? { createServer: options.serverFactory ?? createGameServer }
      : {}),
    configure: async (server, owned) =>
      (await options.configure?.(server, owned)) ?? undefined,
    createClient: (configured) => {
      const config = {
        root: resolve('apps/game-client'),
        ...(options.loadClientConfig ? {} : { configFile: false }),
        ...options.client,
        ...configured,
      };
      config.plugins = [qaIdentityPlugin(session), ...(config.plugins ?? [])];
      config.define = {
        ...(config.configFile === false
          ? { __VOLAM_RASTER_ALIASES__: '{}' }
          : {}),
        ...config.define,
        'import.meta.env.VITE_SERVER_URL': JSON.stringify(session.serverUrl),
      };
      const address = {
        host: '127.0.0.1',
        port: session.clientPort,
        strictPort: true,
      };
      return isPreview
        ? preview({
            ...config,
            preview: {
              ...config.preview,
              ...address,
            },
          })
        : createServer({
            ...config,
            server: {
              watch: null,
              hmr: false,
              ...config.server,
              ...address,
            },
          });
    },
  });
}
