import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { startTogether } from './pregame-helper.js';
const evidence = resolve('assets/reviews/thien_son_v01');
test.use({ trace: 'off' });
type Actor = {
  id: string;
  x: number;
  y: number;
  depth: number;
  texture: string;
  animation: string;
  frame: string;
  origin: number[];
  scale: number[];
};
type Presentation = {
  zoom: number;
  rotation: number;
  actors: Actor[];
  trees: Array<{ y: number; depth: number }>;
};
type Snapshot = {
  sessionId: string;
  roomId: string;
  state: {
    players: Record<
      string,
      {
        x: number;
        y: number;
        hp: number;
        basicId: string;
        schoolId: string;
        pose: string;
        basicCooldown: number;
        lastSequence: number;
      }
    >;
  };
};
type Gallery = {
  ready: boolean;
  sprites: Array<{
    animation: string;
    frame: string;
    total: number;
    frameRate: number;
    playing: boolean;
    x: number;
    y: number;
    origin: number[];
    scale: number[];
  }>;
};
const snapshot = (p: Page) =>
  p.evaluate<Snapshot>('window.__VOLAM__.snapshot()');
const presentation = (p: Page) =>
  p.evaluate<Presentation>('window.__VOLAM__.presentation()');
const gallery = (p: Page) =>
  p.evaluate<Gallery>('window.__VOLAM__.presentation()');
async function waiting(p: Page, nickname: string, room?: string, dao = false) {
  await p.bringToFront();
  await p.goto('/?debug=1' + (dao ? '&thienSonWeapon=dao' : ''));
  await p.locator('[data-action=play]').click();
  await p.locator('#pre-nickname').fill(nickname);
  await p.getByRole('button', { name: 'Vào game', exact: true }).click();
  if (room) {
    await p
      .locator('#pregame')
      .getByLabel('Mã phòng', { exact: true })
      .fill(room);
    await p
      .locator('#pregame')
      .getByLabel('Mã phòng', { exact: true })
      .press('Enter');
  } else
    await p.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
  await expect(p.locator('#pregame .pre-title')).toHaveText('Phòng chờ');
}
async function move(p: Page, key: string, ms: number) {
  await p.bringToFront();
  await p.locator('#game canvas').focus();
  await p.keyboard.down(key);
  try {
    await p.waitForTimeout(ms);
  } finally {
    await p.keyboard.up(key);
  }
}
test('Thiên Sơn both weapon atlases play all 24 authored tags in Phaser', async ({
  page,
}) => {
  test.setTimeout(45000);
  mkdirSync(evidence, { recursive: true });
  await page.setViewportSize({ width: 960, height: 1040 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.url().includes('/assets/') && r.status() >= 400)
      errors.push(r.status() + ' ' + r.url());
  });
  await page.goto('/?artPreview=1&thienSonReview=1');
  await expect(page.locator('#scene-status')).toHaveAttribute(
    'data-ready',
    'true',
  );
  const initial = await gallery(page);
  expect(initial.ready).toBe(true);
  expect(initial.sprites).toHaveLength(24);
  const observations: Array<{ at: number; data: Gallery }> = [];
  for (let i = 0; i < 70; i++) {
    observations.push({ at: Date.now(), data: await gallery(page) });
    await page.waitForTimeout(30);
  }
  const timing = [];
  for (const sprite of initial.sprites) {
    const samples = observations.map((o) => ({
      at: o.at,
      s: o.data.sprites.find((a) => a.animation === sprite.animation)!,
    }));
    const frames = new Set(samples.map((v) => v.s.frame));
    expect(frames.size, sprite.animation).toBe(sprite.total);
    expect(sprite.origin).toEqual([0.5, 0.8]);
    expect(sprite.scale).toEqual([1, 1]);
    expect(samples.every((v) => v.s.x === sprite.x && v.s.y === sprite.y)).toBe(
      true,
    );
    const changes = samples.filter(
      (v, i) => i > 0 && v.s.frame !== samples[i - 1]!.s.frame,
    );
    timing.push({
      animation: sprite.animation,
      frames: [...frames],
      frameRate: sprite.frameRate,
      changes: changes.map((c) => ({ at: c.at, frame: c.s.frame })),
    });
  }
  await page
    .locator('#game canvas')
    .screenshot({ path: resolve(evidence, 'both_weapons_phaser_2x.png') });
  expect(errors).toEqual([]);
  writeFileSync(
    resolve(evidence, 'animation_observations.json'),
    JSON.stringify({ initial, errors, timing }, null, 2),
  );
});
for (const dao of [false, true]) {
  test(
    'Thiên Sơn ' +
      (dao ? 'đao art-review variant' : 'fan') +
      ' real match: four facings, transitions and shared authority',
    async ({ browser }) => {
      test.setTimeout(120000);
      mkdirSync(evidence, { recursive: true });
      const contexts = await Promise.all([
        browser.newContext({ viewport: { width: 1280, height: 720 } }),
        browser.newContext({ viewport: { width: 1280, height: 720 } }),
      ]);
      const errors: string[] = [];
      try {
        const [a, b] = await Promise.all(contexts.map((c) => c.newPage()));
        if (!a || !b) throw new Error('Missing pages');
        for (const p of [a, b]) {
          p.on('pageerror', (e) => errors.push(e.message));
          p.on('response', (r) => {
            if (r.url().includes('/assets/') && r.status() >= 400)
              errors.push(r.status() + ' ' + r.url());
          });
        }
        await waiting(a, 'Thien Son review', undefined, dao);
        const room = (await snapshot(a)).roomId;
        await waiting(b, 'Cai Bang scale', room, dao);
        await startTogether([a, b], ['thien_son', 'cai_bang']);
        const id = (await snapshot(a)).sessionId;
        const texture = dao ? 'hero_thien_son_dao' : 'hero_thien_son';
        const actor = async () =>
          (await presentation(a)).actors.find((v) => v.id === id)!;
        await expect.poll(async () => (await actor()).texture).toBe(texture);
        const initial = await snapshot(a);
        expect(initial.state.players[id]!.schoolId).toBe('thien_son');
        // Move away from practice enemies; server outcomes and movement remain genuine.
        await move(a, 'ArrowLeft', 1400);
        await expect
          .poll(async () => (await snapshot(a)).state.players[id]!.pose)
          .toBe('idle');
        const captures = [];
        for (const [direction, key] of [
          ['down', 'ArrowDown'],
          ['left', 'ArrowLeft'],
          ['right', 'ArrowRight'],
          ['up', 'ArrowUp'],
        ] as const) {
          await a.bringToFront();
          await a.locator('#game canvas').focus();
          await a.keyboard.down(key);
          await expect
            .poll(async () => (await actor()).animation)
            .toBe(texture + ':walk:' + direction);
          const first = (await actor()).frame;
          await expect.poll(async () => (await actor()).frame).not.toBe(first);
          await a.keyboard.up(key);
          await expect
            .poll(async () => (await actor()).animation)
            .toBe(texture + ':idle:' + direction);
          const stable = await actor();
          await a.waitForTimeout(400);
          const idle = await actor();
          expect([idle.x, idle.y]).toEqual([stable.x, stable.y]);
          expect(idle.depth).toBe(idle.y);
          expect(idle.origin).toEqual([0.5, 0.8]);
          expect(idle.scale).toEqual([1, 1]);
          await expect
            .poll(
              async () => (await snapshot(a)).state.players[id]!.basicCooldown,
            )
            .toBe(0);
          // Observe locally on animation frames so CDP round trips cannot miss a 300ms pose.
          const observing = a.evaluate(
            async ({ id, texture, direction }) => {
              const api = (
                window as unknown as {
                  __VOLAM__: { presentation(): Presentation };
                }
              ).__VOLAM__;
              const samples: Array<{
                at: number;
                animation: string;
                frame: string;
              }> = [];
              const start = performance.now();
              await new Promise<void>((resolve) => {
                const sample = () => {
                  const v = api.presentation().actors.find((a) => a.id === id);
                  if (v)
                    samples.push({
                      at: performance.now() - start,
                      animation: v.animation,
                      frame: v.frame,
                    });
                  if (performance.now() - start < 650)
                    requestAnimationFrame(sample);
                  else resolve();
                };
                requestAnimationFrame(sample);
              });
              return samples.filter(
                (s) => s.animation === texture + ':basic_attack:' + direction,
              );
            },
            { id, texture, direction },
          );
          await a.keyboard.press('KeyA');
          const attackSamples = await observing;
          const attackFrames = new Set(attackSamples.map((s) => s.frame));
          expect(attackFrames.size).toBeGreaterThanOrEqual(2);
          await expect
            .poll(async () => (await actor()).animation)
            .toBe(texture + ':idle:' + direction);
          const h = (await snapshot(a)).state.players[id]!;
          await expect
            .poll(async () => {
              const other = (await snapshot(b)).state.players[id]!;
              return [other.x, other.y, other.hp, other.basicId];
            })
            .toEqual([h.x, h.y, h.hp, h.basicId]);
          captures.push({
            direction,
            actor: await actor(),
            authoritative: h,
            attackFrames: [...attackFrames],
          });
        }
        const view = await presentation(a);
        expect(view.zoom).toBe(1);
        expect(view.rotation).toBe(0);
        expect(view.trees.every((t) => t.depth === t.y)).toBe(true);
        await move(a, 'ArrowDown', 90);
        await expect
          .poll(async () => (await actor()).animation)
          .toBe(texture + ':idle:down');
        const label = dao ? 'dao' : 'fan';
        await a.screenshot({
          path: resolve(evidence, label + '_gameplay_1280x720.png'),
        });
        await a.setViewportSize({ width: 1920, height: 1080 });
        await a.waitForTimeout(150);
        await a.screenshot({
          path: resolve(evidence, label + '_gameplay_1920x1080.png'),
        });
        await a.setViewportSize({ width: 944, height: 466 });
        await a.waitForTimeout(150);
        await a
          .locator('#game canvas')
          .screenshot({ path: resolve(evidence, label + '_logical_1x.png') });
        // A creates exactly the existing server attack; the review variant never changes basicId.
        const attacks = (
          await a.evaluate<
            { sourceId: string; kind: string; abilityId: string }[]
          >('window.__VOLAM__.snapshot().events')
        ).filter((e) => e.sourceId === id && e.kind === 'attack');
        expect(attacks.length).toBeGreaterThanOrEqual(4);
        expect(
          attacks.every(
            (e) => e.abilityId === initial.state.players[id]!.basicId,
          ),
        ).toBe(true);
        expect(errors).toEqual([]);
        writeFileSync(
          resolve(evidence, label + '_match_observations.json'),
          JSON.stringify(
            {
              reviewVariantOnly: dao,
              initial,
              final: await snapshot(a),
              captures,
              presentation: view,
              errors,
            },
            null,
            2,
          ),
        );
      } finally {
        await Promise.all(contexts.map((c) => c.close()));
      }
    },
  );
}

test('Six-player mixed-school scene preserves Thiên Sơn scale and feet depth', async ({
  browser,
}) => {
  test.setTimeout(180000);
  mkdirSync(evidence, { recursive: true });
  const contexts = await Promise.all(
    Array.from({ length: 6 }, (_, index) =>
      browser.newContext({
        viewport:
          index === 0
            ? { width: 1280, height: 720 }
            : { width: 640, height: 360 },
      }),
    ),
  );
  const errors: string[] = [];
  try {
    const pages = await Promise.all(contexts.map((c) => c.newPage()));
    const first = pages[0]!;
    for (const p of pages) p.on('pageerror', (e) => errors.push(e.message));
    await waiting(first, 'Thien Son 1');
    const room = (await snapshot(first)).roomId;
    for (let i = 1; i < 6; i++)
      await waiting(
        pages[i]!,
        (i < 4 ? 'Thien Son ' : 'Cai Bang ') + (i + 1),
        room,
      );
    await startTogether(pages, [
      'thien_son',
      'thien_son',
      'thien_son',
      'thien_son',
      'cai_bang',
      'cai_bang',
    ]);
    const targets = [
      [800, 800],
      [740, 750],
      [800, 720],
      [860, 750],
      [740, 830],
      [860, 830],
    ];
    for (let i = 0; i < 6; i++) {
      const p = pages[i]!;
      for (const [axis, minus, plus] of [
        ['x', 'ArrowLeft', 'ArrowRight'],
        ['y', 'ArrowUp', 'ArrowDown'],
      ] as const) {
        const target = targets[i]![axis === 'x' ? 0 : 1]!;
        for (let attempt = 0; attempt < 12; attempt++) {
          const s = await snapshot(p);
          const value = s.state.players[s.sessionId]![axis];
          if (Math.abs(value - target) < 12) break;
          await p.bringToFront();
          await p.locator('#game canvas').focus();
          await p.keyboard.press(value < target ? plus : minus, {
            delay: Math.min(
              800,
              Math.max(30, (Math.abs(value - target) * 1000) / 140 - 25),
            ),
          });
          await expect
            .poll(async () => {
              const after = await snapshot(p);
              return after.state.players[after.sessionId]!.lastSequence;
            })
            .toBeGreaterThan(s.state.players[s.sessionId]!.lastSequence);
          await expect
            .poll(async () => {
              const st = await snapshot(p);
              return st.state.players[st.sessionId]!.pose;
            })
            .not.toBe('walk');
        }
        const s = await snapshot(p);
        expect(
          Math.abs(s.state.players[s.sessionId]![axis] - target),
        ).toBeLessThan(18);
      }
    }
    await move(first, 'ArrowDown', 70);
    await first.waitForTimeout(200);
    const all = await snapshot(first);
    const view = await presentation(first);
    const ids = Object.keys(all.state.players);
    expect(view.actors.filter((a) => ids.includes(a.id))).toHaveLength(6);
    expect(
      view.actors.filter((a) => a.texture === 'hero_thien_son'),
    ).toHaveLength(4);
    expect(
      view.actors.filter((a) => a.texture === 'hero_cai_bang'),
    ).toHaveLength(2);
    expect(
      view.actors
        .filter((a) => ids.includes(a.id))
        .every(
          (a) =>
            a.depth === a.y &&
            a.origin[0] === 0.5 &&
            a.origin[1] === 0.8 &&
            a.scale[0] === 1,
        ),
    ).toBe(true);
    await first.screenshot({
      path: resolve(evidence, 'six_players_1280x720.png'),
    });
    await first.setViewportSize({ width: 1920, height: 1080 });
    await first.waitForTimeout(150);
    await first.screenshot({
      path: resolve(evidence, 'six_players_1920x1080.png'),
    });
    expect(errors).toEqual([]);
    writeFileSync(
      resolve(evidence, 'six_player_observations.json'),
      JSON.stringify({ snapshot: all, presentation: view, errors }, null, 2),
    );
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
  }
});

test('Thiên Sơn feet sort in front of and behind the actual perimeter tree', async ({
  page,
}) => {
  test.setTimeout(90000);
  mkdirSync(evidence, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await waiting(page, 'Thien Son depth');
  await startTogether([page], ['thien_son']);
  const id = (await snapshot(page)).sessionId;
  const actor = async () =>
    (await presentation(page)).actors.find((a) => a.id === id)!;
  const go = async (x: number, y: number) => {
    await page.bringToFront();
    await page.locator('#game canvas').focus();
    for (const [axis, target, minus, plus] of [
      ['x', x, 'ArrowLeft', 'ArrowRight'],
      ['y', y, 'ArrowUp', 'ArrowDown'],
    ] as const) {
      for (let tries = 0; tries < 20; tries++) {
        const st = await snapshot(page);
        const h = st.state.players[id]!;
        const delta = target - h[axis];
        if (Math.abs(delta) <= 8) break;
        await page.keyboard.press(delta < 0 ? minus : plus, {
          delay: Math.min(
            900,
            Math.max(35, (Math.abs(delta) * 1000) / 160 - 20),
          ),
        });
        await expect
          .poll(
            async () => (await snapshot(page)).state.players[id]!.lastSequence,
          )
          .toBeGreaterThan(h.lastSequence);
        await expect
          .poll(async () => (await snapshot(page)).state.players[id]!.pose)
          .not.toBe('walk');
      }
      expect(
        Math.abs((await snapshot(page)).state.players[id]![axis] - target),
      ).toBeLessThanOrEqual(8);
    }
  };
  await go(1260, 900);
  await go(1220, 905);
  const front = await actor();
  const frontView = await presentation(page);
  const tree = frontView.trees.find((t) => (t as { x?: number }).x === 1220)!;
  expect(front.texture).toBe('hero_thien_son');
  expect(front.depth).toBeGreaterThan(tree.depth);
  await page.screenshot({
    path: resolve(evidence, 'front_of_tree_1280x720.png'),
  });
  await go(1260, 900);
  await go(1260, 820);
  await go(1220, 820);
  const behind = await actor();
  expect(behind.depth).toBeLessThan(tree.depth);
  expect(behind.origin).toEqual([0.5, 0.8]);
  expect(behind.depth).toBe(behind.y);
  await page.screenshot({
    path: resolve(evidence, 'behind_tree_1280x720.png'),
  });
  expect(errors).toEqual([]);
  writeFileSync(
    resolve(evidence, 'occlusion_observations.json'),
    JSON.stringify({ front, behind, tree, errors }, null, 2),
  );
});
