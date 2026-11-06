import type { Browser } from '@playwright/test';
export function verifyRenovationV4(
  browser: Browser,
  options?: {
    before?: boolean;
    development?: boolean;
    players?: number;
    focused?: boolean;
  },
): Promise<{
  status: string;
  cases: unknown[];
  party: { peerDamageAgreement: boolean };
}>;
