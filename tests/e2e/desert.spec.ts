import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { joinWaiting, startTogether } from './pregame-helper.js';
import { Client, type Room } from '@colyseus/sdk';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
import { m1Config } from '@volam/game-data';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
const evidence = 'docs/evidence/desert-integration-2026-10-31';
export interface Actor {
  x: number;
  y: number;
  hp: number;
  xp: number;
  gold: number;
  zoneId: string;
  lastSequence: number;
  archetypeId?: string;
}
export interface Snap {
  sessionId: string;
  roomId: string;
  state: {
    tick: number;
    players: Record<string, Actor>;
    creeps: Record<string, Actor>;
    dungeons: Record<string, { wave: number; tick: number; paused: boolean }>;
  };
  events: Array<{
    kind: string;
    sourceId: string;
    targetId: string;
    zoneId: string;
  }>;
}
export interface View {
  zoneId: string;
  zoom: number;
  rotation: number;
  sceneTime: number;
  camera: { x: number; y: number };
  observedCreepFrames: Record<string, string[]>;
  creepRepeats: Record<string, number>;
  creepFrameTimes: Record<
    string,
    Array<{ id: string; frame: string; at: number }>
  >;
  completedAnimations: Array<{ id: string; key: string; at: number }>;
  actors: Array<{
    id: string;
    x: number;
    y: number;
    depth: number;
    texture: string;
    animation: string;
    frame: string;
    origin: number[];
    scale: number[];
    playing: boolean;
  }>;
  desertScenery: Array<{
    name: string;
    x: number;
    y: number;
    depth: number;
    origin: number[];
    scale: number[];
  }>;
}
const read = (p: Page): Promise<Snap> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const view = (p: Page): Promise<View> =>
  p.evaluate('window.__VOLAM__.presentation()');
const hero = async (p: Page) => {
  const s = await read(p);
  return s.state.players[s.sessionId]!;
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
async function enter(p: Page, access: 'private' | 'shared' = 'shared') {
  await p.getByRole('button', { name: 'Phó Bản', exact: true }).click();
  await p.locator('[data-destination=desert]').click();
  await expect(p.locator('[data-destination=desert]')).toHaveAttribute(
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
  await expect.poll(async () => (await hero(p)).zoneId).toMatch(/^desert_/);
  await expect
    .poll(async () => (await view(p)).zoneId)
    .toBe((await hero(p)).zoneId);
  await expect(p.getByRole('dialog')).toBeHidden();
  await expect(p.locator('#zone-status')).toContainText('Sa Mạc');
}
async function fixture(p: Page, query: string) {
  const room = (await read(p)).roomId;
  const r = await p.request.post(
    `/__desert?room=${encodeURIComponent(room)}&${query}`,
  );
  expect(r.ok(), await r.text()).toBe(true);
  return (await r.json()) as { ids: string[] };
}
async function moveTo(p: Page, x: number, y: number) {
  await p.bringToFront();
  await p.locator('#game canvas').focus();
  for (const [axis, target, neg, pos] of [
    ['x', x, 'ArrowLeft', 'ArrowRight'],
    ['y', y, 'ArrowUp', 'ArrowDown'],
  ] as const) {
    for (let n = 0; n < 60; n++) {
      const h = await hero(p),
        delta = target - h[axis];
      if (Math.abs(delta) <= 7) break;
      await p.keyboard.press(delta < 0 ? neg : pos, {
        delay: Math.min(400, Math.max(45, Math.abs(delta) * 5)),
      });
      await expect
        .poll(async () => (await hero(p)).lastSequence)
        .toBeGreaterThan(h.lastSequence);
    }
    expect(Math.abs((await hero(p))[axis] - target)).toBeLessThanOrEqual(7);
  }
}
async function exit(p: Page) {
  await moveTo(p, 768, 944);
  const v = await view(p),
    box = (await p.locator('#game canvas').boundingBox())!;
  const scale = await p
    .locator('#game canvas')
    .evaluate((n) => n.clientWidth / (n as HTMLCanvasElement).width);
  await p.mouse.click(
    box.x + (768 - v.camera.x) * scale,
    box.y + (920 - v.camera.y) * scale,
  );
  await expect.poll(async () => (await hero(p)).zoneId).toBe('arena');
  await expect.poll(async () => (await view(p)).desertScenery.length).toBe(0);
}

test('two clients observe all desert frames, exact timings, facing, pivots and complete one-shots', async ({
  browser,
}) => {
  const contexts = await Promise.all(
    [0, 1].map(() =>
      browser.newContext({ viewport: { width: 1280, height: 720 } }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const errors = pages.map(monitor);
  mkdirSync(evidence, { recursive: true });
  try {
    await joinWaiting(pages[0]!, 'Desert Frames A');
    await joinWaiting(
      pages[1]!,
      'Desert Frames B',
      (await read(pages[0]!)).roomId,
    );
    await startTogether(pages);
    for (const p of pages) await enter(p);
    const manifest = JSON.parse(
      readFileSync(
        'apps/game-client/public/assets/desert/manifest.json',
        'utf8',
      ),
    );
    for (const pose of ['idle', 'walk', 'basic_attack', 'hurt', 'death'])
      for (const direction of ['down', 'left', 'right', 'up']) {
        const { ids } = await fixture(
          pages[0]!,
          `mode=pose&pose=${pose}&direction=${direction}`,
        );
        for (const p of pages) {
          await expect
            .poll(
              async () => {
                const v = await view(p);
                return manifest.assets.every(
                  (
                    a: {
                      id: string;
                      animations: Array<{
                        state: string;
                        direction: string;
                        frames: string[];
                        repeat: number;
                      }>;
                    },
                    i: number,
                  ) => {
                    const tag = a.animations.find(
                      (t) => t.state === pose && t.direction === direction,
                    )!;
                    const key = `${a.id}:${pose}:${direction}`;
                    return (
                      v.actors.some(
                        (actor) =>
                          actor.id === ids[i] && actor.animation === key,
                      ) &&
                      tag.frames.every((f) =>
                        v.observedCreepFrames[key]?.includes(f),
                      ) &&
                      (tag.repeat === -1
                        ? (v.creepRepeats[key] ?? 0) >= 1
                        : v.completedAnimations.some(
                            (c) => c.id === ids[i] && c.key === key,
                          ))
                    );
                  },
                );
              },
              {
                timeout: 10000,
                intervals: [80],
                message: `${pose}:${direction} on ${pages.indexOf(p)}`,
              },
            )
            .toBe(true);
          const v = await view(p);
          for (const [i, a] of manifest.assets.entries()) {
            const actor = v.actors.find((actor) => actor.id === ids[i])!;
            expect(actor.origin).toEqual(a.footPivot);
            expect(actor.scale).toEqual([1, 1]);
            expect(actor.depth).toBe(actor.y);
            const tag = a.animations.find(
              (t: { state: string; direction: string }) =>
                t.state === pose && t.direction === direction,
            )!;
            const key = `${a.id}:${pose}:${direction}`,
              times = v.creepFrameTimes[key]!.filter((t) => t.id === ids[i]);
            expect(new Set(v.observedCreepFrames[key])).toEqual(
              new Set(tag.frames),
            );
            for (
              let n = 0;
              n < Math.min(tag.frames.length - 1, times.length - 1);
              n++
            )
              expect(
                Math.abs(times[n + 1]!.at - times[n]!.at - tag.durations[n]),
              ).toBeLessThan(180);
            if (pose === 'death') {
              expect(actor.frame).toBe(tag.frames.at(-1));
              expect(actor.playing).toBe(false);
            }
          }
        }
      }
    const v = await view(pages[0]!);
    expect(v.zoom).toBe(1);
    expect(v.rotation).toBe(0);
    writeFileSync(
      evidence + '/frames.json',
      JSON.stringify(
        {
          players: 2,
          controlledServerPoses: true,
          naturalCombat: false,
          observed: v.observedCreepFrames,
          repeats: v.creepRepeats,
          timings: v.creepFrameTimes,
          errors: errors.flat(),
        },
        null,
        2,
      ),
    );
    expect(errors.flat()).toEqual([]);
  } catch (error) {
    await pages[0]!.screenshot({ path: evidence + '/frame-failure.png' });
    writeFileSync(
      evidence + '/frame-failure.json',
      JSON.stringify(await view(pages[0]!), null, 2),
    );
    throw error;
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});

test('six players fight desert creeps, share authority, keep full viewport and physically return', async ({
  browser,
}) => {
  const contexts = await Promise.all(
    Array.from({ length: 2 }, () =>
      browser.newContext({ viewport: { width: 1920, height: 1080 } }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const errors = pages.map(monitor);
  const bots: Room<MatchRoom>[] = [];
  const botTimers: ReturnType<typeof setInterval>[] = [];
  const client = new Client('http://127.0.0.1:2596');
  mkdirSync(evidence, { recursive: true });
  try {
    await joinWaiting(pages[0]!, 'Desert 1');
    const room = (await read(pages[0]!)).roomId;
    for (let i = 1; i < pages.length; i++)
      await joinWaiting(pages[i]!, 'Desert ' + (i + 1), room);
    for (let i = 0; i < 4; i++) {
      const bot = await client.joinById<MatchRoom>(room, {
        nickname: `Desert ${i + 3}`,
        protocolVersion: PROTOCOL_VERSION,
      });
      bots.push(bot);
      bot.onMessage('*', () => {});
      await expect.poll(() => bot.state?.phase).toBe('WAITING_LOBBY');
    }
    await Promise.all([
      startTogether(pages, ['thieu_lam', 'cai_bang']),
      ...bots.map(async (bot, i) => {
        await expect.poll(() => bot.state.phase).toBe('SCHOOL_SELECTION');
        bot.send('lobby-action', {
          action: 'select',
          schoolId: (
            ['vo_dang', 'thien_son', 'thieu_lam', 'cai_bang'] as const
          )[i]!,
        });
        bot.send('lobby-action', {
          action: 'branch',
          basicId: [
            'vo_dang_quyen',
            'thien_son_phien',
            'thieu_lam_quyen',
            'cai_bang_bong',
          ][i]!,
        });
        bot.send('lobby-action', { action: 'confirm' });
      }),
    ]);
    for (const p of pages) await enter(p);
    for (const bot of bots) {
      bot.send('dungeon-action', {
        protocolVersion: PROTOCOL_VERSION,
        sequence: 1,
        action: 'enter',
        access: 'shared',
        destination: 'desert',
      });
      await expect
        .poll(() => bot.state.players.get(bot.sessionId)?.zoneId)
        .toBe('desert_shared');
    }
    const a = pages[0]!;
    await expect
      .poll(
        async () =>
          (await view(a)).actors.filter((o) => o.texture.startsWith('hero_'))
            .length,
      )
      .toBe(6);
    await fixture(a, 'mode=combat');
    await expect
      .poll(
        async () =>
          (await read(a)).state.creeps['desert_shared:combat_cu_nhan_sa_thach']
            ?.archetypeId,
      )
      .toBe('cu_nhan_sa_thach');
    const first = await view(a);
    expect(first.desertScenery.length).toBe(128);
    const manifest = JSON.parse(
      readFileSync(
        'apps/game-client/public/assets/desert/manifest.json',
        'utf8',
      ),
    );
    for (const prop of first.desertScenery) {
      const meta = manifest.scenery.find(
        (s: { id: string }) => s.id === prop.name,
      );
      expect(prop.origin).toEqual(
        meta.pivot.map((v: number, i: number) => v / meta.size[i]),
      );
      expect(prop.scale).toEqual([1, 1]);
      expect([-9000, prop.y]).toContain(prop.depth);
    }
    expect(await a.locator('#viewport').boundingBox()).toEqual(
      await a.locator('#game canvas').boundingBox(),
    );
    await a.screenshot({ path: evidence + '/desert-six-player-1920.png' });
    const attackLoops = pages.map(async (p) => {
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
        Object.assign(window, { __desertAttackTimer: timer });
      });
    });
    await Promise.all(attackLoops);
    for (const bot of bots) {
      let sequence = 1;
      botTimers.push(
        setInterval(
          () =>
            bot.send('input', {
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
            (e) => e.kind === 'hit' && e.zoneId === 'desert_shared',
          ).length,
        { timeout: 10000 },
      )
      .toBeGreaterThan(0);
    await a.setViewportSize({ width: 1280, height: 720 });
    await a.screenshot({ path: evidence + '/desert-combat-1280.png' });
    await expect
      .poll(
        async () => {
          const s = await read(a);
          return s.events.filter(
            (e) =>
              e.kind === 'death' &&
              e.targetId.startsWith('desert_shared:combat_'),
          ).length;
        },
        { timeout: 45000, intervals: [150] },
      )
      .toBe(6);
    await Promise.all(
      pages.map((p) =>
        p.evaluate(() =>
          window.clearInterval(
            (window as unknown as { __desertAttackTimer: number })
              .__desertAttackTimer,
          ),
        ),
      ),
    );
    for (const timer of botTimers) clearInterval(timer);
    const after = await read(a);
    expect(
      Object.values(after.state.players).reduce((sum, h) => sum + h.xp, 0),
    ).toBe(360);
    expect(Object.values(after.state.players).every((h) => h.hp > 0)).toBe(
      true,
    );
    for (const p of pages.slice(1)) {
      await expect
        .poll(async () =>
          Object.values((await read(p)).state.players).reduce(
            (sum, h) => sum + h.xp,
            0,
          ),
        )
        .toBe(360);
      expect(Object.keys((await read(p)).state.creeps)).toEqual(
        Object.keys(after.state.creeps),
      );
    }
    await expect
      .poll(async () => (await read(a)).state.dungeons['desert_shared']?.wave)
      .toBe(2);
    // Existing geometry + actual arrow inputs enforce a solid pillar footprint.
    await moveTo(a, 352, 720);
    await moveTo(a, 352, 710);
    await a.keyboard.press('ArrowUp', { delay: 500 });
    expect((await hero(a)).y).toBeGreaterThanOrEqual(680 + m1Config.radius);
    expect((await hero(a)).y).toBeLessThan(701);
    await moveTo(a, 768, 832);
    // Move through the physical portal, then verify zone-specific sprites disappear.
    await exit(a);
    expect(await hero(a)).toMatchObject({ x: 960, y: 576 });
    expect(
      (await view(a)).actors.every((o) => !o.texture.startsWith('desert_')),
    ).toBe(true);
    writeFileSync(
      evidence + '/combat.json',
      JSON.stringify(
        {
          players: 6,
          browserContexts: 2,
          sdkClients: 4,
          naturalCombat: true,
          realStatsAndRewards: true,
          arrangementOnlyFixture: true,
          totalXp: 360,
          deaths: 6,
          waveAdvanced: true,
          physicalExit: true,
          errors: errors.flat(),
        },
        null,
        2,
      ),
    );
    expect(errors.flat()).toEqual([]);
  } catch (error) {
    await pages[0]!.screenshot({ path: evidence + '/combat-failure.png' });
    writeFileSync(
      evidence + '/combat-failure.json',
      JSON.stringify(
        {
          view: await view(pages[0]!),
          snapshot: await read(pages[0]!),
          errors: errors.flat(),
        },
        null,
        2,
      ),
    );
    throw error;
  } finally {
    for (const timer of botTimers) clearInterval(timer);
    await Promise.all(bots.map((bot) => bot.leave()));
    await Promise.all(
      pages.map((p) =>
        p
          .evaluate(() =>
            window.clearInterval(
              (window as unknown as { __desertAttackTimer: number })
                .__desertAttackTimer,
            ),
          )
          .catch(() => {}),
      ),
    );
    await Promise.all(contexts.map((c) => c.close()));
  }
});
