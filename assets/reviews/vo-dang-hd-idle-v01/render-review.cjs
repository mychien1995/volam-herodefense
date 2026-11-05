const { readFileSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { createRequire } = require('node:module');
const assert = require('node:assert/strict');

const repo = resolve(process.argv[2] || join(__dirname, '../../..'));
const deps = resolve(process.argv[3] || repo);
const fromRepo = createRequire(join(deps, 'package.json'));
const { chromium } = fromRepo('@playwright/test');
const phaser = join(deps, 'apps/game-client/node_modules/phaser/dist/phaser.js');
const dataUrl = (file) => 'data:image/png;base64,' + readFileSync(file).toString('base64');

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.VOLAM_REVIEW_CHROMIUM, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1340, height: 544 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.setContent(
      '<meta charset=utf-8><style>' +
        'body{margin:0;background:#191615;color:#f1e6cd;font-family:system-ui,sans-serif}' +
        'main{width:1304px;margin:16px auto 0}h1{font-size:21px;margin:0 0 12px;letter-spacing:.02em}' +
        '.labels{display:grid;grid-template-columns:640px 640px;gap:24px;margin-bottom:8px;font-size:15px}' +
        'strong{color:#f4cf7f}canvas{display:block;image-rendering:pixelated}' +
        'p{font-size:13px;color:#c8bda8;margin:9px 0 0}</style>' +
        '<main><h1>Võ Đang · Kiếm · Đứng hướng xuống</h1>' +
        '<div class="labels"><strong>Hiện tại · 44 px gốc × 2</strong>' +
        '<strong>Ứng viên · 88 px gốc × 1</strong></div><div id="review"></div>' +
        '<p>Hai thân nhân vật cùng cao 88 px trên màn hình. Nền trích từ ảnh tham chiếu Lôi Đài.</p></main>',
    );
    await page.addScriptTag({ path: phaser });
    const images = {
      arena: dataUrl(join(repo, 'assets/references/arena_battle_reference.png')),
      baseline: dataUrl(join(repo, 'assets/exports/characters/vo_dang_v01/kiem/frames/idle_down_0.png')),
      candidate: dataUrl(join(__dirname, 'vo-dang-kiem-idle-down.png')),
    };
    await page.evaluate((sources) => {
      class Review extends Phaser.Scene {
        preload() {
          for (const [id, url] of Object.entries(sources)) this.load.image(id, url);
        }
        create() {
          const panelWidth = 640;
          const panelHeight = 420;
          const panelStep = 664;
          const floor = this.textures.get('arena');
          floor.add('court', 0, 530, 198, panelWidth, panelHeight);
          this.cameras.main.roundPixels = true;
          const entries = [
            { id: 'baseline', scale: 2, pivot: [48, 64], body: 44 },
            { id: 'candidate', scale: 1, pivot: [96, 128], body: 88 },
          ];
          const comparison = entries.map(({ id, scale, pivot, body }, index) => {
            const panelX = index * panelStep;
            this.add.image(panelX, 0, 'arena', 'court').setOrigin(0);
            const image = this.add.image(panelX + 325, 265, id).setScale(scale);
            image.setOrigin(pivot[0] / image.width, pivot[1] / image.height);
            image.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
            return {
              id,
              texture: [image.width, image.height],
              pivot,
              scale,
              displayedBodyHeight: body * scale,
              panelFeet: [image.x - panelX, image.y],
            };
          });
          this.game.events.once('postrender', () => {
            window.review = {
              phaser: Phaser.VERSION,
              renderer: this.game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas',
              canvas: [this.game.canvas.width, this.game.canvas.height],
              devicePixelRatio: devicePixelRatio,
              backgroundCrop: [530, 198, panelWidth, panelHeight],
              comparison,
            };
          });
        }
      }
      new Phaser.Game({
        type: Phaser.WEBGL,
        width: 1304,
        height: 420,
        parent: 'review',
        backgroundColor: '#191615',
        render: { pixelArt: true, roundPixels: true, antialias: false, antialiasGL: false },
        audio: { noAudio: true },
        scene: Review,
      });
    }, images);
    await page.waitForFunction(() => window.review);
    const report = await page.evaluate(() => window.review);
    assert.equal(report.phaser, '4.2.1');
    assert.equal(report.renderer, 'WebGL');
    assert.equal(report.devicePixelRatio, 1);
    assert.deepEqual(report.comparison.map((item) => item.texture), [[96, 80], [192, 160]]);
    assert.deepEqual(report.comparison.map((item) => item.displayedBodyHeight), [88, 88]);
    assert.deepEqual(report.comparison[0].panelFeet, report.comparison[1].panelFeet);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: join(__dirname, 'so-sanh-loi-dai.png') });
    writeFileSync(join(__dirname, 'phaser-review.json'), JSON.stringify({ ...report, errors }, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

