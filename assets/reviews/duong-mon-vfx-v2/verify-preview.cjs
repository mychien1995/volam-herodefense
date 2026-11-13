const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const folder = __dirname;
const url = new URL(pathToFileURL(path.join(folder, "index.html")));
url.searchParams.set("inspect", "");

async function verify(page, entry = url.href, evidence = folder) {
    const usingPhaser = entry.startsWith('http');
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(entry);
    await page.waitForFunction(() => typeof window.previewSnapshot === "function");
    assert.deepEqual(await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      return [canvas.width, canvas.height, canvas.clientWidth, canvas.clientHeight];
    }), [1280, 720, 1280, 720]);
    const snapshot = () => page.evaluate(() => window.previewSnapshot());
    if (usingPhaser) {
      const { canvas } = await snapshot();
      assert.equal(canvas.phaser, "4.2.1");
      assert.equal(canvas.atlasCount, 8);
      assert.equal(canvas.propsLoaded, true);
      assert.equal(canvas.sprite.sourceWidth, 240);
      assert.equal(canvas.sprite.originY, 200);
      assert.equal(canvas.sprite.scale, 1);
    }
    const wait = (condition, arg) => page.waitForFunction(condition, arg, { timeout: 6500 });
    const finish = () => wait(() => !window.previewSnapshot().cast);
    const press = async key => { await page.keyboard.press(key); };
    const reset = async () => { await page.locator("#reset").click(); };
    const observe = value => wait(text => window.previewSnapshot().phases.some(phase => phase.includes(text)), value);
    const move = async (key, facing) => {
      const before = await snapshot();
      await page.keyboard.down(key);
      await wait(({ facing, x, y }) => {
        const state = window.previewSnapshot();
        return state.facing === facing && Math.hypot(state.x - x, state.y - y) > 9 &&
          state.frame.includes("step-") && state.frame.endsWith(facing);
      }, { facing, x: before.x, y: before.y });
      if (usingPhaser) {
        const { canvas, frame } = await snapshot();
        assert.equal(canvas.sprite.frame, frame.split("/")[1]);
        assert.equal(canvas.sprite.originY, 200);
      }
      await page.keyboard.up(key);
      await wait(direction => window.previewSnapshot().frame.endsWith("idle-" + direction), facing);
    };
    const directions = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    const walk = async () => {
      for (const [key, facing] of Object.entries(directions)) await move(key, facing);
      await reset();
    };

    await walk();
    await page.screenshot({ path: path.join(evidence, "arena-native.png") });
    await press("a");
    await observe("Bắn tên");
    assert.deepEqual((await snapshot()).shots.map(x => x.type), ["arrow"]);
    await finish();
    await press("w");
    await finish();
    assert.equal((await snapshot()).flight, true);
    await press("a");
    await observe("Vẩy lông thép");
    assert.deepEqual((await snapshot()).shots.map(x => x.type), ["feather"]);
    await finish();
    await press("q");
    await observe("Ba đường tên");
    const lanes = (await snapshot()).shots;
    assert.equal(lanes.length, 3);
    assert.equal(new Set(lanes.map(lane => lane.angle)).size, 1);
    assert.equal(new Set(lanes.map(lane => lane.y)).size, 3);
    await finish();
    await press("w");
    await finish();
    assert.equal((await snapshot()).flight, false);
    await page.locator("[data-action=e]").click();
    await observe("Tụ sáng ở cơ quan");
    await wait(() => window.previewSnapshot().laser?.length > 300);
    const beam = (await snapshot()).laser;
    assert.equal(beam.angle, 0);
    assert.equal(beam.contacts.length, 1);
    assert.deepEqual((await snapshot()).shots, []);
    await page.screenshot({ path: path.join(evidence, "tuan-sa-e-laze.png"), timeout: 2000 });
    await finish();
    assert.equal((await snapshot()).laser, null);

    await move("ArrowUp", "up");
    await press("e");
    await wait(() => window.previewSnapshot().laser?.angle === -Math.PI / 2);
    const upward = (await snapshot()).laser;
    assert.ok(Math.abs(upward.length - upward.y) < 0.01);
    await finish();
    await reset();

    await press("r");
    await observe("Bọc giáp");
    const shell = await snapshot();
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(150);
    await page.keyboard.up("ArrowRight");
    assert.equal((await snapshot()).x, shell.x);
    assert.match((await snapshot()).frame, /\/shell$/);
    await finish();

    await press("t");
    await wait(() => window.previewSnapshot().flowers === 20);
    const positions = (await snapshot()).flowerPositions;
    assert.equal(new Set(positions.map(({x, y}) => x + "/" + y)).size, 20);
    const bounds = axis => Math.max(...positions.map(p => p[axis])) - Math.min(...positions.map(p => p[axis]));
    assert.ok(bounds("x") > 210 && bounds("y") > 131);
    await observe("Hoa báo nổ");
    await page.screenshot({ path: path.join(evidence, "tuan-sa-t-rai-hoa.png"), timeout: 2000 });
    await wait(() => window.previewSnapshot().bursts.length === 20);
    const burst = await snapshot();
    assert.equal(burst.flowers, 0);
    assert.deepEqual(burst.bursts.map(({x, y}) => ({x, y})), positions);
    assert.equal(burst.bursts.reduce((sum, item) => sum + item.needles, 0), 220);
    await wait(time => window.previewSnapshot().time >= time + 230, burst.time);
    await page.screenshot({ path: path.join(evidence, "tuan-sa-t-no-kim.png"), timeout: 2000 });
    await finish();
    assert.equal((await snapshot()).bursts.length, 0);

    await press("t");
    await wait(() => window.previewSnapshot().flowers === 20);
    assert.notDeepEqual((await snapshot()).flowerPositions, positions);
    await reset();
    assert.equal((await snapshot()).flowers, 0);
    assert.equal((await snapshot()).bursts.length, 0);
    await press("p");
    await observe("Hồi mana");
    await observe("Hồi máu");
    await observe("Chớp chí mạng");
    await finish();
    await press("Shift");
    await observe("Trụ chân");
    assert.ok((await snapshot()).x > 275);
    await finish();

    await page.locator("[data-branch=da]").click();
    assert.equal((await snapshot()).branch, "da");
    await walk();
    const elements = ["water", "wood", "metal", "earth", "fire"];
    for (let rank = 0; rank <= 4; rank++) {
      await page.locator("[data-rank='" + rank + "']").click();
      await press(rank === 4 ? "r" : "a");
      await wait(count => window.previewSnapshot().shots.length === count, rank + 1);
      const { shots } = await snapshot();
      assert.deepEqual(shots.map(x => x.type), elements.slice(0, rank + 1));
      assert.equal(shots[0].angle, 0);
      assert.equal(new Set(shots.map(shot => shot.angle)).size, rank + 1);
      assert.equal(new Set(shots.map(shot => shot.x + "/" + shot.y)).size, 1);
      if (rank === 4) {
        const start = (await snapshot()).time;
        await wait(time => window.previewSnapshot().time >= time + 135, start);
        await page.screenshot({ path: path.join(evidence, "da-hanh-r4.png") });
      }
      await finish();
    }
    await move("ArrowUp", "up");
    await press("a");
    await wait(() => window.previewSnapshot().shots.length === 5);
    assert.equal((await snapshot()).shots[0].angle, -Math.PI / 2);
    assert.match((await snapshot()).frame, /vertical\/release-up$/);
    await finish();
    await reset();
    await press("q");
    await wait(() => window.previewSnapshot().traps === 1);
    await observe("Bia bước vào");
    await observe("choáng diện rộng");
    await finish();
    await press("w");
    await wait(() => window.previewSnapshot().shots.length === 6);
    assert.equal(new Set((await snapshot()).shots.map(shot => shot.angle)).size, 1);
    await finish();

    await press("e");
    await observe("Lướt · miễn sát thương");
    await observe("Miễn sát thương · 2 giây");
    assert.ok((await snapshot()).x >= 330);
    await finish();

    await reset();
    await press("t");
    await observe("I · 9 phi đao");
    assert.equal((await snapshot()).shots.length, 9);
    await observe("II · 90 phi đao độc");
    await wait(() => window.previewSnapshot().shots.length === 99);
    await observe("III · Quạt kim châm");
    assert.equal((await snapshot()).shots.length, 124);
    await finish();
    await press("Shift");
    await observe("Trụ chân");
    await finish();
    await press("p");
    await observe("Chớp chí mạng");
    await finish();

    await page.locator("[data-branch=tuan]").click();
    await page.locator("#speed").click();
    assert.equal(await page.locator("#speed").textContent(), "½×");
    await press("w");
    await observe("Hoành Không · Bay");
    await page.screenshot({ path: path.join(evidence, "tuan-sa-bay.png") });
    await page.setViewportSize({ width: 720, height: 530 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 720);
    await wait(() => window.previewSnapshot().canvas.width === 720);
    if (usingPhaser) {
      assert.equal((await snapshot()).canvas.height, 530);
      assert.equal(await page.locator("canvas").evaluate(node => node.clientWidth), 720);
    }
    assert.deepEqual(errors, []);
    console.log("Chrome: both branches, four facings, all casts, R0–R4, E laser, 20 flowers / 220 needles, no console errors.");
}

module.exports = { verify };

if (require.main === module) {
  const { chromium } = require(process.argv[2] || "@playwright/test");
  (async () => {
    const browser = await chromium.launch({ headless: true, channel: "chrome" });
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      await verify(page);
    } finally {
      await browser.close();
    }
  })().catch(error => { console.error(error); process.exitCode = 1; });
}
