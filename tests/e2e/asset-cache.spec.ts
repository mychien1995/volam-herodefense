import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { joinWaiting, startTogether } from './pregame-helper.js';
import { acknowledgeQaLobby, pressQaAndWait } from '../../tools/qa-browser.mjs';

test('packaged rasters use browser cache across reloads while entrypoints revalidate', async ({
  page,
}) => {
  const runtimeDir = process.env['VOLAM_RUNTIME_PUBLIC_DIR'];
  test.skip(!runtimeDir, 'Requires the staged IIS delivery build');
  const { aliases } = JSON.parse(
    readFileSync(resolve(runtimeDir!, '../runtime-assets.json'), 'utf8'),
  ) as { aliases: Record<string, string> };
  const asset = aliases['/assets/arena_v2/ground.png']!;
  await page.goto('/');
  const entry = await page.request.get('/index.html');
  expect(entry.headers()['cache-control']).toContain('must-revalidate');
  const manifest = await page.request.get('/assets/manifest.json');
  expect(manifest.headers()['cache-control']).not.toContain('immutable');
  const load = () =>
    page.evaluate(async (url) => {
      performance.clearResourceTimings();
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(Error('Raster load failed'));
        image.src = url;
      });
      const timing = performance
        .getEntriesByName(image.src)
        .at(-1) as PerformanceResourceTiming;
      return {
        width: image.naturalWidth,
        height: image.naturalHeight,
        transferred: timing.transferSize,
        decoded: timing.decodedBodySize,
      };
    }, asset);
  const responsePromise = page.waitForResponse(
    (response) => new URL(response.url()).pathname === asset,
  );
  const cold = await load();
  const response = await responsePromise;
  expect(response.headers()['cache-control']).toContain('max-age=31536000');
  expect(cold.width).toBe(1600);
  expect(cold.height).toBe(1152);
  expect(cold.transferred).toBeGreaterThan(0);
  await page.reload();
  const warm = await load();
  expect(warm.width).toBe(cold.width);
  expect(warm.decoded).toBe(cold.decoded);
  expect(warm.transferred).toBe(0);
  console.info('Raster cache bytes:', JSON.stringify({ cold, warm }));
});

test('packaged multiplayer renders both players and acknowledges movement', async ({
  browser,
}, info) => {
  test.skip(
    !process.env['VOLAM_RUNTIME_PUBLIC_DIR'],
    'Requires the staged IIS delivery build',
  );
  test.setTimeout(100_000);
  const first = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const second = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const a = await first.newPage(),
    b = await second.newPage();
  const errors: string[] = [];
  const imageCache: Record<string, string> = {};
  for (const page of [a, b]) {
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      const path = new URL(response.url()).pathname;
      if (/\.(png|webp|svg)$/.test(path) && response.status() < 400)
        imageCache[path] = response.headers()['cache-control'] ?? '';

      if (
        new URL(response.url()).pathname.startsWith('/assets/') &&
        response.status() >= 400
      )
        errors.push(`${response.status()} ${response.url()}`);
    });
  }
  try {
    const started = Date.now();
    await joinWaiting(a, 'Asset A');
    const room = await a.evaluate<string>('window.__VOLAM__.snapshot().roomId');
    await joinWaiting(b, 'Asset B', room);
    await startTogether([a, b], ['cai_bang_bong', 'vo_dang_kiem'], 45_000);
    const remoteId = await b.evaluate<string>(
      'window.__VOLAM__.snapshot().sessionId',
    );
    const local = await a.evaluate<{ id: string; x: number }>(
      `(() => { const s=window.__VOLAM__.snapshot();return {id:s.sessionId,x:s.state.players[s.sessionId].x}; })()`,
    );
    console.info('Two-client asset startup ms:', Date.now() - started);
    console.info(
      'Cold arena resource bytes observed:',
      await a.evaluate(() =>
        performance
          .getEntriesByType('resource')
          .reduce(
            (sum, e) => sum + (e as PerformanceResourceTiming).transferSize,
            0,
          ),
      ),
    );
    await pressQaAndWait(
      a,
      'ArrowRight',
      ({ id, x }) => {
        const debug = (window as any).__VOLAM__;
        return debug.snapshot().state.players[id].x > x;
      },
      local,
      {
        keyDelay: 200,
        label: 'replicated movement with optimized rasters',
        timeout: 5000,
      },
    );
    await expect
      .poll(() =>
        a.evaluate<string>(
          `window.__VOLAM__.snapshot().state.players[${JSON.stringify(local.id)}].pose`,
        ),
      )
      .not.toBe('walk');
    const x = await a.evaluate<number>(
      `window.__VOLAM__.snapshot().state.players[${JSON.stringify(local.id)}].x`,
    );
    await expect
      .poll(() =>
        b.evaluate<number>(
          `window.__VOLAM__.snapshot().state.players[${JSON.stringify(local.id)}].x`,
        ),
      )
      .toBe(x);
    for (const page of [a, b]) {
      await expect
        .poll(() =>
          page.evaluate<number>(
            'window.__VOLAM__.presentation().actors.length',
          ),
        )
        .toBeGreaterThanOrEqual(2);
      const visible = await page.evaluate<string[]>(
        `window.__VOLAM__.presentation().actors.map(a=>a.id)`,
      );
      expect(visible).toContain(local.id);
      expect(visible).toContain(remoteId);
    }
    expect(Object.keys(imageCache).length).toBeGreaterThan(0);
    for (const [path, control] of Object.entries(imageCache)) {
      expect(path).toMatch(/^\/(assets\/immutable|bundles)\//);
      expect(control, path).toContain('immutable');
    }
    console.info(
      'All observed game images cached:',
      Object.keys(imageCache).length,
    );
    await a.screenshot({ path: info.outputPath('optimized-multiplayer.png') });
    expect(errors).toEqual([]);
  } finally {
    await Promise.all([first.close(), second.close()]);
  }
});

test('packaged JS CSS and menu images cache across reloads and all seven school portraits decode', async ({
  page,
}, info) => {
  test.skip(
    !process.env['VOLAM_RUNTIME_PUBLIC_DIR'],
    'Requires staged delivery assets',
  );
  test.setTimeout(70_000);
  const failed: string[] = [];
  page.on('response', (r) => {
    if (r.status() >= 400 && /\/(assets|bundles)\//.test(r.url()))
      failed.push(`${r.status()} ${r.url()}`);
  });
  const root = await page.goto('/?debug=1', { waitUntil: 'networkidle' });
  expect(root!.headers()['cache-control']).toContain('must-revalidate');
  const cold = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((e) => /\/bundles\/.*\.(js|css)$/.test(e.name))
      .map((e) => {
        const r = e as PerformanceResourceTiming;
        return { url: r.name, bytes: r.transferSize, body: r.decodedBodySize };
      }),
  );
  expect(cold.length).toBeGreaterThan(2);
  expect(cold.some((r) => r.bytes > 0)).toBe(true);
  for (const resource of cold) {
    const response = await page.request.get(resource.url);
    expect(response.headers()['cache-control']).toContain('immutable');
    expect(response.headers()['content-encoding']).toBe('gzip');
  }
  await page.reload({ waitUntil: 'networkidle' });
  const warm = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((e) => /\/bundles\/.*\.(js|css)$/.test(e.name))
      .map((e) => (e as PerformanceResourceTiming).transferSize),
  );
  expect(warm.length).toBeGreaterThan(2);
  expect(warm.every((bytes) => bytes === 0)).toBe(true);
  await joinWaiting(page, 'Portrait QA');
  await acknowledgeQaLobby(page, 'start', '', { timeout: 15_000 });
  const portraits = page.locator('.school-card img.school-portrait');
  await expect(portraits).toHaveCount(7);
  await expect
    .poll(
      () =>
        portraits.evaluateAll((images) =>
          images.every(
            (e) =>
              (e as HTMLImageElement).complete &&
              (e as HTMLImageElement).naturalWidth > 0,
          ),
        ),
      { timeout: 10_000 },
    )
    .toBe(true);
  for (const img of await portraits.all())
    expect(await img.getAttribute('src')).toMatch(
      /^\/assets\/immutable\/[a-f0-9]{64}\.(webp|png)$/,
    );
  await page.screenshot({ path: info.outputPath('m4d-school-portraits.png') });
  await acknowledgeQaLobby(page, 'school', 'cai_bang', { timeout: 15000 });
  const branchIcons = page.locator('.branch-dialog img');
  expect(await branchIcons.count()).toBeGreaterThan(0);
  for (const icon of await branchIcons.all())
    expect(await icon.getAttribute('src')).toMatch(/^\/assets\/immutable\//);
  expect(failed).toEqual([]);
  console.info('M4D bundle cache bytes:', JSON.stringify({ cold, warm }));
});
