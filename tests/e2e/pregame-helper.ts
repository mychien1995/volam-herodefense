import { expect, type Page } from '@playwright/test';
export async function joinWaiting(page: Page, nickname: string, room?: string) {
  await page.goto('/?debug=1');
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
  await expect(page.locator('#pregame .pre-title')).toHaveText('Phòng chờ', {
    timeout: 15000,
  });
  await expect(
    page.locator('#pregame .pre-players strong').filter({ hasText: nickname }),
  ).toHaveCount(1, { timeout: 15000 });
}
export async function startTogether(pages: Page[], ids: string[] = []) {
  for (const page of pages)
    await expect
      .poll(() => page.locator('#pregame .pre-players li').count(), {
        timeout: 15000,
      })
      .toBeGreaterThanOrEqual(pages.length);
  await pages[0]!.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    await expect(page.locator('#pregame .pre-title')).toHaveText(
      'Chọn môn phái',
    );
    await page
      .locator(`#pregame button[data-school=${ids[i] ?? 'cai_bang'}]`)
      .click();
    await expect(
      page.locator(`#pregame button[data-school=${ids[i] ?? 'cai_bang'}]`),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  }
  for (const page of pages) await expect(page.locator('#pregame')).toBeHidden();
}
