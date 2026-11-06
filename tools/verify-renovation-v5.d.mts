import type { Browser } from '@playwright/test';
export function verifyRenovationV5(
  browser: Browser,
  options?: {
    players?: number;
    development?: boolean;
    full?: boolean;
    bosses?: boolean;
    scope?: 'all' | 'schools' | 'basics' | 'bosses';
  },
): Promise<{
  status: string;
  cases: unknown[];
  basics: { direction: string; stages: string[]; frames: string[] }[];
  bosses?: { cases: unknown[] };
  party?: { peerDamageAgreement: boolean };
}>;
