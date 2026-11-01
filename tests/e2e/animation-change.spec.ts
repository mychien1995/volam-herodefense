import { test, expect, type Page, type Browser } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { m1Config } from '@volam/game-data';
import { joinWaiting, startTogether } from './pregame-helper.js';
import { read, hero, monitor, moveTo, enter, exit } from './m3c1-helpers.js';
interface ApprovedView {
  observedFrames: string[];
  phases: string[];
  runs: number;
  projectiles: number;
  trails: number;
  events: { id: number; skill: string; stage: string }[];
  persistent: { owner: string; phase: string; x: number; y: number }[];
  active: {
    owner: string;
    skill: string;
    phase: string;
    asset: string;
    x: number;
    y: number;
  }[];
}
const out = 'docs/evidence/animation-change';
const visual = (p: Page) =>
  p.evaluate<ApprovedView>('window.__VOLAM__.presentation().skills.approved');
async function pair(browser: Browser, school: string) {
  const contexts = await Promise.all(
    [1280, 1920].map((width) =>
      browser.newContext({
        viewport: { width, height: width === 1280 ? 720 : 1080 },
      }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage())),
    errors = pages.map(monitor);
  let room = '';
  for (const [i, p] of pages.entries()) {
    await joinWaiting(
      p,
      school + ' ' + i,
      room || undefined,
      '/?debug=1&skillPreview=1',
      45000,
    );
    if (!room) room = (await read(p)).roomId;
  }
  await startTogether(pages, [school, school]);
  await Promise.all(pages.map((p, i) => moveTo(p, 740 + i * 130, 980)));
  return { contexts, pages, errors };
}
async function direction(p: Page, name: string) {
  const key = {
    right: 'ArrowRight',
    left: 'ArrowLeft',
    up: 'ArrowUp',
    down: 'ArrowDown',
  }[name]!;
  await p.locator('#game canvas').focus();
  await p.keyboard.press(key, { delay: 60 });
  const [x, y] = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] }[
    name
  ]!;
  await expect
    .poll(async () => {
      const h = await hero(p);
      return [h.fx, h.fy];
    })
    .toEqual([x, y]);
}
async function equip(p: Page, id: string) {
  await p.locator('#preview-skill').selectOption(id);
  await p.locator('#preview-equip').click();
  await expect.poll(async () => (await hero(p)).qSkill).toBe(id);
  await expect
    .poll(async () => (await hero(p)).qCooldown, { timeout: 25000 })
    .toBe(0);
  await expect
    .poll(async () => (await hero(p)).mana, { timeout: 20000 })
    .toBeGreaterThanOrEqual(m1Config.skillCatalogue![id]!.manaCost);
}
async function cast(p: Page, id: string) {
  const last = Math.max(0, ...(await read(p)).events.map((e) => e.id));
  await p.locator('#game canvas').focus();
  await p.keyboard.press('KeyQ');
  await expect
    .poll(async () =>
      (await read(p)).events.some(
        (e) => e.id > last && e.kind === 'cast' && e.abilityId === id,
      ),
    )
    .toBe(true);
}
for (const [school, ids] of [
  ['thien_son', ['lien_hoa_phien', 'phong_anh_hoan_vi']],
  ['vo_dang', ['that_tinh_kiem', 'toa_sat_bac_do', 'van_kiem_quy_tong']],
  [
    'thieu_lam',
    [
      'dai_luc_kim_cuong_chuong',
      'tam_gioi_quy_thien',
      'bat_dong_minh_vuong',
      'nhu_lai_thien_diep',
    ],
  ],
] as const)
  test(`approved animations ${school}: two real clients, four facings, authoritative lifetime and cleanup`, async ({
    browser,
  }) => {
    await mkdir(out, { recursive: true });
    const { contexts, pages, errors } = await pair(browser, school),
      records: unknown[] = [];
    const [a, b] = pages as [Page, Page];
    try {
      for (let pass = 0; pass < 2; pass++)
        for (const id of ids) {
          await Promise.all(pages.map((p) => equip(p, id)));
          await Promise.all(
            pages.map((p, i) =>
              direction(
                p,
                pass === 0
                  ? i === 0
                    ? 'right'
                    : 'left'
                  : i === 0
                    ? 'up'
                    : 'down',
              ),
            ),
          );
          for (const p of pages) {
            await p.locator('[data-fixture=clear]').click();
            await p.locator('[data-fixture=targets]').click();
          }
          const start = (await visual(b)).observedFrames.length;
          const before = await Promise.all(pages.map(hero));
          const eventStart = Math.max(
            0,
            ...(await read(b)).events.map((e) => e.id),
          );
          await Promise.all(pages.map((p) => cast(p, id)));
          await expect
            .poll(async () => (await visual(b)).observedFrames.length)
            .toBeGreaterThan(start);
          if (id === 'phong_anh_hoan_vi') {
            for (let i = 0; i < 2; i++) {
              const h = await hero(pages[i]!),
                old = before[i]!;
              expect(
                (h.x - old.x) * old.fx + (h.y - old.y) * old.fy,
              ).toBeLessThan(-40);
              expect([h.fx, h.fy]).toEqual([old.fx, old.fy]);
            }
            await expect
              .poll(async () =>
                (await visual(b)).phases.includes('light_afterimage'),
              )
              .toBe(true);
          }
          if (id === 'lien_hoa_phien') {
            await expect
              .poll(
                async () =>
                  (await visual(b)).persistent.filter(
                    (v) => v.phase === 'lotus_ground',
                  ).length,
              )
              .toBe(2);
            const owner = (await read(a)).sessionId;
            const planted = (await visual(b)).persistent.find(
              (v) => v.owner === owner && v.phase === 'lotus_ground',
            )!;
            await a.keyboard.press('ArrowRight', { delay: 900 });
            await expect
              .poll(async () =>
                (await visual(b)).persistent.some(
                  (v) => v.owner === owner && v.phase === 'protected_inside',
                ),
              )
              .toBe(false);
            const stable = (await visual(b)).persistent.find(
              (v) => v.owner === owner && v.phase === 'lotus_ground',
            )!;
            expect([stable.x, stable.y]).toEqual([planted.x, planted.y]);
            await a.keyboard.press('ArrowLeft', { delay: 900 });
            await expect
              .poll(async () =>
                (await visual(b)).persistent.some(
                  (v) => v.owner === owner && v.phase === 'protected_inside',
                ),
              )
              .toBe(true);
          }
          if (id === 'toa_sat_bac_do') {
            await expect
              .poll(async () =>
                (await visual(b)).persistent.some(
                  (v) => v.phase === 'guard_70_percent',
                ),
              )
              .toBe(true);
            await expect
              .poll(
                async () =>
                  (await visual(b)).events.some(
                    (e) =>
                      e.id > eventStart &&
                      e.skill === id &&
                      e.stage === 'counter_release',
                  ),
                { timeout: 15000 },
              )
              .toBe(true);
          }
          if (id === 'van_kiem_quy_tong') {
            await b.waitForTimeout(3600);
            expect((await visual(b)).projectiles).toBeGreaterThan(0);
            expect((await hero(a)).statuses).toContain('channel');
          }
          if (
            pass === 0 &&
            [
              'lien_hoa_phien',
              'van_kiem_quy_tong',
              'nhu_lai_thien_diep',
            ].includes(id)
          )
            await b.screenshot({ path: `${out}/${id}-live.png` });
          await expect
            .poll(
              async () => {
                const v = await visual(b);
                return v.runs + v.persistent.length + v.projectiles + v.trails;
              },
              { timeout: 20000 },
            )
            .toBe(0);
          records.push({
            id,
            pass,
            caster: await read(a),
            observer: await read(b),
            visual: await visual(b),
          });
        }
      if (school === 'thieu_lam') {
        for (const p of pages)
          await p.locator('#preview-basic').selectOption('thieu_lam_dao');
        for (const d of ['right', 'down', 'left', 'up']) {
          await direction(a, d);
          const start = (await read(a)).events.at(-1)?.id ?? 0;
          await a.locator('#game canvas').focus();
          await a.keyboard.press('KeyA');
          await expect
            .poll(async () =>
              (await read(b)).events.some(
                (e) =>
                  e.id > start &&
                  e.kind === 'attack' &&
                  e.abilityId === 'thieu_lam_dao',
              ),
            )
            .toBe(true);
          await expect.poll(async () => (await hero(a)).basicCooldown).toBe(0);
        }
        expect((await visual(b)).phases).toContain('blade_contact');
      }
      expect(errors.flat()).toEqual([]);
      const v = await visual(b);
      for (const d of ['right', 'left', 'up', 'down'])
        expect(v.observedFrames.some((f) => f.includes('_' + d + '_'))).toBe(
          true,
        );
      await writeFile(
        `${out}/${school}-observations.json`,
        JSON.stringify(
          {
            scope:
              'Real server commands, unchanged resources/cooldowns; four-facing caster/observer playback; no fabricated hits',
            records,
            final: v,
            errors,
            recordingsCreated: false,
          },
          null,
          2,
        ),
      );
    } catch (e) {
      await b.screenshot({ path: `${out}/${school}-failure.png` });
      await writeFile(
        `${out}/${school}-failure.json`,
        JSON.stringify(
          {
            caster: await read(a),
            observer: await read(b),
            visual: await visual(b),
            errors,
          },
          null,
          2,
        ),
      );
      throw e;
    } finally {
      await Promise.all(contexts.map((c) => c.close()));
    }
  });

test('approved VFX lifecycle: zone change, owner disconnect and scene shutdown clear planted effects', async ({
  browser,
}) => {
  const { contexts, pages, errors } = await pair(browser, 'thien_son');
  const [a, b] = pages as [Page, Page];
  try {
    await equip(a, 'lien_hoa_phien');
    await cast(a, 'lien_hoa_phien');
    const owner = (await read(a)).sessionId;
    await expect
      .poll(async () =>
        (await visual(b)).persistent.some((v) => v.owner === owner),
      )
      .toBe(true);
    await enter(a);
    await expect
      .poll(async () =>
        (await visual(b)).persistent.some((v) => v.owner === owner),
      )
      .toBe(false);
    expect((await visual(a)).persistent).toHaveLength(0);
    expect((await visual(b)).active.some((v) => v.owner === owner)).toBe(false);
    await exit(a);
    await equip(b, 'lien_hoa_phien');
    await cast(b, 'lien_hoa_phien');
    const leaving = (await read(b)).sessionId;
    await expect
      .poll(async () =>
        (await visual(a)).persistent.some((v) => v.owner === leaving),
      )
      .toBe(true);
    await b.close();
    await expect
      .poll(async () =>
        (await visual(a)).persistent.some((v) => v.owner === leaving),
      )
      .toBe(false);
    await writeFile(
      `${out}/lifecycle-zone-disconnect.json`,
      JSON.stringify(
        {
          state: await read(a),
          visual: await visual(a),
          errors,
          recordingsCreated: false,
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

test('approved VFX lifecycle: actual incoming damage, guard owner death and automatic respawn', async ({
  browser,
}) => {
  const { contexts, pages, errors } = await pair(browser, 'vo_dang');
  const [a, b] = pages as [Page, Page];
  try {
    await equip(a, 'toa_sat_bac_do');
    for (let attempt = 0; attempt < 3; attempt++) {
      await a.locator('[data-fixture=attacker]').click();
      await expect
        .poll(async () => (await hero(a)).hp, {
          timeout: 35000,
          intervals: [30, 50, 80],
        })
        .toBeLessThanOrEqual(12);
      if ((await hero(a)).hp > 0) break;
      await expect
        .poll(async () => (await hero(a)).hp, { timeout: 10000 })
        .toBeGreaterThan(0);
      await a.locator('[data-fixture=clear]').click();
      await moveTo(a, 740, 980);
    }
    expect((await hero(a)).hp).toBeGreaterThan(0);
    expect((await hero(a)).hp).toBeLessThanOrEqual(12);
    await cast(a, 'toa_sat_bac_do');
    const owner = (await read(a)).sessionId;
    await expect
      .poll(
        async () =>
          (await visual(b)).persistent.some(
            (v) => v.owner === owner && v.phase === 'guard_70_percent',
          ),
        { intervals: [30, 50, 80] },
      )
      .toBe(true);
    await expect
      .poll(
        async () =>
          (await visual(b)).events.some((v) => v.stage === 'guard_received'),
        { timeout: 5000 },
      )
      .toBe(true);
    await expect
      .poll(async () => (await hero(a)).hp, { timeout: 6000 })
      .toBe(0);
    await expect
      .poll(async () =>
        (await visual(b)).persistent.some((v) => v.owner === owner),
      )
      .toBe(false);
    await expect
      .poll(async () => (await hero(a)).hp, { timeout: 10000 })
      .toBeGreaterThan(0);
    await writeFile(
      `${out}/lifecycle-death-respawn.json`,
      JSON.stringify(
        {
          state: await read(a),
          visual: await visual(b),
          errors,
          recordingsCreated: false,
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
