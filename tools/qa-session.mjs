import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import { basename, resolve } from 'node:path';
import { qaProfile, qaProfilePorts } from './qa-profiles.mjs';

/** Shared session paths and local endpoints. No service is borrowed. */
export function qaSession(defaults = {}, env = process.env) {
  const profile = defaults.profile ?? 'gameplay';
  const session = env.VOLAM_QA_SESSION;
  if (session && !/^[a-zA-Z0-9_-]+$/.test(session))
    throw Error('VOLAM_QA_SESSION must be a simple letters/digits/_/- name');
  const port = (key, fallback) => {
    const value = Number(env[key] ?? fallback);
    if (!Number.isInteger(value) || value < 1 || value > 65535)
      throw Error(`${key} must be an integer port from 1 to 65535`);
    return value;
  };
  const serverPort = port('VOLAM_QA_SERVER_PORT', defaults.serverPort ?? 2567);
  const clientPort = port('VOLAM_QA_CLIENT_PORT', defaults.clientPort ?? 5173);
  if (serverPort === clientPort)
    throw Error('Client and server ports must differ');
  const serverUrl = env.VITE_SERVER_URL ?? `http://127.0.0.1:${serverPort}`;
  const endpoint = new URL(serverUrl);
  if (
    !['http:', 'https:'].includes(endpoint.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname) ||
    Number(endpoint.port || (endpoint.protocol === 'https:' ? 443 : 80)) !==
      serverPort ||
    endpoint.pathname !== '/' ||
    endpoint.search ||
    endpoint.hash ||
    endpoint.username ||
    endpoint.password
  )
    throw Error(
      'Managed QA VITE_SERVER_URL must identify its configured local server port',
    );
  return {
    profile,
    serverPort,
    clientPort,
    serverUrl,
    clientUrl: `http://127.0.0.1:${clientPort}`,
    runId: env.VOLAM_QA_RUN_ID ?? randomUUID(),
    cacheDir: env.VOLAM_QA_VITE_CACHE
      ? resolve(env.VOLAM_QA_VITE_CACHE)
      : session
        ? resolve('.cache', `vite-${session}-${profile}`)
        : undefined,
    outputDir:
      env.VOLAM_QA_PLAYWRIGHT_OUTPUT ??
      (session
        ? resolve('artifacts', session, profile)
        : (defaults.outputDir ?? 'test-results')),
  };
}

/** Only registered browser profiles own endpoint validation; quick checks do not. */
export function qaManagedProfile(mode, args = []) {
  const contract = qaProfile(mode, args);
  if (!contract) return null;
  const first = contract.services[0];
  return { profile: contract.profile, ...first, contract };
}

export function qaWorkflowSession(mode, args = [], env = process.env) {
  const defaults = qaManagedProfile(mode, args);
  if (defaults === null) {
    const pathsEnvironment = { ...env };
    delete pathsEnvironment.VITE_SERVER_URL;
    return qaSession({}, pathsEnvironment);
  }
  const { contract } = defaults;
  const resolved = qaProfilePorts(contract, env);
  const first = resolved.services[0];
  const session = qaSession({ profile: contract.profile, ...first }, env);
  return {
    ...session,
    contract: {
      ...contract,
      ...resolved,
      clientMode:
        (mode === 'final' && contract.finalClientMode) ||
        (contract.productionEnv && env[contract.productionEnv] === '1')
          ? 'preview'
          : contract.developmentEnv && env[contract.developmentEnv] === '1'
            ? 'development'
            : contract.clientMode,
    },
  };
}

export function qaEvidenceDirectory(defaultDirectory, env = process.env) {
  const base =
    env.VOLAM_QA_EVIDENCE_DIR ??
    (env.VOLAM_QA_SESSION
      ? resolve('docs/evidence/sessions', env.VOLAM_QA_SESSION)
      : undefined);
  return base ? resolve(base, basename(defaultDirectory)) : defaultDirectory;
}

/** Refuse occupied ports early; listen() remains the authority if a race follows. */
export async function requireFreePorts(session) {
  return requireQaPorts([session.serverPort, session.clientPort]);
}

export async function requireQaPorts(ports) {
  for (const port of [...new Set(ports)]) {
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw Error('QA ports must be integers from 1 to 65535');
    await new Promise((done, reject) => {
      const probe = createServer();
      probe.once('error', (cause) =>
        reject(
          Error(
            `QA port ${port} unavailable; choose VOLAM_QA_SERVER_PORT/VOLAM_QA_CLIENT_PORT. Existing services will not be reused or stopped.`,
            { cause },
          ),
        ),
      );
      probe.listen({ host: '127.0.0.1', port, exclusive: true }, () =>
        probe.close(done),
      );
    });
  }
}

export async function verifyQaIdentity(url, expected) {
  let actual;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    actual = await response.json();
  } catch (cause) {
    throw Error(`QA service unavailable at ${url}: ${cause}`, { cause });
  }
  for (const [key, value] of Object.entries(expected))
    if (
      key === 'serverUrl' &&
      typeof actual[key] === 'string' &&
      typeof value === 'string'
        ? actual[key].replace('://localhost:', '://127.0.0.1:') !==
          value.replace('://localhost:', '://127.0.0.1:')
        : actual[key] !== value
    )
      throw Error(
        `Wrong QA service at ${url}: expected ${key}=${value}, received ${JSON.stringify(actual)}`,
      );
  return actual;
}

/** Vite middleware lives only in the test service, never the production client. */
export function qaIdentityPlugin(session) {
  const install = (server) => {
    server.middlewares.use('/__volam_qa_identity', (_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          service: 'volam-qa-client',
          runId: session.runId,
          serverUrl: session.serverUrl,
        }),
      );
    });
  };
  return {
    name: 'volam-qa-identity',
    configureServer: install,
    configurePreviewServer: install,
  };
}

/** Cleanup is idempotent and attempts every owned closer, including after failure. */
export function ownedQaServices() {
  const closers = [];
  let closing;
  return {
    add(close) {
      if (closing)
        throw Error(
          'QA cleanup already started; cannot register another owner',
        );
      closers.push(close);
    },
    close() {
      return (closing ??= Promise.resolve().then(async () => {
        const errors = [];
        for (const close of closers.splice(0).reverse()) {
          try {
            await close();
          } catch (error) {
            errors.push(error);
          }
        }
        if (errors.length)
          throw new AggregateError(errors, 'QA service cleanup failed');
      }));
    },
  };
}
