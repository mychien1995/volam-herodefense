import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

export const compressible = /^(?:assets|bundles)\/.*\.(?:js|css|json|tmj|svg)$/;
export const deliveryMime = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.tmj': 'application/json',
  '.svg': 'image/svg+xml',
};
export function prepareClientDelivery(directory, { repo } = {}) {
  const files = [];
  const visit = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) visit(p);
      else if (e.isFile()) files.push(p);
    }
  };
  visit(directory);
  let gzipFiles = 0,
    originalBytes = 0,
    gzipBytes = 0;
  const bundles = [];
  for (const path of files) {
    const name = relative(directory, path).replaceAll('\\', '/');
    if (name.startsWith('bundles/') && !name.endsWith('.gz'))
      bundles.push({
        file: name,
        sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
      });
    if (!compressible.test(name)) continue;
    const bytes = readFileSync(path);
    if (bytes.length < 512) continue;
    const packed = gzipSync(bytes, { level: 9 });
    if (packed.length >= bytes.length) continue;
    writeFileSync(path + '.gz', packed);
    gzipFiles++;
    originalBytes += bytes.length;
    gzipBytes += packed.length;
  }
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: repo,
      encoding: 'utf8',
      windowsHide: true,
    }).trim();
  const branch = repo ? git('symbolic-ref', '--short', 'HEAD') : 'fixture';
  const commit = repo ? git('rev-parse', 'HEAD') : 'fixture';
  const protocol = repo
    ? Number(
        readFileSync(
          resolve(repo, 'packages/game-protocol/src/index.ts'),
          'utf8',
        ).match(/PROTOCOL_VERSION\s*=\s*(\d+)/)[1],
      )
    : 0;
  const buildId = createHash('sha256')
    .update(
      JSON.stringify({
        branch,
        commit,
        bundles: bundles.sort((a, b) => a.file.localeCompare(b.file)),
      }),
    )
    .digest('hex')
    .slice(0, 16);
  const result = {
    branch,
    commit,
    protocolVersion: protocol,
    buildId,
    builtAtUtc: new Date().toISOString(),
    workingTreeChanges: repo ? !!git('status', '--porcelain') : false,
    gzipFiles,
    originalBytes,
    gzipBytes,
  };
  writeFileSync(
    resolve(directory, 'volam-build-info.json'),
    JSON.stringify(result, null, 2) + '\n',
  );
  console.info(
    `Delivery ${branch}@${commit.slice(0, 8)} / protocol ${protocol}: ${gzipFiles} gzip files, ${originalBytes} -> ${gzipBytes} bytes`,
  );
  return result;
}
