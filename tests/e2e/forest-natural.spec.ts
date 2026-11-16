import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { joinWaiting, startTogether } from './pregame-helper.js';
import { forestRoster, creepDungeon, m1Config } from '@volam/game-data';
import { Client, type Room } from '@colyseus/sdk';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
import type { MatchRoom } from '../../apps/game-server/src/rooms/MatchRoom.js';

type Peer = { room: Room<MatchRoom>; sequence: number };
function peerInput(
  p: Peer,
  command:
    | { kind: 'move'; x: number; y: number }
    | { kind: 'basic' }
    | { kind: 'cast'; slot: 0 | 1 | 2 | 3 },
) {
  p.room.send('input', {
    protocolVersion: PROTOCOL_VERSION,
    sequence: ++p.sequence,
    ...command,
  });
}
function peerTravel(p: Peer, action: 'enter' | 'exit') {
  const base = {
    protocolVersion: PROTOCOL_VERSION,
    sequence: ++p.sequence,
  } as const;
  if (action === 'enter')
    p.room.send('dungeon-action', {
      ...base,
      action: 'enter',
      access: 'shared',
      destination: 'forest',
    });
  else p.room.send('dungeon-action', { ...base, action: 'exit' });
}
async function peerMove(p: Peer, x: number, y: number) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const h = p.room.state.players.get(p.room.sessionId)!;
    const dx = x - h.x,
      dy = y - h.y;
    if (Math.abs(dx) <= 8 && Math.abs(dy) <= 8) break;
    peerInput(p, {
      kind: 'move',
      x: Math.abs(dy) > 8 ? 0 : Math.sign(dx),
      y: Math.abs(dy) > 8 ? Math.sign(dy) : 0,
    });
    await new Promise((r) => setTimeout(r, 100));
  }
  peerInput(p, { kind: 'move', x: 0, y: 0 });
  const h = p.room.state.players.get(p.room.sessionId)!;
  expect(Math.abs(h.x - x)).toBeLessThanOrEqual(8);
  expect(Math.abs(h.y - y)).toBeLessThanOrEqual(8);
}
/** Same six-player profile as Bamboo regression: two canvases and four SDK peers.
 * Only validated player input is sent; simulation state is never mutated. */
function drivePeers(peers: Peer[]) {
  let running = true;
  const done = Promise.all(
    peers.map(async (p, i) => {
      let cleared = false,
        lastEnter = 0;
      while (running) {
        const h = p.room.state.players.get(p.room.sessionId)!;
        const d = p.room.state.dungeons.get('forest_shared');
        cleared ||= !!d && (d.wave > 2 || (d.wave === 2 && d.living === 0));
        if (h.hp > 0 && h.zoneId === 'arena' && !cleared) {
          if (Date.now() - lastEnter > 1000) {
            peerTravel(p, 'enter');
            lastEnter = Date.now();
          }
        } else if (h.hp > 0 && h.zoneId === 'forest_shared') {
          const x = cleared ? 320 : h.hp < h.maxHp * 0.65 ? 416 : 500;
          const y = 320 + i * 24,
            dx = x - h.x,
            dy = y - h.y;
          peerInput(p, {
            kind: 'move',
            x: Math.abs(dy) > 8 ? 0 : Math.abs(dx) > 8 ? Math.sign(dx) : 0,
            y: Math.abs(dy) > 8 ? Math.sign(dy) : 0,
          });
          if (!cleared && Math.abs(dx) <= 10 && Math.abs(dy) <= 10) {
            if (h.qSkill && h.qCooldown === 0 && h.mana >= 18)
              peerInput(p, { kind: 'cast', slot: 0 });
            if (h.basicCooldown === 0) peerInput(p, { kind: 'basic' });
          }
        }
        await new Promise((r) => setTimeout(r, 120));
      }
      peerInput(p, { kind: 'move', x: 0, y: 0 });
    }),
  );
  return {
    stop: async () => {
      running = false;
      await done;
    },
  };
}

const root =
  process.env['FOREST_EVIDENCE_DIR'] ??
  'docs/evidence/forest-natural-2026-11-01';
// The existing debug bridge is read-only: all actions below are real menu/key input.
const read = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.snapshot()');
const view = (p: Page): Promise<any> =>
  p.evaluate('window.__VOLAM__.presentation()');
async function hero(p: Page) {
  const s = await read(p);
  return s.state.players[s.sessionId];
}
async function enter(p: Page, access: 'private' | 'shared') {
  await p.getByRole('button', { name: 'Phó Bản', exact: true }).click();
  await p
    .getByRole('radio', {
      name: access === 'shared' ? 'Chung' : 'Riêng',
      exact: true,
    })
    .click();
  await p.locator('#enter-dungeon').click();
  await expect.poll(async () => (await hero(p)).zoneId).toMatch(/^forest_/);
  await expect(p.locator('#zone-status')).toContainText('hình ảnh đã duyệt');
  await expect(p.locator('#zone-status')).not.toContainText('hình tạm');
}
async function ranged(p: Page) {
  await p.locator('[data-menu=settings]').click();
  await p.locator('#dialog-content [data-menu=skills]').click();
  await p.locator('#skill-branch').selectOption('cai_bang_chuong');
  await expect
    .poll(async () => (await hero(p)).basicId)
    .toBe('cai_bang_chuong');
  await p.keyboard.press('Escape');
}
async function move(p: Page, x: number, y: number) {
  await p.bringToFront();
  await p.locator('#game canvas').focus();
  for (const [axis, target, neg, pos] of [
    ['y', y, 'ArrowUp', 'ArrowDown'],
    ['x', x, 'ArrowLeft', 'ArrowRight'],
  ] as const) {
    for (let n = 0; n < 55; n++) {
      const h = await hero(p),
        delta = target - h[axis];
      if (Math.abs(delta) <= 8) break;
      const key = delta < 0 ? neg : pos;
      await p.keyboard.down(key);
      try {
        await p.waitForTimeout(
          Math.min(250, Math.max(40, Math.abs(delta) * 5 - 20)),
        );
        await expect
          .poll(async () => (await hero(p)).lastSequence, { intervals: [30] })
          .toBeGreaterThan(h.lastSequence);
      } finally {
        await p.keyboard.up(key);
      }
      await expect.poll(async () => (await hero(p)).pose).not.toBe('walk');
    }
    expect(
      Math.abs((await hero(p))[axis] - target),
      `natural walk ${axis}=${target}`,
    ).toBeLessThanOrEqual(8);
  }
}
const creeps = (s: any, zone: string): Array<[string, any]> =>
  Object.entries(s.state.creeps).filter(([, c]: any) => c.zoneId === zone);
async function wave(p: Page, zone: string, number: number, count: number) {
  await expect
    .poll(async () => (await read(p)).state.dungeons[zone]?.wave, {
      timeout: 60000,
    })
    .toBe(number);
  await expect.poll(async () => creeps(await read(p), zone).length).toBe(count);
  const s = await read(p),
    actors = creeps(s, zone);
  expect(actors.map(([, c]) => c.archetypeId)).toEqual(
    Array.from(
      { length: count },
      (_, i) =>
        forestRoster[((number === 1 ? 0 : 3) + i) % forestRoster.length],
    ),
  );
  await expect
    .poll(async () => {
      const v = await view(p);
      return actors.every(([id, c]) =>
        v.actors.some(
          (a: any) =>
            a.id === id &&
            a.texture === 'forest_' + c.archetypeId &&
            a.artStatus === 'approved',
        ),
      );
    })
    .toBe(true);
  for (const a of (await view(p)).actors.filter((a: any) =>
    actors.some(([id]) => a.id === id),
  )) {
    expect(a.origin).toEqual([0.5, 106 / 128]);
    expect(a.scale).toEqual([1, 1]);
    expect(a.depth).toBe(a.y);
    expect(a.texture).not.toBe('creep_outlaw');
  }
  return actors.map(([id, c]) => ({ id, type: c.archetypeId, maxHp: c.maxHp }));
}
async function fight(
  pages: Page[],
  zone: string,
  number: number,
  captures?: Map<Page, any>,
  deaths?: Set<string>,
  reentries?: string[],
) {
  // Independent manual A pulses, bounded by real server cadence. No stat/HP/AI edits.
  await Promise.all(pages.map((p) => p.locator('#game canvas').focus()));
  let done = false;
  const pumps = pages.map(async (p, i) => {
    while (!done) {
      const h = await hero(p);
      if (captures) {
        const v = await view(p),
          old = captures.get(p);
        // Keep actual pre-transfer observations when a natural hero respawn
        // clears the inspector for the new zone. Never synthesize frame evidence.
        if (
          v.zoneId === zone &&
          (!old ||
            Object.keys(v.observedCreepFrames).length >=
              Object.keys(old.observedCreepFrames).length)
        )
          captures.set(p, v);
      }
      if (h.hp <= 0) deaths?.add(h.nickname);
      if (h.hp <= 0) {
        await p.waitForTimeout(180);
        continue; // A dead party member must not stop every living player's input.
      }
      if (h.zoneId === 'arena') {
        reentries?.push(h.nickname);
        await enter(p, zone === 'forest_shared' ? 'shared' : 'private');
        await move(p, 416, 320);
        continue;
      }
      expect(h.zoneId).toBe(zone);
      // Retreat through real inputs so one hero does not tank the whole party's wave.
      if (h.hp < h.maxHp * 0.65 && h.x > 480) await move(p, 464, 320 + i * 12);
      if (h.qSkill && h.qCooldown === 0 && h.mana >= 18)
        await p.keyboard.press('KeyQ', { delay: 65 });
      await p.keyboard.press('KeyA', { delay: 65 });
      await p.waitForTimeout(180);
    }
  });
  try {
    await Promise.race([
      expect
        .poll(
          async () => {
            const s = await read(pages[0]!);
            return (
              s.state.dungeons[zone]?.wave > number ||
              (s.state.dungeons[zone]?.wave === number &&
                s.state.dungeons[zone]?.living === 0)
            );
          },
          { timeout: 60000, intervals: [150] },
        )
        .toBe(true),
      ...pumps,
    ]);
  } finally {
    done = true;
    await Promise.allSettled(pumps);
  }
}
async function exit(p: Page) {
  await move(p, 176, 320);
  await p.keyboard.press('Space');
  await expect.poll(async () => (await hero(p)).zoneId).toBe('arena');
  await expect.poll(async () => (await view(p)).zoneId).toBe('arena');
  await expect.poll(async () => (await view(p)).creepEffects.contacts).toBe(0);
  expect(
    (await view(p)).actors.some((a: any) => a.texture.startsWith('forest_')),
  ).toBe(false);
}
function monitor(pages: Page[]) {
  const errors: string[] = [],
    requests: string[] = [];
  for (const p of pages) {
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    p.on('request', (r) => requests.push(r.url()));
  }
  return { errors, requests };
}

for (const count of [2, 6])
  test(`${count} clients: natural shared Forest spawns and clears two authoritative waves`, async ({
    browser,
  }) => {
    test.setTimeout(300000);
    const out = `${root}/shared-${count}`;
    mkdirSync(out, { recursive: true });
    const contexts = await Promise.all(
      Array.from({ length: 2 }, () =>
        browser.newContext({ viewport: { width: 1280, height: 720 } }),
      ),
    );
    const pages = await Promise.all(contexts.map((c) => c.newPage()));
    const peers: Peer[] = [];
    let sdkDriver: ReturnType<typeof drivePeers> | undefined;
    const logs = monitor(pages);
    const started = Date.now();
    try {
      await joinWaiting(pages[0]!, 'Natural Forest 1');
      const room = (await read(pages[0]!)).roomId;
      for (let i = 1; i < pages.length; i++)
        await joinWaiting(pages[i]!, `Natural Forest ${i + 1}`, room);
      for (let i = pages.length; i < count; i++) {
        const peer = await new Client(
          'http://127.0.0.1:2587',
        ).joinById<MatchRoom>(room, {
          nickname: `Natural Forest ${i + 1}`,
          protocolVersion: PROTOCOL_VERSION,
        });
        peer.onMessage('*', () => {});
        peers.push({ room: peer, sequence: 0 });
        await expect.poll(() => peer.state?.phase).toBe('WAITING_LOBBY');
      }
      await Promise.all([
        startTogether(pages),
        ...peers.map(async ({ room: p }) => {
          await expect.poll(() => p.state.phase).toBe('SCHOOL_SELECTION');
          p.send('lobby-action', { action: 'select', schoolId: 'cai_bang' });
          p.send('lobby-action', {
            action: 'branch',
            basicId: 'cai_bang_bong',
          });
          p.send('lobby-action', { action: 'confirm' });
        }),
      ]);
      for (const p of peers) {
        await expect.poll(() => p.room.state.phase).toBe('IN_GAME');
        p.room.send('build-action', {
          protocolVersion: PROTOCOL_VERSION,
          sequence: ++p.sequence,
          revision: p.room.state.players.get(p.room.sessionId)!.build.revision,
          action: 'branch',
          basicId: 'cai_bang_chuong',
        });
        await expect
          .poll(() => p.room.state.players.get(p.room.sessionId)?.basicId)
          .toBe('cai_bang_chuong');
        peerTravel(p, 'enter');
        await expect
          .poll(() => p.room.state.players.get(p.room.sessionId)?.zoneId)
          .toBe('forest_shared');
      }
      for (const p of pages) await ranged(p);
      for (const p of pages) await enter(p, 'shared');
      const zone = 'forest_shared';
      const first = await wave(pages[0]!, zone, 1, 3);
      for (const p of pages.slice(1))
        expect(await wave(p, zone, 1, 3)).toEqual(first);
      await pages[0]!.screenshot({ path: out + '/wave-1-natural.png' });
      for (const p of peers)
        await expect
          .poll(() =>
            first.every(
              (c) => p.room.state.creeps.get(c.id)?.archetypeId === c.type,
            ),
          )
          .toBe(true);
      expect((await read(pages[0]!)).state.dungeons[zone].occupants).toBe(
        count,
      );
      sdkDriver = drivePeers(peers);
      // One hero deliberately accepts real creep attacks before the party fires.
      // Position peers concurrently: sequential driver waits otherwise leave the
      // first hero tanking idle for the entire six-browser movement sequence.
      const seats = [
        [500, 320],
        [480, 280],
        [480, 360],
        [516, 396],
        [552, 416],
      ];
      await Promise.all(
        pages.slice(1).map(async (p, i) => {
          await move(p, seats[i]![0]!, seats[i]![1]!);
          if (count === 6) {
            await p.keyboard.press('KeyQ', { delay: 65 });
            await p.keyboard.press('KeyA', { delay: 65 });
          }
        }),
      );
      await move(pages[0]!, count === 6 ? 416 : 576, 320);
      await expect
        .poll(
          async () =>
            (await read(pages[0]!)).events.some(
              (e: any) =>
                e.zoneId === zone &&
                e.abilityId === 'creep_strike' &&
                e.kind === 'hit',
            ),
          { timeout: 15000 },
        )
        .toBe(true);
      expect(
        Object.values((await read(pages[0]!)).state.players).some(
          (h: any) => h.hp < h.maxHp,
        ),
      ).toBe(true);
      if (count === 2) await move(pages[0]!, 500, 320);
      let scaled = 0,
        wave2SpawnPlayerCount = 0;
      const combatViews = new Map<Page, any>(),
        heroDeaths = new Set<string>();
      const respawnReentries: string[] = [];
      // Keep independent real inputs running while reading/screenshotting the
      // wave boundary. Six canvas observations must never idle the whole party.
      const [second] = await Promise.all([
        (async () => {
          await expect
            .poll(
              async () => (await read(pages[0]!)).state.dungeons[zone]?.wave,
              { timeout: 60000 },
            )
            .toBe(2);
          wave2SpawnPlayerCount = (await read(pages[0]!)).state.dungeons[zone]
            .spawnPlayerCount;
          expect(wave2SpawnPlayerCount).toBeGreaterThanOrEqual(1);
          expect(wave2SpawnPlayerCount).toBeLessThanOrEqual(count);
          scaled = Math.ceil(
            creepDungeon.baseCount *
              (1 +
                creepDungeon.countPerAdditionalPlayer *
                  (wave2SpawnPlayerCount - 1)),
          );
          const second = await wave(pages[0]!, zone, 2, scaled);
          for (const p of peers)
            await expect
              .poll(() =>
                second.every(
                  (c) => p.room.state.creeps.get(c.id)?.archetypeId === c.type,
                ),
              )
              .toBe(true);
          await Promise.all(
            pages.slice(1).map(async (p) => {
              await expect.poll(async () => (await hero(p)).zoneId).toBe(zone);
              expect(await wave(p, zone, 2, scaled)).toEqual(second);
            }),
          );
          await pages[0]!.screenshot({ path: out + '/wave-2-natural.png' });
          return second;
        })(),
        fight(pages, zone, 2, combatViews, heroDeaths, respawnReentries),
      ]);
      await sdkDriver.stop();
      sdkDriver = undefined;
      expect(new Set([...first, ...second].map((c) => c.type))).toEqual(
        new Set(forestRoster),
      );
      await pages[0]!.waitForTimeout(900);
      for (const p of pages) {
        const v = await view(p),
          old = combatViews.get(p);
        if (
          v.zoneId === zone &&
          (!old ||
            Object.keys(v.observedCreepFrames).length >=
              Object.keys(old.observedCreepFrames).length)
        )
          combatViews.set(p, v);
      }
      // Honor real death/arena recovery, then return via the normal menu. Surviving
      // heroes retreat concurrently while any dead peer waits its server respawn.
      await Promise.all(
        pages.map(async (p, i) => {
          await expect.poll(async () => (await hero(p)).hp).toBeGreaterThan(0);
          if ((await hero(p)).zoneId === 'arena') {
            respawnReentries.push((await hero(p)).nickname);
            await enter(p, 'shared');
          }
          await move(p, 240 + (i % 3) * 40, 320 + Math.floor(i / 3) * 48);
        }),
      );
      const snapshots = await Promise.all(pages.map(read));
      const presentations = pages.map((p) => combatViews.get(p));
      expect(presentations.every(Boolean)).toBe(true);
      for (const nickname of heroDeaths)
        expect(respawnReentries).toContain(nickname);
      const rewards = Object.fromEntries(
        Object.entries(snapshots[0].state.players).map(([id, h]: any) => [
          id,
          { xp: h.xp, gold: h.gold },
        ]),
      );
      expect(
        Object.values(rewards).reduce((n: number, h: any) => n + h.xp, 0),
      ).toBe((3 + scaled) * m1Config.creep.xp);
      expect(
        Object.values(rewards).reduce((n: number, h: any) => n + h.gold, 0),
      ).toBe((3 + scaled) * m1Config.creep.gold);
      for (const s of snapshots)
        for (const [id, reward] of Object.entries(rewards))
          expect(s.state.players[id]).toMatchObject(
            reward as Record<string, unknown>,
          );
      for (const v of presentations) {
        expect(
          Object.keys(v.observedCreepFrames).some(
            (k) => k.startsWith('forest_') && k.includes(':basic_attack:'),
          ),
        ).toBe(true);
        expect(
          Object.keys(v.observedCreepFrames).some(
            (k) => k.startsWith('forest_') && k.includes(':hurt:'),
          ),
        ).toBe(true);
        expect(
          v.completedAnimations.some(
            (a: any) =>
              a.key.startsWith('forest_') && a.key.includes(':death:'),
          ),
        ).toBe(true);
        expect(
          v.creepEffects.played.some((id: string) =>
            id.startsWith('forest_fx:'),
          ),
        ).toBe(true);
        expect(
          v.creepEffects.completed.some((id: string) =>
            id.startsWith('forest_fx:'),
          ),
        ).toBe(true);
        expect(v.zoom).toBe(1);
        expect(Math.abs(v.rotation)).toBeLessThan(0.0001);
      }
      await pages[0]!.screenshot({ path: out + '/natural-combat-rewards.png' });
      const sdkRewards = peers.map((p) =>
        Object.fromEntries(
          [...p.room.state.players].map(([id, h]) => [
            id,
            { xp: h.xp, gold: h.gold },
          ]),
        ),
      );
      for (const r of sdkRewards) expect(r).toEqual(rewards);
      await Promise.all(
        peers.map(async (p) => {
          await expect
            .poll(() => p.room.state.players.get(p.room.sessionId)!.hp)
            .toBeGreaterThan(0);
          if (
            p.room.state.players.get(p.room.sessionId)!.zoneId ===
            'forest_shared'
          ) {
            await peerMove(p, 176, 320);
            peerTravel(p, 'exit');
            await expect
              .poll(() => p.room.state.players.get(p.room.sessionId)?.zoneId)
              .toBe('arena');
          }
        }),
      );
      for (const p of pages) await exit(p);
      await expect
        .poll(async () => (await read(pages[0]!)).state.dungeons[zone]?.paused)
        .toBe(true);
      await enter(pages[0]!, 'shared');
      await expect
        .poll(async () =>
          (await view(pages[0]!)).actors.some((a: any) =>
            a.texture.startsWith('forest_'),
          ),
        )
        .toBe(true);
      // Fresh normal URL, no debug/review flag: a real late join sees approved Forest art.
      // Free a seat, then enter through the same existing menus.
      await pages[pages.length - 1]!.getByRole('button', {
        name: 'Thoát',
        exact: true,
      }).click();
      await pages[pages.length - 1]!.getByRole('button', {
        name: 'Rời trận',
        exact: true,
      }).click();
      await expect(pages[pages.length - 1]!.locator('#pregame')).toBeVisible();
      const normal = pages[pages.length - 1]!;
      await normal.goto('/');
      await normal.locator('[data-action=play]').click();
      await normal.locator('#pre-nickname').fill('Normal URL Forest');
      await normal
        .getByRole('button', { name: 'Vào game', exact: true })
        .click();
      await normal
        .locator('#pregame')
        .getByLabel('Mã phòng', { exact: true })
        .fill(room);
      await normal
        .getByRole('button', { name: 'Vào bằng mã', exact: true })
        .click();
      await expect(normal.locator('#pregame .pre-title')).toHaveText(
        'Chọn môn phái',
      );
      await normal.locator('#pregame button[data-school=cai_bang]').click();
      const branch = normal.locator('[data-branch=cai_bang_bong]');
      if (await branch.count()) await branch.click();
      await normal
        .getByRole('button', { name: 'Xác nhận', exact: true })
        .click();
      await expect(normal.locator('#pregame')).toBeHidden();
      await normal
        .getByRole('button', { name: 'Phó Bản', exact: true })
        .click();
      await normal.getByRole('radio', { name: 'Chung', exact: true }).click();
      await normal.locator('#enter-dungeon').click();
      await expect(normal.locator('#zone-status')).toContainText(
        'hình ảnh đã duyệt',
      );
      expect(new URL(normal.url()).search).toBe('');
      expect(await normal.evaluate('window.__VOLAM__')).toBeUndefined();
      await normal.screenshot({ path: out + '/normal-url-no-flags.png' });
      expect(
        logs.requests.some((url) =>
          /__bamboo-pose|art-review|forest-creep-review/.test(url),
        ),
      ).toBe(false);
      expect(logs.errors).toEqual([]);
      writeFileSync(
        out + '/observations.json',
        JSON.stringify(
          {
            status: 'PASS',
            naturalGameplay: true,
            controlledServerFixture: false,
            networkClients: count,
            browserClients: pages.length,
            sdkClients: peers.length,
            sdkRewards,
            wave2SpawnPlayerCount,
            playerDeathsObserved: [...heroDeaths],
            respawnReentries,
            frameObservations:
              'Actual natural Forest views retained before zone-transfer inspector reset',
            first,
            second,
            rewards,
            snapshots,
            presentations,
            normalUrlWithoutFlags: true,
            durationMs: Date.now() - started,
            errors: logs.errors,
          },
          null,
          2,
        ),
      );
    } catch (e) {
      await pages[0]!
        .screenshot({ path: out + '/failure.png' })
        .catch(() => {});
      writeFileSync(
        out + '/failure.json',
        JSON.stringify(
          {
            error: String(e),
            snapshot: await read(pages[0]!).catch(() => null),
            view: await view(pages[0]!).catch(() => null),
          },
          null,
          2,
        ),
      );
      throw e;
    } finally {
      await sdkDriver?.stop().catch(() => {});
      await Promise.allSettled(peers.map((p) => p.room.leave()));
      await Promise.all(contexts.map((c) => c.close()));
    }
  });

test('private Forest advances its own three-creep roster without leaking types or rewards', async ({
  browser,
}) => {
  const out = `${root}/private-2`;
  mkdirSync(out, { recursive: true });
  const contexts = await Promise.all(
    [0, 1].map(() =>
      browser.newContext({ viewport: { width: 1280, height: 720 } }),
    ),
  );
  const [a, b] = (await Promise.all(contexts.map((c) => c.newPage()))) as [
    Page,
    Page,
  ];
  const logs = monitor([a, b]);
  try {
    await joinWaiting(a, 'Private roster A');
    await joinWaiting(b, 'Private roster B', (await read(a)).roomId);
    await startTogether([a, b]);
    await ranged(a);
    await enter(a, 'private');
    await enter(b, 'private');
    const za = (await hero(a)).zoneId,
      zb = (await hero(b)).zoneId;
    expect(za).not.toBe(zb);
    const first = await wave(a, za, 1, 3);
    const untouched = await wave(b, zb, 1, 3);
    await move(a, 500, 320);
    await fight([a], za, 1);
    const second = await wave(a, za, 2, 3);
    expect(second.map((c) => c.type)).toEqual(forestRoster.slice(3));
    expect(await wave(b, zb, 1, 3)).toEqual(untouched);
    expect((await hero(b)).xp).toBe(0);
    expect((await hero(b)).gold).toBe(0);
    expect((await read(b)).state.dungeons[za]).toBeUndefined();
    expect((await read(a)).state.dungeons[zb]).toBeUndefined();
    expect((await read(b)).events.some((e: any) => e.zoneId === za)).toBe(
      false,
    );
    await a.screenshot({ path: out + '/private-wave-2.png' });
    await b.screenshot({ path: out + '/independent-private-wave-1.png' });
    await exit(a);
    await enter(a, 'private');
    expect((await hero(a)).zoneId).toBe(za);
    expect((await read(a)).state.dungeons[za].wave).toBe(2);
    expect(logs.errors).toEqual([]);
    writeFileSync(
      out + '/observations.json',
      JSON.stringify(
        {
          status: 'PASS',
          naturalGameplay: true,
          controlledServerFixture: false,
          first,
          second,
          privateIsolation: true,
          snapshotA: await read(a),
          snapshotB: await read(b),
          errors: logs.errors,
        },
        null,
        2,
      ),
    );
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});
