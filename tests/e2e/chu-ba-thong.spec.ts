import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { joinWaiting, startTogether } from './pregame-helper.js';
import type { ChuView } from '@volam/game-core';
const out =
  process.env['VOLAM_CHU_BA_THONG_EVIDENCE'] ?? 'docs/evidence/chu-ba-thong';
interface Snap {
  roomId: string;
  sessionId: string;
  state: {
    tick: number;
    players: Record<
      string,
      {
        x: number;
        y: number;
        hp: number;
        maxHp: number;
        level: number;
        xp: number;
        gold: number;
        zoneId: string;
        bossItems: string;
        lastSequence: number;
      }
    >;
    dungeons: Record<string, { tick: number; encounter: string }>;
    creeps: Record<string, { hp: number; zoneId: string }>;
  };
  events: Array<{
    kind: string;
    sourceId: string;
    targetId: string;
    abilityId: string;
    damage: number;
  }>;
}
interface View {
  zoneId: string;
  chu: {
    state: ChuView;
    observed: Record<string, string[]>;
    clips: Array<{
      bundle: string;
      name: string;
      frames: string[];
      fps: number;
    }>;
    sprites: Array<{
      id: string;
      x: number;
      y: number;
      frame: string;
      texture: string;
      depth: number;
      origin: number[];
      scale: number;
    }>;
  };
}
const read = (p: Page): Promise<Snap> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const view = (p: Page): Promise<View> =>
  p.evaluate('window.__VOLAM__.presentation()');
const hero = async (p: Page) => {
  const s = await read(p);
  return s.state.players[s.sessionId]!;
};
async function enter(p: Page, access = 'shared', livingBoss = true) {
  await p.getByRole('button', { name: 'Phó Bản', exact: true }).click();
  await p.locator('[data-destination=chu_ba_thong]').click();
  await expect(p.locator('#dungeon-kind')).toHaveText('Thủ lĩnh');
  await p.locator(`[data-access=${access}]`).click();
  await p.locator('#enter-dungeon').click();
  await expect
    .poll(async () => (await hero(p)).zoneId)
    .toContain('chu_ba_thong_');
  if (livingBoss)
    await expect
      .poll(async () => (await view(p)).chu?.state?.bossHp)
      .toBeGreaterThan(0);
  else
    await expect
      .poll(async () => (await view(p)).chu?.state?.bossId)
      .toBe('chu_ba_thong');
}
async function fixture(p: Page, mode: string, phase?: string) {
  const s = await read(p);
  const r = await p.request.post(
    `/__chu?room=${s.roomId}&mode=${mode}&zone=${(await hero(p)).zoneId}${phase ? '&phase=' + phase : ''}`,
  );
  expect(await r.text()).not.toContain('Error');
  expect(r.ok()).toBe(true);
}
test('Chu Bá Thông real Phaser encounter, party sync, frame coverage and one-drop rewards', async ({
  browser,
}) => {
  const count = Number(process.env['VOLAM_CHU_QA_PLAYERS'] ?? 6),
    contexts = [],
    pages: Page[] = [],
    errors: string[] = [];
  mkdirSync(out, { recursive: true });
  const started = Date.now();
  let naturalDeathsObserved = 0;
  let palmDodged = false;
  let movingFieldsVerified = false;
  try {
    for (let i = 0; i < count; i++) {
      const ctx = await browser.newContext({
        viewport: { width: 1280, height: 720 },
      });
      contexts.push(ctx);
      const p = await ctx.newPage();
      pages.push(p);
      p.on('pageerror', (e) => errors.push(e.message));
      p.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      await joinWaiting(
        p,
        'Chu QA ' + i,
        i ? (await read(pages[0]!)).roomId : undefined,
        '/?debug=1',
        30000,
      );
    }
    await startTogether(
      pages,
      Array.from(
        { length: count },
        (_, i) => ['cai_bang', 'thien_son', 'vo_dang', 'thieu_lam'][i % 4]!,
      ),
      30000,
    );
    await Promise.all(pages.map((p) => enter(p)));
    const first = pages[0]!;
    await fixture(first, 'park');
    // Every client observes the same authoritative boss identity/HP in the shared instance.
    for (const p of pages) {
      expect((await hero(p)).zoneId).toBe('chu_ba_thong_shared');
      await expect
        .poll(async () => (await view(p)).chu?.state?.bossHp)
        .toBe(6000);
    }
    const hpBox = await first.locator('#boss-hud').boundingBox(),
      statueBox = await first.locator('#defense-hud').boundingBox();
    expect(hpBox).not.toBeNull();
    expect(statueBox).not.toBeNull();
    expect(
      hpBox!.x >= statueBox!.x + statueBox!.width ||
        hpBox!.y + hpBox!.height <= statueBox!.y ||
        statueBox!.y + statueBox!.height <= hpBox!.y,
    ).toBe(true);
    const body = (await view(first)).chu.sprites.find((s) => s.id === 'boss')!;
    expect(body.origin).toEqual([0.5, 80 / 96]);
    expect(body.depth).toBeCloseTo(body.y + 0.3, 1);
    expect(body.scale).toBe(1);
    await first.screenshot({ path: out + `/arena-${count}-players.png` });
    const before = await hero(first);
    await first.locator('#game canvas').focus();
    await first.keyboard.press('ArrowRight', { delay: 300 });
    await expect
      .poll(async () => (await hero(first)).x)
      .toBeGreaterThan(before.x + 10);
    if (pages[1]) {
      const id = (await read(first)).sessionId;
      await expect
        .poll(async () => (await read(pages[1]!)).state.players[id]?.x)
        .toBeGreaterThan(before.x + 10);
    }
    // Observe actual Phaser AnimationState frames, with the server parked only for this art fixture.
    const clips = (await view(first)).chu.clips;
    for (const clip of clips) {
      const duration = Math.ceil((clip.frames.length / clip.fps) * 1000) + 180;
      await first.evaluate(
        ({ bundle, name, duration }) => {
          (
            window as unknown as {
              __VOLAM__: {
                reviewChu: (
                  b: string,
                  n: string,
                  x: number,
                  y: number,
                  ms: number,
                ) => void;
              };
            }
          ).__VOLAM__.reviewChu(bundle, name, 620, 420, duration + 100);
        },
        { bundle: clip.bundle, name: clip.name, duration },
      );
      await expect
        .poll(
          async () =>
            new Set(
              (await view(first)).chu.observed[
                'chu:' + clip.bundle + ':' + clip.name
              ] ?? [],
            ).size,
          { timeout: duration + 3000, intervals: [50, 100] },
        )
        .toBe(clip.frames.length);
    }
    for (const phase of [
      'sweep',
      'fists',
      'palm',
      'hands',
      'trap',
      'spin',
      'reflect',
      'ultimate',
      'drink',
    ]) {
      await fixture(first, 'phase', phase);
      await expect
        .poll(async () => (await view(first)).chu.state.phase)
        .toBe(phase);
      await first.waitForTimeout(550);
      if (phase === 'palm') {
        const v = (await view(first)).chu;
        const shot = v.state.missiles[0]!;
        expect(shot).toBeDefined();
        const candidates = await Promise.all(
          pages.map(async (p) => ({ p, h: await hero(p) })),
        );
        const target = candidates.sort(
          (a, b) =>
            Math.hypot(a.h.x - v.state.bossX, a.h.y - v.state.bossY) -
            Math.hypot(b.h.x - v.state.bossX, b.h.y - v.state.bossY),
        )[0]!;
        const sprite = v.sprites.find((s) => s.id === 'missile:' + shot.id)!;
        expect(Math.hypot(sprite.x - shot.x, sprite.y - shot.y)).toBeLessThan(
          2,
        );
        await target.p.locator('#game canvas').focus();
        await target.p.keyboard.down('ArrowRight');
        await first.waitForTimeout(140);
        const same = (await view(first)).chu.state.missiles.find(
          (p) => p.id === shot.id,
        )!;
        expect(same.vx).toBe(shot.vx);
        expect(same.vy).toBe(shot.vy);
        await first.waitForTimeout(480);
        await target.p.keyboard.up('ArrowRight');
        expect((await hero(target.p)).x).toBeGreaterThan(target.h.x + 50);
        expect((await hero(target.p)).hp).toBe(target.h.hp);
        palmDodged = true;
        await target.p.screenshot({
          path: out + `/palm-dodge-${count}-players.png`,
        });
      }
      if (phase === 'spin') {
        // The boss leaves this camera immediately; sample after its first rebound.
        await first.waitForTimeout(850);
        const v = (await view(first)).chu;
        const body = v.sprites.find((s) => s.id === 'boss')!;
        expect(body.texture).toBe('chu_boss');
        expect(body.frame).toMatch(/^spin_/);
        expect(
          Math.hypot(body.x - v.state.bossX, body.y - v.state.bossY),
        ).toBeLessThan(2);
        expect(v.sprites.some((s) => s.id.startsWith('spin:ghost:'))).toBe(
          true,
        );
      }
      if (phase === 'ultimate') {
        const before = (await view(first)).chu.state.fields;
        await first.waitForTimeout(400);
        const v = (await view(first)).chu;
        expect(
          v.state.fields.every(
            (f, i) => f.x !== before[i]!.x || f.y !== before[i]!.y,
          ),
        ).toBe(true);
        expect(v.state.fields.some((f) => f.active)).toBe(true);
        for (const f of v.state.fields) {
          const sprite = v.sprites.find((s) => s.id === 'field:' + f.id)!;
          expect(Math.hypot(sprite.x - f.x, sprite.y - f.y)).toBeLessThan(2);
          expect(sprite.scale).toBeCloseTo(f.radius / 45, 5);
        }
        movingFieldsVerified = true;
      }
      if (phase === 'hands') {
        await first.locator('#game canvas').focus();
        // Escape both crossing axes; staying on the horizontal axis takes two palms.
        await first.keyboard.down('ArrowRight');
        await first.keyboard.down('ArrowDown');
        await first.waitForTimeout(1100);
        await first.keyboard.up('ArrowRight');
        await first.keyboard.up('ArrowDown');
        await expect
          .poll(async () => (await view(first)).chu.state.hands[0]?.stage, {
            intervals: [50],
          })
          .toBe('travel');
        await expect
          .poll(async () => (await view(first)).chu.state.hands[0]?.stage, {
            intervals: [50],
          })
          .toBe('impact');
        await first.screenshot({
          path: out + `/hands-impact-${count}-players.png`,
        });
        await expect
          .poll(async () => (await view(first)).chu.state.hands[0]?.stage, {
            intervals: [50],
          })
          .toBe('dissipate');
        const deadPeers = [];
        for (const p of pages) if ((await hero(p)).hp <= 0) deadPeers.push(p);
        naturalDeathsObserved += deadPeers.length;
        await fixture(first, 'park');
        for (const p of deadPeers) {
          await expect
            .poll(async () => (await hero(p)).zoneId, { timeout: 10000 })
            .toBe('arena');
          await expect.poll(async () => (await hero(p)).hp).toBeGreaterThan(0);
          await enter(p);
        }
      }
      if (phase === 'drink')
        await expect
          .poll(async () => (await view(first)).chu.state.disciples.length)
          .toBe(count);
      if (phase === 'spin' || phase === 'hands' || phase === 'ultimate')
        await first.screenshot({
          path: out + `/${phase}-${count}-players.png`,
        });
    }
    // Legal level-30 build benchmark; real A/skills damage, boss rules and input cadence remain unchanged.
    await fixture(first, 'combat');
    await expect.poll(async () => (await hero(first)).level).toBe(30);
    const stop = Date.now() + 60000;
    let defeated = false;
    await Promise.all(
      pages.map(async (p) => {
        await p.locator('#game canvas').focus();
        while (Date.now() < stop && !defeated) {
          const v = (await view(p)).chu.state as ChuView | null;
          const h = await hero(p);
          if (!v) {
            if (h.zoneId === 'arena' && h.hp > 0)
              await enter(p, 'shared', false);
            else await p.waitForTimeout(150);
            continue;
          }
          if (v.bossHp <= 0) {
            defeated = true;
            break;
          }
          if (h.hp <= 0) {
            await p.waitForTimeout(150);
            continue;
          }
          const moving: string[] = [];
          if (Math.hypot(v.bossX - h.x, v.bossY - h.y) > 65) {
            if (Math.abs(v.bossX - h.x) > 15)
              moving.push(v.bossX > h.x ? 'ArrowRight' : 'ArrowLeft');
            if (Math.abs(v.bossY - h.y) > 15)
              moving.push(v.bossY > h.y ? 'ArrowDown' : 'ArrowUp');
          }
          for (const key of moving) await p.keyboard.down(key);
          await p.keyboard.press('KeyA');
          await p.keyboard.press('KeyQ');
          await p.keyboard.press('KeyW');
          await p.waitForTimeout(110);
          for (const key of moving) await p.keyboard.up(key);
        }
      }),
    );
    // A recovered participant can return even when its teammate finished the boss.
    if (!(await view(first)).chu.state) {
      await expect.poll(async () => (await hero(first)).hp).toBeGreaterThan(0);
      await enter(first, 'shared', false);
    }
    await expect
      .poll(async () => (await view(first)).chu.state.bossHp, {
        timeout: 10000,
      })
      .toBe(0);
    await expect
      .poll(async () => (await view(first)).chu.state.loot.length)
      .toBe(1);
    const loot = (await view(first)).chu.state.loot[0]!;
    expect(loot.eligible.length).toBeGreaterThan(0);
    for (const p of pages) {
      const id = (await read(p)).sessionId;
      if (loot.eligible.includes(id) && loot.state === 'rolling')
        await p.locator('#chu-loot button[data-action=roll]').click();
    }
    await expect
      .poll(async () => (await view(first)).chu.state.loot[0]!.state)
      .toBe('claimed');
    const final = await read(first);
    expect(
      Object.values(final.state.players).reduce(
        (n, h) => n + (JSON.parse(h.bossItems) as string[]).length,
        0,
      ),
    ).toBe(1);
    expect(final.events.some((e) => e.kind === 'hit' && e.damage > 0)).toBe(
      true,
    );
    await first.screenshot({
      path: out + `/natural-combat-loot-${count}-players.png`,
    });
    // Physical return and private-instance rendering use real menu/Space messages.
    const sharedSnapshot = await read(first),
      sharedId = sharedSnapshot.sessionId;
    const exitArrangement = await first.request.post(
      `/__chu?room=${sharedSnapshot.roomId}&mode=exit&hero=${sharedId}`,
    );
    expect(exitArrangement.ok()).toBe(true);
    await expect.poll(async () => (await hero(first)).y).toBe(610);
    await first.locator('#game canvas').focus();
    await first.keyboard.press('Space');
    await expect.poll(async () => (await hero(first)).zoneId).toBe('arena');
    await expect(first.locator('#boss-hud')).toBeHidden();
    await enter(first, 'private');
    const privateId = (await hero(first)).zoneId;
    expect(privateId).toBe('chu_ba_thong_private_' + sharedId);
    await expect
      .poll(async () => (await view(first)).chu.state.bossHp)
      .toBe(6000);
    if (pages[1]) {
      expect((await hero(pages[1])).zoneId).toBe('chu_ba_thong_shared');
      expect((await read(pages[1])).state.dungeons[privateId]).toBeUndefined();
    }
    await fixture(first, 'phase', 'trap');
    await expect
      .poll(async () => (await view(first)).chu.state.trap?.released)
      .toBe(true);
    await first.setViewportSize({ width: 960, height: 600 });
    const vp = await first.locator('#viewport').boundingBox(),
      canvas = await first.locator('#game canvas').boundingBox();
    expect(canvas!.width).toBe(vp!.width);
    expect(canvas!.height).toBe(vp!.height);
    const hud = await first.locator('#boss-hud').boundingBox();
    expect(hud!.x).toBeGreaterThanOrEqual(vp!.x);
    expect(hud!.x + hud!.width).toBeLessThanOrEqual(vp!.x + vp!.width);
    await first.screenshot({ path: out + `/private-960-${count}-players.png` });
    expect(errors).toEqual([]);
    writeFileSync(
      out + `/report-${count}-players.json`,
      JSON.stringify(
        {
          players: count,
          naturalDeathsObserved,
          palmDodged,
          movingFieldsVerified,
          elapsedMs: Date.now() - started,
          artClips: clips.length,
          observed: (await view(first)).chu.observed,
          loot: final.state.dungeons['chu_ba_thong_shared']?.encounter,
          privateInstance: privateId,
          errors,
          scope:
            'Real Phaser/network; parked server art fixture plus legal level30 natural combat benchmark; no recordings',
        },
        null,
        2,
      ),
    );
  } finally {
    for (const ctx of contexts) await ctx.close();
  }
});
