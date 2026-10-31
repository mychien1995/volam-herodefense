import { fork, type ChildProcess } from 'node:child_process';
import { mkdirSync, openSync, closeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export default async function setup() {
  const out = 'docs/evidence/m3c3-feedback-v2-runtime';
  mkdirSync(out, { recursive: true });
  const children = ['normal', 'preview'].map((mode) => {
    const fd = openSync(out + '/server-' + mode + '.log', 'a');
    const child = fork(
      fileURLToPath(new URL('./m3c3-service.mjs', import.meta.url)),
      [mode],
      {
        env: { ...process.env, VOLAM_TEST_PORT_OFFSET: '40' },
        windowsHide: true,
        stdio: ['ignore', fd, fd, 'ipc'],
      },
    );
    closeSync(fd);
    return child;
  });
  const stop = (c: ChildProcess) =>
    new Promise<void>((resolve) => {
      if (c.exitCode !== null || c.signalCode) {
        resolve();
        return;
      }
      const timer = setTimeout(() => c.kill(), 15000);
      c.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
      if (c.connected) c.send('stop');
      else c.kill();
    });
  const cleanup = async () => {
    await Promise.all(children.map(stop));
  };
  try {
    await Promise.all(
      children.map(
        (c) =>
          new Promise<void>((resolve, reject) => {
            const timer = setTimeout(
              () => reject(Error('Feedback v2 services readiness timeout')),
              30000,
            );
            c.once('message', () => {
              clearTimeout(timer);
              resolve();
            });
            c.once('error', (e) => {
              clearTimeout(timer);
              reject(e);
            });
            c.once('exit', (code) => {
              clearTimeout(timer);
              reject(Error('Feedback v2 service exit ' + code));
            });
          }),
      ),
    );
    return cleanup;
  } catch (e) {
    await cleanup();
    throw e;
  }
}
