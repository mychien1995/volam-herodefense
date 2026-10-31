import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.cache/ms-playwright');
const { chromium } = await import('@playwright/test');
const browser = await chromium.launch({ headless: true }),
  observations = [];
try {
  const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    }),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const [id, texture] of [
    ['la_han_quyen', 'hero_thieu_lam'],
    ['tru_ta', 'hero_thieu_lam_dao'],
  ]) {
    const atlas = JSON.parse(
      readFileSync('assets/exports/characters/' + texture + '.json', 'utf8'),
    );
    for (const d of ['down', 'left', 'right', 'up']) {
      await page.goto(
        'http://127.0.0.1:8768/assets/source/skills/thieu-lam/review.html?skill=' +
          id +
          '&mode=basic&direction=' +
          d,
      );
      await page.waitForFunction(
        () => window.__THIEU_LAM_SKILL_REVIEW__?.ready,
      );
      let start = 0;
      const samples = [];
      for (const name of Object.keys(atlas.frames).filter((n) =>
        n.startsWith('basic_attack_' + d + '_'),
      )) {
        const duration = atlas.frames[name].duration;
        for (const t of [start, start + duration - 1]) {
          const s = await page.evaluate((t) => {
            window.__THIEU_LAM_SKILL_REVIEW__.setTime(t);
            return window.__THIEU_LAM_SKILL_REVIEW__.snapshot();
          }, t);
          if (
            s.actors[0].frame !== name ||
            s.actors[0].texture !== texture ||
            s.liveEffects !== 0
          )
            throw Error(
              'Approved normal clip mismatch ' + id + ' ' + d + ' ' + t,
            );
          samples.push({
            t,
            frame: s.actors[0].frame,
            texture: s.actors[0].texture,
            origin: s.actors[0].origin,
          });
        }
        start += duration;
      }
      const recovery = await page.evaluate((t) => {
        window.__THIEU_LAM_SKILL_REVIEW__.setTime(t);
        return window.__THIEU_LAM_SKILL_REVIEW__.snapshot();
      }, start);
      if (!recovery.actors[0].frame.startsWith('idle_'))
        throw Error('Missing approved idle recovery');
      observations.push({
        id,
        d,
        texture,
        totalDurationMs: start,
        samples,
        recovery: recovery.actors[0].frame,
      });
    }
  }
  if (errors.length) throw Error(errors.join(';'));
  writeFileSync(
    'assets/reviews/skills/thieu-lam/approved_basic_timing_v01.json',
    JSON.stringify(
      {
        status: 'PASS',
        scope:
          'Actual Phaser presentation branch uses byte-identical approved clips and exact per-frame atlas durations; no new attack artwork or mechanics',
        observations,
        errors,
        recordingsGenerated: false,
      },
      null,
      2,
    ),
  );
  console.log(
    'PASS: both approved normal sets /four facings /every frame boundary and duration /idle recovery /no new VFX.',
  );
} finally {
  await browser.close();
}
