import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { expect, it } from 'vitest';

it('keeps core dependency-free and guards against platform imports and implicit time/RNG', () => {
  const visit = (path: string): void => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const file = join(path, entry.name);
      if (entry.isDirectory()) {
        visit(file);
        continue;
      }
      if (!file.endsWith('.ts')) continue;
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(
        /(?:from|import)\s*['"]([^'"]+)['"]/g,
      )) {
        expect(
          match[1]?.startsWith('.'),
          `External core import in ${file}`,
        ).toBe(true);
      }
      expect(source).not.toMatch(
        /\b(?:window|document|performance|Date|process|require)\b/,
      );
      expect(source).not.toMatch(/Math\s*\.\s*random|import\s*\(/);
    }
  };
  visit(resolve('packages/game-core/src'));
  const manifest = JSON.parse(
    readFileSync(resolve('packages/game-core/package.json'), 'utf8'),
  ) as { dependencies?: object };
  expect(Object.keys(manifest.dependencies ?? {})).toEqual([]);
});
