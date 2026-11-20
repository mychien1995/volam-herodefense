import type { Plugin } from 'vite';
export interface QaSession {
  contract?: {
    name: string;
    ports: number[];
    services: Array<{ serverPort?: number; clientPort: number }>;
    channels: Array<string | null>;
    clientMode: string;
    executableEnv?: string;
  };
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
export function requireQaPorts(ports: number[]): Promise<void>;
export function verifyQaIdentity(
  url: string,
  expected: Record<string, unknown>,
): Promise<Record<string, unknown>>;
export function qaIdentityPlugin(session: QaSession): Plugin;
export function ownedQaServices(): {
  add(close: () => unknown): void;
  close(): Promise<void>;
};

export function qaWorkflowSession(
  mode: 'quick' | 'browser' | 'final',
  args?: string[],
  env?: NodeJS.ProcessEnv,
): QaSession;

export function qaManagedProfile(
  mode: 'quick' | 'browser' | 'final',
  args?: string[],
): { profile?: string; serverPort?: number; clientPort?: number } | null;
