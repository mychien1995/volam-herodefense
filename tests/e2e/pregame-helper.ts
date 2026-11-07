import { m1Config } from '@volam/game-data';
import { expect, type Page } from '@playwright/test';
export async function joinWaiting(
  page: Page,
  nickname: string,
  room?: string,
  query = '/?debug=1',
  timeout = 15000,
) {
  await page.goto(query);
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
      .poll(() => page.locator('#pregame .pre-players li').count(), {
        timeout,
      })
      .toBeGreaterThanOrEqual(pages.length);
  }
  if (!alreadyStarted) {
    // Roster patches can replace the host button during pointer-down/click.
    // Retry only while the server still acknowledges WAITING_LOBBY.
    const phase = () =>
      pages[0]!.evaluate(
        () =>
          (window as any).__VOLAM__.snapshot()?.state?.phase ?? 'WAITING_LOBBY',
      );
    await expect(async () => {
      if ((await phase()) !== 'WAITING_LOBBY') return;
      await pages[0]!
        .getByRole('button', { name: 'Bắt đầu', exact: true })
        .click({ timeout: 1000 });
      await expect.poll(phase, { timeout: 1000 }).not.toBe('WAITING_LOBBY');
    }).toPass({ timeout, intervals: [100, 250] });
  }
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    await page.bringToFront();
    await expect(page.locator('#pregame .pre-title')).toHaveText(
      'Chọn môn phái',
    );
    const selection = ids[i] ?? 'cai_bang';
    const profile = m1Config.progression!;
    const school = profile.defaultBranches?.[selection]?.schoolId ?? selection;
    await expect(async () => {
      const choice = page.locator(`#pregame button[data-school=${school}]`);
      await choice.click();
      await expect(choice).toHaveAttribute('aria-pressed', 'true', {
        timeout: 1000,
      });
    }).toPass({ timeout, intervals: [100, 250] });
    const needsBranch = await page.evaluate(
      () => (window as any).__VOLAM__.snapshot().state.requiresBranch,
    );
    if (needsBranch) {
      const branchId = profile.defaultBranches?.[selection]
        ? selection
        : profile.schools[school]!.basicIds[0]!;
      const branch = page.locator(
        '#pregame button[data-branch=' + branchId + ']',
      );
      await expect(async () => {
        if ((await branch.getAttribute('aria-pressed')) === 'true') return;
        await branch.scrollIntoViewIfNeeded({ timeout: 5000 });
        await branch.click({ timeout: 5000 });
        await expect(branch).toHaveAttribute('aria-pressed', 'true', {
          timeout: 1000,
        });
      }).toPass({ timeout, intervals: [100, 250] });
    }
    // A roster patch can replace the button between pointer-down and click.
    // Retry the UI action only while the server has not acknowledged this peer.
    await expect(async () => {
      const confirmed = () =>
        page.evaluate(() => {
          const s = (window as any).__VOLAM__.snapshot();
          return s.state.players[s.sessionId]?.confirmed === true;
        });
      if (await confirmed()) return;
      await page
        .getByRole('button', { name: 'Xác nhận', exact: true })
        .click({ timeout: 1000 });
      await expect.poll(confirmed, { timeout: 1000 }).toBe(true);
    }).toPass({ timeout, intervals: [100, 250] });
  }
  for (const page of pages) {
    await page.bringToFront();
    await expect(page.locator('#pregame')).toBeHidden({ timeout });
  }
}
