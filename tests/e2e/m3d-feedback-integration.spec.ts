import { test, expect, type Page } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { joinWaiting, startTogether } from './pregame-helper.js';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
const evidence = qaEvidenceDirectory('docs/evidence/m3d-feedback-integration');
let diagnosticsPages: Page[] = [];
const snapshot = (p: Page) => p.evaluate<any>('window.__VOLAM__.snapshot()');
const view = (p: Page) => p.evaluate<any>('window.__VOLAM__.presentation()');
const m3d = (p: Page) =>
  p.evaluate<any>('window.__VOLAM__.presentation().skills.m3d');
test.afterEach(async ({}, info) => {
  if (info.status === info.expectedStatus) return;
  await mkdir(evidence, { recursive: true });
  const observations = await Promise.all(
    diagnosticsPages.map(async (p) => {
      if (p.isClosed()) return { closed: true };
      return {
        snapshot: await snapshot(p),
        presentation: await view(p).catch((e) => ({ error: String(e) })),
      };
    }),
  );
  await writeFile(
    evidence + '/failure-' + Date.now() + '.json',
    JSON.stringify({ test: info.title, observations }, null, 2),
  );
});
const hero = async (p: Page) => {
  return p.evaluate<any>(
    '(()=>{const s=window.__VOLAM__.snapshot();return s.state.players[s.sessionId]})()',
  );
};
async function fixture(p: Page, data: Record<string, unknown>) {
  const s = await snapshot(p),
    r = await fetch(
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
}
async function key(p: Page, k: string, ms = 30) {
  await p.bringToFront();
  await p.locator('#game canvas').focus();
  await p.keyboard.press(k, { delay: ms });
}
async function reset(p: Page, fx = 1, fy = 0, x = 1000, y = 700) {
  await fixture(p, { action: 'restore' });
  await fixture(p, { action: 'position', x, y, fx, fy });
  await expect
    .poll(async () => Math.abs((await hero(p)).x - x))
    .toBeLessThan(1);
  await p.waitForTimeout(100);
}
const monitor = (p: Page, errors: string[]) => {
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
};
async function build(p: Page, basic: string, ids: string[]) {
  await fixture(p, { action: 'build', basic, ids });
  await p.waitForTimeout(150);
}
async function attack(p: Page) {
  const s = await snapshot(p),
    before = Math.max(0, ...s.events.map((e: any) => e.id));
  await key(p, 'a');
  await expect
    .poll(
      async () =>
        (await snapshot(p)).events.some(
          (e: any) =>
            e.id > before && e.sourceId === s.sessionId && e.kind === 'attack',
        ),
      { timeout: 10000 },
    )
    .toBe(true);
  await expect
    .poll(async () => (await hero(p)).basicCooldown, { timeout: 10000 })
    .toBe(0);
}

test('selected r2 clips: two real clients observe all ordered frames, two loop cycles and feet pivots at zoom1', async ({
  page,
  browser,
}) => {
  const context = await browser.newContext(),
    peer = await context.newPage(),
    errors: string[] = [];
  monitor(page, errors);
  monitor(peer, errors);
  await joinWaiting(page, 'Frame1', undefined, '/?debug=1&feedbackArtReview=1');
  await joinWaiting(
    peer,
    'Frame2',
    (await snapshot(page)).roomId,
    '/?debug=1&feedbackArtReview=1',
  );
  await startTogether([page, peer], ['vo_dang', 'thieu_lam']);
  const data = JSON.parse(
    await readFile(
      'apps/game-client/src/m3d-feedback-art.generated.json',
      'utf8',
    ),
  );
  const clips = data.assets
    .filter((a: any) => a.id.startsWith('m3d_'))
    .flatMap((a: any) =>
      a.animations.map((t: any) => ({
        asset: a.id,
        canvas: a.frameDimensions,
        ...t,
      })),
    );
  const start = Date.now();
  for (let i = 0; i < clips.length; i += 12) {
    const group = clips.slice(i, i + 12),
      expected = group.flatMap((c: any) =>
        c.frames.map((f: string) => c.asset + ':' + f),
      );
    for (const p of [page, peer]) {
      const h = await hero(p);
      const result = await p.evaluate(
        ({ group, x, y }) =>
          group.map((c: any, i: number) =>
            (window as any).__VOLAM__.reviewFeedback(
              c.asset,
              c.name,
              x - 120 + (i % 4) * 80,
              y - 120 + Math.floor(i / 4) * 80,
            ),
          ),
        { group, x: h.x, y: h.y },
      );
      result.forEach((r: any, j: number) => {
        expect(r.origin).toEqual(group[j].origin);
        expect(r.scale).toBe(1);
        expect(r.canvas).toEqual(group[j].canvas);
      });
    }
    for (const p of [page, peer])
      await expect
        .poll(
          async () => {
            const s = await m3d(p),
              seen = new Set(s.observed);
            return (
              expected.every((f: string) => seen.has(f)) &&
              group.every((c: any) => s.completed[c.asset + ':' + c.name] > 0)
            );
          },
          { timeout: 8000 },
        )
        .toBe(true);
  }
  await mkdir(evidence, { recursive: true });
  for (const p of [page, peer]) {
    expect((await view(p)).zoom).toBe(1);
    expect((await view(p)).rotation).toBe(0);
  }
  await writeFile(
    evidence + '/frame-observations.json',
    JSON.stringify(
      {
        scope:
          'two-client presentation fixtures; no gameplay mutation; source loops observed twice',
        clips: clips.length,
        frames: clips.reduce((n: number, c: any) => n + c.frames.length, 0),
        elapsedMs: Date.now() - start,
        errors,
        observation: await m3d(page),
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
  await context.close();
});

test('six clients: all feedback actions in four facings, real pulses, stationary sword hold/blink, owner burn and lifecycle cleanup', async ({
  page,
  browser,
}) => {
  const contexts = [],
    pages = [page],
    errors: string[] = [];
  monitor(page, errors);
  await joinWaiting(page, 'Tích hợp1');
  const room = (await snapshot(page)).roomId;
  for (let i = 1; i < 6; i++) {
    const c = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    contexts.push(c);
    const p = await c.newPage();
    pages.push(p);
    monitor(p, errors);
    await joinWaiting(p, 'Tích hợp' + (i + 1), room);
  }
  diagnosticsPages = pages;
  await startTogether(pages, [
    'thieu_lam',
    'thieu_lam',
    'vo_dang',
    'vo_dang',
    'thien_son',
    'cai_bang',
  ]);
  const [monk, dao, fist, sword, wind, beggar] = pages as [
    Page,
    Page,
    Page,
    Page,
    Page,
    Page,
  ];
  diagnosticsPages = pages;
  await build(monk, 'thieu_lam_quyen', [
    'la_han_quyen',
    'vi_da_quyen',
    'nhu_lai_niet_ban',
    'toan_phong_thoai',
  ]);
  await build(dao, 'thieu_lam_dao', [
    'tam_gioi_quy_thien',
    'tru_ta',
    'kim_quang_ho_tran',
    'bat_dong_minh_vuong',
  ]);
  await build(fist, 'vo_dang_quyen', [
    'luong_nghi_thu',
    'huyen_am_chuong',
    'duong_khi_kich',
    'thai_cuc_than_cong',
  ]);
  await build(sword, 'vo_dang_kiem', [
    'nhan_kiem_hop_nhat',
    'that_tinh_kiem',
    'van_kiem_quy_tong',
    'toa_sat_bac_do',
  ]);
  await build(wind, 'thien_son_dao', [
    'liet_phong_dao',
    'bach_liet_thien_kich',
    'luu_phong_bo',
    'chiet_mai_thu',
  ]);
  await build(beggar, 'cai_bang_bong', [
    'khang_long_huu_hoi',
    'pha_giap_bong',
    'hoa_van_chuong',
    'phi_long_tai_thien',
  ]);
  await mkdir(evidence, { recursive: true });
  const directionEvidence = [];
  for (const [d, fx, fy] of [
    ['right', 1, 0],
    ['down', 0, 1],
    ['left', -1, 0],
    ['up', 0, -1],
  ] as const) {
    for (const [i, p] of pages.entries())
      await reset(p, fx, fy, 900 + i * 50, 900);
    await fixture(page, {
      action: 'targets',
      points: [{ x: 1000 + fx * 70, y: 700 + fy * 70 }],
    });
    for (const p of [monk, fist]) {
      await reset(p, fx, fy);
      for (let i = 0; i < (p === monk ? 4 : 2); i++) {
        await attack(p);
      }
      await fixture(p, {
        action: 'position',
        x: 900 + pages.indexOf(p) * 50,
        y: 900,
      });
    }
    for (const p of [dao, sword, wind]) {
      await reset(p, fx, fy);
      await attack(p);
      await fixture(p, {
        action: 'position',
        x: 900 + pages.indexOf(p) * 50,
        y: 900,
      });
    }
    for (const [p, keys] of [
      [monk, ['q', 'w', 'e']],
      [dao, ['q']],
      [wind, ['q', 'w']],
      [beggar, ['q', 'w']],
    ] as [Page, string[]][]) {
      for (const k of keys) {
        await reset(p, fx, fy);
        if (p === wind && k === 'w')
          await fixture(p, {
            action: 'targets',
            points: [{ x: 1000 + fx * 70, y: 700 + fy * 70 }],
          });
        const eventBefore = Math.max(
          0,
          ...(await snapshot(p)).events.map((e: any) => e.id),
        );
        const actorId = (await snapshot(p)).sessionId;
        await key(p, k);
        if (
          (p === monk && k === 'e') ||
          (p === wind && k === 'q') ||
          (p === dao && k === 'q') ||
          (p === beggar && k === 'w')
        )
          await expect
            .poll(
              async () =>
                (await snapshot(p)).events.some(
                  (e: any) =>
                    e.id > eventBefore &&
                    e.sourceId === actorId &&
                    e.kind === 'pulse' &&
                    e.stage === 'strike',
                ),
              { timeout: 10000, intervals: [20, 30, 50] },
            )
            .toBe(true);
        if (
          d === 'right' &&
          ((p === monk && k === 'e') || (p === wind && k === 'q'))
        ) {
          if (p === monk) await p.waitForTimeout(900);
          else
            await expect
              .poll(
                async () =>
                  (await m3d(p)).clips.some(
                    (c: any) =>
                      c.texture === 'm3d_liet_phong_ground_vfx_r2' && c.visible,
                  ),
                { timeout: 10000, intervals: [30, 50, 80] },
              )
              .toBe(true);
          await p.screenshot({
            path:
              evidence + (p === monk ? '/multi-palm.png' : '/blade-ground.png'),
          });
        }
        await p.waitForTimeout(k === 'e' ? 1850 : 1550);
        if (p === wind && k === 'w')
          await expect
            .poll(
              async () =>
                (await snapshot(p)).events.filter(
                  (e: any) =>
                    e.id > eventBefore &&
                    e.kind === 'hit' &&
                    e.abilityId === 'bach_liet_thien_kich',
                ).length,
              { timeout: 10000 },
            )
            .toBe(11);
      }
      await fixture(p, {
        action: 'position',
        x: 900 + pages.indexOf(p) * 50,
        y: 900,
      });
    }
    await reset(sword, fx, fy);
    await fixture(sword, { action: 'targets', points: [] });
    await key(sword, 'q');
    await expect
      .poll(
        async () =>
          Object.values((await snapshot(sword)).state.projectiles).some(
            (p: any) => p.abilityId === 'nhan_kiem_hop_nhat',
          ),
        { timeout: 10000 },
      )
      .toBe(true);
    await expect
      .poll(async () => (await hero(sword)).pose, { timeout: 10000 })
      .not.toBe('cast');
    const blinkBefore = Math.max(
      0,
      ...(await snapshot(sword)).events.map((e: any) => e.id),
    );
    await key(sword, 'q');
    await expect
      .poll(
        async () =>
          (await snapshot(sword)).events.some(
            (e: any) => e.id > blinkBefore && e.stage === 'blink_arrive',
          ),
        { timeout: 10000 },
      )
      .toBe(true);
    const sid = (await snapshot(sword)).sessionId;
    await expect
      .poll(async () =>
        Math.hypot(
          (await snapshot(monk)).state.players[sid].x - (await hero(sword)).x,
          (await snapshot(monk)).state.players[sid].y - (await hero(sword)).y,
        ),
      )
      .toBeLessThan(2);
    await reset(fist, fx, fy);
    await key(fist, 'Shift');
    await expect
      .poll(
        async () =>
          (await m3d(monk)).observed.some((f: string) =>
            f.startsWith('m3d_dash_vfx:dash_' + d + '_'),
          ),
        { timeout: 10000 },
      )
      .toBe(true);
    const seen = (await m3d(monk)).observed as string[];
    for (const prefix of [
      'left_fist',
      'right_fist',
      'front_kick',
      'roundhouse_kick',
    ])
      expect(
        seen.some((f) =>
          f.startsWith(
            'm3d_thieu_lam_quyen_character:' + prefix + '_' + d + '_',
          ),
        ),
      ).toBe(true);
    expect(seen.some((f) => f.startsWith('m3d_dash_vfx:dash_' + d + '_'))).toBe(
      true,
    );
    expect(
      seen.some((f) =>
        f.startsWith('m3d_liet_phong_ground_vfx_r2:ground_break_' + d + '_'),
      ),
    ).toBe(true);
    // The current pulse contract intentionally remains ten hits + finisher, irrespective of preview wave count.
    directionEvidence.push({
      direction: d,
      observations: await Promise.all(pages.map(m3d)),
    });
  }
  // One accepted A, including repeated keydown; no client animation can submit the next hit.
  await reset(fist);
  const id = (await snapshot(fist)).sessionId,
    before = Math.max(
      0,
      ...(await snapshot(fist)).events.map((e: any) => e.id),
    );
  await fist.bringToFront();
  await fist.locator('#game canvas').focus();
  await fist.keyboard.down('a');
  await fist.waitForTimeout(750);
  await fist.keyboard.down('a');
  await fist.waitForTimeout(200);
  await fist.keyboard.up('a');
  expect(
    (await snapshot(fist)).events.filter(
      (e: any) => e.id > before && e.sourceId === id && e.kind === 'attack',
    ).length,
  ).toBe(1);
  // Both clients render the same authoritative sword stage and endpoint. No preview teleport clock is used.
  await reset(sword);
  await fixture(sword, { action: 'targets', points: [] });
  await key(sword, 'q');
  await expect
    .poll(
      async () =>
        Object.values((await snapshot(sword)).state.projectiles).some(
          (p: any) => p.stage === 'sword_linger',
        ),
      { timeout: 30000 },
    )
    .toBe(true);
  const shot: any = Object.values(
    (await snapshot(sword)).state.projectiles,
  ).find((p: any) => p.stage === 'sword_linger');
  const hold = () =>
    sword.evaluate<any>(
      "window.__VOLAM__.presentation().skills.m3d.clips.find(c=>c.texture==='m3d_nhan_kiem_hop_nhat_vfx'&&c.tag==='hold_right')",
    );
  await expect.poll(async () => !!(await hold())).toBe(true);
  const held = await hold();
  await sword.waitForTimeout(250);
  expect((await hold()).frame).toBe(held.frame);
  expect((await hold()).x).toBe(held.x);
  expect(held.x).toBe(Math.round(shot.x));
  await sword.keyboard.press('q');
  await expect
    .poll(async () => Math.abs((await hero(sword)).x - shot.x))
    .toBeLessThan(1);
  await expect
    .poll(async () =>
      Math.abs(
        (await snapshot(monk)).state.players[(await snapshot(sword)).sessionId]
          .x - shot.x,
      ),
    )
    .toBeLessThan(1);
  await sword.screenshot({ path: evidence + '/sword-blink.png' });
  // Follow and ground depth come from the owner, including peers watching that owner.
  await reset(beggar);
  await key(beggar, 'q');
  await key(beggar, 'ArrowRight', 400);
  const owner = (await snapshot(beggar)).sessionId;
  for (const p of [beggar, monk]) {
    await p.bringToFront();
    await expect
      .poll(async () => {
        const c = (await m3d(p)).clips.find(
          (c: any) =>
            c.owner === owner && c.texture === 'm3d_khang_long_burn_vfx',
        );
        const h = (await snapshot(p)).state.players[owner];
        return (
          !!c &&
          Math.abs(c.x - h.x) < 3 &&
          Math.abs(c.y - h.y) < 3 &&
          c.depth < h.y
        );
      })
      .toBe(true);
  }
  for (const [i, p] of pages.entries())
    await fixture(p, {
      action: 'position',
      x: 860 + (i % 3) * 90,
      y: 680 + Math.floor(i / 3) * 80,
      fx: 1,
      fy: 0,
    });
  await beggar.bringToFront();
  await expect
    .poll(
      async () => {
        const s = await snapshot(beggar),
          v = await view(beggar);
        return (
          pages.length ===
          v.actors.filter(
            (a: any) =>
              s.state.players[a.id] &&
              Math.hypot(
                a.x - s.state.players[a.id].x,
                a.y - s.state.players[a.id].y,
              ) < 2,
          ).length
        );
      },
      { timeout: 10000 },
    )
    .toBe(true);
  await beggar.screenshot({ path: evidence + '/six-player-scale.png' });
  // Real dungeon populations, AI, damage, deaths and gold; only actor arrangement is a named QA fixture.
  const goldBefore = await Promise.all(
    pages.map(async (p) => (await hero(p)).gold),
  );
  for (const p of pages) {
    await p.bringToFront();
    await p.getByRole('button', { name: 'Phó Bản', exact: true }).click();
    await p.locator('[data-access=shared]').click();
    await p.locator('#enter-dungeon').click();
    await expect.poll(async () => (await hero(p)).zoneId).toBe('forest_shared');
  }
  for (let round = 0; round < 5; round++)
    for (const p of pages) {
      const s = await snapshot(p),
        h = s.state.players[s.sessionId];
      const c: any = Object.values(s.state.creeps).find(
        (c: any) => c.hp > 0 && c.zoneId === h.zoneId,
      );
      if (c) {
        await fixture(p, {
          action: 'position',
          x: c.x - 45,
          y: c.y,
          fx: 1,
          fy: 0,
        });
        await key(p, 'a');
      }
    }
  await expect
    .poll(async () =>
      (await Promise.all(pages.map(async (p) => (await hero(p)).gold))).reduce(
        (a, b) => a + b,
        0,
      ),
    )
    .toBeGreaterThan(goldBefore.reduce((a, b) => a + b, 0));
  await monk.bringToFront();
  await monk.screenshot({ path: evidence + '/six-player-combat.png' });
  const natural = await Promise.all(pages.map(snapshot));
  for (const p of pages) {
    await p.bringToFront();
    await expect
      .poll(async () =>
        (await view(p)).interactions.some((i: any) => i.id === 'dungeon-exit'),
      )
      .toBe(true);
    const exit = (await view(p)).interactions.find(
      (i: any) => i.id === 'dungeon-exit',
    );
    expect(exit).toBeDefined();
    await fixture(p, { action: 'position', x: exit.x, y: exit.y });
    await key(p, 'Space');
    await expect.poll(async () => (await hero(p)).zoneId).toBe('arena');
  }
  // Server stun cancels a windup, death removes owned effects, and zone transfer cleans both local and observer renderers.
  await reset(wind);
  await key(wind, 'q');
  await fixture(wind, { action: 'stun' });
  await wind.waitForTimeout(250);
  const windId = (await snapshot(wind)).sessionId;
  expect(
    (await m3d(wind)).clips.filter(
      (c: any) => c.owner === windId && c.skill === 'liet_phong_dao',
    ),
  ).toHaveLength(0);
  await reset(monk);
  const monkId = (await snapshot(monk)).sessionId;
  const beforeCancel = Math.max(
    0,
    ...(await snapshot(monk)).events.map((e: any) => e.id),
  );
  await key(monk, 'e');
  await expect
    .poll(
      async () =>
        (await snapshot(monk)).events.some(
          (e: any) =>
            e.id > beforeCancel &&
            e.sourceId === monkId &&
            e.kind === 'cast' &&
            e.abilityId === 'nhu_lai_niet_ban',
        ),
      { timeout: 10000 },
    )
    .toBe(true);
  await fixture(monk, { action: 'stun' });
  await monk.waitForTimeout(1000);
  expect(
    (await m3d(monk)).clips.filter(
      (c: any) => c.owner === monkId && c.skill === 'nhu_lai_niet_ban',
    ),
  ).toHaveLength(0);
  await reset(beggar);
  await key(beggar, 'q');
  await monk.bringToFront();
  await expect
    .poll(async () =>
      (await m3d(monk)).clips.some(
        (c: any) =>
          c.owner === owner && c.texture === 'm3d_khang_long_burn_vfx',
      ),
    )
    .toBe(true);
  await fixture(beggar, { action: 'kill' });
  await expect
    .poll(
      async () =>
        (await m3d(monk)).clips.filter((c: any) => c.owner === owner).length,
    )
    .toBe(0);
  await reset(sword);
  await key(sword, 'q');
  await sword.getByRole('button', { name: 'Phó Bản', exact: true }).click();
  await sword.locator('#enter-dungeon').click();
  await expect.poll(async () => (await hero(sword)).zoneId).not.toBe('arena');
  const swordId = (await snapshot(sword)).sessionId;
  await monk.bringToFront();
  await expect
    .poll(
      async () =>
        (await m3d(monk)).clips.filter((c: any) => c.owner === swordId).length,
    )
    .toBe(0);
  const finalViews = [];
  for (const p of pages) {
    await p.bringToFront();
    finalViews.push(await view(p));
  }
  const finalSnapshots = await Promise.all(pages.map(snapshot));
  await reset(wind);
  await key(wind, 'q');
  await monk.bringToFront();
  await expect
    .poll(async () =>
      (await m3d(monk)).clips.some(
        (c: any) => c.owner === windId && c.skill === 'liet_phong_dao',
      ),
    )
    .toBe(true);
  await contexts[3]!.close();
  await expect
    .poll(
      async () =>
        (await m3d(monk)).clips.filter((c: any) => c.owner === windId).length,
    )
    .toBe(0);
  await writeFile(
    evidence + '/multiplayer-observations.json',
    JSON.stringify(
      {
        scope:
          'six real clients, explicit legal-build/position/immortal-target fixtures; accepted keyboard inputs, authoritative pulse/hold/blink/lifecycle checks',
        errors,
        natural,
        directionEvidence,
        disconnectCleanup: true,
        final: finalViews,
        snapshots: finalSnapshots,
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
  for (const [i, c] of contexts.entries()) if (i !== 3) await c.close();
});
