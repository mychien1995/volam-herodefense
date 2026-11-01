/* Standalone artwork choreography. Deliberately imports no game or Phaser module. */
(async () => {
  const assets = window.LY_MAC_SAU_ASSETS;
  if (!assets) {
    document.querySelector('#loading-error').hidden = false;
    return;
  }
  const $ = (selector) => document.querySelector(selector);
  const canvas = $('#scene');
  const ctx = canvas.getContext('2d');
  const config = assets.config;
  const { width: W, height: H, bossX: BX, bossY: BY } = config.world;
  const cycle = config.cycleMs;
  const modes = [
    { id: 'sprite', key: '0', name: 'Sprite', title: 'Lý Mạc Sầu', description: 'Bốn hướng · đứng yên, đi bộ, ra đòn. Đổi động tác trong Tuỳ chỉnh.' },
    { id: 'arena', key: '1', name: 'Arena', title: 'Cổ Mộ Phái', description: 'Thạch thất, tượng tổ sư, đăng ngọc và sân đấu trống. Có chế độ xem tiles / props.' },
    { id: 'basic', key: 'A', name: 'Đánh thường', title: 'Đánh thường', description: 'Phất trần cận chiến: lấy đà → quật trước mặt → thu thế.' },
    { id: 'needle', key: 'Q', name: 'Băng Phách', title: 'Băng Phách Ngân Châm', description: 'Một băng kim nhắm P1, chốt hướng khi phóng và bay thẳng.' },
    { id: 'palm', key: 'W', name: 'Xích Luyện', title: 'Xích Luyện Chưởng', description: 'Vận khí tím → đồng thời phóng tám chưởng ra tám phía, tầm bay xa.' },
    { id: 'sweep', key: 'E', name: 'Phất Trần', title: 'Phất Trần Công', description: 'Quạt phất trần theo hình nón phía trước. Thử cả bốn hướng.' },
    { id: 'summon', key: 'R', name: 'Cổ Mộ', title: 'Cổ Mộ Kiếm Pháp', description: 'Bốn pháp ấn nổi sáng, triệu hồi âm binh cầm kiếm.' },
    { id: 'poison', key: 'T', name: 'Ngũ Độc', title: 'Ngũ Độc Chưởng', description: 'Báo trước ở bốn mép màn hình → độc chưởng cùng bay vào sân đấu.' },
  ];
  let mode = 'palm', direction = 'right', characterState = 'idle';
  let background = 'illustration', party = 6, zoom = 1, speed = 1;
  let time = 0, paused = false, tour = false, previous = performance.now();
  let targetLock = null, nodes = [], projectiles = [], phase = '';
  const observed = new Set(), keys = new Set();
  const heroes = [
    { x: 885, y: 460, direction: 'left' }, { x: 438, y: 405, direction: 'right' },
    { x: 526, y: 596, direction: 'up' }, { x: 773, y: 578, direction: 'up' },
    { x: 526, y: 324, direction: 'down' }, { x: 776, y: 340, direction: 'down' },
  ];
  const initialHeroes = structuredClone(heroes);
  const angles = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
  const loadImage = (src) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Không đọc được PNG trong bộ preview'));
    image.src = src;
  });
  const images = {};
  try {
    await Promise.all([
      ...Object.entries(assets.packages).map(async ([name, p]) => { images[name] = await loadImage(p.image); }),
      ...Object.entries(assets.hero).map(async ([name, url]) => { images[`hero/${name}`] = await loadImage(url); }),
      ...Object.entries(assets.environment).map(async ([name, url]) => { images[`env/${name}`] = await loadImage(url); }),
      ...Object.entries(assets.tiles).map(async ([name, url]) => { images[`tile/${name}`] = await loadImage(url); }),
      loadImage(assets.arena).then((image) => { images.arena = image; }),
    ]);
  } catch (error) {
    $('#notice').textContent = error.message;
    throw error;
  }

  // Raster-only separable environment alternative; illustration is never called a tilemap.
  const tileScene = document.createElement('canvas');
  tileScene.width = W; tileScene.height = H;
  const floor = tileScene.getContext('2d');
  floor.imageSmoothingEnabled = false;
  for (let y = 0; y < Math.ceil(H / 32); y++) {
    for (let x = 0; x < W / 32; x++) {
      const central = x >= 4 && x < 36 && y >= 5 && y < 24;
      const variants = central ? ['slab_clean_a', 'slab_clean_b', 'slab_clean_c', 'slab_clean_d'] : ['bedrock_a', 'bedrock_b', 'bedrock_c', 'bedrock_d'];
      let name = variants[(x * 13 + y * 7 + Math.floor(y / 3)) % 4];
      if (central && (x === 4 || x === 35 || y === 23) && (x + y) % 3 === 0) name = 'slab_moss';
      floor.drawImage(images[`tile/${name}`], x * 32, y * 32);
    }
  }
  const props = [
    ['male_founder_statue', 312, 170], ['female_founder_statue', 968, 170], ['altar', 640, 170],
    ['lotus_pillar', 145, 170], ['lotus_pillar', 1135, 170], ['faded_banner', 470, 148], ['faded_banner', 810, 148],
    ['jade_lantern', 130, 320], ['jade_lantern', 1150, 320], ['jade_lantern', 130, 600], ['jade_lantern', 1150, 600],
    ['plum_vase', 214, 191], ['plum_vase', 1066, 191], ['sword_rack', 100, 720], ['stone_bench', 1180, 720],
    ['cave_corner', 45, 170], ['cave_corner', 1235, 170], ['stalagmites', 60, 485], ['stalagmites', 1220, 485],
    ['funerary_urn', 208, 660], ['funerary_urn', 1072, 660], ['tomb_school_arch', 640, 843],
  ];
  for (const [name, x, y] of props.sort((a, b) => a[2] - b[2])) floor.drawImage(images[`env/${name}`], x - 96, y - 168);

  function sample(packageName, tag, elapsed) {
    const clip = assets.packages[packageName].animations[tag];
    if (!clip) throw new Error(`Missing animation: ${packageName}/${tag}`);
    const length = clip.durationsMs.reduce((a, b) => a + b, 0);
    let local = clip.loop ? Math.max(0, elapsed) % length : Math.max(0, Math.min(elapsed, length - 0.001));
    for (let i = 0; i < clip.frames.length; i++) {
      if (local < clip.durationsMs[i]) return clip.frames[i];
      local -= clip.durationsMs[i];
    }
    return clip.frames.at(-1);
  }

  function drawFrame(packageName, tag, elapsed, x, y, angle = 0, scale = 1, alpha = 1, extra = {}) {
    const frameName = sample(packageName, tag, elapsed);
    const record = assets.packages[packageName].atlas[frameName];
    const f = record.frame, pivot = record.pivot ?? { x: 0.5, y: 0.5 };
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(angle); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
    ctx.drawImage(images[packageName], f.x, f.y, f.w, f.h, -f.w * pivot.x, -f.h * pivot.y, f.w, f.h);
    ctx.restore();
    nodes.push({ package: packageName, tag, frame: frameName, x, y, angle, scale, ...extra });
    observed.add(`${packageName}/${tag}/${frameName}`);
  }
  function effect(tag, elapsed, x, y, angle = 0, scale = 1) {
    drawFrame(tag.startsWith('palm_') ? 'purple' : 'fx', tag, elapsed, x, y, angle, scale);
  }
  function shadow(x, y, width = 22) {
    ctx.fillStyle = '#03070a65'; ctx.beginPath(); ctx.ellipse(x, y + 1, width, 6, 0, 0, Math.PI * 2); ctx.fill();
  }
  function hero(index) {
    const h = heroes[index], walking = index === 0 && keys.size > 0;
    const frame = `${walking ? 'walk' : 'idle'}_${h.direction}_${walking ? Math.floor(time / 120) % 4 : Math.floor(time / 350) % 2}`;
    shadow(h.x, h.y, 17);
    ctx.drawImage(images[`hero/${frame}`], Math.round(h.x - 40), Math.round(h.y - 64));
    nodes.push({ package: 'hero', frame, x: h.x, y: h.y, player: index + 1 });
    ctx.fillStyle = index === 0 ? '#fff0b8' : '#c0d8d8'; ctx.font = '11px Segoe UI'; ctx.textAlign = 'center';
    ctx.fillText(`P${index + 1}`, h.x, h.y + 18);
  }
  function bossState(t) {
    if (mode === 'sprite') return characterState;
    const spec = { basic: ['basic_attack', 360], needle: ['needle_cast', 560], palm: ['palm_channel', 880], sweep: ['fast_sweep', 280], summon: ['summon_cast', 720], poison: ['palm_channel', 880] }[mode];
    return spec && t < spec[1] ? spec[0] : 'idle';
  }
  function shot(id, tag, origin, angle, elapsed, speedPx, range, extra = {}) {
    const distance = elapsed / 1000 * speedPx;
    if (elapsed < 0 || distance > range) return;
    const x = origin.x + Math.cos(angle) * distance, y = origin.y + Math.sin(angle) * distance;
    projectiles.push({ id, x, y, angle, distance, origin: { ...origin }, ...extra });
    effect(tag, elapsed, x, y, angle, tag === 'needle_projectile' ? 0.65 : 0.85);
  }
  function edgeLanes() {
    const lanes = [];
    const count = config.poison.lanesPerSide;
    for (let i = 0; i < count; i++) {
      const offset = i - (count - 1) / 2;
      lanes.push({ side: 'west', x: 18, y: BY + offset * 135, angle: 0 });
      lanes.push({ side: 'east', x: W - 18, y: BY + offset * 135, angle: Math.PI });
      lanes.push({ side: 'north', x: BX + offset * 200, y: 18, angle: Math.PI / 2 });
      lanes.push({ side: 'south', x: BX + offset * 200, y: H - 18, angle: -Math.PI / 2 });
    }
    return lanes;
  }

  function choreography(t) {
    const a = angles[direction], unit = { x: Math.cos(a), y: Math.sin(a) };
    const spec = config[mode];
    phase = !spec ? 'Quan sát' : t < spec.releaseMs ? 'Lấy đà' : t < 3000 ? 'Ra chiêu' : 'Thu thế';
    if (mode === 'basic' && t >= spec.releaseMs && t < 540) effect('basic_hit', t - spec.releaseMs, BX + unit.x * spec.reachPx, BY - 20 + unit.y * spec.reachPx, a, 0.5);
    if (mode === 'needle') {
      if (t < spec.releaseMs) effect('chilling_slow', t, heroes[0].x, heroes[0].y, 0, 0.45);
      if (t >= spec.releaseMs) {
        targetLock ??= { x: heroes[0].x, y: heroes[0].y - 20, player: 1 };
        const origin = { x: BX + unit.x * 24, y: BY - 24 + unit.y * 24 };
        const angle = Math.atan2(targetLock.y - origin.y, targetLock.x - origin.x);
        const distance = Math.min(spec.rangePx, Math.hypot(targetLock.x - origin.x, targetLock.y - origin.y));
        shot('needle-1', 'needle_projectile', origin, angle, t - spec.releaseMs, spec.speedPxPerSecond, distance, { targetPlayer: 1, targetLock: { ...targetLock } });
        const impactTime = spec.releaseMs + distance / spec.speedPxPerSecond * 1000;
        if (t >= impactTime && t < impactTime + 400) effect('needle_poison_impact', t - impactTime, targetLock.x, targetLock.y, 0, 0.6);
      }
    }
    if (mode === 'palm') {
      if (t < spec.releaseMs) {
        effect('palm_charge', t, BX, BY - 25, 0, 0.7);
        for (let i = 0; i < spec.directions; i++) {
          const angle = i * Math.PI * 2 / spec.directions;
          effect('palm_lane_warning', t, BX + Math.cos(angle) * 105, BY - 20 + Math.sin(angle) * 105, angle, 0.65);
        }
      }
      for (let i = 0; i < spec.directions; i++) shot(`palm-${i}`, 'palm_projectile', { x: BX, y: BY - 22 }, i * Math.PI * 2 / spec.directions, t - spec.releaseMs, spec.speedPxPerSecond, spec.rangePx, { color: spec.color });
    }
    if (mode === 'sweep') {
      if (t < spec.releaseMs) effect('sweep_cone_warning', t, BX + unit.x * 65, BY - 20 + unit.y * 65, a, 1.1);
      if (t >= spec.releaseMs && t < spec.releaseMs + 400) effect('duster_sweep_trail', t - spec.releaseMs, BX + unit.x * 55, BY - 22 + unit.y * 55, a, 1.15);
    }
    if (mode === 'summon') {
      for (let i = 0; i < spec.count; i++) {
        const angle = Math.PI / 4 + i * Math.PI * 2 / spec.count;
        let x = BX + Math.cos(angle) * spec.radiusPx, y = BY + Math.sin(angle) * spec.radiusPx;
        if (t < spec.releaseMs) effect('co_mo_sigil', t, x, y, 0, 0.8);
        else {
          if (t < spec.releaseMs + 400) effect('co_mo_spawn', t - spec.releaseMs, x, y - 15, 0, 0.8);
          const elapsed = t - spec.releaseMs;
          const facing = i < 2 ? 'down' : 'up';
          const action = elapsed < 400 ? 'idle' : elapsed < 1200 ? 'walk' : elapsed < 1580 ? 'basic_attack' : 'idle';
          const progress = Math.max(0, Math.min(800, elapsed - 400)) / 800;
          x += Math.cos(angle) * progress * 42; y += Math.sin(angle) * progress * 42;
          shadow(x, y, 16);
          drawFrame('summon', `${action}_${facing}`, action === 'basic_attack' ? elapsed - 1200 : elapsed, x, y, 0, 1, 1, { summonIndex: i });
        }
      }
    }
    if (mode === 'poison') {
      if (t < 400) effect('phase_two_activation', t, BX, BY - 20, 0, 0.85);
      for (const [i, lane] of edgeLanes().entries()) {
        if (t < spec.releaseMs) effect('edge_warning', t, lane.x, lane.y, lane.angle, 0.7);
        if (t >= spec.releaseMs && t < spec.releaseMs + 400) effect('edge_emission', t - spec.releaseMs, lane.x, lane.y, lane.angle, 0.7);
        shot(`poison-${i}`, 'ngu_doc_projectile', lane, lane.angle, t - spec.releaseMs, spec.speedPxPerSecond, spec.rangePx, { side: lane.side });
      }
    }
  }

  function render() {
    nodes = []; projectiles = [];
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);
    ctx.drawImage(background === 'tiles' ? tileScene : images.arena, 0, 0, W, H);
    // All actors use the same feet convention; sorting prevents a northern actor covering a southern actor.
    const actors = [{ kind: 'boss', y: BY }, ...heroes.slice(0, party).map((h, index) => ({ kind: 'hero', y: h.y, index }))];
    for (const actor of actors.sort((a, b) => a.y - b.y)) {
      if (actor.kind === 'hero') hero(actor.index);
      else { shadow(BX, BY); drawFrame('boss', `${bossState(time)}_${direction}`, time, BX, BY); }
    }
    choreography(time);
    ctx.restore();
    $('#timeline').value = String(Math.floor(time));
    $('#time').textContent = `${(time / 1000).toFixed(2)}s`;
    $('#phase').textContent = phase;
    $('#pause').textContent = paused ? '▶' : 'Ⅱ';
    $('#pause').setAttribute('aria-label', paused ? 'Chạy animation' : 'Dừng animation');
    $('#notice').textContent = mode === 'needle' ? 'Mục tiêu: P1 · dùng phím mũi tên để thử né' : mode === 'palm' ? '8 hướng · chưởng tím · tầm bay thử 620px' : mode === 'poison' ? 'Bắc · Nam · Đông · Tây — cùng khai chưởng' : mode === 'arena' ? (background === 'tiles' ? 'Ghép từ tiles và props riêng' : 'Nền minh hoạ dùng để review art') : mode === 'sprite' ? `${direction === 'right' ? 'Phải' : direction === 'left' ? 'Trái' : direction === 'up' ? 'Lên' : 'Xuống'} · chân cố định · thân 56px ở camera 1×` : 'Lấy đà → ra chiêu → thu thế';
  }
  function setMode(next) {
    if (!modes.some((m) => m.id === next)) throw new Error(`Unknown mode: ${next}`);
    mode = next; time = 0; targetLock = null;
    const item = modes.find((m) => m.id === mode);
    $('#skill-title').textContent = item.title; $('#skill-description').textContent = item.description;
    for (const button of $('#modes').children) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    render();
  }
  function setTime(next) {
    if (next < time) targetLock = null;
    time = Math.max(0, Math.min(cycle - 1, next)); render();
  }
  for (const item of modes) {
    const button = document.createElement('button'); button.dataset.mode = item.id;
    const key = document.createElement('kbd'); key.textContent = item.key;
    button.append(key, document.createTextNode(item.name)); button.addEventListener('click', () => setMode(item.id)); $('#modes').append(button);
  }
  $('#direction').onchange = (event) => { direction = event.target.value; targetLock = null; render(); };
  $('#character-state').onchange = (event) => { characterState = event.target.value; setMode('sprite'); };
  $('#background').onchange = (event) => { background = event.target.value; render(); };
  $('#party').onchange = (event) => { party = Number(event.target.value); render(); };
  $('#zoom').onchange = (event) => { zoom = Number(event.target.value); render(); };
  $('#speed').onchange = (event) => { speed = Number(event.target.value); };
  $('#tour').onchange = (event) => { tour = event.target.checked; };
  $('#pause').onclick = () => { paused = !paused; render(); };
  $('#timeline').oninput = (event) => { paused = true; setTime(Number(event.target.value)); };
  $('#previous-frame').onclick = () => { paused = true; setTime(time - 50); };
  $('#next-frame').onclick = () => { paused = true; setTime(time + 50); };
  $('#settings-toggle').onclick = () => { $('#settings').hidden = !$('#settings').hidden; $('#settings-toggle').setAttribute('aria-expanded', String(!$('#settings').hidden)); };
  $('#fullscreen').onclick = () => { (document.fullscreenElement ? document.exitFullscreen() : $('#viewport').requestFullscreen()).catch(() => { $('#notice').textContent = 'Trình duyệt chưa cho phép toàn màn hình'; }); };
  const shortcut = { '0': 'sprite', '1': 'arena', a: 'basic', q: 'needle', w: 'palm', e: 'sweep', r: 'summon', t: 'poison' };
  window.addEventListener('keydown', (event) => {
    if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(event.target.tagName)) return;
    if (event.key.startsWith('Arrow')) { event.preventDefault(); keys.add(event.key); }
    if (event.code === 'Space') { event.preventDefault(); paused = !paused; render(); }
    if (shortcut[event.key.toLowerCase()]) { event.preventDefault(); setMode(shortcut[event.key.toLowerCase()]); }
    if (event.key === 'Escape') { $('#settings').hidden = true; $('#settings-toggle').setAttribute('aria-expanded', 'false'); }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.key));
  window.addEventListener('blur', () => keys.clear());
  function tick(now) {
    const dt = Math.min(100, now - previous); previous = now;
    if (!paused) {
      let dx = Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft'));
      let dy = Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp'));
      const length = Math.hypot(dx, dy);
      if (length) {
        dx /= length; dy /= length;
        heroes[0].x = Math.max(180, Math.min(W - 180, heroes[0].x + dx * dt * 0.17));
        heroes[0].y = Math.max(230, Math.min(H - 185, heroes[0].y + dy * dt * 0.17));
        heroes[0].direction = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      }
      time += dt * speed;
      if (time >= cycle) {
        time %= cycle; targetLock = null;
        if (tour) setMode(modes[(modes.findIndex((m) => m.id === mode) + 1) % modes.length].id);
      }
      render();
    }
    requestAnimationFrame(tick);
  }
  // Review-only hooks expose frames actually drawn above, not simulated game acceptance.
  window.lyMacSauReview = {
    ready: true, modes: modes.map((m) => m.id), setMode, setTime,
    pause(value) { paused = value; render(); },
    setDirection(value) { if (!(value in angles)) throw new Error('Invalid direction'); direction = value; $('#direction').value = value; targetLock = null; render(); },
    setCharacterState(value) { if (!assets.packages.boss.animations[`${value}_${direction}`]) throw new Error('Invalid state'); characterState = value; $('#character-state').value = value; setMode('sprite'); },
    setBackground(value) { if (!['tiles', 'illustration'].includes(value)) throw new Error('Invalid backdrop'); background = value; $('#background').value = value; render(); },
    setParty(value) { if (![1, 6].includes(value)) throw new Error('Invalid party size'); party = value; $('#party').value = String(value); render(); },
    resetHeroes() { heroes.splice(0, heroes.length, ...structuredClone(initialHeroes)); targetLock = null; render(); },
    observed() { return [...observed]; }, clearObserved() { observed.clear(); },
    snapshot() { return structuredClone({ mode, direction, characterState, time, phase, paused, background, party, zoom, nodes, projectiles, heroes, targetLock }); },
  };
  setMode(mode); requestAnimationFrame(tick);
})();
