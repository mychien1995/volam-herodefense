import {
  requireQaPorts,
  verifyQaIdentity,
  ownedQaServices,
} from './qa-session.mjs';

/** One transaction owns startup, identity, teardown and exactly its environment keys. */
export async function runQaFixture({
  session,
  environment = {},
  protocolVersion,
  preview = false,
  verifyBuild,
  createServer,
  createClient,
  configure,
}) {
  if (typeof session.runId !== 'string' || !session.runId)
    throw Error('QA fixture requires a run identity');
  await requireQaPorts(
    session.contract?.ports ?? [session.serverPort, session.clientPort],
  );
  if (preview) await verifyBuild();
  const keys = [
    ...new Set(['NODE_ENV', 'VOLAM_QA_RUN_ID', ...Object.keys(environment)]),
  ];
  const before = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const owned = ownedQaServices();
  let cleanupPromise;
  const cleanup = () =>
    (cleanupPromise ??= (async () => {
      try {
        await owned.close();
      } finally {
        for (const key of keys) {
          if (before[key] === undefined) delete process.env[key];
          else process.env[key] = before[key];
        }
      }
    })());
  try {
    for (const [key, value] of Object.entries({
      ...environment,
      VOLAM_QA_RUN_ID: session.runId,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    let options;
    if (createServer) {
      const server = await createServer();
      owned.add(() => server.gracefullyShutdown(false));
      await server.listen(session.serverPort);
      await verifyQaIdentity(`${session.serverUrl}/health`, {
        service: 'volam-game-server',
        runId: session.runId,
        protocolVersion,
      });
      options = await configure?.(server, owned);
    }
    const client = await createClient(options);
    owned.add(() => client.close());
    if (!preview) await client.listen();
    await verifyQaIdentity(`${session.clientUrl}/__volam_qa_identity`, {
      service: 'volam-qa-client',
      runId: session.runId,
      serverUrl: session.serverUrl,
    });
    if (preview)
      await verifyQaIdentity(`${session.clientUrl}/volam-build-endpoint.json`, {
        serverUrl: session.serverUrl,
      });
    return cleanup;
  } catch (cause) {
    try {
      await cleanup();
    } catch (cleanupError) {
      throw new AggregateError(
        [cause, cleanupError],
        'QA fixture startup and cleanup failed',
        { cause },
      );
    }
    throw cause;
  }
}
