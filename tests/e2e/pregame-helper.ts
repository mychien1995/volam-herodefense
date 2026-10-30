import { expect, type Page } from '@playwright/test';
export async function joinWaiting(page: Page, nickname: string, room?: string) {
  await page.goto('/?debug=1');
  await page.locator('#pre-nickname').fill(nickname);
  await page.getByRole('button', { name: 'Enter Game', exact: true }).click();
  if (room) {
    await page.getByLabel('Room code', { exact: true }).fill(room);
    await page
      .getByRole('button', { name: 'Join by code', exact: true })
      .click();
  } else
    await page
      .getByRole('button', { name: 'Create room', exact: true })
      .click();
  await expect(page.locator('#pregame .pre-title')).toHaveText('Waiting Lobby');
}
export async function startTogether(pages: Page[], ids: string[] = []) {
  await pages[0]!
    .getByRole('button', { name: 'Start Game', exact: true })
    .click();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]!;
    await expect(page.locator('#pregame .pre-title')).toHaveText(
      'School Selection',
    );
    await page.locator(`[data-school=${ids[i] ?? 'cai_bang'}]`).click();
    await expect(
      page.locator(`[data-school=${ids[i] ?? 'cai_bang'}]`),
    ).toHaveAttribute('aria-pressed', 'true');
    await page
      .getByRole('button', { name: 'Confirm Selection', exact: true })
      .click();
  }
  for (const page of pages) await expect(page.locator('#pregame')).toBeHidden();
}
