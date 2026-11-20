import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative, dirname, isAbsolute } from 'node:path';
import { parseSync } from 'vite';
import { fileSnapshot } from './core-test-cache.mjs';
import { profileSync } from './qa-cost-profile.mjs';

/** Conservative build inputs: source exports plus static external imports/glob roots.
 * Client sources/public/shared packages are already in the normal service hash.
 * Installed bare packages retain the existing pinned-installation assumption.
 */
export function previewInputPaths(root) {
  const paths = new Set(['assets/exports']);
  const add = (file, spec, glob = false) => {
    if (typeof spec !== 'string' || !spec.startsWith('.')) return;
    const prefix = spec.split(/[?*{[]/)[0];
    const path = resolve(
      dirname(file),
      glob
        ? prefix.endsWith('/')
          ? prefix
          : dirname(prefix)
        : spec.split('?')[0],
    );
    const name = relative(root, path).replaceAll('\\', '/');
    if (name.startsWith('../') || isAbsolute(name))
      throw Error('Preview input escapes workspace');
    if (
      name.startsWith('apps/game-client/src/') ||
      name.startsWith('packages/') ||
      name.startsWith('assets/exports/')
    )
      return;
    paths.add(name);
  };
  function visit(file) {
    const ast = parseSync(file, readFileSync(file, 'utf8'), { lang: 'ts' });
    if (ast.errors.length) throw Error('Cannot audit preview imports: ' + file);
    const literal = (node) =>
      node?.type === 'Literal' && typeof node.value === 'string'
        ? node.value
        : undefined;
    function walk(node) {
      if (!node || typeof node !== 'object') return;
      if (
        [
          'ImportDeclaration',
          'ExportNamedDeclaration',
          'ExportAllDeclaration',
        ].includes(node.type) &&
        node.source
      )
        add(file, literal(node.source));
      if (node.type === 'ImportExpression') {
        const spec = literal(node.source);
        if (!spec)
          throw Error(
            'Dynamic preview import requires an audited input boundary: ' +
              file,
          );
        add(file, spec);
      }
      if (node.type === 'NewExpression' && node.callee?.name === 'URL')
        add(file, literal(node.arguments?.[0]));
      if (
        node.type === 'CallExpression' &&
        node.callee?.property?.name === 'glob'
      ) {
        const arg = node.arguments[0],
          values = arg?.type === 'ArrayExpression' ? arg.elements : [arg];
        for (const value of values) {
          const spec = literal(value);
          if (!spec)
            throw Error(
              'Nonliteral preview glob requires an audited input boundary',
            );
          add(file, spec, true);
        }
      }
      for (const [key, value] of Object.entries(node))
        if (!['loc', 'start', 'end', 'raw'].includes(key))
          if (Array.isArray(value)) value.forEach(walk);
          else if (value && typeof value === 'object') walk(value);
    }
    walk(ast.program);
  }
  function files(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink())
        throw Error('Symlink in preview source inputs');
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) files(path);
      else if (entry.isFile() && /\.tsx?$/.test(entry.name)) visit(path);
    }
  }
  files(resolve(root, 'apps/game-client/src'));
  const sorted = [...paths].sort();
  return sorted.filter(
    (name) =>
      !sorted.some(
        (parent) => parent !== name && name.startsWith(parent + '/'),
      ),
  );
}
export function previewInputFingerprint(root, paths, observe) {
  const snapshot = () => fileSnapshot(root, paths).digest;
  if (!observe) return snapshot();
  const { value, cost } = profileSync(snapshot, root);
  observe({ kind: 'preview-input', ...cost });
  return value;
}
