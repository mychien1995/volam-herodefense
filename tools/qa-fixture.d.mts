import type { QaSession } from './qa-session.mjs';
export interface FixtureOwners {
  add(close: () => unknown): void;
}
export function runQaFixture<
  S extends {
    listen(port: number): Promise<unknown>;
    gracefullyShutdown(exit: boolean): Promise<unknown>;
  },
  O,
>(options: {
  session: QaSession;
  environment?: Record<string, string | undefined>;
  protocolVersion: number;
  preview?: boolean;
  verifyBuild?: () => unknown;
  createServer?: () => S | Promise<S>;
  configure?: (
    server: S,
    owned: FixtureOwners,
  ) => O | undefined | Promise<O | undefined>;
  createClient: (
    options: O | undefined,
  ) => Promise<{ close(): Promise<unknown>; listen?: () => Promise<unknown> }>;
}): Promise<() => Promise<void>>;
