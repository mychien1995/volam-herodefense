import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  statSync,
  utimesSync,
  cpSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import {
  acquireCoreLock,
  fileSnapshot,
  generatedCoreData,
  prepareCoreArtifacts,
  pureCoreTests,
} from '../../tools/core-test-cache.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'volam-core-cache-'));
  t.after(() => {
    // This fixture owns exactly the resolved temporary child, never the temp root.
    assert.equal(dirname(root), resolve(tmpdir()));
    assert.ok(root.includes('volam-core-cache-'));
    rmSync(root, { recursive: true, force: true });
  });
  const put = (name, data) => {
    const path = join(root, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, data);
    return path;
  };
  put('package.json', '{"type":"module"}');
  put('pnpm-lock.yaml', 'lock-a');
  put('scripts/prepare-assets.mjs', '// recipe 1');
  put('assets/reviews/bosses/kim_luan_phap_vuong_v01/data.json', '{"value":1}');
  put('maps/arena.tmj', '{"map":1}');
  put('apps/game-client/src/view.json', '{}');
  put('packages/game-core/src/index.ts', 'export const value = 1;');
  put(
    'packages/game-data/src/index.ts',
    "export {value} from '@volam/game-core';",
  );
  put('packages/game-data/src/static.json', '{"seed":1}');
  put(
    'tests/core.test.ts',
    "import {expect,it} from 'vitest'; import {value} from '@volam/game-data'; it('value',()=>expect(value).toBe(1));",
  );
  const calls = [],
    records = [];
  const cache = join(root, '.cache/pure-core');
  mkdirSync(cache, { recursive: true });
  const toolchain = {
    tools: [['typescript', 'fixture-v1']],
    tsc: 'fixture-tsc',
  };
  const options = {
    root,
    cache,
    toolchain,
    record: (label, value) => records.push({ label, ...value }),
    run(label, script, args) {
      calls.push({ label, script, args });
      if (label.startsWith('prepare data')) {
        for (const name of generatedCoreData)
          put(
            name,
            readFileSync(
              join(
                root,
                'assets/reviews/bosses/kim_luan_phap_vuong_v01/data.json',
              ),
            ),
          );
      } else {
        assert.ok(args.includes('--force'));
        put(
          '.cache/pure-core/build/core/index.js',
          readFileSync(join(root, 'packages/game-core/src/index.ts')),
        );
        put(
          '.cache/pure-core/build/data/index.js',
          'export const built = true;',
        );
      }
    },
  };
  return {
    root,
    cache,
    put,
    calls,
    records,
    options,
    run: () => prepareCoreArtifacts(options),
  };
}

test('cold artifacts are prepared; identical bytes reuse outputs without reusing a test result', (t) => {
  const f = fixture(t);
  f.run().assertFresh();
  assert.equal(f.calls.length, 2);
  f.calls.length = 0;
  f.records.length = 0;
  f.run().assertFresh();
  assert.equal(f.calls.length, 0);
  assert.deepEqual(
    f.records.map((r) => r.hit),
    [true, true],
  );
  const stamp = JSON.parse(readFileSync(join(f.cache, 'compile.json')));
  assert.equal('testResult' in stamp, false);
  f.put(
    'tests/core.test.ts',
    "import {expect,it} from 'vitest'; it('new failure',()=>expect(1).toBe(2));",
  );
  f.run().assertFresh();
  assert.equal(f.calls.length, 0); // Runner must still execute this changed test.
});

test('same-size source edits with restored mtime force compilation but retain prepared data', (t) => {
  const f = fixture(t);
  f.run();
  f.calls.length = 0;
  const path = join(f.root, 'packages/game-core/src/index.ts'),
    before = statSync(path);
  f.put('packages/game-core/src/index.ts', 'export const value = 2;');
  utimesSync(path, before.atime, before.mtime);
  f.run().assertFresh();
  assert.deepEqual(
    f.calls.map((x) => x.label),
    ['compile pure-core artifacts (force)'],
  );
  assert.match(
    readFileSync(join(f.cache, 'build/core/index.js'), 'utf8'),
    /value = 2/,
  );
  f.calls.length = 0;
  f.put('packages/game-core/src/new.ts', 'export const added = true;');
  f.run();
  assert.equal(f.calls.length, 1);
  f.calls.length = 0;
  rmSync(join(f.root, 'packages/game-core/src/new.ts'));
  f.run();
  assert.equal(f.calls.length, 1);
});

test('map bytes, recipe, package/lock and toolchain changes invalidate the appropriate artifacts', (t) => {
  const f = fixture(t);
  f.run();
  for (const [name, content] of [
    ['maps/arena.tmj', '{"map":2}'],
    ['assets/reviews/bosses/kim_luan_phap_vuong_v01/data.json', '{"value":2}'],
    ['scripts/prepare-assets.mjs', '// recipe 2'],
    ['pnpm-lock.yaml', 'lock-b'],
    ['package.json', '{"type":"module","changed":true}'],
  ]) {
    f.calls.length = 0;
    const before = statSync(join(f.root, name));
    f.put(name, content);
    utimesSync(join(f.root, name), before.atime, before.mtime);
    f.run().assertFresh();
    assert.ok(
      f.calls.some((x) => x.label.startsWith('prepare data')),
      name,
    );
  }
  f.calls.length = 0;
  f.options.toolchain.tools = [['typescript', 'fixture-v2']];
  f.run();
  assert.equal(f.calls.length, 2);
});

test('missing/corrupt generated data and compiled files are repaired, including extra stale output', (t) => {
  const f = fixture(t);
  f.run();
  for (const name of [
    generatedCoreData[0],
    '.cache/pure-core/build/core/index.js',
    '.cache/pure-core/build/data/index.js',
  ]) {
    const original = readFileSync(join(f.root, name));
    for (const corrupt of [false, true]) {
      f.calls.length = 0;
      if (corrupt) f.put(name, 'x'.repeat(original.length));
      else rmSync(join(f.root, name));
      f.run().assertFresh();
      assert.ok(f.calls.length > 0);
      assert.deepEqual(readFileSync(join(f.root, name)), original);
    }
  }
  f.put('.cache/pure-core/build/core/stale.js', 'bad');
  f.calls.length = 0;
  f.run();
  assert.equal(f.calls.length, 1);
  assert.throws(() => readFileSync(join(f.cache, 'build/core/stale.js')));
  f.put('.cache/pure-core/compile.json', '{bad');
  f.calls.length = 0;
  f.run();
  assert.equal(f.calls.length, 1);
});

test('cache identity cannot be copied to another checkout', (t) => {
  const a = fixture(t),
    b = fixture(t);
  a.run();
  cpSync(a.cache, b.cache, { recursive: true });
  b.calls.length = 0;
  b.run().assertFresh();
  assert.equal(b.calls.length, 2);
});

test('failed or racing preparation/compilation never publishes a reusable entry', (t) => {
  const f = fixture(t),
    run = f.options.run;
  f.options.run = () => {
    throw Error('preparation failed');
  };
  assert.throws(f.run, /preparation failed/);
  assert.throws(() => readFileSync(join(f.cache, 'data.json')));
  f.options.run = (...args) => {
    run(...args);
    if (args[0].startsWith('compile')) throw Error('compile failed');
  };
  assert.throws(f.run, /compile failed/);
  assert.throws(() => readFileSync(join(f.cache, 'compile.json')));
  let n = 0;
  f.options.run = (...args) => {
    run(...args);
    f.put(
      'assets/reviews/bosses/kim_luan_phap_vuong_v01/data.json',
      JSON.stringify({ value: ++n }),
    );
  };
  f.put(
    'assets/reviews/bosses/kim_luan_phap_vuong_v01/data.json',
    '{"value":9}',
  );
  assert.throws(f.run, /inputs changed during the run/i);
  f.options.run = run;
  const candidate = f.run();
  f.put('packages/game-core/src/index.ts', 'export const value = 8;');
  assert.throws(() => candidate.assertFresh(), /changed during tests/);
});

test('concurrent runs refuse an owned lock and release only their own lock', (t) => {
  const f = fixture(t),
    lock = acquireCoreLock(f.root);
  assert.throws(() => acquireCoreLock(f.root), /locked by another run/);
  lock.release();
  acquireCoreLock(f.root).release();
});

test('creep manifests outside assets invalidate data, and compiler exit zero without entries cannot be cached', (t) => {
  const f = fixture(t);
  f.run();
  f.calls.length = 0;
  f.put('sprites/creeps/arena/wild-dog/manifest.json', '{"nameVi":"A"}');
  f.run();
  assert.ok(f.calls.some((call) => call.label.startsWith('prepare data')));
  f.calls.length = 0;
  const path = join(f.root, 'sprites/creeps/arena/wild-dog/manifest.json'),
    before = statSync(path);
  f.put('sprites/creeps/arena/wild-dog/manifest.json', '{"nameVi":"B"}');
  utimesSync(path, before.atime, before.mtime);
  f.run();
  assert.ok(f.calls.some((call) => call.label.startsWith('prepare data')));
  const g = fixture(t),
    run = g.options.run;
  g.options.run = (...args) => {
    if (!args[0].startsWith('compile')) run(...args);
  };
  assert.throws(g.run, /Compiler did not produce/);
  assert.throws(() => readFileSync(join(g.cache, 'compile.json')));
});

test('pure boundary rejects rooms, asset IO, dynamic imports and CLI override attempts before preparation', (t) => {
  const f = fixture(t);
  assert.equal(pureCoreTests(f.root, ['tests/core.test.ts']).tests.length, 1);
  for (const code of [
    "import {Room} from '@colyseus/core';",
    "import '../apps/game-client/src/view.ts';",
    "import {readFileSync} from 'node:fs';",
    "const path='x'; import(path);",
    'process.env.X;',
    "require('node:fs');",
    "fetch('url');",
  ]) {
    f.put('tests/bad.test.ts', code);
    assert.throws(() => pureCoreTests(f.root, ['tests/bad.test.ts']));
  }
  f.put('tests/helper.ts', "import 'phaser';");
  f.put('tests/bad.test.ts', "import './helper.js';");
  assert.throws(() => pureCoreTests(f.root, ['tests/bad.test.ts']), /phaser/);
  for (const args of [
    [],
    ['--config'],
    ['../tests/core.test.ts'],
    ['tests/e2e/game.test.ts'],
    ['tests/core.test.ts', '-t', 'x'],
  ])
    assert.throws(() => pureCoreTests(f.root, args));
  f.put(
    'tests/good.test.ts',
    "import type {Thing} from '../packages/game-core/src/types.js'; class A{constructor(readonly x:number){}}; import('./core.test.ts');",
  );
  f.put('packages/game-core/src/types.ts', 'export type Thing = number;');
  assert.equal(pureCoreTests(f.root, ['tests/good.test.ts']).tests.length, 1);
});

test('file fingerprints track byte and file-set changes, not timestamps', (t) => {
  const f = fixture(t),
    before = fileSnapshot(f.root, ['maps']).digest;
  const path = join(f.root, 'maps/arena.tmj'),
    stat = statSync(path);
  utimesSync(path, new Date(), new Date());
  assert.equal(fileSnapshot(f.root, ['maps']).digest, before);
  f.put('maps/arena.tmj', '{"map":2}');
  utimesSync(path, stat.atime, stat.mtime);
  assert.notEqual(fileSnapshot(f.root, ['maps']).digest, before);
});

test('initial boundary lets preparation repair only declared generated JSON, then validates the complete graph', (t) => {
  const f = fixture(t);
  f.put(
    'packages/game-data/src/index.ts',
    "import map from './arena-map.json'; export {map};",
  );
  assert.throws(() => pureCoreTests(f.root, ['tests/core.test.ts']));
  assert.ok(
    pureCoreTests(f.root, ['tests/core.test.ts'], {
      allowMissingGenerated: true,
    }).files.includes(generatedCoreData[0]),
  );
  f.run().assertFresh();
  pureCoreTests(f.root, ['tests/core.test.ts']);
  rmSync(join(f.root, generatedCoreData[0]));
  pureCoreTests(f.root, ['tests/core.test.ts'], {
    allowMissingGenerated: true,
  });
  f.run().assertFresh();
  pureCoreTests(f.root, ['tests/core.test.ts']);
  f.put(
    'tests/unknown.test.ts',
    "import '../packages/game-data/src/not-generated.json';",
  );
  assert.throws(() =>
    pureCoreTests(f.root, ['tests/unknown.test.ts'], {
      allowMissingGenerated: true,
    }),
  );
});
