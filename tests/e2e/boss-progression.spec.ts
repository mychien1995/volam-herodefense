import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { joinWaiting, startTogether } from './pregame-helper.js';
import { observeQa, pressQaAndWait } from '../../tools/qa-browser.mjs';
const snap = (p: Page): Promise<any> =>
  p.evaluate(() => (window as any).__VOLAM__.snapshot());
async function create(p: Page, easy = false, arenaId = 'dao_hoa_dao') {
  await p.goto('/?debug=1');
  await p.locator('[data-action=play]').click();
  await p.locator('#pre-nickname').fill('M4D thử boss');
  await p.getByRole('button', { name: 'Vào game', exact: true }).click();
  await p.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
  await expect(
    p.getByRole('combobox', { name: 'Độ khó', exact: true }),
  ).toHaveValue('hard');
  if (easy)
    await p
      .getByRole('combobox', { name: 'Độ khó', exact: true })
      .selectOption('easy');
  await p.locator('#pre-arena').selectOption(arenaId);
  await p.locator('[data-action=confirm-create]').click();
  await expect(p.locator('#pregame .pre-title')).toHaveText('Phòng chờ');
}
async function prerequisite(p: Page, op: string, ability?: string) {
  const s = await snap(p);
  const response = await p.request.post(
    '/__difficulty?' +
      new URLSearchParams({
        room: s.roomId,
        id: s.sessionId,
        op,
        ...(ability ? { ability } : {}),
      }),
  );
  expect(response.ok(), await response.text()).toBe(true);
  return response.json();
}
test('easy room syncs to two peers and renders the real rectangle warning; Ngọc Tiêu holds position', async ({
  page,
  browser,
}) => {
  const peer = await browser.newContext(),
    b = await peer.newPage(),
    errors: string[] = [];
  for (const p of [page, b]) p.on('pageerror', (e) => errors.push(e.message));
  try {
    await create(page, true);
    const room = (await snap(page)).roomId;
    await joinWaiting(b, 'M4D đồng đội', room);
    for (const p of [page, b]) {
      expect((await snap(p)).state.defense.difficulty).toBe('easy');
      await expect(p.locator('.pre-room')).toContainText('Dễ');
    }
    await startTogether([page, b], ['cai_bang_bong', 'cai_bang_bong']);
    for (const p of [page, b]) {
      const s = await snap(p),
        h = s.state.players[s.sessionId];
      expect(h.level).toBe(6);
      expect(h.xp).toBe(670);
      expect(h.inventory.levels).toEqual({
        weapon: 2,
        armor: 2,
        hat: 2,
        boots: 2,
      });
      expect(h.inventory.potions).toMatchObject({ hp_small: 10, mp_small: 10 });
    }
    await observeQa(
      page,
      () => {
        const s = (window as any).__VOLAM__.snapshot();
        return (
          JSON.parse(s.state.defense.dongTa || 'null')?.phase === 'fighting' &&
          Object.values(s.state.creeps).some(
            (c: any) => c.archetypeId === 'dong_ta' && c.maxHp === 39060,
          )
        );
      },
      undefined,
      { timeout: 45000 },
    );
    expect(
      await page.evaluate(
        () => (window as any).__VOLAM__.presentation().m4dArena.ground,
      ),
    ).toBe('m4d-ground-dao_hoa_dao');
    const initial = await prerequisite(page, 'aim');
    await pressQaAndWait(
      page,
      'a',
      (hp) => {
        const s = (window as any).__VOLAM__.snapshot();
        return Object.values(s.state.creeps).some(
          (c: any) => c.archetypeId === 'dong_ta' && c.hp < hp,
        );
      },
      initial.bossHp,
    );
    // Capture one matching GPU frame through the existing read-only evidence hook.
    await page.evaluate(() => {
      const api = (window as any).__VOLAM__,
        deadline = performance.now() + 5000;
      (window as any).__difficultyWarning = new Promise((resolve, reject) => {
        const inspect = () => {
          const p = api.presentation().dong;
          const c = p?.view?.casts.find(
            (c: any) => c.abilityId === 'lac_anh_normal',
          );
          if (p?.dashTelegraphVisible && c?.telegraphHalfWidth) {
            resolve({
              ...c,
              png: (
                document.querySelector('#game canvas') as HTMLCanvasElement
              ).toDataURL('image/png'),
            });
          } else if (performance.now() > deadline)
            reject(Error('No rendered warning frame'));
          else api.afterRender(inspect);
        };
        api.afterRender(inspect);
      });
    });
    await prerequisite(page, 'cast', 'lac_anh_normal');
    const warning = await page.evaluate(
      () => (window as any).__difficultyWarning,
    );
    expect(warning.path).toHaveLength(6);
    expect(warning.activeAt - warning.startedAt).toBe(30);
    await mkdir('artifacts/boss-difficulty', { recursive: true });
    await writeFile(
      'artifacts/boss-difficulty/easy-rectangle.png',
      Buffer.from(warning.png.split(',')[1], 'base64'),
    );
    await observeQa(
      b,
      () =>
        (window as any).__VOLAM__
          .presentation()
          .dong?.view?.casts.some(
            (c: any) =>
              c.abilityId === 'lac_anh_normal' && c.telegraphHalfWidth,
          ),
      undefined,
    );
    const origin = await prerequisite(page, 'cast', 'ngoc_tieu_hoi_phong');
    await observeQa(
      page,
      () => {
        const s = (window as any).__VOLAM__.snapshot(),
          v = JSON.parse(s.state.defense.dongTa || 'null');
        return v?.casts.find(
          (c: any) => c.abilityId === 'ngoc_tieu_hoi_phong' && c.released,
        );
      },
      undefined,
    );
    await observeQa(
      page,
      ({ tick, x, y }) => {
        const s = (window as any).__VOLAM__.snapshot();
        const b = Object.values(s.state.creeps).find(
          (c: any) => c.archetypeId === 'dong_ta',
        ) as any;
        if (Math.hypot(b.x - x, b.y - y) > 0.01)
          throw Error(
            'Boss moved during Ngọc Tiêu: ' +
              JSON.stringify({
                expected: { x, y },
                actual: { x: b.x, y: b.y },
                tick: s.state.tick,
              }),
          );
        return s.state.tick >= tick + 100;
      },
      origin,
      { timeout: 15000 },
    );
    expect(errors).toEqual([]);
  } finally {
    await peer.close();
  }
});
test('new rooms default to hard and keep that selection in the lobby', async ({
  page,
}) => {
  await create(page);
  expect((await snap(page)).state.defense.difficulty).toBe('hard');
  await expect(page.locator('.pre-room')).toContainText('Khó');
});

test('boss skill names replace dialogue and both text kinds render at camera-aware resolution', async ({
  page,
  browser,
}) => {
  const peer = await browser.newContext(),
    b = await peer.newPage();
  try {
    await create(page, true);
    await joinWaiting(b, 'M4D chữ boss', (await snap(page)).roomId);
    await startTogether([page, b], ['cai_bang_bong', 'cai_bang_bong']);
    await observeQa(
      page,
      () => {
        const s = (window as any).__VOLAM__.snapshot();
        return (
          JSON.parse(s.state.defense.dongTa || 'null')?.phase === 'fighting'
        );
      },
      undefined,
      { timeout: 45000 },
    );
    const initial = await prerequisite(page, 'aim');
    await prerequisite(b, 'aim');
    await pressQaAndWait(
      page,
      'a',
      (hp) =>
        Object.values((window as any).__VOLAM__.snapshot().state.creeps).some(
          (c: any) => c.archetypeId === 'dong_ta' && c.hp < hp,
        ),
      initial.bossHp,
    );
    await prerequisite(page, 'banter');
    for (const p of [page, b]) {
      const chat = await observeQa(
        p,
        () =>
          (window as any).__VOLAM__
            .presentation()
            .bossShouts.active.find(
              (l: any) => l.sourceId === 'dong_ta' && l.banter && l.visible,
            ),
        undefined,
      );
      expect(chat.resolution).toBeGreaterThanOrEqual(2);
      expect(chat.fontSize).toBe('14px');
    }
    await page.evaluate(() => {
      const api = (window as any).__VOLAM__,
        deadline = performance.now() + 5000;
      (window as any).__bossSpeechPng = new Promise((resolve, reject) => {
        const capture = () => {
          const labels = api
            .presentation()
            .bossShouts.active.filter((l: any) => l.sourceId === 'dong_ta');
          if (labels.some((l: any) => !l.banter && l.visible))
            resolve({
              labels,
              png: (
                document.querySelector('#game canvas') as HTMLCanvasElement
              ).toDataURL('image/png'),
            });
          else if (performance.now() > deadline)
            reject(Error('No rendered skill name'));
          else api.afterRender(capture);
        };
        api.afterRender(capture);
      });
    });
    await prerequisite(page, 'cast', 'ngoc_tieu_hoi_phong');
    for (const p of [page, b]) {
      const labels = await observeQa(
        p,
        () => {
          const labels = (window as any).__VOLAM__
            .presentation()
            .bossShouts.active.filter((l: any) => l.sourceId === 'dong_ta');
          return labels.some((l: any) => !l.banter && l.visible)
            ? labels
            : false;
        },
        undefined,
      );
      expect(labels.some((l: any) => l.banter)).toBe(false);
      expect(labels[0].resolution).toBeGreaterThanOrEqual(2);
    }
    const captured = await page.evaluate(() => (window as any).__bossSpeechPng);
    expect(captured.labels.some((l: any) => l.banter)).toBe(false);
    await mkdir('artifacts/boss-difficulty', { recursive: true });
    await writeFile(
      'artifacts/boss-difficulty/boss-speech.png',
      Buffer.from(captured.png.split(',')[1], 'base64'),
    );
  } finally {
    await peer.close();
  }
});

test('solo host skips out of a real wipe ballot through every next preset to Vương Trùng Dương', async ({
  page,
}) => {
  test.setTimeout(160000);
  await create(page, true);
  await startTogether([page], ['cai_bang_bong']);
  await expect(page.locator('#boss-test-skip')).toHaveText('Bỏ qua → Tây Độc');
  await observeQa(
    page,
    () =>
      JSON.parse(
        (window as any).__VOLAM__.snapshot().state.defense.dongTa || 'null',
      )?.phase === 'fighting',
    undefined,
    { timeout: 45000 },
  );
  const initial = await prerequisite(page, 'aim');
  await pressQaAndWait(
    page,
    'a',
    (hp) =>
      Object.values((window as any).__VOLAM__.snapshot().state.creeps).some(
        (c: any) => c.archetypeId === 'dong_ta' && c.hp < hp,
      ),
    initial.bossHp,
  );
  // Four lives are consumed by actual boss hits; an arm request is a no-op if
  // another natural hit already killed the actor before the fixture received it.
  for (;;) {
    const armed = await prerequisite(page, 'arm');
    if (armed.vote) break;
    const death = await observeQa(
      page,
      (tick) => {
        const s = (window as any).__VOLAM__.snapshot(),
          h = s.state.players[s.sessionId];
        const retry = JSON.parse(h.inventory.campaign).retry;
        return s.state.tick >= tick && (h.hp <= 0 || retry?.phase === 'vote')
          ? { vote: retry?.phase === 'vote' }
          : false;
      },
      armed.tick,
      { timeout: 20000 },
    );
    if (death.vote) break;
    const recovery = await observeQa(
      page,
      () => {
        const s = (window as any).__VOLAM__.snapshot(),
          h = s.state.players[s.sessionId];
        const retry = JSON.parse(h.inventory.campaign).retry;
        return retry?.phase === 'vote'
          ? { vote: true }
          : h.hp > 0
            ? { vote: false }
            : false;
      },
      undefined,
      { timeout: 15000 },
    );
    if (recovery.vote) break;
  }
  await expect(page.locator('#boss-retry-dialog')).toBeVisible();
  await expect(page.locator('[data-retry-skip]')).toBeVisible();
  await mkdir('artifacts/boss-difficulty', { recursive: true });
  await page.screenshot({ path: 'artifacts/boss-difficulty/skip-ballot.png' });
  await page.locator('[data-retry-skip]').click();
  const stages = [
    ['tay_doc', 12, 1],
    ['nam_de', 18, 2],
    ['bac_cai', 24, 3],
    ['vuong_trung_duong', 27, 4],
  ] as const;
  for (const [stage, level, crafted] of stages) {
    const state = await observeQa(
      page,
      ({ stage, level }) => {
        const s = (window as any).__VOLAM__.snapshot();
        return s.state.defense.devWaveBossStage === stage &&
          s.state.players[s.sessionId].level === level
          ? s
          : false;
      },
      { stage, level },
    );
    const h = state.state.players[state.sessionId];
    expect(Object.values(h.inventory.crafted).filter(Boolean)).toHaveLength(
      crafted,
    );
    expect(h.hp).toBe(h.maxHp);
    await expect(page.locator('#boss-retry-dialog')).toBeHidden();
    if (stage !== 'vuong_trung_duong')
      await page.locator('#boss-test-skip').click();
  }
  await observeQa(
    page,
    () => {
      const s = (window as any).__VOLAM__.snapshot();
      const boss = JSON.parse(s.state.vuong?.arena?.snapshot || 'null');
      return boss?.state === 'fighting' && boss.hp > 0;
    },
    undefined,
    { timeout: 45000 },
  );
});

async function fixPrereq(
  p: Page,
  op: string,
  ability?: string,
  actorId?: string,
) {
  const s = await snap(p);
  const r = await p.request.post(
    '/__m4d-fixes?' +
      new URLSearchParams({
        room: s.roomId,
        id: actorId ?? s.sessionId,
        op,
        ...(ability ? { ability } : {}),
      }),
  );
  expect(r.ok(), await r.text()).toBe(true);
  return r.json();
}
async function skipToBac(p: Page) {
  for (const stage of ['tay_doc', 'nam_de', 'bac_cai']) {
    await p.locator('#boss-test-skip').click();
    await observeQa(
      p,
      (stage) =>
        (window as any).__VOLAM__.snapshot().state.defense.devWaveBossStage ===
        stage,
      stage,
    );
  }
  await observeQa(
    p,
    () => {
      const s = (window as any).__VOLAM__.snapshot();
      return (
        JSON.parse(s.state.bacCai?.arena?.snapshot || 'null')?.phase ===
        'combat'
      );
    },
    undefined,
    { timeout: 45000 },
  );
}
async function provoke(p: Page) {
  const before = await fixPrereq(p, 'aim');
  await pressQaAndWait(
    p,
    'a',
    (hp) => {
      const s = (window as any).__VOLAM__.snapshot();
      const b = JSON.parse(
        s.state.vuong?.arena?.snapshot ||
          s.state.bacCai?.arena?.snapshot ||
          'null',
      );
      return b?.hp < hp;
    },
    before.bossHp,
  );
}
async function captureFixFrame(p: Page, kind: string) {
  await p.evaluate((kind) => {
    const api = (window as any).__VOLAM__,
      deadline = performance.now() + 10000,
      seen: any[] = [];
    (window as any).__fixFrame = new Promise((resolve, reject) => {
      const inspect = () => {
        const view = api.presentation(),
          s = api.snapshot();
        const bac = JSON.parse(s.state.bacCai?.arena?.snapshot || 'null');
        const ps = Object.values(s.state.projectiles)
          .filter((p: any) => p.abilityId === 'hang_long_hoa_vu')
          .map((p: any) => ({
            stage: p.stage,
            elevation: p.elevation,
            start: p.stageStartedAt,
            duration: p.stageTicks,
          }));
        if (ps.length && seen.length < 40)
          seen.push({ ps, frames: view.hangLongFrames });
        const matched =
          kind === 'rise'
            ? view.hangLongFrames?.some(
                (f: any) =>
                  f.name === 'hang-long:dragon_rise' && f.elevation > 35,
              )
            : bac?.effects?.some(
                (e: any) =>
                  e.kind === kind &&
                  (kind !== 'spiral' || s.state.tick - e.start > 45),
              );
        if (matched)
          resolve({
            view,
            state: s.state,
            png: (
              document.querySelector('#game canvas') as HTMLCanvasElement
            ).toDataURL('image/png'),
          });
        else if (performance.now() > deadline)
          reject(
            Error('No rendered ' + kind + ' frame ' + JSON.stringify(seen)),
          );
        else api.afterRender(inspect);
      };
      api.afterRender(inspect);
    });
  }, kind);
}
for (const [map, y] of [
  ['dao_hoa_dao', 535],
  ['tuong_duong', 500],
  ['tu_hien_trang', 535],
] as const)
  test('M4D arena fixes ' + map, async ({ page, browser }) => {
    test.setTimeout(180000);
    const evidence: any[] = [];
    await mkdir('artifacts/m4d-boss-fixes', { recursive: true });
    {
      const ctx = await browser.newContext(),
        peer = await ctx.newPage();
      const errors: string[] = [];
      for (const p of [page, peer])
        p.on('pageerror', (e) => errors.push(e.message));
      try {
        await create(page, true, map);
        await joinWaiting(peer, 'M4D đồng đội', (await snap(page)).roomId);
        await startTogether([page, peer], ['cai_bang_chuong', 'vo_dang_kiem']);
        for (const p of [page, peer]) {
          const v = await p.evaluate(() =>
            (window as any).__VOLAM__.presentation(),
          );
          expect(v.m4dArena.cluster[0]).toMatchObject({
            x: 800,
            y,
            visible: true,
          });
          expect(
            v.readableWorldLabels.find(
              (t: any) => t.name === 'statue-introduction',
            ),
          ).toMatchObject({ resolution: expect.any(Number), fontSize: '14px' });
        }
        await skipToBac(page);
        for (const p of [page, peer]) {
          const v = await p.evaluate(() =>
            (window as any).__VOLAM__.presentation(),
          );
          expect(v.m4dArena.cluster.every((o: any) => !o.visible)).toBe(true);
          const s = await snap(p);
          expect(JSON.parse(s.state.defense.waveArena).bounds).toMatchObject({
            x: 800,
            y,
          });
        }
        if (map === 'tuong_duong') {
          await provoke(page);
          // Observe the ascending caster dragon from a real accepted ultimate input.
          await captureFixFrame(page, 'rise');
          await pressQaAndWait(
            page,
            't',
            () =>
              Object.values(
                (window as any).__VOLAM__.snapshot().state.projectiles,
              ).some((p: any) => p.abilityId === 'hang_long_hoa_vu'),
            undefined,
          );
          const rising = await page.evaluate(() => (window as any).__fixFrame);
          expect(
            rising.view.hangLongFrames.some(
              (f: any) =>
                f.name === 'hang-long:dragon_rise' && f.elevation > 35,
            ),
          ).toBe(true);
          await mkdir('artifacts/m4d-boss-fixes', { recursive: true });
          await writeFile(
            'artifacts/m4d-boss-fixes/hang-long-rise.png',
            Buffer.from(rising.png.split(',')[1], 'base64'),
          );
          const riseFrame = rising.view.hangLongFrames.find(
            (f: any) => f.name === 'hang-long:dragon_rise',
          );
          const caster = rising.state.players[(await snap(page)).sessionId];
          expect(Math.abs(riseFrame.x - caster.x)).toBeLessThan(2);
          expect(
            Math.abs(riseFrame.y + riseFrame.elevation - caster.y),
          ).toBeLessThan(2);
          for (const ability of ['beam', 'spiral']) {
            await captureFixFrame(page, ability);
            await fixPrereq(page, 'vfx', ability);
            const frame = await page.evaluate(() => (window as any).__fixFrame);
            await writeFile(
              'artifacts/m4d-boss-fixes/' + ability + '.png',
              Buffer.from(frame.png.split(',')[1], 'base64'),
            );
            const e = JSON.parse(
              frame.state.bacCai.arena.snapshot,
            ).effects.find((e: any) => e.kind === ability);
            if (ability === 'spiral') expect(e.origin).toEqual({ x: 800, y });
          }
        }
        await page.locator('#boss-test-skip').click();
        await observeQa(
          page,
          () =>
            !!(window as any).__VOLAM__.snapshot().state.vuong?.arena?.snapshot,
          undefined,
          { timeout: 45000 },
        );
        for (const p of [page, peer]) {
          await observeQa(
            p,
            (y) =>
              JSON.parse(
                (window as any).__VOLAM__.snapshot().state.vuong?.arena
                  ?.snapshot || 'null',
              )?.center?.y === y,
            y,
          );
          const v = await p.evaluate(() =>
            (window as any).__VOLAM__.presentation(),
          );
          expect(v.m4dArena.cluster.every((o: any) => !o.visible)).toBe(true);
          const s = await snap(p);
          expect(JSON.parse(s.state.vuong.arena.snapshot).center).toEqual({
            x: 800,
            y,
          });
        }
        if (map === 'tuong_duong') {
          await provoke(page);
          const before = await fixPrereq(page, 'elements');
          const sid = (await snap(page)).sessionId;
          for (const p of [page, peer])
            await observeQa(
              p,
              ({ tick, sid }) => {
                const s = (window as any).__VOLAM__.snapshot();
                return s.events.some(
                  (e: any) =>
                    e.tick >= tick &&
                    e.abilityId === 'vtd_ngu_hanh_kiem_tran' &&
                    e.targetId === sid &&
                    e.kind === 'hit',
                );
              },
              { tick: before.tick, sid },
              { timeout: 15000 },
            );
        }
        await expect(page.locator('#boss-test-skip')).toContainText('phase 2');
        await page.locator('#boss-test-skip').click();
        for (const p of [page, peer])
          await observeQa(
            p,
            () =>
              JSON.parse(
                (window as any).__VOLAM__.snapshot().state.vuong?.arena
                  ?.snapshot || 'null',
              )?.phase === 2,
            undefined,
          );
        evidence.push({
          map,
          center: { x: 800, y },
          twoPeers: true,
          phaseTwo: true,
          errors,
        });
        expect(errors).toEqual([]);
      } catch (e) {
        await page.screenshot({ path: 'artifacts/m4d-boss-fixes-failure.png' });
        throw e;
      } finally {
        await ctx.close();
        await page.goto('about:blank');
      }
    }
    await writeFile(
      'artifacts/m4d-boss-fixes/verified-' + map + '.json',
      JSON.stringify(evidence, null, 2),
    );
  });

test('M4D skill fixes show the seven-second arrow challenge and the extended sword ultimate', async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  const ctx = await browser.newContext(),
    peer = await ctx.newPage();
  const errors: string[] = [];
  for (const p of [page, peer])
    p.on('pageerror', (e) => errors.push(e.message));
  try {
    await create(page, true, 'tuong_duong');
    await joinWaiting(peer, 'M4D QTE peer', (await snap(page)).roomId);
    await startTogether([page, peer], ['vo_dang_kiem', 'cai_bang_chuong']);
    for (const stage of ['tay_doc', 'nam_de']) {
      await page.locator('#boss-test-skip').click();
      await observeQa(
        page,
        (stage) =>
          (window as any).__VOLAM__.snapshot().state.defense
            .devWaveBossStage === stage,
        stage,
      );
    }
    await observeQa(
      page,
      () =>
        JSON.parse(
          (window as any).__VOLAM__.snapshot().state.defense.namDe || 'null',
        )?.phase === 'idle',
      undefined,
      { timeout: 45000 },
    );
    const initial = await fixPrereq(page, 'nam-long-target');
    await pressQaAndWait(
      page,
      't',
      () =>
        Object.values((window as any).__VOLAM__.snapshot().state.areas).some(
          (a: any) => a.abilityId === 'van_kiem_quy_tong',
        ),
      undefined,
    );
    const sid = (await snap(page)).sessionId;
    for (const p of [page, peer]) {
      const area: any = await observeQa(
        p,
        () =>
          Object.values((window as any).__VOLAM__.snapshot().state.areas).find(
            (a: any) => a.abilityId === 'van_kiem_quy_tong',
          ),
        undefined,
      );
      expect(area.x - area.launchX).toBeGreaterThanOrEqual(440);
    }
    await observeQa(
      peer,
      ({ sid, tick }) =>
        (window as any).__VOLAM__
          .snapshot()
          .events.some(
            (e: any) =>
              e.sourceId === sid &&
              e.abilityId === 'van_kiem_quy_tong' &&
              e.stage === 'area_tick' &&
              e.tick >= tick,
          ),
      { sid, tick: initial.tick },
    );
    // Observe the event, private state and visible boxes atomically at the first
    // open frame. RPC/snapshot latency must not consume the challenge window.
    const qtePromise = observeQa(
      page,
      (sid) => {
        const s = (window as any).__VOLAM__.snapshot();
        const payload = s.state.namDeControls[sid]?.payload;
        const q = payload ? JSON.parse(payload).qte : null;
        const dialog = document.querySelector<HTMLElement>('#nam-de-qte');
        const nodes = [...(dialog?.querySelectorAll('span') ?? [])];
        const sealed = s.events.find(
          (e: any) =>
            e.abilityId === 'dai_ly_phong_huyet' &&
            e.stage === 'sealed' &&
            e.targetId === sid,
        );
        if (
          !q ||
          q.state !== 'pending' ||
          !dialog ||
          dialog.hidden ||
          nodes.length !== 10 ||
          !sealed
        )
          return false;
        return {
          ticks: q.until - sealed.tick,
          boxes: nodes.map((n) => ({
            width: n.getBoundingClientRect().width,
            height: n.getBoundingClientRect().height,
            font: getComputedStyle(n).fontSize,
          })),
        };
      },
      sid,
    );
    await fixPrereq(page, 'nam-qte');
    const qte = (await qtePromise) as {
      ticks: number;
      boxes: Array<{ width: number; height: number; font: string }>;
    };
    expect(qte.ticks).toBe(210);
    const boxes = qte.boxes;
    expect(
      boxes.every(
        (b) => b.width >= 41.99 && b.height >= 47.99 && b.font === '34px',
      ),
      JSON.stringify(boxes),
    ).toBe(true);
    await mkdir('artifacts/m4d-boss-fixes', { recursive: true });
    await page.screenshot({ path: 'artifacts/m4d-boss-fixes/nam-de-qte.png' });
    await writeFile(
      'artifacts/m4d-boss-fixes/skills-verified.json',
      JSON.stringify(
        { arrowBoxes: boxes, qteTicks: 210, targetRange: 450, errors },
        null,
        2,
      ),
    );
    expect(errors).toEqual([]);
  } finally {
    await ctx.close();
  }
});

test('M4D VTD follow-up practices notes from the first boss, retries its wipe, and shows moving star damage', async ({
  page,
  browser,
}) => {
  test.setTimeout(140000);
  const context = await browser.newContext(),
    peer = await context.newPage(),
    errors: string[] = [];
  for (const p of [page, peer])
    p.on('pageerror', (e) => errors.push(e.message));
  try {
    await create(page, true, 'tuong_duong');
    await joinWaiting(peer, 'VTD luyện âm', (await snap(page)).roomId);
    await startTogether([page, peer], ['cai_bang_bong', 'vo_dang_kiem']);
    await expect(peer.locator('#boss-test-notes')).toBeHidden();
    await page.locator('#boss-test-notes').click();
    for (const p of [page, peer])
      await observeQa(
        p,
        () => {
          const s = (window as any).__VOLAM__.snapshot(),
            v = JSON.parse(s.state.vuong?.arena?.snapshot || 'null');
          return (
            s.state.players[s.sessionId]?.level === 27 &&
            v?.notesTest &&
            v.action?.skill === 'notes'
          );
        },
        undefined,
      );
    const first = await snap(page),
      view = JSON.parse(first.state.vuong.arena.snapshot);
    expect(view.notes).toHaveLength(7);
    expect(view.cues).toHaveLength(0);
    await observeQa(
      page,
      () => {
        const s = (window as any).__VOLAM__.snapshot();
        return (
          JSON.parse(s.state.players[s.sessionId].inventory.campaign).retry
            ?.phase === 'vote'
        );
      },
      undefined,
      { timeout: 15000 },
    );
    await expect(page.locator('[data-retry-notes]')).toBeVisible();
    await expect(page.locator('[data-retry-summary]')).toContainText(
      'hụt nhịp 1/7',
    );
    await expect(page.locator('[data-retry-summary]')).not.toContainText(
      'hết lượt hồi sinh',
    );
    await page.locator('[data-retry-notes]').click();
    await expect(page.locator('#boss-retry-dialog')).toBeHidden();
    await observeQa(
      page,
      () => {
        const s = (window as any).__VOLAM__.snapshot(),
          v = JSON.parse(s.state.vuong?.arena?.snapshot || 'null');
        return (
          v?.notesTest &&
          v.action?.skill === 'notes' &&
          s.state.players[s.sessionId].hp > 0
        );
      },
      undefined,
    );
    await page.locator('#boss-test-skip').click();
    for (const p of [page, peer])
      await observeQa(
        p,
        () => {
          const v = JSON.parse(
            (window as any).__VOLAM__.snapshot().state.vuong?.arena?.snapshot ||
              'null',
          );
          return v?.phase === 2 && !v.notesTest;
        },
        undefined,
      );
    const peerStars = observeQa(
      peer,
      () =>
        JSON.parse(
          (window as any).__VOLAM__.snapshot().state.vuong?.arena?.snapshot ||
            'null',
        )?.stars.length === 28,
      undefined,
    );
    await provoke(page);
    await page.evaluate(() => {
      const api = (window as any).__VOLAM__,
        deadline = performance.now() + 15000;
      (window as any).__vtdStarFrame = new Promise((resolve, reject) => {
        const previous = new Map<string, { x: number; y: number }>();
        const sample = () => {
          const p = api.presentation().vuong,
            s = api.snapshot();
          const moved = p?.starLights?.some((light: any) => {
            const old = previous.get(light.id);
            return old && Math.hypot(old.x - light.x, old.y - light.y) > 3;
          });
          if (p?.stars === 28 && p.starLights.length >= 4 && moved)
            resolve({
              view: p,
              state: s.state,
              png: (
                document.querySelector('#game canvas') as HTMLCanvasElement
              ).toDataURL('image/png'),
            });
          else if (performance.now() > deadline)
            reject(Error('Missing moving star pulses'));
          else {
            for (const light of p?.starLights ?? [])
              if (!previous.has(light.id))
                previous.set(light.id, { x: light.x, y: light.y });
            api.afterRender(sample);
          }
        };
        api.afterRender(sample);
      });
    });
    const frame = await page.evaluate(() => (window as any).__vtdStarFrame);
    await mkdir('artifacts/m4d-vtd-follow-up', { recursive: true });
    await writeFile(
      'artifacts/m4d-vtd-follow-up/stars.png',
      Buffer.from(frame.png.split(',')[1], 'base64'),
    );
    await peerStars;
    await writeFile(
      'artifacts/m4d-vtd-follow-up/notes-stars.json',
      JSON.stringify(
        {
          notes: 7,
          notesModeHostOnly: true,
          realWipeAndRetry: true,
          returnsToPhaseTwo: true,
          stars: 28,
          movingLights: frame.view.starLights,
          errors,
        },
        null,
        2,
      ),
    );
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
test('M4D VTD follow-up renders the complete tapered dragon projectile in real Bắc Cái combat', async ({
  page,
  browser,
}) => {
  test.setTimeout(100000);
  const context = await browser.newContext(),
    peer = await context.newPage(),
    errors: string[] = [];
  for (const p of [page, peer])
    p.on('pageerror', (e) => errors.push(e.message));
  try {
    await create(page, true, 'tuong_duong');
    await joinWaiting(peer, 'Bắc Cái đuôi rồng', (await snap(page)).roomId);
    await startTogether([page, peer], ['cai_bang_bong', 'vo_dang_kiem']);
    await skipToBac(page);
    await provoke(page);
    await page.evaluate(() => {
      const api = (window as any).__VOLAM__,
        deadline = performance.now() + 10000;
      (window as any).__dragonTailFrame = new Promise((resolve, reject) => {
        const sample = () => {
          const v = api.presentation().bacCai,
            s = api.snapshot();
          const shot = v?.effects?.find(
            (e: any) => e.kind === 'palm' && s.state.tick - e.start >= 9,
          );
          const sprite =
            shot &&
            v.views.find(
              (o: any) =>
                o.key === shot.id && o.texture === 'bc-m4d-dragon-palm',
            );
          if (sprite)
            resolve({
              sprite,
              shot,
              png: (
                document.querySelector('#game canvas') as HTMLCanvasElement
              ).toDataURL('image/png'),
            });
          else if (performance.now() > deadline)
            reject(Error('No complete dragon projectile'));
          else api.afterRender(sample);
        };
        api.afterRender(sample);
      });
    });
    await fixPrereq(page, 'vfx', 'palms');
    const frame = await page.evaluate(() => (window as any).__dragonTailFrame);
    await mkdir('artifacts/m4d-vtd-follow-up', { recursive: true });
    await writeFile(
      'artifacts/m4d-vtd-follow-up/dragon-tail.png',
      Buffer.from(frame.png.split(',')[1], 'base64'),
    );
    expect(frame.sprite.origin).toEqual([0.8, 0.5]);
    await writeFile(
      'artifacts/m4d-vtd-follow-up/dragon-tail.json',
      JSON.stringify(
        {
          sprite: frame.sprite,
          heading: { fx: frame.shot.fx, fy: frame.shot.fy },
          errors,
        },
        null,
        2,
      ),
    );
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test('M4D notes timing walks all seven beats with acknowledged mouse inputs', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => {
    errors.push(e.message);
    console.error(e.message);
  });
  await page.addInitScript(() =>
    localStorage.setItem(
      'volam:preferences',
      JSON.stringify({ controls: 'mouse' }),
    ),
  );
  await create(page, true, 'tuong_duong');
  await startTogether([page], ['cai_bang_bong']);
  await page.locator('#boss-test-notes').click();
  const log: any[] = [];
  for (let stage = 0; stage <= 7; stage++) {
    const target = await observeQa(
      page,
      (stage: number) => {
        const api = (window as any).__VOLAM__,
          s = api.snapshot(),
          h = s.state.players[s.sessionId];
        const v = JSON.parse(s.state.vuong?.arena?.snapshot || 'null'),
          a = v?.action,
          p = api.presentation();
        if (
          a?.skill !== 'notes' ||
          a.stage !== stage ||
          !p.notesFraming ||
          h.hp <= 0
        )
          return false;
        const canvas = document.querySelector(
          '#game canvas',
        ) as HTMLCanvasElement;
        const box = canvas.getBoundingClientRect(),
          matrix = p.cameraMatrix;
        const screen = (point: { x: number; y: number }) => ({
          x:
            box.left +
            (((point.x - matrix.origin.x) / matrix.step) * box.width) /
              canvas.width,
          y:
            box.top +
            (((point.y - matrix.origin.y) / matrix.step) * box.height) /
              canvas.height,
        });
        const seals = v.noteSeals.map(screen);
        const point = seals[v.notes[Math.max(0, stage - 1)]];
        const uncovered = seals.every(
          (seal: { x: number; y: number }) =>
            document.elementFromPoint(seal.x, seal.y) === canvas,
        );
        return {
          ...point,
          stage,
          tick: v.tick,
          deadline: a.next,
          sequence: h.lastSequence,
          uncovered,
          zoom: p.zoom,
          seals,
        };
      },
      stage,
      { timeout: 15000 },
    );
    log.push(target);
    await mkdir('artifacts/m4d-notes-timing', { recursive: true });
    await writeFile(
      'artifacts/m4d-notes-timing/native-progress.json',
      JSON.stringify(log, null, 2),
    );
    expect(target.uncovered, JSON.stringify(target)).toBe(true);
    await page.mouse.click(target.x, target.y, { button: 'right' });
    if (stage > 0) {
      const ready = await observeQa(
        page,
        (stage: number) => {
          const s = (window as any).__VOLAM__.snapshot();
          const v = JSON.parse(s.state.vuong?.arena?.snapshot || 'null');
          const h = s.state.players[s.sessionId];
          return (
            v?.action?.skill === 'notes' &&
            v.action.stage === stage &&
            v.noteReadyIds.includes(s.sessionId) && {
              tick: v.tick,
              hp: h.hp,
              x: h.x,
              y: h.y,
              sequence: h.lastSequence,
            }
          );
        },
        stage,
        { timeout: 4000 },
      );
      Object.assign(target, { ready });
    }
  }
  const result = await observeQa(
    page,
    () => {
      const s = (window as any).__VOLAM__.snapshot(),
        h = s.state.players[s.sessionId];
      const v = JSON.parse(s.state.vuong?.arena?.snapshot || 'null');
      return (
        v?.notesComplete && {
          hp: h.hp,
          complete: v.notesComplete,
          sequence: h.lastSequence,
          retry: JSON.parse(h.inventory.campaign).retry,
        }
      );
    },
    undefined,
  );
  await mkdir('artifacts/m4d-notes-timing', { recursive: true });
  await writeFile(
    'artifacts/m4d-notes-timing/walk.json',
    JSON.stringify({ ...result, log, nativeMouse: true, errors }, null, 2),
  );
  expect(result.hp).toBeGreaterThan(0);
  expect(log.map((r) => r.stage)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(result.sequence).toBeGreaterThan(log[0].sequence);
  await expect(page.locator('#vuong-notes-hud')).toContainText(
    'Hoàn thành 7/7',
  );
  await page.screenshot({ path: 'artifacts/m4d-notes-timing/completed.png' });
  await page.locator('#boss-test-notes').click();
  await observeQa(
    page,
    () => {
      const s = (window as any).__VOLAM__.snapshot(),
        p = (window as any).__VOLAM__.presentation();
      const v = JSON.parse(s.state.vuong?.arena?.snapshot || 'null');
      return (
        v?.action?.skill === 'notes' && v.action.stage === 1 && p.notesFraming
      );
    },
    undefined,
  );
  await page.screenshot({ path: 'artifacts/m4d-notes-timing/active.png' });
  await page.locator('#boss-test-skip').click();
  await observeQa(
    page,
    () => {
      const api = (window as any).__VOLAM__,
        v = JSON.parse(api.snapshot().state.vuong?.arena?.snapshot || 'null'),
        p = api.presentation();
      return v?.phase === 2 && !v.notesTest && !p.notesFraming && p.zoom === 2;
    },
    undefined,
  );
  expect(errors).toEqual([]);
});

test('Nam De dark representative slice reaches the real renderer after an accepted hit', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await create(page, true, 'tuong_duong');
  await startTogether([page], ['cai_bang_bong']);
  for (const stage of ['tay_doc', 'nam_de']) {
    await page.locator('#boss-test-skip').click();
    await observeQa(
      page,
      (stage) =>
        (window as any).__VOLAM__.snapshot().state.defense.devWaveBossStage ===
        stage,
      stage,
    );
  }
  await observeQa(
    page,
    () => !!(window as any).__VOLAM__.snapshot().state.creeps.boss_nam_de,
    undefined,
    { timeout: 30000 },
  );
  await fixPrereq(page, 'nam-dark-ready');
  await pressQaAndWait(
    page,
    'a',
    () =>
      !!JSON.parse(
        (window as any).__VOLAM__.snapshot().state.defense.namDe || 'null',
      )?.dark,
    undefined,
  );
  await observeQa(
    page,
    () =>
      (window as any).__VOLAM__
        .presentation()
        .namDe?.sprites.some(
          (s: any) => s.id === 'boss' && s.texture === 'nam-de-dark:body',
        ),
    undefined,
  );
  await mkdir('artifacts/nam-de-dark', { recursive: true });
  await page.screenshot({ path: 'artifacts/nam-de-dark/representative.png' });
  await writeFile(
    'artifacts/nam-de-dark/representative.json',
    JSON.stringify(
      await page.evaluate(() => ({
        view: JSON.parse(
          (window as any).__VOLAM__.snapshot().state.defense.namDe,
        ),
        presentation: (window as any).__VOLAM__.presentation().namDe,
      })),
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
});

test('Nam De dark multiplayer accepts Z, reflects three blades through a real SDK peer, dodges a warned fist and clears on defeat', async ({
  page,
  browser,
}) => {
  test.setTimeout(160000);
  const context = await browser.newContext(),
    peer = await context.newPage(),
    errors: string[] = [];
  let probeRoom = '';
  for (const p of [page, peer])
    p.on('pageerror', (e) => errors.push(e.message));
  try {
    await create(page, true, 'tuong_duong');
    probeRoom = (await snap(page)).roomId;
    await joinWaiting(peer, 'Nam De peer', probeRoom);
    const probeResponse = await page.request.post(
      '/__nam-dark-party?' +
        new URLSearchParams({ room: probeRoom, op: 'join', probe: '1' }),
    );
    expect(probeResponse.ok(), await probeResponse.text()).toBe(true);
    const probeId = (await probeResponse.json())[0].id as string;
    await startTogether([page, peer], ['cai_bang_bong', 'vo_dang_kiem']);
    await expect(peer.locator('#boss-test-nam-dark')).toBeHidden();
    await page.locator('#boss-test-nam-dark').click();
    for (const p of [page, peer]) {
      await observeQa(
        p,
        () => {
          const s = (window as any).__VOLAM__.snapshot(),
            v = JSON.parse(s.state.defense.namDe || 'null');
          return (
            s.state.players[s.sessionId].level === 18 &&
            v?.dark?.shield &&
            v.dark.transitionUntil < s.state.tick
          );
        },
        undefined,
      );
      await expect(p.locator('#nam-de-guard')).toBeVisible();
    }
    const directions: unknown[] = [];
    await page.evaluate(() => {
      (window as any).__darkWalkFrames = new Map();
      (window as any).__darkWalkTimer = setInterval(() => {
        const p = (window as any).__VOLAM__.presentation().namDe;
        const body = p?.sprites.find(
          (s: any) =>
            s.id === 'boss' &&
            s.texture === 'nam-de-dark:body' &&
            s.frame.startsWith('walk_'),
        );
        if (body) (window as any).__darkWalkFrames.set(body.frame, body);
      }, 40);
    });
    for (const dir of [
      'down',
      'down_right',
      'right',
      'up_right',
      'up',
      'up_left',
      'left',
      'down_left',
    ]) {
      await fixPrereq(page, 'nam-dark-pose', dir);
      const cels: unknown[] = [];
      for (const pose of ['walk_a', 'walk_b']) {
        cels.push(
          await observeQa(
            page,
            ({ dir, pose }) => {
              return (window as any).__darkWalkFrames.get(pose + '_' + dir);
            },
            { dir, pose },
          ),
        );
      }
      directions.push({ dir, cels });
    }
    await page.evaluate(() => clearInterval((window as any).__darkWalkTimer));
    await fixPrereq(page, 'nam-dark-aim');
    await pressQaAndWait(
      page,
      'a',
      () => {
        const s = (window as any).__VOLAM__.snapshot();
        return JSON.parse(s.state.players[s.sessionId].statuses).some(
          (v: any) =>
            v.abilityId === 'tien_thien_canh_khi' && v.kind === 'slow',
        );
      },
      undefined,
    );
    await mkdir('artifacts/nam-de-dark', { recursive: true });
    await page.screenshot({ path: 'artifacts/nam-de-dark/shield.png' });
    const keyboardGuard = await pressQaAndWait(
      page,
      'z',
      () => {
        const s = (window as any).__VOLAM__.snapshot(),
          d = JSON.parse(s.state.defense.namDe || 'null')?.dark;
        return d?.guards.find(
          (g: any) => g.id === s.sessionId && g.cooldownUntil > s.state.tick,
        );
      },
      undefined,
    );
    expect(keyboardGuard.cooldownUntil).toBeGreaterThan(0);
    const parries: any[] = [];
    for (let i = 1; i <= 3; i++) {
      await fixPrereq(page, 'nam-dark-blade', undefined, probeId);
      parries.push(
        await observeQa(
          page,
          (expected: number) => {
            const s = (window as any).__VOLAM__.snapshot(),
              v = JSON.parse(s.state.defense.namDe || 'null');
            return (
              v?.dark?.reflections === expected && {
                tick: s.state.tick,
                reflections: v.dark.reflections,
                shield: v.dark.shield,
                sequence: s.state.players[s.sessionId].lastSequence,
                guards: v.dark.guards,
              }
            );
          },
          i,
          { timeout: 10000, polling: 80 },
        ),
      );
      await observeQa(
        peer,
        (expected: number) =>
          JSON.parse(
            (window as any).__VOLAM__.snapshot().state.defense.namDe || 'null',
          )?.dark?.reflections === expected,
        i,
      );
    }
    expect(parries.map((p) => p.shield)).toEqual([true, true, false]);
    await peer.bringToFront();
    await peer.locator('#game canvas').focus();
    const originalState = await snap(peer);
    const original = originalState.state.players[originalState.sessionId];
    await peer.keyboard.down('ArrowDown');
    const before = await fixPrereq(page, 'nam-dark-fist');
    const dodge = observeQa(
      peer,
      (y: number) => {
        const s = (window as any).__VOLAM__.snapshot();
        return s.state.players[s.sessionId].y > y + 75;
      },
      before.center.y,
      { timeout: 8000 },
    );
    dodge.catch(() => {});
    await dodge;
    await peer.keyboard.up('ArrowDown');
    const hit = await observeQa(
      page,
      (tick: number) => {
        const s = (window as any).__VOLAM__.snapshot(),
          h = s.state.players[s.sessionId];
        const event = s.events.find(
          (e: any) =>
            e.abilityId === 'dai_ly_hoang_quyen' &&
            e.kind === 'hit' &&
            e.targetId === s.sessionId &&
            (e.tick ?? 0) >= tick,
        );
        return (
          event &&
          JSON.parse(h.statuses).some(
            (status: any) =>
              status.kind === 'stun' && status.ticks > 0,
          ) && { event, hp: h.hp }
        );
      },
      before.tick,
      { timeout: 8000 },
    );
    expect(hit.event.damage).toBeGreaterThan(0);
    const after = await snap(peer);
    expect(after.state.players[after.sessionId].hp).toBe(original.maxHp);
    await observeQa(
      page,
      () => {
        const v = (window as any).__VOLAM__.presentation().namDe;
        return (
          v?.dark?.observed.some((frame:string)=>['fist_impact','fist_burst','fist_crack'].includes(frame)) &&
          v.dark.observed.includes('shatter') &&
          v.dark.observed.some((x: string) => x.startsWith('blade_'))
        );
      },
      undefined,
    );
    const report = await page.evaluate(() => {
      const api = (window as any).__VOLAM__,
        s = api.snapshot();
      return {
        tick: s.state.tick,
        view: JSON.parse(s.state.defense.namDe),
        presentation: api.presentation().namDe,
      };
    });
    await fixPrereq(page, 'nam-dark-finish');
    await pressQaAndWait(
      page,
      'a',
      () => {
        const s = (window as any).__VOLAM__.snapshot();
        return (
          JSON.parse(s.state.defense.namDe || 'null')?.phase === 'defeated'
        );
      },
      undefined,
    );
    await expect(page.locator('#nam-de-guard')).toBeHidden();
    await expect(peer.locator('#nam-de-guard')).toBeHidden();
    await writeFile(
      'artifacts/nam-de-dark/multiplayer.json',
      JSON.stringify(
        {
          keyboardGuard,
          reflectionActor: probeId,
          parries,
          directions,
          hit,
          dodgeHp: original.maxHp,
          report,
          errors,
        },
        null,
        2,
      ),
    );
    expect(errors).toEqual([]);
  } finally {
    if (probeRoom)
      await page.request.post(
        '/__nam-dark-party?' +
          new URLSearchParams({ room: probeRoom, op: 'close' }),
      );
    await mkdir('artifacts/nam-de-dark', { recursive: true });
    await writeFile(
      'artifacts/nam-de-dark/parry-audit.json',
      JSON.stringify(
        await page.evaluate(() => ({
          samples: (window as any).__darkParryAudit ?? [],
          clicks: (window as any).__darkGuardClicks ?? [],
          snapshot: (window as any).__VOLAM__.snapshot(),
          presentation: (window as any).__VOLAM__.presentation().namDe,
        })),
        null,
        2,
      ),
    );
    await context.close();
  }
});
test('Nam De dark six-client combat uses two Phaser views and four real SDK peers', async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  const context = await browser.newContext(),
    peer = await context.newPage(),
    pages = [page, peer],
    errors: string[] = [];
  let room = '';
  for (const p of pages) p.on('pageerror', (e) => errors.push(e.message));
  const party = (op: string) =>
    page.request.post('/__nam-dark-party?' + new URLSearchParams({ room, op }));
  try {
    await create(page, true, 'tuong_duong');
    room = (await snap(page)).roomId;
    await joinWaiting(peer, 'Dark party browser', room);
    const joined = await party('join');
    expect(joined.ok(), await joined.text()).toBe(true);
    await startTogether(pages, ['cai_bang_bong', 'vo_dang_kiem']);
    await page.evaluate(() => {
      const seen = new Map<number, any>();
      (window as any).__darkPartyEvents = seen;
      const timer = setInterval(() => {
        const s = (window as any).__VOLAM__.snapshot();
        for (const e of s.events)
          if (
            ['tien_thien_bang_dao', 'dai_ly_hoang_quyen'].includes(e.abilityId)
          )
            seen.set(e.id, e);
        if (seen.size > 100) clearInterval(timer);
      }, 150);
    });
    await page.locator('#boss-test-nam-dark').click();
    for (const p of pages)
      await observeQa(
        p,
        () => {
          const s = (window as any).__VOLAM__.snapshot(),
            v = JSON.parse(s.state.defense.namDe || 'null');
          return (
            Object.keys(s.state.players).length === 6 &&
            s.state.players[s.sessionId].level === 18 &&
            v?.dark?.shield &&
            s.state.tick > v.dark.transitionUntil
          );
        },
        undefined,
      );
    const start = await page.evaluate(
      () => (window as any).__VOLAM__.snapshot().state.tick,
    );
    for (const p of pages) {
      await p.bringToFront();
      await p.locator('#game canvas').focus();
      await p.keyboard.press('ArrowLeft', { delay: 160 });
      await p.keyboard.press('a');
    }
    await observeQa(
      page,
      (start: number) => {
        const api = (window as any).__VOLAM__,
          s = api.snapshot(),
          art = api.presentation().namDe;
        return (
          s.state.tick >= start + 120 &&
          art?.dark?.observed.some((f: string) =>
            ['fist_impact', 'fist_burst', 'fist_crack'].includes(f),
          ) &&
          [...((window as any).__darkPartyEvents?.values() ?? [])].some(
            (e: any) =>
              e.abilityId === 'tien_thien_bang_dao' && e.kind === 'hit',
          )
        );
      },
      start,
      { timeout: 18000, polling: 100 },
    );
    const reports = await Promise.all(
      pages.map((p) =>
        p.evaluate(() => {
          const api = (window as any).__VOLAM__,
            s = api.snapshot(),
            button = document.querySelector('#nam-de-guard') as HTMLElement,
            viewport = document
              .querySelector('#viewport')!
              .getBoundingClientRect(),
            box = button.getBoundingClientRect();
          return {
            sessionId: s.sessionId,
            tick: s.state.tick,
            players: s.state.players,
            view: JSON.parse(s.state.defense.namDe),
            art: api.presentation().namDe,
            guardInside:
              button.hidden ||
              (box.left >= viewport.left &&
                box.right <= viewport.right &&
                box.top >= viewport.top &&
                box.bottom <= viewport.bottom),
            events: [...((window as any).__darkPartyEvents?.values() ?? [])],
          };
        }),
      ),
    );
    for (const r of reports) {
      expect(Object.keys(r.players)).toHaveLength(6);
      expect(r.view.dark).not.toBeNull();
      expect(r.guardInside).toBe(true);
      expect(
        r.art.sprites.some(
          (s: any) => s.id === 'boss' && s.texture === 'nam-de-dark:body',
        ),
      ).toBe(true);
    }
    expect(
      reports.some(
        (r) =>
          Object.values(r.players).some((h: any) => h.hp < h.maxHp) ||
          r.events.some((e: any) => e.kind === 'hit'),
      ),
    ).toBe(true);
    const sdkResponse = await party('report'),
      sdk = await sdkResponse.json();
    expect(sdk).toHaveLength(4);
    expect(
      sdk.every((r: any) => r.hero.level === 18 && r.hero.lastSequence > 0),
    ).toBe(true);
    await mkdir('artifacts/nam-de-dark', { recursive: true });
    await page.screenshot({ path: 'artifacts/nam-de-dark/six-party.png' });
    await writeFile(
      'artifacts/nam-de-dark/six-party.json',
      JSON.stringify(
        {
          start,
          reports,
          sdk,
          errors,
          scope:
            '6 real network clients:2 Phaser renderers+4 SDK actors, legal level18 builds, accepted movement/A and natural phase2; not6 WebGL views or full campaign/boss-clear balance.',
        },
        null,
        2,
      ),
    );
    expect(errors).toEqual([]);
  } finally {
    if (room) await party('close');
    await context.close();
  }
});
