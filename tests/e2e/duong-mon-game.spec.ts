import { expect, test, type Page } from '@playwright/test';
import { Client, type Room } from '@colyseus/sdk';
import { PROTOCOL_VERSION, type LobbyState } from '@volam/game-protocol';
import { duongMon } from '@volam/game-core';
import { skillIcon } from '@volam/game-data';
import { joinWaiting, startTogether } from './pregame-helper.js';

interface Event {
  sourceId: string;
  abilityId: string;
  kind: string;
  stage?: string;
}
interface Hero {
  basicId: string;
  level: number;
  dashCharges: number;
  x: number;
  y: number;
  statuses: string;
}
interface Snapshot {
  sessionId: string;
  roomId: string;
  events: Event[];
  state: {
    phase: string;
    players: Record<string, Hero>;
    areas: Record<string, { abilityId: string }>;
  };
}
interface Presentation {
  actors: {
    id: string;
    texture: string;
    frame: string;
    x: number;
    y: number;
  }[];
  duongMon: { frame: string; x: number; y: number; rotation: number }[];
}
const snapshot = (page: Page) =>
  page.evaluate<Snapshot>('window.__VOLAM__.snapshot()');
const presentation = (page: Page) =>
  page.evaluate<Presentation>('window.__VOLAM__.presentation()');
const self = async (page: Page) => {
  const s = await snapshot(page);
  return s.state.players[s.sessionId]!;
};

test('Đường Môn starts at level 6 in a real room and plays the approved assets', async ({
  browser,
}, info) => {
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const peers: Room<LobbyState>[] = [];
  try {
    const a = await contexts[0]!.newPage(),
      b = await contexts[1]!.newPage();
    const errors: string[] = [];
    for (const page of [a, b]) {
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (
          (message.type() === 'error' &&
            !message.text().includes('Failed to load resource')) ||
          (message.type() === 'warning' &&
            /missing.*(texture|frame)|duong-mon/i.test(message.text()))
        )
          errors.push(message.text());
      });
      page.on('requestfailed', (r) => {
        if (
          r.url().startsWith(new URL(page.url()).origin) &&
          r.failure()?.errorText !== 'net::ERR_ABORTED'
        )
          errors.push(r.url() + ' ' + r.failure()?.errorText);
      });
      page.on('response', (response) => {
        if (
          (response.url().includes('/assets/duong-mon/') ||
            response.url().includes('/assets/skills/duong-mon-icons-v1/')) &&
          response.status() >= 400
        )
          errors.push(response.url() + ' ' + response.status());
      });
    }
    await joinWaiting(a, 'Tuan Sa', undefined, '/?debug=1', 45000);
    const first = await snapshot(a);
    await joinWaiting(b, 'Da Hanh', first.roomId, '/?debug=1', 45000);
    const second = await snapshot(b);
    const client = new Client(
      'http://127.0.0.1:' + (process.env['VOLAM_QA_SERVER_PORT'] ?? 2794),
    );
    const branches = [
      ['cai_bang', 'cai_bang_bong'],
      ['thien_son', 'thien_son_phien'],
      ['vo_dang', 'vo_dang_kiem'],
      ['thieu_lam', 'thieu_lam_quyen'],
    ] as const;
    const roster = await Promise.all(
      branches.map(async ([schoolId]) => {
        const peer = await client.joinById<LobbyState>(first.roomId, {
          protocolVersion: PROTOCOL_VERSION,
          nickname: schoolId,
        });
        peer.onMessage('combat-event', () => {});
        peers.push(peer);
        return peer;
      }),
    );
    await expect(a.locator('#pregame .pre-players li')).toHaveCount(6);
    await a.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    await Promise.all(
      roster.map(async (peer, i) => {
        const [schoolId, basicId] = branches[i]!;
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
    try {
      await startTogether(
        [a, b],
        [duongMon.coQuan, duongMon.amKhi],
        45000,
        true,
      );
    } catch (error) {
      for (const page of [a, b]) {
        errors.push(await page.locator('#pregame').innerText());
      }
      throw new Error(errors.join('\n'), { cause: error });
    }
    for (const [page, branch, charges] of [
      [a, duongMon.coQuan, 2],
      [b, duongMon.amKhi, 4],
    ] as const)
      await expect
        .poll(() => self(page))
        .toMatchObject({ basicId: branch, level: 6, dashCharges: charges });
    for (const page of [a, b])
      await expect
        .poll(async () => (await presentation(page)).actors)
        .toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: first.sessionId,
              texture: 'duong-mon-tuan-sa-walk',
            }),
            expect.objectContaining({
              id: second.sessionId,
              texture: 'duong-mon-da-hanh-walk',
            }),
          ]),
        );
    await expect
      .poll(async () => Object.keys((await snapshot(a)).state.players).length)
      .toBe(6);
    await expect(a.locator('.portrait')).toHaveCSS(
      'background-image',
      /duong-mon-tuan-sa-walk/,
    );
    await expect(b.locator('.portrait')).toHaveCSS(
      'background-image',
      /duong-mon-da-hanh-walk/,
    );
    await expect
      .poll(async () =>
        (await presentation(a)).actors.some(
          (actor) => actor.texture === 'duong-mon-practice-dummy',
        ),
      )
      .toBe(true);
    const cast = async (page: Page, key: string) => {
      await page.bringToFront();
      await page.locator('#game canvas').focus();
      await page.keyboard.press(key);
    };
    const received = (
      observer: Page,
      sourceId: string,
      abilityId: string,
      kind: string,
      stage?: string,
    ) =>
      expect
        .poll(async () =>
          (await snapshot(observer)).events.some(
            (e) =>
              e.sourceId === sourceId &&
              e.abilityId === abilityId &&
              e.kind === kind &&
              (!stage || e.stage === stage),
          ),
        )
        .toBe(true);
    const bar = 'aqwert';
    for (const [page, ids, branch] of [
      [
        a,
        [
          duongMon.coQuan,
          duongMon.arrows,
          duongMon.flight,
          duongMon.laser,
          duongMon.shell,
          duongMon.flowers,
        ],
        'co-quan',
      ],
      [
        b,
        [
          duongMon.amKhi,
          duongMon.trap,
          duongMon.knives,
          duongMon.evade,
          duongMon.elements,
          duongMon.storm,
        ],
        'am-khi',
      ],
    ] as const) {
      for (const [index, id] of ids.entries()) {
        const icon = page.locator('#slot-' + bar[index] + ' .pixel-icon');
        await expect(icon).toHaveCSS(
          'background-image',
          'url("' + new URL(skillIcon(id), page.url()).href + '")',
        );
      }
      const passive = page.getByAltText('Tứ tuyệt khí');
      await expect(passive).toBeVisible();
      await expect(passive).toHaveAttribute('src', skillIcon(duongMon.passive));
      await expect
        .poll(() =>
          passive.evaluate(
            (image: HTMLImageElement) =>
              image.complete && image.naturalWidth === 64,
          ),
        )
        .toBe(true);
      await page.screenshot({ path: info.outputPath(branch + '-hotbar.png') });
    }
    await a.bringToFront();
    await a.locator('#game canvas').focus();
    await a.keyboard.down('ArrowRight');
    try {
      const x = (await self(a)).x;
      await expect.poll(async () => (await self(a)).x).toBeGreaterThan(x + 5);
      await expect
        .poll(async () =>
          (await presentation(a)).actors.some(
            (h) => h.id === first.sessionId && h.frame.startsWith('step-'),
          ),
        )
        .toBe(true);
    } finally {
      await a.keyboard.up('ArrowRight');
    }
    await cast(a, 'KeyA');
    await received(b, first.sessionId, duongMon.coQuan, 'attack');
    await cast(a, 'KeyW');
    await received(b, first.sessionId, duongMon.flight, 'cast');
    await expect
      .poll(async () => (await self(a)).statuses)
      .toContain('duong_mon_flight');
    await expect
      .poll(
        async () =>
          (await presentation(a)).actors.find((h) => h.id === first.sessionId)
            ?.frame,
      )
      .toContain('hover');
    await cast(a, 'KeyQ');
    await received(b, first.sessionId, duongMon.arrows, 'cast');
    await cast(a, 'KeyW');
    await expect
      .poll(async () => (await self(a)).statuses)
      .not.toContain('duong_mon_flight');
    await cast(a, 'KeyE');
    await expect
      .poll(
        async () =>
          (await presentation(a)).duongMon.some((e) => e.frame === 'laser'),
        { intervals: [25, 40] },
      )
      .toBe(true);
    await a.screenshot({ path: info.outputPath('tuan-sa-laser.png') });
    await cast(b, 'KeyA');
    await received(a, second.sessionId, duongMon.amKhi, 'attack');
    await cast(b, 'KeyQ');
    await expect
      .poll(async () =>
        Object.values((await snapshot(b)).state.areas).some(
          (e) => e.abilityId === duongMon.trap,
        ),
      )
      .toBe(true);
    expect(
      Object.values((await snapshot(a)).state.areas).some(
        (e) => e.abilityId === duongMon.trap,
      ),
    ).toBe(false);
    expect(
      (await snapshot(a)).events.some(
        (e) => e.abilityId === duongMon.trap && e.kind === 'cast',
      ),
    ).toBe(false);
    await cast(b, 'KeyW');
    await received(a, second.sessionId, duongMon.knives, 'cast');
    await cast(b, 'KeyE');
    await expect
      .poll(async () => (await self(b)).statuses)
      .toContain('duong_mon_evade');
    await expect
      .poll(async () =>
        (JSON.parse((await self(b)).statuses) as { kind: string }[]).some(
          (s) => s.kind === 'dash',
        ),
      )
      .toBe(false);
    await cast(b, 'KeyR');
    expect(
      (await snapshot(b)).events.some(
        (e) => e.abilityId === duongMon.elements && e.kind === 'cast',
      ),
    ).toBe(false);
    const openLane = (await self(b)).y;
    await b.keyboard.down('ArrowDown');
    try {
      await expect
        .poll(async () => (await self(b)).y)
        .toBeGreaterThan(openLane + 84);
    } finally {
      await b.keyboard.up('ArrowDown');
    }
    await cast(b, 'KeyT');
    await received(a, second.sessionId, duongMon.storm, 'cast');
    await expect
      .poll(
        async () =>
          (await presentation(b)).duongMon.filter((e) => e.frame === 'knife')
            .length,
        { intervals: [25, 40] },
      )
      .toBeGreaterThan(15);
    await b.screenshot({ path: info.outputPath('da-hanh-storm.png') });
    await cast(a, 'KeyR');
    await expect
      .poll(async () => (await self(a)).statuses)
      .toContain('duong_mon_shell');
    await expect
      .poll(async () => (await self(a)).statuses, { timeout: 7000 })
      .not.toContain('duong_mon_shell');
    await cast(a, 'KeyT');
    await expect
      .poll(
        async () =>
          (await presentation(a)).duongMon.filter((e) => e.frame === 'flower')
            .length,
        { intervals: [30, 50] },
      )
      .toBe(20);
    await expect
      .poll(
        async () =>
          (await presentation(a)).duongMon.filter((e) => e.frame === 'needle')
            .length,
        { intervals: [20, 40] },
      )
      .toBeGreaterThanOrEqual(100);
    await a.screenshot({ path: info.outputPath('tuan-sa-blossom.png') });
    expect(errors).toEqual([]);
  } finally {
    await Promise.all([
      ...contexts.map((context) => context.close()),
      ...peers.map((peer) => peer.leave()),
    ]);
  }
});
