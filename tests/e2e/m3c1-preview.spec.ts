import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { thienSonSkills, skillArt } from '@volam/game-data';
import { startTogether } from './pregame-helper.js';
import { read, hero, view, monitor, moveTo } from './m3c1-helpers.js';

test('M3C1 runtime preview: all ten wind skills, both melee basics and four dash directions are visible to a fire-school peer', async ({
  browser,
}) => {
  const ca = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    }),
    cb = await browser.newContext({ viewport: { width: 1920, height: 1080 } }),
    a = await ca.newPage(),
    b = await cb.newPage(),
    errors = [monitor(a), monitor(b)];
  const out = 'docs/evidence/m3c1';
  await mkdir(out, { recursive: true });
  async function join(p: typeof a, name: string, room?: string) {
    await p.goto('/?debug=1&skillPreview=1');
    await p.locator('#pre-nickname').fill(name);
    await p.getByRole('button', { name: 'Vào game', exact: true }).click();
    if (room) {
      await p
        .locator('#pregame')
        .getByLabel('Mã phòng', { exact: true })
        .fill(room);
      await p.getByRole('button', { name: 'Vào bằng mã', exact: true }).click();
    } else
      await p.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
    await expect(p.locator('#pregame .pre-title')).toHaveText('Phòng chờ');
  }
  try {
    await join(a, 'Fire observer');
    await join(b, 'Wind preview', (await read(a)).roomId);
    await startTogether([a, b], ['cai_bang', 'thien_son']);
    await moveTo(a, 740, 980);
    await moveTo(b, 800, 980);
    await expect(b.locator('#preview-school')).toHaveValue('thien_son');
    await expect(b.locator('#preview-skill option')).toHaveCount(10);
    expect((await view(b)).skills.loadedComponents).toBe(
      skillArt.assets.length,
    );
    const windId = (await read(b)).sessionId;
    const results = [];
    for (const skill of thienSonSkills) {
      await b.locator('#preview-skill').selectOption(skill.id);
      await b.locator('#preview-equip').click();
      await expect.poll(async () => (await hero(b)).qSkill).toBe(skill.id);
      await expect
        .poll(async () => (await hero(b)).mana, { timeout: 15000 })
        .toBeGreaterThanOrEqual(skill.manaCost);
      const last = (await read(a)).events.at(-1)?.id ?? 0;
      await b.locator('#game canvas').focus();
      await b.keyboard.press('KeyQ');
      await expect
        .poll(async () => (await hero(b)).qCooldown)
        .toBeGreaterThan(0);
      await expect
        .poll(async () =>
          (await read(a)).events.some(
            (e) => e.id > last && e.kind === 'cast' && e.abilityId === skill.id,
          ),
        )
        .toBe(true);
      await b.waitForTimeout(160);
      await b.screenshot({ path: `${out}/runtime-${skill.id}.png` });
      if (['luc_duong_chuong', 'bach_phien_phong_bao'].includes(skill.id)) {
        await b.keyboard.press('ArrowRight', { delay: 200 });
        const current = (await view(a)).skills.persistent.filter((v) =>
          v.id.startsWith(windId),
        );
        expect(current.some((v) => v.texture === skill.id + '_vfx')).toBe(true);
      }
      await expect
        .poll(
          async () =>
            (await view(a)).skills.observedFrames.filter((f) =>
              f.startsWith(skill.id + '_character:'),
            ).length,
          { timeout: 4000 },
        )
        .toBeGreaterThanOrEqual(2);
      await b.waitForTimeout(
        Math.max(
          400,
          skill.effect.mode === 'multi_hit'
            ? ((skill.effect.hits * skill.effect.spacingTicks) / 30) * 1000
            : 0,
        ),
      );
      results.push({
        id: skill.id,
        caster: await view(b),
        observer: await view(a),
      });
    }
    for (const id of ['thien_son_phien', 'thien_son_dao']) {
      await b.locator('#preview-basic').selectOption(id);
      await expect.poll(async () => (await hero(b)).basicId).toBe(id);
      await expect.poll(async () => (await hero(b)).basicCooldown).toBe(0);
      await b.locator('#preview-attack').click();
      await expect
        .poll(
          async () =>
            (await view(a)).actors.find((v) => v.id === windId)?.texture,
        )
        .toBe(
          id === 'thien_son_phien' ? 'hero_thien_son' : 'hero_thien_son_dao',
        );
      await b.screenshot({ path: `${out}/runtime-${id}.png` });
      await expect.poll(async () => (await hero(b)).basicCooldown).toBe(0);
      const lastAttack = (await read(b)).events.at(-1)?.id ?? 0;
      const samples = b.evaluate(async (owner) => {
        const frames: string[] = [];
        const bridge = (
          window as unknown as {
            __VOLAM__: {
              presentation: () => {
                actors: Array<{ id: string; frame: string }>;
              };
            };
          }
        ).__VOLAM__;
        const end = performance.now() + 1700;
        while (performance.now() < end) {
          frames.push(
            bridge.presentation().actors.find((a) => a.id === owner)?.frame ??
              '',
          );
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          );
        }
        return frames;
      }, windId);
      await b.locator('#game canvas').focus();
      for (let attack = 0; attack < 3; attack++) {
        await b.keyboard.press('KeyA');
        await b.waitForTimeout(510);
      }
      const frames = await samples;
      expect(
        (await read(b)).events.filter(
          (e) => e.id > lastAttack && e.kind === 'attack' && e.abilityId === id,
        ).length,
      ).toBeGreaterThanOrEqual(2);
      expect(
        new Set(frames.filter((f) => f.startsWith('basic_attack_'))).size,
      ).toBeGreaterThanOrEqual(3);
    }
    await moveTo(b, 800, 980);
    await b.locator('#preview-skill').selectOption('luu_phong_bo');
    await b.locator('#preview-equip').click();
    await expect.poll(async () => (await hero(b)).qSkill).toBe('luu_phong_bo');
    const directions = [];
    for (const [key, axis, sign] of [
      ['ArrowUp', 'y', -1],
      ['ArrowLeft', 'x', -1],
      ['ArrowDown', 'y', 1],
      ['ArrowRight', 'x', 1],
    ] as const) {
      await expect
        .poll(async () => (await hero(b)).qCooldown, { timeout: 7000 })
        .toBe(0);
      await b.locator('#game canvas').focus();
      await b.keyboard.press(key, { delay: 60 });
      const before = await hero(b);
      await b.keyboard.press('KeyQ');
      await b.waitForTimeout(350);
      const after = await hero(b);
      expect((after[axis] - before[axis]) * sign).toBeGreaterThan(100);
      directions.push({ key, before, after });
    }
    await writeFile(
      `${out}/runtime-frame-observations.json`,
      JSON.stringify(
        {
          scope:
            'Real server rank1 preview; development legacy loadout only, no video',
          results,
          directions,
          errors,
        },
        null,
        2,
      ),
    );
    expect(errors.flat()).toEqual([]);
  } finally {
    await ca.close();
    await cb.close();
  }
});

test('M3C1 six-player mixed-school effects keep caster ownership, scale and feet depth', async ({
  browser,
}) => {
  const contexts = await Promise.all(
    Array.from({ length: 6 }, (_, i) =>
      browser.newContext({
        viewport:
          i === 0 ? { width: 1920, height: 1080 } : { width: 640, height: 360 },
      }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage())),
    errors = pages.map(monitor),
    schools = [
      'thien_son',
      'cai_bang',
      'thien_son',
      'cai_bang',
      'thien_son',
      'thien_son',
    ];
  try {
    let room = '';
    for (let i = 0; i < 6; i++) {
      const p = pages[i]!;
      await p.goto('/?debug=1&skillPreview=1');
      await p.locator('#pre-nickname').fill('Party ' + (i + 1));
      await p.getByRole('button', { name: 'Vào game', exact: true }).click();
      if (room) {
        await p
          .locator('#pregame')
          .getByLabel('Mã phòng', { exact: true })
          .fill(room);
        await p
          .getByRole('button', { name: 'Vào bằng mã', exact: true })
          .click();
      } else {
        await p.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
      }
      await expect(p.locator('#pregame .pre-title')).toHaveText('Phòng chờ');
      if (!room) room = (await read(p)).roomId;
    }
    await startTogether(pages, schools);
    // Keep every caster visible at normal zoom, clear of the hotbar and early
    // invasion lanes; all movement still goes through real keyboard inputs.
    // Move the observing caster so its normal following camera includes the
    // entire six-player spawn formation, rather than moving six input clients.
    await moveTo(pages[0]!, 700, 800);
    for (let i = 0; i < 6; i++) {
      const p = pages[i]!;
      await p
        .locator('#preview-skill')
        .selectOption(
          schools[i] === 'thien_son' ? 'luc_duong_chuong' : 'hoa_van_chuong',
        );
      await p.locator('#preview-equip').click();
      await expect
        .poll(async () => (await hero(p)).qSkill)
        .toBe(
          schools[i] === 'thien_son' ? 'luc_duong_chuong' : 'hoa_van_chuong',
        );
    }
    await Promise.all(pages.map((p) => p.locator('#preview-cast').click()));
    await expect
      .poll(
        async () =>
          (await view(pages[0]!)).skills.persistent.filter(
            (v) => v.texture === 'luc_duong_chuong_vfx',
          ).length,
      )
      .toBe(4);
    const s = await read(pages[0]!),
      v = await view(pages[0]!);
    for (const [id, h] of Object.entries(s.state.players)) {
      const actor = v.actors.find((a) => a.id === id)!;
      expect(actor.scale).toEqual([1, 1]);
      expect(actor.origin).toEqual([0.5, 0.8]);
      expect(actor.depth).toBe(actor.y);
      expect(actor.y - v.camera.y).toBeGreaterThan(60);
      expect(actor.y - v.camera.y).toBeLessThan(475);
      const effects = v.skills.persistent.filter((e) =>
        e.id.startsWith(id + ':'),
      );
      if (h.schoolId === 'thien_son')
        expect(effects.some((e) => e.texture === 'luc_duong_chuong_vfx')).toBe(
          true,
        );
      else expect(effects).toHaveLength(0);
    }
    expect(v.rotation).toBe(0);
    await pages[0]!.screenshot({
      path: 'docs/evidence/m3c1/six-player-wind-fire.png',
    });
    await writeFile(
      'docs/evidence/m3c1/six-player-observations.json',
      JSON.stringify({ state: s, presentation: v, errors }, null, 2),
    );
    expect(errors.flat()).toEqual([]);
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
