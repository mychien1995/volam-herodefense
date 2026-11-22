import { test, expect } from '@playwright/test';
import {
  enterSoundPractice,
  soundView,
  switchSoundHero,
} from './sound-helper.js';
import { castQaSkill } from '../../tools/qa-skill-browser.mjs';

test('separate music and game sliders migrate, persist and independently mute live audio', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.addInitScript(() => {
    if (!localStorage.getItem('audio-migration-tested')) {
      localStorage.setItem('volam:preferences', JSON.stringify({ volume: 40 }));
      localStorage.setItem('audio-migration-tested', '1');
    }
  });
  await page.goto('/?debug');
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await expect(
    page.getByRole('slider', { name: 'Nhạc nền', exact: true }),
  ).toHaveValue('40');
  await expect(
    page.getByRole('slider', { name: 'Âm thanh game', exact: true }),
  ).toHaveValue('46');
  await page.getByRole('slider', { name: 'Nhạc nền', exact: true }).fill('0');
  await page
    .getByRole('slider', { name: 'Âm thanh game', exact: true })
    .fill('70');
  await page.reload();
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await expect(
    page.getByRole('slider', { name: 'Âm thanh game', exact: true }),
  ).toHaveValue('70');
  await expect(
    page.getByRole('slider', { name: 'Nhạc nền', exact: true }),
  ).toHaveValue('0');
  await enterSoundPractice(page, 'ngu_doc', 'ngu_doc_ta_hiep');
  await castQaSkill(page, 'e', 'am_ta_hap_hon_khi');
  await expect
    .poll(async () => (await soundView(page, 'ngu-doc')).loops.length)
    .toBe(1);
  await expect(page.locator('#match-music')).toHaveJSProperty('volume', 0);
  await page.getByRole('button', { name: 'Cài đặt', exact: true }).click();
  await page.getByRole('slider', { name: 'Nhạc nền', exact: true }).fill('30');
  await expect(page.locator('#match-music')).toHaveJSProperty('volume', 0.3);
  await page
    .getByRole('slider', { name: 'Âm thanh game', exact: true })
    .fill('0');
  await expect
    .poll(async () => (await soundView(page, 'ngu-doc')).active)
    .toBe(0);
  await expect(page.locator('#match-music')).toHaveJSProperty('volume', 0.3);
  await page
    .getByRole('slider', { name: 'Âm thanh game', exact: true })
    .fill('70');
  await expect
    .poll(async () => (await soundView(page, 'ngu-doc')).loops.length)
    .toBe(1);
});

test('original four-school OGGs load and play all eight basic profiles', async ({
  page,
}) => {
  test.setTimeout(180000);
  const failures: string[] = [];
  const loaded = new Set<string>();
  page.on('response', (r) => {
    if (r.url().includes('.ogg')) {
      if (r.status() >= 400) failures.push(r.url());
      else loaded.add(r.url());
    }
  });
  page.on('pageerror', (e) => failures.push(e.message));
  await enterSoundPractice(page, 'cai_bang', 'cai_bang_bong');
  for (const [school, branches] of Object.entries({
    cai_bang: ['bong', 'chuong'],
    thieu_lam: ['quyen', 'dao'],
    thien_son: ['phien', 'dao'],
    vo_dang: ['quyen', 'kiem'],
  })) {
    for (const branch of branches) {
      const id = school + '_' + branch;
      if (id !== 'cai_bang_bong') await switchSoundHero(page, school, id);
      const before = await page.evaluate<number>('window.__audioStarts.length');
      await castQaSkill(page, 'a', id, { kind: 'attack' });
      await expect
        .poll(() => page.evaluate<number>('window.__audioStarts.length'))
        .toBeGreaterThan(before);
    }
  }
  expect(loaded.size).toBeGreaterThanOrEqual(43);
  expect(failures).toEqual([]);
});
