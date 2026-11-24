import type { Page } from '@playwright/test';
export function pauseSecondaryRenderers(pages: Page[]): Promise<void>;
export function resumeSecondaryRenderers(pages: Page[]): Promise<void>;
export function arm(
  page: Page,
  id: string,
  ms: number,
  waitForPrefix?: string,
  minFrames?: number,
): Promise<() => Promise<any>>;
export function verifySkillReviseGame(options: {
  room: any;
  pages: Page[];
  out: string;
  report: any;
}): Promise<any>;
