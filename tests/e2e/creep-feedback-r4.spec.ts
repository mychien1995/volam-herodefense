import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { joinWaiting, startTogether } from './pregame-helper.js';
const snapshot = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.snapshot()');
test('normal match Thi Doc lands at distant target feet and creep windups have no purple circle', async ({
  browser,
  request,
}) => {
  const contexts = await Promise.all([
    browser.newContext({ viewport: { width: 1920, height: 1080 } }),
    browser.newContext({ viewport: { width: 1280, height: 720 } }),
  ]);
  const pages = await Promise.all(contexts.map((c) => c.newPage())),
    [host, peer] = pages as [Page, Page];
  const errors: string[] = [];
  for (const p of pages) p.on('pageerror', (e) => errors.push(e.message));
  const out = 'docs/evidence/creep-feedback-r4';
  mkdirSync(out, { recursive: true });
  try {
    await joinWaiting(host, 'R4 Target');
    const initial = await snapshot(host);
    await joinWaiting(peer, 'R4 Peer', initial.roomId);
    await startTogether(pages, ['vo_dang_kiem', 'thieu_lam_dao']);
    await host.evaluate(() => {
      const w = window as any;
      w.__targetPool = new Promise((resolve) => {
        const deadline = Date.now() + 12000;
        const inspect = () => {
          const s = w.__VOLAM__.snapshot(),
            p = w.__VOLAM__.presentation(),
            h = s.state.players[s.sessionId];
          const match = (p.creepCombat?.views ?? [])
            .map((v: any) => ({ v, e: s.state.bossEffects[v.id] }))
            .find(
              ({ v, e }: any) =>
                e?.abilityId === 'creep_wave_09_special' &&
                e.kind === 'creep_area' &&
                v.bodyVisible,
            );
          if (match) {
            resolve({
              ...match,
              hero: { x: h.x, y: h.y },
              creeps: s.state.creeps,
              png: document
                .querySelector<HTMLCanvasElement>('#game canvas')!
                .toDataURL('image/png'),
            });
            return;
          }
          if (Date.now() > deadline) {
            resolve({ error: 'target field not rendered' });
            return;
          }
          w.__VOLAM__.afterRender(inspect);
        };
        w.__VOLAM__.afterRender(inspect);
      });
    });
    const spawn = async (id: string, separated = false) => {
      const r = await request.post(
        `/__creep_fixture?${new URLSearchParams({ room: initial.roomId, hero: initial.sessionId, op: 'spawn', id, ...(separated ? { placement: 'separated-target' } : {}) })}`,
      );
      expect(r.ok(), await r.text()).toBe(true);
    };
    await spawn('wave_09', true);
    const still = await host.evaluate<any>('window.__targetPool');
    expect(still.error).toBeUndefined();
    const caster = Object.values(still.creeps)[0] as any;
    expect(still.e.x).toBe(still.hero.x);
    expect(still.e.y).toBe(still.hero.y);
    expect(
      Math.hypot(still.e.x - caster.x, still.e.y - caster.y),
    ).toBeGreaterThan(still.e.radius * 2);
    expect(still.v.x).toBe(still.e.x);
    expect(still.v.y).toBe(still.e.y);
    expect(still.v.warning).toBe(false);
    writeFileSync(
      `${out}/thi-doc-distant-target.png`,
      Buffer.from(still.png.split(',')[1], 'base64'),
    );
    delete still.png;
    await expect
      .poll(
        async () => (await snapshot(host)).state.players[initial.sessionId].hp,
      )
      .toBeLessThan(10000);
    await expect
      .poll(async () =>
        Object.values((await snapshot(peer)).state.bossEffects).some(
          (e: any) =>
            e.abilityId === 'creep_wave_09_special' &&
            e.kind === 'creep_area' &&
            e.x === 980 &&
            e.y === 740,
        ),
      )
      .toBe(true);
    await host.evaluate(() => {
      const w = window as any;
      w.__r4Warnings = { seen: [] as string[], circles: [] as string[] };
      const inspect = () => {
        const s = w.__VOLAM__.snapshot(),
          p = w.__VOLAM__.presentation();
        for (const v of p.creepCombat?.views ?? []) {
          const e = s.state.bossEffects[v.id];
          if (
            e &&
            s.state.tick < e.activeAt &&
            !w.__r4Warnings.seen.includes(e.abilityId)
          )
            w.__r4Warnings.seen.push(e.abilityId);
          if (v.warning && v.warningFrame === 'dark_sigil_0')
            w.__r4Warnings.circles.push(v.id);
        }
        w.__VOLAM__.afterRender(inspect);
      };
      w.__VOLAM__.afterRender(inspect);
    });
    for (const id of [
      'wave_02',
      'wave_03',
      'wave_10',
      'wave_11',
      'wave_15',
      'cu_nhan_sa_thach',
    ]) {
      await spawn(id);
      await expect
        .poll(
          async () =>
            host.evaluate(
              (id) =>
                (window as any).__r4Warnings.seen.includes(
                  `creep_${id}_special`,
                ),
              id,
            ),
          { timeout: 5000 },
        )
        .toBe(true);
    }
    const warnings = await host.evaluate<any>('window.__r4Warnings');
    expect(warnings.circles).toEqual([]);
    expect(errors).toEqual([]);
    writeFileSync(
      `${out}/normal-match.json`,
      JSON.stringify({ players: 2, still, warnings, errors }),
    );
  } finally {
    for (const c of contexts) await c.close();
  }
});
