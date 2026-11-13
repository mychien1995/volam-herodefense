import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const folder = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(folder, "../../..");
const playwright = process.argv[2] ?? path.join(root, "node_modules/playwright/index.mjs");
const base = process.argv[3] ?? "http://127.0.0.1:5597";
const { chromium } = await import(pathToFileURL(playwright).href);
const browser = await chromium.launch({
  channel: "msedge", headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const atlas = JSON.parse(await readFile(path.join(root,
  "assets/exports/characters/con_luan_thien_su_v02/hero_con_luan_thien_su.json"), "utf8"));
const snapshot = (page) => page.evaluate(() => window.thienSuReview.snapshot());
const evidence = path.join(folder, "evidence-v02");
await mkdir(evidence, { recursive: true });
const errors = [];
const directions = { down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp" };
const outcomes = [];

try {
  for (const [direction, key] of Object.entries(directions)) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.setDefaultTimeout(9000);
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("favicon")) errors.push(message.text());
    });
    page.on("response", (response) => {
      if (!response.ok() && !response.url().endsWith("/favicon.ico")) errors.push(response.url() + ": " + response.status());
    });
    await page.goto(base);
    await page.waitForFunction(() => Boolean(window.thienSuReview));
    await page.locator("canvas").click();
    const before = await snapshot(page);
    if (direction === "down") await page.screenshot({ path: path.join(evidence, "idle-arena.png") });

    await page.keyboard.down(key);
    await page.waitForFunction((d) => window.thienSuReview.snapshot().log.some(
      (entry) => entry.event === "loop" && entry.key === "walk_" + d), direction);
    await page.keyboard.up(key);
    await page.waitForFunction((d) => window.thienSuReview.snapshot().key === "idle_" + d, direction);
    await page.waitForFunction((d) => window.thienSuReview.snapshot().log.some(
      (entry) => entry.event === "loop" && entry.key === "idle_" + d), direction);
    const afterWalk = await snapshot(page);
    assert.notDeepEqual([afterWalk.x, afterWalk.y], [before.x, before.y]);

    for (let strike = 1; strike <= 4; strike++) {
      const expected = "melee_" + strike + "_" + direction;
      await page.keyboard.press("a");
      if (direction === "right" && strike === 4) {
        const capture = await page.waitForFunction(() => {
          if (!window.thienSuReview.snapshot().effects.some((entry) => entry.frame === "slam_1")) return false;
          return document.querySelector("canvas").toDataURL();
        });
        const png = await capture.jsonValue();
        await writeFile(path.join(evidence, "melee-slam.png"), Buffer.from(png.split(",")[1], "base64"));
      }
      await page.waitForFunction((key) => window.thienSuReview.snapshot().log.some(
        (entry) => entry.event === "complete" && entry.key === key), expected);
    }
    await page.keyboard.press("q");
    await page.waitForFunction(() => window.thienSuReview.snapshot().log.filter(
      (entry) => entry.event === "effect" && entry.key === "coil").length >= 4);
    await page.keyboard.press("a");
    if (direction === "right") {
      // Read the canvas in the same animation-frame callback that observes the bolt.
      const image = await page.waitForFunction(() => {
        if (!window.thienSuReview.snapshot().effects.some((entry) => entry.frame === "bolt_1")) return false;
        return document.querySelector("canvas").toDataURL();
      });
      const png = await image.jsonValue();
      await writeFile(path.join(evidence, "ranged-hit.png"), Buffer.from(png.split(",")[1], "base64"));
    }
    await page.waitForFunction((d) => window.thienSuReview.snapshot().log.some(
      (entry) => entry.event === "complete" && entry.key === "ranged_" + d), direction);
    await page.waitForFunction(() => window.thienSuReview.snapshot().effects.length === 0);
    await page.keyboard.press("q");
    await page.waitForFunction(() => !window.thienSuReview.snapshot().coil);

    const after = await snapshot(page);
    assert.equal(after.phaser, "4.2.1");
    assert.equal(after.zoom, 1);
    assert.equal(after.scale, 1);
    assert.deepEqual(after.feet, [112, 132]);
    assert.equal(after.facing, direction);
    assert.equal(after.key, "idle_" + direction);
    assert.equal(after.effects.length, 0);
    const bolt = after.log.find((entry) => entry.event === "bolt");
    assert.equal(bolt.y, bolt.targetFoot - 42);
    assert.equal(bolt.x, bolt.targetX - 4);
    const slam = after.log.find((entry) => entry.event === "slam");
    assert.equal(slam.frame, "melee_4_" + direction + "_1");
    const effectFrames = new Set(after.log.filter((entry) => entry.event === "effect").map((entry) => entry.frame));
    const trails = ["thrust", "sweep", "rising", "overhead"].map((beat) => "trail_" + beat + "_" + direction);
    for (const effect of ["bolt", "coil", "slam", ...trails]) {
      for (let index = 0; index < 4; index++) assert(effectFrames.has(effect + "_" + index), effect);
    }
    assert.equal(bolt.frame, "ranged_" + direction + "_1");
    const clips = {};
    for (const name of ["idle", "walk", "melee_1", "melee_2", "melee_3", "melee_4", "ranged"]) {
      const tag = name + "_" + direction;
      const expected = Object.keys(atlas.frames).filter((frame) => frame.startsWith(tag + "_"));
      const entries = after.log.filter((entry) => entry.key === tag);
      const frames = [...new Set(entries.map((entry) => entry.frame).filter(Boolean))];
      assert.deepEqual(frames.slice().sort(), expected.slice().sort());
      assert.deepEqual(frames, expected);
      const complete = entries.find((entry) => entry.event === "complete");
      const durationMs = expected.reduce((total, frame) => total + atlas.frames[frame].duration, 0);
      if (complete) assert(complete.elapsed >= durationMs - 30 && complete.elapsed < durationMs + 500,
        tag + " elapsed " + complete.elapsed + " expected " + durationMs);
      clips[tag] = { frames, durationMs, elapsedMs: complete?.elapsed ?? null,
        loop: entries.some((entry) => entry.event === "loop") };
    }
    outcomes.push({ direction, clips, bolt, slam, effects: [...effectFrames], walkFrom: [before.x, before.y],
      walkTo: [afterWalk.x, afterWalk.y], scale: after.scale, zoom: after.zoom, pivot: after.feet });
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(path.join(evidence, "phaser-observations.json"),
    JSON.stringify({ renderer: "Phaser 4.2.1 / Microsoft Edge", previewOnly: true, errors, outcomes }, null, 2) + "\n");
  console.log("PASS: 4 directions, 28 tags / 88 body frames, input transitions, violet trails, slam, and torso strike cleanup.");
} finally {
  await browser.close();
}
