import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { openSync, closeSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ownedQaServices,
  requireQaPorts,
  qaEvidenceDirectory,
} from './qa-session.mjs';
import { stopQaChild } from './qa-children.mjs';
import { waitForQa } from './qa-wait.mjs';

/** Static review identity is the live owned PID, not a game protocol or a healthy foreign port. */
export async function startQaStatic({
  script,
  port,
  environment = {},
  directory = qaEvidenceDirectory('.cache/qa-static'),
  timeout = 15000,
}) {
  await requireQaPorts([port]);
  mkdirSync(directory, { recursive: true });
  const runId = randomUUID(),
    owned = ownedQaServices();
  const fd = openSync(resolve(directory, `${runId}.log`), 'a');
  let child;
  try {
    child = fork(
      fileURLToPath(new URL('./qa-static-child.mjs', import.meta.url)),
      [resolve(script)],
      {
        env: { ...process.env, ...environment, VOLAM_QA_RUN_ID: runId },
        execArgv: [],
        windowsHide: true,
        stdio: ['ignore', fd, fd, 'ipc'],
      },
    );
  } finally {
    closeSync(fd);
  }
  owned.add(() => stopQaChild(child, runId, 6000));
  let failure;
  child.on('error', (error) => {
    failure = error;
  });
  try {
    await waitForQa(
      async () => {
        if (failure) throw failure;
        if (child.exitCode !== null || child.signalCode)
          throw Error('Static QA child exited before readiness');
        let response;
        try {
          response = await fetch(`http://127.0.0.1:${port}/health`, {
            signal: AbortSignal.timeout(600),
          });
        } catch (error) {
          if (
            error.cause?.code === 'ECONNREFUSED' ||
            error.name === 'TimeoutError'
          )
            return false;
          throw error;
        }
        if (!response.ok)
          throw Error(`Static QA health HTTP ${response.status}`);
        const identity = await response.json();
        if (identity.pid !== child.pid)
          throw Error('Wrong static QA process identity');
        return true;
      },
      'owned static review PID',
      { timeout, interval: 30 },
    );
    return () => owned.close();
  } catch (cause) {
    try {
      await owned.close();
    } catch (cleanupError) {
      throw new AggregateError(
        [cause, cleanupError],
        'Static QA startup and cleanup failed',
        { cause },
      );
    }
    throw cause;
  }
}
