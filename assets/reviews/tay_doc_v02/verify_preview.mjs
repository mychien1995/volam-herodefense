import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const here = dirname(fileURLToPath(import.meta.url)),
  root = resolve(here, '../../..');
const ix = process.argv.indexOf('--dependency-root'),
  deps = ix < 0 ? root : process.argv[ix + 1];
const require = createRequire(resolve(deps, 'package.json'));
const { chromium } = require('@playwright/test');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
const evidence = resolve(here, 'feedback03/evidence');
await mkdir(evidence, { recursive: true });
let report;
try {
  await page.goto(
    'http://127.0.0.1:' + (process.env.TAY_DOC_REVIEW_PORT || 5397),
  );
  await page.waitForFunction(() => window.tayDocReview?.ready, {
    timeout: 30000,
  });
  await page.evaluate(() => window.tayDocReview.pause(true));
  const snap = () => page.evaluate(() => window.tayDocReview.snapshot());
  const seek = async (mode, t) => {
    await page.evaluate(
      ([m, t]) => {
        window.tayDocReview.setMode(m);
        window.tayDocReview.seek(t);
      },
      [mode, t],
    );
    await page.waitForTimeout(40);
  };
  await seek('snakes', 2200);
  await page
    .locator('#viewport')
    .screenshot({ path: resolve(evidence, 'six_snake_pillars.png') });
  let s = await snap();
  assert.equal(s.nodes.filter((n) => n.tag === 'snake_facing_8').length, 6);
  assert.equal(s.nodes.filter((n) => n.key === 'hero').length, 6);
  assert(s.projectiles.filter((p) => p.kind === 'snake-ray').length <= 6);
  // Eight actual head sprites and eight captured shot vectors, with slower cadence.
  const snakeHeadings = [];
  for (let i = 0; i < 8; i++) {
    await seek('snakes', 1380 + i * 1350 + 100);
    s = await snap();
    assert(
      s.nodes.some(
        (n) => n.key === 'snake8' && n.frame === 'snake_facing_8_' + i,
      ),
    );
    const shot = s.projectiles.find(
      (p) =>
        p.kind === 'snake-ray' && p.pillar === 0 && p.start === 1380 + i * 1350,
    );
    assert(shot);
    assert.equal(shot.angle, (i * Math.PI) / 4);
    snakeHeadings.push(shot.angle);
  }
  assert.equal(new Set(snakeHeadings).size, 8);
  await seek('snakes', 2830);
  s = await snap();
  const old = s.projectiles.find((p) => p.pillar === 0 && p.start === 1380);
  assert(
    old && old.angle === 0 && old.distance === 1450 * 0.39,
    'old ray must retain its launch heading',
  );
  const shots = s.projectiles
    .filter((p) => p.pillar === 0)
    .map((p) => p.start)
    .sort((a, b) => a - b);
  assert.deepEqual(shots, [1380, 2730]);
  assert.equal(shots[1] - shots[0], 1350);
  await seek('enter', 1000);
  s = await snap();
  assert(
    s.nodes.some((n) => n.key === 'p1' && n.x === 110 && n.y === 356),
    'entry must follow west road center',
  );
  await page
    .locator('#viewport')
    .screenshot({ path: resolve(evidence, 'west_road_entry.png') });
  for (const [d, a] of [
    ['right', 0],
    ['down', Math.PI / 2],
    ['left', Math.PI],
    ['up', -Math.PI / 2],
  ]) {
    await page.evaluate((d) => window.tayDocReview.setFacing(d), d);
    await seek('staff', 300);
    s = await snap();
    assert.deepEqual(s.areas[0], {
      kind: 'staff',
      x: 460,
      y: 460,
      radius: 160,
      arcDegrees: 180,
      angle: a,
    });
    assert(
      s.nodes.some(
        (n) =>
          n.tag === 'staff_180_warning' &&
          n.rotation === a &&
          n.x === 460 &&
          n.y === 460,
      ),
    );
  }
  await page.evaluate(() => window.tayDocReview.setFacing('right'));
  await seek('staff', 900);
  await page
    .locator('#viewport')
    .screenshot({ path: resolve(evidence, 'staff_180_sweep.png') });
  await seek('needles', 500);
  assert(
    (s = (await snap()).nodes.some((n) => n.tag === 'needle_fan_warning')),
  );
  assert.equal((await snap()).projectiles.length, 0);
  await seek('needles', 1500);
  assert.equal((await snap()).projectiles.length, 27);
  await page
    .locator('#viewport')
    .screenshot({ path: resolve(evidence, 'needle_cone_volley.png') });
  await seek('cloud', 500);
  assert.equal(
    (await snap()).nodes.filter((n) => n.tag === 'cloud_warning').length,
    8,
  );
  await seek('cloud', 1800);
  assert.equal(
    (await snap()).nodes.filter((n) => n.tag === 'cloud_loop').length,
    8,
  );
  await page
    .locator('#viewport')
    .screenshot({ path: resolve(evidence, 'eight_poison_clouds.png') });
  await seek('stomp', 700);
  s = await snap();
  assert.equal(s.areas[0].radius, 405);
  assert(
    s.nodes.some(
      (n) =>
        n.tag === 'eruption_circle_warning' &&
        Math.abs(n.scale * 208 - 810) < 0.001,
    ),
  );
  await seek('stomp', 1500);
  s = await snap();
  assert(
    s.nodes.some(
      (n) =>
        n.tag === 'transition_shockwave' &&
        Math.abs(n.scale * 208 - 810) < 0.001,
    ),
  );
  assert(
    s.nodes.filter((n) => n.tag === 'poison_status').length === 3,
    'smaller stomp reaches three nearby heroes, excluding the hero at distance433',
  );
  await page
    .locator('#viewport')
    .screenshot({ path: resolve(evidence, 'wide_cap_mo_stomp.png') });
  await seek('curse', 4000);
  await seek('curse', 4550);
  s = await snap();
  assert.equal(s.hp[0], 75);
  assert.equal(s.affectedParty.length, 0);
  await page
    .locator('#viewport')
    .screenshot({ path: resolve(evidence, 'curse_isolated_burst.png') });
  await page.locator('#settings').click();
  await page.locator('#isolate').uncheck();
  await page.locator('#settings').click();
  await seek('curse', 4550);
  s = await snap();
  assert(s.affectedParty.length > 0);
  await seek('channel', 1500);
  s = await snap();
  assert.equal(s.projectiles.filter((p) => p.kind === 'radial').length, 32);
  assert(
    s.projectiles
      .filter((p) => p.kind === 'radial')
      .every(
        (p) =>
          p.velocity === 130.05 &&
          Math.abs((p.velocity * p.lifetimeMs) / 1000 - 484.5) < 0.001,
      ),
  );
  assert(
    s.projectiles
      .filter((p) => p.start === 900)
      .every((p) => Math.abs(p.distance - 78.03) < 0.001),
  );
  assert.equal(
    new Set(s.projectiles.filter((p) => p.start === 1250).map((p) => p.angle))
      .size,
    16,
  );
  await page
    .locator('#viewport')
    .screenshot({ path: resolve(evidence, 'phase2_radial_channel.png') });
  assert.equal(await page.locator('#timeline').getAttribute('max'), '8200');
  await seek('channel', 7750);
  assert(
    (await snap()).projectiles.filter((p) => p.start === 4050).length === 16,
    'last volley must remain visible almost to full range',
  );
  assert(
    (await snap()).projectiles
      .filter((p) => p.start === 4050)
      .every((p) => Math.abs(p.distance - 481.185) < 0.001),
  );
  await seek('channel', 7800);
  assert(
    !(await snap()).projectiles.some((p) => p.start === 4050),
    'last volley expires after its full range',
  );
  for (const land of [1350, 2600, 3850]) {
    await seek('eruption', land + 60);
    s = await snap();
    assert.equal(s.projectiles.filter((p) => p.start === land).length, 16);
    assert(
      s.projectiles
        .filter((p) => p.start === land)
        .every(
          (p) =>
            p.velocity === 218.025 &&
            Math.abs(p.distance - 13.0815) < 0.001 &&
            Math.abs((p.velocity * p.lifetimeMs) / 1000 - 484.5) < 0.001,
        ),
    );
  }
  await seek('eruption', 1680);
  await page
    .locator('#viewport')
    .screenshot({ path: resolve(evidence, 'phase2_hop_radial.png') });
  const packages = JSON.parse(
    await readFile(resolve(here, 'packages.json'), 'utf8'),
  );
  await page.evaluate(() => window.tayDocReview.clearObserved());
  let count = 0;
  for (const [key, p] of Object.entries(packages)) {
    if (key === 'hero') continue;
    for (const [tag, a] of Object.entries(p.animations)) {
      await page.evaluate(
        ([k, t]) => window.tayDocReview.gallery(k, t),
        [key, tag],
      );
      let t = 0;
      for (let i = 0; i < a.frames.length; i++) {
        await page.evaluate((t) => window.tayDocReview.seek(t), t + 1);
        s = await snap();
        assert(
          s.nodes.some((n) => n.key === key && n.frame === a.frames[i]),
          key + '/' + a.frames[i],
        );
        count++;
        t += a.durationsMs[i];
      }
    }
  }
  assert.equal(count, 508);
  const live = [];
  for (const [mode, wait] of [
    ['staff', 1250],
    ['needles', 1800],
    ['cloud', 1900],
    ['curse', 5100],
    ['snakes', 2300],
    ['phase', 3000],
    ['palm', 1300],
    ['stomp', 1800],
    ['channel', 1900],
    ['eruption', 4700],
  ]) {
    await page.evaluate((m) => {
      window.tayDocReview.setMode(m);
      window.tayDocReview.clearObserved();
      window.tayDocReview.pause(false);
    }, mode);
    await page.waitForTimeout(wait);
    await page.evaluate(() => window.tayDocReview.pause(true));
    const frames = await page.evaluate(() => window.tayDocReview.seen());
    assert(frames.length > 4, mode + ' no live motion');
    const expected = {
      staff: ['actions', 'staff_sweep_right'],
      needles: ['fx1', 'poison_needle'],
      cloud: ['fx1', 'cloud_loop'],
      curse: ['newfx', 'curse_mark'],
      snakes: ['newfx', 'snake_rise'],
      phase: ['transition', 'staff_release_right'],
      palm: ['actions', 'palm_attack_right'],
      stomp: ['newactor', 'hop_right'],
      channel: ['newactor', 'exhale_right'],
      eruption: ['newactor', 'hop_right'],
    }[mode];
    for (let i = 0; i < 4; i++)
      assert(
        frames.includes(expected[0] + '/' + expected[1] + '_' + i),
        mode + ' missing LIVE cel ' + i,
      );
    live.push({ mode, drawnFrames: frames.length, time: (await snap()).time });
  }
  await page.evaluate(() => {
    window.tayDocReview.setMode('snakes');
    window.tayDocReview.clearObserved();
    window.tayDocReview.pause(false);
  });
  await page.waitForTimeout(11250);
  await page.evaluate(() => window.tayDocReview.pause(true));
  const liveSnakeFrames = await page.evaluate(() => window.tayDocReview.seen());
  for (let i = 0; i < 8; i++)
    assert(
      liveSnakeFrames.includes('snake8/snake_facing_8_' + i),
      'missing LIVE snake heading ' + i,
    );
  // One pillar can be broken with canonical movement/A in the art sandbox.
  await seek('snakes', 1900);
  await page.evaluate(() => {
    document.activeElement?.blur();
    window.tayDocReview.pause(false);
  });
  await page.keyboard.down('a');
  await page.waitForTimeout(1450);
  await page.keyboard.up('a');
  await page.evaluate(() => window.tayDocReview.pause(true));
  s = await snap();
  assert(
    s.snakeHp.some((h) => h === 0),
    'P1 must break its nearby snake with A',
  );
  // Live four-facing clip playback observes all cels without recording.
  const directional = [];
  for (const d of ['right', 'down', 'left', 'up']) {
    await page.evaluate((d) => {
      window.tayDocReview.gallery('p1', 'walk_' + d);
      window.tayDocReview.clearObserved();
      window.tayDocReview.pause(false);
    }, d);
    await page.waitForTimeout(610);
    await page.evaluate(() => window.tayDocReview.pause(true));
    const frames = await page.evaluate(() => window.tayDocReview.seen());
    for (let i = 0; i < 4; i++)
      assert(frames.includes('p1/walk_' + d + '_' + i));
    directional.push(d);
  }
  await page.setViewportSize({ width: 900, height: 700 });
  await seek('snakes', 2100);
  const bounds = await page.locator('#viewport').boundingBox();
  for (const selector of ['.identity', '.tools', '#dock', '.transport']) {
    const b = await page.locator(selector).boundingBox();
    assert(
      b.x >= bounds.x &&
        b.y >= bounds.y &&
        b.x + b.width <= bounds.x + bounds.width + 1 &&
        b.y + b.height <= bounds.y + bounds.height + 1,
      selector + ' outside viewport',
    );
  }
  assert.deepEqual(errors, []);
  report = {
    status: 'PASS',
    phaser: s.phaser,
    scope:
      'Standalone Phaser art preview; no multiplayer/server/gameplay acceptance',
    authoredBossVfxCels: count,
    liveActions: live,
    fourFacingWalk: directional,
    sixSampleHeroes: true,
    snakePillars: 6,
    keyboardDestruction: true,
    coneWarningBefore27Needles: true,
    clouds: 8,
    feedbackRevision: 'feedback03',
    snakeHeadings: 8,
    snakeShotIntervalMs: 1350,
    westRoadEntryY: 356,
    staffFrontalArcDegrees: 180,
    stompRadiusPx: 405,
    channelProjectileSpeedPxPerSec: 130.05,
    eruptionProjectileSpeedPxPerSec: 218.025,
    projectileRangePreservedPx: 484.5,
    uncurableSelectedHpLossPercent: 25,
    isolatedAndGroupedCursePreview: true,
    radialDirections: 16,
    eruptionLandings: 3,
    errors,
    recordingsCreated: false,
    directorApproved: false,
  };
} catch (e) {
  report = { status: 'FAIL', error: e.stack, errors };
  process.exitCode = 1;
  await page
    .screenshot({ path: resolve(evidence, 'failure.png') })
    .catch(() => {});
} finally {
  await writeFile(
    resolve(here, 'browser_verification.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  await browser.close();
}
console.log(JSON.stringify(report));
