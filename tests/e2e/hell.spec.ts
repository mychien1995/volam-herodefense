import { expect, test, type Page } from '@playwright/test';
import { Client, type Room } from '@colyseus/sdk';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
import { hellDungeon, m1Config } from '@volam/game-data';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
import type { Snap, View as BaseView } from './desert.spec.js';
import { joinWaiting, startTogether } from './pregame-helper.js';
const out = 'docs/evidence/hell-integration-2026-11-01';
type View = BaseView & {
  hellScenery: BaseView['desertScenery'];
  hellLavaTile: number;
  hellLavaPhases: number[];
  creepEffects: {
    played: string[];
    completed: string[];
    observedFrames: string[];
    contacts: number;
  };
};
interface Art {
  id: string;
  archetypeId: string;
  footPivot: number[];
  frameSize: number[];
  groundAnchorPx: number[];
  animations: Array<{
    state: string;
    direction: string;
    frames: string[];
    durations: number[];
    repeat: number;
  }>;
}
const manifest = () =>
  JSON.parse(readFileSync('assets/hell_dungeon.manifest.json', 'utf8')) as {
    assets: Art[];
    scenery: Array<{ id: string; size: number[]; pivot: number[] }>;
  };
const read = (p: Page): Promise<Snap> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const view = (p: Page): Promise<View> =>
  p.evaluate('window.__VOLAM__.presentation()');
const hero = async (p: Page) => {
  const s = await read(p);
  return s.state.players[s.sessionId]! as Snap['state']['players'][string] & {
    pose: string;
    mana: number;
  };
};
function monitor(p: Page) {
  const errors: string[] = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  p.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  return errors;
}
async function enter(
  p: Page,
  destination = 'hell',
  access: 'private' | 'shared' = 'shared',
) {
  await p.getByRole('button', { name: 'Phó Bản', exact: true }).click();
  await p.locator(`[data-destination=${destination}]`).click();
  await expect(p.locator(`[data-destination=${destination}]`)).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await p
    .getByRole('radio', {
      name: access === 'private' ? 'Riêng' : 'Chung',
      exact: true,
    })
    .click();
  await p.locator('#enter-dungeon').click();
  await expect
    .poll(async () => (await hero(p)).zoneId)
    .toMatch(new RegExp('^' + destination + '_'));
  await expect
    .poll(async () => (await view(p)).zoneId)
    .toBe((await hero(p)).zoneId);
  await expect(p.getByRole('dialog')).toBeHidden();
}
async function fixture(p: Page, query: string) {
  const room = (await read(p)).roomId;
  const r = await p.request.post(
    `/__hell?room=${encodeURIComponent(room)}&${query}`,
    // Test-only replacement arrangement is idempotent. Retry TCP ECONNRESET,
    // never HTTP failures or gameplay messages.
    { maxRetries: 2 },
  );
  expect(r.ok(), await r.text()).toBe(true);
  return (await r.json()) as { ids: string[] };
}
async function moveTo(p: Page, x: number, y: number) {
  await p.bringToFront();
  await p.locator('#game canvas').focus();
  const zone = (await hero(p)).zoneId;
  for (const [axis, target, neg, pos] of [
    ['x', x, 'ArrowLeft', 'ArrowRight'],
    ['y', y, 'ArrowUp', 'ArrowDown'],
  ] as const) {
    for (let i = 0; i < 70; i++) {
      const h = await hero(p),
        delta = target - h[axis];
      expect(
        h.zoneId,
        'walking must not silently continue after death/respawn',
      ).toBe(zone);
      if (Math.abs(delta) <= 7) break;
      await p.keyboard.press(delta < 0 ? neg : pos, {
        delay: Math.min(600, Math.max(45, Math.abs(delta) * 5)),
      });
      await expect
        .poll(async () => (await hero(p)).lastSequence)
        .toBeGreaterThan(h.lastSequence);
      await expect.poll(async () => (await hero(p)).pose).not.toBe('walk');
    }
    expect(
      Math.abs((await hero(p))[axis] - target),
      `walk ${axis} to ${target}: ${JSON.stringify(await hero(p))}`,
    ).toBeLessThanOrEqual(7);
  }
}
async function exit(p: Page, x: number, y: number) {
  // Use the actual bridge centre; y=640 hugs its solid transition edge.
  const h = await hero(p);
  if (h.zoneId.startsWith('hell_')) await moveTo(p, h.x, 720);
  await moveTo(p, x, y);
  await expect(p.locator('#dungeon-exit-hint')).toBeVisible();
  await p.keyboard.press('Space');
  await expect.poll(async () => (await hero(p)).zoneId).toBe('arena');
  await expect.poll(async () => (await view(p)).hellScenery.length).toBe(0);
}
async function failure(p: Page, name: string, errors: string[]) {
  await p.screenshot({ path: `${out}/${name}-failure.png` });
  writeFileSync(
    `${out}/${name}-failure.json`,
    JSON.stringify(
      {
        view: await view(p).catch(() => null),
        snapshot: await read(p).catch(() => null),
        pregame: await p
          .locator('#pregame')
          .innerText()
          .catch(() => null),
        errors,
      },
      null,
      2,
    ),
  );
}
test('two clients observe all Hell frames and phases, exact pivots, timings and terminal poses', async ({
  browser,
}) => {
  mkdirSync(out, { recursive: true });
  const contexts = await Promise.all(
    [0, 1].map(() =>
      browser.newContext({ viewport: { width: 1280, height: 720 } }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage())),
    errors = pages.map(monitor);
  try {
    await joinWaiting(pages[0]!, 'Hell Art 1');
    await joinWaiting(pages[1]!, 'Hell Art 2', (await read(pages[0]!)).roomId);
    await startTogether(pages);
    for (const p of pages) await enter(p);
    const m = manifest(),
      poses = [
        ...new Set(m.assets.flatMap((a) => a.animations.map((t) => t.state))),
      ];
    for (const pose of poses)
      for (const direction of ['down', 'left', 'right', 'up']) {
        const { ids } = await fixture(
          pages[0]!,
          `mode=pose&pose=${pose}&direction=${direction}`,
        );
        const selected = m.assets
          .map((a, i) => ({
            a,
            i,
            tag: a.animations.find(
              (t) =>
                t.state === pose &&
                (t.direction === direction || t.direction === 'shared'),
            ),
          }))
          .filter((v) => v.tag);
        for (const p of pages) {
          await expect
            .poll(
              async () => {
                const v = await view(p);
                return selected.every(({ a, i, tag }) => {
                  const key = `${a.id}:${pose}:${tag!.direction}`;
                  return (
                    v.actors.some(
                      (actor) => actor.id === ids[i] && actor.animation === key,
                    ) &&
                    tag!.frames.every((f) =>
                      v.observedCreepFrames[key]?.includes(f),
                    ) &&
                    (tag!.repeat === -1
                      ? (v.creepRepeats[key] ?? 0) > 0
                      : v.completedAnimations.some(
                          (c) => c.id === ids[i] && c.key === key,
                        ))
                  );
                });
              },
              {
                timeout: 10000,
                intervals: [80],
                message: pose + ':' + direction,
              },
            )
            .toBe(true);
          const v = await view(p);
          const canvas = await p.locator('#game canvas').evaluate((c) => ({
            width: (c as HTMLCanvasElement).width,
            height: (c as HTMLCanvasElement).height,
          }));
          for (const { a, i, tag } of selected) {
            const actor = v.actors.find((o) => o.id === ids[i])!,
              key = `${a.id}:${pose}:${tag!.direction}`;
            expect(actor.origin).toEqual(a.footPivot);
            expect(actor.scale).toEqual([1, 1]);
            expect(actor.depth).toBe(actor.y);
            expect(actor.x - a.groundAnchorPx[0]!).toBeGreaterThanOrEqual(
              v.camera.x,
            );
            expect(
              actor.x + a.frameSize[0]! - a.groundAnchorPx[0]!,
            ).toBeLessThanOrEqual(v.camera.x + canvas.width);
            expect(actor.y - a.groundAnchorPx[1]!).toBeGreaterThanOrEqual(
              v.camera.y,
            );
            expect(
              actor.y + a.frameSize[1]! - a.groundAnchorPx[1]!,
            ).toBeLessThanOrEqual(v.camera.y + canvas.height);
            expect(new Set(v.observedCreepFrames[key])).toEqual(
              new Set(tag!.frames),
            );
            const times = v.creepFrameTimes[key]!.filter(
              (t) => t.id === ids[i],
            );
            for (
              let n = 0;
              n < Math.min(tag!.frames.length - 1, times.length - 1);
              n++
            )
              expect(
                Math.abs(times[n + 1]!.at - times[n]!.at - tag!.durations[n]!),
              ).toBeLessThan(180);
            if (tag!.repeat === 0) {
              expect(actor.frame).toBe(tag!.frames.at(-1));
              expect(actor.playing).toBe(false);
            }
          }
        }
        if (pose === 'idle' && direction === 'down')
          await pages[0]!.screenshot({ path: out + '/hell-frames-1280.png' });
      }
    const tiles = new Set<number>();
    await expect
      .poll(
        async () => {
          tiles.add((await view(pages[0]!)).hellLavaTile);
          return tiles.size;
        },
        { intervals: [40] },
      )
      .toBe(8);
    const v = await view(pages[0]!);
    expect(v.hellLavaPhases.sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(v.zoom).toBe(1);
    expect(v.rotation).toBe(0);
    const observed = Object.fromEntries(
      Object.entries(v.observedCreepFrames).filter(([key]) =>
        key.startsWith('hell_'),
      ),
    );
    expect(Object.keys(observed)).toHaveLength(92);
    writeFileSync(
      out + '/frames.json',
      JSON.stringify(
        {
          players: 2,
          controlledServerPoses: true,
          naturalCombat: false,
          observed,
          repeats: v.creepRepeats,
          timings: v.creepFrameTimes,
          waterTiles: [...tiles],
          errors: errors.flat(),
        },
        null,
        2,
      ),
    );
    expect(errors.flat()).toEqual([]);
  } catch (e) {
    await failure(pages[0]!, 'frames', errors.flat());
    await failure(pages[1]!, 'frames-peer', errors.flat());
    throw e;
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});

test('six clients fight Hell creeps with real rewards, contact effects, lava boundary collision and Space return', async ({
  browser,
}) => {
  mkdirSync(out, { recursive: true });
  const contexts = await Promise.all(
    [0, 1].map(() =>
      browser.newContext({ viewport: { width: 1920, height: 1080 } }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage())),
    errors = pages.map(monitor),
    bots: Room<MatchRoom>[] = [];
  const timers: ReturnType<typeof setInterval>[] = [];
  const client = new Client('http://127.0.0.1:2700');
  try {
    const a = pages[0]!;
    await joinWaiting(a, 'Biển 1');
    const room = (await read(a)).roomId;
    await joinWaiting(pages[1]!, 'Biển 2', room);
    for (let i = 0; i < 4; i++) {
      const bot = await client.joinById<MatchRoom>(room, {
        nickname: `Biển ${i + 3}`,
        protocolVersion: PROTOCOL_VERSION,
      });
      bots.push(bot);
      bot.onMessage('*', () => {});
      await expect.poll(() => bot.state?.phase).toBe('WAITING_LOBBY');
    }
    await Promise.all([
      startTogether(pages, ['thieu_lam', 'cai_bang']),
      ...bots.map(async (b, i) => {
        await expect.poll(() => b.state.phase).toBe('SCHOOL_SELECTION');
        b.send('lobby-action', {
          action: 'select',
          schoolId: (
            ['vo_dang', 'thien_son', 'thieu_lam', 'cai_bang'] as const
          )[i]!,
        });
        b.send('lobby-action', {
          action: 'branch',
          basicId: [
            'vo_dang_quyen',
            'thien_son_phien',
            'thieu_lam_quyen',
            'cai_bang_bong',
          ][i]!,
        });
        b.send('lobby-action', { action: 'confirm' });
      }),
    ]);
    for (const p of pages) await enter(p);
    for (const b of bots) {
      b.send('dungeon-action', {
        protocolVersion: PROTOCOL_VERSION,
        sequence: 1,
        action: 'enter',
        access: 'shared',
        destination: 'hell',
      });
      await expect
        .poll(() => b.state.players.get(b.sessionId)?.zoneId)
        .toBe('hell_shared');
    }
    await fixture(a, 'mode=combat');
    await expect
      .poll(
        async () =>
          (await view(a)).actors.filter((o) => o.texture.startsWith('hero_'))
            .length,
      )
      .toBe(6);
    await expect
      .poll(async () => Object.values((await read(a)).state.creeps).length)
      .toBe(6);
    const v = await view(a),
      m = manifest();
    for (const prop of v.hellScenery) {
      const art = m.scenery.find((s) => s.id === prop.name)!;
      expect(prop.origin).toEqual(art.pivot.map((n, i) => n / art.size[i]!));
      expect(prop.scale).toEqual([1, 1]);
      expect(
        prop.name === 'hanging_chains' ? [10000] : [-9000, prop.y],
      ).toContain(prop.depth);
    }
    expect(await a.locator('#viewport').boundingBox()).toEqual(
      await a.locator('#game canvas').boundingBox(),
    );
    await a.screenshot({ path: out + '/hell-six-player-1920.png' });
    for (const p of pages) {
      await p.locator('#game canvas').focus();
      await p.evaluate(() => {
        const timer = window.setInterval(() => {
          for (const type of ['keydown', 'keyup'])
            window.dispatchEvent(
              new KeyboardEvent(type, {
                code: 'KeyA',
                key: 'a',
                bubbles: true,
              }),
            );
        }, 160);
        Object.assign(window, { __hellAttackTimer: timer });
      });
    }
    for (const b of bots) {
      let sequence = 1;
      timers.push(
        setInterval(
          () =>
            b.send('input', {
              protocolVersion: PROTOCOL_VERSION,
              sequence: ++sequence,
              kind: 'basic',
            }),
          160,
        ),
      );
    }
    await expect
      .poll(
        async () =>
          (await read(a)).events.filter(
            (e) => e.kind === 'hit' && e.zoneId === 'hell_shared',
          ).length,
      )
      .toBeGreaterThan(0);
    await a.setViewportSize({ width: 1280, height: 720 });
    await a.screenshot({ path: out + '/hell-combat-1280.png' });
    const observedDeaths = new Set<string>();
    await expect
      .poll(
        async () => {
          for (const event of (await read(a)).events)
            if (
              event.kind === 'death' &&
              event.targetId.startsWith('hell_shared:combat_')
            )
              observedDeaths.add(event.targetId);
          return observedDeaths.size;
        },
        { timeout: 45000, intervals: [100] },
      )
      .toBe(6);
    for (const t of timers) clearInterval(t);
    await Promise.all(
      pages.map((p) =>
        p.evaluate(() =>
          window.clearInterval(
            (window as unknown as { __hellAttackTimer: number })
              .__hellAttackTimer,
          ),
        ),
      ),
    );
    const after = await read(a);
    expect(
      Object.values(after.state.players).reduce((sum, h) => sum + h.xp, 0),
    ).toBe(360);
    await expect
      .poll(async () =>
        Object.values((await read(pages[1]!)).state.players).reduce(
          (sum, h) => sum + h.xp,
          0,
        ),
      )
      .toBe(360);
    await expect
      .poll(async () => (await read(a)).state.dungeons['hell_shared']?.wave)
      .toBe(2);
    expect(
      (await view(a)).creepEffects.played.some((id) => id.startsWith('hell_')),
    ).toBe(true);
    const departing = bots.pop()!;
    const departingId = departing.sessionId;
    await departing.leave();
    for (const p of pages) {
      await expect
        .poll(async () => (await read(p)).state.players[departingId])
        .toBeUndefined();
      await expect
        .poll(async () =>
          (await view(p)).actors.some((o) => o.id === departingId),
        )
        .toBe(false);
    }
    await moveTo(a, 704, 720);
    await a.keyboard.press('ArrowUp', { delay: 650 });
    expect((await hero(a)).y).toBeGreaterThanOrEqual(640 + m1Config.radius);
    await moveTo(a, 704, 720);
    await exit(a, hellDungeon.exit.x, hellDungeon.exit.y);
    expect(await hero(a)).toMatchObject({ ...hellDungeon.arenaReturn });
    expect(
      (await view(a)).actors.every((o) => !o.texture.startsWith('hell_')),
    ).toBe(true);
    expect((await view(a)).creepEffects.contacts).toBe(0);
    writeFileSync(
      out + '/combat.json',
      JSON.stringify(
        {
          players: 6,
          browserContexts: 2,
          sdkClients: 4,
          naturalCombat: true,
          arrangementOnlyFixture: true,
          totalXp: 360,
          deaths: 6,
          waveAdvanced: true,
          lavaCollision: true,
          physicalSpaceExit: true,
          contactEffects: true,
          disconnectedPeerRemovedOnBothBrowsers: true,
          errors: errors.flat(),
        },
        null,
        2,
      ),
    );
    expect(errors.flat()).toEqual([]);
  } catch (e) {
    await failure(pages[0]!, 'combat', errors.flat());
    throw e;
  } finally {
    for (const t of timers) clearInterval(t);
    await Promise.all(bots.map((b) => b.leave()));
    await Promise.all(
      pages.map((p) =>
        p
          .evaluate(() =>
            window.clearInterval(
              (window as unknown as { __hellAttackTimer: number })
                .__hellAttackTimer,
            ),
          )
          .catch(() => {}),
      ),
    );
    await Promise.all(contexts.map((c) => c.close()));
  }
});

test('Hell private instances pause independently and desert selection remains available', async ({
  browser,
}) => {
  const contexts = await Promise.all(
    [0, 1].map(() =>
      browser.newContext({ viewport: { width: 1280, height: 720 } }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage())),
    errors = pages.map(monitor);
  try {
    const a = pages[0]!,
      b = pages[1]!;
    await joinWaiting(a, 'Bờ Biển A');
    await joinWaiting(b, 'Bờ Biển B', (await read(a)).roomId);
    await startTogether(pages);
    for (const p of pages) await enter(p, 'hell', 'private');
    const za = (await hero(a)).zoneId,
      zb = (await hero(b)).zoneId;
    expect(za).not.toBe(zb);
    expect((await read(a)).state.dungeons[zb]).toBeUndefined();
    expect((await read(b)).state.dungeons[za]).toBeUndefined();
    const peerId = (await read(b)).sessionId;
    expect((await view(a)).actors.some((o) => o.id === peerId)).toBe(false);
    await exit(a, 1664, 704);
    await expect
      .poll(async () => (await read(a)).state.dungeons[za]?.paused)
      .toBe(true);
    const tick = (await read(a)).state.dungeons[za]!.tick,
      start = (await read(a)).state.tick;
    await expect
      .poll(async () => (await read(a)).state.tick)
      .toBeGreaterThan(start + 12);
    expect((await read(a)).state.dungeons[za]!.tick).toBe(tick);
    await enter(a, 'desert');
    await expect(a.locator('#zone-status')).toContainText('Sa Mạc');
    expect((await view(a)).hellScenery).toHaveLength(0);
    expect((await view(a)).desertScenery.length).toBeGreaterThan(0);
    await exit(a, 768, 944);
    await enter(a, 'sea');
    await expect(a.locator('#zone-status')).toContainText('Biển');
    await exit(a, 352, 288);
    await enter(a, 'hell', 'private');
    expect((await hero(a)).zoneId).toBe(za);
    await expect
      .poll(async () => (await read(a)).state.dungeons[za]!.tick)
      .toBeGreaterThan(tick);
    expect(errors.flat()).toEqual([]);
  } catch (e) {
    await failure(pages[0]!, 'private', errors.flat());
    throw e;
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
