import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { appendFileSync } from 'node:fs';
import { iterationSnapshot } from './qa-iteration-state.mjs';
import { stopQaChild } from './qa-children.mjs';

/** Launch the actual pinned native executable, never a wrapper with an orphanable child. */
export async function compilerExecutable() {
  const require = createRequire(import.meta.url);
  const base = dirname(require.resolve('typescript/package.json'));
  const { default: getExePath } = await import(
    pathToFileURL(resolve(base, 'lib/getExePath.js')).href
  );
  return getExePath();
}

export class QaCompilerWatch {
  constructor(root, log, observe) {
    this.root = root;
    this.log = log;
    this.observe = observe;
  }
  async ensure() {
    const input = iterationSnapshot(this.root, 'input', this.observe);
    const output = iterationSnapshot(this.root, 'output', this.observe);
    if (
      this.child &&
      this.child.exitCode === null &&
      !this.child.signalCode &&
      this.receipt?.input === input &&
      this.receipt.output === output
    )
      return {
        reused: true,
        pid: this.child.pid,
        nativePid: this.nativePid,
        ...this.receipt,
      };
    await this.close();
    this.receipt = undefined;
    this.nativePid = undefined;
    const exe = await compilerExecutable();
    this.runId = randomUUID();
    this.child = fork(
      fileURLToPath(new URL('./qa-compiler-child.mjs', import.meta.url)),
      [exe, this.root, this.runId],
      {
        cwd: this.root,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
        execArgv: [],
        windowsHide: true,
      },
    );
    const child = this.child;
    child.on('message', (message) => {
      if (
        this.child === child &&
        message?.type === 'compiler-pid' &&
        message.runId === this.runId
      )
        this.nativePid = message.pid;
    });
    let pending = input,
      buffer = '';
    const initial = new Promise((done, reject) => {
      const timer = setTimeout(
        () => reject(Error('Compiler watch readiness timeout')),
        60000,
      );
      timer.unref();
      const finish = (error) => {
        clearTimeout(timer);
        error ? reject(error) : done();
      };
      child.once('error', finish);
      child.once('exit', (code) => {
        this.receipt = undefined;
        finish(Error(`Compiler watch exited ${code}`));
      });
      child.stdout.on('data', (bytes) => {
        appendFileSync(this.log, bytes);
        if (this.child !== child) return;
        buffer += bytes.toString();
        let line;
        while ((line = buffer.indexOf('\n')) >= 0) {
          const text = buffer.slice(0, line);
          buffer = buffer.slice(line + 1);
          if (/Starting (?:compilation|incremental compilation)/.test(text)) {
            this.receipt = undefined;
            pending = iterationSnapshot(this.root, 'input', this.observe);
          }
          const match =
            /Found (\d+) errors?\. Watching for file changes\./.exec(text);
          if (match) {
            const now = iterationSnapshot(this.root, 'input', this.observe);
            if (match[1] !== '0' || now !== pending) {
              this.receipt = undefined;
              finish(Error(`Compiler watch rejected cycle: ${text.trim()}`));
            } else {
              this.receipt = {
                input: now,
                output: iterationSnapshot(this.root, 'output', this.observe),
              };
              finish();
            }
          }
        }
      });
      child.stderr.on('data', (bytes) => appendFileSync(this.log, bytes));
    });
    try {
      await initial;
      return {
        reused: false,
        pid: child.pid,
        nativePid: this.nativePid,
        ...this.receipt,
      };
    } catch (cause) {
      await this.close();
      throw cause;
    }
  }
  async close() {
    const child = this.child;
    this.child = undefined;
    this.receipt = undefined;
    if (!child || child.exitCode !== null || child.signalCode) return;
    await stopQaChild(child, this.runId, 10000);
  }
}
