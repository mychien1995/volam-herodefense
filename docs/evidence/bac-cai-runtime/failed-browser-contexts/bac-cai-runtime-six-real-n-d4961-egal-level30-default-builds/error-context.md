# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: bac-cai-runtime.spec.ts >> six real network clients: natural combat with unchanged trial tuning and legal level30 default builds
- Location: tests\e2e\bac-cai-runtime.spec.ts:235:1

# Error details

```
Error: Join UI diagnostic: {"url":"http://127.0.0.1:5397/?debug=1","title":"Danh sách phòng","notice":"Mất kết nối (1006). Hãy tạo hoặc vào phòng để trở lại.","status":"Mất kết nối (1006). Hãy tạo hoặc vào phòng để trở lại.","html":"<section class=\"pre-window \"><h1 class=\"pre-title\">Danh sách phòng</h1><div class=\"room-scroll\"><table><thead><tr><th>Phòng / Mã</th><th>Người chơi</th><th>Trạng thái</th><th></th></tr></thead><tbody><tr><td>eW6_9e93d</td><td>4/6</td><td>Đang chờ</td><td><button data-action=\"join\" data-room=\"eW6_9e93d\">Vào phòng</button></td></tr></tbody></table></div><div class=\"pre-actions\"><button type=\"button\" data-action=\"back\">Quay lại</button><button type=\"button\" data-action=\"refresh\">Làm mới</button><button type=\"button\" data-action=\"create\">Tạo phòng</button></div><form id=\"code-form\"><label class=\"sr-only\" for=\"pre-code\">Mã phòng</label><input id=\"pre-code\" placeholder=\"MÃ PHÒNG\" autocomplete=\"off\"><button>Vào bằng mã</button></form><p class=\"pre-error\" role=\"status\" aria-live=\"polite\">Mất kết nối (1006). Hãy tạo hoặc vào phòng để trở lại.</p></section>"}
```

# Test source

```ts
  1  | import { expect, type Page } from '@playwright/test';
  2  | export async function joinWaiting(
  3  |   page: Page,
  4  |   nickname: string,
  5  |   room?: string,
  6  |   query = '/?debug=1',
  7  |   timeout = 15000,
  8  | ) {
  9  |   await page.goto(query);
  10 |   await page.locator('#pre-nickname').fill(nickname);
  11 |   await page.getByRole('button', { name: 'Vào game', exact: true }).click();
  12 |   if (room) {
  13 |     await page
  14 |       .locator('#pregame')
  15 |       .getByLabel('Mã phòng', { exact: true })
  16 |       .fill(room);
  17 |     await page
  18 |       .getByRole('button', { name: 'Vào bằng mã', exact: true })
  19 |       .click();
  20 |   } else
  21 |     await page.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
  22 |   try {
  23 |     await expect(page.locator('#pregame .pre-title')).toHaveText('Phòng chờ', {
  24 |       timeout,
  25 |     });
  26 |   } catch (error) {
  27 |     const diagnostic = await page.evaluate(() => ({
  28 |       url: location.href,
  29 |       title: document.querySelector('#pregame .pre-title')?.textContent,
  30 |       notice: document.querySelector('#pregame .pre-error')?.textContent,
  31 |       status: document.querySelector('#status')?.textContent,
  32 |       html: document.querySelector('#pregame')?.innerHTML,
  33 |     }));
> 34 |     throw new Error('Join UI diagnostic: ' + JSON.stringify(diagnostic), {
     |           ^ Error: Join UI diagnostic: {"url":"http://127.0.0.1:5397/?debug=1","title":"Danh sách phòng","notice":"Mất kết nối (1006). Hãy tạo hoặc vào phòng để trở lại.","status":"Mất kết nối (1006). Hãy tạo hoặc vào phòng để trở lại.","html":"<section class=\"pre-window \"><h1 class=\"pre-title\">Danh sách phòng</h1><div class=\"room-scroll\"><table><thead><tr><th>Phòng / Mã</th><th>Người chơi</th><th>Trạng thái</th><th></th></tr></thead><tbody><tr><td>eW6_9e93d</td><td>4/6</td><td>Đang chờ</td><td><button data-action=\"join\" data-room=\"eW6_9e93d\">Vào phòng</button></td></tr></tbody></table></div><div class=\"pre-actions\"><button type=\"button\" data-action=\"back\">Quay lại</button><button type=\"button\" data-action=\"refresh\">Làm mới</button><button type=\"button\" data-action=\"create\">Tạo phòng</button></div><form id=\"code-form\"><label class=\"sr-only\" for=\"pre-code\">Mã phòng</label><input id=\"pre-code\" placeholder=\"MÃ PHÒNG\" autocomplete=\"off\"><button>Vào bằng mã</button></form><p class=\"pre-error\" role=\"status\" aria-live=\"polite\">Mất kết nối (1006). Hãy tạo hoặc vào phòng để trở lại.</p></section>"}
  35 |       cause: error,
  36 |     });
  37 |   }
  38 |   await expect(
  39 |     page.locator('#pregame .pre-players strong').filter({ hasText: nickname }),
  40 |   ).toHaveCount(1, { timeout });
  41 | }
  42 | export async function startTogether(
  43 |   pages: Page[],
  44 |   ids: string[] = [],
  45 |   timeout = 15000,
  46 | ) {
  47 |   for (const page of pages)
  48 |     await expect
  49 |       .poll(() => page.locator('#pregame .pre-players li').count(), {
  50 |         timeout,
  51 |       })
  52 |       .toBeGreaterThanOrEqual(pages.length);
  53 |   await pages[0]!.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
  54 |   for (let i = 0; i < pages.length; i++) {
  55 |     const page = pages[i]!;
  56 |     await expect(page.locator('#pregame .pre-title')).toHaveText(
  57 |       'Chọn môn phái',
  58 |     );
  59 |     await page
  60 |       .locator(`#pregame button[data-school=${ids[i] ?? 'cai_bang'}]`)
  61 |       .click();
  62 |     await expect(
  63 |       page.locator(`#pregame button[data-school=${ids[i] ?? 'cai_bang'}]`),
  64 |     ).toHaveAttribute('aria-pressed', 'true');
  65 |     await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  66 |   }
  67 |   for (const page of pages) await expect(page.locator('#pregame')).toBeHidden();
  68 | }
  69 | 
```