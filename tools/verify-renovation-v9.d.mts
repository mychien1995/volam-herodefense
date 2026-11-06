import type { Browser } from '@playwright/test';
export function verifyRenovationV9(
  browser: Browser,
  options?: {
    players?: number;
    development?: boolean;
    baseline?: boolean;
    evidenceDir?: string;
  },
): Promise<{
  status: string;
  cases: unknown[];
  party?: { peerDamageAgreement: boolean };
}>;
