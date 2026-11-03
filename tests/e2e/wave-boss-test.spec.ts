import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { joinWaiting, startTogether } from './pregame-helper.js';
const out = 'docs/evidence/wave-boss-test';
const snapshot = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const archetypes: Record<string, string> = {
  dong_ta: 'dong_ta',
  tay_doc: 'tay_doc',
  nam_de: 'nam_de',
  bac_cai: 'bac_cai',
};
const bossIds: Record<string, string> = {
  dong_ta: 'dong_ta',
  tay_doc: 'tay_doc_boss',
  nam_de: 'boss_nam_de',
  bac_cai: 'bac_cai',
};
test('one env starts four real wave bosses in order; two clients stay full HP and keyboard hits take five percent', async ({
  browser,
}) => {
  await mkdir(out, { recursive: true });
  const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
    ]),
    pages = await Promise.all(contexts.map((c) => c.newPage())),
    [a, b] = pages as [Page, Page],
    errors: string[] = [];
  for (const p of pages) {
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
  }
  const report: any = {
    scope:
      'Server env only; no fixture endpoints, injected hits, HP edits or teleports. Actual arrows/A inputs.',
    errors,
    recordingsCreated: false,
    stages: [],
    maxHp: {},
    hits: [],
  };
  const seenEvents = new Set<number>();
  const started = Date.now();
  let captured = false, lastProgress = 0;
  try {
    await joinWaiting(a, 'Wave God A');
    await joinWaiting(b, 'Wave God B', (await snapshot(a)).roomId);
    await startTogether(pages, ['thien_son', 'thien_son']);
    for (const p of pages)
      await expect
        .poll(async () => (await snapshot(p)).state.defense.devWaveBosses)
        .toBe(true);
    await expect(a.locator('#defense-hud')).toContainText(
      'Bất tử · Chạy ×3 · Mỗi hit boss −5% HP',
    );
    while (Date.now() - started < 250000) {
      const s = await snapshot(a),
        stage = s.state.defense.devWaveBossStage as string;
      if (stage && !report.stages.includes(stage)) {
        report.stages.push(stage);
        console.log('Wave boss stage:', stage);
      }
      const current = (Object.values(s.state.creeps) as any[]).find(
        (c) => c.hp > 0 && c.archetypeId === archetypes[stage],
      );
      const bc = JSON.parse(s.state.bacCai?.arena?.snapshot || 'null');
      if (current) report.maxHp[stage] = current.maxHp;
      if (stage === 'bac_cai' && bc) report.maxHp[stage] = bc.maxHp;
      if (Date.now() - lastProgress > 10000) {
        lastProgress = Date.now();
        console.log('Live boss HP:', stage, current?.hp ?? bc?.hp, 'hits:', report.hits.length);
      }
      for (const e of s.events ?? [])
        if (!seenEvents.has(e.id)) {
          seenEvents.add(e.id);
          if (e.kind === 'hit' && Object.values(bossIds).includes(e.targetId))
            report.hits.push(e);
        }
      for (const h of Object.values(s.state.players) as any[])
        expect(h.hp, 'God mode ' + h.nickname + ' stage ' + stage).toBe(
          h.maxHp,
        );
      expect(
        Object.values(s.state.creeps).some((c: any) => c.invasionWave > 0),
      ).toBe(false);
      if (stage === 'complete') break;
      await Promise.all(
        pages.map(async (p, index) => {
          const state = await snapshot(p),
            h = state.state.players[state.sessionId],
            stage = state.state.defense.devWaveBossStage;
          let target = (Object.values(state.state.creeps) as any[]).find(
            (c) => c.hp > 0 && c.archetypeId === archetypes[stage],
          );
          const v = JSON.parse(state.state.bacCai?.arena?.snapshot || 'null');
          if (stage === 'bac_cai' && v)
            target =
              v.boss ??
              v.forms[
                (Math.floor((Date.now() - started) / 2500) + index * 4) %
                  Math.max(1, v.forms.length)
              ];
          if (!h || !target) return;
          const distance = Math.hypot(target.x - h.x, target.y - h.y),
            mx = distance > 140 ? Math.sign(target.x - h.x) : 0,
            my = distance > 140 ? Math.sign(target.y - h.y) : 0;
          await p.locator('#game canvas').focus();
          for (const [key, on] of [
            ['ArrowLeft', mx < 0],
            ['ArrowRight', mx > 0],
            ['ArrowUp', my < 0],
            ['ArrowDown', my > 0],
          ] as const)
            if (on) await p.keyboard.down(key);
            else await p.keyboard.up(key);
          // Use the normal ranged Phiến: chase first, then aim-once A in range.
          if (distance <= 200 && (!v?.immune || stage !== 'bac_cai'))
            await p.keyboard.press('a', { delay: 25 });
        }),
      );
      if (
        !captured &&
        stage === 'dong_ta' &&
        current?.hp < current?.maxHp * 0.8
      ) {
        await a.screenshot({ path: out + '/sandbox-active.png' });
        captured = true;
      }
    }
    expect(report.stages).toEqual([
      'dong_ta',
      'tay_doc',
      'nam_de',
      'bac_cai',
      'complete',
    ]);
    for (const [stage, id] of Object.entries(bossIds)) {
      const hits = report.hits.filter((e: any) => e.targetId === id);
      expect(hits.length, 'Hits for ' + stage).toBeGreaterThanOrEqual(20);
      for (const hit of hits)
        expect(hit.damage / report.maxHp[stage], '5% ' + stage).toBeCloseTo(
          0.05,
          8,
        );
    }
    for (const p of pages)
      await expect
        .poll(async () => (await snapshot(p)).state.defense.devWaveBossStage)
        .toBe('complete');
    expect(errors).toEqual([]);
    report.status = 'PASS';
    report.elapsedMs = Date.now() - started;
    report.final = await Promise.all(pages.map(snapshot));
    await a.screenshot({ path: out + '/sandbox-complete.png' });
  } catch (error) {
    report.status = 'FAIL';
    report.error = String(error);
    report.final = await Promise.all(pages.map(snapshot));
    await a.screenshot({ path: out + '/failure.png' });
    throw error;
  } finally {
    await writeFile(
      out + '/verification.json',
      JSON.stringify(report, null, 2) + '\n',
    );
    await Promise.all(contexts.map((c) => c.close()));
  }
});
