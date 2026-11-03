import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
let owned: ChildProcess;
test.beforeAll(async () => {
  owned = spawn(
    process.execPath,
    ['assets/reviews/wave_boss_feedback_v02/server.mjs'],
    {
      env: { ...process.env, WAVE_VFX_REVIEW_PORT: '5462' },
      stdio: 'ignore',
      windowsHide: true,
    },
  );
  await expect
    .poll(
      async () => {
        try {
          return (await (await fetch('http://127.0.0.1:5462/health')).json())
            .pid;
        } catch {
          return null;
        }
      },
      { timeout: 15000 },
    )
    .toBe(owned.pid);
});
test.afterAll(() => owned?.kill('SIGKILL'));
const out = 'assets/reviews/wave_boss_feedback_v02/evidence';
const inspect = (p: any) =>
  p.evaluate(() => (window as any).__waveReview.inspect());
const choose = (p: any, id: string, config: any = {}) =>
  p.evaluate(
    ({ id, config }: any) => (window as any).__waveReview.choose(id, config),
    { id, config },
  );
const seek = (p: any, t: number) =>
  p.evaluate((t: number) => (window as any).__waveReview.seek(t), t);
test('v02 actual Phaser frames, overhead names, inward shots, re-aimed burst, keyboard locks and9spinners', async ({
  page,
}) => {
  const errors: string[] = [],
    sockets: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('websocket', (s) => sockets.push(s.url()));
  await mkdir(out, { recursive: true });
  await page.goto('/');
  await page.waitForFunction(
    () => (window as any).__waveReview?.inspect().ready,
  );
  try {
    const first = await inspect(page);
    expect(first.canvas).toEqual([640, 360]);
    expect(first.zoom).toBe(1);
    expect(first.displayScale).toBe(2);
    const cases: any[] = [];
    for (const [id, t] of [
      ['mai_claws', 0.8],
      ['mai_pull', 0.9],
      ['pillars', 1.45],
      ['poison_bolt', 1.2],
      ['stomp', 1.5],
      ['small_finger', 1],
      ['barrage', 2.1],
      ['spotlight', 1.1],
      ['sky', 2.2],
      ['clones', 3],
      ['vortex', 2],
      ['dialogue', 0.7],
      ['cleanup', 1.45],
      ['shout_ly', 0.4],
      ['shout_hong', 0.4],
      ['shout_chu', 0.4],
      ['shout_kim', 0.4],
    ] as const) {
      await choose(page, id, { players: 2, camera: 'center', burst: '5' });
      await seek(page, t);
      const s = await inspect(page);
      expect(s.errors).toEqual([]);
      expect(s.objects.length).toBeGreaterThan(0);
      cases.push({ id, t, current: s.current, objects: s.objects });
    }
    await choose(page, 'sky');
    await seek(page, 3);
    const storm = await inspect(page);
    expect(storm.current.sky).toHaveLength(96);
    expect(
      storm.current.layers.filter((l: any) => l.id?.startsWith('sky-fall:'))
        .length,
    ).toBeGreaterThanOrEqual(7);
    await choose(page, 'spotlight');
    await seek(page, 0.2);
    expect(
      (await inspect(page)).objects.find((o: any) => o.id === 'boss').clip,
    ).toBe('palm_attack_right');
    await seek(page, 1.1);
    const lit = await inspect(page);
    expect(lit.current.projectiles).toHaveLength(0);
    expect(lit.objects.some((o: any) => o.asset === 'nd_finger')).toBe(false);
    await choose(page, 'vortex');
    await seek(page, 1.2);
    const startMove = await inspect(page);
    await page.evaluate(() => (window as any).__waveReview.play());
    const spinnerIds = [
      'boss',
      ...Array.from({ length: 8 }, (_, i) => 'spinning-clone:' + i),
    ];
    await expect
      .poll(async () => {
        const now = await inspect(page);
        return Math.min(
          ...spinnerIds.map((id) => {
            const old = startMove.objects.find((o: any) => o.id === id),
              current = now.objects.find((o: any) => o.id === id);
            return Math.hypot(current.x - old.x, current.y - old.y);
          }),
        );
      })
      .toBeGreaterThan(35);
    const moving = await inspect(page);
    expect(moving.current.damageZones).toHaveLength(9);
    expect(moving.current.pull).toBeNull();
    expect(
      moving.objects
        .filter((o: any) => spinnerIds.includes(o.id))
        .every((o: any) => o.clip === 'staff_spin_right'),
    ).toBe(true);
    for (const [id, asset] of [
      ['pillars', 'snake_bolt'],
      ['poison_bolt', 'poison_bolt'],
      ['small_finger', 'gold_bolt'],
      ['spotlight', 'spotlight'],
    ] as const) {
      await choose(page, id, { burst: '5' });
      await expect
        .poll(async () => {
          const s = await inspect(page);
          return s.seen.filter((n: string) => n.startsWith(asset + ':')).length;
        })
        .toBe(4);
    }
    await choose(page, 'mai_pull', { autoTarget: false, players: 2 });
    await seek(page, 0.42);
    await page.locator('canvas').click();
    const before = await inspect(page);
    await page.keyboard.press('Shift');
    expect((await inspect(page)).dashBlocked).toBe(before.dashBlocked + 1);
    await seek(page, 0.7);
    const p = (await inspect(page)).player;
    await page.keyboard.down('ArrowDown');
    await page.evaluate(() => (window as any).__waveReview.play());
    await expect
      .poll(async () => (await inspect(page)).player.y)
      .toBeGreaterThan(p.y + 30);
    await page.keyboard.up('ArrowDown');
    await seek(page, 5.41);
    const unlocked = await inspect(page);
    await page.keyboard.press('Shift');
    expect((await inspect(page)).dashes).toBe(unlocked.dashes + 1);
    await choose(page, 'vortex');
    await seek(page, 2);
    const spin = await inspect(page);
    expect(spin.current.damageZones).toHaveLength(9);
    await page.keyboard.press('Shift');
    expect((await inspect(page)).dashes).toBe(spin.dashes + 1);
    await choose(page, 'small_finger', { burst: '5', autoTarget: true });
    await seek(page, 1.3);
    const burst = await inspect(page);
    expect(new Set(burst.current.burst.map((p: any) => p.heading)).size).toBe(
      5,
    );
    const shots: [string, number, string][] = [
      ['mai_claws', 0.8, 'mai-claws.png'],
      ['pillars', 1.45, 'inward-snakes.png'],
      ['small_finger', 1, 'gold-burst.png'],
      ['spotlight', 1.1, 'spotlight.png'],
      ['sky', 2.2, 'sky-arena.png'],
      ['shout_hong', 0.4, 'dungeon-shout.png'],
    ];
    for (const [id, t, file] of shots) {
      await choose(page, id, {
        players: 2,
        camera: 'center',
        burst: '5',
        autoTarget: true,
      });
      await seek(page, t);
      await page.screenshot({ path: out + '/' + file });
    }
    await page.setViewportSize({ width: 1920, height: 1080 });
    await choose(page, 'vortex', { players: 6, camera: 'center' });
    await seek(page, 2);
    const six = await inspect(page);
    expect(six.canvas).toEqual([960, 540]);
    expect(six.current.heroes).toHaveLength(6);
    expect(six.current.damageZones).toHaveLength(9);
    await page.screenshot({ path: out + '/nine-spinners-six-models.png' });
    expect(errors).toEqual([]);
    expect(sockets).toEqual([]);
    await writeFile(
      out + '/verification.json',
      JSON.stringify(
        {
          status: 'PASS',
          scope: 'STANDALONE_PREVIEW_ONLY',
          serverMechanics: false,
          networkClients: 0,
          localModels: 6,
          first,
          cases,
          six,
          randomWander: {
            start: startMove,
            observed: moving,
            allNineMovedAtLeast: 35,
          },
          errors,
          sockets,
          recordingsCreated: false,
        },
        null,
        2,
      ),
    );
  } catch (e) {
    await writeFile(
      out + '/failure.json',
      JSON.stringify(
        { error: String(e), errors, state: await inspect(page) },
        null,
        2,
      ),
    );
    await page.screenshot({ path: out + '/failure.png' });
    throw e;
  }
});
