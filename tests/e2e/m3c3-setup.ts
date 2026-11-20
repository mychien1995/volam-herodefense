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
    'playwright.m3c3.config.ts',
  ]);
  const services = session.contract!.services.map((ports, index) => ({
    name: index === 0 ? 'preview' : 'normal',
    script: fileURLToPath(new URL('./m3c3-service.mjs', import.meta.url)),
    args: [index === 0 ? 'preview' : 'normal'],
    serverPort: ports.serverPort!,
    clientPort: ports.clientPort,
    environment: {},
  }));
  return startQaChildren({
    services,
    directory: qaEvidenceDirectory('docs/evidence/m3c3'),
    protocolVersion: PROTOCOL_VERSION,
  });
}
