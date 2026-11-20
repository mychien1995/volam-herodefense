import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  statSync,
  utimesSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import {
  previewInputPaths,
  previewInputFingerprint,
} from '../../tools/qa-preview-inputs.mjs';

test('preview build tracks external asset bytes, globs and additions; dynamic imports fail closed', () => {
  const parent = resolve('.cache');
  mkdirSync(parent, { recursive: true });
  const root = mkdtempSync(resolve(parent, 'qa-preview-input-test-'));
  try {
    mkdirSync(resolve(root, 'apps/game-client/src'), { recursive: true });
    mkdirSync(resolve(root, 'assets/exports/native'), { recursive: true });
    mkdirSync(resolve(root, 'assets/sounds'), { recursive: true });
    const source = resolve(root, 'apps/game-client/src/main.ts'),
      asset = resolve(root, 'assets/exports/native/frame.png');
    writeFileSync(
      source,
      "import sound from '../../../assets/sounds/ost.mp3?url'; const packs = import.meta.glob('../../../assets/exports/native/**/*.json');",
    );
    writeFileSync(asset, 'abc');
    writeFileSync(resolve(root, 'assets/sounds/ost.mp3'), 'audio');
    const paths = previewInputPaths(root);
    assert.deepEqual(paths, ['assets/exports', 'assets/sounds/ost.mp3']);
    const first = previewInputFingerprint(root, paths),
      old = statSync(asset);
    writeFileSync(asset, 'xyz');
    utimesSync(asset, old.atime, old.mtime);
    assert.notEqual(previewInputFingerprint(root, paths), first);
    writeFileSync(asset, 'abc');
    assert.equal(previewInputFingerprint(root, paths), first);
    writeFileSync(resolve(root, 'assets/exports/native/new.json'), '{}');
    assert.notEqual(previewInputFingerprint(root, paths), first);
    writeFileSync(source, "const name = 'other'; import(name);");
    assert.throws(() => previewInputPaths(root), /Dynamic preview import/);
  } finally {
    assert.equal(dirname(root), parent);
    assert.ok(root.startsWith(resolve(parent, 'qa-preview-input-test-')));
    rmSync(root, { recursive: true, force: true });
  }
});
