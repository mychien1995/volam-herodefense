import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { openSync, closeSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { stopQaChild } from './qa-children.mjs';
import { requireFreePorts, verifyQaIdentity } from './qa-session.mjs';

export async function startIterationService(
  session,
  directory,
  protocolVersion,
  { profiling = false, clientMode = 'development', clientDist } = {},
) {
  await requireFreePorts(session);
  const runId = randomUUID();
  const fd = openSync(resolve(directory, `service-${runId}.log`), 'wx');
  let child;
  try {
    child = fork(resolve('tools/qa-iteration-child.mjs'), [], {
      env: {
        ...process.env,
        VOLAM_QA_RUN_ID: runId,
        VOLAM_QA_ITERATION_CLIENT_MODE: clientMode,
        VOLAM_QA_ITERATION_CLIENT_DIST: clientDist ?? '',
        ...(profiling
          ? {
              VOLAM_QA_COST_OUTPUT: resolve(
                directory,
                `service-${runId}-cost.json`,
              ),
            }
          : {}),
      },
      stdio: ['ignore', fd, fd, 'ipc'],
      execArgv: profiling
        ? ['--import', pathToFileURL(resolve('tools/qa-cost-preload.mjs')).href]
        : [],
      windowsHide: true,
    });
  } finally {
    closeSync(fd);
  }
  let closing;
  const close = () => (closing ??= stopQaChild(child, runId, 15000));
  const request = (message, reply) =>
    new Promise((done, reject) => {
      const timer = setTimeout(
        () => finish(Error('Owned iteration IPC timeout')),
        30000,
      );
      const finish = (error, value) => {
        clearTimeout(timer);
        child.off('message', receive);
        child.off('error', fail);
        child.off('exit', exit);
        error ? reject(error) : done(value);
      };
      const fail = (error) => finish(error);
      const exit = (code) =>
        finish(Error(`Owned iteration child exited ${code}`));
      const receive = (value) => {
        if (value?.type === 'startup-error') return fail(Error(value.message));
        if (
          value?.type !== reply ||
          (message && value.requestId !== message.requestId)
        )
          return;
        if (value.runId !== runId || value.pid !== child.pid || value.error)
          return fail(Error(value.error ?? 'Wrong iteration IPC identity'));
        finish(null, value);
      };
      child.on('message', receive);
      child.once('error', fail);
      child.once('exit', exit);
      if (message)
        child.send({ ...message, runId }, (error) => {
          if (error) fail(error);
        });
    });
  const verify = async () => {
    if (closing || child.exitCode !== null || child.signalCode)
      throw Error('Iteration child is no longer owned/live');
    await verifyQaIdentity(session.serverUrl + '/health', {
      service: 'volam-game-server',
      runId,
      protocolVersion,
    });
    await verifyQaIdentity(session.clientUrl + '/__volam_qa_identity', {
      service: 'volam-qa-client',
      runId,
      serverUrl: session.serverUrl,
    });
  };
  try {
    const ready = await request(null, 'ready');
    if (
      ready.protocolVersion !== protocolVersion ||
      ready.serverPort !== session.serverPort ||
      ready.clientPort !== session.clientPort
    )
      throw Error('Wrong iteration endpoints/protocol');
    await verify();
    return {
      runId,
      pid: child.pid,
      close,
      verify,
      reset: () =>
        request({ type: 'reset', requestId: randomUUID() }, 'reset-result'),
    };
  } catch (cause) {
    try {
      await close();
    } catch (error) {
      throw new AggregateError(
        [cause, error],
        'Iteration startup/cleanup failed',
        { cause },
      );
    }
    throw cause;
  }
}
