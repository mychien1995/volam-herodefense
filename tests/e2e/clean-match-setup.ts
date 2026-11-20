import { fileURLToPath } from 'node:url';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
import {
  qaWorkflowSession,
  qaEvidenceDirectory,
} from '../../tools/qa-session.mjs';
import { startQaChildren } from '../../tools/qa-children.mjs';
export default async function setup() {
  const session = qaWorkflowSession('browser', [
    '--config',
    'playwright.clean-match.config.ts',
  ]);
  const services = session.contract!.services.map((ports) => ({
    name: 'normal',
    script: fileURLToPath(
      new URL('./clean-match-service.mjs', import.meta.url),
    ),
    args: ['normal'],
    serverPort: ports.serverPort!,
    clientPort: ports.clientPort,
    environment: {},
  }));
  return startQaChildren({
    services,
    directory: qaEvidenceDirectory('docs/evidence/clean-match'),
    protocolVersion: PROTOCOL_VERSION,
  });
}
