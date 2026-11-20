import { fileSnapshot } from './core-test-cache.mjs';
import { readdirSync, existsSync } from 'node:fs';

const projects = [
  'packages/game-core',
  'packages/game-data',
  'packages/game-protocol',
  'apps/game-server',
];
export function iterationSnapshot(root, kind) {
  const configs = readdirSync(root).filter((p) =>
    /^(?:tsconfig.*\.json|.*\.config\.[tm]s|package\.json|pnpm.*\.yaml|\.env.*)$/.test(
      p,
    ),
  );
  const input = [
    ...configs,
    ...projects.flatMap((p) => [
      `${p}/src`,
      `${p}/tsconfig.json`,
      `${p}/package.json`,
    ]),
  ];
  const output = projects.flatMap((p) => [
    `${p}/dist`,
    `${p}/tsconfig.tsbuildinfo`,
  ]);
  const paths =
    kind === 'input'
      ? input
      : kind === 'output'
        ? output
        : [
            ...input,
            ...output,
            'tsconfig.base.json',
            'apps/game-client/src',
            'apps/game-client/public',
            'apps/game-client/index.html',
            'apps/game-client/package.json',
            'apps/game-client/tsconfig.json',
            'apps/game-client/vite.config.ts',
            ...(existsSync(root + '/apps/game-client')
              ? readdirSync(root + '/apps/game-client', { withFileTypes: true })
                  .filter((p) => p.isFile() && p.name.startsWith('.env'))
                  .map((p) => 'apps/game-client/' + p.name)
              : []),
            'tools',
            'scripts',
            'tests/e2e',
          ];
  return fileSnapshot(root, paths).digest;
}

/** No disk receipt and no cached success: only this owner's live handles qualify. */
export class IterationLease {
  current;
  busy = false;
  async round({ fingerprint, start, verify, reset, execute }) {
    if (this.busy) throw Error('QA iteration already running');
    this.busy = true;
    let reused = false;
    try {
      const digest = await fingerprint();
      if (this.current && this.current.digest !== digest) await this.close();
      reused = !!this.current;
      this.current ??= { digest, service: await start() };
      await verify(this.current.service);
      const before = await reset(this.current.service);
      const result = await execute(this.current.service);
      const after = await reset(this.current.service);
      await verify(this.current.service);
      if ((await fingerprint()) !== digest)
        throw Error(
          'QA inputs/outputs changed during iteration; result rejected',
        );
      return { fingerprint: digest, reused, before, after, result };
    } catch (cause) {
      try {
        await this.close();
      } catch (cleanup) {
        throw new AggregateError(
          [cause, cleanup],
          'Iteration and cleanup failed',
          { cause },
        );
      }
      throw cause;
    } finally {
      this.busy = false;
    }
  }
  async close() {
    const entry = this.current;
    this.current = undefined;
    if (entry) await entry.service.close();
  }
}
