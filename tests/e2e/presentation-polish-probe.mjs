import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import {
  initializeProgression,
  refreshCharacter,
  addCreep,
} from '@volam/game-core';
import { experienceAtLevel } from '../../packages/game-core/dist/campaign.js';
import { cancelOwnedEffects } from '../../packages/game-core/dist/status.js';
import { m1Config } from '@volam/game-data';
import { waitForQa } from '../../tools/qa-wait.mjs';
export async function verifyPresentationPolish({ room, pages, out }) {
  const [page, peer] = pages,
    sim = room.simulation,
    w = room.world,
    c = sim.arena.config,
    h = [...w.heroes.values()][0];
  const view = () => page.evaluate(() => window.__VOLAM__.presentation());
  const snap = (p) => p.evaluate(() => window.__VOLAM__.snapshot());
  const wait = (fn, label) =>
    waitForQa(fn, label, { timeout: 15000, diagnostics: view });
  h.schoolId = 'cai_bang';
  room.state.players.get(h.id).schoolId = 'cai_bang';
  h.level = 30;
  h.xp = experienceAtLevel(30, c);
  initializeProgression(h, c, 'fixed', 'cai_bang_chuong');
  refreshCharacter(h, c);
  h.hp = h.maxHp;
  sim.invasion.nextWaveTick = w.tick + 100000;
  w.creeps.clear();
  const report = { status: 'RUNNING', viewport: [1920, 900], runs: [] };
  await page.setViewportSize({ width: 1920, height: 900 });
  for (const enabled of [false, true]) {
    Object.assign(h, { x: 1000, y: 680, moveX: 0, moveY: 0, fx: -1, fy: 0 });
    await page.evaluate(
      (enabled) => window.__VOLAM__.reviewWorldDepth(enabled),
      enabled,
    );
    await wait(
      async () =>
        Math.abs((await view()).actors.find((a) => a.id === h.id)?.x - 1000) <
        2,
      'position acknowledgement',
    );
    await page.locator('#game canvas').focus();
    await page.evaluate(() => {
      window.__motionSamples = [];
      window.__motionRecording = true;
      const api = window.__VOLAM__;
      let prev;
      const sample = (renderer) => {
        if (!window.__motionRecording) return;
        const scene = renderer.game.scene.getScene('Arena'),
          sprite = scene.children.getByName(
            'actor:' + api.snapshot().sessionId,
          ),
          camera = scene.cameras.main,
          now = performance.now(),
          h = api.snapshot().state.players[api.snapshot().sessionId];
        if (sprite)
          window.__motionSamples.push({
            t: now,
            dt: prev ? now - prev : 0,
            x: sprite.x,
            y: sprite.y,
            sx: h.x,
            sy: h.y,
            cx: camera.scrollX,
            cy: camera.scrollY,
            frame: sprite.frame.name,
            pose: h.pose,
          });
        prev = now;
        api.afterRender(sample);
      };
      api.afterRender(sample);
    });
    const start = h.x;
    await page.keyboard.down('ArrowLeft');
    try {
      await wait(async () => h.x < start - 450, 'real authoritative left walk');
    } finally {
      await page.keyboard.up('ArrowLeft');
    }
    const samples = await page.evaluate(() => {
      window.__motionRecording = false;
      return window.__motionSamples;
    });
    await wait(
      async () => Math.abs((await snap(peer)).state.players[h.id].x - h.x) < 2,
      'peer agrees movement',
    );
    const middle = samples.filter(
        (s) => s.pose === 'walk' && s.x < 950 && s.x > 600,
      ),
      frames = middle.map((s) => s.dt).sort((a, b) => a - b),
      v = middle
        .slice(1)
        .map((s, i) => (s.x - middle[i].x) / ((s.t - middle[i].t) / 1000)),
      reverse = v.filter((x) => x > 1).length,
      zero = v.filter((x) => Math.abs(x) < 1).length;
    const entry = {
      enabled,
      samples: middle.length,
      frameMedian: frames[Math.floor(frames.length * 0.5)],
      frameP95: frames[Math.floor(frames.length * 0.95)],
      reverse,
      zero,
      meanSpeed: v.reduce((a, b) => a + b, 0) / v.length,
      velocityStdDev: Math.sqrt(
        v.reduce((a, b) => a + (b + 160) ** 2, 0) / v.length,
      ),
      samplesRaw: samples,
    };
    report.runs.push(entry);
    await page.locator('#viewport').screenshot({
      path: resolve(out, enabled ? 'moving-on.png' : 'moving-off.png'),
    });
  }

  const heroes = [...w.heroes.values()];
  const actors = Object.entries(m1Config.progression.schools).flatMap(
    ([school, p]) => p.basicIds.map((basic) => ({ school, basic })),
  );
  report.art = [];
  const build = (hero, school, basic) => {
    cancelOwnedEffects(w, hero.id);
    hero.schoolId = school;
    room.state.players.get(hero.id).schoolId = school;
    hero.level = 30;
    hero.xp = experienceAtLevel(30, c);
    initializeProgression(hero, c, 'fixed', basic);
    hero.progression.ranks = Object.fromEntries(
      hero.progression.defaultSkills.map((id) => [id, 4]),
    );
    hero.progression.revision++;
    hero.skillIds = [...hero.progression.defaultSkills];
    hero.skillCooldowns = [0, 0, 0, 0, 0];
    hero.abilityCooldowns = {};
    hero.statuses = [];
    hero.actionUntil = 0;
    refreshCharacter(hero, c);
    hero.hp = hero.maxHp;
    hero.mana = hero.maxMana;
  };
  const place = () =>
    heroes.forEach((hero, i) =>
      Object.assign(hero, {
        x: 550 + (i % 3) * 180,
        y: 720 + Math.floor(i / 3) * 125,
        fx: 0,
        fy: 1,
        moveX: 0,
        moveY: 0,
      }),
    );
  const keys = [
    ['down', ['ArrowDown'], 0, 1],
    ['down_right', ['ArrowDown', 'ArrowRight'], 1, 1],
    ['right', ['ArrowRight'], 1, 0],
    ['up_right', ['ArrowUp', 'ArrowRight'], 1, -1],
    ['up', ['ArrowUp'], 0, -1],
    ['up_left', ['ArrowUp', 'ArrowLeft'], -1, -1],
    ['left', ['ArrowLeft'], -1, 0],
    ['down_left', ['ArrowDown', 'ArrowLeft'], -1, 1],
  ];
  const save = () =>
    writeFileSync(resolve(out, 'motion.json'), JSON.stringify(report, null, 2));
  save();
  if (process.env.VOLAM_POLISH_ART === '1')
    for (let offset = 0; offset < actors.length; offset += heroes.length) {
      const group = actors.slice(offset, offset + heroes.length);
      group.forEach((a, i) => build(heroes[i], a.school, a.basic));
      place();
      await wait(async () => {
        const s = await snap(page);
        return group.every(
          (a, i) => s.state.players[heroes[i].id]?.basicId === a.basic,
        );
      }, 'branch ack ' + offset);
      await wait(async () => {
        const v = await view();
        return group.every((a, i) =>
          v.actors.some(
            (x) =>
              x.id === heroes[i].id &&
              (x.texture === 'hero-motion:' + a.basic ||
                x.texture === 'hero-finish:' + a.basic),
          ),
        );
      }, 'authored motion bodies ' + offset);
      const checks = group.map((a) => ({ ...a, directions: [], idle: [] }));
      for (const [direction, buttons, fx, fy] of keys) {
        place();
        group.forEach((a, i) => Object.assign(heroes[i], { fx, fy }));
        await wait(async () => {
          const v = await view();
          return group.every((a, i) =>
            v.actors.some(
              (x) =>
                x.id === heroes[i].id &&
                (String(x.frame).startsWith('idle_' + direction + '_') ||
                  x.frame === 'inhale_' + direction ||
                  x.frame === 'exhale_' + direction),
            ),
          );
        }, 'idle facing ' + direction);
        const idle = await page.evaluate(
          ({ ids }) =>
            new Promise((resolve) => {
              const seen = Object.fromEntries(ids.map((id) => [id, new Set()]));
              const api = window.__VOLAM__,
                end = performance.now() + 2750;
              const frame = () => {
                const v = api.presentation();
                for (const id of ids) {
                  const a = v.actors.find((a) => a.id === id);
                  if (a) seen[id].add(a.texture + ':' + a.frame);
                }
                if (performance.now() > end)
                  resolve(
                    Object.fromEntries(ids.map((id) => [id, [...seen[id]]])),
                  );
                else api.afterRender(frame);
              };
              api.afterRender(frame);
            }),
          { ids: group.map((a, i) => heroes[i].id) },
        );
        group.forEach((a, i) => {
          assert.equal(
            idle[heroes[i].id].length,
            4,
            'four real idle cels ' + a.basic + '/' + direction,
          );
          checks[i].idle.push({ direction, frames: idle[heroes[i].id] });
        });
        const starts = group.map((a, i) => ({
          x: heroes[i].x,
          y: heroes[i].y,
        }));
        for (let i = 0; i < group.length; i++) {
          await pages[i].locator('#game canvas').focus();
          for (const key of buttons) await pages[i].keyboard.down(key);
        }
        const walked = await page.evaluate(
          ({ ids }) =>
            new Promise((resolve) => {
              const seen = Object.fromEntries(ids.map((id) => [id, new Set()])),
                api = window.__VOLAM__,
                end = performance.now() + 650;
              const frame = () => {
                const v = api.presentation();
                for (const id of ids) {
                  const a = v.actors.find((a) => a.id === id);
                  if (a && String(a.frame).startsWith('walk_'))
                    seen[id].add(a.frame);
                }
                if (performance.now() > end)
                  resolve(
                    Object.fromEntries(ids.map((id) => [id, [...seen[id]]])),
                  );
                else api.afterRender(frame);
              };
              api.afterRender(frame);
            }),
          { ids: group.map((a, i) => heroes[i].id) },
        );
        for (let i = 0; i < group.length; i++)
          for (const key of buttons) await pages[i].keyboard.up(key);
        group.forEach((a, i) => {
          assert.ok(
            Math.hypot(heroes[i].x - starts[i].x, heroes[i].y - starts[i].y) >
              20,
            'server movement ' + a.basic,
          );
          const frames = walked[heroes[i].id].filter((f) =>
            f.startsWith('walk_' + direction + '_'),
          );
          assert.ok(
            frames.length >= 3,
            'authored stride frames ' + a.basic + '/' + direction,
          );
          checks[i].directions.push({ direction, frames });
        });
        if (!offset && direction === 'down_right')
          await page
            .locator('#viewport')
            .screenshot({ path: resolve(out, 'party-diagonal.png') });
      }
      report.art.push(...checks);
      save();
      for (let i = 0; i < group.length; i++) {
        const a = group[i],
          hero = heroes[i];
        build(hero, a.school, a.basic);
        w.creeps.clear();
        Object.assign(hero, { x: 700, y: 680, fx: 1, fy: 0 });
        const target = addCreep(w, 'polish_target', { x: 745, y: 680 }, c);
        Object.assign(target, {
          archetypeId: 'creep_wild_dog',
          controlled: true,
          hp: 100000,
          maxHp: 100000,
        });
        target.stats = { ...c.creep, hp: 100000, damage: 0 };
        const before = (await snap(pages[i])).events.at(-1)?.id ?? 0;
        await pages[i].locator('#game canvas').focus();
        await pages[i].keyboard.press('KeyA', { delay: 40 });
        await wait(async () => {
          const s = await snap(pages[i]);
          return s.events.some(
            (e) =>
              e.id > before &&
              e.sourceId === hero.id &&
              e.kind === 'attack' &&
              e.abilityId === a.basic,
          );
        }, 'normal A server ack ' + a.basic);
        await wait(async () => target.hp < 100000, 'unchanged hit ' + a.basic);
        await wait(async () => {
          const s = await snap(peer);
          return s.state.creeps[target.id]?.hp === target.hp;
        }, 'peer hit ack ' + a.basic);
        checks[i].attack = true;
        save();
      }
    }
  await page.locator('#game canvas').focus();
  await page.keyboard.press('F8');
  assert.equal((await view()).worldDepth.enabled, false);
  await page.keyboard.press('F8');
  assert.equal((await view()).worldDepth.enabled, true);
  const portrait = await page.evaluate(() => ({
    url: getComputedStyle(document.querySelector('.portrait')).backgroundImage,
    body: document
      .querySelector('#viewport')
      .style.getPropertyValue('--hero-idle'),
  }));
  assert.ok(portrait.url.includes('player-portraits-v1'));
  report.portrait = portrait;
  if (process.env.VOLAM_POLISH_ASSERT === '1')
    assert.ok(
      report.runs.every((r) => r.velocityStdDev < 55 && r.zero === 0),
      'rendered travel must have no stationary step and lower speed jitter',
    );
  report.status = 'PASS';
  writeFileSync(resolve(out, 'motion.json'), JSON.stringify(report, null, 2));
  console.log(
    '[motion] ' + JSON.stringify(report.runs.map(({ samplesRaw, ...r }) => r)),
  );
  assert.ok(report.runs.every((r) => r.samples > 40));
  return report;
}
