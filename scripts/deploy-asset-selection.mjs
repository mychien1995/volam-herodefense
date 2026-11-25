import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Only these audited atlas families are pruned. Other UI/data/audio assets
// retain the previous packaging behavior, including non-Phaser consumers.
export const auditedAtlasFamily =
  /^(renovation-v\d+\/|visual-improvement-approved\/|[^/]+-unified-v\d+\/|hero-(?:finish|motion)-v1\/|skill-revise[^/]*\/)/;
// DOM consumers (hero-portraits.ts and skillIcon) construct these URLs
// dynamically; they must survive independently of Phaser's preload queue.
export const atlasUiAsset = (path) =>
  /(^|\/)(?:icons?|portraits?|avatars?)\/|(^|\/)(?:avatar(?:-body)?|portrait[^/]*|[^/]*[-_]icon[^/]*)\.(?:png|svg|json)$/i.test(
    path,
  );
export function atlasUiPaths(root) {
  const paths = [];
  const visit = (directory, prefix = '') => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = prefix + entry.name;
      if (entry.isDirectory()) visit(join(directory, entry.name), path + '/');
      else if (auditedAtlasFamily.test(path) && atlasUiAsset(path))
        paths.push('/assets/' + path);
    }
  };
  visit(join(root, 'apps/game-client/public/assets'));
  return paths;
}
export function deploymentInputs(root) {
  const result = {};
  const visit = (dir, extensions) => {
    for (const item of readdirSync(join(root, dir), { withFileTypes: true })) {
      const path = join(dir, item.name);
      if (item.isDirectory()) visit(path, extensions);
      else if (extensions.some((ext) => item.name.endsWith(ext))) {
        result[path.replaceAll('\\', '/')] = createHash('sha256')
          .update(
            readFileSync(join(root, path), 'utf8').replaceAll('\r\n', '\n'),
          )
          .digest('hex');
      }
    }
  };
  visit('apps/game-client/src', ['.ts', '.json', '.css']);
  visit('assets/exports', ['.json']);
  visit('apps/game-client/public/assets', ['.json']);
  visit('packages/game-data/src', ['.ts', '.json']);
  result['apps/game-client/index.html'] = createHash('sha256')
    .update(
      readFileSync(
        join(root, 'apps/game-client/index.html'),
        'utf8',
      ).replaceAll('\r\n', '\n'),
    )
    .digest('hex');
  return result;
}
export function completeDeploymentPaths(loaderPaths, staticTexts) {
  const paths = new Set(loaderPaths);
  for (const text of staticTexts)
    for (const match of text.matchAll(/\/assets\/[^"'()\s;<>]+/g))
      paths.add(match[0].split(/[?#]/)[0]);
  return [...paths].sort();
}
export function staticDeploymentTexts(root) {
  const texts = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.name.endsWith('.css'))
        texts.push(readFileSync(path, 'utf8'));
    }
  };
  visit(join(root, 'apps/game-client/src'));
  texts.push(readFileSync(join(root, 'apps/game-client/index.html'), 'utf8'));
  return texts;
}
export function validateSelection(manifest, inputs) {
  if (
    manifest.version !== 1 ||
    manifest.failures?.length ||
    !manifest.paths?.length
  )
    throw Error('Incomplete production loader audit');
  const expected = manifest.inputs;
  if (
    !expected ||
    Object.keys(expected).length !== Object.keys(inputs).length ||
    Object.entries(inputs).some(([path, hash]) => expected[path] !== hash)
  )
    throw Error(
      'Production asset selection is stale. Run node tools/audit-deploy-assets.mjs after asset preparation.',
    );
  for (const url of manifest.paths)
    if (!url.startsWith('/assets/') || url.split('/').includes('..'))
      throw Error('Invalid deployment asset URL: ' + url);
  return new Set(manifest.paths);
}
export function keepDeploymentAsset(path, selection) {
  return (
    atlasUiAsset(path) ||
    !auditedAtlasFamily.test(path) ||
    selection.has('/assets/' + path)
  );
}
