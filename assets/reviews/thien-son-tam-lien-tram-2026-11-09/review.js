const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const controls = document.querySelector("#controls");
const selector = document.querySelector("#target");
const chargeLabel = document.querySelector("#charge");
const qte = document.querySelector("#qte");
const timerFill = qte.querySelector(".timer span");
const action = document.querySelector("#action");
const compare = document.querySelector("#compare");
const weapon = document.querySelector("#weapon");
const assetRoot = "../../exports/skills/thien-son/tam-lien-tram-2026-11-09/";
const exportUrl = (name) => assetRoot + name + ".png";

document.querySelector("#icon").src = exportUrl("hud-icon");
document.querySelector("#old-blade").src = exportUrl("blade-a");
document.querySelector("#new-blade").src = exportUrl("blade-polished");

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error("Không mở được " + src));
  img.src = src;
});

const hero = { x: 443, y: 325 };
const targets = {
  "boss-a": { x: 522, y: 322, group: "boss-a" },
  "boss-b": { x: 374, y: 319, group: "boss-b" },
  wave: { x: 516, y: 327, group: "creep" },
  dungeon: { x: 386, y: 325, group: "creep" },
};
const passes = [
  { from: [-138, -89], to: [138, 89], pose: 1 },
  { from: [138, -89], to: [-138, 89], pose: 2 },
  { from: [0, -105], to: [0, 105], pose: 3 },
];
const swingNames = ["Trái → phải", "Phải → trái", "Trên ↓ dưới"];
const swingStarts = [0, 58, 113, 235];
const impactAt = 84;
const readyMs = 2000;
const passMs = 174;
const dashMs = 148;
const motionMs = passMs * passes.length;
const settleMs = 770;
const sceneTime = () => performance.now();
const currentTarget = () => targets[selector.value];
const clamp = (n) => Math.max(0, Math.min(n, 1));
let charges = 0;
let readyUntil = 0;
let group = currentTarget().group;
let strikes = [];
let combo = null;
let strikeName = "";
let nameUntil = 0;
let impact = null;
let art;

function resetCharges() {
  charges = 0;
  readyUntil = 0;
}

function expireReady(now) {
  if (readyUntil && now >= readyUntil) resetCharges();
}

function showHit(now, target) {
  impact = { target, time: now };
  expireReady(now);
  if (readyUntil || combo) return;
  charges++;
  if (charges === 6) readyUntil = now + readyMs;
}

function swing(kind) {
  if (!art || combo || !weapon.hidden) return;
  const start = sceneTime();
  strikes.push({ kind, start, target: currentTarget(), connected: false });
  strikeName = swingNames[kind];
  nameUntil = start + 540;
}

function activate() {
  const now = sceneTime();
  expireReady(now);
  if (!readyUntil || combo || !weapon.hidden) return;
  resetCharges();
  combo = { target: currentTarget(), start: now };
  strikes = [];
}

function drawShadow(x, y, width, opacity = .27) {
  ctx.fillStyle = "rgba(10, 20, 19, " + opacity + ")";
  ctx.beginPath();
  ctx.ellipse(x, y - 1, width, 5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHero(row, column, x, y, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.drawImage(art.poses, column * 160, row * 144, 160, 144,
    Math.round(x - 80), Math.round(y - 112), 160, 144);
  ctx.globalAlpha = 1;
}

function drawTarget(target, now) {
  drawShadow(target.x, target.y, 23);
  ctx.drawImage(art.dummy, target.x - 22, target.y - 68);
  const flash = impact && impact.target === target && 1 - (now - impact.time) / 135;
  if (flash > 0) {
    ctx.globalAlpha = flash * .6;
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(art.dummy, target.x - 22, target.y - 68);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}

function drawSweep(strike, age) {
  if (age < impactAt || age >= 355) return;
  const reveal = clamp((age - impactAt) / 58);
  const fade = clamp((age - 182) / (355 - 182));
  const img = art.sweeps[strike.kind];
  const width = [158, 158, 116][strike.kind] + fade * 16;
  const height = width * img.height / img.width;
  const x = Math.round((hero.x + strike.target.x - width) / 2);
  const y = Math.round(hero.y - [42, 26, 53][strike.kind] + fade * 4 - height / 2);
  ctx.save();
  ctx.beginPath();
  if (strike.kind === 2) ctx.rect(x, y, width, height * reveal);
  else ctx.rect(x + (strike.kind === 1 ? width * (1 - reveal) : 0), y, width * reveal, height);
  ctx.clip();
  ctx.globalAlpha = (1 - fade) ** 1.3;
  ctx.translate(x, y);
  if (strike.kind === 0) {
    // The bright cutting edge leads on the upper-right side of the arc.
    ctx.translate(0, height);
    ctx.scale(1, -1);
  }
  ctx.drawImage(img, 0, 0, width, height);
  ctx.restore();
}

function dashPoint(target, pass, progress) {
  return {
    x: target.x + pass.from[0] + (pass.to[0] - pass.from[0]) * progress,
    y: target.y + pass.from[1] + (pass.to[1] - pass.from[1]) * progress,
  };
}

function drawPass(target, pass, age) {
  if (age <= 0) return;
  const progress = clamp(age / dashMs);
  const a = dashPoint(target, pass, 0);
  const b = dashPoint(target, pass, 1);
  const width = Math.hypot(b.x - a.x, b.y - a.y);
  const height = pass.pose === 3 ? 52 : 42;
  ctx.save();
  ctx.translate(a.x, a.y - 35);
  ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
  ctx.globalAlpha = clamp(1.19 - Math.max(0, age - 150) / 560);
  ctx.drawImage(art.wind, 0, -height / 2, width * progress, height);
  ctx.restore();
}

function drawCombo(now) {
  const { target, start } = combo;
  const age = now - start;
  const index = Math.min(passes.length - 1, Math.floor(age / passMs));
  const pass = passes[index];
  const elapsed = age - index * passMs;
  const progress = clamp(elapsed / dashMs);
  const pos = dashPoint(target, pass, progress);
  if (age < 190) drawHero(3, 0, hero.x, hero.y, .62 * (1 - age / 190));
  if (index > 0 && elapsed < 120) {
    const prev = passes[index - 1];
    const end = dashPoint(target, prev, 1);
    drawHero(3, prev.pose, end.x, end.y, .43 * (1 - elapsed / 120));
  }
  if (progress > .08 && progress < 1) {
    const echo = dashPoint(target, pass, Math.max(0, progress - .21));
    drawHero(3, pass.pose, echo.x, echo.y, .38);
  }
  const settle = clamp((age - motionMs) / (settleMs - motionMs));
  drawShadow(pos.x, pos.y, 19, .25 * (1 - settle));
  drawHero(3, pass.pose, pos.x, pos.y, 1 - settle);
  if (settle) drawHero(0, 3, hero.x, hero.y, settle);
  passes.forEach((line, i) => drawPass(target, line, age - i * passMs));
}

function drawScene(now) {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(art.ground, 1120, 878, 960, 540, 0, 0, 960, 540);
  ctx.fillStyle = "#203d3829";
  ctx.fillRect(0, 0, 960, 540);
  const target = currentTarget();
  drawTarget(target, now);
  if (combo) {
    drawCombo(now);
    return;
  }
  const strike = strikes.at(-1);
  const age = strike ? now - strike.start : Infinity;
  const frame = swingStarts.findLastIndex((start) => start <= age);
  drawShadow(hero.x, hero.y, 19);
  drawHero(strike?.kind ?? 0, frame, hero.x, hero.y);
  for (const active of strikes) drawSweep(active, now - active.start);
}

function drawHud(now) {
  qte.hidden = !readyUntil || !weapon.hidden;
  timerFill.style.transform = "scaleX(" + clamp((readyUntil - now) / readyMs) + ")";
  chargeLabel.textContent = charges + " / 6 tích điểm";
  action.hidden = !weapon.hidden || (!combo && now >= nameUntil);
  if (!action.hidden) action.textContent = combo ? "Tam Liên Trảm" : strikeName;
}

function tick(now) {
  expireReady(now);
  if (combo && now - combo.start >= settleMs) combo = null;
  for (const strike of strikes) {
    if (!strike.connected && now - strike.start >= impactAt) {
      strike.connected = true;
      if (strike.target === currentTarget()) showHit(now, strike.target);
    }
  }
  strikes = strikes.filter((strike) => now - strike.start < 355);
  drawScene(now);
  drawHud(now);
  requestAnimationFrame(tick);
}

for (const button of document.querySelectorAll("[data-swing]")) {
  button.addEventListener("click", () => swing(Number(button.dataset.swing)));
}
for (const button of document.querySelectorAll("[data-hit]")) {
  button.addEventListener("click", () => {
    if (!art || combo) return;
    const now = sceneTime();
    showHit(now, currentTarget());
    strikeName = button.textContent;
    nameUntil = now + 440;
  });
}
selector.addEventListener("change", () => {
  const target = currentTarget();
  if (target.group !== group) resetCharges();
  group = target.group;
});
qte.addEventListener("click", activate);
compare.addEventListener("click", () => {
  const showComparison = weapon.hidden;
  weapon.hidden = !showComparison;
  controls.hidden = showComparison;
  compare.setAttribute("aria-pressed", String(showComparison));
  compare.textContent = showComparison ? "Về sân tập" : "So sánh Hàn Nguyệt";
});
window.addEventListener("keydown", (event) => {
  if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
  if (event.code === "KeyA" || event.code === "KeyS") event.preventDefault();
  if (event.code === "KeyA") swing(Math.floor(Math.random() * swingNames.length));
  if (event.code === "KeyS") activate();
});

Promise.all([
  loadImage("../../exports/renovation-v2/arena-ground.png"),
  loadImage("../../exports/visual-improvement-approved/environment__chu__training_dummy.png"),
  loadImage(exportUrl("poses")),
  loadImage(exportUrl("peach-wind")),
  ...["sweep-right", "sweep-left", "sweep-down"].map((name) => loadImage(exportUrl(name))),
]).then(([ground, dummy, poses, wind, ...sweeps]) => {
  art = { ground, dummy, poses, wind, sweeps };
  requestAnimationFrame(tick);
}).catch((error) => {
  action.textContent = error.message;
  action.hidden = false;
});
