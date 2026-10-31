import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { voDangSkills, skillArt } from '@volam/game-data';
import { startTogether } from './pregame-helper.js';
import { read, hero, view, monitor, moveTo } from './m3c1-helpers.js';
const out = 'docs/evidence/m3c2';
test('M3C2 real preview: all ten skills and two basics show authored frames, shield/refund/counter and stationary areas to three schools', async ({
  browser,
}) => {
  const contexts = await Promise.all(
    [1280, 1280, 1920].map((w) =>
      browser.newContext({
        viewport: { width: w, height: w === 1920 ? 1080 : 720 },
      }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage())),
    [a, b, c] = pages as [
      (typeof pages)[number],
      (typeof pages)[number],
      (typeof pages)[number],
    ],
    errors = pages.map(monitor),
    results = [];
  await mkdir(out, { recursive: true });
  try {
    let room = '';
    for (let i = 0; i < 3; i++) {
      const p = pages[i]!;
      await p.goto('/?debug=1&skillPreview=1');
      await p.locator('#pre-nickname').fill('M3C2 ' + i);
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
    await startTogether(pages, ['cai_bang', 'thien_son', 'vo_dang']);
    await moveTo(c, 800, 980);
    await moveTo(a, 740, 980);
    await moveTo(b, 760, 980);
    const id = (await read(c)).sessionId;
    await expect(c.locator('#preview-skill option')).toHaveCount(10);
    expect((await view(c)).skills.loadedComponents).toBe(
      skillArt.assets.length,
    );
    for (const skill of voDangSkills) {
      await c.locator('#preview-skill').selectOption(skill.id);
      await c.locator('#preview-equip').click();
      await expect.poll(async () => (await hero(c)).qSkill).toBe(skill.id);
      await expect
        .poll(async () => (await hero(c)).mana, { timeout: 15000 })
        .toBeGreaterThanOrEqual(skill.manaCost);
      await c.locator('[data-fixture=clear]').click();
      await c.locator('[data-fixture=targets]').click();
      const last = (await read(a)).events.at(-1)?.id ?? 0;
      await c.locator('#game canvas').focus();
      await c.keyboard.press('KeyQ');
      await expect
        .poll(async () =>
          (await read(a)).events.some(
            (e) => e.id > last && e.kind === 'cast' && e.abilityId === skill.id,
          ),
        )
        .toBe(true);
      if (['thai_cuc_than_cong', 'toa_sat_bac_do'].includes(skill.id)) {
        await c.locator('[data-fixture=attacker]').click();
        const stage = skill.id === 'thai_cuc_than_cong' ? 'absorb' : 'counter';
        await expect
          .poll(async () =>
            c
              .evaluate<{ events: Array<{ stage?: string }> }>(
                'window.__VOLAM__.snapshot()',
              )
              .then((s) => s.events.some((e) => e.stage === stage)),
          )
          .toBe(true);
        await expect
          .poll(async () =>
            (await view(a)).skills.played.some((k) =>
              k.includes(
                skill.id +
                  '_vfx:' +
                  (stage === 'absorb' ? 'absorption' : 'counter'),
              ),
            ),
          )
          .toBe(true);
      }
      if (skill.id === 'duong_khi_kich')
        await expect
          .poll(async () =>
            (await view(a)).skills.played.some((k) =>
              k.includes('duong_khi_kich_vfx:mana_return'),
            ),
          )
          .toBe(true);
      if (skill.effect.mode === 'area') {
        await expect
          .poll(async () =>
            (await view(a)).skills.persistent.some(
              (v) =>
                v.id.startsWith('area:') && v.texture === skill.id + '_vfx',
            ),
          )
          .toBe(true);
        const layers = await c.evaluate<{
          skills: { persistent: Array<{ id: string; depth: number }> };
        }>('window.__VOLAM__.presentation()');
        expect(
          layers.skills.persistent
            .filter((v) => v.id.startsWith('area:'))
            .every((v) => v.depth < 0),
        ).toBe(true);
        const before = (await view(c)).skills.persistent.find((v) =>
          v.id.startsWith('area:'),
        )!;
        await c.locator('#game canvas').focus();
        await c.keyboard.press('ArrowDown', { delay: 200 });
        const after = (await view(c)).skills.persistent.find(
          (v) => v.id === before.id,
        )!;
        expect(after.x).toBe(before.x);
        expect(after.y).toBe(before.y);
        await c.keyboard.press('ArrowRight', { delay: 40 });
      }
      await expect
        .poll(
          async () =>
            (await view(c)).skills.observedFrames.filter((f) =>
              f.startsWith(skill.id + '_character:'),
            ).length,
        )
        .toBeGreaterThanOrEqual(2);
      await c.screenshot({ path: `${out}/runtime-${skill.id}.png` });
      await c.waitForTimeout(skill.effect.mode === 'multi_hit' ? 850 : 350);
      results.push({
        id: skill.id,
        caster: await view(c),
        observer: await view(a),
        state: await read(c),
      });
    }
    await c.locator('[data-fixture=clear]').click();
    for (const basic of ['vo_dang_quyen', 'vo_dang_kiem']) {
      await c.locator('#preview-basic').selectOption(basic);
      await expect.poll(async () => (await hero(c)).basicId).toBe(basic);
      await c.locator('[data-fixture=targets]').click();
      if (basic === 'vo_dang_kiem') {
        await c.locator('#game canvas').focus();
        await c.keyboard.press('ArrowLeft', { delay: 700 });
        await c.keyboard.press('ArrowRight', { delay: 40 });
      }
      const start = (await read(c)).events.at(-1)?.id ?? 0;
      for (let i = 0; i < (basic === 'vo_dang_kiem' ? 32 : 3); i++) {
        await expect.poll(async () => (await hero(c)).basicCooldown).toBe(0);
        await c.locator('#game canvas').focus();
        await c.keyboard.press('KeyA');
        await c.waitForTimeout(200);
        if (
          basic === 'vo_dang_kiem' &&
          (
            await c.evaluate<{
              events: Array<{ id: number; stage?: string; abilityId: string }>;
            }>('window.__VOLAM__.snapshot()')
          ).events.some(
            (e) => e.id > start && e.stage === 'proc' && e.abilityId === basic,
          )
        )
          break;
      }
      expect(
        (await read(c)).events.some(
          (e) => e.id > start && e.kind === 'attack' && e.abilityId === basic,
        ),
      ).toBe(true);
      if (basic === 'vo_dang_kiem')
        expect(
          (
            await c.evaluate<{
              events: Array<{ id: number; stage?: string; abilityId: string }>;
            }>('window.__VOLAM__.snapshot()')
          ).events.some(
            (e) => e.id > start && e.stage === 'proc' && e.abilityId === basic,
          ),
        ).toBe(true);
      const actor = (await view(a)).actors.find((v) => v.id === id)!;
      expect(actor.texture).toBe(
        basic === 'vo_dang_kiem' ? 'hero_vo_dang_kiem' : 'hero_vo_dang',
      );
      expect(actor.origin).toEqual([0.5, 0.8]);
      expect(actor.scale).toEqual([1, 1]);
    }
    await c.locator('[data-fixture=clear]').click();
    await c.locator('#preview-skill').selectOption('luong_nghi_thu');
    await c.locator('#preview-equip').click();
    await expect
      .poll(
        async () =>
          (await view(a)).skills.persistent.filter(
            (v) =>
              v.texture.includes('thai_cuc') ||
              v.texture.includes('bat_quai') ||
              v.texture.includes('toa_sat'),
          ).length,
      )
      .toBe(0);
    await writeFile(
      `${out}/runtime-observations.json`,
      JSON.stringify(
        {
          scope: 'Real server legacy rank1 preview, three schools, no video',
          results,
          errors,
        },
        null,
        2,
      ),
    );
    expect(errors.flat()).toEqual([]);
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});

test('M3C2 both baseline styles animate every authored cardinal idle/walk/attack tag in Phaser', async ({
  page,
}) => {
  await page.setViewportSize({ width: 960, height: 1040 });
  const errors = monitor(page);
  await page.goto('/?artPreview=1&voDangReview=1');
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
