import { ColyseusTestServer } from '@colyseus/testing';
import { createServer, preview } from 'vite';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
import { experienceAtLevel, gainExperience } from '@volam/game-core';
import {
  qaSession,
  requireFreePorts,
  verifyQaIdentity,
  qaIdentityPlugin,
  ownedQaServices,
} from './qa-session.mjs';
import { waitForQa, requireQaActor } from './qa-wait.mjs';
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
const production = process.env.VOLAM_QA_ARENA_PRODUCTION === '1';
if (production) process.env.NODE_ENV = 'production';
const options = arenaCreepQaOptions(process.argv.slice(2));
const session = qaSession({
  profile: 'arena-creeps',
  serverPort: 2588,
  clientPort: 5186,
});
process.env.VOLAM_QA_RUN_ID = session.runId;
const owned = ownedQaServices();
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
const wait = (fn, label, timeout = 12000) =>
  waitForQa(fn, label, {
    timeout,
    diagnostics: async () => {
      const page = contexts[0]?.pages()[0];
      if (!page) return { errors: errors.slice(-8) };
      const { state } = await read(page);
      const view = await inspect(page);
      return {
        errors: errors.slice(-8),
        phase: state?.phase,
        tick: state?.tick,
        creeps: view.actors
          .filter((a) => a.wave)
          .map(({ id, animation, pose, frame, hp }) => ({
            id,
            animation,
            pose,
            frame,
            hp,
          }))
          .slice(0, 16),
      };
    },
  });
const read = (p) => p.evaluate(() => window.__VOLAM__.snapshot()),
  inspect = (p) => p.evaluate(() => window.__VOLAM__.presentation());
const shot = async (p, n) => {
  if (!shouldCaptureArenaCreepPng(options, n)) return;
  await p.screenshot({ path: resolve(out, n) });
  shots.push(n);
};
try {
  await requireFreePorts(session);
  const gameServer = createGameServer();
  await gameServer.listen(session.serverPort);
  server = new ColyseusTestServer(gameServer);
  owned.add(() => server.shutdown());
  await verifyQaIdentity(`${session.serverUrl}/health`, {
    service: 'volam-game-server',
    runId: session.runId,
    protocolVersion: PROTOCOL_VERSION,
  });
  const vite = {
    root: resolve(root, 'apps/game-client'),
    configFile: false,
    cacheDir: session.cacheDir,
    plugins: [qaIdentityPlugin(session)],
  };
  const address = {
    host: '127.0.0.1',
    port: session.clientPort,
    strictPort: true,
  };
  if (production) {
    client = await preview({ ...vite, preview: address });
    owned.add(() => client.close());
    await verifyQaIdentity(`${session.clientUrl}/volam-build-endpoint.json`, {
      serverUrl: session.serverUrl,
    });
  } else {
    client = await createServer({
      ...vite,
      server: { ...address, watch: null, hmr: false },
      define: {
        'import.meta.env.VITE_SERVER_URL': JSON.stringify(session.serverUrl),
      },
    });
    owned.add(() => client.close());
    await client.listen();
  }
  await verifyQaIdentity(`${session.clientUrl}/__volam_qa_identity`, {
    service: 'volam-qa-client',
    runId: session.runId,
    serverUrl: session.serverUrl,
  });
  mark('owned service startup');
  browser = await chromium.launch({ headless: true });
  mark('browser launch');
  const pages = [];
  let roomId;
  for (let n = 0; n < options.players; n++) {
    const context = await browser.newContext({
      viewport:
        n === 0 ? { width: 1920, height: 1080 } : { width: 960, height: 640 },
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
    // The original atlas assertions run against the retained renderer. Two
    // peers in the full match also verify the default production contact art.
    const modern = options.mode === 'full' && n >= options.players - 2;
    await p.goto(
      session.clientUrl +
        (modern ? '/?debug=1' : '/?debug=1&renovationSkills=old'),
      {
        waitUntil: 'domcontentloaded',
      },
    );
    await p.locator('#pregame [data-action=play]').click();
    await p.locator('#pre-nickname').fill('Creep QA ' + (n + 1));
    await p.getByRole('button', { name: 'Vào game', exact: true }).click();
    if (roomId) {
      await p
        .locator('#pregame')
        .getByLabel('Mã phòng', { exact: true })
        .fill(roomId);
      await p.getByRole('button', { name: 'Vào bằng mã', exact: true }).click();
    } else
      await p.getByRole('button', { name: 'Tạo phòng', exact: true }).click();
    await waitForQa(
      async () => {
        const state = await read(p);
        if (state.roomId && roomId && state.roomId !== roomId)
          throw Error(
            `Client ${n + 1} joined wrong room ${state.roomId}, expected ${roomId}`,
          );
        if (state.roomId && state.state?.players?.[state.sessionId])
          return true;
        return false;
      },
      `client ${n + 1} authoritative room join`,
      {
        diagnostics: async () => ({
          snapshot: await read(p),
          notice: await p.locator('.pre-error').textContent(),
          errors: errors.slice(-8),
        }),
      },
    );
    roomId ??= (await read(p)).roomId;
  }
  const room = server.getRoomById(roomId);
  const acknowledge = (page, selector, ready) =>
    waitForQa(
      async () => {
        if (ready()) return true;
        await page.evaluate((selector) => {
          const button = document.querySelector(selector);
          if (button && !button.disabled) button.click();
        }, selector);
        return ready();
      },
      'server lobby ' + selector,
      {
        timeout: 45000,
        interval: 250,
        diagnostics: () =>
          page.evaluate(() => ({
            phase: window.__VOLAM__.snapshot().state?.phase,
            error: document.querySelector('.pre-error')?.textContent,
            confirm: document.querySelector('[data-action=confirm]')
              ?.textContent,
          })),
      },
    );
  await acknowledge(
    pages[0],
    '#pregame [data-action=start]',
    () => room.state.phase === 'SCHOOL_SELECTION',
  );
  for (const [index, page] of pages.entries()) {
    const { sessionId } = await read(page);
    const player = room.state.players.get(sessionId);
    assert(player);
    const branch = index < 4 ? 'cai_bang_bong' : 'cai_bang_chuong';
    await acknowledge(
      page,
      '#pregame [data-school=cai_bang]',
      () => player.schoolId === 'cai_bang',
    );
    await acknowledge(
      page,
      `#pregame [data-branch=${branch}]`,
      () => player.selectedBranch === branch,
    );
    await acknowledge(
      page,
      '#pregame [data-action=confirm]',
      () => player.confirmed,
    );
  }
  for (const page of pages) {
    await wait(
      async () =>
        (await read(page)).state.phase === 'IN_GAME' &&
        (await inspect(page)).ready,
      'authoritative match and Phaser ready',
      30000,
    );
  }
  const retainedPeers = options.mode === 'full' ? pages.slice(0, -2) : pages;
  // The legacy skill query alone still uses rotated/high-resolution creep bodies.
  // Bind the original atlas audit to the retained Phaser renderer in these peers.
  await Promise.all(
    retainedPeers.map((page) =>
      page.evaluate(
        () =>
          new Promise((ready) => {
            window.__VOLAM__.afterRender((renderer) => {
              renderer.game.registry.set('renovation-enabled', false);
              ready();
            });
          }),
      ),
    ),
  );
  mark(`${options.players} browser clients joined and ready`);
  const definition = JSON.stringify(room.simulation.invasion.definition),
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
  // The director now streams each wave. The gallery owns the captured actors
  // and should not keep spawning the rest of those sixteen streams behind them.
  room.simulation.invasion.streams.length = 0;
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
  const holdFixturePose = (e) => {
    e.controlled = true;
    e.statuses = [];
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
      holdFixturePose(e);
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
  const waitForWaves = (waves) =>
    wait(
      async () => {
        const actors = (await inspect(pages[0])).actors.filter((a) => a.wave);
        return (
          actors.length === waves.length &&
          waves.every((wave) => actors.some((a) => a.wave === wave))
        );
      },
      'rendered authoritative waves ' + waves.join(','),
    );
  await shot(pages[0], 'arena-waves-01-16.png');
  if (options.mode === 'full') {
    arrange(Array.from({ length: 8 }, (_, i) => i + 1));
    await waitForWaves(Array.from({ length: 8 }, (_, i) => i + 1));
    await shot(pages[0], 'arena-waves-01-08.png');
    arrange([9, 10, 11, 12]);
    await waitForWaves([9, 10, 11, 12]);
    await shot(pages[0], 'arena-waves-09-12.png');
  }
  const manifests = JSON.parse(
    readFileSync('assets/arena_creeps.manifest.json', 'utf8'),
  );
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
  holdFixturePose(sameWavePeer);
  room.world.creeps.set(sameWavePeer.id, sameWavePeer);
  await wait(async () => {
    const a = (await inspect(pages[0])).actors;
    return (
      a.some(
        (v) => v.id === saved.get(13).id && v.animation?.endsWith(':idle:down'),
      ) &&
      a.some(
        (v) => v.id === sameWavePeer.id && v.animation?.endsWith(':walk:right'),
      )
    );
  }, 'independent same-texture actors');
  const ember = manifests.effects.find(
    (effect) => effect.id === 'demon_hound_embers',
  );
  assert(ember);
  await wait(async () => {
    const { observedFrames } = (await inspect(pages[0])).creepEffects;
    return ember.frames.every((frame) =>
      observedFrames.includes(ember.texture + ':' + frame),
    );
  }, 'all walking ember cels before removing the walking actor');
  await shot(pages[0], 'arena-independent-instances.png');
  mark('director fixtures and existing-art regression gallery');
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
              .every((a) => a.animation?.endsWith(':idle:down')),
          'idle transition',
        );
      }
    }
  }
  mark('all authored directional frames and complete animation cycles');
  // Inspect the same production actors at native pixels and across the current arena statue.
  arrange([13, 14, 15, 16], 'idle', 'down');
  await pages[0].setViewportSize({ width: 900, height: 560 });
  await wait(
    async () =>
      pages[0]
        .locator('#game canvas')
        .evaluate(
          (c) => c.width === c.getBoundingClientRect().width && c.width > 0,
        ),
    'native viewport resize',
  );
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
  const { x: statueX, y: statueY } = room.world.statue;
  heroes[0].x = statueX - 100;
  heroes[0].y = statueY + 70;
  arrange([16]);
  const brute = saved.get(16);
  brute.x = statueX;
  brute.y = statueY - 28;
  const waitForBruteY = (y) =>
    wait(async () => {
      const actor = (await inspect(pages[0])).actors.find(
        (a) => a.id === brute.id,
      );
      return !!actor && Math.abs(actor.y - y) < 1;
    }, 'authoritative brute Y=' + y);
  await waitForBruteY(statueY - 28);
  const behind = await inspect(pages[0]);
  const statue = behind.trees.find((t) => t.x === statueX && t.y === statueY);
  assert(statue);
  assert(behind.actors.find((a) => a.id === brute.id).depth < statue.depth);
  await shot(pages[0], 'arena-brute-behind-statue.png');
  brute.y = statueY + 50;
  await waitForBruteY(statueY + 50);
  const front = await inspect(pages[0]);
  assert(front.actors.find((a) => a.id === brute.id).depth > statue.depth);
  await shot(pages[0], 'arena-brute-in-front-of-statue.png');
  const depthEvidence = {
    statue,
    behind: behind.actors.find((a) => a.id === brute.id),
    front: front.actors.find((a) => a.id === brute.id),
  };
  Object.assign(heroes[0], home);
  await wait(async () => {
    const state = await read(pages[0]);
    return Math.abs(state.state.players[state.sessionId].x - home.x) < 1;
  }, 'hero position restored');
  // Isolated renderer contract: server-owned non-damaging projectiles. Normal creep AI remains melee.
  arrange([13, 14, 15, 16], 'idle', 'down');
  await waitForWaves([13, 14, 15, 16]);
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
  const projectileTick = (await read(pages[0])).state.tick;
  let projectileSample;
  await wait(async () => {
    // A network patch may arrive between game frames. Inspect the snapshot
    // after Phaser has rendered that update, rather than in an arbitrary CDP turn.
    projectileSample = await pages[0].evaluate(
      () =>
        new Promise((resolve) => {
          const debug = window.__VOLAM__;
          debug.afterRender(() =>
            resolve({
              presentation: debug.presentation(),
              snapshot: debug.snapshot(),
            }),
          );
        }),
    );
    return (
      projectileSample.snapshot.state.tick > projectileTick + 1 &&
      projectileSample.presentation.creepEffects.projectiles.length === 2
    );
  }, 'rendered authoritative projectile advancement');
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
  const projectileEffects = manifests.effects.filter(
    (effect) =>
      effect.texture === 'arena_creep_demon_fx' && effect.kind === 'projectile',
  );
  assert.equal(projectileEffects.length, 2);
  await wait(async () => {
    const { observedFrames } = (await inspect(pages[0])).creepEffects;
    return projectileEffects.every((effect) =>
      effect.frames.every((frame) =>
        observedFrames.includes(effect.texture + ':' + frame),
      ),
    );
  }, 'all projectile cels before removing the projectiles');
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
  try {
    await movingPage.keyboard.down('ArrowRight');
    await wait(
      () =>
        requireQaActor(
          room.world.heroes.get(movingHero.id),
          movingHero.id,
          'arena',
          room.simulation.zoneOf(movingHero.id)?.id,
        ).x >
        startX + 8,
      'authoritative movement',
    );
  } finally {
    await movingPage.keyboard.up('ArrowRight');
  }
  await wait(
    async () =>
      Object.values((await read(pages[0])).state.players).some(
        (h) => Math.abs(h.x - startX) > 8 && Math.abs(h.x - movingHero.x) < 3,
      ),
    'peer movement synchronization',
  );
  mark('authoritative peer movement');
  let naturalCombat = false;
  let productionContacts;
  let startingXp;
  const ids = [...room.world.creeps.keys()];
  if (options.mode === 'full') {
    // Natural AI attacks/hits at unchanged stats. No fake combat messages or HP injection.
    assert.deepEqual(
      heroes.map((h) => h.basicId),
      [
        'cai_bang_bong',
        'cai_bang_bong',
        'cai_bang_bong',
        'cai_bang_bong',
        'cai_bang_chuong',
        'cai_bang_chuong',
      ],
    );
    for (const h of heroes)
      requireQaActor(
        room.world.heroes.get(h.id),
        h.id,
        'arena',
        room.simulation.zoneOf(h.id)?.id,
      );
    const modernPeers = pages.slice(-2);
    await Promise.all(
      modernPeers.map((page) =>
        page.evaluate(
          () =>
            new Promise((ready) => {
              const debug = window.__VOLAM__;
              debug.afterRender((renderer) => {
                const scene = renderer.game.scene.scenes.find(
                  (s) => typeof s.combat === 'function',
                );
                const pending = new Map();
                const drawn = new Map();
                const combat = scene.combat;
                scene.combat = function (hit) {
                  const candidate =
                    hit.kind === 'hit' &&
                    hit.abilityId === 'cai_bang_bong' &&
                    hit.damage > 0;
                  const before = candidate
                    ? new Set(scene.children.list)
                    : undefined;
                  combat.call(this, hit);
                  if (!before) return;
                  const sprite = scene.children.list.find(
                    (node) =>
                      !before.has(node) &&
                      node.texture?.key === 'contact-impacts-v01',
                  );
                  if (sprite) pending.set(sprite, hit);
                };
                const observe = () => {
                  const rendered = new Set(scene.cameras.main.renderList);
                  for (const [sprite, hit] of pending) {
                    if (!sprite.scene) pending.delete(sprite);
                    else if (
                      rendered.has(sprite) &&
                      sprite.visible &&
                      sprite.alpha > 0
                    ) {
                      const sample = drawn.get(hit.id) ?? {
                        ...hit,
                        frames: [],
                      };
                      if (!sample.frames.includes(sprite.frame.name))
                        sample.frames.push(sprite.frame.name);
                      drawn.set(hit.id, sample);
                    }
                  }
                  debug.afterRender(observe);
                };
                window.__arenaQaContacts = () => [...drawn.values()];
                debug.afterRender(observe);
                ready();
              });
            }),
        ),
      ),
    );
    // All six clients stay active. Use a regular-sized viewport for live
    // animation observations so six software renderers can keep their cadence.
    await pages[0].setViewportSize({ width: 960, height: 640 });
    const naturalStart = await Promise.all(
      retainedPeers.map(async (p) => (await inspect(p)).sceneTime),
    );
    const naturalAnimations = async () =>
      (
        await Promise.all(
          retainedPeers.map((p) =>
            p.evaluate(
              () => window.__VOLAM__.presentation().completedAnimations,
            ),
          ),
        )
      ).flatMap((animations, i) =>
        animations.filter((a) => a.at >= naturalStart[i]),
      );
    const phaseObserved = (animations, id, phase) =>
      animations.some((a) => a.id === id && a.key.includes(':' + phase + ':'));
    arrange([13, 14, 15, 16]);
    const config = room.simulation.zoneOf(heroes[0].id).config;
    const partyLevel = config.campaign?.targets[2] ?? 18;
    for (const h of heroes)
      gainExperience(h, experienceAtLevel(partyLevel, config) - h.xp, config);
    startingXp = new Map(heroes.map((h) => [h.id, h.xp]));
    heroes.forEach((h, i) => {
      h.x = i < 4 ? 700 + i * 130 : 830 + (i - 4) * 130;
      h.y = i < 4 ? 660 : 735;
      h.fx = 0;
      h.fy = -1;
      h.moveX = 0;
      h.moveY = 0;
    });
    for (const e of room.world.creeps.values()) {
      e.controlled = false;
      e.statuses = [];
      e.actionUntil = room.world.tick;
      e.cooldown = room.world.tick;
      e.hurtUntil = 0;
      e.invasion.targetId = '';
      e.invasion.reacquireAt = 0;
      e.invasion.chaseOrigin = { x: e.x, y: e.y };
      const runtime = room.world.creepCombat?.actors.get(e.id);
      assert(runtime);
      // Exercise the ordinary attack route from all four creeps, including
      // the imp whose self-destructing special otherwise preempts a player kill.
      runtime.nextSpecial = room.world.tick + 90 * config.tickRate;
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
        (e) =>
          e.kind === 'hit' &&
          /^creep_wave_(13|14|15|16)_basic$/.test(e.abilityId),
      ),
    );
    // Each real browser drives its own normal A key. A slow primary-page PNG must not
    // pause every player's input while authoritative enemy attacks keep advancing.
    await Promise.all(pages.map((p) => p.locator('#game canvas').focus()));
    // Observe one complete hurt animation per target before the simultaneous
    // attacks can legitimately interrupt it with death.
    const injured = [...room.world.creeps.values()];
    const previousCooldowns = injured.map((e) => e.cooldown);
    for (const e of injured)
      e.cooldown = room.world.tick + 15 * config.tickRate;
    await wait(
      () => injured.every((e) => e.pose === 'idle' || e.pose === 'walk'),
      'ordinary enemy windups have finished',
    );
    for (const [index, e] of injured.entries()) {
      const hp = e.hp;
      await pages[index].keyboard.press('KeyA');
      await wait(() => e.hp > 0 && e.hp < hp, 'real nonlethal A on ' + e.id);
      await wait(
        async () => phaseObserved(await naturalAnimations(), e.id, 'hurt'),
        'natural hurt animation completes on ' + e.id,
      );
    }
    for (const [index, e] of injured.entries())
      e.cooldown = previousCooldowns[index];

    const end = Date.now() + 70000;
    const finalCombatTick = room.world.tick + 30 * config.tickRate;
    let driving = true;
    const alive = () =>
      ids.some((id) => (room.world.creeps.get(id)?.hp ?? 0) > 0);
    const drivers = pages.map(async (p, index) => {
      const h = heroes[index];
      while (
        driving &&
        Date.now() < end &&
        room.world.tick < finalCombatTick &&
        alive()
      ) {
        requireQaActor(
          room.world.heroes.get(h.id),
          h.id,
          'arena',
          room.simulation.zoneOf(h.id)?.id,
        );
        const before = h.lastSequence;
        await p.keyboard.press('KeyA');
        await wait(
          () => {
            requireQaActor(
              room.world.heroes.get(h.id),
              h.id,
              'arena',
              room.simulation.zoneOf(h.id)?.id,
            );
            return !alive() || h.lastSequence > before;
          },
          'A input acknowledgement ' + h.id,
          3000,
        );
        await wait(
          () => {
            requireQaActor(
              room.world.heroes.get(h.id),
              h.id,
              'arena',
              room.simulation.zoneOf(h.id)?.id,
            );
            return !alive() || h.cooldown <= room.world.tick;
          },
          'authoritative A cooldown ' + h.id,
          3000,
        );
      }
    });
    // Attach rejection handling immediately, while PNG capture is still in flight.
    let driverError;
    const driven = Promise.allSettled(
      drivers.map((driver) =>
        driver.catch((error) => {
          driverError ??= error;
          driving = false;
          throw error;
        }),
      ),
    );
    try {
      await shot(pages[0], 'arena-natural-attacks.png');
      await wait(
        () => {
          if (driverError) throw driverError;
          assert(
            !alive() || room.world.tick < finalCombatTick,
            'four A kills within 30 simulation seconds',
          );
          for (const h of heroes)
            requireQaActor(
              room.world.heroes.get(h.id),
              h.id,
              'arena',
              room.simulation.zoneOf(h.id)?.id,
            );
          return !alive();
        },
        'all four enemies killed by real A commands',
        Math.max(1, end - Date.now()),
      );
    } finally {
      driving = false;
      await driven;
    }
    assert(
      ids.every((id) => (room.world.creeps.get(id)?.hp ?? 0) === 0),
      'all four enemies killed by real A commands',
    );
    await wait(async () => {
      const animations = await naturalAnimations();
      return ids.every((id) =>
        ['hurt', 'death'].every((phase) =>
          phaseObserved(animations, id, phase),
        ),
      );
    }, 'natural hurt and death animation completion');
    await shot(pages[0], 'arena-natural-deaths.png');
    await wait(async () => {
      const [first, second] = await Promise.all(
        modernPeers.map((p) => p.evaluate(() => window.__arenaQaContacts())),
      );
      const pairs = first.filter(
        (hit) =>
          ids.includes(hit.targetId) &&
          second.some(
            (peer) =>
              peer.id === hit.id &&
              peer.targetId === hit.targetId &&
              peer.damage === hit.damage,
          ),
      );
      if (!pairs.length) return false;
      productionContacts = { matchedHits: pairs.length, example: pairs[0] };
      return true;
    }, 'default renderer draws the same server-confirmed contact on two peers');
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
    assert(
      Object.entries(aState.state.players).some(
        ([id, h]) => h.xp > startingXp.get(id),
      ),
    );
  assert.equal(JSON.stringify(room.simulation.invasion.definition), definition);
  for (const [wave, e] of saved)
    assert.equal(JSON.stringify(e.stats), sourceStats.get(wave));
  assert.equal(room.simulation.invasion.wave, 16);
  assert.equal(errors.length, 0, errors.join('\n'));
  const report = {
    status: 'PASS',
    runId: session.runId,
    services: { client: session.clientUrl, server: session.serverUrl },
    production,
    productionContacts,
    fixture: `Actual ${options.players}-browser MatchRoom/ArenaScene. Director deadlines triggered in a server-owned fixture for Waves1–16; normal production180s cadence/stat recipes unmodified. Controlled enemies are used only to pose the gallery. ${naturalCombat ? 'A level-appropriate party uses real A inputs against live AI. Special cooldowns isolate the ordinary enemy attack route.' : 'FRAME ITERATION ONLY: no natural combat, contact-hit or reward verification; final six-player pass remains required.'}`,
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
  const diagnostics = {};
  if (p && !p.isClosed()) {
    for (const [key, operation] of [
      ['snapshot', () => read(p)],
      ['presentation', () => inspect(p)],
      ['capture', () => shot(p, 'arena-failure.png')],
    ]) {
      try {
        diagnostics[key] = await operation();
      } catch (error) {
        diagnostics[key] = String(error);
      }
    }
  }
  writeFileSync(
    resolve(out, 'failure.json'),
    JSON.stringify(
      {
        error: String(e),
        stack: e.stack,
        runId: session.runId,
        timings,
        totalSeconds: (performance.now() - started) / 1000,
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
  try {
    await Promise.allSettled(contexts.map((c) => c.close()));
    await browser?.close();
  } finally {
    await owned.close();
  }
  if (failed) process.exitCode = 1;
}
