import type { Page } from '@playwright/test';
export interface QaObservationOptions {
  label?: string;
  timeout?: number;
  polling?: number;
  keyDelay?: number;
}
export function qaBrowserDiagnostic(
  page: Page,
): Promise<Record<string, unknown>>;
export function observeQa<T, A>(
  page: Page,
  predicate: (argument: A) => T | false | undefined,
  argument: A,
  options?: QaObservationOptions,
): Promise<T>;
export function waitForGameReady(
  page: Page,
  options?: QaObservationOptions,
): Promise<void>;
export function acknowledgeQaLobby(
  page: Page,
  action: 'start' | 'school' | 'branch' | 'confirm',
  id?: string,
  options?: QaObservationOptions,
): Promise<void>;
export function pressQaAndWait<T, A>(
  page: Page,
  key: string,
  predicate: (argument: A) => T | false | undefined,
  argument: A,
  options?: QaObservationOptions,
): Promise<T>;
