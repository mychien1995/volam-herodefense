/** Browser checks of the standalone artwork viewer; no gameplay acceptance. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';

const here = dirname(fileURLToPath(import.meta.url));
const flag = process.argv.indexOf('--dependency-root');
const dependencyRoot = flag >= 0 ? resolve(process.argv[flag + 1]) : resolve(here, '../../..');
const require = createRequire(join(dependencyRoot, 'package.json'));
const { chromium } = require('@playwright/test');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 854 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [], failedRequests = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('requestfailed', (request) => failedRequests.push(request.url()));
const evidence = join(here, 'evidence');
await mkdir(evidence, { recursive: true });
let report;
try {
  await page.goto(pathToFileURL(join(here, 'index.html')).href);
  await page.waitForFunction(() => window.lyMacSauReview?.ready);
  await page.evaluate(() => window.lyMacSauReview.pause(true));
  const snap = () => page.evaluate(() => window.lyMacSauReview.snapshot());
  const seek = (mode, time) => page.evaluate(([m, t]) => { window.lyMacSauReview.setMode(m); window.lyMacSauReview.setTime(t); }, [mode, time]);

  // Observe every authored actor cel when rendered, all directions and one-shot completion.
  await page.evaluate(() => window.lyMacSauReview.clearObserved());
  for (const direction of ['down', 'left', 'right', 'up']) {
    await page.evaluate((d) => window.lyMacSauReview.setDirection(d), direction);
    for (const [state, duration, count] of [['idle', 350, 2], ['walk', 110, 4], ['basic_attack', 90, 4], ['needle_cast', 140, 4], ['palm_channel', 220, 4], ['fast_sweep', 70, 4], ['summon_cast', 180, 4], ['hurt', 130, 2], ['death', 180, 4]]) {
      await page.evaluate((s) => window.lyMacSauReview.setCharacterState(s), state);
      for (let i = 0; i < count; i++) {
        await page.evaluate((t) => window.lyMacSauReview.setTime(t), i * duration + 1);
        const stateNow = await snap();
        const actor = stateNow.nodes.find((node) => node.package === 'boss');
        assert.equal(actor.frame, `${state}_${direction}_${i}`);
        assert.deepEqual([actor.x, actor.y, actor.scale], [640, 452, 1]);
      }
    }
  }
  const actorFrames = await page.evaluate(() => window.lyMacSauReview.observed().filter((id) => id.startsWith('boss/')));
  assert.equal(actorFrames.length, 128);
  await page.evaluate(() => window.lyMacSauReview.setDirection('right'));

  await seek('palm', 1500);
  let state = await snap();
  assert.equal(state.projectiles.length, 8);
  assert.equal(new Set(state.projectiles.map((p) => p.angle)).size, 8);
  assert(state.projectiles.every((p) => p.color === 'purple'));
  assert.equal(state.nodes.filter((n) => n.package === 'hero').length, 6);
  await page.locator('#viewport').screenshot({ path: join(evidence, 'arena-purple-eight-directions.png') });
  await seek('palm', 2900);
  state = await snap();
  assert.equal(state.projectiles.length, 8);
  assert(state.projectiles.every((p) => p.distance > 600 && p.distance <= 620));
  await seek('palm', 3000);
  assert.equal((await snap()).projectiles.length, 0);

  await seek('needle', 500);
  state = await snap();
  assert.equal(state.projectiles.length, 1);
  assert.equal(state.projectiles[0].targetPlayer, 1);
  const lockedAngle = state.projectiles[0].angle;
  const targetLock = state.targetLock;
  // Use real held keyboard movement while the projectile is live. At 0.25x it survives this move.
  await page.locator('#settings-toggle').click();
  await page.locator('#speed').selectOption('0.25');
  await page.locator('#settings-toggle').click();
  await page.evaluate(() => { document.activeElement?.blur(); window.lyMacSauReview.pause(false); });
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(180);
  await page.keyboard.up('ArrowDown');
  await page.evaluate(() => window.lyMacSauReview.pause(true));
  state = await snap();
  assert(state.heroes[0].y > 470, 'P1 should move from held arrow input');
  assert.equal(state.projectiles.length, 1);
  assert.equal(state.projectiles[0].angle, lockedAngle);
  assert.deepEqual(state.targetLock, targetLock);
  await page.locator('#settings-toggle').click();
  await page.locator('#speed').selectOption('1');
  await page.locator('#settings-toggle').click();

  await seek('summon', 1800);
  assert.equal((await snap()).nodes.filter((n) => n.package === 'summon').length, 4);
  await seek('summon', 300);
  assert.equal((await snap()).nodes.filter((n) => n.tag === 'co_mo_sigil').length, 4);
  assert.equal((await snap()).nodes.filter((n) => n.package === 'summon').length, 0);
  await seek('poison', 1700);
  state = await snap();
  assert.equal(state.projectiles.length, 12);
  assert.deepEqual([...new Set(state.projectiles.map((p) => p.side))].sort(), ['east', 'north', 'south', 'west']);
  assert(state.projectiles.filter((p) => p.side === 'west').every((p) => p.x > p.origin.x));
  assert(state.projectiles.filter((p) => p.side === 'east').every((p) => p.x < p.origin.x));
  assert(state.projectiles.filter((p) => p.side === 'north').every((p) => p.y > p.origin.y));
  assert(state.projectiles.filter((p) => p.side === 'south').every((p) => p.y < p.origin.y));

  for (const direction of ['down', 'left', 'right', 'up']) {
    await page.evaluate((d) => window.lyMacSauReview.setDirection(d), direction);
    await seek('sweep', 210);
    const sweep = (await snap()).nodes.find((n) => n.tag === 'duster_sweep_trail');
    assert(sweep);
    const delta = [sweep.x - 640, sweep.y - (452 - 22)];
    assert(direction === 'right' ? delta[0] > 0 : direction === 'left' ? delta[0] < 0 : direction === 'up' ? delta[1] < 0 : delta[1] > 0);
  }
  // Live requestAnimationFrame playback must advance all four palm cels, then return to idle.
  await page.evaluate(() => { window.lyMacSauReview.clearObserved(); window.lyMacSauReview.setMode('palm'); window.lyMacSauReview.pause(false); });
  await page.waitForTimeout(1450);
  await page.evaluate(() => window.lyMacSauReview.pause(true));
  const live = await page.evaluate(() => window.lyMacSauReview.observed());
  for (let i = 0; i < 4; i++) assert(live.some((frame) => frame.includes(`palm_channel_up_${i}`)));
  assert((await snap()).nodes.some((n) => n.package === 'boss' && n.tag === 'idle_up'));

  const liveActions = [];
  for (const [action, effect, duration] of [['basic', 'basic_hit', 1600], ['needle', 'needle_projectile', 1600], ['palm', 'palm_projectile', 1600], ['sweep', 'duster_sweep_trail', 1600], ['summon', 'co_mo_spawn', 2400], ['poison', 'ngu_doc_projectile', 1600]]) {
    await page.evaluate((m) => { window.lyMacSauReview.clearObserved(); window.lyMacSauReview.setMode(m); window.lyMacSauReview.pause(false); }, action);
    await page.waitForTimeout(duration);
    await page.evaluate(() => window.lyMacSauReview.pause(true));
    const drawn = await page.evaluate(() => window.lyMacSauReview.observed());
    for (let i = 0; i < 4; i++) assert(drawn.some((frame) => frame.endsWith(`/${effect}_${i}`)), `${action} live VFX cel ${i} was not drawn`);
    assert((await snap()).nodes.some((n) => n.package === 'boss' && n.tag === 'idle_up'));
    liveActions.push(action);
  }

  // Drive the visible controls, not only the review hooks.
  await page.locator('[data-mode="arena"]').click();
  await page.locator('#settings-toggle').click();
  await page.locator('#background').selectOption('tiles');
  await page.locator('#party').selectOption('1');
  await page.locator('#direction').selectOption('down');
  await page.locator('#settings-toggle').click();
  state = await snap();
  assert.equal(state.background, 'tiles'); assert.equal(state.party, 1);
  assert.equal(state.nodes.filter((n) => n.package === 'hero').length, 1);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#viewport').screenshot({ path: join(evidence, 'arena-separate-tiles-props.png') });
  await page.setViewportSize({ width: 900, height: 700 });
  const bounds = await page.locator('#viewport').boundingBox();
  for (const selector of ['.identity', '.top-actions', '#dock']) {
    const box = await page.locator(selector).boundingBox();
    assert(box.x >= bounds.x && box.y >= bounds.y && box.x + box.width <= bounds.x + bounds.width + 1 && box.y + box.height <= bounds.y + bounds.height + 1);
  }
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.equal(failedRequests.length, 0, failedRequests.join('\n'));
  report = { status: 'PASS', scope: 'standalone_Canvas2D_asset_viewer', authoredBossCelsDrawn: actorFrames.length, fourFacings: true, fixedBossFeet: [640, 452], liveFrameAdvanceAndReturnToIdle: true, liveActionsWithAllFourVfxCels: liveActions, screenshotSizes: ['1280x854 native logical pixels', '1440px target display'], purpleRadialProjectiles: 8, rangeObservedPx: 606, needleTargetCount: 1, needleDirectionLockedDuringKeyboardDodge: true, summons: 4, poisonProjectiles: 12, poisonSides: 4, frontalSweepDirections: 4, sixHeroScalePreview: true, alternateSeparableTilesProps: true, responsiveOverlays: true, offlineFileLoad: true, browserErrors: errors, failedRequests, phaserVerified: false, multiplayerVerified: false, directorApproved: false, recordingsCreated: false };
} catch (error) {
  await page.screenshot({ path: join(evidence, 'preview-failure.png') }).catch(() => {});
  report = { status: 'FAIL', error: String(error.stack ?? error), browserErrors: errors, failedRequests, phaserVerified: false, recordingsCreated: false };
  process.exitCode = 1;
} finally {
  await writeFile(join(here, 'browser_verification.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
console.log(JSON.stringify(report));
