import type { Browser, Page } from '@playwright/test';
import type { MatchRoom } from '../apps/game-server/src/rooms/MatchRoom.js';

interface Options {
  players?: number;
  development?: boolean;
  evidenceDir?: string;
  clientQuery?: string;
  compareLegacy?: boolean;
  onSelection?: (context: {
    page: Page;
    pages: Page[];
    out: string;
  }) => Promise<void>;
}
export interface RenovationReady {
  room: MatchRoom;
  pages: Page[];
  out: string;
  report: { players: number; development: boolean; protocol: number };
}

export function verifyRenovationRuntime<T>(
  browser: Browser,
  options: Options & { onReady: (context: RenovationReady) => Promise<T> },
): Promise<T>;
export function verifyRenovationRuntime(
  browser: Browser,
  options?: Options,
): Promise<{ status: string; players: number; development: boolean }>;
