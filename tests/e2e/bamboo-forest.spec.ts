import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Client, type Room } from '@colyseus/sdk';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';
import { joinWaiting, startTogether } from './pregame-helper.js';
const evidence =
  process.env['VOLAM_BAMBOO_EVIDENCE_DIR'] ??
  'docs/evidence/bamboo-integration-2026-10-31';
interface Hero {
  x: number;
  y: number;
  hp: number;
  pose: string;
  zoneId: string;
  lastSequence: number;
}
interface Snap {
  sessionId: string;
  roomId: string;
  state: { players: Record<string, Hero>; tick: number };
}
interface View {
  zoom: number;
  rotation: number;
  zoneId: string;
  camera: { x: number; y: number };
  sceneTime: number;
  observedCreepFrames: Record<string, string[]>;
  completedAnimations: Array<{ id: string; key: string; at: number }>;
  trees: Array<{ x: number; y: number; depth: number }>;
  bambooScenery: Array<{
    name: string;
    texture: string;
    x: number;
    y: number;
    depth: number;
    origin: number[];
    scale: number[];
  }>;
  actors: Array<{
    id: string;
    x: number;
    y: number;
    depth: number;
    frame: string;
    animation: string;
    texture: string;
    artStatus?: string;
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
async function moveTo(p: Page, x: number, y: number) {
  await p.bringToFront();
  await p.locator('#game canvas').focus();
  for (const [axis, target, neg, pos] of [
    ['x', x, 'ArrowLeft', 'ArrowRight'],
    ['y', y, 'ArrowUp', 'ArrowDown'],
  ] as const) {
    for (let n = 0; n < 55; n++) {
      const h = await hero(p),
        delta = target - h[axis];
      if (Math.abs(delta) <= 6) break;
      const key = delta < 0 ? neg : pos;
      await p.keyboard.down(key);
      try {
        await p.waitForTimeout(
          Math.min(100, Math.max(30, Math.abs(delta) * 5 - 20)),
        );
        // Keep the real key held until a rendered input frame reaches the server.
        // A complete 30ms press can fall between frames on a loaded test machine.
        await expect
          .poll(async () => (await hero(p)).lastSequence, {
            intervals: [16],
            timeout: 8000,
          })
          .toBeGreaterThan(h.lastSequence);
      } finally {
        await p.keyboard.up(key);
      }
      await expect.poll(async () => (await hero(p)).pose).not.toBe('walk');
    }
    expect(
      Math.abs((await hero(p))[axis] - target),
      axis + ' target ' + target,
    ).toBeLessThanOrEqual(6);
  }
}
async function enter(p: Page) {
  await p.getByRole('button', { name: 'Phó Bản', exact: true }).click();
  await p.getByRole('radio', { name: 'Chung', exact: true }).click();
  await p.locator('#enter-dungeon').click();
  await expect.poll(async () => (await hero(p)).zoneId).not.toBe('arena');
  await expect
    .poll(async () => (await view(p)).zoneId)
    .toBe((await hero(p)).zoneId);
  await expect(p.locator('#zone-status')).toContainText('hình ảnh đã duyệt');
  await expect(p.locator('#zone-status')).not.toContainText('hình tạm');
}

test('six players share authored forest; server collision, depth and physical return remain intact', async ({
  browser,
}) => {
  mkdirSync(evidence, { recursive: true });
  const contexts = await Promise.all(
    Array.from({ length: 2 }, () =>
      browser.newContext({ viewport: { width: 1920, height: 1080 } }),
    ),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const bots: Room<MatchRoom>[] = [];
  const client = new Client('http://127.0.0.1:2587');
  const errors: string[] = [];
  for (const p of pages) {
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    p.on('response', (r) => {
      if (r.status() >= 400) errors.push(r.status() + ' ' + r.url());
    });
  }
  try {
    const a = pages[0]!;
    await joinWaiting(a, 'Forest 1');
    const room = (await read(a)).roomId;
    await joinWaiting(pages[1]!, 'Forest 2', room);
    for (let i = 0; i < 4; i++) {
      const b = await client.joinById<MatchRoom>(room, {
        nickname: 'Forest ' + (i + 3),
        protocolVersion: PROTOCOL_VERSION,
      });
      bots.push(b);
      b.onMessage('*', () => {});
      await expect.poll(() => b.state?.phase).toBe('WAITING_LOBBY');
    }
    await Promise.all([
      startTogether(pages),
      ...bots.map(async (b) => {
        await expect.poll(() => b.state.phase).toBe('SCHOOL_SELECTION');
        b.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
        b.send('lobby-action', { action: 'branch', basicId: 'cai_bang_bong' });
        b.send('lobby-action', { action: 'confirm' });
      }),
    ]);
    // Enter idle SDK peers immediately, before waiting on browser menu rendering.
    // They have no combat controller to defend themselves in the practice arena.
    await Promise.all(
      bots.map(async (b) => {
        await expect.poll(() => b.state.phase).toBe('IN_GAME');
        b.send('dungeon-action', {
          protocolVersion: PROTOCOL_VERSION,
          sequence: 1,
          action: 'enter',
          access: 'shared',
          destination: 'forest',
        });
        await expect
          .poll(() => b.state.players.get(b.sessionId)?.zoneId)
          .not.toBe('arena');
      }),
    );
    for (const p of pages) await enter(p);
    await expect
      .poll(
        async () =>
          (await view(a)).actors.filter((o) => o.texture.startsWith('hero_'))
            .length,
      )
      .toBe(6);
    const targets = [
      [312, 320],
      [352, 400],
      [288, 448],
      [416, 400],
    ];
    for (let i = 0; i < bots.length; i++) {
      const b = bots[i]!;
      let sequence = 1;
      for (const [axis, target] of [
        ['y', targets[i]![1]!],
        ['x', targets[i]![0]!],
      ] as const) {
        const end = Date.now() + 6000;
        while (
          Math.abs((b.state.players.get(b.sessionId)?.[axis] ?? 0) - target) >
            8 &&
          Date.now() < end
        ) {
          const delta = target - b.state.players.get(b.sessionId)![axis];
          b.send('input', {
            protocolVersion: PROTOCOL_VERSION,
            sequence: ++sequence,
            kind: 'move',
            x: axis === 'x' ? Math.sign(delta) : 0,
            y: axis === 'y' ? Math.sign(delta) : 0,
          });
          await new Promise((resolve) => setTimeout(resolve, 65));
        }
        b.send('input', {
          protocolVersion: PROTOCOL_VERSION,
          sequence: ++sequence,
          kind: 'move',
          x: 0,
          y: 0,
        });
      }
    }

    await a.screenshot({ path: evidence + '/six_players_1920.png' });
    await a.setViewportSize({ width: 1280, height: 720 });
    const viewport = (await a.locator('#viewport').boundingBox())!;
    const canvas = (await a.locator('#game canvas').boundingBox())!;
    expect(canvas).toEqual(viewport);
    expect(viewport).toEqual({ x: 0, y: 0, width: 1280, height: 720 });
    const statusBox = (await a.locator('#zone-status').boundingBox())!;
    expect(statusBox.x).toBeGreaterThanOrEqual(0);
    expect(statusBox.x + statusBox.width).toBeLessThanOrEqual(1280);
    await a.screenshot({ path: evidence + '/entry_portal_1280.png' });
    await a.setViewportSize({ width: 1920, height: 1080 });
    const frames = new Set<string>();
    await a.bringToFront();
    await a.locator('#game canvas').focus();
    const walkId = (await read(a)).sessionId;
    await a.keyboard.down('ArrowRight');
    await expect
      .poll(
        async () => {
          const v = await view(a);
          const actor = v.actors.find((o) => o.id === walkId);
          if (actor?.animation?.includes('walk')) frames.add(actor.frame);
          return frames.size;
        },
        { intervals: [50] },
      )
      .toBeGreaterThanOrEqual(2);
    await a.keyboard.up('ArrowRight');
    await moveTo(a, 440, 280);
    await a.keyboard.press('ArrowUp', { delay: 550 });
    const collision = await hero(a);
    expect(collision.y).toBeGreaterThanOrEqual(249);
    expect(collision.y).toBeLessThan(270);
    await expect
      .poll(async () => (await hero(pages[1]!)).zoneId)
      .toBe(collision.zoneId);
    const aid = (await read(a)).sessionId;
    await expect
      .poll(async () =>
        Math.abs((await read(pages[1]!)).state.players[aid]!.y - collision.y),
      )
      .toBeLessThan(2);
    await a.screenshot({ path: evidence + '/bamboo_collision.png' });
    await moveTo(a, 392, 192);
    await moveTo(a, 440, 192);
    const behind = await view(a);
    const metadata = JSON.parse(
      readFileSync('assets/bamboo_forest.manifest.json', 'utf8'),
    );
    expect(behind.bambooScenery).toHaveLength(70);
    for (const prop of behind.bambooScenery) {
      const asset = metadata.assets.find(
        (a: { id: string }) => a.id === prop.name,
      );
      expect(prop.texture).toBe('bamboo_scenery');
      expect(prop.origin).toEqual(asset.footPivot);
      expect(prop.scale).toEqual([1, 1]);
      expect([-9000, prop.y]).toContain(prop.depth);
    }
    const deck = behind.bambooScenery.find((o) => o.name === 'bridge_deck')!;
    const rail = behind.bambooScenery.find((o) => o.name === 'bridge_front')!;
    expect(deck.depth).toBe(-9000);
    expect(rail.depth).toBe(rail.y);
    expect(rail.depth).toBeGreaterThan(deck.depth);
    expect(behind.actors.find((o) => o.id === aid)!.depth).toBeLessThan(240);
    expect(
      behind.trees.some((t) => t.x === 440 && t.y === 240 && t.depth === 240),
    ).toBe(true);
    await a.screenshot({ path: evidence + '/behind_bamboo.png' });
    await moveTo(a, 392, 280);
    await moveTo(a, 440, 280);
    const front = await view(a);
    expect(front.actors.find((o) => o.id === aid)!.depth).toBeGreaterThan(240);
    await a.screenshot({ path: evidence + '/in_front_of_bamboo.png' });
    await moveTo(a, 480, 340);
    await a.screenshot({ path: evidence + '/training_clearing_1920.png' });
    expect((await view(a)).zoom).toBe(1);
    expect(Math.abs((await view(a)).rotation)).toBeLessThan(0.0001);
    await moveTo(a, 224, 512);
    await moveTo(a, 224, 584);
    expect((await hero(a)).y).toBeGreaterThan(552);
    await a.screenshot({ path: evidence + '/bridge_and_stream.png' });
    await moveTo(a, 224, 500);
    await moveTo(a, 224, 320);
    await moveTo(a, 176, 320);
    await a.keyboard.press('Space');
    await expect.poll(async () => (await hero(a)).zoneId).toBe('arena');
    await expect.poll(async () => (await view(a)).zoneId).toBe('arena');
    await expect(a.locator('#zone-status')).toBeHidden();
    expect((await hero(pages[1]!)).zoneId).not.toBe('arena');
    expect(errors).toEqual([]);
    writeFileSync(
      evidence + '/observations.json',
      JSON.stringify(
        {
          sixPlayers: true,
          collision,
          behind,
          front,
          observedWalkFrames: [...frames],
          normalForestRoster: true,
          controlledServerPoses: false,
          portalReturn: true,
          bridgeCrossed: true,
          errors,
        },
        null,
        2,
      ),
    );
  } catch (e) {
    console.error('Forest test failed', e);
    throw e;
  } finally {
    await Promise.allSettled(bots.map((b) => b.leave()));
    await Promise.allSettled(contexts.map((c) => c.close()));
  }
});
