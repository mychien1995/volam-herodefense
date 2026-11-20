import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  utimesSync,
  statSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fork } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { QaCompilerWatch } from '../../tools/qa-compiler-watch.mjs';

function fixture() {
  const parent = resolve('.cache');
  mkdirSync(parent, { recursive: true });
  const root = mkdtempSync(resolve(parent, 'qa-compiler-test-'));
  mkdirSync(resolve(root, 'apps/game-server/src'), { recursive: true });
  writeFileSync(
    resolve(root, 'apps/game-server/tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        composite: true,
        rootDir: 'src',
        outDir: 'dist',
        types: [],
        skipLibCheck: true,
      },
      include: ['src/**/*.ts'],
    }),
  );
  const source = resolve(root, 'apps/game-server/src/index.ts');
  writeFileSync(source, 'export const value = "a";\n');
  return {
    root,
    source,
    output: resolve(root, 'apps/game-server/dist/index.js'),
    remove() {
      assert.equal(dirname(root), parent);
      assert.ok(root.startsWith(resolve(parent, 'qa-compiler-test-')));
      rmSync(root, { recursive: true, force: true });
    },
  };
}

test(
  'actual native compiler reused only for byte-matching inputs/outputs; corrupt/delete/error invalidate',
  { timeout: 60000 },
  async () => {
    const f = fixture(),
      watch = new QaCompilerWatch(f.root, resolve(f.root, 'compiler.log'));
    try {
      const first = await watch.ensure(),
        second = await watch.ensure();
      assert.equal(first.reused, false);
      assert.equal(second.reused, true);
      assert.equal(first.pid, second.pid);
      assert.equal(first.nativePid, second.nativePid);
      assert.ok(first.nativePid);
      const old = statSync(f.source);
      writeFileSync(f.source, 'export const value = "b";\n');
      utimesSync(f.source, old.atime, old.mtime);
      await watch.ensure();
      assert.match(readFileSync(f.output, 'utf8'), /"b"/);
      writeFileSync(f.output, 'broken output');
      const repaired = await watch.ensure();
      assert.equal(repaired.reused, false);
      assert.match(readFileSync(f.output, 'utf8'), /"b"/);
      rmSync(f.output);
      assert.equal((await watch.ensure()).reused, false);
      writeFileSync(f.source, 'export const value: number = "bad";');
      await assert.rejects(watch.ensure(), /rejected cycle/);
      assert.equal(watch.child, undefined);
      writeFileSync(f.source, 'export const value = "c";\n');
      await watch.ensure();
      assert.match(readFileSync(f.output, 'utf8'), /"c"/);
      await watch.close();
      await watch.close();
    } finally {
      await watch.close();
      f.remove();
    }
  },
);

test(
  'compiler guardian stops its native process after abrupt owner loss',
  { timeout: 30000 },
  async () => {
    const f = fixture();
    let child, nativePid;
    try {
      const wrapper = resolve(f.root, 'owner.mjs');
      writeFileSync(
        wrapper,
        `import { QaCompilerWatch } from ${JSON.stringify(pathToFileURL(resolve('tools/qa-compiler-watch.mjs')).href)};\nconst watch = new QaCompilerWatch(${JSON.stringify(f.root)}, ${JSON.stringify(resolve(f.root, 'compiler.log'))});\nconst result = await watch.ensure(); process.send(result);`,
      );
      child = fork(wrapper, [], {
        stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
        execArgv: [],
        windowsHide: true,
      });
      const message = await new Promise((done, reject) => {
        const timer = setTimeout(
          () => reject(Error('Owner startup timeout')),
          15000,
        );
        child.once('message', (m) => {
          clearTimeout(timer);
          done(m);
        });
        child.once('error', (e) => {
          clearTimeout(timer);
          reject(e);
        });
        child.once('exit', (c) => {
          clearTimeout(timer);
          reject(Error('Owner exited ' + c));
        });
      });
      nativePid = message.nativePid;
      assert.ok(nativePid);
      const exited = new Promise((done) => child.once('exit', done));
      child.kill('SIGKILL');
      await exited;
      const deadline = Date.now() + 10000;
      let alive = true;
      while (Date.now() < deadline) {
        try {
          process.kill(nativePid, 0);
        } catch (e) {
          if (e.code === 'ESRCH') {
            alive = false;
            break;
          }
          throw e;
        }
        await new Promise((done) => setTimeout(done, 50));
      }
      assert.equal(
        alive,
        false,
        'Owned native watcher survived IPC owner loss',
      );
    } finally {
      if (child && child.exitCode === null && !child.signalCode)
        child.kill('SIGKILL');
      f.remove();
    }
  },
);
