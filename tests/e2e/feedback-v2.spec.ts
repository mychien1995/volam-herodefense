import { test, expect, type Page, type Browser } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { startTogether } from './pregame-helper.js';
import { read, hero, view, monitor, moveTo, enter } from './m3c1-helpers.js';
import { m1Config } from '@volam/game-data';
const out = 'docs/evidence/m3c3-feedback-v2-runtime';
interface LiveFeedback {
  loadedComponents: number;
  registeredAnimations: number;
  played: string[];
  observedFrames: string[];
  completed: Record<string, number>;
  events: Array<{ id: number; kind: string; skill: string; stage: string }>;
  persistent: Array<{
    id: string;
    texture: string;
    tag: string;
    origin: number[];
    scale: number;
  }>;
  projectiles: Array<{
    id: string;
    texture: string;
    tag: string;
    leg: string;
    rotation: number;
  }>;
  transient: Array<{
    texture: string;
    tag: string;
    role: string;
    origin: number[];
    scale: number;
    timeScale: number;
  }>;
}
const feedback = (p: Page) =>
  p.evaluate<LiveFeedback>('window.__VOLAM__.presentation().skills.feedback');
async function pair(browser: Browser, schools: string[]) {
  const contexts = await Promise.all(
    schools.map(() =>
      browser.newContext({ viewport: { width: 1280, height: 720 } }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const errors = pages.map(monitor);
  let code = '';
  for (const [i, p] of pages.entries()) {
    await p.goto('/?debug=1&skillPreview=1&feedbackArtReview=1');
    await p.locator('[data-action=play]').click();
    await p.locator('#pre-nickname').fill('Art v2 ' + i);
    await p.getByRole('button', { name: 'Vào game', exact: true }).click();
    if (code) {
      await p
        .locator('#pregame')
        .getByLabel('Mã phòng', { exact: true })
        .fill(code);
      await p.getByRole('button', { name: 'Vào bằng mã', exact: true }).click();
    } else
      await p.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
    await expect(p.locator('#pregame .pre-title')).toHaveText('Phòng chờ');
    if (!code) code = (await read(p)).roomId;
  }
  await startTogether(pages, schools);
  for (const p of pages)
    await expect
      .poll(async () => (await feedback(p)).loadedComponents)
      .toBe(45);
  return { pages, contexts, errors };
}
async function equip(p: Page, id: string) {
  await p.locator('#preview-skill').selectOption(id);
  await p.locator('#preview-equip').click();
  await expect.poll(async () => (await hero(p)).qSkill).toBe(id);
  await expect
    .poll(async () => (await hero(p)).mana, { timeout: 60000 })
    .toBeGreaterThanOrEqual(m1Config.skillCatalogue![id]!.manaCost);
  await p.locator('[data-fixture=clear]').click();
  await p.locator('[data-fixture=targets]').click();
}
async function cast(p: Page, id: string) {
  await equip(p, id);
  await expect
    .poll(async () => (await hero(p)).qCooldown, { timeout: 60000 })
    .toBe(0);
  const owner = (await read(p)).sessionId;
  if (['hoa_van_chuong', 'hang_long_hoa_vu', 'pha_giap_bong'].includes(id))
    await p.locator('[data-fixture=clear]').click();
  const before = Math.max(0, ...(await read(p)).events.map((e) => e.id));
  await p.locator('#game canvas').focus();
  await p.keyboard.press('KeyQ');
  await expect
    .poll(async () =>
      (await read(p)).events.some(
        (e) =>
          e.id > before &&
          e.sourceId === owner &&
          e.abilityId === id &&
          e.kind === 'cast',
      ),
    )
    .toBe(true);
}
async function equipSlots(p: Page, ids: string[]) {
  await p.locator('[data-menu=settings]').click();
  await p.locator('#dialog-content [data-menu=skills]').click();
  for (let i = 0; i < 4; i++)
    await p
      .getByLabel(`Test skill ${'QWER'[i]}`, { exact: true })
      .selectOption(ids[i] ?? '');
  await p.locator('#apply-test-skills').click();
  await expect.poll(async () => (await hero(p)).qSkill).toBe(ids[0]);
  await p.keyboard.press('Escape');
}
async function attack(p: Page, id: string) {
  await expect.poll(async () => (await hero(p)).basicCooldown).toBe(0);
  const owner = (await read(p)).sessionId,
    before = Math.max(0, ...(await read(p)).events.map((e) => e.id));
  await p.locator('#game canvas').focus();
  await p.keyboard.press('KeyA');
  await expect
    .poll(
      async () =>
        (await read(p)).events.some(
          (e) =>
            e.id > before &&
            e.kind === 'attack' &&
            e.sourceId === owner &&
            e.abilityId === id,
        ),
      { intervals: [20, 40, 80] },
    )
    .toBe(true);
  await expect
    .poll(async () => (await hero(p)).basicCooldown, {
      intervals: [20, 40, 80],
    })
    .toBeGreaterThan(0);
}
async function capture(p: Page, name: string) {
  await mkdir(out, { recursive: true });
  await p.locator('#skill-preview').evaluate((e) => {
    (e as HTMLElement).style.visibility = 'hidden';
  });
  await p.screenshot({ path: out + '/' + name + '.png' });
  await p.locator('#skill-preview').evaluate((e) => {
    (e as HTMLElement).style.visibility = '';
  });
}
interface Meta {
  id: string;
  source: string;
  handoffId: string;
  frameDimensions: number[];
  animations: Array<{
    name: string;
    frames: string[];
    durationMsTotal: number;
    loop: boolean;
    origin: number[];
  }>;
}
async function frameCoverage(pages: Page[], batch: string) {
  const data = JSON.parse(
    await readFile('apps/game-client/src/feedback-art.generated.json', 'utf8'),
  ) as { assets: Meta[] };
  const components = data.assets.filter(
    (c) =>
      c.source.includes('/' + batch + '/') ||
      (batch === '01_cai_bang' && c.handoffId === 'cai_bang_bong_basic_v2'),
  );
  const clips = components.flatMap((c) =>
    c.animations.map((a) => ({
      asset: c.id,
      frameDimensions: c.frameDimensions,
      ...a,
    })),
  );
  const started = Date.now();
  for (let index = 0; index < clips.length; index += 12) {
    const group = clips.slice(index, index + 12);
    const before = await Promise.all(pages.map(feedback));
    for (const p of pages) {
      const h = await hero(p);
      const rendered = await p.evaluate(
        ({ group, x, y }) => {
          const bridge = (
            window as unknown as {
              __VOLAM__: {
                reviewFeedback: (
                  asset: string,
                  tag: string,
                  x: number,
                  y: number,
                ) => { origin: number[]; scale: number; canvas: number[] };
              };
            }
          ).__VOLAM__;
          return group.map((c, i) =>
            bridge.reviewFeedback(
              c.asset,
              c.name,
              x - 120 + (i % 4) * 80,
              y - 110 + Math.floor(i / 4) * 80,
            ),
          );
        },
        { group, x: h.x, y: h.y },
      );
      rendered.forEach((r, i) => {
        expect(r.origin).toEqual(group[i]!.origin);
        expect(r.scale).toBe(1);
        expect(r.canvas).toEqual(group[i]!.frameDimensions);
      });
    }
    const expected = group.flatMap((c) =>
      c.frames.map((f) => c.asset + ':' + f),
    );
    for (const [i, p] of pages.entries())
      await expect
        .poll(
          async () => {
            const f = await feedback(p),
              seen = new Set(f.observedFrames);
            return (
              expected.every((k) => seen.has(k)) &&
              group.every(
                (c) =>
                  (f.completed[c.asset + ':' + c.name] ?? 0) >
                  (before[i]!.completed[c.asset + ':' + c.name] ?? 0),
              )
            );
          },
          { timeout: 8000, intervals: [80, 120, 200] },
        )
        .toBe(true);
  }
  for (const p of pages) {
    const f = await feedback(p);
    expect(f.registeredAnimations).toBe(571);
    expect((await view(p)).zoom).toBe(1);
    expect((await view(p)).rotation).toBe(0);
  }
  return {
    batch,
    mode: 'two-client in-match presentation-only frame fixtures; no damage authority',
    clips: clips.length,
    frames: clips.reduce((n, a) => n + a.frames.length, 0),
    elapsedMs: Date.now() - started,
  };
}
async function save(
  name: string,
  pages: Page[],
  errors: string[][],
  coverage: unknown,
) {
  expect(errors).toEqual(pages.map(() => []));
  await writeFile(
    out + '/' + name + '-observations.json',
    JSON.stringify(
      {
        coverage,
        caster: await view(pages[0]!),
        observer: await view(pages[1]!),
        errors,
        runtimeApproved: false,
      },
      null,
      2,
    ),
  );
}
test('feedback v2 Cái Bang: accepted staff beats, sixth palm, three rays, dragon, controls and dogs', async ({
  browser,
}) => {
  const { pages, contexts, errors } = await pair(browser, [
    'cai_bang',
    'cai_bang',
  ]);
  const [a, b] = pages as [Page, Page];
  try {
    await moveTo(a, 800, 980);
    await moveTo(b, 740, 980);
    await a.locator('#preview-basic').selectOption('cai_bang_bong');
    await expect
      .poll(async () => (await hero(a)).basicId)
      .toBe('cai_bang_bong');
    const owner = (await read(a)).sessionId;
    for (const [i, stage] of ['thrust', 'sweep', 'lift', 'smash'].entries()) {
      await attack(a, 'cai_bang_bong');
      await expect
        .poll(
          async () =>
            (await feedback(b)).events
              .filter((e) => e.kind === 'attack' && e.skill === 'cai_bang_bong')
              .map((e) => e.stage)[i],
        )
        .toBe(stage);
    }
    for (const [key, name] of [
      ['ArrowDown', 'down'],
      ['ArrowLeft', 'left'],
      ['ArrowRight', 'right'],
      ['ArrowUp', 'up'],
    ] as const) {
      await expect.poll(async () => (await hero(a)).basicCooldown).toBe(0);
      await a.locator('#game canvas').focus();
      await a.keyboard.press(key, { delay: 70 });
      await attack(a, 'cai_bang_bong');
      await expect
        .poll(
          async () =>
            (await feedback(b)).observedFrames.some(
              (f) =>
                f.startsWith('cai_bang_bong_combo_v2_character:combo_') &&
                f.includes('_' + name + '_'),
            ),
          { message: 'accepted Bổng facing ' + name },
        )
        .toBe(true);
    }
    await a.locator('#preview-basic').selectOption('cai_bang_chuong');
    await expect
      .poll(async () => (await hero(a)).basicId)
      .toBe('cai_bang_chuong');
    for (let i = 0; i < 6; i++) await attack(a, 'cai_bang_chuong');
    await expect
      .poll(async () =>
        (await feedback(b)).events.some(
          (e) => e.skill === 'cai_bang_chuong' && e.stage === 'dragon',
        ),
      )
      .toBe(true);
    await a.keyboard.press('ArrowRight', { delay: 70 });
    for (const id of [
      'hoa_van_chuong',
      'hang_long_hoa_vu',
      'hoanh_tao_bong',
      'pha_giap_bong',
      'cam_long_cong',
      'truy_phong_bong',
      'thien_ha_vo_cau',
    ]) {
      await cast(a, id);
      if (id === 'hoa_van_chuong')
        await expect
          .poll(
            async () =>
              (await feedback(b)).projectiles.filter(
                (p) => p.texture === 'cai_bang_chuong_dragon_v2_projectile',
              ).length,
          )
          .toBeGreaterThanOrEqual(3);
      if (id === 'hang_long_hoa_vu') {
        await expect
          .poll(async () =>
            (await feedback(b)).projectiles.some(
              (p) => p.texture === 'hang_long_hoa_vu_dragon_v2_projectile',
            ),
          )
          .toBe(true);
        await capture(a, '01-cai-bang-dragon');
      }
      if (id === 'thien_ha_vo_cau') {
        await expect
          .poll(
            async () =>
              (await feedback(b)).persistent.filter((p) =>
                p.id.startsWith('dog:' + owner),
              ).length,
          )
          .toBe(4);
        await capture(a, '01-cai-bang-dogs');
      }
    }
    await expect
      .poll(
        async () =>
          (await feedback(b)).persistent.filter((p) => p.id.startsWith('dog:'))
            .length,
        { timeout: 12000 },
      )
      .toBe(0);
    const coverage = await frameCoverage(pages, '01_cai_bang');
    await save('01-cai-bang', pages, errors, coverage);
  } catch (error) {
    await mkdir(out, { recursive: true });
    await writeFile(
      out + '/01-failure.json',
      JSON.stringify(
        {
          message: String(error),
          snapshots: await Promise.all(pages.map(read)),
          views: await Promise.all(pages.map(view)),
          errors,
        },
        null,
        2,
      ),
    );
    await a.screenshot({ path: out + '/01-failure.png' });
    throw error;
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
test('feedback v2 Thiên Sơn: two fan legs, speed-adjustable A, wind phases, eight-way fans and dao stages', async ({
  browser,
}) => {
  const { pages, contexts, errors } = await pair(browser, [
    'thien_son',
    'cai_bang',
  ]);
  const [a, b] = pages as [Page, Page];
  try {
    await moveTo(a, 800, 980);
    await moveTo(b, 740, 980);
    await a.keyboard.press('ArrowRight', { delay: 70 });
    await a.locator('[data-fixture=targets]').click();
    await attack(a, 'thien_son_phien');
    await expect
      .poll(async () =>
        (await feedback(b)).events.some(
          (e) =>
            e.skill === 'thien_son_phien' && e.stage === 'projectile_return',
        ),
      )
      .toBe(true);
    await expect
      .poll(async () =>
        (await feedback(b)).observedFrames.some((f) =>
          f.startsWith('thien_son_fan_v2_impact:return_hit'),
        ),
      )
      .toBe(true);
    await cast(a, 'chiet_mai_thu');
    await expect
      .poll(async () =>
        (await feedback(b)).persistent.some((v) => v.tag === 'plum_loop'),
      )
      .toBe(true);
    await attack(a, 'thien_son_phien');
    await expect
      .poll(
        async () =>
          a.evaluate<number>(
            'Math.min(999,...window.__VOLAM__.presentation().skills.feedback.poses.filter(p=>p.skill==="thien_son_phien").map(p=>p.durationMs))',
          ),
        { intervals: [20, 40, 60] },
      )
      .toBeLessThan(300);
    for (const id of [
      'lien_hoa_phien',
      'luc_duong_chuong',
      'luu_phong_bo',
      'bach_phien_phong_bao',
    ]) {
      await cast(a, id);
      if (id === 'luc_duong_chuong') {
        await expect
          .poll(async () =>
            (await feedback(b)).persistent.some((v) => v.tag === 'guard_loop'),
          )
          .toBe(true);
        await capture(a, '02-thien-son-guard');
      }
      if (id === 'bach_phien_phong_bao') {
        await expect
          .poll(
            async () =>
              (await feedback(b)).projectiles.filter(
                (v) => v.texture === 'thien_son_fan_v2_projectile',
              ).length,
          )
          .toBeGreaterThanOrEqual(8);
        await capture(a, '02-thien-son-storm');
        await expect
          .poll(
            async () =>
              (await feedback(b)).played.filter((v) =>
                v.startsWith('skill:thien_son_fan_v2_projectile:storm_fan_'),
              ).length,
          )
          .toBe(8);
      }
      await expect
        .poll(async () => (await hero(a)).statuses, { timeout: 12000 })
        .not.toMatch(/"kind":"(?:channel|dash)"/);
    }
    await a.locator('#preview-basic').selectOption('thien_son_dao');
    await expect
      .poll(async () => (await hero(a)).basicId)
      .toBe('thien_son_dao');
    await cast(a, 'chiet_mai_thu');
    await attack(a, 'thien_son_dao');
    await expect
      .poll(
        async () =>
          (await feedback(b)).transient.some(
            (v) => v.tag.startsWith('basic_cut_') && v.timeScale > 1,
          ),
        { intervals: [20, 30, 40] },
      )
      .toBe(true);
    await attack(a, 'thien_son_dao');
    for (const id of [
      'phi_anh_tram',
      'phong_anh_hoan_vi',
      'truy_hon_dao',
      'bach_liet_thien_kich',
    ]) {
      await cast(a, id);
      if (id === 'truy_hon_dao') {
        await expect
          .poll(
            async () =>
              (await feedback(b)).projectiles.filter(
                (v) => v.texture === 'thien_son_dao_v2_projectile',
              ).length,
          )
          .toBe(2);
        await capture(a, '02-thien-son-blades');
      }
      await expect
        .poll(async () => (await hero(a)).statuses, { timeout: 12000 })
        .not.toMatch(/"kind":"(?:channel|dash)"/);
    }
    await expect
      .poll(async () =>
        (await feedback(b)).played.some((v) =>
          v.includes('bach_liet_finisher'),
        ),
      )
      .toBe(true);
    const coverage = await frameCoverage(pages, '02_thien_son');
    await save('02-thien-son', pages, errors, coverage);
  } catch (error) {
    await mkdir(out, { recursive: true });
    await writeFile(
      out + '/02-failure.json',
      JSON.stringify(
        {
          message: String(error),
          snapshots: await Promise.all(pages.map(read)),
          views: await Promise.all(pages.map(view)),
          errors,
        },
        null,
        2,
      ),
    );
    await a.screenshot({ path: out + '/02-failure.png' });
    throw error;
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
test('feedback v2 Võ Đang: alternating palms, connected sword, traveling qi, five shield states and formation', async ({
  browser,
}) => {
  const { pages, contexts, errors } = await pair(browser, [
    'vo_dang',
    'cai_bang',
  ]);
  const [a, b] = pages as [Page, Page];
  try {
    await moveTo(a, 800, 980);
    await moveTo(b, 740, 980);
    await a.keyboard.press('ArrowRight', { delay: 70 });
    await attack(a, 'vo_dang_quyen');
    await attack(a, 'vo_dang_quyen');
    await expect
      .poll(async () =>
        (await feedback(b)).events
          .filter((e) => e.skill === 'vo_dang_quyen' && e.kind === 'attack')
          .slice(-2)
          .map((e) => e.stage),
      )
      .toEqual(['left_palm', 'right_palm']);
    await a.locator('#preview-basic').selectOption('vo_dang_kiem');
    await expect.poll(async () => (await hero(a)).basicId).toBe('vo_dang_kiem');
    await attack(a, 'vo_dang_kiem');
    await attack(a, 'vo_dang_kiem');
    for (const id of ['luong_nghi_thu', 'huyen_am_chuong', 'duong_khi_kich']) {
      await cast(a, id);
      if (id === 'duong_khi_kich') {
        await expect
          .poll(async () =>
            (await feedback(b)).events.some(
              (e) => e.skill === id && e.stage === 'refund',
            ),
          )
          .toBe(true);
        await expect
          .poll(async () =>
            (await feedback(b)).projectiles.some(
              (p) => p.texture === 'vo_dang_hands_v2_projectile',
            ),
          )
          .toBe(true);
        await capture(a, '03-vo-dang-white-hand');
      }
    }
    await cast(a, 'thai_cuc_tran');
    await expect
      .poll(
        async () =>
          (await feedback(b)).persistent.filter(
            (v) => v.tag === 'formation_loop',
          ).length,
      )
      .toBe(1);
    await capture(a, '03-vo-dang-formation');
    await expect
      .poll(
        async () =>
          (await feedback(b)).persistent.some(
            (v) => v.tag === 'formation_loop',
          ),
        { timeout: 10000 },
      )
      .toBe(false);
    await cast(a, 'thai_cuc_than_cong');
    await expect
      .poll(async () =>
        (await feedback(b)).persistent.some((v) => v.tag === 'mana_loop'),
      )
      .toBe(true);
    await capture(a, '03-vo-dang-mana-guard');
    const opening =
      (await feedback(b)).completed[
        'vo_dang_shield_formation_v2_aura:mana_opening'
      ] ?? 0;
    await a.locator('#game canvas').focus();
    await a.keyboard.press('KeyQ');
    await expect
      .poll(async () => (await hero(a)).statuses)
      .not.toContain('mana_shield');
    await expect
      .poll(
        async () =>
          (await feedback(b)).completed[
            'vo_dang_shield_formation_v2_aura:mana_off'
          ] ?? 0,
      )
      .toBeGreaterThan(0);
    expect(
      (await feedback(b)).completed[
        'vo_dang_shield_formation_v2_aura:mana_opening'
      ] ?? 0,
    ).toBe(opening);
    await a.locator('#game canvas').focus();
    await a.keyboard.press('KeyQ');
    await expect
      .poll(async () => (await hero(a)).statuses)
      .toContain('mana_shield');
    await a.locator('[data-fixture=attacker]').click();
    await expect
      .poll(async () =>
        (await feedback(b)).played.some((k) => k.endsWith(':mana_absorb')),
      )
      .toBe(true);
    await expect
      .poll(
        async () =>
          (await feedback(b)).played.some((k) => k.endsWith(':mana_depleted')),
        { timeout: 35000, intervals: [80, 150, 250] },
      )
      .toBe(true);
    await capture(a, '03-vo-dang-mana-depleted');
    await a.locator('#game canvas').focus();
    await a.keyboard.press('KeyQ');
    await a.locator('[data-fixture=clear]').click();
    const coverage = await frameCoverage(pages, '03_vo_dang');
    await save('03-vo-dang', pages, errors, coverage);
  } catch (error) {
    await mkdir(out, { recursive: true });
    await writeFile(
      out + '/03-failure.json',
      JSON.stringify(
        {
          message: String(error),
          snapshots: await Promise.all(pages.map(read)),
          views: await Promise.all(pages.map(view)),
          errors,
        },
        null,
        2,
      ),
    );
    await a.screenshot({ path: out + '/03-failure.png' });
    throw error;
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});

test('feedback v2 Thiếu Lâm: alternating fists, three silhouettes, server empowerment and broad saber', async ({
  browser,
}) => {
  const { pages, contexts, errors } = await pair(browser, [
    'thieu_lam',
    'cai_bang',
  ]);
  const [a, b] = pages as [Page, Page];
  try {
    await moveTo(a, 800, 980);
    await moveTo(b, 740, 980);
    await a.keyboard.press('ArrowRight', { delay: 70 });
    await attack(a, 'thieu_lam_quyen');
    await attack(a, 'thieu_lam_quyen');
    await expect
      .poll(async () =>
        (await feedback(b)).events
          .filter((e) => e.kind === 'attack' && e.skill === 'thieu_lam_quyen')
          .slice(-2)
          .map((e) => e.stage),
      )
      .toEqual(['left_fist', 'right_fist']);
    for (const id of [
      'la_han_quyen',
      'vi_da_quyen',
      'dai_luc_kim_cuong_chuong',
    ]) {
      await cast(a, id);
      await expect
        .poll(async () =>
          (await feedback(b)).played.some((k) =>
            k.includes(id + '_normal_impact'),
          ),
        )
        .toBe(true);
      await capture(a, '04-thieu-lam-' + id);
    }
    await equipSlots(a, [
      'la_han_quyen',
      'vi_da_quyen',
      'dai_luc_kim_cuong_chuong',
    ]);
    await expect
      .poll(
        async () => {
          const h = (await hero(a)) as Awaited<ReturnType<typeof hero>> & {
            wCooldown: number;
            eCooldown: number;
          };
          return h.qCooldown + h.wCooldown + h.eCooldown;
        },
        { timeout: 12000 },
      )
      .toBe(0);
    await a.locator('[data-fixture=clear]').click();
    await a.locator('[data-fixture=targets]').click();
    await expect
      .poll(async () => (await hero(a)).mana, { timeout: 60000 })
      .toBeGreaterThanOrEqual(50);
    for (const [i, key] of ['KeyQ', 'KeyW', 'KeyE'].entries()) {
      const id = ['la_han_quyen', 'vi_da_quyen', 'dai_luc_kim_cuong_chuong'][
        i
      ]!;
      const before = Math.max(0, ...(await read(a)).events.map((e) => e.id));
      await a.locator('#game canvas').focus();
      await a.keyboard.press(key);
      await expect
        .poll(async () =>
          (await read(b)).events.some(
            (e) => e.id > before && e.abilityId === id && e.kind === 'hit',
          ),
        )
        .toBe(true);
    }
    await expect
      .poll(async () =>
        (await feedback(b)).events.some(
          (e) =>
            e.skill === 'dai_luc_kim_cuong_chuong' &&
            e.stage === 'combo_empowered',
        ),
      )
      .toBe(true);
    await expect
      .poll(async () =>
        (await feedback(b)).played.some((k) =>
          k.includes('dai_luc_kim_cuong_chuong_empowered_impact'),
        ),
      )
      .toBe(true);
    await capture(a, '04-thieu-lam-empowered');
    await a.locator('#preview-basic').selectOption('thieu_lam_dao');
    await expect
      .poll(async () => (await hero(a)).basicId)
      .toBe('thieu_lam_dao');
    await attack(a, 'thieu_lam_dao');
    await expect
      .poll(async () =>
        (await feedback(b)).played.some((k) =>
          k.includes('thieu_lam_dao_v2_aura:basic_contact'),
        ),
      )
      .toBe(true);
    await cast(a, 'tru_ta');
    await expect
      .poll(async () =>
        (await feedback(b)).played.some((k) =>
          k.includes('thieu_lam_dao_v2_ground:tru_ta_ground'),
        ),
      )
      .toBe(true);
    await capture(a, '04-thieu-lam-tru-ta');
    await a.locator('[data-fixture=clear]').click();
    const coverage = await frameCoverage(pages, '04_thieu_lam');
    await save('04-thieu-lam', pages, errors, coverage);
  } catch (error) {
    await mkdir(out, { recursive: true });
    await writeFile(
      out + '/04-failure.json',
      JSON.stringify(
        {
          message: String(error),
          snapshots: await Promise.all(pages.map(read)),
          views: await Promise.all(pages.map(view)),
          errors,
        },
        null,
        2,
      ),
    );
    await a.screenshot({ path: out + '/04-failure.png' });
    throw error;
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});

test('feedback v2 lifecycle: actual buff expiry, owner death, respawn and zone cleanup', async ({
  browser,
}) => {
  const { pages, contexts, errors } = await pair(browser, [
    'thien_son',
    'cai_bang',
  ]);
  const [a, b] = pages as [Page, Page];
  try {
    await moveTo(a, 800, 980);
    await moveTo(b, 740, 980);
    const owner = (await read(a)).sessionId;
    const owns = (f: LiveFeedback) =>
      f.persistent.some((v) => v.id.includes(':' + owner + ':'));
    await cast(a, 'chiet_mai_thu');
    await expect.poll(async () => owns(await feedback(b))).toBe(true);
    await expect
      .poll(async () => (await hero(a)).statuses, { timeout: 10000 })
      .not.toContain('chiet_mai_thu');
    await expect.poll(async () => owns(await feedback(b))).toBe(false);
    await expect
      .poll(
        async () =>
          (await feedback(b)).completed[
            'thien_son_wind_actions_v2_aura:plum_ending'
          ] ?? 0,
      )
      .toBeGreaterThan(0);
    await a.locator('[data-fixture=clear]').click();
    await a.locator('[data-fixture=attacker]').click();
    await expect
      .poll(async () => (await hero(a)).hp, {
        timeout: 35000,
        intervals: [80, 100, 150],
      })
      .toBeLessThanOrEqual(24);
    expect((await hero(a)).hp).toBeGreaterThan(0);
    await expect.poll(async () => (await hero(a)).qCooldown).toBe(0);
    await a.locator('#game canvas').focus();
    await a.keyboard.press('KeyQ');
    await expect
      .poll(async () => owns(await feedback(b)), { intervals: [30, 50, 80] })
      .toBe(true);
    await expect
      .poll(async () => (await hero(a)).hp, { timeout: 6000 })
      .toBe(0);
    await expect.poll(async () => owns(await feedback(b))).toBe(false);
    await expect
      .poll(
        async () =>
          (await view(b)).actors.find((v) => v.id === owner)?.animation,
      )
      .toContain(':death:');
    await expect
      .poll(async () => (await hero(a)).hp, { timeout: 10000 })
      .toBeGreaterThan(0);
    await a.locator('[data-fixture=clear]').click();
    await expect
      .poll(async () => (await hero(a)).qCooldown, { timeout: 15000 })
      .toBe(0);
    await a.locator('#game canvas').focus();
    await a.keyboard.press('KeyQ');
    await expect.poll(async () => owns(await feedback(b))).toBe(true);
    await enter(a);
    await expect.poll(async () => owns(await feedback(b))).toBe(false);
    await save('05-lifecycle', pages, errors, {
      mode: 'real authoritative status expiry, incoming damage/death, automatic respawn and GUI dungeon entry',
      owner,
    });
  } catch (error) {
    await writeFile(
      out + '/05-failure.json',
      JSON.stringify(
        {
          message: String(error),
          snapshots: await Promise.all(pages.map(read)),
          views: await Promise.all(pages.map(view)),
          errors,
        },
        null,
        2,
      ),
    );
    await a.screenshot({ path: out + '/05-failure.png' });
    throw error;
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
