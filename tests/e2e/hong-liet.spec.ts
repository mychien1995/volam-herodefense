import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { joinWaiting, startTogether } from './pregame-helper.js';
interface Actor {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  zoneId: string;
  archetypeId: string;
  castAbilityId: string;
  fx: number;
  fy: number;
  xp: number;
  gold: number;
}
interface Cue {
  x: number;
  y: number;
  fx: number;
  fy: number;
  kind: string;
  abilityId: string;
  length: number;
  activeAt: number;
}
interface Snapshot {
  sessionId: string;
  roomId: string;
  state: {
    tick: number;
    players: Record<string, Actor>;
    creeps: Record<string, Actor>;
    bossEffects: Record<string, Cue>;
    dungeons: Record<
      string,
      { tick: number; bossHp: number; bossMaxHp: number }
    >;
  };
  events: Array<{
    id: number;
    kind: string;
    sourceId: string;
    targetId: string;
    damage: number;
    abilityId: string;
  }>;
}
interface Presentation {
  zoom: number;
  rotation: number;
  zoneId: string;
  hongLiet: {
    actions: string[];
    frames: Record<string, string[]>;
    fireFrames: string[];
    entities: Array<{
      id: string;
      asset: string;
      frame: string;
      x: number;
      y: number;
      depth: number;
    }>;
    samples: unknown[];
  };
}
const read = (p: Page): Promise<Snapshot> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const view = (p: Page): Promise<Presentation> =>
  p.evaluate('window.__VOLAM__.presentation()');
const out =
  process.env['VOLAM_HONG_LIET_EVIDENCE'] ?? 'docs/evidence/hong-liet-runtime';
async function enter(p: Page, access = 'shared') {
  await p.getByRole('button', { name: 'Phó Bản', exact: true }).click();
  await p.locator('[data-destination="hong_liet"]').click();
  await p.locator(`[data-access="${access}"]`).click();
  await p.locator('#enter-dungeon').click();
  await expect
    .poll(async () => {
      const s = await read(p);
      return s.state.players[s.sessionId]?.zoneId;
    })
    .toContain('hong_liet_');
  await p.locator('#game canvas').focus();
}
async function pulse(p: Page, dx: number, dy: number, ms = 250, attack = true) {
  const keys = [
    dx < 0 ? 'ArrowLeft' : dx > 0 ? 'ArrowRight' : '',
    dy < 0 ? 'ArrowUp' : dy > 0 ? 'ArrowDown' : '',
  ].filter(Boolean);
  for (const k of keys) await p.keyboard.down(k);
  if (attack) await p.keyboard.press('a');
  await p.waitForTimeout(ms);
  for (const k of keys) await p.keyboard.up(k);
}
async function fight(p: Page, index: number) {
  const s = await read(p),
    h = s.state.players[s.sessionId];
  if (!h || h.hp <= 0) return;
  if (h.zoneId === 'arena') {
    await enter(p);
    return;
  }
  const boss = Object.values(s.state.creeps).find(
    (a) => a.archetypeId === 'hoan_nhan_hong_liet',
  );
  if (!boss || boss.hp <= 0) return;
  const dx = boss.x - h.x,
    dy = boss.y - h.y,
    d = Math.hypot(dx, dy),
    cues = Object.values(s.state.bossEffects),
    tick = s.state.dungeons[h.zoneId]?.tick ?? 0;
  const warning = cues.find(
    (e) =>
      e.activeAt > tick &&
      ((e.kind === 'stomp' && d < 270) ||
        (e.kind === 'line' &&
          Math.abs((h.x - e.x) * e.fy - (h.y - e.y) * e.fx) < 50) ||
        (['meteor', 'volcano'].includes(e.kind) &&
          Math.hypot(h.x - e.x, h.y - e.y) < 140) ||
        (e.kind === 'lava' &&
          Math.abs((h.x - e.x) * e.fy - (h.y - e.y) * e.fx) < 90)),
  );
  let mx = 0,
    my = 0;
  if (warning) {
    if (warning.kind === 'stomp') {
      mx = -Math.sign(dx);
      my = -Math.sign(dy);
    } else {
      mx = -Math.sign(warning.fy || dy || 1);
      my = Math.sign(warning.fx || dx || 1);
    }
  } else if (d > (index !== 0 && index !== 4 ? 42 : 180)) {
    mx = Math.abs(dx) > 25 ? Math.sign(dx) : 0;
    my = Math.abs(dy) > 25 ? Math.sign(dy) : 0;
  } else if (d < (index !== 0 && index !== 4 ? 25 : 120)) {
    mx = -Math.sign(dx);
    my = -Math.sign(dy);
  }
  if (h.x < 235 && mx < 0) mx = 1;
  if (h.x > 1050 && mx > 0) mx = -1;
  if (h.y < 330 && my < 0) my = 1;
  if (h.y > 995 && my > 0) my = -1;
  await pulse(p, mx, my, 250);
  if (index % 2 === 0) await p.keyboard.press('q');
}
async function assertViewport(p: Page) {
  const box = await p.locator('#viewport').boundingBox(),
    canvas = await p.locator('#game canvas').boundingBox();
  expect(box).toBeTruthy();
  expect(canvas!.width).toBeGreaterThan(900);
  expect(canvas!.width).toBeGreaterThan(box!.width * 0.95);
  const v = await view(p);
  expect(v.zoom).toBe(1);
  expect(v.rotation).toBe(0);
}
async function assertApprovedFrames(p: Page) {
  const production = JSON.parse(
    await readFile('assets/runtime/hoan_nhan_hong_liet_v04.json', 'utf8'),
  ) as { selectedFrames: Record<string, string[]> };
  const presentation = await view(p);
  for (const [asset, frames] of Object.entries(presentation.hongLiet.frames))
    for (const frame of frames)
      expect(production.selectedFrames[asset], asset + ':' + frame).toContain(
        frame,
      );
  for (const entity of presentation.hongLiet.entities)
    if (
      entity.asset.startsWith('hl_boss_') ||
      entity.asset.startsWith('hl_minion_')
    )
      expect(entity.depth).toBe(entity.y);
}
test('two clients: natural boss AI, authority, selected v04 frames and all nine actions', async ({
  browser,
}) => {
  const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
    ]),
    pages = await Promise.all(contexts.map((c) => c.newPage())),
    errors: string[] = [];
  for (const p of pages) {
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
  }
  try {
    await joinWaiting(pages[0]!, 'Boss QA 1');
    const room = (await read(pages[0]!)).roomId;
    await joinWaiting(pages[1]!, 'Boss QA 2', room);
    await startTogether(pages, ['thien_son', 'vo_dang']);
    await Promise.all(pages.map((p) => enter(p)));
    await expect(
      pages[0]!.getByRole('meter', { name: 'Sinh lực Hoàn Nhan Hồng Liệt' }),
    ).toBeVisible();
    await mkdir(out, { recursive: true });
    const first = await read(pages[0]!);
    expect(
      Object.values(first.state.creeps).filter(
        (c) => c.archetypeId === 'hoan_nhan_hong_liet',
      ),
    ).toHaveLength(1);
    const seen = new Set<string>(),
      hits = new Set<string>();
    let cannonPeak = 0;
    const deadline = Date.now() + 85000;
    let screenshots = 0;
    const activeCaptured = new Set<string>();
    while (Date.now() < deadline) {
      await Promise.all(pages.map((p, i) => fight(p, i)));
      for (const p of pages) {
        const s = await read(p);
        for (const e of s.events) {
          if (e.kind === 'hit') hits.add(e.sourceId);
          if (e.kind === 'cast' && e.abilityId) seen.add(e.abilityId);
        }
        const pres = await view(p);
        pres.hongLiet.actions.forEach((a) => seen.add(a));
        const count = Object.values(s.state.bossEffects).filter(
          (e) => e.kind === 'cannon',
        ).length;
        cannonPeak = Math.max(cannonPeak, count);
      }
      const s = await read(pages[0]!);
      const a = s.state.players[s.sessionId]!;
      if (a.zoneId.startsWith('hong_liet_') && screenshots < 4) {
        const action = Object.values(s.state.creeps).find(
          (c) => c.archetypeId === 'hoan_nhan_hong_liet',
        )?.castAbilityId;
        if (
          action &&
          [
            'hong_liet_a1',
            'liet_diem_phong_toa',
            'van_ly_nham_hoa',
            'hoa_phao_thien_la',
          ][screenshots] === action
        ) {
          await pages[0]!.screenshot({ path: `${out}/two-${action}.png` });
          screenshots++;
        }
      }
      const z = s.state.dungeons[a.zoneId];
      for (const [kind, file] of [
        ['lava', 'lava-active-trail'],
        ['meteor', 'meteor-active'],
      ] as const) {
        if (
          !activeCaptured.has(kind) &&
          z &&
          Object.values(s.state.bossEffects).some(
            (e) => e.kind === kind && e.activeAt <= z.tick,
          )
        ) {
          await pages[0]!.screenshot({ path: `${out}/${file}.png` });
          activeCaptured.add(kind);
        }
      }
      if (seen.size >= 9 && cannonPeak === 16) break;
    }
    expect([...seen]).toEqual(
      expect.arrayContaining([
        'hong_liet_a1',
        'hong_liet_a2',
        'dung_nham_liet_dia',
        'hoa_son_bao_phat',
        'liet_diem_phong_toa',
        'hoa_tien_te_phat',
        'thiet_ky_trieu_binh',
        'van_ly_nham_hoa',
        'hoa_phao_thien_la',
      ]),
    );
    expect(cannonPeak).toBe(16);
    const a = await read(pages[0]!),
      b = await read(pages[1]!);
    const common = Object.keys(a.state.creeps).find(
      (id) => b.state.creeps[id]?.archetypeId === 'hoan_nhan_hong_liet',
    )!;
    expect(common).toBeTruthy();
    expect(
      Math.abs(a.state.creeps[common]!.hp - b.state.creeps[common]!.hp),
    ).toBeLessThan(100);
    expect(
      a.events.some((e) => e.kind === 'hit' && e.targetId === common),
    ).toBe(true);
    await assertViewport(pages[0]!);
    await assertApprovedFrames(pages[0]!);
    const pres = await view(pages[0]!);
    expect(pres.hongLiet.frames.boss_thrust_vertical?.length).toBeGreaterThan(
      0,
    );
    expect(pres.hongLiet.fireFrames).toEqual(
      expect.arrayContaining(['meteor', 'crust', 'flame', 'crescent']),
    );
    expect(pres.hongLiet.frames.cannon_clean?.length).toBeGreaterThan(0);
    await writeFile(
      `${out}/two-client-observations.json`,
      JSON.stringify(
        {
          actions: [...seen],
          cannonPeak,
          hitSources: [...hits],
          clients: [a, b],
          presentations: await Promise.all(pages.map(view)),
          errors,
        },
        null,
        2,
      ),
    );
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
test('six real clients fight the shared boss at normal gameplay zoom', async ({
  browser,
}) => {
  const contexts = await Promise.all(
      Array.from({ length: 6 }, () => browser.newContext()),
    ),
    pages = await Promise.all(contexts.map((c) => c.newPage())),
    errors: string[] = [];
  for (const p of pages) p.on('pageerror', (e) => errors.push(e.message));
  try {
    await joinWaiting(pages[0]!, 'Hồng Liệt 1');
    const room = (await read(pages[0]!)).roomId;
    for (let i = 1; i < 6; i++)
      await joinWaiting(pages[i]!, `Hồng Liệt ${i + 1}`, room);
    await startTogether(pages, [
      'thien_son',
      'vo_dang',
      'cai_bang',
      'thieu_lam',
      'thien_son',
      'vo_dang',
    ]);
    await Promise.all(pages.map((p) => enter(p)));
    const participants = new Set<string>(),
      bossHits = new Set<number>();
    let minHp = 3600,
      maxSummons = 0,
      maxCannons = 0,
      maxAlive = 0,
      partyCaptured = false;
    const deadline = Date.now() + 100000;
    while (Date.now() < deadline) {
      await Promise.all(pages.map((p, i) => fight(p, i)));
      const snapshots = await Promise.all(pages.map(read));
      for (const s of snapshots) {
        const bossId = Object.keys(s.state.creeps).find(
          (id) => s.state.creeps[id]!.archetypeId === 'hoan_nhan_hong_liet',
        );
        if (bossId) {
          minHp = Math.min(minHp, s.state.creeps[bossId]!.hp);
          for (const e of s.events)
            if (e.kind === 'hit' && e.targetId === bossId) {
              participants.add(e.sourceId);
              bossHits.add(e.id);
            }
        }
        maxSummons = Math.max(
          maxSummons,
          Object.values(s.state.creeps).filter(
            (a) => a.archetypeId.startsWith('mongol_') && a.hp > 0,
          ).length,
        );
        maxCannons = Math.max(
          maxCannons,
          Object.values(s.state.bossEffects).filter((e) => e.kind === 'cannon')
            .length,
        );
      }
      const alive = Object.values(snapshots[0]!.state.players).filter(
        (h) => h.zoneId === 'hong_liet_shared' && h.hp > 0,
      ).length;
      maxAlive = Math.max(maxAlive, alive);
      if (!partyCaptured && alive === 6 && participants.size === 6) {
        await mkdir(out, { recursive: true });
        await pages[0]!.screenshot({ path: `${out}/six-active-party.png` });
        partyCaptured = true;
      }
      if (
        participants.size >= 6 &&
        maxCannons === 16 &&
        minHp < 2500 &&
        partyCaptured
      )
        break;
    }
    expect(maxAlive).toBe(6);
    expect(partyCaptured).toBe(true);
    expect(participants.size).toBe(6);
    expect(bossHits.size).toBeGreaterThan(20);
    expect(minHp).toBeLessThan(3000);
    expect(maxSummons).toBeGreaterThan(0);
    expect(maxSummons).toBeLessThanOrEqual(8);
    expect(maxCannons).toBe(16);
    await mkdir(out, { recursive: true });
    for (let i = 0; i < 2; i++) {
      await assertViewport(pages[i]!);
      await assertApprovedFrames(pages[i]!);
      await pages[i]!.screenshot({ path: `${out}/six-client-${i + 1}.png` });
    }
    await writeFile(
      `${out}/six-client-observations.json`,
      JSON.stringify(
        {
          participants: [...participants],
          bossHits: bossHits.size,
          minHp,
          maxSummons,
          maxCannons,
          maxAlive,
          partyCaptured,
          presentations: await Promise.all(pages.map(view)),
          snapshots: await Promise.all(pages.map(read)),
          errors,
        },
        null,
        2,
      ),
    );
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
