import type { Browser } from '@playwright/test';
export function verifyRenovationV3(
  browser: Browser,
  options?: {
    players?: number;
    development?: boolean;
    full?: boolean;
    scope?: string;
    captureOnly?: boolean;
  },
): Promise<{
  status: string;
  skills: unknown[];
  basics: unknown[];
  party: { peerDamageAgreement: boolean };
}>;
