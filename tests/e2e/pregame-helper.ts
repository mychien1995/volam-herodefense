import { m1Config } from '@volam/game-data';
import { expect, type Page } from '@playwright/test';
import {
  acknowledgeQaLobby,
  waitForGameReady,
} from '../../tools/qa-browser.mjs';
export async function joinWaiting(
  page: Page,
  nickname: string,
  room?: string,
  query = '/?debug=1',
  timeout = 15000,
) {
  await page.goto(query);
  await page.locator('[data-action=play]').click();
  await page.locator('#pre-nickname').fill(nickname);
  await page.getByRole('button', { name: 'Vào game', exact: true }).click();
  if (room) {
    await page
      .locator('#pregame')
      .getByLabel('Mã phòng', { exact: true })
      .fill(room);
    await page
      .getByRole('button', { name: 'Vào bằng mã', exact: true })
      .click();
  } else
    await page.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
  try {
    await expect(page.locator('#pregame .pre-title')).toHaveText('Phòng chờ', {
      timeout,
    });
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      url: location.href,
      title: document.querySelector('#pregame .pre-title')?.textContent,
      notice: document.querySelector('#pregame .pre-error')?.textContent,
      status: document.querySelector('#status')?.textContent,
      html: document.querySelector('#pregame')?.innerHTML,
    }));
    throw new Error('Join UI diagnostic: ' + JSON.stringify(diagnostic), {
      cause: error,
    });
  }
  await expect(
    page.locator('#pregame .pre-players strong').filter({ hasText: nickname }),
  ).toHaveCount(1, { timeout });
}
export async function startTogether(
  pages: Page[],
  ids: string[] = [],
  timeout = 15000,
  alreadyStarted = false,
) {
  for (const page of pages) {
    await page.bringToFront();
    await expect
      .poll(() => page.locator('#pregame .pre-players li').count(), { timeout })
      .toBeGreaterThanOrEqual(pages.length);
  }
  if (!alreadyStarted)
    await acknowledgeQaLobby(pages[0]!, 'start', '', { timeout });
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    const selection = ids[i] ?? 'cai_bang';
    const profile = m1Config.progression!;
    const school = profile.defaultBranches?.[selection]?.schoolId ?? selection;
    await acknowledgeQaLobby(page, 'school', school, { timeout });
    const needsBranch = await page.evaluate(
      () => (window as any).__VOLAM__.snapshot().state.requiresBranch,
    );
    if (needsBranch) {
      const branch = profile.defaultBranches?.[selection]
        ? selection
        : profile.schools[school]!.basicIds[0]!;
      await acknowledgeQaLobby(page, 'branch', branch, { timeout });
    }
    await expect(page.locator('#scene-status')).toHaveAttribute('data-ready', 'true', {timeout:45000});
    await acknowledgeQaLobby(page, 'confirm', '', { timeout });
  }
  await Promise.all(pages.map((page) => waitForGameReady(page, { timeout })));
}

/** Retry lobby clicks only while the authoritative lobby still awaits them. */
export async function startAuditTogether(
  roster: ReadonlyArray<readonly [Page, string, string]>,
  timeout = 20_000,
  onSelection?: () => Promise<void>,
) {
  const host = roster[0]![0];
  const acknowledge = (
    page: Page,
    action: 'start' | 'school' | 'branch' | 'confirm',
    id = '',
  ) => acknowledgeQaLobby(page, action, id, { timeout });

  await acknowledge(host, 'start');
  await onSelection?.();
  for (const [page, school, branch] of roster) {
    await acknowledge(page, 'school', school);
    await acknowledge(page, 'branch', branch);
    await expect(page.locator('#scene-status')).toHaveAttribute('data-ready', 'true', {timeout:45000});
    await acknowledge(page, 'confirm');
  }
  await Promise.all(
    roster.map(([page]) => waitForGameReady(page, { timeout })),
  );
}
