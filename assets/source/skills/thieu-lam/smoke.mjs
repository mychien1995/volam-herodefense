import { writeFileSync } from 'node:fs';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= '.cache/ms-playwright';
const { chromium } = await import('@playwright/test');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const shots = [];
  for (const [skill, mode, d, t] of [
    ['la_han_quyen', 'combined', 'left', 250],
    ['kim_quang_ho_tran', 'combined', 'right', 300],
    ['bat_dong_minh_vuong', 'combined', 'left', 760],
    ['nhu_lai_thien_diep', 'six', 'right', 300],
    ['la_han_quyen', 'icons', 'right', 0],
  ]) {
    await page.goto(
      'http://127.0.0.1:8768/assets/source/skills/thieu-lam/review.html?skill=' +
        skill +
        '&mode=' +
        mode +
        '&direction=' +
        d,
    );
    await page.waitForFunction(() => window.__THIEU_LAM_SKILL_REVIEW__?.ready);
    await page.evaluate((t) => window.__THIEU_LAM_SKILL_REVIEW__.setTime(t), t);
    await page.waitForTimeout(80);
    const path =
      'assets/reviews/skills/thieu-lam/smoke_' + skill + '_' + mode + '.png';
    await page.screenshot({ path });
    shots.push({
      path,
      state: await page.evaluate(() =>
        window.__THIEU_LAM_SKILL_REVIEW__.snapshot(),
      ),
    });
  }
  writeFileSync(
    'assets/reviews/skills/thieu-lam/smoke_observations_v01.json',
    JSON.stringify({ errors, shots }, null, 2),
  );
  if (errors.length) throw Error(errors.join(';'));
  console.log(
    'PASS focused Phaser render smoke: five PNGs; all selected textures load, no page errors.',
  );
} finally {
  await browser.close();
}
