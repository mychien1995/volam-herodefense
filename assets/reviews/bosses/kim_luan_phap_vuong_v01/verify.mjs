import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const folder = fileURLToPath(new URL('.', import.meta.url)),
  root = resolve(folder, '../../../..');
const evidence = resolve(folder, 'feedback_02');
export async function runReview() {
  await mkdir(evidence, { recursive: true });
  const started = performance.now(),
    port = 5419,
    url =
      'http://127.0.0.1:' +
      port +
      '/assets/reviews/bosses/kim_luan_phap_vuong_v01/';
  const service = spawn('python', [resolve(folder, 'serve.py'), String(port)], {
    cwd: root,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let browser,
    page,
    serviceError = '';
  service.stderr.on('data', (d) => (serviceError += d));
  const checks = [],
    errors = [];
  let framesReport = [],
    timings = {};
  function check(name, value = true) {
    assert.ok(value, name);
    checks.push(name);
  }
  try {
    for (let i = 0; i < 60; i++) {
      if (service.exitCode !== null)
        throw Error('Owned review service failed: ' + serviceError);
      try {
        if ((await fetch(url)).ok) break;
      } catch {}
      await delay(100);
    }
    browser = await chromium.launch({
      channel: process.env.VOLAM_ART_BROWSER_CHANNEL || 'msedge',
      headless: true,
    });
    page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('response', (r) => {
      if (r.status() >= 400) errors.push(r.status() + ':' + r.url());
    });
    await page.goto(url);
    await page.waitForFunction(() => window.ART?.ready);
    check(
      'Installed Phaser 4.2.1 loaded',
      await page.evaluate(() => Phaser.VERSION === '4.2.1'),
    );
    const fixtures = await page.evaluate(() =>
      Object.entries(ART.D.bundles)
        .filter(([k]) => k !== 'hero')
        .flatMap(([key, b]) =>
          b.clips.map((c) => ({
            key,
            clip: c.name,
            frames: c.frames,
            fps: c.fps,
            repeat: c.repeat,
          })),
        ),
    );
    timings.startupMs = Math.round(performance.now() - started);
    const frameStart = performance.now();
    await page.evaluate(() => {
      ART.choose('encounter');
      ART.setTime(0, false);
    });
    for (const f of fixtures) {
      await page.evaluate((f) => {
        ART.fixture = { key: f.key, clip: f.clip };
        ART.play();
      }, f);
      await page.waitForFunction(
        (f) =>
          f.frames.every((n) =>
            (ART.observed[f.key + ':' + f.clip] || []).includes(n),
          ) &&
          (f.repeat === -1
            ? ART.fixtureCycles.includes(f.key + ':' + f.clip)
            : ART.fixtureCompletions.includes(f.key + ':' + f.clip)),
        f,
        { timeout: 6000 },
      );
      const observed = await page.evaluate(
        (f) => ({
          seen: ART.observed[f.key + ':' + f.clip],
          completed: ART.fixtureCompletions.includes(f.key + ':' + f.clip),
          fullCycle: ART.fixtureCycles.includes(f.key + ':' + f.clip),
          events: ART.fixtureEvents.filter(
            (e) => e.key === f.key + ':' + f.clip,
          ),
        }),
        f,
      );
      framesReport.push({ ...f, ...observed });
    }
    await page.evaluate(() => (ART.fixture = null));
    check(
      'All 53 real Phaser clips / 184 selected frames observed',
      framesReport.length === 53 &&
        framesReport.reduce((n, r) => n + r.frames.length, 0) === 184,
    );
    check(
      'Every dedicated one-shot cast completes',
      framesReport.filter((r) => r.repeat === 0).every((r) => r.completed),
    );
    check(
      'Every looping clip completes a full observed cycle',
      framesReport.filter((r) => r.repeat === -1).every((r) => r.fullCycle),
    );
    check(
      'Fixture frame event intervals match authored cadence',
      framesReport.every((r) => {
        const events = r.events;
        if (events.length < 2) return false;
        const intervals = events
          .slice(1)
          .map((e, i) => e.at - events[i].at)
          .filter((n) => n > 10);
        return (
          intervals.length &&
          intervals.some((n) => Math.abs(n - 1000 / r.fps) < 70)
        );
      }),
    );
    timings.framesMs = Math.round(performance.now() - frameStart);
    async function pose(mode, time) {
      await page.evaluate(
        ({ mode, time }) => {
          ART.choose(mode);
          ART.setTime(time);
        },
        { mode, time },
      );
      await page.waitForFunction(
        ({ mode, time }) => ART.state.mode === mode && ART.state.time === time,
        { mode, time },
      );
      return page.evaluate(() => ART.state);
    }
    let s = await pose('encounter', 2);
    check(
      'Both disciples visible; Kim absent',
      s.disciples.hoac && s.disciples.dat && !s.kimVisible,
    );
    await page.screenshot({ path: resolve(evidence, 'arena-design.png') });
    s = await pose('encounter', 7);
    check(
      'One disciple remaining still blocks Kim',
      !s.disciples.hoac && s.disciples.dat && !s.kimVisible,
    );
    s = await pose('encounter', 13);
    check(
      'Kim appears only after both disciples exit',
      !s.disciples.hoac && !s.disciples.dat && s.kimVisible,
    );
    for (const mode of [
      'hoac_gust',
      'hoac_nails',
      'hoac_spin',
      'dat_basic',
      'dat_fissure',
      'dat_ward',
      'dat_boulder',
      'dat_triple',
      'kim_basic',
      'kim_hunt',
      'kim_guard',
      'kim_cage',
      'kim_stomp',
      'kim_elephants',
      'kim_enrage',
    ]) {
      s = await pose(mode, 1.2);
      check(
        'Scene ' + mode + ' renders authored cels',
        s.objects.some((o) => o.key !== 'hero'),
      );
      check(
        'Scene ' + mode + ' uses fixed foot origins',
        s.objects
          .filter((o) => o.key.endsWith('_base') || o.key.endsWith('_actions'))
          .every((o) => o.origin[0] === 0.5 && o.origin[1] === 0.8),
      );
    }
    s = await pose('dat_fissure', 0.89);
    check(
      'Fissure warning before half-second delay',
      !s.exploding && s.explosionAt - s.impactAt === 0.5,
    );
    s = await pose('dat_fissure', 0.9);
    check('Fissure explosion after exactly 0.5 seconds', s.exploding);
    s = await pose('hoac_gust', 1);
    check(
      'Exactly 5 fan gusts across 160 degrees',
      s.projectileCount === 5 && s.spreadDegrees === 160,
    );
    s = await pose('hoac_nails', 1);
    check(
      'Five front + five rear poison nails at increased speed',
      s.projectileCount === 10 &&
        s.projectileSpeed === 620 &&
        s.projectiles.some((p) => p.side === 1),
    );
    s = await pose('kim_basic', 1);
    check(
      'Exactly 5 forward wheels / ranged reach',
      s.projectileCount === 5 && s.forwardReach === 350,
    );
    for (const time of [0, 3.5, 4, 7.7, 8]) {
      s = await pose('dat_ward', time);
      check(
        'Exactly one circulating ward at ' + time,
        s.wardCount === 1 &&
          s.objects.filter((o) => o.id === 'sole-ward').length === 1,
      );
    }
    s = await pose('kim_guard', 2);
    check(
      'Five rings orbit before release',
      s.stage === 'orbit' && s.projectileCount === 5,
    );
    s = await pose('kim_guard', 4);
    check(
      'Five rings release after orbit',
      s.stage === 'release' && s.projectileCount === 5,
    );
    s = await pose('kim_hunt', 9);
    const before = s.objects.filter((o) => o.id.startsWith('hunt'));
    await page.evaluate(() => ART.setPlayer(200, 620));
    await page.waitForTimeout(40);
    s = await page.evaluate(() => ART.state);
    check(
      'Ring paths do not home on moved player',
      JSON.stringify(before) ===
        JSON.stringify(s.objects.filter((o) => o.id.startsWith('hunt'))),
    );
    s = await pose('kim_hunt', 21);
    check(
      'Long-lived rings expire without stale sprites',
      s.objects.every((o) => !o.id.startsWith('hunt')),
    );
    await pose('dat_boulder', 0.6);
    const target = await page.evaluate(() => ART.state.capturedTarget);
    await page.evaluate(() => ART.setPlayer(180, 600));
    await page.waitForTimeout(40);
    check(
      'Thrown rock retains captured target',
      JSON.stringify(await page.evaluate(() => ART.state.capturedTarget)) ===
        JSON.stringify(target),
    );
    await pose('kim_cage', 2);
    await page.evaluate(() => {
      ART.setRescue(true);
      ART.setParty(6);
    });
    await page.keyboard.press('a');
    await page.keyboard.press('a');
    await page.keyboard.press('a');
    await page.waitForFunction(() => ART.state.cageBroken);
    check('Illustrative teammate A hits shatter cage');
    s = await pose('kim_elephants', 2.2);
    const rock = s.elephantPlan.rocks[2];
    await page.evaluate((r) => ART.setPlayer(r.x, r.y + 75), rock);
    await page.waitForTimeout(40);
    check(
      'Below random rock shelters against downward herd',
      await page.evaluate(() => ART.state.sheltered),
    );
    s = await pose('kim_elephants', 5.7);
    await page.evaluate((r) => ART.setPlayer(r.x, r.y + 75), rock);
    await page.waitForTimeout(40);
    check(
      'Same below-rock spot loses shelter against upward herd',
      !(await page.evaluate(() => ART.state.sheltered)),
    );
    await page.evaluate((r) => ART.setPlayer(r.x, r.y - 75), rock);
    await page.waitForTimeout(40);
    check(
      'Above random rock shelters against upward herd',
      await page.evaluate(() => ART.state.sheltered),
    );
    check(
      'Upward herd uses independently authored back-view animation',
      await page.evaluate(() =>
        ART.state.objects.some(
          (o) => o.key === 'elephant_up' && o.clip === 'run_up',
        ),
      ),
    );
    s = await pose('kim_elephants', 2.8);
    check(
      'Normal herd has 12 lanes and three close rows',
      s.elephantPlan.laneCount === 12 &&
        s.elephantPlan.rows === 3 &&
        s.elephantPlan.elephants.length >= 24,
    );
    const oldRocks = s.elephantPlan.rocks,
      cycle = s.elephantPlan.duration;
    s = await pose('kim_elephants', cycle + 2);
    check(
      'Rocks randomize per cast instead of moving during a cast',
      JSON.stringify(oldRocks) !== JSON.stringify(s.elephantPlan.rocks),
    );
    const same = s.elephantPlan.rocks;
    s = await pose('kim_elephants', cycle + 2.2);
    check(
      'Rock positions stay stable while elephants charge',
      JSON.stringify(same) === JSON.stringify(s.elephantPlan.rocks),
    );
    s = await pose('hoac_triple', 1.8);
    check(
      'Reduced four-ray slashes leave wide dodge lanes',
      s.raysPerStrike === 4 &&
        new Set(s.projectiles.map((p) => p.strike)).size === 3 &&
        s.forwardReach === 880,
    );
    s = await pose('kim_stomp', 0.95);
    check(
      'Stomp stays within reduced 280px local area',
      s.maxRadius === 280 &&
        s.spreadSpeed === 900 &&
        s.waves.every((w) => w.radius <= 280),
    );
    const d0 = (await pose('dat_ward', 0.7)).datMotion;
    s = await pose('dat_ward', 2);
    check(
      'Dat Nhi Ba visibly walks slowly with a walk animation',
      Math.hypot(s.datMotion.x - d0.x, s.datMotion.y - d0.y) > 40 &&
        s.objects.some(
          (o) => o.id === 'dat_nhi_ba' && o.clip.startsWith('walk_'),
        ) &&
        s.datMotion.speed === 38,
    );
    s = await pose('kim_enrage', 5);
    check(
      '29% HP art state has speed multiplier and seeded lanes',
      s.hpPercent === 29 &&
        s.speedMultiplier > 1 &&
        s.lanes.length === 14 &&
        s.elephantPlan.rows === 4,
    );
    const fire = await pose('kim_enrage', 2.5);
    const boss = fire.objects.find((o) => o.id === 'kim_luan');
    check(
      'Enrage throws five wheels while the actor keeps moving',
      fire.enrageShots.length >= 5 &&
        fire.enrageFiring &&
        Math.hypot(fire.enragePosition.x - 640, fire.enragePosition.y - 410) >
          50 &&
        boss.clip === 'sweep',
    );
    const origin = fire.enrageShots[0].origin;
    await page.evaluate(() => ART.setPlayer(180, 300));
    await page.waitForTimeout(40);
    check(
      'Released enrage wheels retain their captured origin and heading',
      await page.evaluate(
        (before) =>
          JSON.stringify(ART.state.enrageShots) === JSON.stringify(before),
        fire.enrageShots,
      ),
    );
    const walk = await pose('kim_enrage', 3.1);
    check(
      'Enrage uses real walk frames between throws',
      walk.objects.some(
        (o) => o.id === 'kim_luan' && o.clip.startsWith('walk_'),
      ) &&
        Math.hypot(
          walk.enragePosition.x - fire.enragePosition.x,
          walk.enragePosition.y - fire.enragePosition.y,
        ) > 50,
    );
    s = await pose('kim_enrage', 5);
    const lanes = s.lanes;
    s = await pose('kim_enrage', 5);
    check(
      'Enrage lane preview is deterministic',
      JSON.stringify(lanes) === JSON.stringify(s.lanes),
    );
    await pose('encounter', 2);
    await page.locator('canvas').click({ position: { x: 600, y: 450 } });
    const old = await page.evaluate(() => ART.player.x);
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowRight');
    check(
      'Arrow movement and facing retained',
      await page.evaluate(
        (old) => ART.player.x > old + 20 && ART.player.dir === 'right',
        old,
      ),
    );
    await page.locator('#gallery').click();
    check(
      'Atlas overlay stays within viewport',
      await page.locator('#sheets').evaluate((d) => {
        const r = d.getBoundingClientRect();
        return (
          r.x >= 0 &&
          r.y >= 0 &&
          r.right <= innerWidth &&
          r.bottom <= innerHeight
        );
      }),
    );
    await page.locator('#close').click();
    await page.selectOption('#facing', 'up');
    await page.waitForTimeout(40);
    s = await page.evaluate(() => ART.state);
    check(
      'Facing selector selects authored back pose',
      s.objects.some((o) => o.clip === 'idle_up'),
    );
    for (const size of [
      { width: 944, height: 466 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(size);
      await page.waitForTimeout(100);
      check(
        'Single viewport / overlay at ' + size.width,
        await page.evaluate(() => {
          const r = document.querySelector('#viewport').getBoundingClientRect();
          return (
            r.width === innerWidth &&
            r.height === innerHeight &&
            document.body.scrollHeight <= innerHeight
          );
        }),
      );
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.selectOption('#facing', 'down');
    await pose('kim_elephants', 5.85);
    await page.evaluate(() => ART.play());
    await page.waitForTimeout(350);
    await page.screenshot({ path: resolve(evidence, 'arena-action.png') });
    check(
      'Six hero figures remain readable',
      await page.evaluate(
        () =>
          ART.state.objects.filter((o) => o.id.startsWith('hero')).length === 6,
      ),
    );
    check('No browser/page/load errors', errors.length === 0);
    const report = {
      status: 'PASS',
      scope:
        'Standalone Phaser art/choreography; not game combat, multiplayer, server, damage, AI, rewards or final approval.',
      phaser: '4.2.1',
      partyFigures: 6,
      realClients: 1,
      serverMechanics: false,
      finalArtApproval: false,
      checks,
      frames: framesReport,
      errors,
      timings: { ...timings, totalMs: Math.round(performance.now() - started) },
    };
    await writeFile(
      resolve(evidence, 'verification.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    console.log(
      JSON.stringify({
        status: 'PASS',
        checks: checks.length,
        clips: framesReport.length,
        observedFrames: 184,
        durationMs: report.timings.totalMs,
        scope: report.scope,
      }),
    );
    return report;
  } catch (e) {
    if (page)
      await page
        .screenshot({ path: resolve(evidence, 'diagnostic-failure.png') })
        .catch(() => {});
    await writeFile(
      resolve(evidence, 'failure.json'),
      JSON.stringify(
        { error: String(e), checks, errors, frames: framesReport },
        null,
        2,
      ) + '\n',
    );
    throw e;
  } finally {
    if (browser) await browser.close();
    service.kill();
    await Promise.race([once(service, 'exit').catch(() => {}), delay(2000)]);
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await runReview();
