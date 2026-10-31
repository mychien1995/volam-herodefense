import { joinWaiting, startTogether } from './pregame-helper.js';
import { expect, test, type Page } from '@playwright/test';
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

async function selectRanged(page: Page): Promise<void> {
  await page.locator('[data-menu=skills]').first().click();
  if (await page.locator('#skill-branch').isVisible())
    await page.locator('#skill-branch').selectOption('cai_bang_chuong');
  else
    await page
      .getByLabel('Đánh thường · A', { exact: true })
      .selectOption('cai_bang_chuong');
  await page.getByRole('button', { name: 'Đóng menu', exact: true }).click();
  await expect
    .poll(async () => {
      const s = await snapshot(page);
      return (s.state.players[s.sessionId] as Hero & { basicId: string })
        .basicId;
    })
    .toBe('cai_bang_chuong');
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
  test.setTimeout(60000);
  const aContext = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  const bContext = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  const a = await aContext.newPage();
  const b = await bContext.newPage();
  const errors = monitor(a);
  const bErrors = monitor(b);
  try {
    await enter(a, 'Cái Bang', undefined, true);
    const id = (await snapshot(a)).roomId;
    await enter(b, 'Đồng đội', id, true);
    await startTogether([a, b]);
    const progressed = await a.evaluate<boolean>(
      'window.__VOLAM__.snapshot().state.players[window.__VOLAM__.snapshot().sessionId].build.enabled',
    );
    if (progressed) {
      await a.locator('[data-menu=skills]').first().click();
      await a.locator('#skill-branch').selectOption('cai_bang_chuong');
      await expect(a.locator('#slot-q')).toHaveAttribute(
        'data-skill-id',
        'hoa_van_chuong',
      );
      await expect(a.locator('#available-points')).toHaveText('0');
      await a.keyboard.press('Escape');
    }
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
    await a.keyboard.press('KeyW');
    await expect.poll(async () => (await hero(a)).mana).toBeLessThan(90);
    await expect
      .poll(
        async () =>
          (await snapshot(a)).events.filter(
            (e) => e.kind === 'cast' && e.sourceId === aId,
          ).length,
      )
      .toBe(progressed ? 1 : 2);
    await a.keyboard.press('KeyE');
    await expect(a.locator('#feedback')).toContainText(
      /not equipped|chưa trang bị/,
    );
    // Finish through real manual inputs; no assumption that all projectiles hit one specific creep.
    await selectRanged(a);
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
    await a.screenshot({
      path: info.outputPath('combat-a.png'),
      fullPage: true,
    });
    await a
      .locator('#viewport')
      .screenshot({ path: info.outputPath('arena-panel.png') });
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
  await enter(page, 'Hỏa Khách');
  await selectRanged(page);
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
