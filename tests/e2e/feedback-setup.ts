import { fork, type ChildProcess } from 'node:child_process';
import { mkdirSync, openSync, closeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export default async function setup() {
  const out = 'docs/evidence/m3c3-feedback';
  mkdirSync(out, { recursive: true });
  const children = ['normal', 'preview'].map((mode) => {
    const fd = openSync(`${out}/server-${mode}.log`, 'a');
    const child = fork(
      fileURLToPath(new URL('./m3c3-service.mjs', import.meta.url)),
      [mode],
      {
        env: { ...process.env, VOLAM_TEST_PORT_OFFSET: '20' },
        windowsHide: true,
        stdio: ['ignore', fd, fd, 'ipc'],
      },
    );
    closeSync(fd);
    return child;
  });
  const stop = (child: ChildProcess) =>
    new Promise<void>((resolve) => {
      if (child.exitCode !== null || child.signalCode) {
        resolve();
        return;
      }
      const timer = setTimeout(() => child.kill(), 15000);
      child.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
      if (child.connected) child.send('stop');
      else child.kill();
    });
  const cleanup = async () => {
    await Promise.all(children.map(stop));
  };
  try {
    await Promise.all(
      children.map(
        (child) =>
          new Promise<void>((resolve, reject) => {
            const timer = setTimeout(
              () =>
                reject(
                  Error('Feedback services failed readiness; inspect logs'),
                ),
              30000,
            );
            child.once('error', (e) => {
              clearTimeout(timer);
              reject(e);
            });
            child.once('exit', (c) => {
              clearTimeout(timer);
              reject(Error('Feedback service exited ' + c));
            });
            child.once('message', () => {
              clearTimeout(timer);
              resolve();
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
