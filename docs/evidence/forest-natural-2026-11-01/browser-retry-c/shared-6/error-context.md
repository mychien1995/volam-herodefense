# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: forest-natural.spec.ts >> 6 clients: natural shared Forest spawns and clears two authoritative waves
- Location: tests\e2e\forest-natural.spec.ts:195:3

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('#pregame .pre-title')
Expected: "Phòng chờ"
Received: "Danh sách phòng"
Timeout:  15000ms

Call log:
  - Expect "toHaveText" locator('#pregame .pre-title') with timeout 15000ms
  - waiting for locator('#pregame .pre-title')
    17 × locator resolved to <h1 class="pre-title">Danh sách phòng</h1>
       - unexpected value "Danh sách phòng"

```

```yaml
- heading "Danh sách phòng" [level=1]
```

# Test source

```ts
  1  | import { expect, type Page } from '@playwright/test';
  2  | export async function joinWaiting(page: Page, nickname: string, room?: string) {
  3  |   await page.goto('/?debug=1');
  4  |   await page.locator('#pre-nickname').fill(nickname);
  5  |   await page.getByRole('button', { name: 'Vào game', exact: true }).click();
  6  |   if (room) {
  7  |     await page
  8  |       .locator('#pregame')
  9  |       .getByLabel('Mã phòng', { exact: true })
  10 |       .fill(room);
  11 |     await page
  12 |       .getByRole('button', { name: 'Vào bằng mã', exact: true })
  13 |       .click();
  14 |   } else
  15 |     await page.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
> 16 |   await expect(page.locator('#pregame .pre-title')).toHaveText('Phòng chờ', {
     |                                                     ^ Error: expect(locator).toHaveText(expected) failed
  17 |     timeout: 15000,
  18 |   });
  19 |   await expect(
  20 |     page.locator('#pregame .pre-players strong').filter({ hasText: nickname }),
  21 |   ).toHaveCount(1, { timeout: 15000 });
  22 | }
  23 | export async function startTogether(pages: Page[], ids: string[] = []) {
  24 |   for (const page of pages)
  25 |     await expect
  26 |       .poll(() => page.locator('#pregame .pre-players li').count(), {
  27 |         timeout: 15000,
  28 |       })
  29 |       .toBeGreaterThanOrEqual(pages.length);
  30 |   await pages[0]!.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
  31 |   for (let i = 0; i < pages.length; i++) {
  32 |     const page = pages[i]!;
  33 |     await expect(page.locator('#pregame .pre-title')).toHaveText(
  34 |       'Chọn môn phái',
  35 |     );
  36 |     await page
  37 |       .locator(`#pregame button[data-school=${ids[i] ?? 'cai_bang'}]`)
  38 |       .click();
  39 |     await expect(
  40 |       page.locator(`#pregame button[data-school=${ids[i] ?? 'cai_bang'}]`),
  41 |     ).toHaveAttribute('aria-pressed', 'true');
  42 |     await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  43 |   }
  44 |   for (const page of pages) await expect(page.locator('#pregame')).toBeHidden();
  45 | }
  46 | 
```