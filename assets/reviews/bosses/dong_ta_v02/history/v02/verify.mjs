import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
const here = fileURLToPath(new URL('.', import.meta.url));
const flag = process.argv.indexOf('--dependency-root'),
  root =
    flag >= 0 ? resolve(process.argv[flag + 1]) : resolve(here, '../../../..');
const require = createRequire(join(root, 'package.json'));
const { chromium } = require('@playwright/test');
export async function runReview() {
  const started = Date.now(),
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [],
    checks = [],
    evidence = join(here, 'evidence');
  await mkdir(evidence, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(r.status() + ':' + r.url());
  });
  const check = (name, condition = true) => {
    assert.ok(condition, name);
    checks.push(name);
  };
  const snap = () => page.evaluate(() => ART.snapshot());
  const seek = async (mode, time) => {
    await page.evaluate(
      async ([m, t]) => {
        ART.choose(m);
        ART.setTime(t);
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
      },
      [mode, time],
    );
    await page.waitForFunction(
      ([m, t]) =>
        ART.snapshot().mode === m && Math.abs(ART.snapshot().time - t) < 0.02,
      [mode, time],
    );
  };
  const report = {
    status: 'RUNNING',
    scope: 'standalone_Phaser_art_demo',
    runtimeIntegrated: false,
    serverMechanics: false,
    multiplayerVerified: false,
    sixPlayerVisualDummiesOnly: true,
    recordings: false,
  };
  try {
    await page.goto('http://127.0.0.1:5427/assets/reviews/bosses/dong_ta_v02/');
    await page.waitForFunction(() => window.ART?.ready);
    check(
      'Installed Phaser 4.2.1',
      await page.evaluate(() => Phaser.VERSION === '4.2.1'),
    );
    await page.evaluate(() => ART.clearObserved());
    const fixtures = await page.evaluate(() => ART.fixtures());
    await page.evaluate(() => ART.setSpeed(4));
    for (const f of fixtures) {
      await page.evaluate(([k, c]) => ART.fixture(k, c), [f.key, f.clip]);
      await page.waitForFunction(
        ([k, c]) => ART.fixtureDone(k, c),
        [f.key, f.clip],
        { timeout: 4000 },
      );
    }
    const observed = await page.evaluate(() => ART.observed());
    report.liveClips = fixtures.length;
    report.liveFrames = Object.values(observed).reduce(
      (n, f) => n + f.length,
      0,
    );
    check(
      'Every loaded clip observed through Phaser animation events and completion/repeat',
      fixtures.every(
        (f) => observed[f.key + ':' + f.clip].length === f.frames.length,
      ),
    );
    await page.evaluate(() => {
      ART.setSpeed(1);
      ART.setParty(2);
    });
    await seek('entry', 1);
    check(
      'Boss enters from east, statue untargeted',
      (await snap()).objects.find((o) => o.id === 'dong').x > 900 &&
        (await snap()).statueTargeted === false,
    );
    await seek('sprites', 0.7);
    await page
      .locator('#viewport')
      .screenshot({ path: join(evidence, 'arena-sprites-native.png') });
    await seek('pebbles', 0.9);
    let s = await snap();
    check(
      'Exactly five round pellets released',
      s.projectiles.length === 5 && s.shotsReleased === 5,
    );
    const angles = s.projectiles.map((p) => p.angle),
      locks = s.projectiles.map((p) => p.targetAtRelease);
    await page.evaluate(() => {
      ART.setPlayer(920, 540);
      ART.setTime(1);
    });
    await page.waitForFunction(() => ART.snapshot().time === 1);
    s = await snap();
    check(
      'Released pellets retain aim while P1 moves',
      JSON.stringify(angles) ===
        JSON.stringify(s.projectiles.map((p) => p.angle)) &&
        JSON.stringify(locks) ===
          JSON.stringify(s.projectiles.map((p) => p.targetAtRelease)),
    );
    // Later shots re-aim at the current target at their own release.
    await page.evaluate(() => {
      ART.choose('pebbles');
      ART.setPlayer(895, 450);
      ART.setTime(0.46);
    });
    await page.waitForFunction(() => ART.snapshot().time === 0.46);
    const first = (await snap()).projectiles[0].angle;
    await page.evaluate(() => {
      ART.setPlayer(900, 530);
      ART.setTime(0.57);
    });
    await page.waitForFunction(() => ART.snapshot().time === 0.57);
    s = await snap();
    check('Next pellet uses new position', s.projectiles[1].angle !== first);
    for (const name of ['triangle', 'square', 'diamond', 'z']) {
      await page.evaluate((p) => ART.setPath(p), name);
      await seek('dash', 1.1);
      s = await snap();
      check(
        'Dash shape ' + name,
        s.path === name &&
          s.waypoints.length === (name === 'triangle' || name === 'z' ? 4 : 5),
      );
    }
    await seek('petals', 1.5);
    s = await snap();
    check(
      'Dense delayed petals and authored flute pose',
      s.patchCount === 45 &&
        s.burstCount === 0 &&
        s.objects.some(
          (o) => o.key === 'actions' && o.clip.startsWith('flute_'),
        ),
    );
    await page
      .locator('#viewport')
      .screenshot({ path: join(evidence, 'arena-flute-petals.png') });
    await seek('petals', 3.7);
    s = await snap();
    check(
      'Petals explode only after delay',
      s.burstCount > 0 && s.patchCount < 45,
    );
    await seek('summon', 1.3);
    s = await snap();
    check(
      'No summons at 40 percent',
      s.bossHpPercent === 40 &&
        s.summonCount === 0 &&
        !s.objects.some((o) => o.id === 'mai'),
    );
    await seek('summon', 2.5);
    s = await snap();
    check(
      'Both summons once below 40 percent',
      s.bossHpPercent === 39 &&
        s.summonCount === 1 &&
        s.objects.some((o) => o.id === 'mai') &&
        s.objects.some((o) => o.id === 'hoang'),
    );
    await seek('summon', 5.5);
    check('No second summon', (await snap()).summonCount === 1);
    await seek('poison', 1);
    s = await snap();
    check(
      'Cloth poison pouch in flight',
      s.projectiles[0]?.kind === 'poison_pouch' && !s.poisonActive,
    );
    await seek('poison', 1.48);
    check(
      'Ground impact burst',
      (await snap()).objects.some((o) => o.clip === 'poison_burst'),
    );
    await seek('poison', 3.5);
    s = await snap();
    check(
      'Lingering burgundy pool',
      s.poisonActive && s.objects.some((o) => o.clip === 'poison_pool'),
    );
    await page
      .locator('#viewport')
      .screenshot({ path: join(evidence, 'arena-mai-poison.png') });
    await seek('heal', 0.5);
    s = await snap();
    check(
      'Healing palms target Dong Ta and Mai',
      s.projectiles.length === 2 &&
        new Set(s.projectiles.map((p) => p.target)).size === 2,
    );
    await page
      .locator('#viewport')
      .screenshot({ path: join(evidence, 'arena-hoang-healing.png') });
    await seek('lock', 3);
    check('Mai retains P1', (await snap()).lockedTarget === 'P1');
    await seek('lock', 4.8);
    check(
      'Mai changes only after scripted death',
      (await snap()).lockedTarget.startsWith('P2'),
    );
    await seek('pull', 1);
    const before = (await snap()).players[0];
    await seek('pull', 2);
    const after = (await snap()).players[0];
    check(
      'Inward pull choreography',
      Math.hypot(after.x - 650, after.y - 450) <
        Math.hypot(before.x - 650, before.y - 450),
    );
    await seek('evade', 0.8);
    check(
      'Hoang speed-burst pose',
      (await snap()).objects.some((o) => o.clip === 'evade_right'),
    );
    // Local controls, not a multiplayer/gameplay acceptance claim.
    await page.evaluate(() => {
      ART.choose('sprites');
      ART.pause(false);
      document.activeElement.blur();
    });
    const x = (await snap()).players[0].x;
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(250);
    await page.keyboard.up('ArrowRight');
    check('Arrow-key actor control', (await snap()).players[0].x > x);
    await page.keyboard.press('q');
    await page.waitForFunction(() => ART.snapshot().mode === 'pebbles');
    check('Q hotkey');
    await page.locator('#settings-toggle').click();
    await page.locator('#facing').selectOption('left');
    await page.locator('#close-settings').click();
    await seek('petals', 1.2);
    check(
      'Corrected left flute used',
      (await snap()).objects.some((o) => o.clip === 'flute_left'),
    );
    await page.evaluate(() => {
      ART.setDirection('right');
      ART.setParty(6);
    });
    await seek('heal', 1.2);
    s = await snap();
    check(
      'Six-player visual scale reference',
      s.objects.filter((o) => o.key === 'hero').length === 6,
    );
    await page
      .locator('#viewport')
      .screenshot({ path: join(evidence, 'arena-six-player-visual.png') });
    for (const size of [
      { width: 960, height: 600 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(size);
      check(
        'Controls stay inside viewport ' + size.width,
        await page.evaluate(() => {
          const a = document.getElementById('viewport').getBoundingClientRect();
          return ['mode', 'pause', 'timeline'].every((id) => {
            const b = document.getElementById(id).getBoundingClientRect();
            return (
              b.left >= a.left &&
              b.right <= a.right &&
              b.top >= a.top &&
              b.bottom <= a.bottom
            );
          });
        }),
      );
    }
    check('No page/asset errors', errors.length === 0);
    report.status = 'PASS';
    report.observed = observed;
    report.checks = checks;
  } catch (error) {
    report.status = 'FAIL';
    report.failure = error.stack;
    await page.screenshot({ path: join(evidence, 'failure.png') });
    throw error;
  } finally {
    report.errors = errors;
    report.elapsedSeconds = +((Date.now() - started) / 1000).toFixed(2);
    await writeFile(
      join(here, 'browser_verification.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    await browser.close();
    console.log(
      JSON.stringify({
        status: report.status,
        clips: report.liveClips,
        frames: report.liveFrames,
        checks: checks.length,
        seconds: report.elapsedSeconds,
        failure: report.failure,
      }),
    );
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await runReview();
