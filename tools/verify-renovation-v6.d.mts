import type { Browser } from '@playwright/test';
export function verifyRenovationV6(
  browser: Browser,
  options?: {
    players?: number;
    development?: boolean;
    scope?: 'heroes' | 'bosses';
    skills?: string[];
    evidenceDir?: string;
  },
): Promise<{
  status: string;
  cases: unknown[];
  bosses?: { cases: unknown[] };
  party?: { peerDamageAgreement: boolean };
}>;
