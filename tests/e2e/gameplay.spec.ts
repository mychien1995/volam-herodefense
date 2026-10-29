import { expect, test, type Page } from '@playwright/test';
test.use({ viewport: { width: 1440, height: 1100 } });
interface Hero {
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
): Promise<void> {
  await page.goto('/?debug=1');
  await expect(page.locator('#scene-status')).toHaveAttribute(
    'data-ready',
    'true',
  );
  await page.getByLabel('Nickname', { exact: true }).fill(nickname);
  if (roomId) await page.getByLabel('Room ID').fill(roomId);
  await page
    .getByRole('button', {
      name: roomId ? 'Join room' : 'Create room',
      exact: true,
    })
    .click();
  await expect(page.getByTestId('status')).toHaveText('Connected');
  await expect
    .poll(
      async () =>
        (await snapshot(page)).state?.players[(await snapshot(page)).sessionId]
          ?.hp,
    )
    .toBeGreaterThan(0);
}
async function selectRanged(page: Page): Promise<void> {
  await page.locator('[data-menu=skills]').first().click();
  await page.getByLabel('Normal attack').selectOption('cai_bang_chuong');
  await page.getByRole('button', { name: 'Close menu', exact: true }).click();
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
  const held = new Set<string>();
  const deadline = Date.now() + 8000;
  try {
    while (Date.now() < deadline) {
      const p = await hero(page);
      if (Math.hypot(p.x - x, p.y - y) < 7) return;
      const desired = new Set<string>();
      if (Math.abs(p.x - x) > 4)
        desired.add(p.x < x ? 'ArrowRight' : 'ArrowLeft');
      if (Math.abs(p.y - y) > 4) desired.add(p.y < y ? 'ArrowDown' : 'ArrowUp');
      for (const key of held)
        if (!desired.has(key)) {
          await page.keyboard.up(key);
          held.delete(key);
        }
      for (const key of desired)
        if (!held.has(key)) {
          await page.keyboard.down(key);
          held.add(key);
        }
      await page.waitForTimeout(40);
    }
    throw new Error(
      `Could not reach (${x},${y}): ${JSON.stringify(await hero(page))}`,
    );
  } finally {
    for (const key of held) await page.keyboard.up(key);
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
  await moveTo(page, 680, 680);
  await expect
    .poll(
      async () =>
        (await presentation(page)).actors.find((p) => p.id === sessionId)?.y,
    )
    .toBeGreaterThan(665);
  await page.screenshot({
    path: info.outputPath('front-of-tree.png'),
    fullPage: true,
  });
  await moveTo(page, 640, 680);
  await moveTo(page, 640, 610);
  await moveTo(page, 680, 610);
  await expect
    .poll(
      async () =>
        (await presentation(page)).actors.find((p) => p.id === sessionId)?.y,
    )
    .toBeLessThan(625);
  const p = await presentation(page);
  const s = await snapshot(page);
  const player = p.actors.find((item) => item.id === s.sessionId)!;
  expect(player.depth).toBeLessThan(
    p.trees.find((tree) => tree.x === 680)!.depth,
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
  await moveTo(page, 640, 610);
  await moveTo(page, 640, 685);
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await hero(page)).x).toBeGreaterThan(650);
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
    await enter(a, 'Cái Bang');
    const id = (await snapshot(a)).roomId;
    await enter(b, 'Đồng đội', id);
    const aId = (await snapshot(a)).sessionId;
    // Let the real AI approach. Do not walk toward an old target position:
    // movement/patch latency can carry the hero past it before the attack.
    const nearby = async () => {
      const s = await snapshot(a),
        h = s.state.players[aId]!;
      return Object.values(s.state.creeps)
        .filter((c) => c.hp > 0)
        .sort(
          (c, d) =>
            Math.hypot(c.x - h.x, c.y - h.y) - Math.hypot(d.x - h.x, d.y - h.y),
        )[0]!;
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
            event.abilityId === 'cai_bang_bong',
        ),
      )
      .toBe(true);
    const hit = (await snapshot(a)).events.find(
      (event) =>
        event.kind === 'hit' &&
        event.sourceId === aId &&
        event.abilityId === 'cai_bang_bong',
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
      .toBe(2);
    await a.keyboard.press('KeyE');
    await expect(a.locator('#feedback')).toContainText('not equipped');
    // Finish through real manual inputs; no assumption that all projectiles hit one specific creep.
    await selectRanged(a);
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
  await expect
    .poll(
      async () => Object.keys((await snapshot(page)).state.projectiles).length,
      { intervals: [20, 20, 20] },
    )
    .toBeGreaterThan(0);
  const projectiles = (await snapshot(page)).state.projectiles;
  const entry = Object.entries(projectiles)[0]!;
  expect(Math.hypot(entry[1].vx, entry[1].vy)).toBeCloseTo(360, 2);
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
  expect(initial.sprites.every((sprite) => sprite.total === 4)).toBe(true);
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
        .filter((s) => s.animation.includes(':death:'))
        .every((s) => s.frame.endsWith('_3')),
    )
    .toBe(true);
  await page.screenshot({
    path: info.outputPath('animation-gallery.png'),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
