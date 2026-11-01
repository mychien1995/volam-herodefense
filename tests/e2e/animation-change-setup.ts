import { fork, type ChildProcess } from 'node:child_process';
import { mkdirSync, openSync, closeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { requireFreePorts, qaSession } from '../../tools/qa-session.mjs';
export default async function setup() {
  const out =
    process.env['VOLAM_ANIMATION_EVIDENCE_DIR'] ??
    'docs/evidence/animation-change';
  mkdirSync(out, { recursive: true });
  await requireFreePorts(qaSession({ serverPort: 2838, clientPort: 5442 }, {}));
  await requireFreePorts(qaSession({ serverPort: 2836, clientPort: 5440 }, {}));
  const children: ChildProcess[] = [];
  const cleanup = async () => {
    await Promise.all(
      children.map(
        (c) =>
          new Promise<void>((resolve) => {
            if (c.exitCode !== null || c.signalCode) return resolve();
            const timer = setTimeout(() => c.kill(), 15000);
            c.once('exit', () => {
              clearTimeout(timer);
              resolve();
            });
            if (c.connected) c.send('stop');
            else c.kill();
          }),
      ),
    );
  };
  try {
    for (const mode of ['preview', 'normal']) {
      const fd = openSync(out + '/server-' + mode + '.log', 'a');
      const child = fork(
        fileURLToPath(new URL('./m3c3-service.mjs', import.meta.url)),
        [mode],
        {
          env: { ...process.env, VOLAM_TEST_PORT_OFFSET: '250' },
          windowsHide: true,
          stdio: ['ignore', fd, fd, 'ipc'],
        },
      );
      closeSync(fd);
      children.push(child);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(Error('Animation QA service readiness timeout')),
          45000,
        );
        child.once('message', () => {
          clearTimeout(timer);
          resolve();
        });
        child.once('error', (e) => {
          clearTimeout(timer);
          reject(e);
        });
        child.once('exit', (code) => {
          clearTimeout(timer);
          reject(Error('Animation QA service exited: ' + code));
        });
      });
    }
    return cleanup;
  } catch (e) {
    await cleanup();
    throw e;
  }
}
