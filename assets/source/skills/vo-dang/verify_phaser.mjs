import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)),
  root = resolve(here, '../../../..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve(root, '.cache/ms-playwright');
const { chromium } = await import('@playwright/test');
const out = resolve(root, 'assets/reviews/skills/vo-dang');
mkdirSync(out, { recursive: true });
const manifest = JSON.parse(
  readFileSync(
    resolve(root, 'assets/exports/skills/vo-dang/production_manifest_v01.json'),
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
      `${origin}/assets/source/skills/vo-dang/review.html?skill=${id}&mode=${mode}&direction=${d}&terrain=${terrain}`,
    );
    await page.waitForFunction(
      () => window.__VO_DANG_SKILL_REVIEW__?.ready,
      {},
      { timeout: 20000 },
    );
  }
  const snap = () =>
    page.evaluate(() => window.__VO_DANG_SKILL_REVIEW__.snapshot());
  async function time(t) {
    await page.evaluate((t) => window.__VO_DANG_SKILL_REVIEW__.setTime(t), t);
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
      const shot =
        entry.id === 'toa_sat_bac_do'
          ? 580
          : ['thai_cuc_tran', 'bat_quai_kiem_tran'].includes(entry.id)
            ? 850
            : entry.id === 'thai_cuc_than_cong'
              ? 760
              : entry.id === 'van_kiem_quy_tong'
                ? 640
                : entry.id === 'nhan_kiem_hop_nhat'
                  ? 620
                  : 300;
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
      await time(760);
      await page.screenshot({
        path: resolve(folder, terrain + '_1280x720.png'),
      });
    }
    await open(entry.id, 'six');
    const six = await time(
      ['thai_cuc_tran', 'bat_quai_kiem_tran', 'thai_cuc_than_cong'].includes(
        entry.id,
      )
        ? 850
        : entry.id === 'toa_sat_bac_do'
          ? 580
          : 560,
    );
    assert(six.actors.length === 6, 'Six-cast composition');
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
  // Success-only return and conditional counter/absorption must be separate display stages.
  const conditional = [];
  for (const [id, stage, t] of [
    ['duong_khi_kich', 'mana_return', 500],
    ['toa_sat_bac_do', 'counter', 580],
    ['thai_cuc_than_cong', 'absorption', 760],
  ]) {
    await open(id, 'combined');
    await page.locator('#hit').uncheck();
    const no = await time(t);
    assert(
      !no.effects.some((e) => e.stage === stage),
      'False hit/counter effect ' + id,
    );
    await page.locator('#hit').check();
    const yes = await time(t);
    assert(
      yes.effects.some((e) => e.stage === stage),
      'Missing hit/counter effect ' + id,
    );
    conditional.push({ id, stage, onConfirmedPreviewTriggerOnly: true });
  }
  await open('nhan_kiem_hop_nhat', 'combined');
  const paths = [];
  for (const t of [350, 450, 550]) {
    const s = await time(t);
    const p = s.effects.find((e) => e.stage === 'travel');
    assert(p, 'Projectile missing');
    paths.push(p);
  }
  assert(
    paths.every((p) => p.y === paths[0].y && p.rotation === paths[0].rotation),
    'Projectile changed heading',
  );
  assert(
    paths[0].x < paths[1].x && paths[1].x < paths[2].x,
    'Projectile not travelling',
  );
  await open('van_kiem_quy_tong', 'combined');
  const waveA = (await time(550)).effects.filter((e) => e.stage === 'travel'),
    waveB = (await time(650)).effects.filter((e) => e.stage === 'travel');
  assert(
    waveA.length === 3 && waveB.length === 3,
    'Frontal preview wave count',
  );
  for (let i = 0; i < 3; i++) {
    assert(waveA[i].rotation === waveB[i].rotation, 'Wave heading changed');
    assert(waveB[i].x > waveA[i].x, 'Wave not moving forward');
  }
  await open('luong_nghi_thu', 'icons');
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
    icons.length === 13 &&
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
  for (const id of ['vo_dang_quyen', 'vo_dang_kiem', 'thai_cuc_tam_phap']) {
    await open(id, 'combined');
    if (id === 'vo_dang_kiem') await page.locator('#qi').check();
    await time(320);
    await page.screenshot({ path: resolve(out, id + '_1280x720.png') });
    if (id === 'thai_cuc_tam_phap')
      assert(
        (await snap()).liveEffects === 0,
        'Unapproved passive world effect',
      );
  }
  assert(errors.length === 0, errors.join('\n'));
  const report = {
    status: 'PASS',
    phaser: '4.2.1',
    scope:
      'Actual isolated Phaser rendering, no gameplay integration or final art approval.',
    logicalCanvas: [640, 360],
    displayCanvas: [1280, 720],
    exportedAnimationTagsObserved: seenTags.size,
    allFramesObserved: true,
    conditional,
    straightProjectilePath: paths,
    frontalWavesStraight: true,
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
      ' animation tags / all frames;13 icon pairings; conditional feedback; straight projectiles; cleanup. No recordings.',
  );
} finally {
  await browser?.close();
  await new Promise((ok) => server.close(ok));
}
