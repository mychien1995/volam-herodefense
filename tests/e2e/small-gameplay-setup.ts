import { fork, type ChildProcess } from 'node:child_process';
import { openSync, closeSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export default async function setup() {
  mkdirSync('docs/evidence/small-gameplay', { recursive: true });
  const children = ['normal'].map((mode) => {
    const fd = openSync(
      'docs/evidence/small-gameplay/server-' + mode + '.log',
      'a',
    );
    const child = fork(
      fileURLToPath(new URL('./small-gameplay-service.mjs', import.meta.url)),
      [mode],
      {
        stdio: ['ignore', fd, fd, 'ipc'],
        windowsHide: true,
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
                  new Error(
                    'Dedicated small-gameplay service did not become ready; inspect server logs',
                  ),
                ),
              30000,
            );
            child.once('error', (error) => {
              clearTimeout(timer);
              reject(error);
            });
            child.once('exit', (code) => {
              clearTimeout(timer);
              reject(
                new Error('Dedicated small-gameplay service exited ' + code),
              );
            });
            child.once('message', () => {
              clearTimeout(timer);
              resolve();
            });
          }),
      ),
    );
    return cleanup;
  } catch (error) {
    await cleanup();
    throw error;
  }
}
