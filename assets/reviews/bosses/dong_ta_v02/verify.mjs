import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { fieldDistance, DEMO } from './choreography.mjs';
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
    output = join(here, 'feedback_02'),
    evidence = join(output, 'evidence');
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
  const check = (name, value = true) => {
    assert.ok(value, name);
    checks.push(name);
  };
  const snap = () => page.evaluate(() => ART.snapshot());
  const settle = () =>
    page.evaluate(async () => {
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });
  const seek = async (mode, time) => {
    await page.evaluate(
      ([m, t]) => {
        ART.choose(m);
        ART.setTime(t);
      },
      [mode, time],
    );
    await settle();
    await page.waitForFunction(
      ([m, t]) =>
        ART.snapshot().mode === m && Math.abs(ART.snapshot().time - t) < 0.02,
      [mode, time],
    );
  };
  const report = {
    status: 'RUNNING',
    feedback: '02',
    scope: 'standalone_Phaser_art_demo',
    runtimeIntegrated: false,
    serverMechanics: false,
    multiplayerVerified: false,
    sixPlayerVisualDummiesOnly: true,
    newRasterArt: false,
    recordings: false,
  };
  try {
    await page.goto('http://127.0.0.1:5427/assets/reviews/bosses/dong_ta_v02/');
    await page.waitForFunction(() => window.ART?.ready, undefined, {
      timeout: 15000,
    });
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
      'All retained clips render through Phaser events, including complete loops/one-shots',
      fixtures.every(
        (f) => observed[f.key + ':' + f.clip].length === f.frames.length,
      ),
    );
    await page.evaluate(() => {
      ART.setSpeed(1);
      ART.setParty(6);
    });
    await seek('entry', 1);
    let s = await snap();
    check(
      'Boss follows the middle of the east road',
      s.objects.find((o) => o.id === 'dong').x > 900 &&
        s.objects.find((o) => o.id === 'dong').y === DEMO.field.y,
    );
    check(
      'Statue visible and field unlocked before arrival',
      s.encounter.statueVisible &&
        !s.encounter.locked &&
        (await page.evaluate(() => ART.scene.statue.visible)),
    );
    const beforeGather = s.players;
    await seek('entry', 3.1);
    s = await snap();
    check(
      'Boss reaches the exact central court marker',
      s.objects.find((o) => o.id === 'dong').x === DEMO.field.x &&
        s.objects.find((o) => o.id === 'dong').y === DEMO.field.y,
    );
    check(
      'Statue actually hidden in Phaser at arrival',
      !s.encounter.statueVisible &&
        !(await page.evaluate(() => ART.scene.statue.visible)),
    );
    check(
      'All six players recalled inside the central court with a small outer rim',
      s.encounter.locked &&
        s.players.length === 6 &&
        s.players.every((p) => fieldDistance(p) <= 1.0001) &&
        s.players.every(
          (p, i) =>
            Math.hypot(p.x - beforeGather[i].x, p.y - beforeGather[i].y) > 25,
        ),
    );
    check(
      'Functional boundary shown inside game viewport',
      !(await page.locator('#encounter-boundary').isHidden()),
    );
    await page
      .locator('#viewport')
      .screenshot({ path: join(evidence, 'arena-entry-locked-six.png') });
    await page.evaluate(() => {
      ART.setPlayer(
        ART.DEMO.field.x + ART.DEMO.field.radiusX - 8,
        ART.DEMO.field.y,
      );
      ART.pause(false);
      document.activeElement?.blur();
    });
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(350);
    await page.keyboard.up('ArrowRight');
    s = await snap();
    check(
      'Held outward movement cannot escape the court boundary',
      fieldDistance(s.players[0]) <= 1.0001 &&
        s.players[0].x <= DEMO.field.x + DEMO.field.radiusX - 8.01 + 0.02,
    );
    await page.keyboard.down('ArrowRight');
    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('ArrowDown');
    check(
      'Diagonal movement remains within the same boundary',
      fieldDistance((await snap()).players[0]) <= 1.0001,
    );
    await page.evaluate(() => ART.setParty(2));
    await seek('thrust', 0.95);
    s = await snap();
    check(
      'Sword combo covers the full forward 180 degrees',
      s.thrustSector.angleDegrees === 180 &&
        Math.abs(
          s.thrustSector.rays.at(-1).angle -
            s.thrustSector.rays[0].angle -
            Math.PI,
        ) < 1e-9,
    );
    check(
      'Sword reach exceeds both actual ranged basic references',
      s.thrustSector.range > DEMO.referenceBasics.cai_bang_chuong &&
        s.thrustSector.range > DEMO.referenceBasics.thien_son_phien,
    );
    check(
      'Cai Bang palm and Thien Son fan sprites are the visible targets',
      s.objects.some((o) => o.key === 'cai') &&
        s.objects.some((o) => o.key === 'thien'),
    );
    check(
      'Extended authored thrust cels actually rendered at integer 3x scale',
      s.objects.filter((o) => o.clip === 'thrust_streak').length >= 3 &&
        s.objects
          .filter((o) => o.clip === 'thrust_streak')
          .every((o) => o.scale === 3),
    );
    await page
      .locator('#viewport')
      .screenshot({ path: join(evidence, 'arena-thrust-180.png') });
    await seek('pebbles', 0.85);
    s = await snap();
    const count = s.radialPlan.count,
      angles = s.projectiles.map((p) => p.angle);
    check(
      'Eight to fourteen distinct directions in one radial burst',
      count >= 8 &&
        count <= 14 &&
        s.projectiles.length === count &&
        new Set(angles).size === count,
    );
    const quadrants = new Set(
      s.projectiles.map(
        (p) =>
          (p.x >= DEMO.field.x ? 'E' : 'W') +
          (p.y >= DEMO.field.y - 20 ? 'S' : 'N'),
      ),
    );
    check(
      'Pellets surround Dong Ta in all four quadrants',
      quadrants.size === 4,
    );
    await page
      .locator('#viewport')
      .screenshot({ path: join(evidence, 'arena-radial-8-to-14.png') });
    await page.evaluate(() => {
      ART.setPlayer(420, 500);
      ART.setTime(0.95);
    });
    await settle();
    check(
      'Radial pellet vectors stay straight while players move',
      JSON.stringify((await snap()).projectiles.map((p) => p.angle)) ===
        JSON.stringify(angles),
    );
    const counts = new Set();
    for (let i = 0; i < 10; i++) {
      await seek('pebbles', 0.85);
      counts.add((await snap()).radialPlan.count);
    }
    check('Direction count changes across casts', counts.size > 1);
    for (const kind of ['cross', 'x']) {
      await page.evaluate((p) => ART.setPath(p), kind);
      await seek('dash', 0.85);
      s = await snap();
      const waves = s.objects.filter((o) => o.id.startsWith('lac-slash'));
      check(
        'Four directional sword cuts form ' + kind,
        s.fourSlashPlan.kind === kind &&
          s.slashRays.length === 4 &&
          waves.length === 4,
      );
      const origin = s.fourSlashPlan.origin;
      check(
        'Slash endpoints match the chosen axes ' + kind,
        waves.every((o) =>
          kind === 'cross'
            ? Math.abs(o.x - origin.x) < 1 || Math.abs(o.y - origin.y) < 1
            : Math.abs(Math.abs(o.x - origin.x) - Math.abs(o.y - origin.y)) <
              1.5,
        ),
      );
      check(
        'Boss casts at center without the superseded polygon dash ' + kind,
        s.objects.find((o) => o.id === 'dong').x === DEMO.field.x &&
          s.objects.find((o) => o.id === 'dong').y === DEMO.field.y &&
          !s.objects.some((o) => o.id.startsWith('corridor')),
      );
      await page
        .locator('#viewport')
        .screenshot({ path: join(evidence, 'arena-lac-anh-' + kind + '.png') });
    }
    await page.evaluate(() => ART.setPath('random'));
    const patterns = new Set();
    for (let i = 0; i < 10; i++) {
      await seek('dash', 0.85);
      patterns.add((await snap()).fourSlashPlan.kind);
    }
    check('Random casts choose both plus and X patterns', patterns.size === 2);
    await seek('petals', 1.5);
    s = await snap();
    check(
      'Forty petals reduce density while retaining random independent positions',
      s.patchCount === DEMO.petals.count &&
        new Set(s.petalPlan.map((p) => p.x)).size === DEMO.petals.count &&
        new Set(s.petalPlan.map((p) => p.y)).size === DEMO.petals.count,
    );
    check(
      'Petals lie within the constrained court and wait before exploding',
      s.petalPlan.every(
        (p) =>
          fieldDistance(p) < 1 &&
          Math.abs(p.blast - p.arrival - DEMO.petals.delay) < 1e-9,
      ) && s.burstCount === 0,
    );
    check(
      'Authored flute pose retained',
      s.objects.some((o) => o.key === 'actions' && o.clip.startsWith('flute_')),
    );
    await page
      .locator('#viewport')
      .screenshot({ path: join(evidence, 'arena-random-petals.png') });
    await page.evaluate(() => ART.setTime(3.9));
    await settle();
    s = await snap();
    check(
      'Petals explode at their own delayed timestamps',
      s.burstCount > 0 && s.patchCount < DEMO.petals.count,
    );
    await seek('claws', 0.7);
    s = await snap();
    const strokes = s.clawStrokes;
    const targetHits = s.clawContactPreview;
    check(
      'Two opposite claw strokes are displaced into Mai facing',
      strokes.length === 2 &&
        strokes.every((v) =>
          [v.from, v.to].every((p) => p.x > s.maiPosition.x),
        ),
    );
    check(
      'Front target receives preview contact while rear target does not',
      targetHits[0].contact && !targetHits[1].contact,
    );
    check(
      'Contact flash renders on front player only',
      await page.evaluate(() => {
        const children = ART.scene.children.list;
        const front = children.find(
          (v) => v.getData?.('used') && v.texture?.key === 'cai',
        );
        const rear = children.find(
          (v) => v.getData?.('used') && v.texture?.key === 'thien',
        );
        return front?.isTinted && !rear?.isTinted;
      }),
    );
    check(
      'Both claw drawings visible ahead of Mai',
      s.objects.filter((o) => o.id.startsWith('claw')).length === 2 &&
        s.objects
          .filter((o) => o.id.startsWith('claw'))
          .every((o) => o.x > s.maiPosition.x),
    );
    await page
      .locator('#viewport')
      .screenshot({ path: join(evidence, 'arena-mai-frontal-claws.png') });
    for (const facing of ['left', 'up', 'down']) {
      await page.evaluate((d) => ART.setDirection(d), facing);
      await seek('claws', 0.7);
      s = await snap();
      check(
        'Frontal contact follows Mai facing ' + facing,
        s.clawFacing === facing &&
          s.clawContactPreview[0].contact &&
          !s.clawContactPreview[1].contact,
      );
    }
    await page.evaluate(() => ART.setDirection('right'));
    await seek('claws', 0.7);
    s = await snap();
    check(
      'Target focus has no standalone animation/skill menu',
      s.focusIsPassive &&
        (await page.locator('#mode option[value="lock"]').count()) === 0,
    );
    await seek('claws', 1.9);
    await page.evaluate(() => {
      ART.setPlayer(880, 376);
      ART.setTime(1.9);
    });
    await settle();
    const before = await snap();
    await page.evaluate(() => ART.setTime(2.3));
    await settle();
    s = await snap();
    check(
      'Mai closes the distance to the same player using ordinary walk',
      s.lockedTarget === 'P1' &&
        Math.hypot(
          s.maiPosition.x - s.players[0].x,
          s.maiPosition.y - s.players[0].y,
        ) <
          Math.hypot(
            before.maiPosition.x - before.players[0].x,
            before.maiPosition.y - before.players[0].y,
          ),
    );
    await page.evaluate(() => {
      ART.setPlayer(890, 380);
      ART.pause(false);
      document.activeElement?.blur();
    });
    await settle();
    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowDown');
    check(
      'Moving P1 never causes a spontaneous focus change',
      (await snap()).lockedTarget === 'P1',
    );
    await page.evaluate(() => ART.setAlive(0, false));
    await settle();
    check(
      'Only the focused player death permits a new target',
      (await snap()).lockedTarget === 'P2',
    );
    await seek('summon', 1.3);
    s = await snap();
    check(
      'No summon at exactly 40 percent',
      s.bossHpPercent === 40 && s.summonCount === 0,
    );
    await seek('summon', 2.5);
    s = await snap();
    check(
      'Both summons once below 40 percent retained',
      s.summonCount === 1 &&
        s.objects.some((o) => o.id === 'mai') &&
        s.objects.some((o) => o.id === 'hoang'),
    );
    await seek('poison', 1);
    check(
      'Cloth poison pouch retained',
      (await snap()).projectiles.some((p) => p.kind === 'poison_pouch'),
    );
    await seek('poison', 3.5);
    check('Lingering burgundy poison retained', (await snap()).poisonActive);
    await seek('heal', 0.5);
    s = await snap();
    check(
      'Both healing palm targets retained',
      s.projectiles.length === 2 &&
        new Set(s.projectiles.map((p) => p.target)).size === 2,
    );
    await seek('pull', 1);
    const pullBefore = (await snap()).players[0];
    await seek('pull', 2);
    const pullAfter = (await snap()).players[0];
    check(
      'Inward suction retained',
      Math.hypot(pullAfter.x - DEMO.field.x, pullAfter.y - DEMO.field.y) <
        Math.hypot(pullBefore.x - DEMO.field.x, pullBefore.y - DEMO.field.y),
    );
    await seek('evade', 0.8);
    check(
      'Hoang speed burst retained',
      (await snap()).objects.some((o) => o.clip === 'evade_right'),
    );
    await page.evaluate(() => {
      ART.choose('sprites');
      ART.pause(false);
      document.activeElement?.blur();
    });
    await settle();
    check(
      'Leaving encounter preview restores the temporary hidden statue',
      (await page.evaluate(() => ART.scene.statue.visible)) &&
        (await page.locator('#encounter-boundary').isHidden()),
    );
    const x = (await snap()).players[0].x;
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(200);
    await page.keyboard.up('ArrowLeft');
    check('Arrow controls retained', (await snap()).players[0].x < x);
    await page.keyboard.press('q');
    await page.waitForFunction(() => ART.snapshot().mode === 'pebbles');
    check('Q hotkey retained');
    await page.locator('#settings-toggle').click();
    await page.locator('#facing').selectOption('left');
    await page.locator('#close-settings').click();
    await seek('petals', 1.2);
    check(
      'Corrected left flute retained',
      (await snap()).objects.some((o) => o.clip === 'flute_left'),
    );
    await page.evaluate(() => {
      ART.setDirection('right');
      ART.setParty(6);
    });
    await seek('petals', 1.5);
    check(
      'All six visual dummies remain in the locked region during VFX',
      (await snap()).players.every((p) => fieldDistance(p) <= 1),
    );
    await page.locator('#viewport').screenshot({
      path: join(evidence, 'arena-six-player-random-petals.png'),
    });
    for (const size of [
      { width: 960, height: 600 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(size);
      check(
        'Controls and boundary stay inside viewport ' + size.width,
        await page.evaluate(() => {
          const a = document.getElementById('viewport').getBoundingClientRect();
          return ['mode', 'pause', 'timeline', 'encounter-boundary'].every(
            (id) => {
              const b = document.getElementById(id).getBoundingClientRect();
              return (
                b.left >= a.left - 1 &&
                b.right <= a.right + 1 &&
                b.top >= a.top - 1 &&
                b.bottom <= a.bottom + 1
              );
            },
          );
        }),
      );
    }
    check('No page or asset errors', errors.length === 0);
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
      join(output, 'browser_verification.json'),
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
