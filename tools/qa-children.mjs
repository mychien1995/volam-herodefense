import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, openSync, closeSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ownedQaServices,
  requireQaPorts,
  verifyQaIdentity,
} from './qa-session.mjs';

/** Stop only the child handle this caller created. No process-tree or port lookup. */
export function stopQaChild(child, runId, timeout) {
  if (child.exitCode !== null || child.signalCode)
    return Promise.reject(
      Error(
        `Owned QA child exited before cleanup: ${child.exitCode ?? child.signalCode}`,
      ),
    );
  return new Promise((done, reject) => {
    let forced = false;
    const timer = setTimeout(() => {
      forced = true;
      child.kill('SIGKILL');
    }, timeout);
    const hardTimer = setTimeout(() => {
      clearTimeout(timer);
      reject(Error('Owned QA child did not exit after termination'));
    }, timeout + 5000);
    child.once('exit', (code, signal) => {
      clearTimeout(timer);
      clearTimeout(hardTimer);
      if (forced || code !== 0 || signal)
        reject(
          Error(
            `Owned QA child cleanup failed: code=${code}, signal=${signal}, forced=${forced}`,
          ),
        );
      else done();
    });
    if (child.connected)
      child.send({ type: 'stop', runId }, (error) => {
        if (error && child.exitCode === null) child.kill();
      });
    else child.kill();
  });
}

/** Readiness is a verified IPC identity plus both owned HTTP identities. */
export async function startQaChildren({
  services,
  directory,
  protocolVersion,
  readyTimeout = 30000,
  stopTimeout = 15000,
}) {
  await requireQaPorts(
    services.flatMap((s) => s.ports ?? [s.serverPort, s.clientPort]),
  );
  mkdirSync(directory, { recursive: true });
  const owned = ownedQaServices();
  const pending = [];
  try {
    for (const service of services) {
      const runId = randomUUID();
      const fd = openSync(
        resolve(directory, `server-${service.name}.log`),
        'a',
      );
      let child;
      try {
        child = fork(service.script, service.args ?? [], {
          env: {
            ...process.env,
            ...service.environment,
            VOLAM_QA_RUN_ID: runId,
            VOLAM_QA_CHILD_SERVER_PORT: String(service.serverPort),
            VOLAM_QA_CHILD_CLIENT_PORT: String(service.clientPort),
            VITE_SERVER_URL: `http://127.0.0.1:${service.serverPort}`,
          },
          stdio: ['ignore', fd, fd, 'ipc'],
          execArgv: [],
          windowsHide: true,
        });
      } finally {
        closeSync(fd);
      }
      owned.add(() => stopQaChild(child, runId, stopTimeout));
      const ready = new Promise((done, reject) => {
        const timer = setTimeout(
          () => finish(Error(`QA child readiness timeout: ${service.name}`)),
          readyTimeout,
        );
        const finish = (error) => {
          clearTimeout(timer);
          child.off('message', message);
          child.off('error', fail);
          child.off('exit', exit);
          error ? reject(error) : done();
        };
        const fail = (error) => finish(error);
        const exit = (code) =>
          finish(
            Error(
              `QA child exited before readiness: ${service.name}, code=${code}`,
            ),
          );
        const message = async (value) => {
          if (value?.type === 'startup-error')
            return finish(Error(value.message));
          if (value?.type !== 'ready') return;
          if (
            value.runId !== runId ||
            value.pid !== child.pid ||
            value.protocolVersion !== protocolVersion ||
            value.serverPort !== service.serverPort ||
            value.clientPort !== service.clientPort
          )
            return finish(Error(`Wrong QA child identity: ${service.name}`));
          try {
            const serverUrl = `http://127.0.0.1:${service.serverPort}`;
            await verifyQaIdentity(serverUrl + '/health', {
              service: 'volam-game-server',
              runId,
              protocolVersion,
            });
            await verifyQaIdentity(
              `http://127.0.0.1:${service.clientPort}/__volam_qa_identity`,
              { service: 'volam-qa-client', runId, serverUrl },
            );
            finish();
          } catch (error) {
            finish(error);
          }
        };
        child.on('message', message);
        child.once('error', fail);
        child.once('exit', exit);
      });
      ready.catch(() => {});
      pending.push(ready);
    }
    await Promise.all(pending);
    return () => owned.close();
  } catch (cause) {
    try {
      await owned.close();
    } catch (cleanupError) {
      throw new AggregateError(
        [cause, cleanupError],
        'QA child startup and cleanup failed',
        { cause },
      );
    }
    throw cause;
  }
}

/** Install disconnect/stop handling before startup so a dead parent cannot orphan a service. */
export async function serveQaChild(session, protocolVersion, start) {
  let requested = !process.connected,
    cleanup;
  let stopping;
  let disconnectDeadline;
  const stop = () =>
    (stopping ??= (async () => {
      if (!cleanup) return;
      try {
        await cleanup();
        clearTimeout(disconnectDeadline);
        process.exit(0);
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    })());
  process.on('message', (message) => {
    if (message?.type === 'stop' && message.runId === session.runId) {
      requested = true;
      if (cleanup) void stop();
    }
  });
  process.once('disconnect', () => {
    requested = true;
    disconnectDeadline = setTimeout(() => process.exit(1), 15000);
    disconnectDeadline.unref();
    if (cleanup) void stop();
  });
  try {
    cleanup = await start();
    if (requested || !process.connected) {
      await stop();
      return;
    }
    process.send({
      type: 'ready',
      pid: process.pid,
      runId: session.runId,
      protocolVersion,
      serverPort: session.serverPort,
      clientPort: session.clientPort,
    });
  } catch (error) {
    if (process.connected)
      process.send({
        type: 'startup-error',
        runId: session.runId,
        message: error.message,
      });
    console.error(error);
    process.exit(1);
  }
}
