import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const path = (value) => (value instanceof URL ? fileURLToPath(value) : value);
export const assetWrites = { changed: 0, unchanged: 0 };

// Compare bytes, not mtimes: restored/corrupted outputs must also be repaired.
export function writeIfChanged(destination, content) {
  const target = path(destination);
  const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content);
  if (existsSync(target) && readFileSync(target).equals(bytes)) {
    assetWrites.unchanged++;
    return false;
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  assetWrites.changed++;
  return true;
}

export function copyIfChanged(source, destination) {
  return writeIfChanged(destination, readFileSync(source));
}

export function copyTreeIfChanged(source, destination) {
  for (const entry of readdirSync(path(source), { withFileTypes: true })) {
    const from = join(path(source), entry.name);
    const to = join(path(destination), entry.name);
    if (entry.isDirectory()) copyTreeIfChanged(from, to);
    else if (entry.isFile()) copyIfChanged(from, to);
    else throw new Error(`Unsupported asset entry: ${from}`);
  }
}
