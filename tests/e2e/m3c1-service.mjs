// Test-owned services: reporting backpressure must never pause a room clock.
import { fileURLToPath } from 'node:url';
import { createGameServer } from '../../apps/game-server/dist/app.config.js';
const preview = process.argv[2] === 'preview';
process.env.NODE_ENV = 'development';
if (preview) {
  process.env.VOLAM_DEV_LEGACY_SKILLS = '1';
  process.env.VOLAM_DEV_SKILLS = '1';
} else {
  delete process.env.VOLAM_DEV_LEGACY_SKILLS;
  delete process.env.VOLAM_DEV_SKILLS;
}
process.env.VOLAM_INVASION_INTERVAL_SECONDS = '30';
process.env.VOLAM_DEV_STATUE_HP = '100000';
const serverPort = preview ? 2576 : 2574,
  clientPort = preview ? 5180 : 5178;
process.env['VOLAM_DEV_PRACTICE_CREEPS'] = '1'; // Explicit historical combat fixture.

import { qaSession } from '../../tools/qa-session.mjs';
import { startOwnedGameQa } from '../../tools/qa-game-services.mjs';
import { serveQaChild } from '../../tools/qa-children.mjs';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
const session = qaSession({ profile: 'm3c1', serverPort, clientPort });
await serveQaChild(session, PROTOCOL_VERSION, () =>
  startOwnedGameQa({
    session,
    clientMode: 'development',
    serverFactory: () => createGameServer(),
    client: {
      root: fileURLToPath(new URL('../../apps/game-client', import.meta.url)),
      cacheDir: fileURLToPath(
        new URL(
          '../../.cache/vite-m3c1-' + (preview ? 'preview' : 'normal'),
          import.meta.url,
        ),
      ),
      configFile: false,
      server: {
        host: '127.0.0.1',
        port: clientPort,
        strictPort: true,
        watch: null,
        hmr: false,
      },
      define: {
        'import.meta.env.VITE_SERVER_URL': JSON.stringify(
          'http://localhost:' + serverPort,
        ),
      },
    },
  }),
);
