import { verifyQaIdentity } from '../../tools/qa-session.mjs';
import { PROTOCOL_VERSION } from '@volam/game-protocol';

/** This profile can only be launched by its owning batch. It never creates or discovers a service. */
export default async function setup() {
  const runId = process.env['VOLAM_QA_ITERATION_RUN_ID'];
  if (!runId)
    throw Error('Use pnpm qa:iterate; direct/final reuse is unsupported');
  const serverUrl = process.env['VITE_SERVER_URL']!;
  await verifyQaIdentity(serverUrl + '/health', {
    service: 'volam-game-server',
    runId,
    protocolVersion: PROTOCOL_VERSION,
  });
  await verifyQaIdentity(
    `http://127.0.0.1:${process.env['VOLAM_QA_CLIENT_PORT']}/__volam_qa_identity`,
    { service: 'volam-qa-client', runId, serverUrl },
  );
}
