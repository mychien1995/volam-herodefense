import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

test('native cel cadence, stationary eight-actor gait and idle transitions', async ({
  page,
}) => {
  await page.goto('/renovation-preview.html');
  await page.waitForFunction(() => window.__renovation?.snapshot().ready);
  const before = await page.evaluate(() =>
    window.__renovation!.snapshot().actors.map(({ x, y }) => [x, y]),
  );
  await page.evaluate(() => {
    window.__renovation!.face('down');
    window.__renovation!.walk(true);
  });
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          window.__renovation!.snapshot().frameTimes[
            'hero_cai_bang:walk_down_0'
          ]?.length ?? 0,
      ),
    )
    .toBeGreaterThanOrEqual(3);
  const moving = await page.evaluate(() => window.__renovation!.snapshot());
  const times = moving.frameTimes['hero_cai_bang:walk_down_0']!;
  const loop = times[2]! - times[1]!;
  expect(loop).toBeGreaterThan(395);
  expect(loop).toBeLessThan(485);
  expect(moving.actors.map(({ x, y }) => [x, y])).toEqual(before);
  await page.evaluate(() => {
    window.__renovation!.face('up');
    window.__renovation!.walk(false);
  });
  await expect
    .poll(async () =>
      page.evaluate(() =>
        window
          .__renovation!.snapshot()
          .actors.every((actor) => actor.frame === 'idle_up_0'),
      ),
    )
    .toBe(true);
  writeFileSync(
    'assets/reviews/renovation-v1/live-motion-cadence.json',
    JSON.stringify(
      {
        date: new Date().toISOString(),
        loopMilliseconds: loop,
        expectedLoopMilliseconds: 440,
        targetCelMilliseconds: 110,
        before,
        after: moving.actors,
        recording: false,
      },
      null,
      2,
    ),
  );
});

test('entire roster, eight arenas and authored four-facing gait load in Phaser', async ({
  page,
}) => {
  const failures: string[] = [];
  page.on('pageerror', (error) => failures.push(error.message));
  await page.goto('/renovation-preview.html');
  await page.waitForFunction(() => window.__renovation?.snapshot().ready);
  const first = await page.evaluate(() => window.__renovation!.snapshot());
  expect(first.roster).toHaveLength(74);
  expect(first.scenes).toHaveLength(9);
  expect(first.viewport).toEqual({ width: 1366, height: 768, zoom: 1 });
  const reports = [];
  for (const group of [...new Set(first.roster.map((actor) => actor.group))]) {
    await page.evaluate(async (group) => {
      await window.__renovation!.select({
        group,
        showGroup: true,
        compare: false,
      });
      window.__renovation!.walk(true);
    }, group);
    const pages = await page.evaluate(
      () => window.__renovation!.snapshot().pages,
    );
    for (let index = 0; index < pages; index++) {
      await page.evaluate(
        (index) => window.__renovation!.select({ page: index }),
        index,
      );
      for (const facing of ['down', 'left', 'right', 'up'] as const) {
        await page.evaluate(
          (facing) => window.__renovation!.face(facing),
          facing,
        );
        const ids = await page.evaluate(() =>
          window.__renovation!.snapshot().actors.map((actor) => actor.id),
        );
        await expect
          .poll(async () =>
            page.evaluate(
              ({ ids, facing }) => {
                const observed = new Set(
                  window.__renovation!.snapshot().observed,
                );
                return ids.every((id) =>
                  [0, 1, 2, 3].every((index) =>
                    observed.has(`${id}:walk_${facing}_${index}`),
                  ),
                );
              },
              { ids, facing },
            ),
          )
          .toBe(true);
      }
      const report = await page.evaluate(() => window.__renovation!.snapshot());
      expect(report.failures).toEqual([]);
      expect(report.textureCount).toBeLessThanOrEqual(31);
      expect(
        report.actors.every(
          (actor) => actor.scale === 1 && actor.depth === actor.y,
        ),
      ).toBe(true);
      reports.push(report);
      await page.evaluate(() => window.__renovation!.face('down'));
      await expect
        .poll(async () =>
          page.evaluate(() =>
            window
              .__renovation!.snapshot()
              .actors.every((actor) => actor.frame.startsWith('walk_down_')),
          ),
        )
        .toBe(true);
      await page.screenshot({
        path: `assets/reviews/renovation-v1/${group}-page-${index + 1}.png`,
      });
    }
  }
  mkdirSync('assets/reviews/renovation-v1', { recursive: true });
  for (const scene of first.scenes) {
    await page.evaluate(async (scene) => {
      await window.__renovation!.select({
        scene,
        group: 'heroes',
        showGroup: true,
        compare: false,
      });
      window.__renovation!.walk(false);
      window.__renovation!.face('down');
    }, scene);
    expect(
      (await page.evaluate(() => window.__renovation!.snapshot())).scene,
    ).toBe(scene);
    await page.screenshot({
      path: `assets/reviews/renovation-v1/${scene}-native-1366.png`,
    });
  }
  await page.evaluate(async () => {
    await window.__renovation!.select({
      scene: 'arena',
      group: 'heroes',
      actor: 'hero_cai_bang',
      showGroup: false,
      compare: true,
    });
    window.__renovation!.walk(false);
    window.__renovation!.face('down');
  });
  await page.screenshot({
    path: 'assets/reviews/renovation-v1/comparison-native-1366.png',
  });
  const final = await page.evaluate(() => window.__renovation!.snapshot());
  expect(failures).toEqual([]);
  writeFileSync(
    'assets/reviews/renovation-v1/live-frame-observations.json',
    JSON.stringify(
      {
        date: new Date().toISOString(),
        reports,
        final,
        failures,
        recording: false,
      },
      null,
      2,
    ),
  );
});

test('movement, focus ownership, stationary snake pedestal and repeated selections', async ({
  page,
}) => {
  await page.goto('/renovation-preview.html');
  await page.waitForFunction(() => window.__renovation?.snapshot().ready);
  await page.evaluate(() =>
    window.__renovation!.select({
      actor: 'hero_vo_dang_kiem',
      showGroup: false,
    }),
  );
  await page.locator('canvas').click({ position: { x: 600, y: 400 } });
  const before = await page.evaluate(
    () => window.__renovation!.snapshot().actors[0]!,
  );
  await page.keyboard.down('ArrowRight');
  await expect
    .poll(async () =>
      page.evaluate(() => window.__renovation!.snapshot().actors[0]!.x),
    )
    .toBeGreaterThan(before.x + 15);
  await page.keyboard.up('ArrowRight');
  await page.getByRole('button', { name: 'Chọn bộ hình' }).click();
  const paused = await page.evaluate(
    () => window.__renovation!.snapshot().actors[0]!.x,
  );
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(180);
  await page.keyboard.up('ArrowRight');
  expect(
    await page.evaluate(() => window.__renovation!.snapshot().actors[0]!.x),
  ).toBe(paused);
  await page.keyboard.press('Escape');
  await page.evaluate(() =>
    window.__renovation!.select({ actor: 'tay_doc_snake', showGroup: false }),
  );
  const snake = await page.evaluate(
    () => window.__renovation!.snapshot().actors[0]!,
  );
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(180);
  await page.keyboard.up('ArrowDown');
  expect(
    await page.evaluate(() => window.__renovation!.snapshot().actors[0]!.y),
  ).toBe(snake.y);
  await page.evaluate(async () => {
    await Promise.all([
      window.__renovation!.select({ group: 'wave_creeps' }),
      window.__renovation!.select({ group: 'heroes', scene: 'co_mo' }),
    ]);
  });
  const final = await page.evaluate(() => window.__renovation!.snapshot());
  expect(final.ready).toBe(true);
  expect(final.group).toBe('heroes');
  expect(final.scene).toBe('co_mo');
  expect(final.failures).toEqual([]);
});
