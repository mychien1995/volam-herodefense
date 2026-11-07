import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { creepProfiles } from '@volam/game-data';
import { joinWaiting, startTogether } from './pregame-helper.js';
const snapshot = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const presentation = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.presentation()');
test('preview selects all 49 creeps one at a time in live Phaser, with host authority and real controls', async ({
  browser,
}) => {
  const contexts = await Promise.all([
    browser.newContext({ viewport: { width: 1920, height: 1080 } }),
    browser.newContext({ viewport: { width: 1280, height: 720 } }),
  ]);
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const [host, peer] = pages as [Page, Page];
  const errors: string[] = [];
  const coverage: Record<string, unknown> = {};
  for (const p of pages) {
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => {
      if (
        m.type() === 'error' ||
        (m.type() === 'warning' &&
          /missing|not found|undefined/i.test(m.text()))
      )
        errors.push(m.text());
    });
  }
  const out = 'docs/evidence/creep-feedback-r5/preview';
  mkdirSync(out, { recursive: true });
  try {
    await joinWaiting(
      host,
      'Preview Host',
      undefined,
      '/?debug=1&creepPreview=1',
    );
    const initial = await snapshot(host);
    await joinWaiting(peer, 'Preview Peer', initial.roomId);
    await startTogether(pages, ['vo_dang_kiem', 'thieu_lam_dao']);
    await host.evaluate(() => {
      const w = window as any;
      w.__creepWarnings = {
        seen: [] as string[],
        circles: [] as string[],
        casterBursts: [] as string[],
      };
      const observe = () => {
        const s = w.__VOLAM__.snapshot(),
          p = w.__VOLAM__.presentation();
        for (const e of Object.values(s.state.creeps) as any[])
          if (!w.__creepWarnings.seen.includes(e.archetypeId))
            w.__creepWarnings.seen.push(e.archetypeId);
        for (const v of p.creepCombat?.views ?? []) {
          const e = s.state.bossEffects[v.id];
          if (v.warning && v.warningFrame === 'dark_sigil_0')
            w.__creepWarnings.circles.push(v.id);
          if (
            v.bodyVisible &&
            [
              'creep_arc',
              'creep_line',
              'creep_dash',
              'creep_guard',
              'creep_counter',
              'creep_buff',
            ].includes(e?.kind)
          )
            w.__creepWarnings.casterBursts.push(v.id);
          if (
            v.bodyVisible &&
            e?.kind === 'creep_area' &&
            ['creep_son_vien_special', 'creep_wave_12_special'].includes(
              e.abilityId,
            )
          )
            w.__creepWarnings.casterBursts.push(v.id);
        }
        w.__VOLAM__.afterRender(observe);
      };
      w.__VOLAM__.afterRender(observe);
    });
    await expect(host.locator('#creep-preview')).toBeVisible();
    await expect(peer.locator('#creep-preview')).toBeVisible();
    await expect(peer.locator('#creep-preview-id')).toBeDisabled();
    expect(await host.locator('#creep-preview-id option').count()).toBe(49);
    const choose = async (id: string) => {
      await host.locator('#creep-preview-id').selectOption(id);
      await expect
        .poll(
          async () =>
            JSON.parse((await snapshot(host)).state.defense.creepPreview).id,
        )
        .toBe(id);
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
    for (const [id, p] of Object.entries(creepProfiles)) {
      console.info('[creep-preview]', id);
      await choose(id);
      await expect
        .poll(async () => {
          const a = (await presentation(host)).actors.find(
            (a: any) => a.id === `creep_preview_${id}`,
          );
          return !!a && a.texture !== 'creep_outlaw' && !!a.animation;
        })
        .toBe(true);
      if (p.special) {
        await host
          .locator('#creep-preview button[data-action="special"]')
          .click();
        await expect
          .poll(
            async () =>
              ((await presentation(host)).creepCombat?.releases ?? []).some(
                (e: any) =>
                  e.abilityId === `creep_${id}_special` &&
                  (e.frames.length || e.suppressed),
              ),
            { timeout: 6000 },
          )
          .toBe(true);
      }
      if (p.death) {
        await host
          .locator('#creep-preview button[data-action="death"]')
          .click();
        await expect
          .poll(
            async () =>
              ((await presentation(host)).creepCombat?.releases ?? []).some(
                (e: any) =>
                  e.abilityId === `creep_${id}_death` && e.frames.length,
              ),
            { timeout: 6000 },
          )
          .toBe(true);
      }
      const v = await presentation(host);
      coverage[id] = {
        actor: v.actors.find((a: any) => a.id === `creep_preview_${id}`),
        effects: v.creepCombat?.releases?.filter((e: any) =>
          e.abilityId.startsWith(`creep_${id}_`),
        ),
      };
    }
    await choose('wave_03');
    await expect(
      host.locator('#creep-preview button[data-action="special"]'),
    ).toBeDisabled();
    await expect(host.locator('#creep-preview-status')).not.toContainText(
      'Hoành',
    );
    await choose('wave_02');
    await host.locator('#creep-preview-basic').check();
    await expect
      .poll(
        async () =>
          JSON.parse((await snapshot(host)).state.defense.creepPreview)
            .basicOnly,
      )
      .toBe(true);
    const tick = (await snapshot(host)).state.tick;
    await expect
      .poll(async () => (await snapshot(host)).state.tick, { timeout: 7000 })
      .toBeGreaterThan(tick + 150);
    expect(
      Object.values((await snapshot(host)).state.bossEffects).some(
        (e: any) => e.abilityId === 'creep_wave_02_special',
      ),
    ).toBe(false);
    const before = Object.values((await snapshot(host)).state.creeps)[0] as any;
    await host.locator('#game canvas').focus();
    await host.keyboard.press('a');
    await expect
      .poll(
        async () =>
          (Object.values((await snapshot(host)).state.creeps)[0] as any).hp,
      )
      .toBeLessThan(before.hp);
    const x = (await snapshot(host)).state.players[initial.sessionId].x;
    await host.keyboard.press('ArrowRight', { delay: 200 });
    await expect
      .poll(
        async () => (await snapshot(host)).state.players[initial.sessionId].x,
      )
      .toBeGreaterThan(x);
    await host.locator('#creep-preview-basic').uncheck();
    await choose('truc_xa');
    await expect
      .poll(
        async () =>
          (await snapshot(host)).state.players[initial.sessionId].statuses,
        { timeout: 5000 },
      )
      .toContain('slow');
    await expect(host.locator('#creep-preview-status')).toContainText('Chậm');
    await host.screenshot({ path: `${out}/preview-forest.png` });
    await choose('wave_02');
    await host.locator('#creep-preview button[data-action="special"]').click();
    await expect
      .poll(async () =>
        Object.values((await snapshot(host)).state.bossEffects).some(
          (e: any) =>
            e.kind === 'creep_area' &&
            e.abilityId === 'creep_wave_02_special' &&
            e.radius === 64,
        ),
      )
      .toBe(true);
    await host.screenshot({ path: `${out}/preview-forward.png` });
    await host.locator('#creep-preview button[data-action="next"]').click();
    await expect(host.locator('#creep-preview-id')).toHaveValue('wave_03');
    await host.locator('#creep-preview button[data-action="previous"]').click();
    await expect(host.locator('#creep-preview-id')).toHaveValue('wave_02');
    const bounds = await peer.locator('#creep-preview').boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(1280);
    expect(bounds!.y + bounds!.height).toBeLessThan(720);
    expect((await snapshot(host)).state.defense.wave).toBe(0);
    expect(errors).toEqual([]);
    const warnings = await host.evaluate<any>('window.__creepWarnings');
    expect(warnings.seen).toHaveLength(49);
    expect(warnings.circles).toEqual([]);
    expect(warnings.casterBursts).toEqual([]);
    writeFileSync(
      `${out}/browser.json`,
      JSON.stringify({
        players: 2,
        coverage,
        warnings,
        errors,
        normalControls: true,
        slowObserved: true,
        noTimedWaves: true,
        viewportBounds: bounds,
      }),
    );
  } finally {
    for (const c of contexts) await c.close();
  }
});
