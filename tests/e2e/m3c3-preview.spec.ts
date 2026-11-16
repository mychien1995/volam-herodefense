import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { thieuLamSkills, skillArt } from '@volam/game-data';
import { startTogether } from './pregame-helper.js';
import { read, hero, view, monitor, moveTo } from './m3c1-helpers.js';
const out = 'docs/evidence/m3c3';
async function equip(p: Page, ids: string[]) {
  await p.locator('[data-menu=settings]').click();
  await p.locator('#dialog-content [data-menu=skills]').click();
  for (let i = 0; i < 4; i++)
    await p
      .getByLabel(`Test skill ${'QWER'[i]}`, { exact: true })
      .selectOption(ids[i] ?? '');
  await p.locator('#apply-test-skills').click();
  await expect.poll(async () => (await hero(p)).qSkill).toBe(ids[0] ?? '');
  await p.keyboard.press('Escape');
  await p.locator('#game canvas').focus();
}
test('M3C3 two-client live authored skills, both target combos, golden support/mitigation and independent basics', async ({
  browser,
}) => {
  const contexts = await Promise.all(
    [1280, 1920].map((width) =>
      browser.newContext({
        viewport: { width, height: width === 1920 ? 1080 : 720 },
      }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage())),
    [a, b] = pages as [Page, Page],
    errors = pages.map(monitor),
    results = [];
  await mkdir(out, { recursive: true });
  try {
    let room = '';
    for (let i = 0; i < 2; i++) {
      const p = pages[i]!;
      await p.goto('/?debug=1&skillPreview=1');
      await p.locator('[data-action=play]').click();
      await p.locator('#pre-nickname').fill('Gold Preview ' + i);
      await p.getByRole('button', { name: 'Vào game', exact: true }).click();
      if (room) {
        await p
          .locator('#pregame')
          .getByLabel('Mã phòng', { exact: true })
          .fill(room);
        await p
          .getByRole('button', { name: 'Vào bằng mã', exact: true })
          .click();
      } else
        await p.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
      await expect(p.locator('#pregame .pre-title')).toHaveText('Phòng chờ');
      if (!room) room = (await read(p)).roomId;
    }
    await startTogether(pages, ['thieu_lam', 'vo_dang']);
    await moveTo(a, 800, 980);
    await moveTo(b, 740, 980);
    await a.keyboard.press('ArrowRight', { delay: 40 });
    const owner = (await read(a)).sessionId;
    expect((await view(a)).skills.loadedComponents).toBe(
      skillArt.assets.length,
    );
    await expect(a.locator('#preview-skill option')).toHaveCount(13);
    for (const skill of thieuLamSkills) {
      await a.locator('#preview-skill').selectOption(skill.id);
      await a.locator('#preview-equip').click();
      await expect.poll(async () => (await hero(a)).qSkill).toBe(skill.id);
      await expect
        .poll(async () => (await hero(a)).mana, { timeout: 20000 })
        .toBeGreaterThanOrEqual(skill.manaCost);
      await a.locator('[data-fixture=clear]').click();
      await a.locator('[data-fixture=targets]').click();
      const start = (await read(b)).events.at(-1)?.id ?? 0;
      await a.locator('#game canvas').focus();
      await a.keyboard.press('KeyQ');
      await expect
        .poll(async () =>
          (await read(b)).events.some(
            (e) =>
              e.id > start && e.kind === 'cast' && e.abilityId === skill.id,
          ),
        )
        .toBe(true);
      await expect
        .poll(
          async () =>
            (await view(a)).skills.observedFrames.filter((f) =>
              f.startsWith(skill.id + '_character:'),
            ).length,
        )
        .toBeGreaterThanOrEqual(2);
      await expect
        .poll(
          async () =>
            (await view(b)).skills.observedFrames.filter((f) =>
              f.startsWith(skill.id + '_vfx:'),
            ).length,
        )
        .toBeGreaterThanOrEqual(2);
      if (skill.id === 'kim_cang_bat_hoai') {
        await a.locator('[data-fixture=attacker]').click();
        await expect
          .poll(async () =>
            (await view(b)).skills.played.some((k) =>
              k.includes('kim_cang_bat_hoai_vfx:hit_response'),
            ),
          )
          .toBe(true);
      }
      if (skill.id === 'kim_quang_ho_tran') {
        await expect
          .poll(async () => (await hero(b)).statuses)
          .toContain('defense_buff');
        await expect
          .poll(async () =>
            (await view(a)).skills.persistent.some(
              (v) => v.texture === 'kim_quang_ho_tran_vfx',
            ),
          )
          .toBe(true);
      }
      if (skill.id === 'nhu_lai_niet_ban')
        await expect
          .poll(async () =>
            (await view(b)).skills.played.some((k) =>
              k.includes('nhu_lai_niet_ban_vfx:ground_impact'),
            ),
          )
          .toBe(true);
      if (
        [
          'kim_cang_bat_hoai',
          'nhu_lai_niet_ban',
          'nhu_lai_thien_diep',
        ].includes(skill.id)
      )
        await a.screenshot({ path: `${out}/runtime-${skill.id}.png` });
      results.push({
        id: skill.id,
        state: await read(a),
        caster: await view(a),
        observer: await view(b),
      });
      await a.waitForTimeout(skill.effect.mode === 'multi_hit' ? 850 : 150);
    }
    for (const chain of [
      ['la_han_quyen', 'vi_da_quyen', 'dai_luc_kim_cuong_chuong'],
      ['toan_phong_thoai', 'hoanh_tao_cuoc', 'vo_anh_cuoc'],
    ]) {
      await equip(a, [...chain, '']);
      await a.locator('[data-fixture=clear]').click();
      await a.locator('[data-fixture=targets]').click();
      await expect
        .poll(async () => (await hero(a)).mana, { timeout: 20000 })
        .toBeGreaterThanOrEqual(50);
      for (const [i, key] of ['KeyQ', 'KeyW', 'KeyE'].entries()) {
        const field = ['qCooldown', 'wCooldown', 'eCooldown'][i]!;
        await expect
          .poll(
            async () =>
              (
                await a.evaluate<Record<string, unknown>>(
                  'window.__VOLAM__.snapshot().state.players[window.__VOLAM__.snapshot().sessionId]',
                )
              )[field],
            { timeout: 10000 },
          )
          .toBe(0);
        await a.locator('#game canvas').focus();
        await a.keyboard.press(key);
        await a.waitForTimeout(160);
        if (i < 2)
          await expect(a.locator('#phat-dong-progress')).toContainText(
            `${i + 1}/3`,
          );
      }
      await expect
        .poll(async () =>
          (await view(b)).skills.played.some((k) =>
            k.includes(chain[2] + '_vfx:empowered_impact'),
          ),
        )
        .toBe(true);
      await a.screenshot({ path: `${out}/combo-${chain[2]}.png` });
    }
    await a.locator('[data-fixture=clear]').click();
    for (const id of ['thieu_lam_quyen', 'thieu_lam_dao']) {
      await a.locator('#preview-basic').selectOption(id);
      await expect.poll(async () => (await hero(a)).basicId).toBe(id);
      await expect.poll(async () => (await hero(a)).basicCooldown).toBe(0);
      await a.locator('#game canvas').focus();
      await a.keyboard.press('KeyA');
      await a.waitForTimeout(350);
      const actor = (await view(b)).actors.find((v) => v.id === owner)!;
      expect(actor.texture).toBe(
        id === 'thieu_lam_dao' ? 'hero_thieu_lam_dao' : 'hero_thieu_lam',
      );
      expect(actor.origin).toEqual([0.5, 0.8]);
    }
    expect(errors.flat()).toEqual([]);
    await writeFile(
      out + '/runtime-observations.json',
      JSON.stringify(
        { results, final: await read(a), presentation: await view(b), errors },
        null,
        2,
      ),
    );
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
test('M3C3 both baseline styles animate every authored cardinal idle/walk/attack tag in Phaser', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1040 });
  const errors = monitor(page);
  await page.goto('/?artPreview=1&thieuLamReview=1');
  await expect(page.locator('#scene-status')).toHaveAttribute(
    'data-ready',
    'true',
  );
  type Gallery = {
    ready: boolean;
    sprites: Array<{
      animation: string;
      frame: string;
      total: number;
      frameRate: number;
      x: number;
      y: number;
      origin: number[];
      scale: number[];
    }>;
  };
  const snapshots: Gallery[] = [];
  for (let i = 0; i < 70; i++) {
    snapshots.push(
      await page.evaluate<Gallery>('window.__VOLAM__.presentation()'),
    );
    await page.waitForTimeout(30);
  }
  expect(snapshots[0]!.sprites).toHaveLength(24);
  for (const sprite of snapshots[0]!.sprites) {
    const frames = snapshots.flatMap((s) =>
      s.sprites.filter((a) => a.animation === sprite.animation),
    );
    expect(new Set(frames.map((f) => f.frame)).size, sprite.animation).toBe(
      sprite.total,
    );
    expect(sprite.origin).toEqual([0.5, 0.8]);
    expect(sprite.scale).toEqual([1, 1]);
    expect(frames.every((f) => f.x === sprite.x && f.y === sprite.y)).toBe(
      true,
    );
  }
  await page.screenshot({ path: out + '/baseline-four-directions.png' });
  await writeFile(
    out + '/baseline-frame-observations.json',
    JSON.stringify({ snapshots, errors }, null, 2),
  );
  expect(errors).toEqual([]);
});
