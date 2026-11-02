import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { joinWaiting, startTogether } from './pregame-helper.js';
import type { TayDocView } from '@volam/game-core';
type Actor = {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  zoneId: string;
  archetypeId: string;
  xp: number;
  gold: number;
};
type Snapshot = {
  sessionId: string;
  roomId: string;
  state: {
    tick: number;
    players: Record<string, Actor>;
    creeps: Record<string, Actor>;
    tayDoc?: Record<string, { json: string }>;
  };
  events: Array<{
    kind: string;
    sourceId: string;
    targetId: string;
    damage: number;
    abilityId: string;
  }>;
};
type Presentation = {
  zoom: number;
  rotation: number;
  zoneId: string;
  tayDoc: {
    phase: string;
    actions: string[];
    frames: Record<string, string[]>;
    entities: Array<{
      id: string;
      frame: string;
      asset: string;
      x: number;
      y: number;
      depth: number;
      rotation: number;
    }>;
  };
};
const read = (p: Page): Promise<Snapshot> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const view = (p: Page): Promise<Presentation> =>
  p.evaluate('window.__VOLAM__.presentation()');
const data = (s: Snapshot) =>
  JSON.parse(s.state.tayDoc?.arena?.json ?? 'null') as TayDocView | null;
const evidence = 'docs/evidence/tay-doc';
async function fixture(
  request: APIRequestContext,
  roomId: string,
  args: Record<string, unknown>,
) {
  const r = await request.post('http://127.0.0.1:2799', {
    data: { roomId, ...args },
  });
  expect(r.ok(), await r.text()).toBe(true);
  return r.json();
}
async function pulse(
  p: Page,
  dx: number,
  dy: number,
  ms = 200,
  attack = false,
) {
  const keys = [
    dx < 0 ? 'ArrowLeft' : dx > 0 ? 'ArrowRight' : '',
    dy < 0 ? 'ArrowUp' : dy > 0 ? 'ArrowDown' : '',
  ].filter(Boolean);
  for (const key of keys) await p.keyboard.down(key);
  if (attack) {
    await p.keyboard.press('a');
    await p.keyboard.press('q');
  }
  await p.waitForTimeout(ms);
  for (const key of keys) await p.keyboard.up(key);
}
async function viewport(p: Page) {
  const box = await p.locator('#viewport').boundingBox(),
    canvas = await p.locator('#game canvas').boundingBox();
  expect(canvas!.width).toBeGreaterThan(box!.width * 0.95);
  const v = await view(p);
  expect(v.zoom).toBe(1);
  expect(v.rotation).toBe(0);
}
test('two real clients: authoritative fixtures, every direction/action, warnings, hazards and zone cleanup', async ({
  browser,
  request,
}) => {
  const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
    ]),
    pages = await Promise.all(contexts.map((c) => c.newPage())),
    errors: string[] = [];
  for (const p of pages) p.on('pageerror', (e) => errors.push(e.message));
  await mkdir(evidence, { recursive: true });
  try {
    await joinWaiting(pages[0]!, 'Tây Độc QA1');
    const roomId = (await read(pages[0]!)).roomId;
    await joinWaiting(pages[1]!, 'Tây Độc QA2', roomId);
    await startTogether(pages, ['cai_bang', 'vo_dang']);
    await expect
      .poll(async () => data(await read(pages[0]!))?.phase)
      .toBe('enter');
    const entry = data(await read(pages[0]!))!;
    expect(entry.bossId).toBe('tay_doc_boss');
    const b = (await read(pages[0]!)).state.creeps[entry.bossId]!;
    expect(b.y).toBe(616);
    const p1 = [
      'tay_doc_staff',
      'tay_doc_gas',
      'van_doc_phi_cham',
      'doc_vu_me_hon',
      'co_doc_khoan_tam',
      'hon_thien_phuc_long_chan',
    ];
    const p2 = [
      'doc_chuong',
      'cap_mo_chan_kich',
      'ngu_doc_than_chuong',
      'van_doc_bao_phat',
    ];
    for (const ability of p1) {
      await fixture(request, roomId, {
        op: 'arrange',
        phase: 'phase1',
        ability,
        dir: 'right',
      });
      await expect
        .poll(async () => data(await read(pages[1]!))?.cast?.ability)
        .toBe(ability);
      await pages[0]!.waitForTimeout(1250);
      if (ability === 'doc_vu_me_hon') {
        expect(data(await read(pages[0]!))!.pools).toHaveLength(8);
        await pages[0]!.screenshot({ path: evidence + '/p1-eight-pools.png' });
      }
      if (ability === 'hon_thien_phuc_long_chan') {
        expect(data(await read(pages[0]!))!.pillars).toHaveLength(6);
        await pages[0]!.screenshot({ path: evidence + '/p1-six-pillars.png' });
        await pages[0]!.waitForTimeout(12000);
      }
      if (ability === 'co_doc_khoan_tam') {
        expect(data(await read(pages[0]!))!.marks).toHaveLength(1);
      }
    }
    for (const dir of ['right', 'left', 'up', 'down']) {
      await fixture(request, roomId, {
        op: 'arrange',
        phase: 'phase1',
        ability: 'tay_doc_staff',
        dir,
      });
      await pages[0]!.waitForTimeout(1200);
      await fixture(request, roomId, {
        op: 'arrange',
        phase: 'transition',
        dir,
      });
      await expect
        .poll(async () => data(await read(pages[0]!))?.phase)
        .toBe('transition');
      await pages[0]!.waitForTimeout(2300);
      await expect
        .poll(async () => data(await read(pages[1]!))?.phase)
        .toBe('phase2');
      for (const ability of [
        'doc_chuong',
        'cap_mo_chan_kich',
        'ngu_doc_than_chuong',
        'van_doc_bao_phat',
      ]) {
        await fixture(request, roomId, {
          op: 'arrange',
          phase: 'phase2',
          ability,
          dir,
        });
        if (ability === 'cap_mo_chan_kich' && dir === 'right') {
          await pages[0]!.waitForTimeout(400);
          await pages[0]!.screenshot({
            path: evidence + '/p2-stomp-warning.png',
          });
        }
        await pages[0]!.waitForTimeout(
          ability === 'van_doc_bao_phat'
            ? 4100
            : ability === 'ngu_doc_than_chuong'
              ? 2200
              : 1200,
        );
        if (ability === 'ngu_doc_than_chuong' && dir === 'right')
          await pages[0]!.screenshot({
            path: evidence + '/p2-radial-channel.png',
          });
      }
      // Core idle/walk continues to aim from live hero positions; no renderer pose override.
      await fixture(request, roomId, { op: 'arrange', phase: 'phase2', dir });
      await pulse(
        pages[0]!,
        dir === 'left' ? -1 : dir === 'right' ? 1 : 0,
        dir === 'up' ? -1 : dir === 'down' ? 1 : 0,
        1400,
      );
      await pages[0]!.waitForTimeout(900);
    }
    const a = await view(pages[0]!),
      bView = await view(pages[1]!);
    for (const ability of [...p1, ...p2])
      expect(
        a.tayDoc.actions.some((s) => s.startsWith(ability + ':')),
        ability,
      ).toBe(true);
    const registry = JSON.parse(
      await readFile('apps/game-client/src/tay-doc-playback.json', 'utf8'),
    );
    const expected = Object.values(
      registry.directions.animations as Record<string, { frames: string[] }>,
    ).flatMap((c) => c.frames);
    expect(expected).toHaveLength(60);
    expect(a.tayDoc.frames.directions).toEqual(
      expect.arrayContaining(expected),
    );
    expect(bView.tayDoc.frames.directions).toEqual(
      expect.arrayContaining(expected),
    );
    expect(a.tayDoc.frames.snake8).toHaveLength(8);
    expect(a.tayDoc.frames.transition).toHaveLength(64);
    expect(a.tayDoc.frames.newactor).toHaveLength(12);
    expect(a.tayDoc.frames.actions).toHaveLength(8);
    for (const entity of a.tayDoc.entities.filter((e) => e.id === 'boss')) {
      expect(entity.rotation).toBe(0);
      expect(entity.depth).toBe(entity.y);
    }
    await fixture(request, roomId, {
      op: 'arrange',
      phase: 'phase2',
      dir: 'right',
    });
    await pages[0]!.waitForTimeout(1200);
    await viewport(pages[0]!);
    await pages[0]!.screenshot({ path: evidence + '/arena-runtime.png' });
    await writeFile(
      evidence + '/frame-observations.json',
      JSON.stringify(
        {
          profile:
            'two-client server fixtures; HP/position arrangement is not natural combat',
          a,
          b: bView,
          expectedCandidateCels: expected.length,
          errors,
        },
        null,
        2,
      ),
    );
    await fixture(request, roomId, { op: 'depart' });
    await expect
      .poll(
        async () =>
          (await read(pages[1]!)).state.players[
            (await read(pages[1]!)).sessionId
          ]?.zoneId,
      )
      .not.toBe('arena');
    await expect
      .poll(async () => (await view(pages[1]!)).tayDoc.entities.length)
      .toBe(0);
    await fixture(request, roomId, { op: 'death' });
    await expect
      .poll(async () => data(await read(pages[0]!))?.phase)
      .toBe('dead');
    expect(data(await read(pages[0]!))!.projectiles).toHaveLength(0);
    expect(data(await read(pages[0]!))!.pillars).toHaveLength(0);
    expect(errors).toEqual([]);
  } finally {
    for (const c of contexts) await c.close();
  }
});

test('six real clients: natural level1 A/QWER combat, phase transition, normal viewport and cleanup', async ({
  browser,
  request,
}) => {
  const contexts = await Promise.all(
      Array.from({ length: 6 }, () => browser.newContext()),
    ),
    pages = await Promise.all(contexts.map((c) => c.newPage())),
    errors: string[] = [];
  for (const p of pages) p.on('pageerror', (e) => errors.push(e.message));
  try {
    await joinWaiting(pages[0]!, 'Sáu người 1');
    const roomId = (await read(pages[0]!)).roomId;
    for (let i = 1; i < 6; i++)
      await joinWaiting(pages[i]!, `Sáu người ${i + 1}`, roomId);
    await startTogether(pages, [
      'cai_bang',
      'vo_dang',
      'thieu_lam',
      'thien_son',
      'vo_dang',
      'cai_bang',
    ]);
    const samples: unknown[] = [];
    let capturedPhase2 = false,
      damaged = false,
      phase2 = false,
      dead = false;
    const began = Date.now();
    while (Date.now() - began < 150000) {
      await Promise.all(
        pages.map(async (p, i) => {
          const s = await read(p),
            h = s.state.players[s.sessionId],
            v = data(s),
            boss = v ? s.state.creeps[v.bossId] : undefined;
          if (!h || h.hp <= 0 || !boss || boss.hp <= 0) return;
          const dx = boss.x - h.x,
            dy = boss.y - h.y,
            d = Math.hypot(dx, dy),
            range = i === 1 || i === 4 ? 180 : 44;
          let mx = d > range && Math.abs(dx) > 15 ? Math.sign(dx) : 0,
            my = d > range && Math.abs(dy) > 15 ? Math.sign(dy) : 0;
          if (Math.abs(h.y - 616) > 45 && h.x > 1000) {
            mx = 0;
            my = Math.sign(616 - h.y);
          }
          if (v?.marks.some((m) => m.targetId === s.sessionId)) {
            mx = h.x < 800 ? -1 : 1;
            my = h.y < 650 ? -1 : 1;
          } else if (
            v?.cast &&
            v.tick < v.cast.activeAt &&
            v.cast.ability === 'cap_mo_chan_kich' &&
            d < 430
          ) {
            mx = -Math.sign(dx);
            my = -Math.sign(dy);
          }
          await pulse(p, mx, my, 200, true);
          await p.keyboard.press(
            ['w', 'e', 'r'][Math.floor((Date.now() - began) / 1000) % 3]!,
          );
        }),
      );
      const s = await read(pages[0]!),
        v = data(s),
        boss = v ? s.state.creeps[v.bossId] : undefined;
      if (boss && boss.hp < boss.maxHp) damaged = true;
      if (v?.phase === 'phase2' || v?.phase === 'transition') phase2 = true;
      if (samples.length === 0 || Date.now() - began > samples.length * 5000)
        samples.push({
          seconds: (Date.now() - began) / 1000,
          bossHp: boss?.hp,
          phase: v?.phase,
          heroes: Object.values(s.state.players).map((h) => ({
            hp: h.hp,
            xp: h.xp,
            gold: h.gold,
          })),
          shots: v?.projectiles.length,
          pillars: v?.pillars.length,
        });
      if (data(s)?.phase === 'phase2' && !capturedPhase2) {
        await pages[0]!.screenshot({
          path: evidence + '/six-player-natural-phase2.png',
        });
        capturedPhase2 = true;
      }
      if (v?.phase === 'dead') {
        dead = true;
        break;
      }
    }
    const s = await read(pages[0]!),
      v = await view(pages[0]!);
    await viewport(pages[0]!);
    expect(Object.keys(s.state.players)).toHaveLength(6);
    expect(damaged).toBe(true);
    expect(phase2).toBe(true);
    await pages[0]!.screenshot({
      path: evidence + '/six-player-natural-final.png',
    });
    await writeFile(
      evidence + '/six-player-natural.json',
      JSON.stringify(
        {
          profile:
            'DEV spawn only; no pose/HP/rank/position fixture; actual level1 joins and keyboard commands',
          seconds: (Date.now() - began) / 1000,
          damaged,
          phase2,
          dead,
          samples,
          final: s,
          presentation: v,
          errors,
        },
        null,
        2,
      ),
    );
    expect(errors).toEqual([]);
    await fixture(request, roomId, { op: 'inspect' });
  } finally {
    for (const c of contexts) await c.close();
  }
});
