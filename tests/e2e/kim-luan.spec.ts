import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { joinWaiting, startTogether } from './pregame-helper.js';
import playback from '../../apps/game-client/src/kim-playback.json' with { type: 'json' };
import { m1Config } from '@volam/game-data';
const out =
  process.env['KIM_LUAN_QA_EVIDENCE_DIR'] ?? 'docs/evidence/kim-luan-runtime';
const snapshot = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const presentation = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.presentation()');
async function enter(p: Page) {
  await p.getByRole('button', { name: 'Phó Bản', exact: true }).click();
  await p.locator('[data-destination="kim_luan"]').click();
  await p.locator('#enter-dungeon').click();
  await expect
    .poll(async () => {
      const s = await snapshot(p);
      return s.state.players[s.sessionId]?.zoneId;
    })
    .toContain('kim_luan_');
  await p.locator('#game canvas').focus();
}
async function fight(p: Page, index: number) {
  const s = await snapshot(p),
    h = s.state.players[s.sessionId];
  if (!h || h.hp <= 0) return;
  if (h.zoneId === 'arena') {
    await enter(p);
    return;
  }
  const v = JSON.parse(s.state.dungeons[h.zoneId]?.encounter || 'null');
  if (v)
    v.effects = Object.values(s.state.bossEffects).filter(
      (e: any) => e.zoneId === h.zoneId,
    );
  const actors = Object.values(s.state.creeps).filter(
    (a: any) => a.hp > 0 && a.zoneId === h.zoneId,
  ) as any[];
  const target = actors.sort(
    (a, b) =>
      Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y),
  )[0];
  if (!target) return;
  let dx = target.x - h.x,
    dy = target.y - h.y,
    dist = Math.hypot(dx, dy),
    mx = 0,
    my = 0;
  const range =
    m1Config.basics[h.basicId]?.effect.mode === 'projectile' ? 200 : 45;
  if (dist > range) {
    mx = Math.sign(dx);
    my = Math.sign(dy);
  } else if (dist < range * 0.6) {
    mx = -Math.sign(dx);
    my = -Math.sign(dy);
  }
  for (const cast of v?.casts ?? []) {
    if (cast.abilityId === 'long_tuong_chan_thien' && dist < 310) {
      mx = -Math.sign(dx);
      my = -Math.sign(dy);
    }
    if (cast.abilityId === 'dat_sweep' && dist < 225) {
      mx = -Math.sign(dx);
      my = -Math.sign(dy);
    }
  }
  const incoming = (v?.effects ?? []).find(
    (e: any) =>
      ['shot', 'elephant'].includes(e.kind) &&
      e.activeAt <= v.tick &&
      Math.hypot(e.x - h.x, e.y - h.y) < 95,
  );
  if (incoming) {
    mx = -Math.sign(incoming.fy);
    my = Math.sign(incoming.fx);
  }
  for (const [key, on] of [
    ['ArrowLeft', mx < 0],
    ['ArrowRight', mx > 0],
    ['ArrowUp', my < 0],
    ['ArrowDown', my > 0],
  ] as const) {
    if (on) await p.keyboard.down(key);
    else await p.keyboard.up(key);
  }
  await p.keyboard.press('a');
  if (s.state.tick % 5 === index % 5) await p.keyboard.press('q');
}
async function fixture(p: Page, mode: string, extra = '') {
  const s = await snapshot(p);
  const result = await p.request.post(
    '/__kim_fixture?room=' + s.roomId + '&mode=' + mode + extra,
  );
  expect(result.ok(), await result.text()).toBe(true);
}
test('all184 selected frames /53 clips play in the real Phaser client; actual boss geometry, enrage and Space exit', async ({
  page,
}) => {
  await mkdir(out, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await joinWaiting(page, 'Kim Frames');
  await startTogether([page], ['vo_dang']);
  await enter(page);
  await fixture(page, 'park');
  const report: any[] = [];
  let count = 0;
  for (const [bundle, b] of Object.entries(playback.bundles))
    for (const clip of b.clips) {
      await page.evaluate(
        ({ bundle, clip }) => (window as any).__VOLAM__.reviewKim(bundle, clip),
        { bundle, clip: clip.name },
      );
      const result = await page.evaluate(
        async ({ frames, fps }) => {
          const observed = new Map<string, number>(),
            start = performance.now();
          let last = '';
          const changes: Array<{ frame: string; at: number }> = [];
          while (
            performance.now() - start <
            (frames.length / fps) * 1000 + 180
          ) {
            const v = (window as any).__VOLAM__.presentation().kimFrame;
            if (v) {
              observed.set(v.frame, (observed.get(v.frame) ?? 0) + 1);
              if (v.frame !== last) {
                changes.push({ frame: v.frame, at: performance.now() - start });
                last = v.frame;
              }
              if (v.rotation !== 0) throw Error('Rotated body fixture');
            }
            await new Promise(requestAnimationFrame);
          }
          return { observed: [...observed.keys()], changes };
        },
        { frames: clip.frames, fps: clip.fps },
      );
      expect(result.observed.slice().sort()).toEqual(
        clip.frames.slice().sort(),
      );
      count += clip.frames.length;
      report.push({ bundle, clip: clip.name, fps: clip.fps, ...result });
    }
  expect(count).toBe(184);
  expect(report).toHaveLength(53);
  await page.evaluate(() => (window as any).__VOLAM__.reviewKim('', ''));
  await fixture(page, 'boss');
  await fixture(page, 'cast', '&ability=long_tuong_chan_thien');
  await page.waitForTimeout(650);
  await page.locator('#viewport').screenshot({ path: out + '/chan-thien.png' });
  await fixture(page, 'cast', '&ability=long_tuong_bat_nha_cong');
  await page.waitForTimeout(2900);
  await page
    .locator('#viewport')
    .screenshot({ path: out + '/elephant-cover.png' });
  await fixture(page, 'enrage');
  await page.waitForTimeout(1500);
  const view = await presentation(page);
  expect(view.kim.enraged).toBe(true);
  await page.locator('#viewport').screenshot({ path: out + '/enrage.png' });
  await fixture(page, 'exit');
  await expect
    .poll(async () => {
      const s = await snapshot(page),
        h = s.state.players[s.sessionId];
      return Math.hypot(h.x - 640, h.y - 670);
    })
    .toBeLessThan(40);
  await page.locator('#game canvas').focus();
  await page.keyboard.press('Space');
  await expect
    .poll(async () => {
      const s = await snapshot(page);
      return s.state.players[s.sessionId].zoneId;
    })
    .toBe('arena');
  await writeFile(
    out + '/frames-and-runtime.json',
    JSON.stringify(
      {
        count,
        clips: report.length,
        report,
        view,
        errors,
        fixture: true,
        notNaturalKillEvidence: true,
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
});
test('two real clients enter the shared layered map and observe the same encounter', async ({
  browser,
}) => {
  await mkdir(out, { recursive: true });
  const pages = await Promise.all([browser.newPage(), browser.newPage()]);
  const errors: string[] = [];
  for (const p of pages) p.on('pageerror', (e) => errors.push(e.message));
  try {
    await joinWaiting(pages[0]!, 'Kim QA A');
    const a = await snapshot(pages[0]!);
    await joinWaiting(pages[1]!, 'Kim QA B', a.roomId);
    await startTogether(pages, ['vo_dang', 'thieu_lam']);
    await enter(pages[0]!);
    await enter(pages[1]!);
    await expect(
      pages[0]!.getByRole('meter', { name: 'Sinh lực Hoắc Đô' }),
    ).toHaveAttribute('aria-valuemax', '3300');
    await expect(
      pages[0]!.getByRole('meter', { name: 'Sinh lực Đạt Nhĩ Ba' }),
    ).toHaveAttribute('aria-valuemax', '4800');
    const before = await snapshot(pages[0]!);
    expect(
      Object.values(before.state.creeps).some(
        (a: any) => a.archetypeId === 'kim_luan_phap_vuong',
      ),
    ).toBe(false);
    const peer = await snapshot(pages[1]!);
    expect(before.state.players[before.sessionId].zoneId).toBe('kim_luan_shared');
    expect(peer.state.players[peer.sessionId].zoneId).toBe('kim_luan_shared');
    expect(before.state.players[peer.sessionId].zoneId).toBe('kim_luan_shared');
    expect(peer.state.dungeons.kim_luan_shared.encounter).toBeTruthy();
    const positions = Object.values(before.state.creeps).map((a: any) => ({
      id: a.archetypeId,
      x: a.x,
      y: a.y,
    }));
    for (let i = 0; i < 30; i++) {
      await Promise.all(pages.map((p, n) => fight(p, n)));
      await pages[0]!.waitForTimeout(200);
    }
    const after = await snapshot(pages[0]!),
      view = await presentation(pages[0]!);
    expect(view.zoneId).toContain('kim_luan_');
    expect(view.rotation).toBe(0);
    expect(view.zoom).toBeCloseTo(1440 / 1190, 3);
    expect(
      positions.some((p) =>
        Object.values(after.state.creeps).some(
          (a: any) =>
            a.archetypeId === p.id && Math.hypot(a.x - p.x, a.y - p.y) > 5,
        ),
      ),
    ).toBe(true);
    expect(view.kim.entities.length).toBeGreaterThan(1);
    expect(view.kim.frames.hoac_do_actions.length).toBeGreaterThan(1);
    for (const actor of ['hoac_do', 'dat_nhi_ba'])
      expect(view.kim.frames[actor + '_body']).toEqual(
        expect.arrayContaining([
          expect.stringMatching(
            new RegExp('^renovated-action-' + actor + '_actions:'),
          ),
        ]),
      );
    await pages[0]!
      .locator('#viewport')
      .screenshot({ path: out + '/two-clients.png' });
    await writeFile(
      out + '/two-clients.json',
      JSON.stringify(
        { positions, before: before.state.dungeons, after, view, errors },
        null,
        2,
      ),
    );
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(pages.map((p) => p.close()));
  }
});
test('six clients natural combat through ordinary input, no HP/position fixtures', async ({
  browser,
}) => {
  test.setTimeout(360000);
  await mkdir(out, { recursive: true });
  const pages: Page[] = [],
    errors: string[] = [];
  try {
    for (let i = 0; i < 6; i++) {
      const p = await browser.newPage();
      pages.push(p);
      p.on('pageerror', (e) => errors.push(e.message));
      await joinWaiting(
        p,
        'Kim Party ' + i,
        i ? (await snapshot(pages[0]!)).roomId : undefined,
      );
    }
    await startTogether(pages, [
      'cai_bang',
      'vo_dang',
      'thieu_lam',
      'thien_son',
      'vo_dang',
      'thieu_lam',
    ]);
    await Promise.all(pages.map((p) => enter(p)));
    const observations: any[] = [];
    const phases = new Set<string>();
    let enraged = false,
      defeated = false;
    let hits = 0;
    for (let i = 0; i < 500; i++) {
      await Promise.all(pages.map(fight));
      if (i % 20 === 0) {
        const s = await snapshot(pages[0]!);
        const v = JSON.parse(
          s.state.dungeons.kim_luan_shared?.encounter ?? 'null',
        );
        if (v) {
          phases.add(v.phase);
          enraged ||= v.enraged;
          defeated ||= v.phase === 'defeated';
        }
        observations.push({ at: i, state: s.state, events: s.events });
        hits += s.events.filter((e: any) => e.kind === 'hit').length;
        if (defeated) break;
      }
      if (i === 25)
        await pages[0]!
          .locator('#viewport')
          .screenshot({ path: out + '/six-clients.png' });
      await pages[0]!.waitForTimeout(150);
    }
    const views = await Promise.all(pages.map(presentation));
    expect(hits).toBeGreaterThan(0);
    expect(phases.has('boss')).toBe(true);
    expect(enraged).toBe(true);
    expect(errors).toEqual([]);
    await writeFile(
      out + '/six-clients.json',
      JSON.stringify(
        {
          observations,
          views,
          hits,
          errors,
          phases: [...phases],
          enraged,
          defeated,
          naturalInputsOnly: true,
        },
        null,
        2,
      ),
    );
  } finally {
    await Promise.all(pages.map((p) => p.close()));
  }
});
