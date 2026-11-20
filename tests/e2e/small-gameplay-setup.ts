import { fileURLToPath } from 'node:url';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
import {
  qaWorkflowSession,
  qaEvidenceDirectory,
} from '../../tools/qa-session.mjs';
import { startQaChildren } from '../../tools/qa-children.mjs';
export default async function setup() {
  const s = qaWorkflowSession('browser', [
    '--config',
    'playwright.small-gameplay.config.ts',
  ]);
  return startQaChildren({
    services: [
      {
        name: 'normal',
        script: fileURLToPath(
          new URL('./small-gameplay-service.mjs', import.meta.url),
        ),
        serverPort: s.serverPort,
        clientPort: s.clientPort,
        ports: s.contract!.ports,
      },
    ],
    directory: qaEvidenceDirectory('docs/evidence/small-gameplay'),
    protocolVersion: PROTOCOL_VERSION,
  });
}
