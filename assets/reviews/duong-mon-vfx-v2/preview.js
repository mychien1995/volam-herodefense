(() => {
  "use strict";

  const canvas = document.querySelector("#world");
  const phaser = window.duongMonPhaser;
  const ctx = phaser ? null : canvas.getContext("2d", { alpha: false });
  const frameData = phaser?.frames ?? FRAMES;
  const coQuanFx = phaser?.coQuanFx ?? CO_QUAN_FX;
  const phaseLabel = document.querySelector("#phase");
  const actions = document.querySelector("#actions");
  const rankButtons = [...document.querySelectorAll("[data-rank]")];
  const width = 640;
  const height = 360;
  const images = {};
  const coQuanEffects = "co-quan-effects";
  const sheets = { ...frameData.sheets, [coQuanEffects]: { frames: coQuanFx.names } };
  const frameIndexes = Object.fromEntries(Object.entries(sheets).map(([sheet, data]) =>
    [sheet, Object.fromEntries(data.frames.map((name, i) => [name, i]))]));

  const branches = {
    tuan: {
      art: "tuan-sa",
      name: "Tuần sa",
      skills: { a: "Đánh thường", q: "Truy Tâm Tụ Tiễn", w: "Thiết Dực Hoành Không", e: "Lưu Tinh Trục Nguyệt",
        r: "Thiên Cơ Thiết Dực", t: "Mãn Thiên Hoa Vũ", shift: "Lướt", p: "Tứ tuyệt khí" },
    },
    da: {
      art: "da-hanh",
      name: "Dạ hành",
      skills: { a: "Đánh thường", q: "Địa Diệm Hỏa", w: "Cửu Cung Phi Tinh", e: "Nhiếp Hồn Nguyệt Ảnh",
        r: "Ngũ hành cách thể thuật", t: "Bạo vũ lê hoa châm", shift: "Lướt", p: "Tứ tuyệt khí" },
    },
  };
  const axes = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
  const directions = { ArrowRight: "right", ArrowDown: "down", ArrowLeft: "left", ArrowUp: "up" };
  const ranks = [["water", 0], ["wood", -0.23], ["metal", 0.23], ["earth", -0.47], ["fire", 0.47]];
  const targets = [
    { x: 406, y: 179 }, { x: 467, y: 138 }, { x: 485, y: 222 },
  ];
  const scenery = [
    ["wall", 149, 94, 125], ["pillar", 506, 102, 39], ["tree", 75, 192, 98],
    ["rocks", 589, 155, 51], ["bush", 99, 270, 32], ["rocks", 66, 288, 46],
    ["pillar", 570, 282, 36], ["bush", 547, 255, 32], ["bush", 468, 104, 22],
  ];
  const laserTiming = { fire: 420, fade: 220, reach: 355 };
  const flowerTiming = { scatter: 290, warn: 820, explode: 1540, count: 20 };
  const arrowKeys = new Set();
  const player = { x: 246, y: 179, facing: "right", walkTime: 0, moving: false };
  const world = { branch: "tuan", rank: 4, time: 0, rate: 1, flight: false, cast: null, shots: [], motes: [],
    flowers: [], bursts: [], laser: null, traps: [], afterimages: [], nextFlightMote: 0, lastShot: [],
    castCounts: {}, phaseHistory: [], frame: "" };
  let view = { scale: 2, x: 0, y: 0 };
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  let nextTarget = 0;
  let previousTime = 0;

  function loadImage(key, url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { images[key] = img; resolve(); };
      img.onerror = () => reject(new Error("Không tải được " + url));
      img.src = url;
    });
  }

  function fitCanvas() {
    const bounds = canvas.getBoundingClientRect();
    const density = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(bounds.width * density));
    canvas.height = Math.max(1, Math.round(bounds.height * density));
    const scale = Math.min(canvas.width / width, canvas.height / height);
    view = { scale, x: (canvas.width - width * scale) / 2, y: (canvas.height - height * scale) / 2 };
  }

  function drawArena() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const arena = images.arena;
    if (view.x > 0.5 || view.y > 0.5) {
      const fill = Math.max(canvas.width / arena.width, canvas.height / arena.height);
      ctx.drawImage(arena, (canvas.width - arena.width * fill) / 2,
        (canvas.height - arena.height * fill) / 2, arena.width * fill, arena.height * fill);
      ctx.fillStyle = "#17151bb0";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    ctx.drawImage(arena, 0, 0, width, height);
  }

  function frame(sheet, name, x, y, { angle = 0, flip = false, alpha = 1, scale = 1, stretch = 1 } = {}) {
    if (phaser) {
      phaser.frame(sheet, name, x, y, { angle, flip, alpha, scale, stretch });
      return;
    }
    const index = frameIndexes[sheet][name];
    if (index === undefined) throw new Error(sheet + " / " + name);
    const cell = frameData.cell;
    const [ax, ay] = sheet === "vfx" || sheet === coQuanEffects ? [cell / 2, cell / 2] : frameData.pivot;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (angle) ctx.rotate(angle);
    ctx.scale((flip ? -scale : scale) * stretch / frameData.density, scale / frameData.density);
    ctx.drawImage(images[sheet], index % 4 * cell, Math.floor(index / 4) * cell, cell, cell, -ax, -ay, cell, cell);
    ctx.restore();
  }

  function groundProp(id, x, y, w) {
    if (phaser) {
      phaser.prop(id, x, y, w);
      return;
    }
    const img = images[id];
    const h = Math.round(img.height / img.width * w);
    ctx.drawImage(img, x - w / 2, y - h, w, h);
  }

  function announce(text) {
    if (phaseLabel.textContent === text) return;
    phaseLabel.textContent = text;
    world.phaseHistory.push(text);
    if (world.phaseHistory.length > 32) world.phaseHistory.shift();
  }

  function setRank(rank) {
    world.rank = rank;
    for (const button of rankButtons) button.setAttribute("aria-pressed", Number(button.dataset.rank) === rank);
  }

  function reset() {
    Object.assign(player, { x: 246, y: 179, facing: "right", walkTime: 0, moving: false });
    Object.assign(world, { cast: null, flight: false, shots: [], motes: [], flowers: [], bursts: [], laser: null, traps: [], afterimages: [],
      lastShot: [], phaseHistory: [], nextFlightMote: 0 });
    for (const target of targets) Object.assign(target, { effect: "", until: 0 });
    arrowKeys.clear();
    announce(branches[world.branch].name + " · Sẵn sàng");
  }

  function changeBranch(branch) {
    world.branch = branch;
    for (const button of document.querySelectorAll("[data-branch]")) {
      button.setAttribute("aria-pressed", button.dataset.branch === branch);
    }
    document.querySelector("#rank").hidden = branch !== "da";
    actions.replaceChildren(...Object.entries(branches[branch].skills).map(([key, name]) => {
      const button = document.createElement("button");
      const hotkey = document.createElement("kbd");
      const label = document.createElement("span");
      button.type = "button";
      button.dataset.action = key;
      hotkey.textContent = key === "shift" ? "Shift" : key.toUpperCase();
      label.textContent = name;
      button.append(hotkey, label);
      button.addEventListener("click", () => cast(key));
      return button;
    }));
    reset();
  }

  function projectile(type, angle, options = {}) {
    const direction = options.direction ?? angle;
    const side = options.side ?? 0;
    const px = player.x + Math.cos(direction) * (options.offset ?? 25) - Math.sin(direction) * side;
    const py = player.y - (world.flight ? 37 : 24) + Math.sin(direction) * (options.offset ?? 25) + Math.cos(direction) * side;
    const shot = { type, angle, x: px, y: py, speed: options.speed ?? 310,
      expires: world.time + (options.life ?? 750), scale: options.scale ?? 1, hit: options.hit ?? "" };
    world.shots.push(shot);
    world.lastShot.push({ type, angle, x: px, y: py });
  }

  function particle(type, x, y, duration = 270, scale = 1) {
    world.motes.push({ type, x, y, start: world.time, duration, scale });
  }

  function fan(count, angle, spread, fire) {
    for (let i = 0; i < count; i++) fire(angle + spread * (i / (count - 1) - 0.5), i);
  }

  function cue(pose, text) {
    return { pose, text };
  }

  function animate(key, length, phases, events = [], extra = {}) {
    const name = branches[world.branch].skills[key];
    const action = { key, name, start: world.time, length, phases, events, next: 0, facing: player.facing, ...extra };
    world.cast = action;
    announce(name + " · " + phases[0][1].text);
    return action;
  }

  function dash(key, isSkill) {
    const angle = axes[player.facing];
    const distance = isSkill ? 91 : 52;
    const travel = isSkill ? 240 : 170;
    const duration = isSkill ? 55 + travel + 2000 : 320;
    const pose = world.branch === "da" ? "dash" : "flight";
    animate(key, duration, [
      [0, cue("ready", "Hạ trọng tâm")],
      [55, cue(pose, isSkill ? "Lướt · miễn sát thương" : "Lướt")],
      [55 + travel, cue("recover", isSkill ? "Miễn sát thương · 2 giây" : "Trụ chân")],
    ], [], { dash: { x: player.x, y: player.y, dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance, travel }, immunity: isSkill, lastGhost: -100 });
  }

  function tuanCast(key, angle) {
    if (key === "a") {
      const flying = world.flight;
      animate(key, 470, [[0, cue(flying ? "hover" : "ready", "Lấy thế")],
        [130, cue(flying ? "flight" : "release", flying ? "Vẩy lông thép" : "Bắn tên")],
        [310, cue(flying ? "hover" : "recover", "Thu thế")]],
      [[130, () => projectile(flying ? "feather" : "arrow", angle, { hit: "burst", offset: flying ? 35 : 25 })]]);
    } else if (key === "q") {
      animate(key, 530, [[0, cue("ready", "Lấy thế")], [185, cue("release", "Ba đường tên song song")],
        [375, cue("recover", "Thu thế")]], [[185, () => {
        for (const side of [-10, 0, 10]) projectile("arrow", angle, { side, hit: "ice" });
      }]]);
    } else if (key === "w") {
      const lifting = !world.flight;
      world.flight = lifting;
      animate(key, 420, lifting ? [[0, cue("hover", "Bung cánh")], [160, cue("flight", "Bay")]]
        : [[0, cue("hover", "Hạ cánh")], [165, cue("recover", "Gập cánh")]], []);
    } else if (key === "e") {
      const fire = laserTiming.fire;
      animate(key, 810, [[0, cue("ready", "Tụ sáng ở cơ quan")],
        [fire, cue("release", "Phóng tia laze")], [fire + laserTiming.fade, cue("recover", "Tắt tia")]],
      [[fire, () => fireLaser(angle)]]);
    } else if (key === "r") {
      world.flight = false;
      animate(key, 2630, [[0, cue("fold", "Khép cánh")], [260, cue("shell", "Bọc giáp · hồi máu")],
        [2270, cue("fold", "Mở giáp")]], [[570, () => guardSpark()], [1140, () => guardSpark()],
        [1690, () => guardSpark()]], { rooted: true });
    } else if (key === "t") {
      const { scatter, warn, explode } = flowerTiming;
      animate(key, 2510, [[0, cue("coil", "Mở cánh")], [scatter, cue("spin", "Xoay · rải hoa đào")],
        [warn, cue("recover", "Hoa báo nổ")], [explode, cue("recover", "Hoa cùng nổ · kim thép văng ra")]],
      [[scatter, scatterFlowers]]);
    }
  }

  function laserOrigin(angle, charging = false) {
    const distance = charging ? 17 : 27;
    return {
      x: player.x + Math.cos(angle) * distance,
      y: player.y - (world.flight ? 44 : 30) + Math.sin(angle) * distance,
    };
  }

  function fireLaser(angle) {
    const { x, y } = laserOrigin(angle);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const edge = (position, velocity, limit) => Math.abs(velocity) < 0.0001
      ? Infinity : ((velocity > 0 ? limit : 0) - position) / velocity;
    const length = Math.max(0, Math.min(laserTiming.reach, edge(x, dx, width), edge(y, dy, height)));
    const contacts = [];
    world.laser = { x, y, angle, length, contacts, start: world.time };
    for (const target of targets) {
      const point = targetPosition(target);
      const tx = point.x - x;
      const ty = point.y - 28 - y;
      const along = tx * dx + ty * dy;
      if (along > 0 && along < length && Math.abs(tx * dy - ty * dx) < 9) {
        contacts.push({ x: x + dx * along, y: y + dy * along });
        hitTarget(target, "ice");
      }
    }
  }

  function scatterFlowers() {
    const originX = clamp(player.x, 150, width - 150);
    const originY = clamp(player.y, 104, height - 100);
    const rotation = Math.random() * Math.PI * 2;
    for (let i = 0; i < flowerTiming.count; i++) {
      const sector = i % 10;
      const outer = i >= 10;
      const bearing = rotation + (sector + (outer ? 0.44 : 0) + Math.random() * 0.38) * Math.PI / 5;
      const radius = outer ? 0.8 + Math.random() * 0.2 : 0.46 + Math.random() * 0.18;
      const time = world.time + Math.random() * 170;
      world.flowers.push({
        x: originX + Math.cos(bearing) * 142 * radius,
        y: originY + Math.sin(bearing) * 92 * radius,
        fromX: player.x, fromY: player.y - (world.flight ? 38 : 22), time,
        travel: 310 + Math.random() * 125, spin: bearing,
        burst: world.cast.start + flowerTiming.explode,
      });
    }
  }

  function burstFlower(flower) {
    const count = 11;
    const needles = Array.from({ length: count }, (_, i) => ({
      bearing: flower.spin + (i + Math.random() * 0.55) * Math.PI * 2 / count,
      distance: 32 + Math.random() * 45,
      scale: 0.49 + Math.random() * 0.37,
    }));
    world.bursts.push({ x: flower.x, y: flower.y, start: world.time, needles, angle: flower.spin });
  }

  function guardSpark() {
    particle("burst", player.x + 22, player.y - 28, 230, 0.7);
    particle("heal", player.x, player.y - 31, 380, 0.55);
  }

  function daCast(key, angle) {
    if (key === "a" || key === "r") {
      const rank = world.rank;
      animate(key, 480, [[0, cue("ready", "Kéo tay áo")], [125, cue("release", (rank + 1) + " phi tiêu")],
        [320, cue("recover", "Thu tay áo")]], [[125, () => {
        for (const [element, spread] of ranks.slice(0, rank + 1)) {
          projectile(element, angle + spread, { direction: angle, speed: 400, hit: element === "water" ? "ice" : element });
        }
      }]]);
    } else if (key === "q") {
      animate(key, 1660, [[0, cue("trap", "Đặt bẫy")], [265, cue("recover", "Dấu bẫy · góc nhìn người đặt")],
        [940, cue("recover", "Bia bước vào")], [1280, cue("recover", "Nổ · choáng diện rộng")]],
      [[265, () => {
        const x = player.x + Math.cos(angle) * 48;
        const y = player.y + Math.sin(angle) * 48;
        const target = targets[nextTarget++ % targets.length];
        world.traps.push({ x, y, target, time: world.time, trigger: world.time + 1015 });
      }]]);
    } else if (key === "w") {
      animate(key, 1020, [[0, cue("ready", "Lấy thế")], [125, cue("release", "Phi đao liên tiếp")],
        [875, cue("recover", "Thu tay áo")]], Array.from({ length: 6 }, (_, i) =>
        [125 + i * 110, () => projectile("knife", angle, { speed: 365, scale: 0.8, hit: "burst" })]), { alternating: true });
    } else if (key === "e") {
      dash(key, true);
    } else if (key === "t") {
      animate(key, 2300, [[0, cue("ready", "Lấy thế")], [300, cue("spin", "I · 9 phi đao làm chậm")],
        [885, cue("alternate", "II · 90 phi đao độc")], [1620, cue("lunge", "III · Quạt kim châm")],
        [2100, cue("recover", "Thu thế")]], [
        [300, () => fan(9, angle, Math.PI / 2, bearing => projectile("knife", bearing, { direction: angle, scale: 0.72, hit: "ice" }))],
        ...Array.from({ length: 6 }, (_, i) => [885 + i * 88, () => {
          fan(15, angle, Math.PI / 2, (bearing, index) => projectile(index % 3 ? "knife" : "wood", bearing,
            { direction: angle, speed: 275 + 13 * i, scale: 0.47, life: 510, hit: "wood" }));
        }]),
        [1620, () => fan(25, angle, Math.PI / 2, bearing => projectile("water", bearing,
          { direction: angle, speed: 465, scale: 0.54, life: 450, hit: "burst" }))],
      ]);
    }
  }

  function cast(key) {
    if (!branches[world.branch].skills[key]) return;
    if (world.cast && world.cast.key !== "w" && (world.cast.rooted || world.cast.dash || world.cast.key === "t")) return;
    world.lastShot = [];
    world.castCounts[world.branch + "-" + key] = (world.castCounts[world.branch + "-" + key] ?? 0) + 1;
    const angle = axes[player.facing];
    if (key === "p") {
      animate(key, 1300, [[0, cue("recover", "Hồi mana")], [430, cue("recover", "Hồi máu")],
        [870, cue("recover", "Chớp chí mạng")]], [
        [0, () => particle("mana", player.x, player.y - 28, 430)],
        [430, () => particle("heal", player.x, player.y - 24, 440)],
        [870, () => particle("burst", targets[0].x, targets[0].y - 23, 360, 0.75)],
      ]);
    } else if (key === "shift") {
      dash(key, false);
    } else if (world.branch === "tuan") {
      tuanCast(key, angle);
    } else {
      daCast(key, angle);
    }
  }

  function castPhase(action, age) {
    let phase = action.phases[0][1];
    for (const [time, next] of action.phases) {
      if (age >= time) phase = next;
    }
    return phase;
  }

  function actorFrame() {
    const branch = branches[world.branch].art;
    const current = world.cast;
    const age = current ? world.time - current.start : 0;
    const facing = current?.facing ?? player.facing;
    let pose = current ? castPhase(current, age).pose : "";
    if (current?.alternating && age >= 125 && age < 875 && Math.floor((age - 125) / 110) % 2) pose = "alternate";
    if (world.flight && !["coil", "spin"].includes(pose)) {
      pose = player.moving || pose === "flight" || pose === "release" ? "flight" : "hover";
    }
    if (world.branch === "tuan" && pose === "flight" && !world.flight) pose = "ready";
    if (pose && pose !== "recover") {
      if (facing === "left" || facing === "right") return { sheet: branch + "-action", pose, flip: facing === "left" };
      const vertical = world.branch === "tuan"
        ? { ready: "release", release: "release", hover: "hover", flight: "hover", fold: "shell", shell: "shell", coil: "spin", spin: "spin" }
        : { ready: "ready", release: "release", alternate: "release", trap: "ready", dash: "dash", spin: "spin", lunge: "spin" };
      return { sheet: branch + "-vertical", pose: vertical[pose] + "-" + facing };
    }
    const step = player.moving ? ["step-a", "idle", "step-b", "idle"][Math.floor(player.walkTime / 100) % 4] : "idle";
    return { sheet: branch + "-walk", pose: step + "-" + facing };
  }

  function placePlayer(x, y) {
    player.x = clamp(x, 34, width - 34);
    player.y = clamp(y, 96, height - 81);
  }

  function move(dt) {
    const dx = Number(arrowKeys.has("ArrowRight")) - Number(arrowKeys.has("ArrowLeft"));
    const dy = Number(arrowKeys.has("ArrowDown")) - Number(arrowKeys.has("ArrowUp"));
    player.moving = Boolean(dx || dy) && !world.cast?.rooted;
    if (player.moving) {
      const key = [...arrowKeys].at(-1);
      if (key) player.facing = directions[key];
      const length = Math.hypot(dx, dy);
      const distance = dt * (world.flight ? 0.208 : 0.112) / length;
      placePlayer(player.x + dx * distance, player.y + dy * distance);
      player.walkTime += dt;
    }
  }

  function tickCast(dt) {
    const action = world.cast;
    if (!action) { move(dt); return; }
    const age = world.time - action.start;
    if (action.dash && age >= 55 && age < 55 + action.dash.travel) {
      const d = action.dash;
      const progress = clamp((age - 55) / d.travel, 0, 1);
      if (action.immunity && age - action.lastGhost > 58) {
        world.afterimages.push({ x: player.x, y: player.y, time: world.time, frame: actorFrame() });
        action.lastGhost = age;
      }
      placePlayer(d.x + d.dx * progress, d.y + d.dy * progress);
      player.moving = false;
    } else if (action.dash && !action.arrived && age >= 55 + action.dash.travel) {
      const d = action.dash;
      placePlayer(d.x + d.dx, d.y + d.dy);
      action.arrived = true;
    } else if (action.rooted || world.laser || (action.dash && age < 55)) {
      player.moving = false;
    } else {
      move(dt);
    }
    while (action.next < action.events.length && age >= action.events[action.next][0]) {
      action.events[action.next++][1]();
    }
    if (age >= action.length) {
      world.cast = null;
      announce(branches[world.branch].name + (world.flight ? " · Đang bay" : " · Sẵn sàng"));
    } else {
      announce(action.name + " · " + castPhase(action, age).text);
    }
  }

  function targetPosition(target) {
    const trap = world.traps.find(entry => entry.target === target && world.time < entry.trigger + 410);
    if (!trap) return target;
    const approach = clamp((world.time - trap.time - 440) / 570, 0, 1);
    const returnToStart = clamp((world.time - trap.trigger - 170) / 240, 0, 1);
    const amount = approach * (1 - returnToStart);
    return { x: target.x + (trap.x - target.x) * amount, y: target.y + (trap.y - target.y) * amount };
  }

  function hitTarget(target, kind) {
    target.effect = kind;
    target.until = world.time + (kind === "stun" ? 500 : 390);
    const { x, y } = targetPosition(target);
    if (kind === "ice") particle("ice", x, y - 3, 430, 1.1);
    if (kind === "burst" || kind === "fire" || kind === "metal") particle("burst", x, y - 24, 200, 0.58);
  }

  function tickEffects(dt) {
    world.shots = world.shots.filter(shot => {
      const oldX = shot.x;
      const oldY = shot.y;
      shot.x += Math.cos(shot.angle) * shot.speed * dt / 1000;
      shot.y += Math.sin(shot.angle) * shot.speed * dt / 1000;
      const sx = shot.x - oldX;
      const sy = shot.y - oldY;
      if (shot.hit && sx * sx + sy * sy > 0) {
        for (const target of targets) {
          const { x, y } = targetPosition(target);
          const t = clamp(((x - oldX) * sx + (y - 24 - oldY) * sy) / (sx * sx + sy * sy), 0, 1);
          if (Math.hypot(x - oldX - sx * t, y - 24 - oldY - sy * t) < 8) {
            hitTarget(target, shot.hit);
            return false;
          }
        }
      }
      return world.time < shot.expires && shot.x > -30 && shot.x < width + 30 && shot.y > -30 && shot.y < height + 30;
    });
    world.flowers = world.flowers.filter(flower => {
      if (world.time < flower.burst) return true;
      burstFlower(flower);
      return false;
    });
    world.bursts = world.bursts.filter(burst => world.time - burst.start < 720);
    if (world.laser && world.time - world.laser.start >= laserTiming.fade) world.laser = null;
    world.traps = world.traps.filter(trap => {
      if (!trap.hit && world.time >= trap.trigger) {
        trap.hit = true;
        particle("burst", trap.x, trap.y - 4, 440, 1.3);
        hitTarget(trap.target, "stun");
        for (const target of targets) {
          if (target !== trap.target && Math.hypot(target.x - trap.x, target.y - trap.y) < 64) hitTarget(target, "stun");
        }
      }
      return world.time < trap.trigger + 410;
    });
    if (world.flight && world.time >= world.nextFlightMote) {
      particle("heal", player.x, player.y - 41, 410, 0.6);
      world.nextFlightMote = world.time + 950;
    }
    world.motes = world.motes.filter(item => world.time < item.start + item.duration);
    world.afterimages = world.afterimages.filter(item => world.time < item.time + 220);
  }

  function shadow(x, y, airborne = false) {
    if (phaser) {
      phaser.shadow(x, y, airborne);
      return;
    }
    ctx.fillStyle = airborne ? "#25212748" : "#28201d65";
    ctx.beginPath();
    ctx.ellipse(Math.round(x), Math.round(y), airborne ? 13 : 17, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function mote(x, y, size, color) {
    if (phaser) phaser.mote(x, y, size, color);
    else {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, size, size);
    }
  }

  function blend(screen) {
    if (phaser) phaser.blend(screen);
    else ctx.globalCompositeOperation = screen ? "screen" : "source-over";
  }

  function drawTarget(target) {
    const { x, y } = targetPosition(target);
    shadow(x, y);
    groundProp("dummy", x, y, 32);
    if (target.until > world.time) {
      if (target.effect === "stun" || target.effect === "earth") frame("vfx", "burst", x, y - 56, { scale: 0.4 });
      if (target.effect === "wood") {
        mote(Math.round(x + 6), Math.round(y - 33 - (target.until - world.time) / 30), 3, "#8ef0a0");
      }
    }
  }

  function drawPlayer() {
    const art = actorFrame();
    world.frame = art.sheet + "/" + art.pose;
    const heightOffset = world.flight ? 15 + Math.round(Math.sin(world.time / 155) * 2) : 0;
    const x = player.x;
    const y = player.y - heightOffset;
    shadow(x, player.y, world.flight);
    const action = world.cast;
    if (action?.immunity && world.time - action.start >= 55) {
      if (phaser) phaser.outline(art.sheet, art.pose, x, y, art.flip ?? false);
      else ctx.filter = "drop-shadow(1px 0 #eef5ff) drop-shadow(-1px 0 #eef5ff) drop-shadow(0 1px #eef5ff)";
      blend(true);
      frame("vfx", "trap", x, y, { alpha: 0.6 + 0.25 * Math.sin(world.time / 100), scale: 1.1 });
      blend(false);
    }
    frame(art.sheet, art.pose, x, y, art);
    if (ctx) ctx.filter = "none";
  }

  function drawLaser() {
    if (world.branch === "tuan" && world.cast?.key === "e" && !world.laser) {
      const age = world.time - world.cast.start;
      if (age < laserTiming.fire) {
        const origin = laserOrigin(axes[world.cast.facing], true);
        const intensity = clamp(age / laserTiming.fire, 0, 1);
        frame(coQuanEffects, "charge", origin.x, origin.y, {
          alpha: intensity, scale: 0.18 + 0.56 * intensity, angle: intensity * -1.3,
        });
      }
    }
    const laser = world.laser;
    if (!laser || laser.length < 4) return;
    const age = (world.time - laser.start) / laserTiming.fade;
    const alpha = 1 - age * age;
    const dx = Math.cos(laser.angle);
    const dy = Math.sin(laser.angle);
    const thickness = 1.55 - age * 1.23;
    blend(true);
    frame(coQuanEffects, "laser", laser.x + dx * laser.length / 2, laser.y + dy * laser.length / 2, {
      alpha, angle: laser.angle, scale: thickness, stretch: laser.length / (coQuanFx.laserWidth * thickness),
    });
    frame(coQuanEffects, "charge", laser.x, laser.y, { alpha, scale: 0.93 - 0.48 * age });
    for (const contact of laser.contacts) {
      frame(coQuanEffects, "contact", contact.x, contact.y, { alpha: alpha * 0.74, scale: 0.65 });
    }
    blend(false);
  }

  function drawFlowerBursts(groundLayer) {
    for (const blast of world.bursts) {
      const age = world.time - blast.start;
      if (groundLayer) {
        const t = clamp(age / 550, 0, 1);
        if (t < 1) frame(coQuanEffects, "shockwave", blast.x, blast.y,
          { alpha: 0.8 * (1 - t), scale: 0.31 + t * 0.79 });
        continue;
      }
      const bloom = clamp(age / 250, 0, 1);
      if (bloom < 1) frame(coQuanEffects, "blossom-blast", blast.x, blast.y - 7 - bloom * 9, {
        alpha: 0.95 * (1 - bloom ** 1.5), scale: 0.35 + 0.51 * bloom,
        angle: blast.angle,
      });
      const flight = clamp((age - 25) / 600, 0, 1);
      if (age < 25 || flight >= 1) continue;
      const reach = 1 - (1 - flight) ** 2;
      for (const needle of blast.needles) {
        const dx = Math.cos(needle.bearing);
        const dy = Math.sin(needle.bearing) * 0.71;
        const range = 4 + needle.distance * reach;
        frame(coQuanEffects, "needle", blast.x + dx * range, blast.y + dy * range - 8, {
          angle: Math.atan2(dy, dx), alpha: 1 - flight * flight, scale: needle.scale,
        });
      }
    }
  }

  function draw() {
    if (phaser) phaser.begin();
    else drawArena();
    for (const trap of world.traps) if (!trap.hit) frame("vfx", "trap", trap.x, trap.y, { alpha: 0.52, scale: 1.12 });
    drawFlowerBursts(true);
    for (const f of world.flowers) {
      if (world.time < f.time) continue;
      const t = clamp((world.time - f.time) / f.travel, 0, 1);
      const rise = Math.sin(Math.PI * t) * 27;
      const warning = f.burst - world.time < 490;
      frame("vfx", "flower", f.fromX + (f.x - f.fromX) * t, f.fromY + (f.y - f.fromY) * t - rise,
        { angle: f.spin + t * Math.PI * 2, alpha: warning ? 0.75 + 0.25 * Math.sin(world.time / 37) : 1, scale: 0.68 });
      if (warning) frame(coQuanEffects, "charge", f.x, f.y,
        { alpha: 0.36 + 0.25 * Math.sin(world.time / 37), scale: 0.35 });
    }
    for (const ghost of world.afterimages) {
      frame(ghost.frame.sheet, ghost.frame.pose, ghost.x, ghost.y,
        { flip: ghost.frame.flip, alpha: 0.36 * (1 - (world.time - ghost.time) / 220) });
    }
    const sorted = [...scenery.map(prop => ({ y: prop[2], paint: () => groundProp(...prop) })),
      ...targets.map(target => ({ y: targetPosition(target).y, paint: () => drawTarget(target) })),
      { y: player.y, paint: drawPlayer }].sort((a, b) => a.y - b.y);
    for (const { paint } of sorted) paint();
    for (const shot of world.shots) {
      frame("vfx", shot.type, shot.x, shot.y, { angle: shot.angle, scale: shot.scale });
    }
    drawLaser();
    drawFlowerBursts(false);
    for (const item of world.motes) {
      const t = (world.time - item.start) / item.duration;
      if (item.type === "mana" || item.type === "heal") {
        const color = item.type === "mana" ? "#87c9ff" : "#fff9e6";
        const radius = item.type === "mana" ? 25 * (1 - t) : 6 + 5 * t;
        for (let i = 0; i < 4; i++) {
          const angle = i * Math.PI / 2 + t * 1.6;
          mote(Math.round(item.x + Math.cos(angle) * radius * item.scale), Math.round(item.y - t * 18 + Math.sin(angle) * radius * item.scale), 2, color);
        }
      } else {
        frame("vfx", item.type, item.x, item.y, { alpha: 1 - t * 0.9, scale: item.scale * (0.64 + t * 0.5) });
      }
    }
    if (phaser) phaser.end();
    for (const button of actions.children) button.classList.toggle("active", button.dataset.action === world.cast?.key);
  }

  function loop(now) {
    const dt = previousTime ? clamp(now - previousTime, 0, 50) * world.rate : 0;
    previousTime = now;
    world.time += dt;
    tickCast(dt);
    tickEffects(dt);
    draw();
    if (!phaser) requestAnimationFrame(loop);
  }

  for (const button of document.querySelectorAll("[data-branch]")) {
    button.addEventListener("click", () => changeBranch(button.dataset.branch));
  }
  for (const button of rankButtons) button.addEventListener("click", () => setRank(Number(button.dataset.rank)));
  document.querySelector("#reset").addEventListener("click", reset);
  document.querySelector("#speed").addEventListener("click", event => {
    world.rate = world.rate === 1 ? 0.5 : 1;
    event.currentTarget.textContent = world.rate === 1 ? "1×" : "½×";
    event.currentTarget.setAttribute("aria-pressed", world.rate !== 1);
  });
  addEventListener("keydown", event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key in directions) {
      event.preventDefault();
      arrowKeys.add(event.key);
      return;
    }
    const key = event.key.toLowerCase();
    if (!event.repeat && key in branches[world.branch].skills) {
      event.preventDefault();
      cast(key);
    }
  });
  addEventListener("keyup", event => arrowKeys.delete(event.key));
  addEventListener("blur", () => arrowKeys.clear());

  const ready = phaser ? Promise.resolve() : Promise.all([
    ...Object.keys(sheets).map(sheet => loadImage(sheet, "art/" + sheet + ".png")),
    loadImage("arena", "art/arena.png"),
    ...frameData.props.map(id => loadImage(id, "art/" + id + ".png")),
  ]);
  ready.then(() => {
    if (!phaser) {
      fitCanvas();
      new ResizeObserver(fitCanvas).observe(canvas);
    }
    changeBranch("tuan");
    if (new URLSearchParams(location.search).has("inspect")) {
      window.previewSnapshot = () => ({
        branch: world.branch, rank: world.rank, x: player.x, y: player.y, facing: player.facing, frame: world.frame,
        cast: world.cast?.key, flight: world.flight, phase: phaseLabel.textContent, shots: structuredClone(world.lastShot),
        canvas: phaser?.inspect() ?? { width: canvas.width, height: canvas.height, scale: view.scale }, activeShots: world.shots.length, flowers: world.flowers.length, traps: world.traps.length,
        laser: world.laser && { ...world.laser },
        flowerPositions: world.flowers.map(({ x, y }) => ({ x, y })),
        bursts: world.bursts.map(({ x, y, needles }) => ({ x, y, needles: needles.length })),
        castCounts: { ...world.castCounts }, phases: [...world.phaseHistory], time: world.time,
      });
    }
    if (phaser) phaser.run(loop);
    else requestAnimationFrame(loop);
  }).catch(error => {
    phaseLabel.textContent = error.message;
    console.error(error);
  });
})();
