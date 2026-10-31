import type { Plugin } from 'vite';
export interface QaSession {
  profile: string;
  serverPort: number;
  clientPort: number;
  serverUrl: string;
  clientUrl: string;
  runId: string;
  cacheDir: string | undefined;
  outputDir: string;
}
export function qaSession(
  defaults?: {
    profile?: string;
    serverPort?: number;
    clientPort?: number;
    outputDir?: string;
  },
  env?: NodeJS.ProcessEnv,
): QaSession;
export function qaEvidenceDirectory(
  defaultDirectory: string,
  env?: NodeJS.ProcessEnv,
): string;
export function requireFreePorts(session: QaSession): Promise<void>;
export function verifyQaIdentity(
  url: string,
  expected: Record<string, unknown>,
): Promise<Record<string, unknown>>;
export function qaIdentityPlugin(session: QaSession): Plugin;
export function ownedQaServices(): {
  add(close: () => unknown): void;
  close(): Promise<void>;
};
