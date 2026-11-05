import type { Browser } from '@playwright/test';
export function verifyRenovationRuntime(
  browser: Browser,
  options?: { players?: number; development?: boolean },
): Promise<{ status: string; players: number; development: boolean }>;
