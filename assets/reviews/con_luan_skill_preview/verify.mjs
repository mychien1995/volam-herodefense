import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const base = process.argv[3] ?? "http://127.0.0.1:5599";
const playwright = process.argv[2] ?? path.resolve(here, "../../../node_modules/playwright/index.mjs");
const { chromium } = await import(pathToFileURL(playwright));
const browser = await chromium.launch({
  channel: "msedge", headless:true, args:["--use-angle=swiftshader","--enable-unsafe-swiftshader"],
});
const folder = path.join(here,"evidence-v02");
await mkdir(folder,{recursive:true});
const errors = [];
const snapshots = {};
const data = (page) => page.evaluate(() => window.conLuanReview.snapshot());
const wait = (page,event) => page.waitForFunction((name) =>
  window.conLuanReview.snapshot().log.some((entry) => entry.event === name), event);
const ready = (page) => page.waitForFunction(() => !window.conLuanReview.snapshot().busy);
const quiet = (page) => page.waitForFunction(() => !window.conLuanReview.snapshot().effects.length);
const cast = async (page,key) => { await ready(page); await page.keyboard.press(key); };

async function picture(page, frame, filename) {
  const content = await page.evaluate(async (frame) => {
    const visible = () => window.conLuanReview.snapshot().effects.includes(frame);
    const canvas = document.querySelector("canvas");
    const check = document.createElement("canvas");
    check.width = check.height = 1;
    const ctx = check.getContext("2d");
    const deadline = performance.now()+9000;
    let previousFrameVisible = false;
    while (performance.now()<deadline) {
      await new Promise((resolve)=>requestAnimationFrame(resolve));
      const currentFrameVisible = visible();
      if (previousFrameVisible && currentFrameVisible) {
        ctx.drawImage(canvas,160,100,1,1,0,0,1,1);
        if (ctx.getImageData(0,0,1,1).data[3]) return canvas.toDataURL();
      }
      previousFrameVisible = currentFrameVisible;
    }
    throw new Error(`Could not capture rendered frame ${frame}`);
  }, frame);
  await writeFile(path.join(folder,filename),Buffer.from(content.split(",")[1],"base64"));
}

async function open(branch) {
  const context = await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
  const page = await context.newPage();
  page.setDefaultTimeout(11000);
  page.on("pageerror",(error)=>errors.push(error.message));
  page.on("console",(message)=>{if (message.type()==="error") errors.push(message.text());});
  page.on("response",(response)=>{if(!response.ok()) errors.push(response.url()+": "+response.status());});
  await page.goto(base+"/?phai="+branch);
  await page.waitForFunction(() => Boolean(window.conLuanReview));
  const s = await data(page);
  assert.deepEqual(s.feet,[112,132]);
  assert.equal(s.zoom,1);
  assert.equal(s.phaser,"4.2.1");
  return {context,page};
}

try {
  {
    const {context,page} = await open("thien-su");
    await cast(page,"p");
    await picture(page,"gold_ember_0","thien-su-passive.png");
    for (let i=0;i<4;i++) await cast(page,"a");
    await ready(page);
    await cast(page,"q");
    await page.waitForFunction(()=>window.conLuanReview.snapshot().ranged);
    await cast(page,"a");
    await picture(page,"bolt_1","thien-su-ranged.png");
    await cast(page,"w");
    await picture(page,"gold_burst_1","thien-su-w.png");
    await cast(page,"e");
    await picture(page,"gold_ring_fade_0","thien-su-e.png");
    const ring = (await data(page)).log.find((entry)=>entry.event==="ring_extent");
    assert(Math.abs(ring.scale/2.45-1.2)<1e-9);
    assert.equal(ring.radius,300);
    await cast(page,"r");
    await picture(page,"hammer_right_0","thien-su-r.png");
    await quiet(page);
    await cast(page,"t");
    await page.waitForFunction(() => window.conLuanReview.snapshot().texture === "thien_su_extra");
    await page.screenshot({path:path.join(folder,"thien-su-t.png")});
    for (const [key,dir,offset] of [["ArrowRight","right",-37],["ArrowLeft","left",37],
      ["ArrowDown","down",-4],["ArrowUp","up",-23]]) {
      await page.keyboard.down(key);
      await page.waitForFunction((dir)=>window.conLuanReview.snapshot().frame==="chaos_"+dir+"_0",dir);
      await page.keyboard.up(key);
      const {x,y,aura} = await data(page);
      assert(aura.visible);
      assert.equal(aura.x,Math.round(x)+offset);
      assert.equal(aura.y,Math.round(y)-59);
    }
    await page.waitForFunction(() => !window.conLuanReview.snapshot().chaos);
    await quiet(page);
    const s = await data(page);
    const tags = s.log.filter((v)=>v.event==="fx").map((v)=>v.tag);
    for (const expected of ["trail_thrust_right","trail_sweep_right","trail_rising_right","trail_overhead_right",
      "slam","bolt","gold_burst","gold_stagger","gold_ring","gold_ring_fade","hammer_right"]) assert(tags.includes(expected),expected);
    assert(s.log.some((v)=>v.event==="chaos"&&!v.active));
    snapshots.thienSu=s;
    await context.close();
  }
  {
    const {context,page} = await open("kiem-ton");
    await cast(page,"r");
    await picture(page,"dragon_head_0","kiem-ton-r.png");
    await picture(page,"violet_stagger_0","kiem-ton-r-impact.png");
    await quiet(page);
    for (const [key,dir] of [["ArrowDown","down"],["ArrowLeft","left"],["ArrowUp","up"],["ArrowRight","right"]]) {
      await page.keyboard.down(key);
      await page.waitForFunction((dir) => {
        const s=window.conLuanReview.snapshot();
        return s.facing===dir && s.log.some((v)=>v.event==="frame"&&v.frame==="walk_"+dir+"_3");
      },dir);
      await page.keyboard.up(key);
      await page.waitForFunction((dir)=>window.conLuanReview.snapshot().frame==="idle_"+dir+"_0",dir);
      const s=await data(page);
      assert(s.blade.visible);
      assert.equal(s.blade.angle,0);
      if (dir==="left") assert(s.blade.x>s.x);
      if (dir==="right") assert(s.blade.x<s.x);
    }
    await page.screenshot({path:path.join(folder,"kiem-ton-idle.png")});
    await cast(page,"p");
    await picture(page,"violet_stagger_0","kiem-ton-passive.png");
    for (let i=0;i<7;i++) await cast(page,"a");
    await picture(page,"blade_0","kiem-ton-a.png");
    let s=await data(page);
    assert.deepEqual(s.log.filter((v)=>v.event==="basic").map((v)=>v.finisher),
      [false,false,false,false,false,false,true]);
    await cast(page,"s");
    await ready(page);
    const fieldX = (await data(page)).log.find((entry)=>entry.tag==="field").x;
    await page.keyboard.down("ArrowLeft");
    await page.waitForFunction((x)=>window.conLuanReview.snapshot().x < x-115,fieldX);
    await page.keyboard.up("ArrowLeft");
    await page.keyboard.down("ArrowRight");
    await page.waitForFunction(()=>window.conLuanReview.snapshot().facing==="right");
    await page.keyboard.up("ArrowRight");
    await cast(page,"w");
    await picture(page,"dash_0","kiem-ton-w.png");
    await wait(page,"dash_reset");
    await ready(page);
    assert((await data(page)).readyW);
    const afterDash = (await data(page)).x;
    await page.keyboard.down("ArrowRight");
    await page.waitForFunction((x)=>window.conLuanReview.snapshot().x>x+92,afterDash);
    await page.keyboard.up("ArrowRight");
    await cast(page,"s");
    await ready(page);
    const moveAway=(await data(page)).x;
    await page.keyboard.down("ArrowRight");
    await page.waitForFunction((x)=>window.conLuanReview.snapshot().x>x+100,moveAway);
    await page.keyboard.up("ArrowRight");
    const beforeMove=(await data(page)).y;
    await page.keyboard.down("ArrowUp");
    await page.waitForFunction((y)=>window.conLuanReview.snapshot().y<y-96,beforeMove);
    await page.keyboard.up("ArrowUp");
    await cast(page,"s");
    await ready(page);
    s=await data(page);
    assert.equal(s.planted,3);
    assert.equal(s.plantCharges,0);
    await page.screenshot({path:path.join(folder,"kiem-ton-s.png")});
    await cast(page,"q");
    await wait(page,"detonate");
    await picture(page,"violet_bolt_0","kiem-ton-q.png");
    s=await data(page);
    assert.equal(s.log.find((v)=>v.event==="detonate").count,3);
    assert.equal(s.planted,0);
    await page.keyboard.down("ArrowRight");
    await page.waitForFunction(()=>window.conLuanReview.snapshot().facing==="right");
    await page.keyboard.up("ArrowRight");
    await cast(page,"e");
    await wait(page,"fan");
    await picture(page,"blade_0","kiem-ton-e.png");
    await ready(page);
    const {x,y} = await data(page);
    await cast(page,"t");
    await wait(page,"star");
    s=await data(page);
    const star=s.log.find((v)=>v.event==="star");
    assert.equal(star.anchors,5);
    assert.equal(star.edges,5);
    assert.deepEqual(star.center,{x,y});
    const area = Math.abs(star.points.reduce((sum,p,i) => {
      const q=star.points[(i+1)%star.points.length];
      return sum + (p.x-x)*(q.y-y) - (q.x-x)*(p.y-y);
    },0))/2;
    const oldArea = 5*138*88*Math.sin(2*Math.PI/5)/2;
    assert(Math.abs(area/oldArea-1.2)<1e-9);
    assert.equal(s.log.find((v)=>v.event==="fan").degrees,90);
    await picture(page,"violet_bolt_0","kiem-ton-t-impact.png");
    await page.waitForFunction(()=>!window.conLuanReview.snapshot().effects.includes("violet_bolt_0"));
    await picture(page,"edge_0","kiem-ton-t.png");
    await ready(page);
    await page.keyboard.down("ArrowRight");
    await page.waitForFunction((x)=>window.conLuanReview.snapshot().x>x+100,x);
    await page.keyboard.up("ArrowRight");
    await page.waitForFunction(()=>window.conLuanReview.snapshot().log.some((v)=>v.event==="star_pulse"&&v.beat===4));
    s=await data(page);
    assert.equal(s.effects.filter((frame)=>frame==="edge_0").length,5);
    assert.equal(s.effects.filter((frame)=>frame==="anchor_0").length,5);
    assert.deepEqual(s.log.find((v)=>v.event==="star").center,{x,y});
    await picture(page,"edge_0","kiem-ton-t-active.png");
    await wait(page,"star_end");
    await quiet(page);
    s=await data(page);
    const pulses=s.log.filter((v)=>v.event==="star_pulse");
    assert.deepEqual(pulses.map((v)=>v.beat),[0,1,2,3,4]);
    const end=s.log.find((v)=>v.event==="star_end").at;
    assert(end-star.at>=4970&&end-star.at<=5070,`Active duration: ${end-star.at}ms`);
    snapshots.kiemTon=s;
    await context.close();
  }
  assert.deepEqual(errors,[]);
  await writeFile(path.join(folder,"phaser-observations.json"),JSON.stringify({
    previewOnly:true, browser:"Edge", renderer:"Phaser 4.2.1", snapshots, errors,
  },null,2)+"\n");
  console.log("PASS: both branches, 4 Chaos aura alignments, 20% wider ring, 4 Kiếm Tôn facings, 6 orbs + blade, 3 plant/detonate, dash reset, 90° fan, dragon head and centered 5-point star with 20% more area and 5s active phase.");
} catch(error) {
  console.error("Browser errors:", errors);
  throw error;
} finally {
  await browser.close();
}
