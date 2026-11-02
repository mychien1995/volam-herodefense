import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { joinWaiting, startTogether } from './pregame-helper.js';
import type { DongView } from '@volam/game-core';
const out = process.env['DONG_TA_QA_EVIDENCE_DIR'] ?? 'docs/evidence/dong-ta-runtime';
interface Actor {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  gold: number;
  xp: number;
  zoneId: string;
  archetypeId?: string;
}
interface Snap {
  roomId: string;
  sessionId: string;
  state: {
    tick: number;
    players: Record<string, Actor>;
    creeps: Record<string, Actor>;
    defense: {
      dongTa: string;
      statueHp: number;
      wave: number;
      nextWaveTick: number;
    };
  };
  events: Array<{
    kind: string;
    abilityId: string;
    sourceId: string;
    targetId: string;
    damage: number;
  }>;
}
interface View {
  zoom: number;
  rotation: number;
  dong: {
    view: DongView;
    observed: Record<string, string[]>;
    statueVisible: boolean;
    boundaryVisible: boolean;
    actors: Array<{
      id: string;
      texture: string;
      origin: number[];
      x: number;
      y: number;
      depth: number;
    }>;
  };
}
const snap = (p: Page): Promise<Snap> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const presentation = (p: Page): Promise<View> =>
  p.evaluate('window.__VOLAM__.presentation()');
const encounter = async (p: Page) =>
  JSON.parse((await snap(p)).state.defense.dongTa) as DongView;
async function fixture(
  p: Page,
  mode: string,
  extra: Record<string, string> = {},
) {
  const s = await snap(p),
    r = await p.request.post(
      '/__dong_ta?' + new URLSearchParams({ room: s.roomId, mode, ...extra }),
    );
  expect(r.ok(), await r.text()).toBe(true);
  return r.json();
}
test('real Phaser wave encounter: recall, frames, all skills, damage/healing, bounds, wipe/retry and keyboard clear', async ({
  browser,
}) => {
  const players = process.env['DONG_TA_QA_PLAYERS'] === '2' ? 2 : 6;
  const contexts = await Promise.all(
    Array.from({ length: players }, () =>
      browser.newContext({ viewport: { width: 1280, height: 720 } }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage())),
    p = pages[0]!,
    errors: string[] = [],
    events = new Map<string, Snap['events'][number]>();
  const started = performance.now();
  mkdirSync(out, { recursive: true });
  for (const page of pages) {
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('response', (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
  }
  const collect = async () => {
    const s = await snap(p);
    for (const e of s.events) events.set(JSON.stringify(e), e);
    return s;
  };
  try {
    await joinWaiting(p, 'ĐôngTà-1');
    const room = (await snap(p)).roomId;
    for (let i = 1; i < players; i++)
      await joinWaiting(pages[i]!, `ĐôngTà-${i + 1}`, room);
    await startTogether(
      pages,
      Array.from(
        { length: players },
        (_, i) => ['cai_bang', 'thien_son', 'vo_dang', 'thieu_lam'][i % 4]!,
      ),
    );
    const poseGroups = {
      dong: [
        'idle',
        'walk',
        'sword_flurry_cast',
        'finger_cast',
        'summon_cast',
        'hurt',
        'death',
        'thrust',
        'flute',
      ],
      mai: [
        'idle',
        'walk',
        'claw_attack',
        'pull_cast',
        'poison_skull_throw',
        'hurt',
        'death',
      ],
      hoang: ['idle', 'walk', 'support_cast', 'evade', 'hurt', 'death'],
    };
    // These are live actor fixtures in the actual match, separate from natural combat below.
    for (const direction of ['down', 'left', 'right', 'up'])
      for (let index = 0; index < 9; index++) {
        await fixture(p, 'pose', { direction, index: String(index) });
        for (const [bundle, tags] of Object.entries(poseGroups)) {
          const tag = tags[index];
          if (!tag) continue;
          const actualBundle =
            tag === 'thrust' || tag === 'flute' ? 'actions' : bundle;
          await expect
            .poll(
              async () =>
                (await presentation(p)).dong.observed[
                  actualBundle + ':' + tag + '_' + direction
                ]?.length ?? 0,
              { message: actualBundle + ':' + tag + '_' + direction },
            )
            .toBe(4);
        }
      }
    await fixture(p, 'end-poses');
    await fixture(p, 'gate');
    await expect.poll(async () => (await snap(p)).state.defense.wave).toBe(5);
    expect((await encounter(p)).phase).toBe('waiting');
    await fixture(p, 'clear-wave5');
    await expect
      .poll(async () => (await encounter(p)).phase, { timeout: 20000 })
      .toBe('entry');
    await expect
      .poll(
        async () =>
          (await presentation(p)).dong.observed['dong:walk_left']?.length ?? 0,
      )
      .toBeGreaterThan(1);
    await expect.poll(async () => (await encounter(p)).phase).toBe('fighting');
    for (const page of pages)
      await expect
        .poll(async () => {
          const s = await snap(page);
          return s.state.players[s.sessionId]?.zoneId;
        })
        .toBe('arena');
    const initial = await snap(p),
      statueHp = initial.state.defense.statueHp;
    expect(Object.values(initial.state.players).every((h) => h.hp > 0)).toBe(
      true,
    );
    expect((await fixture(p, 'inspect')).statueInvulnerable).toBe(true);
    expect((await presentation(p)).dong.statueVisible).toBe(false);
    expect((await presentation(p)).dong.boundaryVisible).toBe(true);
    // Actual arrow movement cannot cross the authoritative east edge; the other client agrees.
    await fixture(p, 'position', {
      player: initial.sessionId,
      x: '1100',
      y: '616',
    });
    await p.keyboard.down('ArrowRight');
    await p.waitForTimeout(900);
    await p.keyboard.up('ArrowRight');
    const bounded = (await snap(p)).state.players[initial.sessionId]!;
    expect(bounded.x).toBeLessThanOrEqual(1116.01);
    await expect
      .poll(
        async () => (await snap(pages[1]!)).state.players[initial.sessionId]?.x,
      )
      .toBeCloseTo(bounded.x, 0);
    // Observe the natural boss rotation before crossing its summon threshold.
    const observed = new Set<string>();
    const firstDeadline = performance.now() + 26000;
    while (performance.now() < firstDeadline) {
      await collect();
      const v = await encounter(p);
      for (const c of v.casts) observed.add(c.abilityId);
      if (
        [
          'ta_kiem_lien_kich',
          'lac_anh_normal',
          'dan_chi_than_cong',
          'lac_anh_kiem_phap',
          'ngoc_tieu_hoi_phong',
        ].every((a) => observed.has(a))
      )
        break;
      await p.waitForTimeout(120);
    }
    for (const id of [
      'ta_kiem_lien_kich',
      'lac_anh_normal',
      'dan_chi_than_cong',
      'lac_anh_kiem_phap',
      'ngoc_tieu_hoi_phong',
    ])
      expect(observed.has(id), id).toBe(true);
    await expect
      .poll(
        async () =>
          (await presentation(p)).dong.observed['fx:petal_burst']?.length ?? 0,
      )
      .toBe(4);
    await fixture(p, 'threshold');
    await expect
      .poll(
        async () =>
          Object.values((await snap(p)).state.creeps).filter((c) =>
            ['mai_sieu_phong', 'hoang_dung'].includes(c.archetypeId ?? ''),
          ).length,
      )
      .toBe(2);
    const deadline = performance.now() + 32000;
    while (performance.now() < deadline) {
      await collect();
      const v = await encounter(p);
      for (const c of v.casts) observed.add(c.abilityId);
      const all = [
        'bach_cot_trao',
        'ma_anh_troc_hon',
        'am_phong_hap_luc',
        'doc_cot_bao',
        'thanh_am_ho_tro',
        'linh_xa_bo',
      ];
      if (
        all.every((id) => observed.has(id)) &&
        [...events.values()].some(
          (e) => e.abilityId === 'thanh_am_ho_tro' && e.kind === 'pulse',
        )
      )
        break;
      await p.waitForTimeout(120);
    }
    for (const id of [
      'bach_cot_trao',
      'ma_anh_troc_hon',
      'am_phong_hap_luc',
      'doc_cot_bao',
      'thanh_am_ho_tro',
      'linh_xa_bo',
    ])
      expect(observed.has(id), id).toBe(true);
    for (const clip of ['poison_pouch', 'poison_burst', 'poison_pool'])
      await expect
        .poll(
          async () =>
            (await presentation(p)).dong.observed['maifx:' + clip]?.length ?? 0,
          { message: clip },
        )
        .toBe(4);
    const allEvents = [...events.values()];
    expect(
      allEvents.some(
        (e) => e.kind === 'hit' && e.sourceId === 'dong_ta' && e.damage > 0,
      ),
    ).toBe(true);
    expect(
      allEvents.some(
        (e) => e.abilityId === 'thanh_am_ho_tro' && e.kind === 'pulse',
      ),
    ).toBe(true);
    const view = await presentation(p);
    expect(view.zoom).toBe(1);
    expect(view.rotation).toBe(0);
    expect(
      Object.keys(view.dong.observed).some((k) =>
        k.startsWith('actions:flute'),
      ),
    ).toBe(true);
    expect(view.dong.observed['fx:pebble']?.length).toBe(4);
    expect(view.dong.observed['fx:petal_burst']?.length).toBe(4);
    expect(view.dong.actors).toHaveLength(3);
    expect(
      view.dong.actors.every(
        (a) => a.texture.startsWith('dt_') && a.depth > a.y,
      ),
    ).toBe(true);
    if (players === 6) {
      const boss=Object.values((await snap(p)).state.creeps).find(a=>a.archetypeId==='dong_ta')!;
      await fixture(p,'position',{player:(await snap(p)).sessionId,x:String(boss.x),y:String(boss.y+40)});
      await expect.poll(async()=>(await snap(p)).state.players[initial.sessionId]!.x).toBeCloseTo(boss.x,0);
      await p.waitForTimeout(150);
      await p.screenshot({ path: out + '/six-player-combat.png' });
    }
    // Wipe reset is a server fixture arrangement; revival/reset is entirely normal encounter logic.
    const attempt = (await encounter(p)).attempt;
    await fixture(p, 'wipe');
    await expect.poll(async () => (await encounter(p)).phase).toBe('retry');
    expect((await encounter(p)).effects).toHaveLength(0);
    expect((await fixture(p, 'inspect')).statueInvulnerable).toBe(true);
    await expect
      .poll(async () => (await encounter(p)).attempt)
      .toBe(attempt + 1);
    await expect
      .poll(async () =>
        Object.values((await snap(p)).state.players).every((h) => h.hp > 0),
      )
      .toBe(true);
    const retry = await encounter(p);
    expect(retry.bossHp).toBe(retry.bossMaxHp);
    expect(retry.summoned).toBe(false);
    await fixture(p, 'combat');
    const baseline = await snap(p);
    if (players === 6)
      expect((await encounter(p)).bossHp).toBe(retry.bossMaxHp);
    for (
      let n = 0;
      n < (players === 6 ? 180 : 60) &&
      (await encounter(p)).phase !== 'cleared';
      n++
    ) {
      await Promise.all(pages.map((page) => page.keyboard.press('a')));
      if (n % 4 === 0)
        await Promise.all(
          pages.map((page) =>
            page.keyboard.press(['q', 'w', 'e', 'r'][Math.floor(n / 4) % 4]!),
          ),
        );
      await p.waitForTimeout(160);
    }
    await expect.poll(async () => (await encounter(p)).phase).toBe('cleared');
    for (const page of pages)
      await expect
        .poll(async () => (await encounter(page)).phase)
        .toBe('cleared');
    const final = await snap(p);
    expect(final.state.defense.statueHp).toBe(statueHp);
    expect(
      Object.values(final.state.creeps).some((c) =>
        ['dong_ta', 'mai_sieu_phong', 'hoang_dung'].includes(
          c.archetypeId ?? '',
        ),
      ),
    ).toBe(false);
    expect(
      Object.values(final.state.players).reduce((n, h) => n + h.gold, 0),
    ).toBeGreaterThan(
      Object.values(baseline.state.players).reduce((n, h) => n + h.gold, 0),
    );
    expect((await presentation(p)).dong.statueVisible).toBe(true);
    expect((await presentation(p)).dong.boundaryVisible).toBe(false);
    expect(
      (await fixture(p, 'inspect')).players.every(
        (h: { overlapsTerrain: boolean }) => !h.overlapsTerrain,
      ),
    ).toBe(true);
    if (players === 6) {
      await fixture(p,'position',{player:final.sessionId,x:'800',y:'670'});
      await expect.poll(async()=>(await snap(p)).state.players[final.sessionId]!.x).toBeCloseTo(800,0);
      await p.waitForTimeout(150);
      await p.screenshot({ path: out + '/arena-restored.png' });
    }
    expect(errors).toEqual([]);
    writeFileSync(
      out + `/${players}-player-report.json`,
      JSON.stringify(
        {
          status: 'PASS',
          players,
          fullHpFinalAttempt: players === 6,
          seconds: (performance.now() - started) / 1000,
          fixtureScope:
            'Wave gate accelerated, level30 legally granted, dungeon/death/threshold/wipe arranged; natural AI and keyboard combat, normal server lifecycle/damage/rewards.',
          observed: [...observed],
          frames: view.dong.observed,
          events: allEvents,
          statueHp,
          attempts: retry.attempt,
          errors,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await p.screenshot({ path: out + '/failure.png' }).catch(() => {});
    throw error;
  } finally {
    for (const c of contexts) await c.close();
  }
});
