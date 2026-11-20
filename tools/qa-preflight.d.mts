import type { QaSession } from './qa-session.mjs';
export function verifyQaBuild(
  root: string,
  session: Pick<QaSession, 'serverUrl' | 'contract'>,
): Record<string, string>;

export interface QaPreflightReport {
  status: 'PASS' | 'FAIL';
  mode: string;
  stage: string;
  milliseconds: number;
  checks: Array<{
    id: string;
    status: 'PASS' | 'FAIL';
    detail?: unknown;
    message?: string;
    remedy?: string;
  }>;
  note?: string;
}
export function qaBrowserEnvironment(
  env?: NodeJS.ProcessEnv,
  root?: string,
): NodeJS.ProcessEnv & { PLAYWRIGHT_BROWSERS_PATH: string };
export function supportsNode(version: string, range: string): boolean;
export function managedQaProfile(mode: string, args?: string[]): boolean;
export function qaPreflight(options?: {
  mode?: string;
  args?: string[];
  root?: string;
  env?: NodeJS.ProcessEnv;
  stage?: string;
  nodeVersion?: string;
}): Promise<QaPreflightReport>;
export function formatPreflight(report: QaPreflightReport): string;
