import type { Page } from '@playwright/test';
export function profileQaPage(
  page: Page,
): Promise<() => Promise<Record<string, unknown>>>;
