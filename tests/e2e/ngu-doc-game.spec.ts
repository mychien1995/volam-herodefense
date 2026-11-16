import { expect, test, type Page } from '@playwright/test';
import { Client, type Room } from '@colyseus/sdk';
import { PROTOCOL_VERSION, type LobbyState } from '@volam/game-protocol';
import { nguDoc } from '@volam/game-core';
import { joinWaiting, startTogether } from './pregame-helper.js';

interface Player {
  basicId: string;
  level: number;
  zoneId: string;
  inventory: { levels: { armor: number } };
}
interface Minion {
  archetypeId: string;
  ownerId: string;
  zoneId: string;
  hp: number;
  maxHp: number;
}
interface Snapshot {
  sessionId: string;
  roomId: string;
  events: { sourceId: string; abilityId: string; kind: string }[];
  state: { players: Record<string, Player>; creeps: Record<string, Minion> };
}
interface Presentation {
  zoneId: string;
  actors: {
    id: string;
    texture: string;
    frame: string;
    y: number;
    healthBarVisible: boolean;
    healthBarY: number;
    healthBarFill: number;
  }[];
  nguDoc: { frame: string; x: number; y: number }[];
}
const snapshot = (page: Page) =>
  page.evaluate<Snapshot>('window.__VOLAM__.snapshot()');
const presentation = (page: Page) =>
  page.evaluate<Presentation>('window.__VOLAM__.presentation()');
const self = async (page: Page) => {
  const s = await snapshot(page);
  return s.state.players[s.sessionId]!;
};
const owned = async (page: Page, owner: string, kind: string) =>
  Object.entries((await snapshot(page)).state.creeps).filter(
    ([, actor]) =>
      actor.ownerId === owner && actor.archetypeId === 'ngu_doc_' + kind,
  );
const cast = async (page: Page, key: string) => {
  await page.bringToFront();
  await page.locator('#game canvas').focus();
  await page.keyboard.press(key);
};

test('Ngũ Độc plays in a six-player Phaser room with synced VFX, summon HP bars, gear and transfer', async ({
  browser,
}, info) => {
  const contexts = await Promise.all([
    browser.newContext({ viewport: { width: 1280, height: 720 } }),
    browser.newContext({ viewport: { width: 1280, height: 720 } }),
  ]);
  const peers: Room<LobbyState>[] = [];
  const errors: string[] = [];
  try {
    const [a, b] = await Promise.all(
      contexts.map((context) => context.newPage()),
    );
    const bich = a!,
      am = b!;
    const onPageError = (error: Error) =>
      errors.push(error.stack ?? error.message);
    for (const page of [bich, am]) {
      page.on('pageerror', onPageError);
      page.on('console', (message) => {
        if (
          (message.type() === 'error' &&
            !message.text().includes('Failed to load resource')) ||
          (message.type() === 'warning' &&
            /missing.*(texture|frame)|ngu-doc/i.test(message.text()))
        )
          errors.push(message.text());
      });
      page.on('response', (response) => {
        if (
          response.url().includes('/assets/ngu-doc') &&
          response.status() >= 400
        )
          errors.push(response.url() + ' ' + response.status());
      });
    }

    await joinWaiting(bich, 'Bích Cổ', undefined, '/?debug=1', 45_000);
    const first = await snapshot(bich);
    await joinWaiting(am, 'Âm Linh', first.roomId, '/?debug=1', 45_000);
    const second = await snapshot(am);
    const client = new Client(
      'http://127.0.0.1:' + (process.env['VOLAM_QA_SERVER_PORT'] ?? 2802),
    );
    const branches = [
      ['cai_bang', 'cai_bang_bong'],
      ['thien_son', 'thien_son_phien'],
      ['vo_dang', 'vo_dang_kiem'],
      ['thieu_lam', 'thieu_lam_quyen'],
    ] as const;
    await Promise.all(
      branches.map(async ([school]) => {
        const peer = await client.joinById<LobbyState>(first.roomId, {
          protocolVersion: PROTOCOL_VERSION,
          nickname: school,
        });
        peer.onMessage('combat-event', () => {});
        peers.push(peer);
      }),
    );
    await expect(bich.locator('#pregame .pre-players li')).toHaveCount(6);
    await bich.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    await Promise.all(
      peers.map(async (peer) => {
        const school = peer.state.players.get(peer.sessionId)?.nickname;
        const [schoolId, basicId] = branches.find(([id]) => id === school)!;
        await expect.poll(() => peer.state.phase).toBe('SCHOOL_SELECTION');
        peer.send('lobby-action', { action: 'select', schoolId });
        await expect
          .poll(() => peer.state.players.get(peer.sessionId)?.schoolId)
          .toBe(schoolId);
        peer.send('lobby-action', { action: 'branch', basicId });
        await expect
          .poll(() => peer.state.players.get(peer.sessionId)?.selectedBranch)
          .toBe(basicId);
        peer.send('lobby-action', { action: 'confirm' });
      }),
    );
    await startTogether(
      [bich, am],
      [nguDoc.taiHiep, nguDoc.coSu],
      45_000,
      true,
    );
    for (const [page, basicId] of [
      [bich, nguDoc.taiHiep],
      [am, nguDoc.coSu],
    ] as const) {
      await expect.poll(() => self(page)).toMatchObject({ basicId, level: 6 });
      await expect
        .poll(async () => (await presentation(page))?.actors, {
          timeout: 20_000,
        })
        .toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: first.sessionId,
              texture: 'ngu-doc-bich-co',
            }),
            expect.objectContaining({
              id: second.sessionId,
              texture: 'ngu-doc-am-linh',
            }),
          ]),
        );
    }

    for (const [page, id] of [
      [bich, first.sessionId],
      [am, second.sessionId],
    ] as const) {
      await page.bringToFront();
      await page.locator('#game canvas').focus();
      const body = async () =>
        (await presentation(page)).actors.find((actor) => actor.id === id)
          ?.frame;
      for (const [key, direction] of [
        ['ArrowLeft', 'left'],
        ['ArrowRight', 'right'],
        ['ArrowUp', 'up'],
        ['ArrowDown', 'down'],
      ] as const) {
        await page.keyboard.down(key);
        try {
          const observed = new Set<string>();
          await expect
            .poll(
              async () => {
                const frame = await body();
                if (frame?.startsWith('walk_' + direction + '_'))
                  observed.add(frame);
                return observed.size;
              },
              { intervals: [20, 35, 50] },
            )
            .toBeGreaterThanOrEqual(2);
        } finally {
          await page.keyboard.up(key);
        }
        await expect.poll(body).toBe('idle_' + direction + '_0');
      }
    }

    const frames = async (page: Page, startsWith: string) =>
      (await presentation(page)).nguDoc.filter((e) =>
        e.frame.startsWith(startsWith),
      );
    await cast(bich, 'KeyQ');
    await expect
      .poll(async () => (await frames(bich, 'hand_flame_')).length)
      .toBe(2);
    await expect
      .poll(async () => (await frames(am, 'hand_flame_')).length)
      .toBe(2);
    const beforeFlames = await frames(bich, 'hand_flame_');
    expect(beforeFlames[0]!.x).not.toBe(beforeFlames[1]!.x);
    await expect
      .poll(() => frames(bich, 'hand_flame_'))
      .not.toEqual(beforeFlames);
    await cast(bich, 'KeyR');
    expect(
      (await snapshot(bich)).events.some((e) => e.abilityId === nguDoc.counter),
    ).toBe(false);

    await cast(bich, 'KeyE');
    await expect.poll(async () => (await frames(bich, 'ring_')).length).toBe(1);
    await expect.poll(async () => (await frames(am, 'ring_')).length).toBe(1);
    await cast(bich, 'KeyE');
    await expect.poll(async () => (await frames(bich, 'ring_')).length).toBe(0);

    await cast(am, 'KeyT');
    await expect
      .poll(async () => (await owned(am, second.sessionId, 'reaper')).length)
      .toBe(1);
    const [[reaperId, before]] = (await owned(
      am,
      second.sessionId,
      'reaper',
    )) as [[string, Minion]];
    await cast(am, 'KeyW');
    await expect
      .poll(async () => (await owned(am, second.sessionId, 'jiangshi')).length)
      .toBe(2);
    const minionIds = [
      reaperId,
      ...(await owned(am, second.sessionId, 'jiangshi')).map(([id]) => id),
    ];
    for (const page of [am, bich]) {
      await expect
        .poll(
          async () =>
            (await presentation(page)).actors.filter(
              (actor) =>
                minionIds.includes(actor.id) &&
                actor.texture === 'ngu-doc-minions' &&
                actor.healthBarVisible &&
                actor.healthBarY < actor.y &&
                actor.healthBarFill > 0,
            ).length,
        )
        .toBe(3);
    }
    await cast(bich, 'KeyW');
    await expect
      .poll(async () => (await frames(bich, 'poison_cloud_')).length)
      .toBe(1);
    await bich.screenshot({ path: info.outputPath('ngu-doc-arena.png') });

    await am.getByRole('button', { name: 'Thương Gia', exact: true }).click();
    await am.locator('[data-ui-action=gear][data-value=armor]').click();
    await am.locator('[data-ui-action=buy][data-value=armor]').click();
    await expect
      .poll(async () => (await self(am)).inventory.levels.armor)
      .toBe(1);
    await expect
      .poll(async () => (await snapshot(am)).state.creeps[reaperId]?.maxHp ?? 0)
      .toBeGreaterThan(before.maxHp);
    await am.keyboard.press('Escape');

    await am.getByRole('button', { name: 'Phó Bản', exact: true }).click();
    await am.locator('[data-destination=forest]').click();
    await expect(am.locator('#dungeon-kind')).toHaveText('Quái thường · Riêng');
    await am.locator('#enter-dungeon').click();
    await expect.poll(async () => (await self(am)).zoneId).toMatch(/^forest_/);
    const forest = (await self(am)).zoneId;
    await expect.poll(async () => (await presentation(am)).zoneId).toBe(forest);
    await expect
      .poll(async () => (await snapshot(am)).state.creeps[reaperId]?.zoneId)
      .toBe(forest);
    await expect
      .poll(async () =>
        (await presentation(am)).actors.find((actor) => actor.id === reaperId),
      )
      .toMatchObject({ texture: 'ngu-doc-minions', healthBarVisible: true });
    await expect
      .poll(async () =>
        (await presentation(bich)).actors.some(
          (actor) => actor.id === reaperId,
        ),
      )
      .toBe(false);
    await am.screenshot({ path: info.outputPath('ngu-doc-forest.png') });
    expect(errors).toEqual([]);
  } catch (error) {
    throw new Error(errors.length ? errors.join('\n') : String(error), {
      cause: error,
    });
  } finally {
    await Promise.allSettled(peers.map((peer) => peer.leave()));
    await Promise.all(contexts.map((context) => context.close()));
  }
});
