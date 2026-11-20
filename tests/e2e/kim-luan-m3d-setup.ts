import { fileURLToPath } from 'node:url';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
import {
  qaWorkflowSession,
  qaEvidenceDirectory,
} from '../../tools/qa-session.mjs';
import { startQaChildren } from '../../tools/qa-children.mjs';
/** Separate Colyseus globals and teardown for each owned boss fixture. */
export default async function setup() {
  const session = qaWorkflowSession('browser', [
    '--config',
    'playwright.kim-luan-m3d.config.ts',
  ]);
  return startQaChildren({
    services: session.contract!.services.map((ports, index) => ({
      name: index === 0 ? 'kim' : 'ly',
      script: fileURLToPath(
        new URL('../../tools/qa-setup-child.mjs', import.meta.url),
      ),
      args: [
        fileURLToPath(
          new URL(
            index === 0 ? './kim-luan-setup.ts' : './ly-mac-sau-setup.ts',
            import.meta.url,
          ),
        ),
      ],
      serverPort: ports.serverPort!,
      clientPort: ports.clientPort,
    })),
    directory: qaEvidenceDirectory('docs/evidence/kim-luan-m3d'),
    protocolVersion: PROTOCOL_VERSION,
  });
}
