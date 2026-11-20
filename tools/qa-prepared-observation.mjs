import { createHash } from 'node:crypto';
import { relative, resolve } from 'node:path';
import { fileSnapshot } from './core-test-cache.mjs';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const key = (name) =>
  process.platform === 'win32' ? name.toLowerCase() : name;
const allowed = (name) =>
  typeof name === 'string' &&
  name.startsWith('apps/game-client/public/') &&
  !name.includes('\\') &&
  !name.split('/').some((p) => p === '..' || p === '.' || !p);

/** A fresh observation, not a stored PASS or an mtime/content cache. */
export function prepareOutputObserver(root, nonce) {
  const outputs = new Map();
  let observedWrites = 0,
    bytesHashed = 0;
  return {
    observe(path, bytes) {
      const name = relative(root, resolve(path)).replaceAll('\\', '/');
      if (!allowed(name)) return;
      observedWrites++;
      bytesHashed += bytes.byteLength;
      outputs.set(name, hash(bytes));
    },
    receipt(exitCode) {
      return {
        version: 1,
        root: resolve(root),
        nonce,
        complete: exitCode === 0,
        exitCode,
        observedWrites,
        bytesHashed,
        entries: [...outputs].sort(([a], [b]) => a.localeCompare(b)),
      };
    },
  };
}

export function preparedObservation(root, receipt, nonce) {
  if (
    typeof nonce !== 'string' ||
    !nonce ||
    receipt?.version !== 1 ||
    receipt.root !== resolve(root) ||
    receipt.nonce !== nonce ||
    !receipt.complete ||
    receipt.exitCode !== 0 ||
    !Array.isArray(receipt.entries)
  )
    throw Error('Invalid owned preparation observation');
  const entries = new Map();
  for (const row of receipt.entries) {
    if (
      !Array.isArray(row) ||
      row.length !== 2 ||
      !allowed(row[0]) ||
      !/^[a-f0-9]{64}$/.test(row[1]) ||
      entries.has(key(row[0]))
    )
      throw Error('Invalid or duplicate preparation observation path/hash');
    entries.set(key(row[0]), row[1]);
  }
  let consumed = false;
  return {
    outputs: entries.size,
    snapshot(paths) {
      if (consumed)
        throw Error(
          'Preparation observation can only supply the first snapshot once',
        );
      consumed = true;
      const seen = new Set(),
        observed = new Map();
      // Original traversal still checks every directory/file type and symlink.
      const fresh = fileSnapshot(root, paths, (name) => {
        if (!entries.has(key(name))) return true;
        seen.add(key(name));
        observed.set(name, entries.get(key(name)));
        return false;
      });
      if (seen.size !== entries.size)
        throw Error('Prepared output missing from current snapshot inventory');
      const combined = [...fresh.entries, ...observed].sort(([a], [b]) =>
        a.localeCompare(b),
      );
      return { digest: hash(JSON.stringify(combined)), entries: combined };
    },
  };
}
