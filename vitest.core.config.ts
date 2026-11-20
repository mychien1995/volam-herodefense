import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import base from './vitest.config.js';
import { coreTestExecution } from './tools/core-test-execution.mjs';

const root = import.meta.dirname;
const tests: unknown = JSON.parse(
  process.env['VOLAM_CORE_TEST_FILES'] ?? 'null',
);
if (
  !Array.isArray(tests) ||
  !tests.length ||
  !tests.every(
    (name) =>
      typeof name === 'string' &&
      /^tests\/[a-zA-Z0-9_/-]+\.test\.ts$/.test(name),
  )
)
  throw Error(
    'Run pnpm check:core <explicit test files>; cache validation is required',
  );
const dataRequire = createRequire(
  resolve(root, 'packages/game-data/package.json'),
);

export default defineConfig({
  ...base,
  resolve: {
    alias: {
      '@volam/game-core': resolve(root, '.cache/pure-core/build/core/index.js'),
      '@volam/game-data': resolve(root, '.cache/pure-core/build/data/index.js'),
      zod: dataRequire.resolve('zod'),
    },
  },
  test: { ...base.test, include: tests, ...coreTestExecution() },
});
