import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { joinWaiting, startTogether } from './pregame-helper.js';
import type { BacCaiView } from '@volam/game-core';
import { m1Config } from '@volam/game-data';
const out = 'docs/evidence/bac-cai-runtime';
const snapshot = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const presentation = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.presentation().bacCai');
async function view(p: Page): Promise<BacCaiView | null> {
  const s = await snapshot(p);
  return JSON.parse(s.state.bacCai?.arena?.snapshot || 'null');
}
async function fixture(p: Page, mode: string, extra = '') {
  const s = await snapshot(p),
    r = await p.request.post(
      '/__bac_cai_fixture?room=' + s.roomId + '&mode=' + mode + extra,
    );
  expect(r.ok(), await r.text()).toBe(true);
  const result = await r.json();
  await expect
    .poll(async () => (await view(p))?.tick ?? 0, { intervals: [30] })
    .toBeGreaterThan(result.tick);
  return result;
}
async function observe(p: Page, ms: number) {
  return p.evaluate(async (duration) => {
    const start = performance.now(),
      samples: any[] = [];
    while (performance.now() - start < duration) {
      const v = (window as any).__VOLAM__.presentation().bacCai;
      if (v)
        samples.push({
          at: performance.now() - start,
          ...v,
          observed: undefined,
        });
      await new Promise(requestAnimationFrame);
    }
    return samples;
  }, ms);
}
test('two real clients: all attacks, five slow swaps, dialogue concurrency, vote outcomes, tether break and actual A kills', async ({
  browser,
}) => {
  await mkdir(out, { recursive: true });
  const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
    ]),
    pages = await Promise.all(contexts.map((c) => c.newPage())),
    [a, b] = pages as [Page, Page];
  const errors: string[] = [];
  for (const p of pages) p.on('pageerror', (e) => errors.push(e.message));
  const report: any = {
    scope:
      'Live server fixtures for phase coverage; two independent network clients',
    observations: [],
    errors,
    recordingsCreated: false,
  };
  try {
    await joinWaiting(a, 'Bắc A');
    const room = (await snapshot(a)).roomId;
    await joinWaiting(b, 'Bắc B', room);
    await startTogether(pages, ['cai_bang', 'vo_dang']);
    await fixture(a, 'cast', '&ability=beam');
    for (const p of pages)
      await expect
        .poll(
          async () => (await view(p))?.effects.some((e) => e.kind === 'beam'),
          { intervals: [40] },
        )
        .toBe(true);
    const beam = (await presentation(a)).views.find(
      (v: any) => v.texture === 'bac_cai_beam_v03',
    );
    expect(beam.scale).toEqual([1, 1]);
    expect(beam.origin).toEqual([16 / 768, 0.5]);
    const beamId = (await view(a))!.effects.find((e) => e.kind === 'beam')!.id;
    expect((await view(b))!.effects.some((e) => e.id === beamId)).toBe(true);
    report.observations.push({ skill: 'beam', samples: await observe(a, 300) });
    for (const ability of ['staff', 'palms', 'field', 'vortex'] as const) {
      await fixture(a, 'cast', '&ability=' + ability);
      if (ability === 'field') {
        await expect
          .poll(
            async () =>
              (await view(a))?.effects.some((e) => e.kind === 'field'),
            { intervals: [25] },
          )
          .toBe(true);
        const v = await presentation(a),
          ground = v.views.find((x: any) => x.texture === 'bac_cai_rework_vfx'),
          boss = v.views.find((x: any) => x.key === 'boss');
        expect(ground.alpha).toBe(0.55);
        expect(ground.depth).toBeLessThan(boss.depth);
        expect(boss.alpha).toBe(1);
        await a.screenshot({ path: out + '/field-impact.png' });
      }
      report.observations.push({
        skill: ability,
        samples: await observe(a, ability === 'vortex' ? 3300 : 750),
      });
    }
    await fixture(a, 'cast', '&ability=dogs');
    for (const p of pages)
      await expect.poll(async () => (await view(p))?.dogs.length).toBe(4);
    const first = (await view(a))!.dogs[0]!.id;
    await fixture(a, 'dogkillable');
    await a.locator('#game canvas').focus();
    await a.keyboard.press('a');
    await expect
      .poll(
        async () => (await view(a))?.dogs.find((d) => d.id === first)?.hp ?? 0,
      )
      .toBe(0);
    await expect
      .poll(
        async () => (await view(b))?.dogs.find((d) => d.id === first)?.hp ?? 0,
      )
      .toBe(0);
    report.observations.push({ skill: 'dogs', samples: await observe(a, 650) });
    await fixture(a, 'cast', '&ability=clones');
    await expect.poll(async () => (await view(a))?.forms.length).toBe(8);
    const cloneSamples = await observe(a, 12200);
    expect(cloneSamples.some((s) => s.immune)).toBe(true);
    expect(cloneSamples.some((s) => s.swaps === 5)).toBe(true);
    const moving = cloneSamples.filter((s) => s.swaps === 0 && s.immune);
    const early = moving[0],
      late = moving.find((s) => s.at > early.at + 600);
    expect(late).toBeTruthy();
    expect(
      late.forms.some(
        (f: any, i: number) =>
          Math.hypot(f.x - early.forms[i].x, f.y - early.forms[i].y) > 20,
      ),
    ).toBe(true);
    expect((await view(b))?.clonePhase).toBe('reveal');
    expect((await view(a))?.boss).toBeNull();
    await a.screenshot({ path: out + '/eight-forms.png' });
    report.observations.push({ skill: 'clones', samples: cloneSamples });
    await fixture(a, 'clonehit', '&guess=wrong');
    for (const p of pages) {
      const v = (await view(p))!;
      expect(v.forms).toHaveLength(8);
      expect(v.effects.some((e) => e.kind === 'explosion')).toBe(true);
    }
    await fixture(a, 'clonehit', '&guess=real');
    for (const p of pages)
      await expect.poll(async () => (await view(p))?.forms.length).toBe(0);
    await fixture(a, 'cast', '&ability=tether');
    await expect
      .poll(async () =>
        (await view(a))?.effects.some((e) => e.kind === 'tether'),
      )
      .toBe(true);
    await fixture(a, 'separate');
    for (const p of pages)
      await expect
        .poll(async () =>
          (await view(p))?.effects.some((e) => e.kind === 'tether'),
        )
        .toBe(false);
    await fixture(a, 'cast', '&ability=spiral');
    await expect
      .poll(async () =>
        (await view(a))?.effects.some((e) => e.kind === 'spiral'),
      )
      .toBe(true);
    report.observations.push({
      skill: 'spiral',
      samples: await observe(a, 900),
    });
    // Main action ends at650ms while the same effect remains alive and speech continues.
    const independent = await view(a);
    expect(independent?.action).toBeNull();
    expect(independent?.effects.some((e) => e.kind === 'spiral')).toBe(true);
    expect(independent?.dialogue).not.toBe('');
    await fixture(a, 'continue', '&ability=beam');
    await expect
      .poll(
        async () => (await view(a))?.effects.some((e) => e.kind === 'beam'),
        { intervals: [30] },
      )
      .toBe(true);
    const concurrent = (await view(a))!;
    expect(concurrent.action?.ability).toBe('beam');
    expect(concurrent.effects.some((e) => e.kind === 'spiral')).toBe(true);
    report.observations.push({
      skill: 'spiral+beam+dialogue',
      samples: await observe(a, 120),
    });
    await a.screenshot({ path: out + '/detached-dragon.png' });
    for (const answer of ['correct', 'tie', 'zero', 'wrong']) {
      await fixture(a, 'vote');
      await expect
        .poll(async () => (await view(a))?.vote?.options.length)
        .toBe(3);
      expect((await view(a))?.dialogue).toBe('Ai còn nhớ lời lão phu?');
      if (answer === 'correct')
        await a.screenshot({ path: out + '/vote-open.png' });
      await fixture(a, 'stand', '&answer=' + answer);
      for (const p of pages)
        await expect
          .poll(async () => (await view(p))?.vote?.outcome, { timeout: 8000 })
          .toBe(answer === 'correct' ? 'correct' : 'wrong');
      const v = (await view(a))!;
      expect(v.phase).toBe(answer === 'correct' ? 'sleep' : 'drink');
      expect(v.hp / v.maxHp).toBeCloseTo(answer === 'correct' ? 0.5 : 0.6);
      if (answer === 'correct') {
        await a.screenshot({ path: out + '/vote-sleep.png' });
        report.observations.push({
          skill: 'sleep',
          samples: await observe(a, 300),
        });
      } else
        report.observations.push({
          skill: answer,
          samples: await observe(a, 200),
        });
    }
    await fixture(a, 'cast', '&ability=staff');
    await fixture(a, 'killable');
    await a.locator('#game canvas').focus();
    await a.keyboard.press('a');
    for (const p of pages)
      await expect.poll(async () => (await view(p))?.phase).toBe('defeated');
    const s = await snapshot(a);
    expect(s.state.players[s.sessionId].gold).toBeGreaterThan(0);
    expect(JSON.parse(s.state.players[s.sessionId].bossLoot)).toEqual([]);
    expect(s.state.defense.statueHp).toBe(s.state.defense.statueMaxHp);
    expect(errors).toEqual([]);
    report.status = 'PASS';
  } catch (error) {
    await a.screenshot({ path: out + '/two-client-failure.png' });
    throw error;
  } finally {
    await writeFile(
      out + '/two-client-verification.json',
      JSON.stringify(report, null, 2) + '\n',
    );
    await Promise.all(contexts.map((c) => c.close()));
  }
});
test('six real network clients: natural combat with unchanged trial tuning and legal level30 default builds', async ({
  browser,
}) => {
  await mkdir(out, { recursive: true });
  const contexts = await Promise.all(
      Array.from({ length: 6 }, () =>
        browser.newContext({ viewport: { width: 1280, height: 900 } }),
      ),
    ),
    pages = await Promise.all(contexts.map((c) => c.newPage())),
    errors: string[] = [];
  for (const p of pages) p.on('pageerror', (e) => errors.push(e.message));
  const report: any = {
    scope:
      'Six actual clients; server-only spawn/level30 setup, then ordinary keyboard combat; no accelerated clock or HP/damage changes',
    errors,
    recordingsCreated: false,
  };
  try {
    await joinWaiting(pages[0]!, 'Bắc Six 1');
    const room = (await snapshot(pages[0]!)).roomId;
    for (let i = 1; i < 6; i++)
      await joinWaiting(pages[i]!, 'Bắc Six ' + (i + 1), room);
    await startTogether(pages, [
      'cai_bang',
      'vo_dang',
      'thieu_lam',
      'thien_son',
      'cai_bang',
      'vo_dang',
    ]);
    await fixture(pages[0]!, 'spawn');
    for (const p of pages)
      await expect
        .poll(async () => (await view(p))?.phase, { timeout: 10000 })
        .toBe('combat');
    const initial = (await view(pages[0]!))!;
    report.initial = initial;
    const initialHeroes = Object.values(
      (await snapshot(pages[0]!)).state.players,
    ) as any[];
    report.initialHeroes = initialHeroes;
    const samples: any[] = [];
    const start = Date.now();
    for (const p of pages) await p.locator('#game canvas').focus();
    while (Date.now() - start < 45000) {
      await Promise.all(
        pages.map(async (p, i) => {
          const s = await snapshot(p),
            h = s.state.players[s.sessionId],
            v = JSON.parse(
              s.state.bacCai?.arena?.snapshot || 'null',
            ) as BacCaiView | null;
          if (!v || !h || h.hp <= 0) return;
          const target = v.boss ?? v.forms[i % Math.max(1, v.forms.length)];
          if (!target) return;
          const dx = target.x - h.x,
            dy = target.y - h.y,
            dist = Math.hypot(dx, dy),
            range =
              m1Config.basics[h.basicId]?.effect.mode === 'projectile'
                ? 160
                : 42;
          let mx = dist > range ? Math.sign(dx) : 0,
            my = dist > range ? Math.sign(dy) : 0;
          if (v.vote && !v.vote.outcome) {
            const choice = v.vote.options.find(
              (o) => o.preference === v.preference,
            )!;
            mx = Math.abs(choice.x - h.x) > 15 ? Math.sign(choice.x - h.x) : 0;
            my = Math.abs(choice.y - h.y) > 15 ? Math.sign(choice.y - h.y) : 0;
          }
          if (v.immune) {
            mx = 0;
            my = 0;
          }
          for (const [key, on] of [
            ['ArrowLeft', mx < 0],
            ['ArrowRight', mx > 0],
            ['ArrowUp', my < 0],
            ['ArrowDown', my > 0],
          ] as const)
            if (on) await p.keyboard.down(key);
            else await p.keyboard.up(key);
          if (!v.immune && !v.forms.length) {
            await p.keyboard.press('a');
            await p.keyboard.press(
              ['q', 'w', 'e', 'r'][
                Math.floor((Date.now() - start) / 1500 + i) % 4
              ]!,
            );
          }
        }),
      );
      const v = (await view(pages[0]!))!;
      samples.push({
        elapsed: Date.now() - start,
        tick: v.tick,
        hp: v.hp,
        phase: v.phase,
        action: v.action?.ability,
        effects: v.effects.map((e) => e.kind),
        heroes: Object.values((await snapshot(pages[0]!)).state.players).map(
          (h: any) => ({ id: h.nickname, hp: h.hp, x: h.x, y: h.y }),
        ),
      });
      if (v.phase === 'defeated') break;
    }
    for (const p of pages)
      for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
        await p.keyboard.up(key);
    const views = await Promise.all(pages.map(view));
    expect(views.every((v) => v && v.maxHp === initial.maxHp)).toBe(true);
    expect(samples.some((s) => s.hp < initial.hp)).toBe(true);
    expect(
      samples.some((s) =>
        s.heroes.some(
          (h: any) =>
            h.hp < (initialHeroes.find((a) => a.nickname === h.id)?.hp ?? 0),
        ),
      ),
    ).toBe(true);
    for (const p of pages) {
      const s = await snapshot(p);
      expect(s.state.defense.statueHp).toBe(s.state.defense.statueMaxHp);
      expect(s.state.players[s.sessionId].level).toBe(30);
    }
    await pages[0]!.screenshot({
      path: out + '/six-client-natural-combat.png',
    });
    report.elapsedMs = Date.now() - start;
    report.samples = samples;
    report.final = views;
    report.presentations = await Promise.all(pages.map(presentation));
    report.status = 'PASS';
    report.bossKillObserved = views[0]?.phase === 'defeated';
    expect(errors).toEqual([]);
  } catch (error) {
    await pages[0]?.screenshot({ path: out + '/six-client-failure.png' });
    throw error;
  } finally {
    await writeFile(
      out + '/six-client-verification.json',
      JSON.stringify(report, null, 2) + '\n',
    );
    await Promise.all(contexts.map((c) => c.close()));
  }
});
