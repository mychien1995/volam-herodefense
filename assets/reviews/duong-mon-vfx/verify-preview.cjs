const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const { chromium } = require(process.argv[2] || "@playwright/test");
const folder = __dirname;
const url = new URL(pathToFileURL(path.join(folder, "index.html")));
url.searchParams.set("inspect", "");

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(url.href);
    await page.waitForFunction(() => typeof window.previewSnapshot === "function");
    const snapshot = () => page.evaluate(() => window.previewSnapshot());
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
      await page.keyboard.up(key);
      await wait(direction => window.previewSnapshot().frame.endsWith("idle-" + direction), facing);
    };
    const directions = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    const walk = async () => {
      for (const [key, facing] of Object.entries(directions)) await move(key, facing);
      await reset();
    };

    await walk();
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
    await observe("Tụ lực");
    await observe("Tên xuyên nhanh");
    assert.deepEqual((await snapshot()).shots.map(x => x.type), ["arrow"]);
    await finish();

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
    await wait(() => window.previewSnapshot().flowers === 8);
    await observe("Hoa báo nổ");
    await observe("Hoa cùng nổ");
    assert.equal((await snapshot()).flowers, 0);
    await page.screenshot({ path: path.join(folder, "tuan-sa-t.png") });
    await finish();
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
        await wait(time => window.previewSnapshot().time >= time + 190, start);
        await page.screenshot({ path: path.join(folder, "da-hanh-r4.png") });
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
    await page.screenshot({ path: path.join(folder, "tuan-sa-bay.png") });
    await page.setViewportSize({ width: 720, height: 530 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 720);
    assert.deepEqual(errors, []);
    console.log("Chromium offline: two heroes × four facings; all casts; R0–R4; flight toggle; guard lock; parallel Q; 9/90/25 volleys; zero console errors.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
