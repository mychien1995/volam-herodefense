import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)),
  root = resolve(here, '../../../..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve(root, '.cache/ms-playwright');
const { chromium } = await import('@playwright/test');
const out = resolve(root, 'assets/reviews/skills/thieu-lam');
mkdirSync(out, { recursive: true });
const manifest = JSON.parse(
  readFileSync(
    resolve(
      root,
      'assets/exports/skills/thieu-lam/production_manifest_v01.json',
    ),
    'utf8',
  ),
);
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
};
const server = createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, 'http://localhost').pathname,
    );
    const p = resolve(root, '.' + pathname);
    if (!p.startsWith(root + sep)) throw Error('Path');
    res.setHeader(
      'Content-Type',
      mime[extname(p)] ?? 'application/octet-stream',
    );
    res.end(readFileSync(p));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const origin = 'http://127.0.0.1:' + server.address().port;
const errors = [],
  observations = [],
  seenTags = new Set();
let browser;
const assert = (v, message) => {
  if (!v) throw Error(message);
};
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  async function open(id, mode, d = 'right', terrain = 'arena') {
    await page.goto(
      `${origin}/assets/source/skills/thieu-lam/review.html?skill=${id}&mode=${mode}&direction=${d}&terrain=${terrain}`,
    );
    await page.waitForFunction(
      () => window.__THIEU_LAM_SKILL_REVIEW__?.ready,
      {},
      { timeout: 20000 },
    );
  }
  const snap = () =>
    page.evaluate(() => window.__THIEU_LAM_SKILL_REVIEW__.snapshot());
  async function time(t) {
    await page.evaluate((t) => window.__THIEU_LAM_SKILL_REVIEW__.setTime(t), t);
    return snap();
  }
  for (const entry of manifest.entries.filter((e) => e.kind === 'active')) {
    const folder = resolve(out, entry.id);
    mkdirSync(folder, { recursive: true });
    for (const mode of ['character', 'vfx']) {
      await open(entry.id, mode);
      const observed = new Map();
      let first;
      for (let i = 0; i < 65; i++) {
        const s = await snap();
        first ??= s;
        assert(s.errors.length === 0, s.errors.join(','));
        for (const a of s.sprites) {
          const key = a.asset + ':' + a.animation;
          const frames = observed.get(key) ?? new Set();
          for (const name of s.frameEvents[key] ?? []) frames.add(name);
          frames.add(a.frame);
          observed.set(key, frames);
          assert(
            JSON.stringify(a.anchor) === JSON.stringify(a.expectedAnchor),
            'Gallery anchor drift',
          );
        }
        await page.waitForTimeout(20);
      }
      for (const a of first.sprites) {
        const key = a.asset + ':' + a.animation;
        assert(
          observed.get(key).size === a.total,
          'Unobserved animation frames ' + key,
        );
        seenTags.add(key);
      }
      await page.screenshot({ path: resolve(folder, mode + '_1280x720.png') });
      observations.push({
        id: entry.id,
        mode,
        phaser: first.phaser,
        observed: Object.fromEntries(
          [...observed].map(([k, v]) => [k, [...v]]),
        ),
        galleryAnchorsStable: true,
        errors: first.errors,
      });
    }
    for (const direction of ['down', 'left', 'right', 'up']) {
      await open(entry.id, 'combined', direction);
      const samples = [];
      for (const t of [0, 120, 280, 450, 600, 760, 1000, 1400, 1800, 2250]) {
        const s = await time(t);
        assert(s.errors.length === 0, s.errors.join(','));
        for (const a of s.actors) {
          assert(
            JSON.stringify([a.x, a.y]) === JSON.stringify(a.expected),
            'Caster foot anchor drift',
          );
          assert(
            a.origin[0] === 0.5 && a.origin[1] === 0.8,
            'Character origin changed',
          );
        }
        samples.push({ t, actors: s.actors, effects: s.effects });
      }
      assert(
        samples.at(-1).effects.length === 0,
        'Persistent effects failed cleanup ' + entry.id,
      );
      const shot = 250;
      await time(shot);
      await page.screenshot({
        path: resolve(folder, 'combined_' + direction + '_1280x720.png'),
      });
      observations.push({
        id: entry.id,
        mode: 'combined',
        direction,
        samples,
        footAnchorsStable: true,
        cleanup: true,
        presentationOnly: true,
      });
    }
    for (const terrain of ['light', 'dark']) {
      await open(entry.id, 'combined', 'right', terrain);
      await time(250);
      await page.screenshot({
        path: resolve(folder, terrain + '_1280x720.png'),
      });
    }
    await open(entry.id, 'six');
    const six = await time(300);
    assert(
      six.actors.length === 6 && six.liveEffects >= 6,
      'Six simultaneous visible effects',
    );
    await page.screenshot({ path: resolve(folder, 'six_1280x720.png') });
    observations.push({
      id: entry.id,
      mode: 'six',
      actors: 6,
      effects: six.effects.length,
      presentationOnly: true,
    });
    console.log(
      'Verified ' +
        entry.id +
        ': all gallery frames, four facings/transitions/cleanup, light/dark and six-cast PNGs.',
    );
  }
  assert(
    seenTags.size ===
      manifest.assets.reduce((n, a) => n + a.animations.length, 0),
    'Not every exported tag observed',
  );

  const conditional = [];
  for (const id of ['vi_da_quyen', 'tru_ta', 'tam_gioi_quy_thien']) {
    await open(id, 'combined');
    await page.locator('#hit').uncheck();
    const no = await time(390);
    assert(
      !no.effects.some((e) => ['armor_break', 'slow'].includes(e.stage)),
      'Unconfirmed feedback ' + id,
    );
    await page.locator('#hit').check();
    const yes = await time(390);
    assert(
      yes.effects.some((e) => ['armor_break', 'slow'].includes(e.stage)),
      'Missing confirmed feedback ' + id,
    );
    conditional.push({ id, confirmedHitFeedbackOnly: true });
  }
  for (const id of ['dai_luc_kim_cuong_chuong', 'vo_anh_cuoc']) {
    await open(id, 'combined');
    const normal = await time(250);
    assert(
      normal.effects.some((e) => e.stage === 'release') &&
        !normal.effects.some((e) => e.stage.startsWith('empowered_')),
      'Normal finisher pairing',
    );
    await page.locator('#empowered').check();
    const powered = await time(250);
    assert(
      powered.effects.some((e) => e.stage === 'empowered_release') &&
        !powered.effects.some((e) => e.stage === 'release'),
      'Empowered finisher pairing',
    );
    await page.screenshot({
      path: resolve(out, id, 'empowered_right_1280x720.png'),
    });
    conditional.push({
      id,
      separateOptionalTargetSpecificPresentation: true,
      noComboEligibilityImplemented: true,
    });
  }
  await open('nhu_lai_thien_diep', 'combined');
  const paths = [];
  for (const t of [350, 450, 550]) {
    const p = (await time(t)).effects.find((e) => e.stage === 'travel');
    assert(p, 'Wave missing');
    paths.push(p);
  }
  assert(
    paths.every((p) => p.y === paths[0].y && p.rotation === 0),
    'Wave heading changed',
  );
  assert(
    paths[0].x < paths[1].x && paths[1].x < paths[2].x,
    'Wave failed straight travel',
  );
  await open('la_han_quyen', 'icons');
  await page.locator('#icons img').last().waitFor({ state: 'visible' });
  const icons = await page
    .locator('#icons article')
    .evaluateAll((items) =>
      items.map((e) => ({
        id: e.dataset.skill,
        images: [...e.querySelectorAll('img')].map((im) => ({
          src: im.getAttribute('src'),
          width: im.width,
          height: im.height,
          loaded: im.complete && im.naturalWidth === 64,
        })),
      })),
    );
  assert(
    icons.length === 14 &&
      icons.every((e) => e.images.every((im) => im.loaded)),
    'Icon coverage/load',
  );
  for (const e of icons)
    assert(
      e.images.every(
        (im) =>
          im.src === '/' + manifest.entries.find((a) => a.id === e.id).icon,
      ),
      'Icon pairing ' + e.id,
    );
  await page.screenshot({ path: resolve(out, 'icons_hud_1280x720.png') });
  const approvedBasicReuse = [];
  for (const [id, texture] of [
    ['la_han_quyen', 'hero_thieu_lam'],
    ['tru_ta', 'hero_thieu_lam_dao'],
  ]) {
    for (const d of ['down', 'left', 'right', 'up']) {
      await open(id, 'basic', d);
      const frames = [];
      for (const t of [0, 80, 160, 240, 500]) {
        const a = await time(t);
        assert(a.liveEffects === 0, 'Unapproved normal VFX');
        assert(
          a.actors[0].texture === texture,
          'Approved basic texture replaced',
        );
        frames.push(a.actors[0].frame);
      }
      assert(
        new Set(frames.slice(0, 4)).size === 4 && frames[4].startsWith('idle_'),
        'Approved normal clip/recovery failed',
      );
      approvedBasicReuse.push({ id, d, texture, frames });
      if (d === 'right')
        await page.screenshot({
          path: resolve(out, id + '_approved_basic_1280x720.png'),
        });
    }
  }
  await open('dich_can_kinh', 'combined');
  await time(700);
  assert(
    (await snap()).liveEffects === 0,
    'Passive gained unauthorized world aura',
  );
  await page.screenshot({
    path: resolve(out, 'dich_can_kinh_passive_1280x720.png'),
  });
  assert(errors.length === 0, errors.join('\n'));
  const report = {
    status: 'PASS',
    phaser: (await snap()).phaser,
    scope:
      'Actual isolated Phaser preview. No gameplay integration or independent director review.',
    approvalGate: 'approval gate waived by user',
    logicalCanvas: [640, 360],
    displayCanvas: [1280, 720],
    exportedAnimationTagsObserved: seenTags.size,
    allFramesObserved: true,
    approvedBasicReuse,
    conditional,
    straightWavePath: paths,
    icons,
    observations,
    errors,
    recordingsGenerated: false,
  };
  writeFileSync(
    resolve(out, 'phaser_verification_v01.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  await context.close();
  console.log(
    'PASS: ' +
      seenTags.size +
      ' animation tags/all frames;14 icons; four facings; timing/cleanup; six simultaneous effects; no recordings.',
  );
} finally {
  await browser?.close();
  await new Promise((ok) => server.close(ok));
}
