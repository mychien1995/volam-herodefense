import { test, expect, type Page } from '@playwright/test';
import { joinWaiting, startTogether } from './pregame-helper.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
const evidence = qaEvidenceDirectory('docs/evidence/m3d-r3-gameplay');
const review = process.env['VOLAM_QA_DEV_CLIENT'] !== '1';
let activePages: Page[] = [];
const snap = (p: Page) => p.evaluate<any>('window.__VOLAM__.snapshot()');
const presentation = (p: Page) =>
  p.evaluate<any>('window.__VOLAM__.presentation()');

test('r3 still evidence: one canvas PNG at each short phase and layered arena landmarks', async ({
  browser,
}) => {
  const contexts = await Promise.all(
    Array.from({ length: 3 }, () => browser.newContext()),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  activePages = pages;
  const [a, b, c] = pages as [Page, Page, Page],
    shots: any[] = [];
  await joinWaiting(a, 'Still Bong');
  await joinWaiting(b, 'Still Dao', (await snap(a)).roomId);
  await joinWaiting(c, 'Still Monk', (await snap(a)).roomId);
  await startTogether(pages, ['cai_bang', 'thien_son', 'thieu_lam']);
  for (const [p, skill, asset, phase] of [
    [a, 'pha_giap_bong', 'b3_pha_giap_vfx', 'impact_left'],
    [b, 'liet_phong_dao', 'ts_dao_fx', 'liet_phong_slash_right'],
    [c, 'hoanh_tao_cuoc', 'r3_ca_diep_ground_keyposes', 'travel_left'],
  ] as const) {
    await fixture(p, { action: 'build', ids: [skill, '', '', ''] });
    await fixture(p, { action: 'restore' });
    await fixture(p, { action: 'position', x: 1000, y: 700, fx: -1, fy: 0 });
    await p.waitForTimeout(120);
    // Observe metadata until the requested live frame; export exactly ONE canvas PNG.
    await p.evaluate(
      ({ asset, phase }) => {
        const w = window as any,
          deadline = Date.now() + 10000;
        w.__qaStill = new Promise((resolve) => {
          const inspect = () => {
            const view = w.__VOLAM__.presentation(),
              entity = view.skills.r3.entities.find(
                (e: any) =>
                  e.asset.endsWith(asset) && e.frame.startsWith(phase),
              );
            if (entity) {
              resolve({
                png: document
                  .querySelector<HTMLCanvasElement>('#game canvas')!
                  .toDataURL('image/png'),
                entity,
                zoom: view.zoom,
                camera: view.camera,
              });
              return;
            }
            if (Date.now() > deadline) {
              resolve({
                error: 'live phase not observed: ' + asset + '/' + phase,
              });
              return;
            }
            requestAnimationFrame(inspect);
          };
          requestAnimationFrame(inspect);
        });
      },
      { asset, phase },
    );
    await key(p, 'q');
    const still = await p.evaluate<any>('window.__qaStill');
    expect(still.error).toBeUndefined();
    expect(still.zoom).toBe(1);
    const bytes = Buffer.from(still.png.split(',')[1], 'base64');
    expect(bytes.length).toBeGreaterThan(50000);
    await mkdir(evidence, { recursive: true });
    await writeFile(evidence + '/' + skill + '-live-phase.png', bytes);
    delete still.png;
    shots.push({ skill, ...still });
  }
  for (const destination of ['hong_liet', 'co_mo', 'kim_luan']) {
    await fixture(a, { action: 'travel', destination });
    await fixture(a, { action: 'endurance' });
    await fixture(a, { action: 'position', x: 704, y: 310 });
    await a.waitForTimeout(250);
    const v = await presentation(a);
    expect(v.r3Scenery.length).toBeGreaterThan(0);
    expect(v.zoom).toBe(1);
    await image(a, destination + '-landmarks');
    shots.push({ destination, scenery: v.r3Scenery, camera: v.camera });
  }
  await writeFile(
    evidence + '/still-phase-observations.json',
    JSON.stringify(
      {
        scope:
          'one PNG per named live canvas phase; metadata polling only, no frame stream or simulation time changes',
        shots,
      },
      null,
      2,
    ),
  );
  await Promise.all(contexts.map((c) => c.close()));
});
async function fixture(p: Page, data: Record<string, unknown>) {
  const s = await snap(p);
  const r = await fetch(
    `http://127.0.0.1:${process.env['VOLAM_QA_FIXTURE_PORT'] ?? 2898}/fixture`,
    {
      method: 'POST',
      body: JSON.stringify({
        roomId: s.roomId,
        sessionId: s.sessionId,
        ...data,
      }),
    },
  );
  expect(r.ok, await r.text()).toBe(true);
}
const hero = async (p: Page) => {
  const s = await snap(p);
  return s.state.players[s.sessionId];
};
async function key(p: Page, k: string) {
  await p.bringToFront();
  await p.locator('#game canvas').focus();
  await p.keyboard.press(k);
}
async function image(p: Page, name: string) {
  if (review) {
    await mkdir(evidence, { recursive: true });
    await p.screenshot({ path: evidence + '/' + name + '.png' });
  }
}
test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) {
    await mkdir(evidence, { recursive: true });
    const stamp = Date.now();
    await (activePages[0] ?? page)
      .screenshot({ path: evidence + '/failure-' + stamp + '.png' })
      .catch(() => {});
    await writeFile(
      evidence + '/failure-' + stamp + '.json',
      JSON.stringify(
        await Promise.all(
          activePages.map(async (p) => ({
            snapshot: await snap(p).catch(() => null),
            view: await presentation(p).catch(() => null),
          })),
        ),
        null,
        2,
      ),
    );
  }
});
test('r3 iteration: two clients, in-viewport O/P/Esc UI and actual Ca Diệp cast/impact/stun/cleanup', async ({
  browser,
}) => {
  const errors: string[] = [];
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  activePages = pages;
  pages.forEach((p) => p.on('pageerror', (e) => errors.push(e.message)));
  const a = pages[0]!,
    b = pages[1]!;
  await joinWaiting(a, 'R3 A');
  await joinWaiting(b, 'R3 B', (await snap(a)).roomId);
  await startTogether(pages, ['thieu_lam', 'vo_dang']);
  await a.keyboard.press('o');
  await expect(a.locator('#dialog-title')).toHaveText('Võ Công');
  await a.keyboard.press('Escape');
  await expect(a.locator('#modal-layer')).toBeHidden();
  await a.keyboard.press('p');
  await expect(a.locator('#dialog-title')).toHaveText('Chọn Phó Bản');
  expect(await a.locator('[data-access]').count()).toBe(0);
  expect(await a.locator('.boss-information').count()).toBe(4);
  expect(
    await a
      .locator('.destination-slot .destination')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-destination'))),
  ).toEqual(['co_mo', 'hong_liet', 'chu_ba_thong', 'kim_luan']);
  await a
    .getByRole('button', { name: 'Thông tin Lý Mạc Sầu', exact: true })
    .click();
  await expect(a.locator('#boss-party-dialog')).toBeVisible();
  await a.keyboard.press('Escape');
  await a.keyboard.press('Escape');
  await a.keyboard.press('Escape');
  await expect(a.locator('#dialog-title')).toHaveText('Rời trận');
  await a.locator('#cancel-quit').click();
  await fixture(a, {
    action: 'build',
    basic: 'thieu_lam_quyen',
    ids: ['hoanh_tao_cuoc', '', '', ''],
  });
  await fixture(a, { action: 'position', x: 750, y: 700, fx: 1, fy: 0 });
  await fixture(b, { action: 'position', x: 760, y: 750, fx: 1, fy: 0 });
  await fixture(a, {
    action: 'targets',
    points: [
      { x: 850, y: 700 },
      { x: 980, y: 700 },
      { x: 1100, y: 700 },
    ],
  });
  await a.waitForTimeout(180);
  await a.locator('#game canvas').focus();
  await a.keyboard.press('q');
  await expect
    .poll(async () =>
      Object.keys((await presentation(a)).skills.r3.frames).some((k) =>
        k.includes('r3_ca_diep_ground_keyposes:travel_right'),
      ),
    )
    .toBe(true);
  await expect
    .poll(async () =>
      Object.keys((await presentation(b)).skills.r3.frames).some((k) =>
        k.includes('r3_ca_diep_ground_keyposes:travel_right'),
      ),
    )
    .toBe(true);
  await expect
    .poll(
      async () =>
        (await snap(a)).events.filter(
          (e: any) => e.kind === 'hit' && e.abilityId === 'hoanh_tao_cuoc',
        ).length,
    )
    .toBe(3);
  await expect
    .poll(async () =>
      Object.keys((await presentation(a)).skills.r3.frames).some((k) =>
        k.includes('stun_loop'),
      ),
    )
    .toBe(true);
  expect((await snap(a)).state.players[(await snap(a)).sessionId].x).toBe(750);
  await fixture(a, { action: 'kill' });
  await expect
    .poll(async () => (await presentation(a)).skills.r3.entities.length)
    .toBe(0);
  expect(errors).toEqual([]);
  await Promise.all(contexts.map((c) => c.close()));
});

test('r3 production schools: four facings, all revised casts, manual A, cancel and death', async ({
  browser,
}) => {
  const contexts = await Promise.all(
    Array.from({ length: 3 }, () => browser.newContext()),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  activePages = pages;
  const errors: string[] = [];
  pages.forEach((p) => p.on('pageerror', (e) => errors.push(e.message)));
  const a = pages[0]!,
    b = pages[1]!;
  for (let i = 0; i < pages.length; i++)
    await joinWaiting(
      pages[i]!,
      'R3 ' + i,
      i ? (await snap(a)).roomId : undefined,
    );
  await startTogether(pages, [
    'thieu_lam',
    'cai_bang',
    'thien_son',
    'vo_dang',
    'thieu_lam',
    'vo_dang',
  ]);
  const schoolBuilds = [
    ['hoanh_tao_cuoc', 'toan_phong_thoai', 'vo_anh_cuoc', 'nhu_lai_niet_ban'],
    ['pha_giap_bong', 'thien_ha_vo_cau', '', ''],
    ['liet_phong_dao', '', '', ''],
    ['luong_nghi_thu', '', '', ''],
    ['toan_phong_thoai', '', '', ''],
    ['duong_khi_kich', '', '', ''],
  ];
  for (let i = 0; i < pages.length; i++) {
    await fixture(pages[i]!, {
      action: 'build',
      basic:
        i === 0 || i === 4
          ? 'thieu_lam_quyen'
          : i === 1
            ? 'cai_bang_bong'
            : i === 2
              ? 'thien_son_dao'
              : 'vo_dang_kiem',
      ids: schoolBuilds[i],
    });
    await fixture(pages[i]!, { action: 'endurance' });
    await fixture(pages[i]!, {
      action: 'position',
      x: 850 + (i % 3) * 90,
      y: 700 + Math.floor(i / 3) * 90,
      fx: 1,
      fy: 0,
    });
  }
  const observations: any[] = [];
  const cases = [
    ['hoanh_tao_cuoc', 'r3_ca_diep_ground_keyposes'],
    ['toan_phong_thoai', 'r3_tornado'],
    ['vo_anh_cuoc', 'r3_foot_force'],
    ['nhu_lai_niet_ban', 'r3_buddha'],
    ['vi_da_quyen', 'shaolin_skill_fx'],
    ['tru_ta', 'tru_ta_vfx'],
    ['kim_quang_ho_tran', 'kim_quang_ho_tran_vfx'],
    ['tam_gioi_quy_thien', 'r3_lion_head'],
    ['pha_giap_bong', 'b3_pha_giap'],
    ['thien_ha_vo_cau', 'vo_cau'],
    ['liet_phong_dao', 'ts_dao_fx'],
  ];
  const dirs = [
    ['right', 1, 0],
    ['left', -1, 0],
    ['down', 0, 1],
    ['up', 0, -1],
  ] as const;
  for (const [skill, asset] of cases) {
    const a =
      skill === 'liet_phong_dao'
        ? pages[2]!
        : ['pha_giap_bong', 'thien_ha_vo_cau'].includes(skill!)
          ? b
          : pages[0]!;
    await fixture(a, { action: 'build', ids: [skill, '', '', ''] });
    for (const [d, fx, fy] of dirs) {
      await fixture(a, { action: 'restore' });
      await fixture(a, { action: 'endurance' });
      await fixture(a, { action: 'position', x: 1000, y: 700, fx, fy });
      await fixture(a, {
        action: 'targets',
        points: [
          { x: 1000 + fx * 90, y: 700 + fy * 90 },
          { x: 1000 + fx * 160, y: 700 + fy * 160 },
          { x: 1000 + fx * 250, y: 700 + fy * 250 },
        ],
      });
      await a.waitForTimeout(120);
      const before = Math.max(
        0,
        ...(await snap(a)).events.map((e: any) => e.id),
      );
      await key(a, 'q');
      await expect
        .poll(async () =>
          (await snap(a)).events.some(
            (e: any) =>
              e.id > before && e.kind === 'cast' && e.abilityId === skill,
          ),
        )
        .toBe(true);
      await expect
        .poll(async () =>
          JSON.stringify((await presentation(a)).skills.r3.frames).includes(
            asset!,
          ),
        )
        .toBe(true);
      if (
        d === 'left' &&
        ['pha_giap_bong', 'liet_phong_dao'].includes(skill!)
      ) {
        if (skill === 'liet_phong_dao')
          await image(a, 'liet_phong_dao-overhead-left');
        await expect
          .poll(
            async () =>
              (await snap(a)).events.some(
                (e: any) =>
                  e.id > before &&
                  e.abilityId === skill &&
                  e.stage === 'strike',
              ),
            { intervals: [10, 20] },
          )
          .toBe(true);
        await image(a, skill + '-left');
      } else {
        await a.waitForTimeout(350);
        if (d === 'left' && skill === 'hoanh_tao_cuoc')
          await image(a, skill + '-left');
      }
      await a.waitForTimeout(
        skill === 'nhu_lai_niet_ban'
          ? 650
          : skill === 'thien_ha_vo_cau'
            ? 1100
            : 500,
      );
      const view = await presentation(a);
      expect(view.zoom).toBe(1);
      expect(view.rotation).toBe(0);
      observations.push({
        skill,
        direction: d,
        view: view.skills.r3,
        hero: await hero(a),
      });
      console.info('r3 cast checked', skill, d);
    }
  }
  // Four fresh A presses produce exactly one finisher; held A never repeats it.
  await fixture(a, { action: 'restore' });
  await fixture(a, {
    action: 'build',
    basic: 'thieu_lam_quyen',
    ids: ['', '', '', ''],
  });
  await fixture(a, { action: 'position', x: 1000, y: 700, fx: 1, fy: 0 });
  const beforeA = Math.max(0, ...(await snap(a)).events.map((e: any) => e.id));
  for (let n = 0; n < 4; n++) {
    await key(a, 'a');
    await a.waitForTimeout(260);
  }
  await expect
    .poll(
      async () =>
        (await snap(a)).events.filter(
          (e: any) =>
            e.id > beforeA &&
            e.kind === 'attack' &&
            e.abilityId === 'thieu_lam_quyen',
        ).length,
    )
    .toBe(4);
  await a.keyboard.down('a');
  await a.waitForTimeout(700);
  await a.keyboard.up('a');
  expect(
    (await snap(a)).events.filter(
      (e: any) =>
        e.id > beforeA &&
        e.kind === 'attack' &&
        e.abilityId === 'thieu_lam_quyen',
    ).length,
  ).toBeLessThanOrEqual(5);
  for (const [p, basics] of [
    [pages[0]!, ['thieu_lam_quyen', 'thieu_lam_dao']],
    [pages[1]!, ['cai_bang_bong', 'cai_bang_chuong']],
    [pages[2]!, ['thien_son_dao', 'thien_son_phien']],
  ] as const)
    for (const basic of basics)
      for (const [d, fx, fy] of dirs) {
        await fixture(p, { action: 'restore' });
        await fixture(p, { action: 'build', basic, ids: ['', '', '', ''] });
        await fixture(p, { action: 'position', x: 1000, y: 700, fx, fy });
        await p.waitForTimeout(100);
        const before = Math.max(
          0,
          ...(await snap(p)).events.map((e: any) => e.id),
        );
        await key(p, 'a');
        await p.waitForTimeout(250);
        expect(
          (await snap(p)).events.filter(
            (e: any) =>
              e.id > before && e.kind === 'attack' && e.abilityId === basic,
          ),
        ).toHaveLength(1);
        observations.push({
          basic,
          direction: d,
          view: (await presentation(p)).skills,
        });
      }
  // Cancellation and death remove both body and owned effects on local/remote clients.
  await fixture(a, { action: 'restore' });
  await fixture(a, { action: 'build', ids: ['hoanh_tao_cuoc', '', '', ''] });
  await key(a, 'q');
  await fixture(a, { action: 'stun' });
  await a.waitForTimeout(250);
  expect((await presentation(a)).skills.r3.casts).toHaveLength(0);
  await fixture(a, { action: 'kill' });
  await expect
    .poll(async () => (await presentation(a)).skills.r3.entities.length)
    .toBe(0);
  await fixture(a, { action: 'restore' });

  expect(errors).toEqual([]);
  await mkdir(evidence, { recursive: true });
  await writeFile(
    evidence + '/school-observations.json',
    JSON.stringify(
      {
        scope:
          'three real clients, four facing keyboard casts, normal zoom1, cancel/death',
        errors,
        observations,
      },
      null,
      2,
    ),
  );
  await Promise.all(contexts.map((c) => c.close()));
});

test('r3 retained r2 gameplay: Võ Đang A once, projectile/hold/blink and moving owner burn with cleanup', async ({
  browser,
}) => {
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  activePages = pages;
  const [a, b] = pages as [Page, Page],
    errors: string[] = [],
    observations: any[] = [];
  pages.forEach((p) => p.on('pageerror', (e) => errors.push(e.message)));
  await joinWaiting(a, 'Sword');
  await joinWaiting(b, 'Burn', (await snap(a)).roomId);
  await startTogether(pages, ['vo_dang', 'cai_bang']);
  for (const basic of ['vo_dang_quyen', 'vo_dang_kiem'])
    for (const [fx, fy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      await fixture(a, { action: 'restore' });
      await fixture(a, { action: 'build', basic, ids: ['', '', '', ''] });
      await fixture(a, { action: 'position', x: 1000, y: 700, fx, fy });
      await a.waitForTimeout(100);
      const before = Math.max(
        0,
        ...(await snap(a)).events.map((e: any) => e.id),
      );
      await key(a, 'a');
      await a.waitForTimeout(250);
      expect(
        (await snap(a)).events.filter(
          (e: any) =>
            e.id > before && e.kind === 'attack' && e.abilityId === basic,
        ),
      ).toHaveLength(1);
    }
  await fixture(a, { action: 'restore' });
  await fixture(a, {
    action: 'build',
    basic: 'vo_dang_kiem',
    ids: ['nhan_kiem_hop_nhat', '', '', ''],
  });
  await fixture(a, { action: 'position', x: 750, y: 700, fx: 1, fy: 0 });
  await a.waitForTimeout(100);
  await key(a, 'q');
  await expect
    .poll(async () =>
      (await presentation(a)).skills.m3d.clips.some(
        (c: any) => c.skill === 'nhan_kiem_hop_nhat',
      ),
    )
    .toBe(true);
  await expect
    .poll(
      async () =>
        (await presentation(a)).skills.m3d.clips.some((c: any) =>
          c.tag.startsWith('hold'),
        ),
      { timeout: 5000 },
    )
    .toBe(true);
  const holding = (await snap(a)).state.projectiles;
  observations.push({ hold: holding, view: await presentation(a) });
  const old = await hero(a);
  await key(a, 'q');
  await expect
    .poll(async () => Math.abs((await hero(a)).x - old.x))
    .toBeGreaterThan(100);
  await expect
    .poll(async () =>
      (await snap(a)).events.some((e: any) => e.stage === 'blink_arrive'),
    )
    .toBe(true);
  await fixture(b, {
    action: 'build',
    ids: ['khang_long_huu_hoi', '', '', ''],
  });
  await fixture(b, { action: 'restore' });
  await fixture(b, { action: 'position', x: 900, y: 700, fx: 1, fy: 0 });
  await b.waitForTimeout(100);
  await key(b, 'q');
  await expect
    .poll(async () =>
      (await presentation(b)).skills.m3d.clips.some(
        (c: any) => c.texture === 'm3d_khang_long_burn_vfx',
      ),
    )
    .toBe(true);
  await fixture(b, { action: 'position', x: 1100, y: 760 });
  await b.waitForTimeout(250);
  const owner = (await snap(b)).sessionId;
  const burn = (await presentation(b)).skills.m3d.clips.find(
    (c: any) => c.texture === 'm3d_khang_long_burn_vfx',
  );
  expect(Math.abs(burn.x - (await hero(b)).x)).toBeLessThan(2);
  await expect
    .poll(async () =>
      (await presentation(a)).skills.m3d.clips.some(
        (c: any) =>
          c.owner === owner && c.texture === 'm3d_khang_long_burn_vfx',
      ),
    )
    .toBe(true);
  observations.push({ burn: await presentation(b) });
  await fixture(b, { action: 'kill' });
  await expect
    .poll(
      async () =>
        (await presentation(a)).skills.m3d.clips.filter(
          (c: any) => c.owner === owner,
        ).length,
    )
    .toBe(0);
  expect(errors).toEqual([]);
  await mkdir(evidence, { recursive: true });
  await writeFile(
    evidence + '/retained-r2-observations.json',
    JSON.stringify({ errors, observations }, null, 2),
  );
  await Promise.all(contexts.map((c) => c.close()));
});

test('r3 production bosses: actual phases, invitations, pause, revival, spectator and layered arenas', async ({
  browser,
}) => {
  const contexts = await Promise.all(
    Array.from({ length: 2 }, () => browser.newContext()),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  activePages = pages;
  const errors: string[] = [];
  pages.forEach((p) => p.on('pageerror', (e) => errors.push(e.message)));
  const a = pages[0]!,
    b = pages[1]!;
  const observations: any[] = [];
  await joinWaiting(a, 'Boss A');
  await joinWaiting(b, 'Boss B', (await snap(a)).roomId);
  await startTogether(pages, ['thieu_lam', 'vo_dang']);
  for (const p of pages) await fixture(p, { action: 'endurance' });

  // Real invitation UI and dynamic occupancy pause, including second-death spectator.
  await key(a, 'p');
  await a.locator('[data-destination="hong_liet"]').click();
  await a.locator('#enter-dungeon').click();
  await expect(a.locator('#boss-party-dialog')).toBeVisible();
  await a.locator('[data-party-action="yes"]').click();
  await expect(b.locator('#boss-party-dialog')).toBeVisible();
  await b.locator('[data-party-action="no"]').click();
  expect((await snap(a)).state.defense.paused).toBe(false);
  for (const p of pages.slice(1)) {
    await fixture(p, { action: 'travel', destination: 'hong_liet' });
    if (await p.locator('#boss-party-dialog').isVisible())
      await p.keyboard.press('Escape');
  }
  await expect
    .poll(async () => (await snap(a)).state.defense.paused)
    .toBe(true);
  const arenaTick = (await snap(a)).state.tick;
  await a.waitForTimeout(400);
  expect((await snap(a)).state.tick).toBe(arenaTick);
  await fixture(a, { action: 'endurance' });
  await fixture(a, { action: 'position', x: 704, y: 600 });
  await fixture(a, { action: 'boss-cast', ability: 'hong_liet_a1' });
  await a.waitForTimeout(600);
  observations.push({
    boss: 'hong_liet',
    view: await presentation(a),
    snapshot: await snap(a),
  });
  await image(a, 'hong-liet-normal');
  await fixture(a, { action: 'kill' });
  await expect.poll(async () => (await hero(a)).bossRevivalUsed).toBe(true);
  await expect
    .poll(async () => (await hero(a)).hp, { timeout: 7000 })
    .toBeGreaterThan(0);
  await fixture(a, { action: 'kill' });
  await expect.poll(async () => (await hero(a)).bossSpectator).toBe(true);
  const cam = (await presentation(a)).camera;
  await key(a, 'ArrowUp');
  await a.waitForTimeout(100);
  expect((await presentation(a)).camera.y).not.toBe(cam.y);
  await image(a, 'boss-spectator');
  await key(a, 'Space');
  await expect.poll(async () => (await hero(a)).zoneId).toBe('arena');
  await expect
    .poll(async () => (await snap(b)).state.defense.paused)
    .toBe(false);
  await fixture(a, { action: 'travel', destination: 'hong_liet' });
  await expect.poll(async () => (await hero(a)).bossSpectator).toBe(true);
  await key(a, 'Space');
  for (const p of pages.slice(1)) await fixture(p, { action: 'travel' });

  for (const destination of ['co_mo', 'chu_ba_thong', 'kim_luan']) {
    for (const p of pages) {
      await fixture(p, { action: 'travel', destination });
      await fixture(p, { action: 'endurance' });
    }
    await fixture(a, { action: 'position', x: 704, y: 580 });
    const abilities =
      destination === 'co_mo'
        ? ['ly_mac_sau_basic', 'bang_phach_ngan_cham', 'co_mo_kiem_phap']
        : destination === 'chu_ba_thong'
          ? ['spin', 'ultimate']
          : [
              'phien_trung_doc_dinh',
              'cuong_phong_van_nhan',
              'kim_sweep',
              'kim_hand_chop',
              'kim_luan_truy_hon',
              'ngu_luan_ho_the',
            ];
    for (const ability of abilities) {
      await fixture(a, {
        action: 'boss-cast',
        ability,
        actor:
          ability.includes('doc_dinh') || ability.includes('van_nhan')
            ? 'hoac_do'
            : 'kim_luan_phap_vuong',
      });
      await a.waitForTimeout(
        ability === 'ngu_luan_ho_the'
          ? 4200
          : ability === 'kim_luan_truy_hon'
            ? 1800
            : 1200,
      );
      const v = await presentation(a);
      expect(v.zoom).toBe(1);
      if (destination !== 'chu_ba_thong')
        expect(v.r3Scenery.length).toBeGreaterThan(0);
      if (ability === 'ultimate') {
        expect(JSON.stringify(v.chu.sprites)).not.toContain('large_formation');
        expect(JSON.stringify(v.chu.sprites)).not.toContain('rotating_waves');
        expect(v.chu.state.waves).toHaveLength(0);
        expect(v.chu.state.fields).toHaveLength(15);
      }
      observations.push({
        boss: destination,
        ability,
        view: v,
        snapshot: await snap(a),
      });
      if (ability === abilities.at(-1)) await image(a, destination + '-normal');
    }
    for (const p of pages) await fixture(p, { action: 'travel' });
  }
  expect(errors).toEqual([]);
  await mkdir(evidence, { recursive: true });
  await writeFile(
    evidence + '/boss-observations.json',
    JSON.stringify(
      {
        scope:
          'two real clients, authoritative phases and party/life/camera, normal zoom1',
        errors,
        observations,
      },
      null,
      2,
    ),
  );
  await Promise.all(contexts.map((c) => c.close()));
});

test('r3 production multiplayer: six-player natural combat, rewards and normal-zoom readability', async ({
  browser,
}) => {
  const contexts = await Promise.all(
    Array.from({ length: 6 }, () => browser.newContext()),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  activePages = pages;
  const errors: string[] = [];
  pages.forEach((p) => p.on('pageerror', (e) => errors.push(e.message)));
  const a = pages[0]!,
    observations: any[] = [];
  for (let i = 0; i < pages.length; i++)
    await joinWaiting(
      pages[i]!,
      'Combat ' + i,
      i ? (await snap(a)).roomId : undefined,
    );
  await startTogether(pages, [
    'thieu_lam',
    'cai_bang',
    'thien_son',
    'vo_dang',
    'thieu_lam',
    'vo_dang',
  ]);
  const schoolBuilds = [
    ['hoanh_tao_cuoc', 'toan_phong_thoai', 'vo_anh_cuoc', 'nhu_lai_niet_ban'],
    ['pha_giap_bong', 'thien_ha_vo_cau', '', ''],
    ['liet_phong_dao', '', '', ''],
    ['luong_nghi_thu', '', '', ''],
    ['toan_phong_thoai', '', '', ''],
    ['duong_khi_kich', '', '', ''],
  ];
  for (let i = 0; i < pages.length; i++)
    await fixture(pages[i]!, {
      action: 'build',
      basic:
        i === 0 || i === 4
          ? 'thieu_lam_quyen'
          : i === 1
            ? 'cai_bang_bong'
            : i === 2
              ? 'thien_son_dao'
              : 'vo_dang_kiem',
      ids: schoolBuilds[i],
    });
  // Actual invasion actors, six accepted player inputs and authoritative rewards.
  for (let i = 0; i < pages.length; i++) {
    await fixture(pages[i]!, { action: 'restore' });
    await fixture(pages[i]!, { action: 'endurance' });
  }
  await fixture(a, { action: 'invasion' });
  await expect
    .poll(async () => (await snap(a)).state.defense.wave)
    .toBeGreaterThan(0);
  const goldBefore = (await Promise.all(pages.map(hero))).reduce(
    (n, h) => n + h.gold,
    0,
  );
  for (let n = 0; n < 12; n++)
    for (const p of pages) {
      const s = await snap(p),
        c: any = Object.values(s.state.creeps).find(
          (c: any) => c.zoneId === 'arena' && c.hp > 0 && c.invasionWave > 0,
        );
      if (c) {
        await fixture(p, {
          action: 'position',
          x: c.x - 42,
          y: c.y,
          fx: 1,
          fy: 0,
        });
        await key(p, 'a');
      }
    }
  await expect
    .poll(async () =>
      (await Promise.all(pages.map(hero))).reduce((n, h) => n + h.gold, 0),
    )
    .toBeGreaterThan(goldBefore);
  await image(a, 'six-player-combat');
  // Six same-viewport skill effects without exterior dashboard panels.
  for (let i = 0; i < pages.length; i++) {
    await fixture(pages[i]!, { action: 'restore' });
    await fixture(pages[i]!, { action: 'build', ids: schoolBuilds[i] });
    await fixture(pages[i]!, {
      action: 'position',
      x: 850 + (i % 3) * 80,
      y: 700 + Math.floor(i / 3) * 80,
      fx: 1,
      fy: 0,
    });
  }
  for (const p of pages) await key(p, 'q');
  await a.waitForTimeout(180);
  await image(a, 'six-player-r3');
  observations.push({
    six: await Promise.all(pages.map(presentation)),
    snapshots: await Promise.all(pages.map(snap)),
  });
  expect(errors).toEqual([]);
  await mkdir(evidence, { recursive: true });
  await writeFile(
    evidence + '/animation-observations.json',
    JSON.stringify(
      {
        scope:
          'real six-client production Phaser, server-only setup fixtures, normal zoom1, fresh keyboard casts, no recording',
        errors,
        observations,
      },
      null,
      2,
    ),
  );
  await Promise.all(contexts.map((c) => c.close()));
});
