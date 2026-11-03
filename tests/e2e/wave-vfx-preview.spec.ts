import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
let ownedServer: ChildProcess;
test.beforeAll(async () => {
  ownedServer = spawn(
    process.execPath,
    ['assets/reviews/wave_boss_feedback_v01/server.mjs'],
    {
      env: { ...process.env, WAVE_VFX_REVIEW_PORT: '5458' },
      stdio: 'ignore',
      windowsHide: true,
    },
  );
  let failure: Error | undefined;
  ownedServer.on('error', (error) => {
    failure = error;
  });
  await expect
    .poll(
      async () => {
        if (failure) throw failure;
        try {
          return (await (await fetch('http://127.0.0.1:5458/health')).json())
            .pid;
        } catch {
          return null;
        }
      },
      { timeout: 15_000 },
    )
    .toBe(ownedServer.pid);
});
test.afterAll(() => {
  ownedServer?.kill('SIGKILL');
});
const out = 'assets/reviews/wave_boss_feedback_v01/evidence';
const inspect = (page: any) =>
  page.evaluate(() => (window as any).__waveReview.inspect());
const choose = (page: any, id: string, config: Record<string, unknown> = {}) =>
  page.evaluate(
    ({ id, config }: any) => (window as any).__waveReview.choose(id, config),
    { id, config },
  );
const seek = (page: any, t: number) =>
  page.evaluate((t: number) => (window as any).__waveReview.seek(t), t);

test('wave boss preview: real frames, native gameplay scale, feedback choreography and keyboard escape', async ({
  page,
  browser,
}) => {
  const errors: string[] = [],
    sockets: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('websocket', (s) => sockets.push(s.url()));
  await page.goto('/');
  await page.waitForFunction(
    () => (window as any).__waveReview?.inspect().ready,
  );
  await mkdir(out, { recursive: true });
  const first = await inspect(page);
  expect(first.canvas).toEqual([640, 360]);
  expect(first.zoom).toBe(1);
  expect(first.displayScale).toBe(2);
  const reports: any[] = [];
  for (const [id, t] of [
    ['lac_anh', 0.8],
    ['four_slash', 0.8],
    ['mai_claws', 0.7],
    ['needles', 1.35],
    ['stomp', 1.5],
    ['beam', 0.82],
    ['nam_dash', 0.8],
    ['palm', 0.7],
    ['clones', 3],
    ['spiral', 1.2],
    ['dogs', 2.5],
    ['vortex', 0.8],
  ] as [string, number][]) {
    await choose(page, id, { players: 6, camera: 'center' });
    await seek(page, t);
    const s = await inspect(page);
    expect(s.errors).toEqual([]);
    expect(s.objects.length).toBeGreaterThan(6);
    reports.push({ id, t, current: s.current, objects: s.objects });
  }
  // Live ticks, not only seeks: both original four-cel authored candidates must animate.
  for (const [id, prefix] of [
    ['aura', 'nam_de_ring:'],
    ['cloud', 'tay_doc_cloud_v2:'],
  ] as [string, string][]) {
    await choose(page, id, { players: 2, camera: 'boss' });
    await page.evaluate(() => (window as any).__waveReview.play());
    await expect
      .poll(
        async () =>
          new Set(
            (await inspect(page)).seen.filter((n: string) =>
              n.startsWith(prefix),
            ),
          ).size,
        { timeout: 10_000 },
      )
      .toBe(4);
  }
  // Reproduce the player's attempt: wait until actual pulling, press physical Shift,
  // then hold walking away and observe escape from sustained pull.
  await choose(page, 'vortex', { players: 2, camera: 'player' });
  await page.evaluate(() => (window as any).__waveReview.play());
  await page.locator('#viewport').focus();
  await page.waitForFunction(() => {
    const s = (window as any).__waveReview.inspect();
    return s.t > 0.72 && s.t < 2;
  });
  const pulled = await inspect(page);
  const blocked = pulled.dashBlocked;
  await page.keyboard.press('Shift');
  expect((await inspect(page)).dashBlocked).toBe(blocked + 1);
  const x = (await inspect(page)).player.x;
  await page.keyboard.down('ArrowRight');
  await expect
    .poll(async () => (await inspect(page)).player.x, { timeout: 4000 })
    .toBeGreaterThan(x + 35);
  await page.keyboard.up('ArrowRight');
  await seek(page, 4.2);
  const dashCount = (await inspect(page)).dashes;
  await page.keyboard.press('Shift');
  expect((await inspect(page)).dashes).toBe(dashCount + 1);
  // Native scale visual evidence, with six local readability models (not network clients).
  await choose(page, 'mai_claws', { players: 6, camera: 'boss' });
  await seek(page, 0.72);
  await page.screenshot({ path: out + '/mai-claws-gameplay-scale.png' });
  await choose(page, 'cloud', { players: 6, camera: 'center' });
  await seek(page, 2.2);
  await page.screenshot({ path: out + '/poison-cloud-gameplay-scale.png' });
  await choose(page, 'aura', { players: 2, camera: 'boss' });
  await seek(page, 0.8);
  await page.screenshot({ path: out + '/phat-quang-gameplay-scale.png' });
  await choose(page, 'beam', { players: 2, camera: 'boss' });
  await seek(page, 0.82);
  await page.screenshot({ path: out + '/finger-beam-gameplay-scale.png' });
  await choose(page, 'stomp', { players: 6, camera: 'player' });
  await seek(page, 1.5);
  await page.screenshot({ path: out + '/toad-impact-gameplay-scale.png' });
  await choose(page, 'needles', { players: 2, camera: 'boss' });
  await seek(page, 1.35);
  await page.screenshot({ path: out + '/needles-gameplay-scale.png' });
  const second = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });
  await second.goto('/');
  await second.waitForFunction(
    () => (window as any).__waveReview?.inspect().ready,
  );
  await choose(second, 'spiral', { players: 6, camera: 'boss' });
  await seek(second, 1.4);
  expect((await inspect(second)).displayScale).toBe(2);
  expect((await inspect(second)).canvas).toEqual([960, 540]);
  expect((await inspect(second)).zoom).toBe(1);
  await second.screenshot({ path: out + '/dragon-1920.png' });
  await second.close();
  expect(errors).toEqual([]);
  expect(sockets).toEqual([]);
  await writeFile(
    out + '/verification.json',
    JSON.stringify(
      {
        status: 'PASS',
        scope: 'VISUAL_PREVIEW_ONLY',
        naturalCombat: false,
        networkClients: 0,
        localModels: [2, 6],
        serverMechanics: false,
        errors,
        sockets,
        reports,
        observed: (await inspect(page)).seen,
      },
      null,
      2,
    ),
  );
});
