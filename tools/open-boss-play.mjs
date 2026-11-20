import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { waitForQa } from './qa-wait.mjs';
const session = JSON.parse(
  readFileSync('.cache/presentation-boss-play-session.json', 'utf8'),
);
const context = await chromium.launchPersistentContext(
  resolve('.cache/boss-review-browser-' + session.runId),
  {
    headless: false,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    viewport: null,
    args: ['--start-maximized'],
  },
);
const page = context.pages()[0] ?? (await context.newPage()),
  errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const state = () => page.evaluate(() => window.__VOLAM__?.snapshot());
const wait = (fn, label) => waitForQa(fn, label, { timeout: 120000 });
await page.goto(session.url);
await page.locator('[data-action=play]').click();
await page.locator('#pre-nickname').fill('Boss Sprite Review');
await page.getByRole('button', { name: 'Vào game', exact: true }).click();
await page.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
await wait(async () => (await state())?.roomId, 'room joined');
await page.locator('#pregame [data-action=start]').click();
await wait(
  async () => (await state())?.state.phase === 'SCHOOL_SELECTION',
  'school phase',
);
await page.locator('#pregame [data-school=cai_bang]').click();
await wait(async () => {
  const s = await state();
  return s.state.players[s.sessionId]?.schoolId === 'cai_bang';
}, 'school ack');
await page.locator('#pregame [data-branch=cai_bang_chuong]').click();
await wait(async () => {
  const s = await state();
  return s.state.players[s.sessionId]?.selectedBranch === 'cai_bang_chuong';
}, 'branch ack');
await page.locator('#pregame [data-action=confirm]').click();
await wait(async () => {
  const s = await state();
  return (
    s?.state.phase === 'IN_GAME' && s.state.players[s.sessionId]?.level === 30
  );
}, 'level30 match');
await wait(
  async () =>
    page.evaluate(
      (id) =>
        window.__VOLAM__
          .presentation()
          ?.renovation.bodies.some(
            (b) =>
              b.id === id && b.visible && b.texture === 'boss-unified:' + id,
          ),
      session.boss,
    ),
  'coherent boss',
);
const s = await state(),
  h = s.state.players[s.sessionId];
assert.ok(
  [h.qSkill, h.wSkill, h.eSkill, h.rSkill, h.tSkill].every(
    (id) => h.build.ranks[id] === 4,
  ),
);
const selectorSmoke = [];
if (process.env.VOLAM_BOSS_REVIEW_SWITCH_SMOKE === '1') {
  for (const id of ['kim_luan', session.boss]) {
    const response = await page.request.post(
      session.clientUrl + '/__boss-review',
      {
        headers: { 'x-review-run': session.runId },
        data: { roomId: s.roomId, id },
      },
    );
    assert.ok(response.ok(), await response.text());
    await wait(
      async () =>
        page.evaluate(
          (id) =>
            window.__VOLAM__
              .presentation()
              .renovation.bodies.some(
                (b) =>
                  b.id === id &&
                  b.visible &&
                  b.texture === 'boss-unified:' + id,
              ),
          id,
        ),
      'review selector native renderer ' + id,
    );
    selectorSmoke.push({
      id,
      server: await response.json(),
      renderer: 'canonical visible',
    });
  }
}
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
await page.waitForTimeout(4500);
await page.bringToFront();
const out = resolve(
  process.env.VOLAM_BOSS_REVIEW_EVIDENCE ??
    'docs/evidence/sessions/boss-play-review',
);
mkdirSync(out, { recursive: true });
await page
  .locator('#viewport')
  .screenshot({ path: resolve(out, 'playable.png') });
assert.deepEqual(errors, []);
writeFileSync(
  resolve(out, 'verification.json'),
  JSON.stringify(
    {
      status: 'PASS',
      roomId: s.roomId,
      boss: session.boss,
      level: h.level,
      basic: h.basicId,
      ranks: h.build.ranks,
      url: session.url,
      scope:
        'headful native AI review, invulnerable level30 fixture; F8 off/on; no balance claim',
      errors,
      selectorSmoke,
    },
    null,
    2,
  ),
);
console.log(
  'BOSS_BROWSER_READY ' +
    JSON.stringify({ url: session.url, roomId: s.roomId, boss: session.boss }),
);
await new Promise((resolve) => context.once('close', resolve));
