import { joinWaiting, startTogether } from './pregame-helper.js';
import { expect, test, type Page } from '@playwright/test';
import { Client } from '@colyseus/sdk';
import { PROTOCOL_VERSION, type LobbyState } from '@volam/game-protocol';
import { qaSession } from '../../tools/qa-session.mjs';
test.use({ viewport: { width: 1440, height: 1100 } });
interface Hero {
  basicId: string;
  x: number;
  y: number;
  hp: number;
  fx: number;
  fy: number;
  pose: string;
  basicCooldown: number;
  mana: number;
  xp: number;
  level: number;
  lastSequence: number;
}
interface Snapshot {
  sessionId: string;
  roomId: string;
  state: {
    tick: number;
    players: Record<string, Hero>;
    creeps: Record<string, Hero>;
    projectiles: Record<
      string,
      { vx: number; vy: number; x: number; y: number }
    >;
  };
  events: Array<{
    id: number;
    kind: string;
    sourceId: string;
    abilityId: string;
    targetId: string;
  }>;
}
interface Presentation {
  rotation: number;
  zoom: number;
  roundPixels: boolean;
  camera: { x: number; y: number };
  actors: Array<{
    id: string;
    x: number;
    y: number;
    depth: number;
    animation: string;
    frame: string;
    texture: string;
  }>;
  trees: Array<{ x: number; y: number; depth: number }>;
  animations: string[];
}
const snapshot = async (page: Page): Promise<Snapshot> =>
  page.evaluate('window.__VOLAM__.snapshot()');
const presentation = async (page: Page): Promise<Presentation> =>
  page.evaluate('window.__VOLAM__.presentation()');
const hero = async (page: Page): Promise<Hero> => {
  const s = await snapshot(page);
  return s.state.players[s.sessionId]!;
};
async function enter(
  page: Page,
  nickname: string,
  roomId?: string,
  defer = false,
): Promise<void> {
  await joinWaiting(page, nickname, roomId);
  if (!defer) await startTogether([page]);
}

async function moveTo(page: Page, x: number, y: number): Promise<void> {
  await page.locator('#game canvas').focus();
  for (const [axis, target, negative, positive] of [
    ['x', x, 'ArrowLeft', 'ArrowRight'],
    ['y', y, 'ArrowUp', 'ArrowDown'],
  ] as const) {
    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      const p = await hero(page);
      const distance = target - p[axis];
      if (Math.abs(distance) <= 8) break;
      // One driver-side key press bounds the hold duration independently of
      // screenshot/CDP latency. Measure only after the server observes release.
      await page.keyboard.press(distance < 0 ? negative : positive, {
        delay: Math.min(120, Math.max(30, Math.abs(distance) * 5 - 25)),
      });
      await expect
        .poll(async () => (await hero(page)).lastSequence)
        .toBeGreaterThan(p.lastSequence);
      await expect.poll(async () => (await hero(page)).pose).not.toBe('walk');
    }
    expect(
      Math.abs((await hero(page))[axis] - target),
      `Route axis ${axis} at (${x},${y})`,
    ).toBeLessThanOrEqual(8);
  }
}
function monitor(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

test('fixed follow camera, eight-way movement and foreground occlusion', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const errors = monitor(page);
  await enter(page, 'Lữ Khách');
  const start = await presentation(page);
  const sessionId = (await snapshot(page)).sessionId;
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowUp');
  await expect
    .poll(async () => (await hero(page)).fx)
    .toBeCloseTo(Math.SQRT1_2, 3);
  await expect
    .poll(async () => (await hero(page)).fy)
    .toBeCloseTo(-Math.SQRT1_2, 3);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.up('ArrowUp');
  // The diagonal probe can travel north of the trunk while polling. Approach
  // its south side through the open east lane, rather than steering through it.
  await moveTo(page, 750, 690);
  // Exercise open routes around the unchanged statue marker and its projected
  // sculpture. This does not claim M1 has a solid statue collider.
  await moveTo(page, 730, 690);
  await moveTo(page, 730, 520);
  await moveTo(page, 870, 520);
  await page.screenshot({ path: info.outputPath('statue-routes.png') });
  await moveTo(page, 870, 690);
  await moveTo(page, 750, 690);
  await moveTo(page, 680, 650);
  expect((await presentation(page)).trees.some((t) => t.x === 680)).toBe(false);
  // The old courtyard trunk is gone; use the relocated perimeter tree for
  // the retained feet-depth/foreground regression.
  await moveTo(page, 1260, 900);
  await moveTo(page, 1220, 900);
  await expect
    .poll(
      async () =>
        (await presentation(page)).actors.find((p) => p.id === sessionId)?.y,
    )
    .toBeGreaterThan(880);
  await page.screenshot({
    path: info.outputPath('front-of-tree.png'),
    fullPage: true,
  });
  await moveTo(page, 1260, 900);
  await moveTo(page, 1260, 820);
  await moveTo(page, 1220, 820);
  await expect
    .poll(
      async () =>
        (await presentation(page)).actors.find((p) => p.id === sessionId)?.y,
    )
    .toBeLessThan(840);
  const p = await presentation(page);
  const s = await snapshot(page);
  const player = p.actors.find((item) => item.id === s.sessionId)!;
  expect(player.depth).toBeLessThan(
    p.trees.find((tree) => tree.x === 1220)!.depth,
  );
  expect(p.camera).not.toEqual(start.camera);
  expect(p.rotation).toBe(0);
  expect(p.zoom).toBe(1);
  expect(p.roundPixels).toBe(true);
  expect(p.animations).toHaveLength(24);
  await page.screenshot({
    path: info.outputPath('behind-tree.png'),
    fullPage: true,
  });
  await moveTo(page, 1260, 820);
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await hero(page)).x).toBeGreaterThan(1270);
  await page.keyboard.up('ArrowRight');
  const canvas = page.locator('#game canvas');
  expect(
    await canvas.evaluate(
      (node) =>
        node instanceof HTMLCanvasElement &&
        Number.isInteger(node.clientWidth / node.width),
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test('two clients agree on combat, manual cadence, skills and progression', async ({
  browser,
}, info) => {
  test.setTimeout(90000);
  const aContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const bContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const a = await aContext.newPage();
  const b = await bContext.newPage();
  const errors = monitor(a);
  const bErrors = monitor(b);
  try {
    await enter(a, 'Cái Bang', undefined, true);
    const id = (await snapshot(a)).roomId;
    await enter(b, 'Đồng đội', id, true);
    await startTogether([a, b], ['cai_bang_chuong', 'thieu_lam_quyen']);
    await expect
      .poll(
        async () =>
          await a.evaluate(
            'window.__VOLAM__.progressionPresentation().statueIntroduction',
          ),
      )
      .toContain('Long Hồn Thần Thạch');
    await expect(a.locator('#slot-t')).toBeVisible();
    await expect(a.locator('#slot-t button')).toBeDisabled();
    await expect(a.locator('.loadout-toggle')).toBeHidden();
    await a.keyboard.press('KeyO');
    await expect(a.locator('#modal-layer')).toBeHidden();
    await a.screenshot({ path: info.outputPath('tuong-vo-than.png') });
    await b.bringToFront();
    await b.locator('#slot-q button').click();
    await expect(b.locator('#slot-q .skill-rank')).toHaveText('1');
    await b.keyboard.press('KeyF');
    await expect(b.locator('#shaolin-stance')).toHaveText('Cước · F');
    await expect(b.locator('#slot-q')).toHaveAttribute(
      'data-skill-id',
      'toan_phong_thoai',
    );
    await expect(b.locator('#slot-q .skill-rank')).toHaveText('1');
    await b.keyboard.press('KeyF');
    await expect(b.locator('#shaolin-stance')).toHaveText('Quyền · F');
    await a.bringToFront();
    await a.locator('#slot-q button').click();
    await expect(a.locator('#slot-q .skill-rank')).toHaveText('1');
    await a.locator('#game canvas').focus();
    const ringSamples = a.evaluate(async () => {
      const frames = new Map<string, number>();
      const deadline = performance.now() + 14000;
      const debug = (window as any).__VOLAM__;
      const owner = debug.snapshot().sessionId;
      while (performance.now() < deadline) {
        await new Promise(requestAnimationFrame);
        const ring = debug
          .progressionPresentation()
          .levelUpRings.find(
            (entry: { name: string }) => entry.name === 'level-up:' + owner,
          );
        if (ring && !frames.has(ring.frame)) frames.set(ring.frame, ring.y);
        if (frames.size >= 4) break;
      }
      return [...frames];
    }) as Promise<Array<[string, number]>>;
    const aId = (await snapshot(a)).sessionId;
    // Let the real AI approach. Do not walk toward an old target position:
    // movement/patch latency can carry the hero past it before the attack.
    const nearby = async () => {
      const s = await snapshot(a),
        h = s.state.players[aId]!;
      if (!h || h.hp <= 0)
        throw Error(
          `Combat fixture actor unavailable: ${JSON.stringify({ roomId: s.roomId, sessionId: aId, tick: s.state.tick, hero: h })}`,
        );
      const target = Object.values(s.state.creeps)
        .filter((c) => c.hp > 0)
        .sort(
          (c, d) =>
            Math.hypot(c.x - h.x, c.y - h.y) - Math.hypot(d.x - h.x, d.y - h.y),
        )[0];
      if (!target)
        throw Error(
          `Combat fixture has no living practice creep: room=${s.roomId}, tick=${s.state.tick}. Check the owned server's development fixture environment.`,
        );
      return target;
    };
    await expect
      .poll(async () => {
        const h = await hero(a),
          c = await nearby();
        return Math.hypot(c.x - h.x, c.y - h.y);
      })
      .toBeLessThan(42);
    // The spawn faces east and these M1 creeps approach from the east.
    // Keep the hero still: no latency-sensitive facing tap is needed.
    const position = await hero(a),
      currentTarget = await nearby();
    expect(position.fx).toBe(1);
    expect(position.fy).toBe(0);
    expect(currentTarget.x).toBeGreaterThan(position.x);
    const totalHp = async (page: Page): Promise<number> =>
      Object.values((await snapshot(page)).state.creeps).reduce(
        (sum, creep) => sum + creep.hp,
        0,
      );
    const before = await totalHp(a);
    await a.keyboard.press('KeyA');
    await expect.poll(() => totalHp(a)).toBeLessThan(before);
    await expect
      .poll(async () =>
        (await snapshot(a)).events.some(
          (event) =>
            event.kind === 'hit' &&
            event.sourceId === aId &&
            event.abilityId === position.basicId,
        ),
      )
      .toBe(true);
    const hit = (await snapshot(a)).events.find(
      (event) =>
        event.kind === 'hit' &&
        event.sourceId === aId &&
        event.abilityId === position.basicId,
    );
    expect(hit).toBeDefined();
    await expect
      .poll(
        async () =>
          (await snapshot(a)).state.creeps[hit!.targetId]!.hp -
          (await snapshot(b)).state.creeps[hit!.targetId]!.hp,
      )
      .toBe(0);
    await expect.poll(async () => (await hero(a)).basicCooldown).toBe(0);
    const count = (await snapshot(a)).events.filter(
      (e) => e.kind === 'attack' && e.sourceId === aId,
    ).length;
    await a.keyboard.down('KeyA');
    await a.waitForTimeout(900);
    await a.keyboard.up('KeyA');
    expect(
      (await snapshot(a)).events.filter(
        (e) => e.kind === 'attack' && e.sourceId === aId,
      ).length,
    ).toBe(count + 1);
    await a.keyboard.press('KeyQ');
    await expect.poll(async () => (await hero(a)).mana).toBeLessThan(90);
    await expect
      .poll(
        async () =>
          (await snapshot(a)).events.filter(
            (e) => e.kind === 'cast' && e.sourceId === aId,
          ).length,
      )
      .toBe(1);
    await a.keyboard.press('KeyT');
    await expect(a.locator('#feedback')).toContainText(
      /not equipped|chưa trang bị/,
    );
    // Finish through real manual inputs; no assumption that all projectiles hit one specific creep.
    await expect
      .poll(
        async () =>
          (await presentation(a)).actors.find((actor) => actor.id === aId)
            ?.texture,
      )
      .toBe('hero_cai_bang_chuong');
    await expect
      .poll(
        async () =>
          (await presentation(b)).actors.find((actor) => actor.id === aId)
            ?.texture,
      )
      .toBe('hero_cai_bang_chuong');
    const latestAttack = async (): Promise<number> =>
      (await snapshot(a)).events
        .filter((event) => event.kind === 'attack' && event.sourceId === aId)
        .at(-1)?.id ?? 0;
    for (let presses = 0; presses < 6 && (await hero(a)).xp < 60; presses++) {
      await expect.poll(async () => (await hero(a)).basicCooldown).toBe(0);
      const accepted = await latestAttack();
      await a.keyboard.press('KeyA');
      await expect.poll(latestAttack).toBeGreaterThan(accepted);
    }

    await expect
      .poll(async () => (await hero(a)).xp)
      .toBeGreaterThanOrEqual(60);
    expect((await hero(a)).level).toBeGreaterThanOrEqual(2);
    const frames = await ringSamples;
    await info.attach('level-up-frames', {
      body: JSON.stringify(frames),
      contentType: 'application/json',
    });
    expect(frames.map(([frame]) => frame)).toEqual([
      'nam_de_ring_0',
      'nam_de_ring_1',
      'nam_de_ring_2',
      'nam_de_ring_3',
    ]);
    expect(frames[3]![1]).toBeLessThan(frames[0]![1] - 20);
    await expect
      .poll(
        async () =>
          await a.evaluate(
            'window.__VOLAM__.progressionPresentation().levelUpRings.length',
          ),
      )
      .toBe(0);
    await expect(a.locator('#slot-w button')).toBeEnabled();
    await a.screenshot({
      path: info.outputPath('combat-a.png'),
      fullPage: true,
    });
    await b.screenshot({
      path: info.outputPath('combat-b.png'),
      fullPage: true,
    });
    expect(errors.concat(bErrors)).toEqual([]);
  } finally {
    await Promise.all([aContext.close(), bContext.close()]);
  }
});

test('ranged projectile uses a fixed trajectory and original effect frames', async ({
  page,
}, info) => {
  const errors = monitor(page);
  await enter(page, 'Hỏa Khách', undefined, true);
  await startTogether([page], ['cai_bang_chuong']);
  await expect
    .poll(
      async () =>
        (await snapshot(page)).state.players[(await snapshot(page)).sessionId]
          ?.basicCooldown,
    )
    .toBe(0);
  await page.keyboard.press('KeyA');
  let observed: { vx: number; vy: number } | undefined;
  await expect
    .poll(
      async () => {
        observed = Object.values((await snapshot(page)).state.projectiles)[0];
        return !!observed;
      },
      { intervals: [20, 20, 20] },
    )
    .toBe(true);
  expect(Math.hypot(observed!.vx, observed!.vy)).toBeCloseTo(360, 2);
  await page.screenshot({
    path: info.outputPath('straight-projectile.png'),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test('real PNG animation registry covers two actors, six states and four directions', async ({
  page,
}, info) => {
  const errors = monitor(page);
  await page.goto('/?artPreview=1');
  await expect(page.locator('#scene-status')).toHaveAttribute(
    'data-ready',
    'true',
  );
  const read = async (): Promise<{
    ready: boolean;
    sprites: Array<{ animation: string; frame: string; total: number }>;
  }> => page.evaluate('window.__VOLAM__.presentation()');
  const initial = await read();
  expect(initial.ready).toBe(true);
  expect(initial.sprites).toHaveLength(48);
  expect(
    initial.sprites.every((sprite) => [2, 4, 6].includes(sprite.total)),
  ).toBe(true);
  expect(
    initial.sprites
      .filter((sprite) => sprite.animation.startsWith('hero_cai_bang:idle:'))
      .every((sprite) => sprite.total === 2),
  ).toBe(true);
  await expect
    .poll(async () =>
      (await read()).sprites
        .filter((s) => s.animation.includes(':walk:'))
        .some(
          (s, i) =>
            s.frame !==
            initial.sprites.filter((item) => item.animation.includes(':walk:'))[
              i
            ]?.frame,
        ),
    )
    .toBe(true);
  await expect
    .poll(async () =>
      (await read()).sprites
        .filter((s) => s.animation.startsWith('creep_outlaw:death:'))
        .every((s) => s.frame.endsWith('_3')),
    )
    .toBe(true);
  await page.screenshot({
    path: info.outputPath('animation-gallery.png'),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test('six players keep a full arena viewport and synchronize a learned skill', async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors = monitor(page);
  await joinWaiting(page, 'Hộ Thạch');
  const { roomId } = await snapshot(page);
  const client = new Client(qaSession().serverUrl);
  const peers = await Promise.all(
    ['Bổng', 'Phiến', 'Đao', 'Kiếm', 'Quyền'].map((nickname) =>
      client.joinById<LobbyState>(roomId, {
        protocolVersion: PROTOCOL_VERSION,
        nickname,
      }),
    ),
  );
  try {
    for (const peer of peers) peer.onMessage('combat-event', () => {});
    await expect(page.locator('#pregame .pre-players li')).toHaveCount(6);
    await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    const branches = [
      ['cai_bang', 'cai_bang_bong'],
      ['thien_son', 'thien_son_phien'],
      ['thieu_lam', 'thieu_lam_dao'],
      ['vo_dang', 'vo_dang_kiem'],
      ['vo_dang', 'vo_dang_quyen'],
    ] as const;
    await Promise.all(
      peers.map(async (peer, i) => {
        await expect.poll(() => peer.state.phase).toBe('SCHOOL_SELECTION');
        const [schoolId, basicId] = branches[i]!;
        peer.send('lobby-action', { action: 'select', schoolId });
        peer.send('lobby-action', { action: 'branch', basicId });
        await expect
          .poll(() => peer.state.players.get(peer.sessionId)?.selectedBranch)
          .toBe(basicId);
        peer.send('lobby-action', { action: 'confirm' });
      }),
    );
    await startTogether([page], ['cai_bang_chuong'], 15_000, true);
    const { sessionId } = await snapshot(page);
    await expect
      .poll(
        async () => Object.keys((await snapshot(page)).state.players).length,
      )
      .toBe(6);
    await page.locator('#slot-q button').click();
    await expect
      .poll(() =>
        peers.every(
          (peer) =>
            peer.state.players.get(sessionId)?.qSkill === 'hoa_van_chuong',
        ),
      )
      .toBe(true);
    const viewport = await page.locator('#viewport').boundingBox();
    expect(viewport).toMatchObject({ x: 0, y: 0, width: 1280, height: 720 });
    await page.locator('#game canvas').focus();
    await page.keyboard.press('KeyA');
    await expect
      .poll(async () =>
        (await snapshot(page)).events.some(
          (event) => event.kind === 'hit' && event.sourceId === sessionId,
        ),
      )
      .toBe(true);
    await page.screenshot({ path: info.outputPath('six-player-arena.png') });
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(peers.map((peer) => peer.leave()));
  }
});
