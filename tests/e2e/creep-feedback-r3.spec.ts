import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { creepProfiles } from '@volam/game-data';
import { joinWaiting, startTogether } from './pregame-helper.js';
const snapshot = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const presentation = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.presentation()');
test('director r3 effects: target circles/pools, normal-only swordsman, torso arrows and no unwanted red strips', async ({
  browser,
}) => {
  const contexts = await Promise.all([
    browser.newContext({ viewport: { width: 1920, height: 1080 } }),
    browser.newContext({ viewport: { width: 1280, height: 720 } }),
  ]);
  const pages = await Promise.all(contexts.map((c) => c.newPage())),
    [host, peer] = pages as [Page, Page];
  const errors: string[] = [],
    coverage: Record<string, unknown> = {};
  for (const p of pages) {
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
  }
  const out = 'docs/evidence/creep-feedback-r3';
  mkdirSync(out, { recursive: true });
  const choose = async (id: string) => {
    await host.locator('#creep-preview-id').selectOption(id);
    await expect
      .poll(
        async () =>
          JSON.parse((await snapshot(peer)).state.defense.creepPreview).id,
      )
      .toBe(id);
    await expect
      .poll(async () =>
        Object.values((await snapshot(host)).state.creeps).map(
          (e: any) => e.archetypeId,
        ),
      )
      .toEqual([id]);
  };
  const cues = (id: string): Promise<any[]> =>
    host.evaluate((ability) => {
      const w = window as any,
        s = w.__VOLAM__.snapshot(),
        p = w.__VOLAM__.presentation();
      return (p.creepCombat?.views ?? [])
        .map((v: any) => ({ v, e: s.state.bossEffects[v.id] }))
        .filter(({ e }: any) => e?.abilityId === ability);
    }, id);
  const arm = async (id: string, frame: string, kind?: string) => {
    await host.evaluate(
      ({ id, frame, kind }) => {
        const w = window as any,
          deadline = Date.now() + 6000;
        // Observe metadata every frame; export exactly one PNG, never a frame stream.
        w.__creepPhase = new Promise((resolve) => {
          const inspect = () => {
            const s = w.__VOLAM__.snapshot(),
              p = w.__VOLAM__.presentation();
            const view = (p.creepCombat?.views ?? [])
              .map((v: any) => ({ v, e: s.state.bossEffects[v.id] }))
              .find(
                ({ v, e }: any) =>
                  e?.abilityId === id &&
                  v.bodyVisible &&
                  String(v.frame).startsWith(frame) &&
                  (!kind || e.kind === kind),
              );
            if (view) {
              resolve({
                ...view,
                png: document
                  .querySelector<HTMLCanvasElement>('#game canvas')!
                  .toDataURL('image/png'),
              });
              return;
            }
            if (Date.now() > deadline) {
              resolve({ error: 'Phase not observed: ' + id + '/' + frame });
              return;
            }
            w.__VOLAM__.afterRender(inspect);
          };
          w.__VOLAM__.afterRender(inspect);
        });
      },
      { id: `creep_${id}_special`, frame, kind },
    );
  };
  const save = async (name: string) => {
    const still = await host.evaluate<any>('window.__creepPhase');
    expect(still.error).toBeUndefined();
    const bytes = Buffer.from(still.png.split(',')[1], 'base64');
    expect(bytes.length).toBeGreaterThan(50000);
    writeFileSync(`${out}/${name}.png`, bytes);
    delete still.png;
    return still;
  };
  const skill = async (
    id: string,
    phase?: { frame: string; name: string; kind?: string },
  ) => {
    await choose(id);
    if (phase) await arm(id, phase.frame, phase.kind);
    await host.locator('#creep-preview button[data-action="special"]').click();
    if (phase) return save(phase.name);
    await expect
      .poll(async () => (await cues(`creep_${id}_special`)).length, {
        timeout: 5000,
        intervals: [30, 60, 100],
      })
      .toBeGreaterThan(0);
  };
  try {
    await joinWaiting(host, 'R3 Host', undefined, '/?debug=1&creepPreview=1');
    const initial = await snapshot(host);
    await joinWaiting(peer, 'R3 Peer', initial.roomId);
    await startTogether(pages, ['vo_dang_kiem', 'thieu_lam_dao']);
    await choose('wave_02');
    await host.locator('#creep-preview-basic').check();
    await expect
      .poll(
        async () =>
          JSON.parse((await snapshot(host)).state.defense.creepPreview)
            .basicOnly,
      )
      .toBe(true);
    await expect
      .poll(async () => (await cues('creep_wave_02_basic')).length, {
        timeout: 5000,
        intervals: [30, 60, 100],
      })
      .toBeGreaterThan(0);
    expect(
      (await cues('creep_wave_02_basic')).every(({ v }: any) => !v.warning),
    ).toBe(true);
    await host.locator('#creep-preview-basic').uncheck();
    await expect
      .poll(
        async () =>
          JSON.parse((await snapshot(host)).state.defense.creepPreview)
            .basicOnly,
      )
      .toBe(false);
    const burst = await skill('wave_02', {
      frame: 'violet_black_impact',
      name: 'target-purple-burst',
    });
    expect(burst.v.x).toBe(burst.e.x);
    expect(burst.v.y).toBe(burst.e.y);
    coverage.wave_02 = burst;
    await choose('wave_06');
    await host.locator('#game canvas').focus();
    await host.keyboard.press('a');
    await expect
      .poll(
        async () =>
          (Object.values((await snapshot(host)).state.creeps)[0] as any).hp,
      )
      .toBeLessThan(10000);
    const wounded = (
      Object.values((await snapshot(host)).state.creeps)[0] as any
    ).hp;
    await arm('wave_06', 'dark_sigil');
    await host.locator('#creep-preview button[data-action="special"]').click();
    await expect
      .poll(
        async () =>
          (Object.values((await snapshot(host)).state.creeps)[0] as any).hp,
        { timeout: 5000 },
      )
      .toBeGreaterThan(wounded);
    const drain = await save('victim-drain');
    expect(drain.v.x).toBe(drain.e.x);
    expect(drain.v.y).toBe(drain.e.y);
    coverage.wave_06 = drain;
    for (const id of ['wave_03', 'wave_07', 'mongol_infantry', 'bc_dog']) {
      await choose(id);
      await expect(
        host.locator('#creep-preview button[data-action="special"]'),
      ).toBeDisabled();
      coverage[id] = { specialAbsent: !creepProfiles[id]!.special };
    }
    const arrow = await skill('wave_08', {
      frame: '',
      name: 'torso-arrow',
      kind: 'creep_projectile',
    });
    expect(arrow.v.y - arrow.e.y).toBeCloseTo(-18);
    coverage.wave_08 = arrow;
    const poison = await skill('wave_09', {
      frame: 'needle_poison_impact',
      name: 'target-poison',
      kind: 'creep_area',
    });
    expect(poison.v.warning).toBe(false);
    expect(poison.e.x).toBeCloseTo(840);
    expect(poison.e.y).toBe(740);
    coverage.wave_09 = poison;
    const water = await skill('thuy_quy', {
      frame: 'water_splash',
      name: 'target-water',
      kind: 'creep_area',
    });
    expect(water.e.x).toBe(840);
    expect(water.e.y).toBe(740);
    coverage.thuy_quy = water;
    for (const id of [
      'wave_05',
      'wave_13',
      'wave_16',
      'wave_17',
      'bo_cap_cat',
      'sa_xa',
      'xac_uop',
      'cua_khong_lo',
      'hai_tac',
      'hell_dia_nguc_khuyen',
      'hell_hac_dien_nguu_ma',
    ]) {
      console.info('[r3-no-strip]', id);
      await skill(id);
      const current = (await cues(`creep_${id}_special`)).filter(
        ({ e }: any) => e.kind !== 'creep_area',
      );
      expect(current.length).toBeGreaterThan(0);
      expect(current.every(({ v }: any) => !v.warning)).toBe(true);
      await expect
        .poll(
          async () =>
            ((await presentation(host)).creepCombat.releases ?? []).some(
              (v: any) =>
                v.abilityId === `creep_${id}_special` &&
                (v.frames.length || v.suppressed),
            ),
          { timeout: 5000 },
        )
        .toBe(true);
      coverage[id] = current;
    }
    expect(errors).toEqual([]);
    writeFileSync(
      `${out}/presentation.json`,
      JSON.stringify({
        players: 2,
        coverage,
        errors,
        actualDrainHeal: true,
        sourceArtReused: true,
      }),
    );
  } finally {
    for (const c of contexts) await c.close();
  }
});
