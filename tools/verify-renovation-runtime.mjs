import { ColyseusTestServer } from '@colyseus/testing';
import { createServer, preview } from 'vite';
import { createGameServer } from '../apps/game-server/dist/app.config.js';
import { PROTOCOL_VERSION } from '@volam/game-protocol';
import {
  creepDungeons,
  bacCaiDefinition,
  vuongDefinition,
  namDeDefinition,
} from '@volam/game-data';
import {
  addCreep,
  BacCaiEncounter,
  VuongEncounter,
  initializeNamDe,
  spawnNamDeIfReady,
} from '@volam/game-core';
import {
  qaSession,
  requireFreePorts,
  verifyQaIdentity,
  qaIdentityPlugin,
  ownedQaServices,
} from './qa-session.mjs';
import { waitForQa } from './qa-wait.mjs';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { verifyRenovationSkills } from './verify-renovation-skills.mjs';
import { startTogether } from '../tests/e2e/pregame-helper.ts';

/** Normal entry point, real Colyseus room. Fixtures are server-side and labelled. */
export async function verifyRenovationRuntime(
  browser,
  {
    players = 6,
    development = false,
    onReady,
    onSelection,
    evidenceDir,
    clientQuery = '',
  } = {},
) {
  const session = qaSession({
    profile: 'renovation-runtime',
    serverPort: 2926,
    clientPort: 5529,
  });
  const owned = ownedQaServices(),
    contexts = [],
    errors = [],
    report = {
      players,
      development,
      protocol: PROTOCOL_VERSION,
      timings: [],
      directions: [],
      scenes: [],
      fixtures:
        'Server-owned wave placement/zone entry for coverage; natural keyboard combat and movement checked separately.',
    };
  const out = resolve(evidenceDir ?? 'docs/evidence/renovation-v2');
  mkdirSync(out, { recursive: true });
  let last = performance.now();
  const mark = (phase) => {
    const now = performance.now();
    report.timings.push({ phase, seconds: +((now - last) / 1000).toFixed(2) });
    last = now;
    console.log('[renovation] ' + phase);
  };
  const read = (p) => p.evaluate(() => window.__VOLAM__.snapshot());
  const inspect = (p) => p.evaluate(() => window.__VOLAM__.presentation());
  const wait = (fn, label) =>
    waitForQa(fn, label, {
      timeout: 15000,
      diagnostics: async () => {
        const v = contexts[0]?.pages()[0]
          ? await inspect(contexts[0].pages()[0])
          : undefined;
        return {
          errors: errors.slice(-8),
          zone: v?.zoneId,
          bodies: v?.renovation?.bodies
            .filter((b) => b.visible)
            .map((b) => ({
              id: b.id,
              pose: b.pose,
              texture: b.texture,
              scale: b.scale,
            })),
        };
      },
    });
  const previousRun = process.env.VOLAM_QA_RUN_ID,
    previousEnv = process.env.NODE_ENV;
  try {
    await requireFreePorts(session);
    process.env.VOLAM_QA_RUN_ID = session.runId;
    process.env.NODE_ENV = 'development';
    const gameServer = createGameServer();
    await gameServer.listen(session.serverPort);
    const server = new ColyseusTestServer(gameServer);
    owned.add(() => server.shutdown());
    await verifyQaIdentity(session.serverUrl + '/health', {
      runId: session.runId,
      protocolVersion: PROTOCOL_VERSION,
    });
    const options = {
      root: resolve('apps/game-client'),
      configFile: false,
      plugins: [qaIdentityPlugin(session)],
    };
    const client = development
      ? await createServer({
          ...options,
          server: {
            host: '127.0.0.1',
            port: session.clientPort,
            strictPort: true,
            hmr: false,
            watch: null,
          },
          define: {
            'import.meta.env.VITE_SERVER_URL': JSON.stringify(
              session.serverUrl,
            ),
          },
        })
      : await preview({
          ...options,
          preview: {
            host: '127.0.0.1',
            port: session.clientPort,
            strictPort: true,
          },
        });
    if (development) await client.listen();
    owned.add(() => client.close());
    if (!development)
      await verifyQaIdentity(session.clientUrl + '/volam-build-endpoint.json', {
        serverUrl: session.serverUrl,
      });
    const pages = [];
    let roomId;
    for (let i = 0; i < players; i++) {
      const context = await browser.newContext({
        viewport: { width: 1366, height: 768 },
        deviceScaleFactor: 1,
      });
      contexts.push(context);
      const page = await context.newPage();
      pages.push(page);
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      page.on('response', (r) => {
        if (r.status() >= 400) errors.push(r.status() + ' ' + r.url());
      });
      await page.goto(
        session.clientUrl +
          '/?debug=1' +
          clientQuery +
          (i === 1 ? '&renovationSkills=old' : ''),
      );
      await page.locator('#pre-nickname').fill('Renovation ' + (i + 1));
      await page.getByRole('button', { name: 'Vào game', exact: true }).click();
      if (roomId) {
        await page
          .locator('#pregame')
          .getByLabel('Mã phòng', { exact: true })
          .fill(roomId);
        await page
          .getByRole('button', { name: 'Vào bằng mã', exact: true })
          .click();
      } else
        await page
          .getByRole('button', { name: 'Tạo phòng', exact: true })
          .click();
      await wait(async () => (await read(page)).roomId, 'room join ' + i);
      roomId ??= (await read(page)).roomId;
    }
    await pages[0]
      .getByRole('button', { name: 'Bắt đầu', exact: true })
      .click();
    const schools = [
      'vo_dang',
      'cai_bang',
      'thien_son',
      'thieu_lam',
      'vo_dang',
      'cai_bang',
    ];
    if (onSelection) await onSelection({ page: pages[0], pages, out });
    await startTogether(pages, schools, 30000, true);
    for (const page of pages)
      await wait(
        async () => (await inspect(page)).ready,
        'normal Phaser ready',
      );
    const room = server.getRoomById(roomId),
      heroes = [...room.world.heroes.values()],
      page = pages[0],
      peer = pages[1];
    assert.equal(heroes.length, players);
    mark(players + ' real clients ready');
    if (onReady) {
      const result = await onReady({ room, pages, out, report });
      assert.deepEqual(errors, []);
      return result;
    }
    // Server-acknowledged keyboard movement, four authored cels per direction, peer sync.
    room.world.creeps.clear();
    room.simulation.invasion.nextWaveTick = room.world.tick + 100000;
    heroes.forEach((h, i) =>
      Object.assign(h, {
        x: 700 + (i % 3) * 110,
        y: 700 + Math.floor(i / 3) * 110,
      }),
    );
    await wait(
      async () =>
        Math.abs((await read(page)).state.players[heroes[0].id].x - 700) < 1,
      'fixture placement acknowledged',
    );
    await page.locator('#game canvas').focus();
    for (const [direction, key, axis, sign] of [
      ['down', 'ArrowDown', 'y', 1],
      ['left', 'ArrowLeft', 'x', -1],
      ['right', 'ArrowRight', 'x', 1],
      ['up', 'ArrowUp', 'y', -1],
    ]) {
      const before = (await read(page)).state.players[heroes[0].id][axis];
      await page.keyboard.down(key);
      await wait(async () => {
        const v = (await inspect(page)).renovation;
        return (
          v.bodies.some(
            (b) =>
              b.name === 'actor:' + heroes[0].id &&
              b.pose === 'walk' &&
              b.direction === direction,
          ) &&
          (v.observed.hero_vo_dang ?? []).filter((f) =>
            f.includes('walk_' + direction + '_'),
          ).length === 4
        );
      }, 'four walk cels ' + direction);
      await page.keyboard.up(key);
      await wait(
        async () =>
          (await read(page)).state.players[heroes[0].id].pose === 'idle',
        'idle ' + direction,
      );
      const state = (await read(page)).state.players[heroes[0].id];
      assert((state[axis] - before) * sign > 10);
      await wait(
        async () =>
          Math.abs(
            (await read(peer)).state.players[heroes[0].id][axis] - state[axis],
          ) < 1,
        'peer position ' + direction,
      );
      report.directions.push({ direction, from: before, to: state[axis] });
    }
    const pixels = await page.locator('#game canvas').evaluate((c) => ({
      width: c.width,
      height: c.height,
      display: c.getBoundingClientRect().width,
    }));
    assert.equal(pixels.width, pixels.display);
    report.nativeCanvas = pixels;
    const layout = (await inspect(page)).renovation.environment;
    assert.deepEqual(
      layout
        .filter((o) => o.name !== 'arena:ground')
        .map((o) => o.name)
        .sort(),
      ['art01:lantern:left', 'art01:lantern:right', 'art01:statue_male'],
    );
    assert.equal((await inspect(page)).zoom, 2);
    report.arenaLayout = layout;
    await page.screenshot({ path: resolve(out, 'normal-arena.png') });
    mark('four-direction keyboard movement and peer sync');
    // Real wave director generates each original stat block. Only positions/pose held for art review.
    const saved = [];
    for (let wave = 1; wave <= 20; wave++) {
      room.simulation.invasion.nextWaveTick = room.world.tick + 1;
      room.simulation.step();
      const e = [...room.world.creeps.values()].find(
        (e) => e.invasion?.wave === wave,
      );
      assert(e, 'director wave ' + wave);
      saved.push(e);
      room.world.creeps.clear();
    }
    room.simulation.invasion.nextWaveTick = room.world.tick + 100000;
    const hold = (e, pose = 'idle') => {
      e.statuses = [
        {
          kind: 'stun',
          sourceId: 'qa_server_fixture',
          abilityId: 'qa_pose',
          durationTicks: 10000,
          magnitude: 1,
          until: room.world.tick + 10000,
        },
      ];
      e.actionUntil = room.world.tick + 10000;
      e.cooldown = room.world.tick + 10000;
      e.pose = pose;
      e.hurtUntil = 0;
    };
    report.waveCoverage = [];
    for (let start = 0; start < 20; start += 5) {
      room.world.creeps.clear();
      const group = saved.slice(start, start + 5);
      group.forEach((e, i) => {
        Object.assign(e, { x: 560 + i * 110, y: 580, fx: 0, fy: 1 });
        hold(e, 'walk');
        room.world.creeps.set(e.id, e);
      });
      await wait(
        async () => {
          const v = (await inspect(page)).renovation;
          return group.every((e) =>
            v.bodies.some(
              (b) =>
                b.name === 'actor:' + e.id &&
                b.texture.startsWith('renovated-'),
            ),
          );
        },
        'wave art ' + (start + 1),
      );
      await wait(
        async () => {
          const observed = (await inspect(page)).renovation.observed;
          const ids = (await inspect(page)).renovation.bodies
            .filter((b) => group.some((e) => b.name === 'actor:' + e.id))
            .map((b) => b.id);
          return (
            ids.length === group.length &&
            ids.every(
              (id) =>
                (observed[id] ?? []).filter((f) =>
                  f.startsWith('renovated-' + id + ':walk_down_'),
                ).length === 4,
            )
          );
        },
        'wave frames ' + (start + 1),
      );
      report.waveCoverage.push(
        ...(await inspect(page)).renovation.bodies
          .filter(
            (b) => b.name.startsWith('actor:') && b.id.startsWith('creep_'),
          )
          .map((b) => b.id),
      );
    }
    assert.equal(new Set(report.waveCoverage).size, 20);
    room.world.creeps.clear();
    mark('20 wave identities in normal renderer');
    // Natural A inputs: original weapon logic, damage, death and reward replication.
    const enemy = saved[0];
    Object.assign(enemy, {
      x: heroes[0].x,
      y: heroes[0].y + 36,
      hp: enemy.maxHp,
    });
    hold(enemy);
    room.world.creeps.set(enemy.id, enemy);
    heroes[0].fx = 0;
    heroes[0].fy = 1;
    heroes[1].x = heroes[0].x + 20;
    heroes[1].y = heroes[0].y;
    heroes[1].fx = 0;
    heroes[1].fy = 1;
    const rewards = heroes.map((h) => ({
      xp: h.progression?.xp ?? h.xp ?? 0,
      gold: h.gold ?? 0,
    }));
    await page.locator('#game canvas').focus();
    await peer.locator('#game canvas').focus();
    await page.keyboard.press('KeyQ');
    await wait(
      async () =>
        (await read(page)).events.some(
          (e) => e.sourceId === heroes[0].id && e.kind === 'cast',
        ),
      'retained Q server cast',
    );
    await wait(
      async () =>
        (await inspect(page)).renovation.bodies.some(
          (b) =>
            b.name === 'actor:' + heroes[0].id &&
            !b.locomotion &&
            !b.texture.startsWith('renovated-'),
        ),
      'retained authored Q body',
    );
    report.retainedSkill = (await read(page)).events.filter(
      (e) => e.sourceId === heroes[0].id && e.kind === 'cast',
    );
    await page.screenshot({ path: resolve(out, 'normal-retained-skill.png') });
    for (let i = 0; i < 16 && enemy.hp > 0; i++) {
      await Promise.all([
        page.keyboard.press('KeyA'),
        peer.keyboard.press('KeyA'),
      ]);
      await new Promise((r) => setTimeout(r, 650));
    }
    await wait(
      async () => (await read(page)).state.creeps[enemy.id]?.hp === 0,
      'natural enemy death',
    );
    const state = await read(page);
    report.combat = {
      enemyHp: enemy.hp,
      events: state.events.filter((e) => ['hit', 'death'].includes(e.kind)),
      before: rewards,
      after: heroes.map((h) => ({
        xp: h.progression?.xp ?? h.xp ?? 0,
        gold: h.gold ?? 0,
      })),
    };
    assert(enemy.hp <= 0);
    assert(report.combat.events.some((e) => e.kind === 'hit'));
    assert(
      report.combat.events.some(
        (e) =>
          e.kind === 'hit' &&
          [heroes[0].basicId, heroes[1].basicId].includes(e.abilityId),
      ),
    );
    await wait(
      async () => (await read(peer)).state.creeps[enemy.id]?.hp === 0,
      'peer observes same enemy death',
    );
    assert(report.combat.after.some((h, i) => h.xp > rewards[i].xp));
    await wait(
      async () =>
        (await inspect(page)).renovation.bodies.some(
          (b) => b.name === 'actor:' + heroes[0].id && b.locomotion,
        ),
      'action returns to renovated idle',
    );
    await page.screenshot({ path: resolve(out, 'normal-combat.png') });
    mark('natural A combat, death and rewards');
    room.world.creeps.clear();
    // Static server fixture for exhaustive identity/pose coverage after natural combat.
    report.skills = await verifyRenovationSkills({
      room,
      pages,
      out,
      full: players === 6,
    });
    // Normal syncState continues; no browser can arrange these actors or submit damage.
    room.simulation.step = () => {
      room.simulation.tick++;
      for (const zone of room.simulation.zones.values()) zone.world.tick++;
    };
    const catalog = JSON.parse(
      readFileSync(
        'apps/game-client/src/renovation-art.generated.json',
        'utf8',
      ),
    );
    const coverage = new Set();
    const observe = async (ids) => {
      await wait(
        async () => {
          const v = (await inspect(page)).renovation;
          return ids.every((id) =>
            v.bodies.some(
              (b) =>
                b.id === id &&
                b.visible &&
                b.locomotion &&
                b.texture === 'renovated-' + id &&
                b.scale.every((s) => s === 0.5),
            ),
          );
        },
        'native bodies ' + ids.join(','),
      );
      await wait(
        async () => {
          const v = (await inspect(page)).renovation;
          return ids.every(
            (id) =>
              (v.observed[id] ?? []).filter((f) =>
                f.includes('renovated-' + id + ':walk_down_'),
              ).length === 4 ||
              v.bodies.some((b) => b.id === id && b.pose === 'idle'),
          );
        },
        'live locomotion ' + ids.join(','),
      );
      ids.forEach((id) => coverage.add(id));
    };
    const heroOriginals = heroes.map((h) => ({
      schoolId: h.schoolId,
      basicId: h.basicId,
    }));
    for (const actor of catalog.actors.filter((a) => a.group === 'heroes')) {
      const h = heroes[0],
        basic = actor.id.replace(/^hero_/, '');
      h.schoolId = basic.startsWith('thieu_lam')
        ? 'thieu_lam'
        : basic.startsWith('thien_son')
          ? 'thien_son'
          : basic.startsWith('vo_dang')
            ? 'vo_dang'
            : 'cai_bang';
      h.basicId =
        {
          cai_bang: 'cai_bang_bong',
          thien_son: 'thien_son_phien',
          vo_dang: 'vo_dang_quyen',
          thieu_lam: 'thieu_lam_quyen',
        }[basic] ?? basic;
      room.state.players.get(h.id).schoolId = h.schoolId;
      Object.assign(h, { pose: 'walk', fx: 0, fy: 1, castAbilityId: '' });
      await observe([actor.id]);
    }
    heroes.forEach((h, i) => {
      Object.assign(h, heroOriginals[i], { pose: 'idle' });
      room.state.players.get(h.id).schoolId = h.schoolId;
    });
    // Existing server entry/exit APIs arrange all eight maps; no client coordinates/damage accepted.
    for (const dungeon of creepDungeons) {
      heroes[0].hp = heroes[0].maxHp;
      assert.equal(
        room.simulation.enter(heroes[0].id, 'shared', dungeon.id),
        undefined,
      );
      const zone = room.simulation.zoneOf(heroes[0].id);
      const expected = [];
      if (['forest', 'desert', 'sea', 'hell'].includes(dungeon.id)) {
        zone.world.creeps.clear();
        const roster = catalog.actors.filter(
          (a) => a.group === 'dungeon_creeps' && a.biome === dungeon.id,
        );
        roster.forEach((actor, i) => {
          const id = dungeon.creepRoster[i];
          const e = addCreep(
            zone.world,
            'qa_roster_' + i,
            {
              x: dungeon.spawn.x + 60 + (i % 3) * 130,
              y: dungeon.spawn.y - 120 + Math.floor(i / 3) * 110,
            },
            zone.config,
          );
          Object.assign(e, { archetypeId: id, pose: 'walk', fx: 0, fy: 1 });
        });
        expected.push(
          ...catalog.actors
            .filter(
              (a) => a.group === 'dungeon_creeps' && a.biome === dungeon.id,
            )
            .map((a) => a.id),
        );
      }
      if (zone.world.chu) {
        zone.world.chu.phase = 'idle';
        const e = addCreep(
          zone.world,
          'qa_disciple',
          { x: dungeon.spawn.x + 100, y: dungeon.spawn.y - 80 },
          zone.config,
        );
        Object.assign(e, {
          archetypeId: 'chu_wine_disciple',
          pose: 'walk',
          fx: 0,
          fy: 1,
        });
        expected.push('chu_ba_thong', 'toan_chan_disciple');
      }
      if (zone.encounter) {
        for (const [id, i] of [
          ['mongol_infantry', 0],
          ['mongol_archer', 1],
        ]) {
          const e = addCreep(
            zone.world,
            'qa_' + id,
            { x: dungeon.spawn.x - 100 + i * 200, y: dungeon.spawn.y - 140 },
            zone.config,
          );
          Object.assign(e, { archetypeId: id, pose: 'walk', fx: 0, fy: 1 });
        }
        expected.push(
          'hoan_nhan_hong_liet',
          'mongol_infantry',
          'mongol_archer',
        );
      }
      if (zone.kim) {
        zone.kim.spawn(zone.world, zone.config, 'kim_luan_phap_vuong');
        const tick = zone.world.tick;
        zone.kim.effects.set('qa_elephant', {
          id: 'qa_elephant',
          castId: 'qa_elephant',
          ownerId: 'kim_luan_phap_vuong',
          abilityId: 'long_tuong_chan_thien',
          kind: 'elephant',
          startedAt: tick - 30,
          activeAt: tick - 20,
          expiresAt: tick + 10000,
          x: 900,
          y: 500,
          fx: 0,
          fy: 1,
          speed: 0,
          radius: 24,
          length: 0,
          damage: 0,
          hits: {},
        });
        expected.push('kim_luan', 'hoac_do', 'dat_nhi_ba', 'kim_elephant');
      }
      for (const e of zone.world.creeps.values())
        Object.assign(e, { pose: 'walk', fx: 0, fy: 1 });
      if (dungeon.id === 'co_mo') expected.push('ly_mac_sau', 'co_mo_am_binh');
      if (dungeon.id === 'co_mo' && !zone.world.creeps.size)
        throw Error('Missing Co Mo boss');
      if (dungeon.id === 'co_mo') {
        const e = addCreep(
          zone.world,
          'qa_am_binh',
          { x: dungeon.spawn.x + 130, y: dungeon.spawn.y - 80 },
          zone.config,
        );
        Object.assign(e, {
          archetypeId: 'co_mo_am_binh',
          pose: 'walk',
          fx: 0,
          fy: 1,
        });
      }
      await wait(
        async () =>
          (await inspect(page)).zoneId === zone.id &&
          (await inspect(page)).renovation.environment.some(
            (e) => e.texture === 'renovated-ground-' + dungeon.id,
          ),
        'map ' + dungeon.id,
      );
      await observe(expected);
      await page.screenshot({
        path: resolve(out, 'normal-' + dungeon.id + '.png'),
      });
      report.scenes.push({
        id: dungeon.id,
        zone: zone.id,
        actors: (await inspect(page)).renovation.bodies
          .filter((b) => b.visible)
          .map((b) => ({ id: b.id, texture: b.texture, pose: b.pose })),
        exit: (await inspect(page)).interactions,
      });
      Object.assign(heroes[0], {
        x: dungeon.exit.x,
        y: dungeon.exit.y,
        hp: heroes[0].maxHp,
      });
      assert.equal(room.simulation.exit(heroes[0].id), undefined);
      await wait(
        async () => (await inspect(page)).zoneId === 'arena',
        'return from ' + dungeon.id,
      );
    }
    assert.equal(report.scenes.length, 8);
    mark('all eight authoritative dungeon instances');
    const w = room.world,
      c = room.simulation.arena.config;
    const clean = () => {
      w.creeps.clear();
      room.simulation.dongTa.phase = 'waiting';
      room.simulation.tayDoc.phase = 'waiting';
      room.simulation.mainBosses.encounter = undefined;
      delete w.namDe;
      delete w.vuong;
    };
    const walk = () => {
      for (const e of w.creeps.values())
        Object.assign(e, { pose: 'walk', fx: 0, fy: 1 });
    };
    clean();
    const dong = room.simulation.dongTa;
    dong.startAttempt(w, c);
    dong.spawn(w, c, 'mai_sieu_phong', { x: 650, y: 580 });
    dong.spawn(w, c, 'hoang_dung', { x: 950, y: 580 });
    walk();
    await observe(['dong_ta', 'mai_sieu_phong', 'hoang_dung']);
    clean();
    const tay = room.simulation.tayDoc;
    tay.spawn(w, c);
    tay.phase = 'phase1';
    tay.release(w, c, {
      ability: 'hon_thien_phuc_long_chan',
      points: [{ x: 950, y: 600 }],
      fx: 0,
      fy: 1,
    });
    for (const pillar of tay.pillars.values()) pillar.at = w.tick - 30;
    walk();
    await observe(['tay_doc', 'tay_doc_snake']);
    tay.phase = 'phase2';
    await observe(['tay_doc_cap_mo']);
    clean();
    initializeNamDe(w, c, namDeDefinition);
    w.namDe.phase = 'rest';
    w.namDe.spawnAt = 0;
    spawnNamDeIfReady(w, c, room.simulation.tick);
    w.namDe.phase = 'combat';
    walk();
    await observe(['nam_de']);
    clean();
    const bac = new BacCaiEncounter(bacCaiDefinition);
    bac.initialize(w, c);
    bac.phase = 'combat';
    room.simulation.mainBosses.encounter = bac;
    bac.release(w, c, { ability: 'dogs', fx: 0, fy: 1 });
    walk();
    await observe(['bac_cai', 'bac_cai_black_dog']);
    clean();
    const vuong = new VuongEncounter(vuongDefinition);
    vuong.initialize(w, c);
    walk();
    vuong.releasedAt = w.tick - 100;
    await observe(['vuong_trung_duong_p1']);
    vuong.phase = 2;
    await observe(['vuong_trung_duong_p2']);
    report.identityCoverage = [...coverage, ...report.waveCoverage];
    assert.equal(new Set(report.identityCoverage).size, 74);
    report.observed = (await inspect(page)).renovation.observed;
    mark('all 74 approved actor forms in normal match renderers');
    // Actual Y sorting across an authored foreground tree, with replicated feet.
    clean();
    const h = heroes[0];
    Object.assign(h, { x: 800, y: 540, pose: 'idle' });
    await wait(async () => {
      const v = (await inspect(page)).renovation;
      return v.bodies.some((b) => b.name === 'actor:' + h.id && b.y === 540);
    }, 'feet behind tree');
    const behind = (await inspect(page)).renovation;
    const tree = behind.environment.find((e) => e.name === 'art01:statue_male');
    assert(tree);
    assert(
      behind.bodies.find((b) => b.name === 'actor:' + h.id).depth < tree.depth,
    );
    h.y = 620;
    await wait(async () => {
      const v = (await inspect(page)).renovation;
      return v.bodies.some((b) => b.name === 'actor:' + h.id && b.y === 620);
    }, 'feet in front of tree');
    assert(
      (await inspect(page)).renovation.bodies.find(
        (b) => b.name === 'actor:' + h.id,
      ).depth > tree.depth,
    );
    report.depth = { statue: tree, behind: 540, front: 620 };
    assert.deepEqual(errors, []);
    report.errors = errors;
    report.status = 'PASS';
    writeFileSync(
      resolve(out, development ? 'iteration.json' : 'live-integration.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    return report;
  } catch (error) {
    report.status = 'FAIL';
    report.failure = String(error);
    report.errors = errors;
    writeFileSync(
      resolve(out, 'last-failure.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
    throw error;
  } finally {
    for (const context of contexts) {
      for (const page of context.pages())
        await page
          .evaluate(() => {
            document.querySelector('[data-action=quit]')?.click();
            document.querySelector('#confirm-quit')?.click();
          })
          .catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 100));
      await context.close();
    }
    await owned.close();
    if (previousRun === undefined) delete process.env.VOLAM_QA_RUN_ID;
    else process.env.VOLAM_QA_RUN_ID = previousRun;
    if (previousEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnv;
  }
}

if (import.meta.main) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.VOLAM_REVIEW_CHROMIUM ??
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  try {
    await verifyRenovationRuntime(browser, { players: 2, development: true });
  } finally {
    await browser.close();
  }
}
