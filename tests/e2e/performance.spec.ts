import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { joinWaiting, startTogether } from './pregame-helper.js';
import {
  observeQa,
  pressQaAndWait,
  waitForGameReady,
} from '../../tools/qa-browser.mjs';
import {
  castQaSkill,
  ensureQaSkillLearned,
} from '../../tools/qa-skill-browser.mjs';
import { qaEvidenceDirectory } from '../../tools/qa-session.mjs';
const evidence = resolve(
  qaEvidenceDirectory('docs/evidence/performance-optimization'),
);
const snapshot = (page: Page) =>
  page.evaluate(() => (window as any).__VOLAM__.snapshot());
async function setupObserver(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__emissionReads48 = 0;
    w.__emissionFrames48 = [];
    const draws = new WeakMap<CanvasRenderingContext2D, any>();
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (...args: any[]) {
      if (this.canvas.width === 48 && this.canvas.height === 48)
        draws.set(this, {
          source: args[0]?.src,
          rect: args.slice(1),
          emission:
            args.length === 9 &&
            args[5] === 0 &&
            args[6] === 0 &&
            args[7] === 48 &&
            args[8] === 48,
        });
      return (draw as any).apply(this, args);
    };
    const read = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function (
      ...args: any[]
    ) {
      if (
        this.canvas.width === 48 &&
        this.canvas.height === 48 &&
        draws.get(this)?.emission
      ) {
        const now = performance.now();
        w.__emissionFirstAt ??= now;
        w.__emissionLastAt = now;
        w.__emissionReads48++;
        w.__emissionFrames48.push(draws.get(this));
      }
      return (read as any).apply(this, args);
    };
  });
}
async function fixture(page: Page, op: string) {
  const s = await snapshot(page);
  const r = await page.request.post(
    '/__performance?' +
      new URLSearchParams({ room: s.roomId, id: s.sessionId, op }),
  );
  expect(r.ok(), await r.text()).toBe(true);
}
async function stableHud(page: Page) {
  return page.evaluate(async () => {
    const w = window as any;
    let writes = 0;
    const observer = new MutationObserver((rs) => (writes += rs.length));
    const name = document.querySelector('#hero-name')!,
      icon = document.querySelector('#slot-a .pixel-icon')!;
    observer.observe(name, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    observer.observe(icon, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });
    await new Promise((r) => setTimeout(r, 650));
    observer.disconnect();
    return {
      writes,
      emissionReads: w.__emissionReads48,
      name: name.textContent,
      loadingEmissionSpanMs: w.__emissionLastAt - w.__emissionFirstAt,
    };
  });
}
async function capture(page: Page, name: string, report: unknown) {
  mkdirSync(evidence, { recursive: true });
  writeFileSync(
    resolve(evidence, name + '.json'),
    JSON.stringify(report, null, 2),
  );
  await page.screenshot({ path: resolve(evidence, name + '.png') });
}
async function castUnderLoad(page: Page, key: string, field: string) {
  const before = await snapshot(page),
    hero = before.state.players[before.sessionId];
  // The debug event ring holds 60 entries; a 200-target hit can replace it in one patch.
  // Cooldown + input acknowledgement remain authoritative even under that event load.
  return pressQaAndWait(
    page,
    key,
    ({ id, sequence, field }) => {
      const s = (window as any).__VOLAM__.snapshot(),
        h = s.state.players[id];
      return (
        h.lastSequence > sequence &&
        h[field] > 0 && {
          sequence: h.lastSequence,
          cooldown: h[field],
          ability: h.castAbilityId,
        }
      );
    },
    { id: before.sessionId, sequence: hero.lastSequence, field },
    { label: 'accepted stress ' + key },
  );
}
async function failureCapture(page: Page, name: string, error: unknown) {
  const s = await snapshot(page);
  await capture(page, name, {
    error: String(error),
    players: s.state.players,
    events: s.events,
    feedback: await page.locator('#feedback').textContent(),
    emission: await page.evaluate(() =>
      (window as any).__emissionFrames48.slice(-8),
    ),
  });
}
function errors(page: Page) {
  const list: string[] = [];
  page.on('pageerror', (e) => list.push(e.message));
  return list;
}

test('200 real wave bodies retain authoritative movement, projectile damage, hotbar and warmed light sampling', async ({
  browser,
}) => {
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const failures = pages.map(errors);
  try {
    for (const p of pages) await setupObserver(p);
    await joinWaiting(pages[0]!, 'Perf crowd host');
    const room = (await snapshot(pages[0]!)).roomId;
    await joinWaiting(pages[1]!, 'Perf crowd peer', room);
    await startTogether(pages, ['cai_bang_chuong', 'vo_dang_kiem'], 45000);
    await fixture(pages[0]!, 'crowd');
    await observeQa(
      pages[0]!,
      () => {
        const s = (window as any).__VOLAM__.snapshot();
        return (
          Object.keys(s.state.creeps).length === 200 &&
          s.state.players[s.sessionId].level === 30
        );
      },
      undefined,
      { timeout: 15000 },
    );
    await observeQa(
      pages[0]!,
      () => {
        const p = (window as any).__VOLAM__.presentation();
        return (
          p.actors.filter((a: any) => a.id.startsWith('perf_creep_')).length ===
          200
        );
      },
      undefined,
      { timeout: 15000 },
    );
    const initial = await snapshot(pages[0]!),
      id = initial.sessionId;
    await pressQaAndWait(
      pages[0]!,
      'ArrowLeft',
      (a: any) => {
        const s = (window as any).__VOLAM__.snapshot();
        return (
          s.state.players[a.id].x < a.x - 8 &&
          s.state.players[a.id].pose !== 'walk'
        );
      },
      { id, x: initial.state.players[id].x },
      { keyDelay: 250 },
    );
    const moved = await snapshot(pages[0]!);
    await observeQa(
      pages[1]!,
      ({ id, x }) =>
        Math.abs((window as any).__VOLAM__.snapshot().state.players[id].x - x) <
        2,
      { id, x: moved.state.players[id].x },
    );
    await pressQaAndWait(
      pages[0]!,
      'ArrowRight',
      () => {
        const s = (window as any).__VOLAM__.snapshot();
        const h = s.state.players[s.sessionId];
        return h.fx > 0 && h.pose !== 'walk';
      },
      undefined,
      { keyDelay: 60, label: 'face the real ranged target' },
    );
    const ability = (await snapshot(pages[0]!)).state.players[id].build
      .slotSkills[0];
    await ensureQaSkillLearned(pages[0]!, 0, ability);
    const wAbility = (await snapshot(pages[0]!)).state.players[id].build
      .slotSkills[1];
    await ensureQaSkillLearned(pages[0]!, 1, wAbility);
    const stable = await stableHud(pages[0]!);
    expect(stable.writes).toBe(0);
    expect(stable.emissionReads).toBeGreaterThan(0);
    const receipt = await castUnderLoad(pages[0]!, 'q', 'qCooldown');
    await observeQa(
      pages[0]!,
      () => {
        const s = (window as any).__VOLAM__.snapshot();
        return Object.values(s.state.creeps).some((e: any) => e.hp < e.maxHp);
      },
      undefined,
      { timeout: 15000 },
    );
    const beforeW = (await snapshot(pages[0]!)).state.creeps;
    await castUnderLoad(pages[0]!, 'w', 'wCooldown');
    await observeQa(
      pages[0]!,
      (before) => {
        const s = (window as any).__VOLAM__.snapshot();
        return Object.entries(s.state.creeps).some(
          ([id, e]: any) => e.hp < before[id].hp,
        );
      },
      beforeW,
      { label: 'real ranged W damage', timeout: 15000 },
    );
    const reads = await pages[0]!.evaluate(
      () => (window as any).__emissionReads48,
    );
    expect(
      reads,
      JSON.stringify(
        await pages[0]!.evaluate(() =>
          (window as any).__emissionFrames48.slice(-6),
        ),
      ),
    ).toBe(stable.emissionReads);
    const final = await snapshot(pages[0]!);
    expect(final.state.players[id].mana).toBeLessThan(
      final.state.players[id].maxMana,
    );
    await observeQa(
      pages[0]!,
      () => {
        const s = (window as any).__VOLAM__.snapshot(),
          h = s.state.players[s.sessionId];
        return document
          .querySelector('#mp-text')
          ?.textContent?.includes(String(Math.floor(h.mana)));
      },
      undefined,
      { label: 'HUD matches current authoritative mana' },
    );
    const presentation = await pages[0]!.evaluate(() =>
      (window as any).__VOLAM__.presentation(),
    );
    const bodies = presentation.actors.filter((a: any) =>
      a.id.startsWith('perf_creep_'),
    );
    expect(bodies.every((a: any) => a.texture !== 'creep_outlaw')).toBe(true);
    expect(failures.flat()).toEqual([]);
    await capture(pages[0]!, 'crowd', {
      scope:
        '200 legal stationary wave-1 bodies, two clients, actual input/movement/cast/hit; not natural wave or hardware FPS acceptance',
      stable,
      reads,
      receipt,
      bodyCount: bodies.length,
      texture: bodies[0]?.texture,
      errors: failures,
    });
  } catch (error) {
    await failureCapture(pages[0]!, 'crowd-failure', error);
    throw error;
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});

test('PvP real two-client skills preserve damage, HUD and warm emission cache', async ({
  browser,
}) => {
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const [host, peer] = await Promise.all(contexts.map((c) => c.newPage()));
  const failures = [errors(host!), errors(peer!)];
  try {
    await setupObserver(host!);
    await setupObserver(peer!);
    await host!.goto('/?debug=1');
    await host!.getByRole('button', { name: 'Lôi Đài', exact: true }).click();
    await host!.locator('#pvp-nickname').fill('Perf PvP host');
    await host!.locator('#pvp-entry-map').selectOption('rung_truc');
    await host!.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
    await expect(host!.locator('.pvp-lobby')).toBeVisible();
    const room = (await snapshot(host!)).roomId;
    await peer!.goto('/?debug=1&pvp=' + room);
    await peer!.bringToFront();
    await peer!.locator('#pvp-nickname').fill('Perf PvP peer');
    await peer!.getByRole('button', { name: 'Vào phòng', exact: true }).click();
    await expect(peer!.locator('.pvp-lobby')).toBeVisible();
    for (const [p, school, branch] of [
      [host!, 'cai_bang', 'cai_bang_chuong'],
      [peer!, 'thien_son', 'thien_son_dao'],
    ] as const) {
      await p.bringToFront();
      await p.locator('[data-pvp="character"]').click();
      await p.locator('[data-school="' + school + '"]').click();
      await p.locator('.branch-dialog [data-branch="' + branch + '"]').click();
      await p.locator('[data-pvp="confirm-character"]').click();
      await observeQa(
        p,
        () => {
          const s = (window as any).__VOLAM__.snapshot();
          return JSON.parse(s.state.pvp.json).members.find(
            (m: any) => m.id === s.sessionId,
          )?.ready;
        },
        undefined,
      );
      await p
        .locator('#scene-status[data-ready="true"]')
        .waitFor({ state: 'attached', timeout: 60000 });
    }
    const h = await snapshot(host!),
      p = await snapshot(peer!);
    await host!
      .locator('[data-assign="' + h.sessionId + '"]')
      .selectOption('chinh');
    await host!
      .locator('[data-assign="' + p.sessionId + '"]')
      .selectOption('ta');
    await host!.getByRole('button', { name: 'Cài đặt', exact: true }).click();
    await host!.locator('#pvp-hazards').uncheck();
    await observeQa(
      host!,
      () =>
        !JSON.parse((window as any).__VOLAM__.snapshot().state.pvp.json)
          .hazardsEnabled,
      undefined,
    );
    await host!.getByRole('button', { name: 'Quay lại', exact: true }).click();
    await host!.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    await observeQa(
      host!,
      () =>
        JSON.parse((window as any).__VOLAM__.snapshot().state.pvp.json)
          .phase === 'fighting',
      undefined,
    );
    await Promise.all([waitForGameReady(host!), waitForGameReady(peer!)]);
    await fixture(host!, 'place');
    const stable = await stableHud(host!);
    expect(stable.writes).toBe(0);
    expect(stable.emissionReads).toBeGreaterThan(0);
    const a = await castQaSkill(host!, 'q', 'hoa_van_chuong');
    await observeQa(
      peer!,
      ({ source, target }) => {
        const s = (window as any).__VOLAM__.snapshot();
        return s.events.some(
          (e: any) =>
            (e.kind === 'hit' &&
              e.sourceId === source &&
              e.targetId === target &&
              e.damage > 0) ||
            (e.kind === 'effect' &&
              e.targetId === target &&
              e.abilityId === 'bac_minh_than_cong' &&
              e.stage === 'dodge'),
        );
      },
      { source: h.sessionId, target: p.sessionId },
      { label: 'real Q impact or approved dodge' },
    );
    const beforePeerQ = (await snapshot(host!)).state.players[h.sessionId].hp;
    const b = await castQaSkill(peer!, 'q', 'phi_anh_tram');
    await observeQa(
      peer!,
      ({ id, hp }) =>
        (window as any).__VOLAM__.snapshot().state.players[id].hp < hp,
      { id: h.sessionId, hp: beforePeerQ },
      { label: 'peer observes real Phi Anh damage' },
    );
    const after = await snapshot(host!);
    const reads = await host!.evaluate(() => (window as any).__emissionReads48);
    expect(
      reads,
      JSON.stringify(
        await host!.evaluate(() =>
          (window as any).__emissionFrames48.slice(-6),
        ),
      ),
    ).toBe(stable.emissionReads);
    expect(
      after.events.some((e: any) => e.kind === 'hit' && e.damage > 0),
    ).toBe(true);
    expect(failures.flat()).toEqual([]);
    await capture(host!, 'pvp', {
      scope:
        'Two real PvP clients on Rừng Trúc, extra HP/position prerequisites, real skill damage and peer receipt; no hardware FPS claim',
      stable,
      reads,
      receipts: [a, b],
      errors: failures,
    });
  } catch (error) {
    await failureCapture(host!, 'pvp-failure', error);
    throw error;
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
