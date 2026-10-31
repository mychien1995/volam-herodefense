import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  statSync,
  utimesSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  copyTreeIfChanged,
  copyIfChanged,
  writeIfChanged,
} from '../asset-files.mjs';

test('unchanged assets keep their timestamps; changed, corrupt and missing outputs are repaired', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'volam-assets-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const source = join(dir, 'source'),
    target = join(dir, 'target');
  mkdirSync(join(source, 'nested'), { recursive: true });
  writeFileSync(join(source, 'nested', 'sheet.png'), Buffer.from([0, 1, 2, 3]));
  const output = join(target, 'nested', 'sheet.png');
  copyTreeIfChanged(source, target);
  utimesSync(output, new Date(1000), new Date(1000));
  const before = statSync(output).mtimeMs;
  copyTreeIfChanged(source, target);
  assert.equal(statSync(output).mtimeMs, before);
  assert.deepEqual(readFileSync(output), Buffer.from([0, 1, 2, 3]));
  writeFileSync(output, Buffer.from([9, 9, 9, 9]));
  utimesSync(output, new Date(1000), new Date(1000));
  assert.equal(
    copyIfChanged(join(source, 'nested', 'sheet.png'), output),
    true,
  );
  assert.deepEqual(readFileSync(output), Buffer.from([0, 1, 2, 3]));
  rmSync(output);
  copyTreeIfChanged(source, target);
  assert.deepEqual(readFileSync(output), Buffer.from([0, 1, 2, 3]));
  writeFileSync(join(source, 'nested', 'sheet.png'), Buffer.from([4, 5, 6, 7]));
  copyTreeIfChanged(source, target);
  assert.deepEqual(readFileSync(output), Buffer.from([4, 5, 6, 7]));
});

test('generated UTF-8 metadata is written only when its bytes change', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'volam-metadata-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const output = pathToFileURL(join(dir, 'manifest.json'));
  assert.equal(writeIfChanged(output, '{"name":"Võ Đang"}\n'), true);
  assert.equal(writeIfChanged(output, '{"name":"Võ Đang"}\n'), false);
  assert.equal(writeIfChanged(output, '{"name":"Thiên Sơn"}\n'), true);
});
