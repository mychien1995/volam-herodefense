import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import { requireQaCheckoutReady } from '../../tools/qa-checkout-state.mjs';

test('QA detects real merge conflicts without changing the index or conflict bytes', () => {
  const parent = resolve('.cache');
  mkdirSync(parent, { recursive: true });
  const root = mkdtempSync(resolve(parent, 'qa-checkout-test-'));
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      windowsHide: true,
    });
  const commit = (message) =>
    git(
      '-c',
      'user.name=QA Test',
      '-c',
      'user.email=qa@example.invalid',
      'commit',
      '-qm',
      message,
    );
  try {
    git('init', '-q');
    git('symbolic-ref', 'HEAD', 'refs/heads/main');
    writeFileSync(resolve(root, 'input.txt'), 'base\n');
    git('add', 'input.txt');
    commit('base');
    assert.equal(requireQaCheckoutReady(root).unresolvedConflicts, 0);
    git('checkout', '-qb', 'other');
    writeFileSync(resolve(root, 'input.txt'), 'other\n');
    git('add', 'input.txt');
    commit('other');
    git('checkout', '-q', 'main');
    writeFileSync(resolve(root, 'input.txt'), 'main\n');
    git('add', 'input.txt');
    commit('main');
    assert.equal(
      spawnSync('git', ['merge', 'other'], { cwd: root, windowsHide: true })
        .status,
      1,
    );
    const before = readFileSync(resolve(root, 'input.txt')),
      index = git('ls-files', '-u');
    assert.throws(
      () => requireQaCheckoutReady(root),
      /unresolved conflicts: input.txt/,
    );
    assert.deepEqual(readFileSync(resolve(root, 'input.txt')), before);
    assert.equal(git('ls-files', '-u'), index);
  } finally {
    assert.equal(dirname(root), parent);
    assert.ok(root.startsWith(resolve(parent, 'qa-checkout-test-')));
    rmSync(root, { recursive: true, force: true });
  }
});
