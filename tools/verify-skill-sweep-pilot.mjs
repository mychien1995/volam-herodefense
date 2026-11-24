import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { qaBrowserEnvironment } from './qa-preflight.mjs';
import { startQaStatic } from './qa-static.mjs';
Object.assign(process.env, qaBrowserEnvironment());
const { chromium } = await import('@playwright/test');
const folder =
  process.env.VOLAM_HAMMER_PILOT_OUT ??
  'docs/evidence/skill-revise-sweep-v03/pilot';
await mkdir(folder, { recursive: true });
const direction = process.env.VOLAM_HAMMER_PILOT_DIRECTION ?? 'down';
const close = await startQaStatic({
  script: 'assets/reviews/skill-revise-v01/serve.mjs',
  port: 5612,
  environment: { SKILL_REVISE_REVIEW_PORT: '5612' },
  directory: folder,
});
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
  });
  await page.goto('http://127.0.0.1:5612/health');
  await page.addScriptTag({ url: 'http://127.0.0.1:5612/phaser.js' });
  const root =
    'assets/exports/' +
    (process.env.VOLAM_HAMMER_PILOT_BANK ?? 'skill-revise-sweep-v03/sweep-v3') +
    '/';
  const png =
    'data:image/png;base64,' +
    (await readFile(root + 'body.png')).toString('base64');
  const atlas = JSON.parse(await readFile(root + 'body.json', 'utf8'));
  const idleRoot =
    'assets/exports/skill-revise-feedback-v04/hammer-coherent-v4/';
  const idlePng =
      'data:image/png;base64,' +
      (await readFile(idleRoot + 'body.png')).toString('base64'),
    idleAtlas = JSON.parse(await readFile(idleRoot + 'body.json', 'utf8'));
  await page.evaluate(
    ({ png, atlas, direction, idlePng, idleAtlas }) => {
      document.body.style.margin = '0';
      document.body.replaceChildren();
      new Phaser.Game({
        type: Phaser.AUTO,
        width: 1366,
        height: 768,
        audio: { noAudio: true },
        scene: {
          preload() {
            this.load.image('ground', '/ground.png');
            this.load.atlas('idle', idlePng, idleAtlas);
            this.load.atlas('sweep', png, atlas);
          },
          create() {
            this.add.image(683, 384, 'ground').setDisplaySize(3072, 2048);
            this.add
              .image(470, 450, 'idle', 'idle_0_' + direction)
              .setOrigin(0.5, 320 / 448)
              .setScale(0.5);
            this.add
              .image(640, 450, 'idle', 'thrust_3_' + direction)
              .setOrigin(0.5, 320 / 448)
              .setScale(0.5);
            const actor = this.add
              .sprite(810, 450, 'sweep', 'sweep_0_' + direction)
              .setOrigin(0.5, 320 / 448)
              .setScale(0.5);
            this.add.text(425, 490, 'Idle giữ nguyên', {
              fontSize: '15px',
              color: '#fff',
            });
            this.add.text(595, 490, 'Chọc giữ nguyên', {
              fontSize: '15px',
              color: '#fff',
            });
            this.add.text(755, 490, 'Quạt mới', {
              fontSize: '15px',
              color: '#fff',
            });
            this.anims.create({
              key: 'sweep',
              frames: Array.from({ length: 6 }, (_, i) => ({
                key: 'sweep',
                frame: 'sweep_' + i + '_' + direction,
              })),
              frameRate: 10,
              repeat: -1,
            });
            actor.play('sweep');
            const history = [];
            this.game.events.on('postrender', () => {
              if (history.at(-1) !== actor.frame.name)
                history.push(actor.frame.name);
            });
            window.__SWEEP_PILOT__ = {
              ready: true,
              history,
              pause: () => actor.anims.pause(),
              resume: () => actor.anims.resume(),
              zoom: (value) => {
                this.cameras.main.setZoom(value);
                this.cameras.main.centerOn(650, 420);
              },
            };
          },
        },
      });
    },
    { png, atlas, direction, idlePng, idleAtlas },
  );
  await page.waitForFunction(
    () => new Set(window.__SWEEP_PILOT__?.history).size === 6,
  );
  await page.waitForFunction(
    (expected) => window.__SWEEP_PILOT__.history.at(-1) === expected,
    'sweep_3_' + direction,
  );
  await page.evaluate(() => window.__SWEEP_PILOT__.pause());
  await page.screenshot({ path: folder + '/native.png' });
  await page.evaluate(() => window.__SWEEP_PILOT__.zoom(2));
  await page.screenshot({ path: folder + '/inspection.png' });
  await writeFile(
    folder + '/observations.json',
    JSON.stringify(
      {
        status: 'PASS',
        direction,
        scope:
          'Representative sweep beside exact retained idle/thrust, actual rendered frames at scale .5 / camera1 before bulk',
        frames: await page.evaluate(() => window.__SWEEP_PILOT__.history),
      },
      null,
      2,
    ),
  );
  console.log('Pilot rendered all six sweep frames at native scale');
} finally {
  await browser?.close();
  await close();
}
