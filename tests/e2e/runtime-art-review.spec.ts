import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { joinWaiting, startTogether } from './pregame-helper.js';
import {
  runtimeArtCases,
  type ArtCase,
} from '../../tools/art-revision/runtime-review-cases.js';
const out = 'docs/evidence/sessions/runtime-art-rework-v04';
const matrixFile = process.env['ART_REVIEW_FROM']
  ? 'observations-tail.json'
  : 'observations.json';
const view = (p: Page) =>
  p.evaluate<any>('window.__RUNTIME_ART_REVIEW__.inspect()');
const snap = (p: Page) => p.evaluate<any>('window.__VOLAM__.snapshot()');
test('v06 gallery plays four basic stages and both Vô Ảnh Cước variants', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/art-review/#cai_bang_bong');
  const engine = page.frameLocator('#engine');
  const replay = page.locator('#replay');
  const snapshot = () =>
    engine.locator('body').evaluate(() => (window as any).__VOLAM__.snapshot());
  await expect(replay).toBeEnabled({ timeout: 90_000 });
  const readStages = async (id: string) => {
    const s = await snapshot();
    return s.events
      .filter(
        (e: any) =>
          e.sourceId === s.sessionId &&
          e.kind === 'attack' &&
          e.abilityId === id,
      )
      .map((e: any) => e.stage);
  };
  expect(await readStages('cai_bang_bong')).toEqual([
    'thrust',
    'sweep',
    'lift',
    'smash',
  ]);
  await page.locator('[data-case="thieu_lam_quyen"]').click();
  await expect(replay).toBeEnabled();
  expect(await readStages('thieu_lam_quyen')).toEqual([
    'left_fist',
    'right_fist',
    'front_kick',
    'roundhouse_kick',
  ]);
  await engine.locator('body').evaluate(() => {
    const w = window as any;
    w.reviewFootShots = new Set<string>();
    window.setInterval(() => {
      const s = w.__VOLAM__.snapshot();
      for (const [id, p] of Object.entries(s.state.projectiles) as [
        string,
        any,
      ][])
        if (p.ownerId === s.sessionId && p.abilityId === 'vo_anh_cuoc')
          w.reviewFootShots.add(id);
    }, 16);
  });
  const footShots = () =>
    engine.locator('body').evaluate(() => (window as any).reviewFootShots.size);
  await page.locator('[data-case="vo_anh_cuoc"]').click();
  await expect.poll(footShots).toBe(1);
  await expect(replay).toBeEnabled();
  await page.locator('#proc').check();
  await expect.poll(footShots).toBe(7);
  await expect(replay).toBeEnabled();
  await expect(page.locator('#status')).toHaveText('Đang phát · tốc độ gốc');
  expect(errors).toEqual([]);
});
const setMode = (p: Page, mode: string) =>
  p.evaluate((m) => (window as any).__RUNTIME_ART_REVIEW__.setMode(m), mode);
test('M3D normal game loads approved sheets with native geometry and original Thái Cực Trận', async ({
  page,
}) => {
  const errors: string[] = [];
  const paths = new Set<string>();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (r) => {
    if (r.ok()) paths.add(new URL(r.url()).pathname);
  });
  await joinWaiting(page, 'M3D artwork', undefined, '/?debug=1', 90_000);
  await startTogether([page], ['vo_dang'], 90_000);
  const view = () => page.evaluate<any>('window.__VOLAM__.presentation()');
  await expect
    .poll(async () => (await view()).artwork?.length ?? 0)
    .toBeGreaterThan(100);
  const selection = (await view()).artwork;
  expect(
    selection.some((a: any) =>
      /thai_cuc_tran|shield_formation_v2_ground/.test(a.id),
    ),
  ).toBe(false);
  expect(
    selection.some((a: any) => a.id === 'm3d_nhan_kiem_hop_nhat_vfx'),
  ).toBe(true);
  expect(
    selection.some((a: any) => /r3_buddha/.test(a.id) && a.density === 2),
  ).toBe(true);
  expect(
    paths.has(
      '/assets/feedback_v2_runtime/vo_dang_shield_formation_v2_ground.png',
    ),
  ).toBe(true);
  expect(
    [...paths].some((url) =>
      /visual-improvement-approved\/.*r3_buddha/.test(url),
    ),
  ).toBe(true);
  const c = runtimeArtCases.find((entry) => entry.id === 'nhu_lai_thien_diep')!;
  await operation(page, c, 'prepare');
  await page.locator('#game canvas').focus();
  await page.keyboard.press('q');
  await expect
    .poll(async () => {
      const s = await snap(page);
      return Object.values(s.state.areas).some(
        (a: any) => a.abilityId === c.id,
      );
    })
    .toBe(true);
  await page.screenshot({
    path: 'docs/evidence/sessions/visual-improvement-m3d/production-game.png',
  });
  expect(errors).toEqual([]);
});
test('M3D gallery uses the original 2x formation and real multidirectional blade volleys', async ({
  page,
}) => {
  const evidence = 'docs/evidence/sessions/visual-improvement-m3d';
  await mkdir(evidence, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/art-review/#thai_cuc_tran');
  await expect(page.locator('#replay')).toBeEnabled({ timeout: 90_000 });
  const body = page.frameLocator('#engine').locator('body');
  await page.locator('#zoom').selectOption('2');
  await expect
    .poll(() =>
      body.evaluate(() => {
        const v = (window as any).__RUNTIME_ART_REVIEW__.inspect();
        return (
          v.vfxRevision === 'm3d-approved' &&
          !v.assets.some(
            (a: any) =>
              a.key === 'vo_dang_shield_formation_v2_ground' ||
              a.key === 'thai_cuc_tran_vfx',
          ) &&
          v.geometry.some(
            (g: any) =>
              g.visible && g.texture === 'vo_dang_shield_formation_v2_ground',
          )
        );
      }),
    )
    .toBe(true);
  await page.locator('#pause').click();
  await page.screenshot({ path: evidence + '/thai-cuc-tran-2x.png' });
  await page.locator('#zoom').selectOption('1');
  await page.locator('[data-case="nhu_lai_thien_diep"]').click();
  const observe = () =>
    body.evaluate(() => {
      const w = window as any;
      const s = w.__VOLAM__.snapshot();
      const v = w.__RUNTIME_ART_REVIEW__.inspect();
      const blades = (Object.values(s.state.projectiles) as any[]).filter(
        (p) =>
          p.ownerId === s.sessionId && p.abilityId === 'nhu_lai_thien_diep',
      );
      const aura = (Object.values(s.state.areas) as any[]).find(
        (a) =>
          a.ownerId === s.sessionId && a.abilityId === 'nhu_lai_thien_diep',
      );
      return {
        halo: v.geometry.some((g: any) => g.name === 'leaf-halo' && g.visible),
        blades: blades.length,
        directions: [
          ...new Set(
            blades.map((p) => Math.sign(p.vx) + ',' + Math.sign(p.vy)),
          ),
        ],
        ticks: aura ? aura.ticks + s.state.tick - aura.startedAt : undefined,
      };
    });
  await expect
    .poll(async () => (await observe()).directions.length)
    .toBeGreaterThanOrEqual(3);
  expect((await observe()).halo).toBe(true);
  await page.locator('#pause').click();
  const result = await observe();
  expect(result.ticks).toBe(450);
  await page.screenshot({ path: evidence + '/nhu-lai-thien-diep.png' });
  await writeFile(
    evidence + '/gallery-observations.json',
    JSON.stringify({ ...result, errors }, null, 2),
  );
  expect(errors).toEqual([]);
});
async function operation(p: Page, c: ArtCase, op: string) {
  const s = await snap(p);
  const r = await p.request.post(
    '/__visual_review?' +
      new URLSearchParams({
        room: s.roomId,
        player: s.sessionId,
        case: c.id,
        op,
      }),
  );
  expect(r.ok(), c.id + ': ' + (await r.text())).toBe(true);
  return r.json();
}
async function freezeCompare(p: Page, c: ArtCase, png: boolean) {
  await p.evaluate(() => {
    (window as any).__RUNTIME_ART_REVIEW__.setPaused(true);
    (window as any).__RUNTIME_ART_REVIEW__.setMode('current');
  });
  // A just-created impact may still have a queued production depth-sort.
  // Observe after real render frames, rather than comparing insertion order
  // before the first screenshot against sorted draw order afterward.
  await p.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const before = await view(p);
  const keys = new Set(before.assets.map((a: any) => a.key));
  const visible = before.geometry.filter(
    (g: any) => g.visible && g.alpha > 0 && keys.has(g.texture),
  );
  if (png)
    await p.screenshot({
      path: out + '/' + c.id.replaceAll(':', '-') + '-before.png',
    });
  await setMode(p, 'candidate');
  await p.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const after = await view(p);
  expect(
    after.rasterBindings.every((b: any) => b.candidate),
    c.id + ' did not bind candidate pixels',
  ).toBe(true);
  expect(after.geometry, c.id + ' changed production draw geometry').toEqual(
    before.geometry,
  );
  expect(after.camera).toEqual(before.camera);
  if (png)
    await p.screenshot({
      path: out + '/' + c.id.replaceAll(':', '-') + '-after.png',
    });
  await p.evaluate(() =>
    (window as any).__RUNTIME_ART_REVIEW__.setPaused(false),
  );
  return {
    id: c.id,
    name: c.name,
    kind: c.kind,
    sourceCommit: before.sourceCommit,
    geometryExact: true,
    switchMs: after.lastSwitchMs,
    visibleRevised: visible,
    scene: await p.evaluate('window.__VOLAM__.presentation()'),
  };
}
test('production renderer: real hero/boss actions keep identical geometry while switching native artwork', async ({
  browser,
}) => {
  await mkdir(out, { recursive: true });
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const a = pages[0]!,
    b = pages[1]!;
  const errors: string[] = [];
  for (const p of pages) p.on('pageerror', (e) => errors.push(e.message));
  await joinWaiting(a, 'ArtCurrent', undefined, '/?debug=1&runtimeArtReview=1');
  await joinWaiting(
    b,
    'ArtCandidate',
    (await snap(a)).roomId,
    '/?debug=1&runtimeArtReview=1',
  );
  for (const p of pages)
    await p.waitForFunction(() => !!(window as any).__RUNTIME_ART_REVIEW__, {
      timeout: 60000,
    });
  await startTogether(pages, ['cai_bang', 'vo_dang'], 45000);
  await expect
    .poll(async () => (await view(a)).assets.length)
    .toBeGreaterThan(100);
  await setMode(b, 'candidate');
  const pilot = [
    'hoa_van_chuong',
    'tru_ta',
    'ly_mac_sau:ly_mac_sau_basic',
    'hong_liet:hong_liet_a1',
    'chu_ba_thong:palm',
    'hoac_do:thiet_phien_lien_hoan',
    'dat_nhi_ba:dat_sweep',
    'kim_luan_phap_vuong:kim_sweep',
    'dong_ta:dan_chi_than_cong',
    'mai_sieu_phong:bach_cot_trao',
    'hoang_dung:thanh_am_ho_tro',
    'tay_doc:tay_doc_staff',
    'nam_de:nam_de_small_finger',
    'bac_cai:staff',
  ];
  const selectedCases =
    process.env['ART_REVIEW_SCOPE'] === 'all'
      ? runtimeArtCases
      : runtimeArtCases.filter((c) => pilot.includes(c.id));
  const from = process.env['ART_REVIEW_FROM'];
  const first = from ? selectedCases.findIndex((c) => c.id === from) : 0;
  if (first < 0) throw Error('Unknown ART_REVIEW_FROM case');
  const cases = selectedCases.slice(first);
  const rows: any[] = [];
  for (const c of cases) {
    await operation(a, c, 'prepare');
    await a.waitForTimeout(250);
    const s = await snap(a),
      last = Math.max(0, ...s.events.map((e: any) => e.id));
    if (c.kind === 'hero') {
      await a.bringToFront();
      await a.locator('#game canvas').focus();
      await a.keyboard.press(c.skill ? 'q' : 'a');
      await expect
        .poll(
          async () =>
            (await snap(a)).events.some(
              (e: any) =>
                e.id > last &&
                e.sourceId === s.sessionId &&
                e.abilityId === (c.skill ?? c.basic) &&
                ['cast', 'attack'].includes(e.kind),
            ),
          { timeout: 7000 },
        )
        .toBe(true);
    } else
      expect((await operation(a, c, 'cast')).castAcknowledged, c.id).toBe(true);
    await a.waitForTimeout(c.kind === 'hero' ? 250 : 850);
    rows.push(await freezeCompare(a, c, pilot.includes(c.id)));
    await writeFile(
      out + '/' + matrixFile,
      JSON.stringify({ status: 'IN_PROGRESS', rows, errors }, null, 2),
    );
    expect((await snap(b)).state.phase).toBe('IN_GAME');
  }
  await a.setViewportSize({ width: 1366, height: 768 });
  await a.screenshot({ path: out + '/viewport-1366.png' });
  await a.evaluate(() => {
    const button = document.createElement('button');
    button.id = 'qa-fullscreen';
    button.textContent = 'Fullscreen';
    button.onclick = () => void document.documentElement.requestFullscreen();
    document.body.append(button);
  });
  await a.locator('#qa-fullscreen').click();
  await expect
    .poll(() => a.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await a.screenshot({ path: out + '/browser-fullscreen.png' });
  expect(errors).toEqual([]);
  await writeFile(
    out + '/' + matrixFile,
    JSON.stringify(
      {
        status: 'PASS',
        scope: process.env['ART_REVIEW_SCOPE'] ?? 'pilot',
        rows,
        errors,
        fullscreenAPI: true,
      },
      null,
      2,
    ),
  );
  for (const c of contexts) await c.close();
});

test('six real clients retain server-acknowledged combat and the full viewport with candidate art', async ({
  browser,
}) => {
  await mkdir(out, { recursive: true });
  const contexts = await Promise.all(
    Array.from({ length: 6 }, () =>
      browser.newContext({ viewport: { width: 1920, height: 1080 } }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const a = pages[0]!;
  const errors: string[] = [];
  for (const p of pages) p.on('pageerror', (e) => errors.push(e.message));
  await joinWaiting(a, 'Party1', undefined, '/?debug=1&runtimeArtReview=1');
  const room = (await snap(a)).roomId;
  for (let i = 1; i < pages.length; i++)
    await joinWaiting(pages[i]!, 'Party' + (i + 1), room);
  await a.waitForFunction(() => !!(window as any).__RUNTIME_ART_REVIEW__);
  await startTogether(
    pages,
    ['cai_bang', 'thien_son', 'vo_dang', 'thieu_lam', 'cai_bang', 'thieu_lam'],
    45000,
  );
  const sample = runtimeArtCases.find((c) => c.id === 'hoa_van_chuong')!;
  await operation(a, sample, 'prepare');
  const fixture = async (p: Page, data: Record<string, unknown>) => {
    const s = await snap(p);
    const r = await fetch(
      `http://127.0.0.1:${process.env['VOLAM_QA_FIXTURE_PORT'] ?? 2878}/fixture`,
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
  };
  for (let i = 0; i < pages.length; i++)
    await fixture(pages[i]!, {
      action: 'position',
      x: 1000 + i * 14,
      y: 700 + (i % 2) * 22,
      fx: 1,
      fy: 0,
    });
  await setMode(a, 'candidate');
  const ids: string[] = [];
  for (const p of pages) {
    const s = await snap(p);
    ids.push(s.sessionId);
    const last = Math.max(0, ...s.events.map((e: any) => e.id));
    await p.bringToFront();
    await p.locator('#game canvas').focus();
    await p.keyboard.press('a');
    await expect
      .poll(async () =>
        (await snap(p)).events.some(
          (e: any) =>
            e.id > last && e.sourceId === s.sessionId && e.kind === 'attack',
        ),
      )
      .toBe(true);
  }
  for (const p of pages)
    expect(Object.keys((await snap(p)).state.players)).toHaveLength(6);
  await a.bringToFront();
  await a.locator('#game canvas').focus();
  await a.keyboard.press('q');
  await a.waitForTimeout(250);
  const comparison = await freezeCompare(
    a,
    { ...sample, id: 'six-clients' },
    true,
  );
  await a.evaluate(() =>
    (window as any).__RUNTIME_ART_REVIEW__.setPaused(true),
  );
  const fps: any = {};
  for (const mode of ['current', 'candidate']) {
    await setMode(a, mode);
    await a.waitForTimeout(1300);
    fps[mode] = (await view(a)).fps;
  }
  await writeFile(
    out + '/six-clients.json',
    JSON.stringify(
      {
        status: 'PASS',
        serverAcknowledgedAttackers: ids,
        comparison,
        fps,
        performanceScope:
          'Headless Chrome static same-frame render sample; not a hardware FPS guarantee',
        errors,
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
  for (const c of contexts) await c.close();
});
