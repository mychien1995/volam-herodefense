import type { QaSession } from './qa-session.mjs';
import type { ChildProcess } from 'node:child_process';
export function stopQaChild(
  child: ChildProcess,
  runId: string,
  timeout: number,
): Promise<void>;
export function startQaChildren(options: {
  services: Array<{
    name: string;
    script: string;
    args?: string[];
    environment?: Record<string, string>;
    serverPort: number;
    clientPort: number;
    ports?: number[];
  }>;
  directory: string;
  protocolVersion: number;
  readyTimeout?: number;
  stopTimeout?: number;
}): Promise<() => Promise<void>>;
export function serveQaChild(
  session: QaSession,
  protocolVersion: number,
  start: () => Promise<() => Promise<void>>,
): Promise<void>;
