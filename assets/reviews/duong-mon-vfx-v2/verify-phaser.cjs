const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const { chromium } = require(process.argv[2] || "@playwright/test");
const phaser = process.argv[3] || path.join(__dirname, "../../../apps/game-client/node_modules/phaser/dist/phaser.js");
const sheets = ["tuan-sa-walk", "da-hanh-walk", "tuan-sa-action", "da-hanh-action",
  "tuan-sa-vertical", "da-hanh-vertical", "vfx", "co-quan-effects"];
const url = file => pathToFileURL(path.join(__dirname, file)).href;
const imageData = file => "data:image/png;base64," + fs.readFileSync(path.join(__dirname, file)).toString("base64");
const sources = Object.fromEntries([...sheets, "arena", "wall", "pillar", "tree", "rocks", "bush", "dummy"].map(id =>
  [id, imageData("art/" + id + ".png")]));
const atlases = Object.fromEntries(sheets.map(id =>
  [id, JSON.parse(fs.readFileSync(path.join(__dirname, "art", id + ".json"), "utf8"))]));
const oldAtlas = imageData("../duong-mon-vfx/tuan-sa-walk.png");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", msg => { if (msg.type() === "error" || msg.type() === "warning") errors.push(msg.text()); });
    await page.goto(url("index.html"));
    await page.addScriptTag({ path: phaser });
    await page.evaluate(async ({ sources, atlases, oldAtlas }) => {
      const loaded = await Promise.all(Object.entries({ ...sources, oldAtlas }).map(async ([id, url]) => {
        const image = new Image();
        image.src = url;
        await image.decode();
        return [id, image];
      }));
      const mount = document.createElement("div");
      document.body.replaceChildren(mount);
      const observed = new Set();
      const walk = [];
      const config = {
        type: Phaser.CANVAS, width: 1280, height: 720, parent: mount, antialias: true,
        banner: false, audio: { noAudio: true },
        scene: {
          create() {
            for (const [id, image] of loaded) {
              if (atlases[id]) {
                const atlas = this.textures.addAtlas(id, image, atlases[id]);
                for (const [name, data] of Object.entries(atlases[id].frames)) {
                  const frame = atlas.get(name);
                  if (frame.name !== name || frame.cutWidth !== data.frame.w || frame.cutHeight !== data.frame.h) {
                    throw new Error("Bad atlas frame " + id + "/" + name);
                  }
                }
              } else if (id !== "oldAtlas") {
                this.textures.addImage(id, image);
              }
            }
            this.add.image(0, 0, "arena").setOrigin(0).setDisplaySize(1280, 720);
            const facings = ["down", "left", "right", "up"];
            for (const [row, id] of ["tuan-sa", "da-hanh"].entries()) {
              for (const [col, facing] of facings.entries()) {
                const sheet = id + "-walk";
                const key = id + "/" + facing;
                this.anims.create({ key, repeat: -1, frameRate: 10,
                  frames: ["step-a", "idle", "step-b", "idle"].map(pose => ({ key: sheet, frame: pose + "-" + facing })) });
                const sprite = this.add.sprite(314 + col * 200, 350 + 205 * row, sheet, "idle-" + facing)
                  .setOrigin(0.5, 200 / 240);
                sprite.on("animationupdate", (_anim, frame) => observed.add(key + ":" + frame.frame.name));
                sprite.play(key);
                walk.push(sprite);
              }
            }
            const arrow = this.add.image(604, 399, "vfx", "water").setDepth(5);
            this.tweens.add({ targets: arrow, x: 990, duration: 630, repeat: 0, onComplete: () => arrow.destroy() });
            for (const [row, name] of ["earth", "wood", "water", "metal", "fire"].entries()) {
              this.add.image(1035 + Math.sin(row * Math.PI / 4) * 85, 305 + row * 23, "vfx", name)
                .setRotation((row - 2) * 0.23);
            }
            window.phaserReview = () => ({
              version: Phaser.VERSION, size: [this.game.canvas.width, this.game.canvas.height],
              frames: [...observed].sort(), atlases: Object.keys(atlases).length,
              arrowCleanedUp: !arrow.active, origins: walk.map(sprite => sprite.displayOriginY),
            });

            const images = Object.fromEntries(loaded);
            const compare = document.createElement("canvas");
            compare.width = 448;
            compare.height = 212;
            const context = compare.getContext("2d");
            const old = images.oldAtlas;
            const fresh = images["tuan-sa-walk"];
            for (const x of [0, 224]) {
              context.drawImage(images.arena, 280, 300, 224, 212, x, 0, 224, 212);
              context.fillStyle = "#1b2634";
              context.fillRect(x, 0, 224, 28);
            }
            context.fillStyle = "#fff1dc";
            context.font = "600 14px Segoe UI";
            context.fillText("V1 · 52 px, phóng 2×", 12, 19);
            context.fillText("V2 · 104 px gốc", 236, 19);
            context.imageSmoothingEnabled = false;
            context.drawImage(old, 0, 0, 120, 120, -8, -28, 240, 240);
            context.imageSmoothingEnabled = true;
            context.drawImage(fresh, 0, 0, 240, 240, 216, -28, 240, 240);
            window.equalScaleComparison = compare.toDataURL("image/png");
          },
        },
      };
      new Phaser.Game(config);
    }, { sources, atlases, oldAtlas });
    await page.waitForFunction(() => typeof window.phaserReview === "function" &&
      window.phaserReview().frames.length === 24 && window.phaserReview().arrowCleanedUp, undefined, { timeout: 7000 })
      .catch(async error => {
        const state = await page.evaluate(() => window.phaserReview?.());
        throw new Error(JSON.stringify({ errors, state }), { cause: error });
      });
    const observed = await page.evaluate(() => window.phaserReview());
    assert.equal(observed.version, "4.2.1");
    assert.deepEqual(observed.size, [1280, 720]);
    assert.equal(observed.atlases, 8);
    assert.ok(observed.origins.every(y => y === 200));
    assert.deepEqual(errors, []);
    const comparison = await page.evaluate(() => window.equalScaleComparison);
    fs.writeFileSync(path.join(__dirname, "compare-at-104px.png"), Buffer.from(comparison.split(",")[1], "base64"));
    fs.writeFileSync(path.join(__dirname, "phaser-check.json"), JSON.stringify(observed, null, 2) + "\n");
    console.log("Phaser " + observed.version + ": eight atlases, 24 observed walk/idle frames, 200-px origin, projectile cleanup and native 1280x720.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
