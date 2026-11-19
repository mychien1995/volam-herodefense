import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { waitForQa } from '../tools/qa-wait.mjs';
const session = JSON.parse(
  readFileSync('.cache/presentation-hero-play-session.json'),
);
const basic = process.env.VOLAM_HERO_REVIEW_BASIC ?? 'cai_bang_bong';
const school = basic.startsWith('vo_dang')
  ? 'vo_dang'
  : basic.startsWith('thien_son')
    ? 'thien_son'
    : 'cai_bang';
const texture =
  basic === 'cai_bang_chuong'
    ? 'cai-bang-chuong-unified'
    : 'hero-unified:' + basic;
const reviewProfileSuffix = process.env.VOLAM_HERO_REVIEW_PROFILE_SUFFIX ?? '';
if (reviewProfileSuffix && !/^[a-z0-9-]+$/.test(reviewProfileSuffix))
  throw Error('Invalid review profile suffix');
const browser = await chromium.launchPersistentContext(
  resolve(
    '.cache/presentation-hero-browser-' +
      basic +
      (reviewProfileSuffix ? '-' + reviewProfileSuffix : ''),
  ),
  {
    headless: false,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    viewport: null,
    args: ['--start-maximized'],
  },
);
const page = browser.pages()[0] ?? (await browser.newPage());
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const wait = (fn, label) => waitForQa(fn, label, { timeout: 120000 });
const snapshot = () => page.evaluate(() => window.__VOLAM__?.snapshot());
try {
  await page.goto(session.url);
  await page.locator('[data-action=play]').click();
  await page
    .locator('#pre-nickname')
    .fill(
      basic === 'vo_dang_quyen'
        ? 'Vo Dang Quyen'
        : basic === 'vo_dang_kiem'
          ? 'Vo Dang Kiem'
          : basic.startsWith('thien_son')
            ? basic.endsWith('phien')
              ? 'Thien Son Phien'
              : 'Thien Son Dao'
            : 'Bong Sprite Dong Nhat',
    );
  await page.getByRole('button', { name: 'Vào game', exact: true }).click();
  await page.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
  await wait(async () => (await snapshot())?.roomId, 'room join');
  await page.locator('#pregame [data-action=start]').click();
  await wait(
    async () => (await snapshot())?.state.phase === 'SCHOOL_SELECTION',
    'school phase',
  );
  await page.locator('#pregame [data-school="' + school + '"]').click();
  await wait(async () => {
    const s = await snapshot();
    return s.state.players[s.sessionId]?.schoolId === school;
  }, 'school ack');
  await page.locator('#pregame [data-branch="' + basic + '"]').click();
  await wait(async () => {
    const s = await snapshot();
    return s.state.players[s.sessionId]?.selectedBranch === basic;
  }, 'branch ack');
  await page.locator('#pregame [data-action=confirm]').click();
  await wait(async () => {
    const s = await snapshot();
    return (
      s.state.phase === 'IN_GAME' && s.state.players[s.sessionId]?.level === 30
    );
  }, 'level30 match');
  await wait(
    async () =>
      page.evaluate((texture) => {
        const api = window.__VOLAM__,
          s = api.snapshot();
        return (
          api.presentation()?.ready &&
          api
            .presentation()
            .actors.some((a) => a.id === s.sessionId && a.texture === texture)
        );
      }, texture),
    'coherent body ready',
  );
  const s = await snapshot(),
    h = s.state.players[s.sessionId],
    slots = [h.qSkill, h.wSkill, h.eSkill, h.rSkill, h.tSkill];
  assert.equal(h.basicId, basic);
  assert.ok(slots.every((id) => h.build.ranks[id] === 4));
  await page.locator('#game canvas').focus();
  for (const enabled of [false, true]) {
    await page.keyboard.press('F8');
    await wait(
      async () =>
        (await page.evaluate(
          () => window.__VOLAM__.presentation().worldDepth.enabled,
        )) === enabled,
      'F8 ' + enabled,
    );
  }
  assert.deepEqual(errors, []);
  await page.waitForTimeout(4200); // Let the normal level-up aura finish before the requested still PNG.
  await page.bringToFront();
  const out = resolve(
    process.env.VOLAM_HERO_REVIEW_EVIDENCE ??
      'docs/evidence/sessions/hero-coherence-batch1-delivery',
  );
  mkdirSync(out, { recursive: true });
  await page
    .locator('#viewport')
    .screenshot({ path: resolve(out, 'room-ready.png') });
  const info = {
    status: 'READY',
    url: page.url(),
    roomId: s.roomId,
    sessionId: s.sessionId,
    basic: h.basicId,
    level: h.level,
    slots,
    ranks: h.build.ranks,
    body: texture,
    f8: 'ON; keyboard toggle verified',
    errors,
  };
  writeFileSync(resolve(out, 'play-room.json'), JSON.stringify(info, null, 2));
  console.log('HERO_BROWSER_READY ' + JSON.stringify(info));
  const heartbeat = setInterval(async () => {
    try {
      const s = await snapshot();
      writeFileSync(
        '.cache/hero-review-live-' +
          basic +
          (reviewProfileSuffix ? '-' + reviewProfileSuffix : '') +
          '.json',
        JSON.stringify({
          phase: s?.state.phase,
          roomId: s?.roomId,
          basic,
          level: s?.state.players[s.sessionId]?.level,
          observedAt: new Date().toISOString(),
        }),
      );
    } catch {}
  }, 2000);
  heartbeat.unref();
  page.on('close', () => {
    if (!browser.pages().length) process.exit(0);
  });
} catch (error) {
  console.error(error);
  writeFileSync(
    '.cache/presentation-hero-browser-error.json',
    JSON.stringify({ error: String(error), errors }, null, 2),
  );
}
