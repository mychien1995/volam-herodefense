import { ColyseusTestServer } from '@colyseus/testing';
import { createServer } from 'vite';
import { createGameServer } from '../apps/game-server/dist/app.config.js';
import { m1Config } from '../packages/game-data/dist/index.js';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import {
  arenaCreepQaOptions,
  shouldCaptureArenaCreepPng,
  arenaCreepSavedReport,
} from './arena-creep-qa-options.mjs';
const options = arenaCreepQaOptions(process.argv.slice(2));
const root = resolve('.'),
  out = resolve(root, options.evidenceDirectory);
const started = performance.now(),
  timings = [];
let lastMark = started;
const mark = (phase) => {
  const now = performance.now();
  const seconds = Number(((now - lastMark) / 1000).toFixed(2));
  timings.push({ phase, seconds });
  lastMark = now;
  console.log(`[arena QA] ${phase}: ${seconds}s`);
};
mkdirSync(out, { recursive: true });
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve(root, '.cache/ms-playwright');
const { chromium } = await import('@playwright/test');
let failed = false;
const errors = [],
  contexts = [],
  poseEvidence = [],
  shots = [],
  sourceStats = new Map();
let server, client, browser;
const wait = async (fn, label, timeout = 12000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 70));
  }
  throw Error('Timeout: ' + label);
};
const read = (p) => p.evaluate(() => window.__VOLAM__.snapshot()),
  inspect = (p) => p.evaluate(() => window.__VOLAM__.presentation());
const shot = async (p, n) => {
  if (!shouldCaptureArenaCreepPng(options, n)) return;
  await p.screenshot({ path: resolve(out, n) });
  shots.push(n);
};
try {
  const gameServer = createGameServer();
  await gameServer.listen(2588);
  server = new ColyseusTestServer(gameServer);
  assert(
    (await fetch('http://127.0.0.1:2588/health')).ok,
    'test server health',
  );
  process.env.VITE_SERVER_URL = 'http://127.0.0.1:2588';
  client = await createServer({
    root: resolve(root, 'apps/game-client'),
    configFile: false,
    server: {
      host: '127.0.0.1',
      port: 5186,
      strictPort: true,
      watch: null,
      hmr: false,
    },
    define: {
      'import.meta.env.VITE_SERVER_URL': JSON.stringify(
        'http://127.0.0.1:2588',
      ),
    },
  });
  await client.listen();
  browser = await chromium.launch({ headless: true });
  mark('isolated services and browser');
  const pages = [];
  let roomId;
  for (let n = 0; n < options.players; n++) {
    const context = await browser.newContext({
      viewport: { width: n === 0 ? 1920 : 1280, height: n === 0 ? 1080 : 720 },
      deviceScaleFactor: 1,
    });
    contexts.push(context);
    const p = await context.newPage();
    pages.push(p);
    p.on('pageerror', (e) => errors.push(e.message));
    p.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    p.on('response', (r) => {
      if (r.status() >= 400) errors.push(r.status() + ' ' + r.url());
    });
    p.on('requestfailed', (r) =>
      errors.push(r.url() + ' ' + r.failure()?.errorText),
    );
    await p.goto('http://127.0.0.1:5186/?debug=1');
    await p.locator('#pre-nickname').fill('Creep QA ' + (n + 1));
    await p.getByRole('button', { name: 'Enter Game', exact: true }).click();
    if (roomId) {
      await p.getByLabel('Room code', { exact: true }).fill(roomId);
      await p
        .getByRole('button', { name: 'Join by code', exact: true })
        .click();
    } else
      await p.getByRole('button', { name: 'Create room', exact: true }).click();
    await wait(async () => !!(await read(p))?.roomId, 'join');
    roomId ??= (await read(p)).roomId;
  }
  await pages[0]
    .getByRole('button', { name: 'Start Game', exact: true })
    .click();
  for (const p of pages) {
    await p.locator('[data-school=cai_bang]').click();
    await p
      .getByRole('button', { name: 'Confirm Selection', exact: true })
      .click();
  }
  await wait(
    async () => (await read(pages.at(-1))).state.phase === 'IN_GAME',
    `${options.players}-player game start`,
  );
  await wait(async () => (await inspect(pages[0])).ready, 'Phaser ready');
  mark(`${options.players} browser clients joined and ready`);
  const room = server.getRoomById(roomId),
    definition = JSON.stringify(room.simulation.invasion.definition),
    saved = new Map();
  let sameWavePeer;
  assert.equal(room.world.heroes.size, options.players);
  // Test-only server fixture: exercise the existing director with normal stats/count scaling.
  // No public debug command, no browser state mutation, no production clock/rule edit.
  room.world.creeps.clear();
  for (let wave = 1; wave <= 16; wave++) {
    room.simulation.invasion.nextWaveTick = room.world.tick + 1;
    room.simulation.step();
    const e = [...room.world.creeps.values()].find(
      (e) => e.invasion?.wave === wave,
    );
    assert(e);
    saved.set(wave, e);
    sourceStats.set(wave, JSON.stringify(e.stats));
    if (wave === 13)
      sameWavePeer = [...room.world.creeps.values()].find(
        (v) => v.id !== e.id && v.invasion?.wave === 13,
      );
    room.world.creeps.clear();
  }
  room.simulation.invasion.nextWaveTick =
    room.world.tick + room.simulation.invasion.definition.intervalTicks;
  const heroes = [...room.world.heroes.values()];
  heroes.forEach((h, i) => {
    h.x = 700 + (i % 4) * 130;
    h.y = 710 + Math.floor(i / 4) * 65;
    h.fx = 0;
    h.fy = -1;
    h.moveX = 0;
    h.moveY = 0;
  });
  const stun = (e) => {
    e.statuses = [
      {
        kind: 'stun',
        sourceId: 'qa_server_fixture',
        abilityId: 'qa_pose',
        durationTicks: 3000,
        magnitude: 1,
        until: room.world.tick + 3000,
      },
    ];
    e.cooldown = room.world.tick + 3000;
    e.actionUntil = room.world.tick + 3000;
    e.hurtUntil = 0;
  };
  const arrange = (waves, pose = 'idle', dir = 'down') => {
    room.world.creeps.clear();
    for (const [i, wave] of waves.entries()) {
      const e = saved.get(wave);
      e.x = 700 + (i % 4) * 130;
      e.y =
        waves.length === 16
          ? 440 + Math.floor(i / 4) * 100
          : waves.length === 8
            ? 640 + Math.floor(i / 4) * 130
            : 640;
      e.fx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
      e.fy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
      e.hp = pose === 'death' ? 0 : e.maxHp;
      e.respawnAt = room.world.tick + 3000;
      e.pose = pose;
      stun(e);
      room.world.creeps.set(e.id, e);
    }
  };
  const initialWaves =
    options.mode === 'full'
      ? Array.from({ length: 16 }, (_, i) => i + 1)
      : [13, 14, 15, 16];
  arrange(initialWaves);
  await wait(
    async () =>
      (await inspect(pages[0])).actors.filter((a) => a.wave).length ===
      initialWaves.length,
    'selected production actors rendered',
  );
  const gallery = await inspect(pages[0]);
  assert.equal(gallery.arenaCreeps.filter((a) => a.wave <= 16).length, 16);
  assert(
    gallery.arenaCreeps.every((a) => a.texture && a.animations.length === 20),
  );
  await shot(pages[0], 'arena-waves-01-16.png');
  if (options.mode === 'full') {
    arrange(Array.from({ length: 8 }, (_, i) => i + 1));
    await pages[0].waitForTimeout(380);
    await shot(pages[0], 'arena-waves-01-08.png');
    arrange([9, 10, 11, 12]);
    await pages[0].waitForTimeout(380);
    await shot(pages[0], 'arena-waves-09-12.png');
  }
  // Two genuine Wave13 spawns share a texture but retain independent animation state.
  assert(sameWavePeer);
  arrange([13]);
  Object.assign(sameWavePeer, {
    x: 830,
    y: 640,
    hp: sameWavePeer.maxHp,
    fx: 1,
    fy: 0,
    pose: 'walk',
  });
  stun(sameWavePeer);
  room.world.creeps.set(sameWavePeer.id, sameWavePeer);
  await wait(async () => {
    const a = (await inspect(pages[0])).actors;
    return (
      a.some(
        (v) => v.id === saved.get(13).id && v.animation.endsWith(':idle:down'),
      ) &&
      a.some(
        (v) => v.id === sameWavePeer.id && v.animation.endsWith(':walk:right'),
      )
    );
  }, 'independent same-texture actors');
  await shot(pages[0], 'arena-independent-instances.png');
  mark('director fixtures and existing-art regression gallery');
  const manifests = JSON.parse(
    readFileSync('assets/arena_creeps.manifest.json', 'utf8'),
  );
  const frameCoverage = new Map();
  for (const state of options.combatOnly
    ? []
    : ['idle', 'walk', 'basic_attack', 'hurt', 'death']) {
    for (const dir of ['down', 'left', 'right', 'up']) {
      const poseStart = (await inspect(pages[0])).sceneTime;
      arrange([13, 14, 15, 16], state, dir);
      // A different network pose between repeated samples ensures a genuine new action transition.
      if (state === 'basic_attack' || state === 'hurt')
        for (const e of room.world.creeps.values())
          e.actionUntil = room.world.tick + 3000;
      const expected = manifests.assets
        .filter((a) => a.wave >= 13 && a.wave <= 16)
        .map((m) => ({
          asset: m,
          animation: m.animations.find(
            (a) => a.state === state && a.direction === dir,
          ),
          key: m.id + ':' + state + ':' + dir,
        }));
      const cycleMs = Math.max(
        ...expected.map(
          (e) => (e.animation.frames.length * 1000) / e.animation.frameRate,
        ),
      );
      let observedPose;
      await wait(
        async () => {
          observedPose = await inspect(pages[0]);
          return (
            observedPose.sceneTime >= poseStart + cycleMs &&
            expected.every(({ asset, animation, key }) => {
              const actor = observedPose.actors.find(
                (a) => a.wave === asset.wave,
              );
              const frames = observedPose.observedCreepFrames[key] ?? [];
              const complete =
                ['idle', 'walk'].includes(state) ||
                observedPose.completedAnimations.some(
                  (a) =>
                    a.id === actor?.id && a.key === key && a.at >= poseStart,
                );
              return (
                actor?.animation === key &&
                animation.frames.every((f) => frames.includes(f)) &&
                complete
              );
            })
          );
        },
        `observed full ${state}/${dir} animation cycle`,
        6000,
      );
      for (const wave of [13, 14, 15, 16]) {
        const m = manifests.assets.find((a) => a.wave === wave),
          anim = m.animations.find(
            (a) => a.state === state && a.direction === dir,
          );
        const observed = new Set(
          observedPose.observedCreepFrames[m.id + ':' + state + ':' + dir] ||
            [],
        );
        assert.equal(
          observed.size,
          anim.frames.length,
          'actual arena frames ' + m.id + ' ' + state + ' ' + dir,
        );
        frameCoverage.set(m.id + ':' + state + ':' + dir, [...observed]);
      }
      const p = observedPose;
      assert(
        p.actors
          .filter((a) => a.wave >= 13)
          .every((a) => a.depth === a.y && a.scale.every((v) => v === 1)),
      );
      poseEvidence.push({
        state,
        dir,
        actors: p.actors.filter((a) => a.wave >= 13),
      });
      if (dir === 'down' || state === 'walk')
        await shot(pages[0], 'arena-' + state + '-' + dir + '.png');
      // Reset via idle so a one-shot with a new direction can restart without replacing an active hit.
      if (['basic_attack', 'hurt', 'death'].includes(state)) {
        arrange([13, 14, 15, 16], 'idle', 'down');
        await wait(
          async () =>
            (await inspect(pages[0])).actors
              .filter((a) => a.wave >= 13 && a.wave <= 16)
              .every((a) => a.animation.endsWith(':idle:down')),
          'idle transition',
        );
      }
    }
  }
  mark('all authored directional frames and complete animation cycles');
  // Inspect the same production actors at native pixels and across an existing foreground tree.
  arrange([13, 14, 15, 16], 'idle', 'down');
  await pages[0].setViewportSize({ width: 900, height: 560 });
  await pages[0].waitForTimeout(500);
  const nativePixels = await pages[0].locator('#game canvas').evaluate((c) => ({
    width: c.width,
    displayWidth: c.getBoundingClientRect().width,
  }));
  assert.equal(
    nativePixels.width,
    nativePixels.displayWidth,
    'native integer 1x presentation',
  );
  await shot(pages[0], 'arena-native-1x.png');
  await pages[0].setViewportSize({ width: 1920, height: 1080 });
  const home = { x: heroes[0].x, y: heroes[0].y };
  heroes[0].x = 1100;
  heroes[0].y = 880;
  arrange([16]);
  const brute = saved.get(16);
  brute.x = 1220;
  brute.y = 842;
  await pages[0].waitForTimeout(600);
  const behind = await inspect(pages[0]),
    tree = behind.trees.find((t) => t.x === 1220 && t.y === 870);
  assert(tree);
  assert(behind.actors.find((a) => a.id === brute.id).depth < tree.depth);
  await shot(pages[0], 'arena-brute-behind-tree.png');
  brute.y = 920;
  await pages[0].waitForTimeout(500);
  const front = await inspect(pages[0]);
  assert(front.actors.find((a) => a.id === brute.id).depth > tree.depth);
  await shot(pages[0], 'arena-brute-in-front-of-tree.png');
  const depthEvidence = {
    tree,
    behind: behind.actors.find((a) => a.id === brute.id),
    front: front.actors.find((a) => a.id === brute.id),
  };
  Object.assign(heroes[0], home);
  await pages[0].waitForTimeout(500);
  // Isolated renderer contract: server-owned non-damaging projectiles. Normal creep AI remains melee.
  arrange([13, 14, 15, 16], 'idle', 'down');
  await pages[0].waitForTimeout(400);
  const projectileFixture = {
    label:
      'SERVER FIXTURE ONLY: existing generic projectile state, zero damage; no new enemy AI attack',
    observations: [],
  };
  for (const [wave, vx, vy] of [
    [14, 12, 0],
    [15, 0, 12],
  ]) {
    const id = 'qa_demon_projectile_' + wave,
      owner = saved.get(wave);
    room.world.projectiles.set(id, {
      id,
      ownerId: owner.id,
      abilityId: 'creep_strike',
      zoneId: 'arena',
      x: 780 + (wave - 14) * 200,
      y: 540,
      vx,
      vy,
      remaining: 1000,
      rawDamage: 0,
      effect: {
        mode: 'projectile',
        damage: 0,
        speed: 12,
        range: 1000,
        radius: 1,
        count: 1,
        spacingTicks: 0,
        splashRadius: 0,
        burnDamage: 0,
        burnTicks: 0,
      },
    });
  }
  await wait(
    async () => (await inspect(pages[0])).creepEffects.projectiles.length === 2,
    'server-owned projectile rendering',
  );
  await pages[0].waitForTimeout(550);
  const projectileSample = await pages[0].evaluate(() => ({
    presentation: window.__VOLAM__.presentation(),
    snapshot: window.__VOLAM__.snapshot(),
  }));
  const projectileView = projectileSample.presentation;
  for (const sprite of projectileView.creepEffects.projectiles) {
    const state = projectileSample.snapshot.state.projectiles[sprite.id];
    assert(state);
    assert(
      Math.abs(sprite.x - state.x) < 3 &&
        Math.abs(sprite.y - (state.y - 16)) < 3,
      'projectile follows authoritative location',
    );
    assert(
      Math.abs(sprite.rotation - Math.atan2(state.vy, state.vx)) < 0.001,
      'projectile orientation',
    );
    projectileFixture.observations.push({ sprite, state });
  }
  await shot(pages[0], 'arena-projectile-renderer-fixture.png');
  for (const id of ['qa_demon_projectile_14', 'qa_demon_projectile_15'])
    room.world.projectiles.delete(id);
  await wait(
    async () => (await inspect(pages[0])).creepEffects.projectiles.length === 0,
    'projectile cleanup',
  );
  mark('native scale, depth, projectile and ambient presentation');
  // Real controls and synchronized position in every profile, including two-player iteration.
  const movingHero = heroes.at(-1),
    movingPage = pages.at(-1),
    startX = movingHero.x;
  await movingPage.locator('#game canvas').focus();
  await movingPage.keyboard.down('ArrowRight');
  await movingPage.waitForTimeout(180);
  await movingPage.keyboard.up('ArrowRight');
  await wait(
    async () =>
      Object.values((await read(pages[0])).state.players).some(
        (h) => Math.abs(h.x - startX) > 8 && Math.abs(h.x - movingHero.x) < 3,
      ),
    'peer movement synchronization',
  );
  mark('authoritative peer movement');
  let naturalCombat = false;
  const ids = [...room.world.creeps.keys()];
  if (options.mode === 'full') {
    // Natural AI attacks/hits at unchanged stats. No fake combat messages or HP injection.
    for (const p of pages.slice(4)) {
      await p.locator('[data-menu=settings]').click();
      await p.locator('#dialog-content [data-menu=skills]').click();
      await p.getByLabel('Normal attack · A').selectOption('cai_bang_chuong');
      await p.keyboard.press('Escape');
    }
    const naturalStart = (await inspect(pages[0])).sceneTime;
    arrange([13, 14, 15, 16]);
    heroes.forEach((h, i) => {
      h.x = i < 4 ? 700 + i * 130 : 830 + (i - 4) * 130;
      h.y = i < 4 ? 660 : 735;
      h.fx = 0;
      h.fy = -1;
      h.moveX = 0;
      h.moveY = 0;
    });
    for (const e of room.world.creeps.values()) {
      e.statuses = [];
      e.actionUntil = room.world.tick;
      e.cooldown = room.world.tick;
      e.hurtUntil = 0;
      e.invasion.targetId = '';
      e.invasion.reacquireAt = 0;
      e.invasion.chaseOrigin = { x: e.x, y: e.y };
    }
    await wait(
      async () =>
        (await inspect(pages[0])).impacts
          .map((a) => a.id)
          .filter((a, i, v) => v.indexOf(a) === i).length === 4,
      'four real enemy impact types',
    );
    const afterAttacks = await read(pages[0]);
    assert(
      afterAttacks.events.some(
        (e) => e.abilityId === 'creep_strike' && e.kind === 'hit',
      ),
    );
    // Each real browser drives its own normal A key. A slow primary-page PNG must not
    // pause every player's input while authoritative enemy attacks keep advancing.
    await Promise.all(pages.map((p) => p.locator('#game canvas').focus()));
    const end = Date.now() + 30000;
    let driving = true;
    const alive = () =>
      ids.some((id) => (room.world.creeps.get(id)?.hp ?? 0) > 0);
    const drivers = pages.map(async (p) => {
      while (driving && Date.now() < end && alive()) {
        await p.keyboard.press('KeyA');
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    });
    try {
      await shot(pages[0], 'arena-natural-attacks.png');
      while (Date.now() < end && alive())
        await new Promise((resolve) => setTimeout(resolve, 100));
    } finally {
      driving = false;
      await Promise.all(drivers);
    }
    assert(
      ids.every((id) => (room.world.creeps.get(id)?.hp ?? 0) === 0),
      'all four enemies killed by real A commands',
    );
    await wait(
      async () => {
        const view = await inspect(pages[0]);
        return ids.every((id) =>
          ['hurt', 'death'].every((state) =>
            view.completedAnimations.some(
              (a) =>
                a.id === id &&
                a.at >= naturalStart &&
                a.key.includes(':' + state + ':'),
            ),
          ),
        );
      },
      'natural hurt and death animation completion',
      6000,
    );
    await shot(pages[0], 'arena-natural-deaths.png');
    const completed = await inspect(pages[0]);
    for (const id of ids) {
      assert(
        completed.completedAnimations.some(
          (a) =>
            a.id === id && a.at >= naturalStart && a.key.includes(':death:'),
        ),
        'natural death completes ' + id,
      );
      assert(
        completed.completedAnimations.some(
          (a) =>
            a.id === id && a.at >= naturalStart && a.key.includes(':hurt:'),
        ),
        'natural hurt completes ' + id,
      );
    }
    naturalCombat = true;
    mark('six-player natural combat, hurt, death and rewards');
  }
  const completed = await inspect(pages[0]);

  assert.equal(
    completed.creepEffects.contacts,
    0,
    'completed contact sprites cleaned',
  );
  assert.equal(
    completed.creepEffects.ambient.length,
    0,
    'walking ember sprites cleaned',
  );
  for (const effect of manifests.effects.filter(
    (e) =>
      e.texture === 'arena_creep_demon_fx' &&
      (naturalCombat || e.kind !== 'contact'),
  ))
    for (const frame of effect.frames)
      assert(
        completed.creepEffects.observedFrames.includes(
          'arena_creep_demon_fx:' + frame,
        ),
        'actual Phaser FX frame ' + frame,
      );
  const aState = await read(pages[0]),
    bState = await read(pages[1]);
  assert.equal(Object.keys(aState.state.players).length, options.players);
  for (const id of ids)
    assert.equal(
      aState.state.creeps[id]?.hp ?? 0,
      bState.state.creeps[id]?.hp ?? 0,
    );
  if (naturalCombat)
    assert(Object.values(aState.state.players).some((h) => h.xp > 0));
  assert.equal(JSON.stringify(room.simulation.invasion.definition), definition);
  for (const [wave, e] of saved)
    assert.equal(JSON.stringify(e.stats), sourceStats.get(wave));
  assert.equal(room.simulation.invasion.wave, 16);
  assert.equal(errors.length, 0, errors.join('\n'));
  const report = {
    status: 'PASS',
    fixture: `Actual ${options.players}-browser MatchRoom/ArenaScene. Director deadlines triggered in a server-owned fixture for Waves1–16; normal production180s cadence/stat recipes unmodified. Existing stun used only for deterministic pose coverage. ${naturalCombat ? 'Natural AI and real A inputs used for combat.' : 'FRAME ITERATION ONLY: no natural combat, contact-hit or reward verification; final six-player pass remains required.'}`,
    mode: options.mode,
    evidence: options.evidence,
    playerCount: options.players,
    sixClients: options.players === 6,
    naturalCombat,
    finalAcceptance: naturalCombat && !options.combatOnly,
    networkMovement: true,
    synchronizedHp: true,
    rewards: naturalCombat,
    all16Textures: true,
    controlledPoseFrames: Object.fromEntries(frameCoverage),
    poseEvidence,
    completed: completed.completedAnimations,
    impactEvents: completed.impacts,
    screenshots: shots,
    errors,
    recording: false,
    serverStatsUnchanged: true,
    productionWaveDefinitionUnchanged: true,
  };
  report.independentInstances = true;
  report.effects = completed.creepEffects;
  report.projectileFixture = projectileFixture;
  report.nativePixels = nativePixels;
  report.depthEvidence = depthEvidence;
  mark('final assertions');
  report.timings = timings;
  report.totalSeconds = Number(
    ((performance.now() - started) / 1000).toFixed(2),
  );
  writeFileSync(
    resolve(
      out,
      options.combatOnly
        ? 'combat_diagnostic.json'
        : 'integration_verification.json',
    ),
    JSON.stringify(arenaCreepSavedReport(report, options.evidence), null, 2) +
      '\n',
  );
  console.log(
    `PASS: ${options.players} clients, ${options.mode} profile, ${frameCoverage.size} animation tags; natural combat=${naturalCombat}; final acceptance=${report.finalAcceptance}; ${report.totalSeconds}s.`,
  );
} catch (e) {
  failed = true;
  const p = contexts[0]?.pages()[0];
  const diagnostics = p
    ? { snapshot: await read(p), presentation: await inspect(p) }
    : {};
  if (p) await shot(p, 'arena-failure.png');
  writeFileSync(
    resolve(out, 'failure.json'),
    JSON.stringify(
      {
        error: String(e),
        stack: e.stack,
        errors,
        screenshots: shots,
        ...diagnostics,
      },
      null,
      2,
    ),
  );
  throw e;
} finally {
  for (const c of contexts) await c.close();
  await browser?.close();
  await client?.close();
  await server?.shutdown();
  if (failed) process.exitCode = 1;
}
