import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { addCreep, refreshCharacter } from '@volam/game-core';
import { m1Config } from '@volam/game-data';
import { verifyRenovationRuntime } from './verify-renovation-runtime.mjs';
import { waitForQa } from './qa-wait.mjs';
import { verifyRenovationBosses } from './verify-renovation-v3-bosses.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const profiles = [
  ['cai_bang', 'cai_bang_bong', 'Bổng'],
  ['cai_bang', 'cai_bang_chuong', 'Chưởng'],
  ['thien_son', 'thien_son_phien', 'Phiến'],
  ['thien_son', 'thien_son_dao', 'Đao'],
  ['vo_dang', 'vo_dang_quyen', 'Quyền'],
  ['vo_dang', 'vo_dang_kiem', 'Kiếm'],
  ['thieu_lam', 'thieu_lam_quyen', 'Quyền'],
  ['thieu_lam', 'thieu_lam_dao', 'Đao'],
].map(([school, basic, style]) => ({
  school,
  basic,
  skills: Object.values(m1Config.progression.skills)
    .filter((s) => s.schoolId === school && s.style === style)
    .map((s) => s.id),
}));
const read = (p) => p.evaluate(() => window.__VOLAM__.snapshot());
const view = (p) => p.evaluate(() => window.__VOLAM__.presentation());
const body = (v, id) =>
  v.renovation.bodies.find((b) => b.name === 'actor:' + id);
const renovated = (b) =>
  b?.source.includes('/renovation-v3/') ||
  b?.source.includes('/renovation-v2/');
export async function verifyRenovationV3(
  browser,
  {
    players = 2,
    development = true,
    full = false,
    scope = 'all',
    captureOnly = false,
  } = {},
) {
  const out = resolve('docs/evidence/renovation-v3');
  mkdirSync(out, { recursive: true });
  const result = {
    status: 'RUNNING',
    players,
    development,
    scope,
    captureOnly,
    directions: full ? 4 : 1,
    fixture:
      'Server-owned legal level30/rank1 loadouts and durable targets; actual keyboard A/Q casts, unchanged server tick/effects. Non-primary facings observe the active startup, not an entire long channel. Boss selections are server fixtures, not a natural boss progression.',
    basics: [],
    skills: [],
  };
  try {
    return await verifyRenovationRuntime(browser, {
      players,
      development,
      evidenceDir: out,
      onReady: async ({ room, pages }) => {
        const [page, old] = pages,
          w = room.world,
          h = [...w.heroes.values()][0],
          c = room.simulation.arena.config;
        const wait = (fn, label) =>
          waitForQa(fn, label, {
            timeout: 16000,
            diagnostics: async () => ({
              hero: (await read(page)).state.players[h.id],
              body: body(await view(page), h.id),
            }),
          });
        room.simulation.invasion.wave = 0;
        room.simulation.invasion.nextWaveTick = w.tick + 100000;
        room.simulation.dongTa.phase = 'waiting';
        const clear = () => {
          w.creeps.clear();
          w.projectiles.clear();
          w.areas = [];
          w.shots = [];
          w.actions = [];
          w.combos = [];
        };
        const setup = (profile, skill, fx, fy) => {
          clear();
          h.schoolId = profile.school;
          room.state.players.get(h.id).schoolId = profile.school;
          h.basicId = profile.basic;
          h.level = c.maxLevel;
          h.xp = (c.maxLevel - 1) * c.xpPerLevel;
          h.skillPoints = c.maxLevel;
          h.progression.mode = 'custom';
          h.progression.ranks = Object.fromEntries(
            profile.skills.map((id) => [id, 1]),
          );
          h.progression.branchId = profile.basic;
          h.progression.revision++;
          Object.assign(h, {
            x: 800,
            y: 760,
            fx,
            fy,
            moveX: 0,
            moveY: 0,
            statuses: [],
            pose: 'idle',
            actionUntil: 0,
            hurtUntil: 0,
            cooldown: 0,
            castAbilityId: '',
            skillIds: [skill, '', '', ''],
            skillCooldowns: [0, 0, 0, 0],
            abilityCooldowns: {},
          });
          refreshCharacter(h, c);
          h.hp = h.maxHp;
          h.mana = h.maxMana;
          for (const other of w.heroes.values())
            if (other !== h)
              Object.assign(other, {
                x: captureOnly ? 950 : 1080,
                y: captureOnly ? 820 : 760,
                moveX: 0,
                moveY: 0,
                statuses: [],
                hp: other.maxHp,
              });
          const angle = ['van_kiem_quy_tong', 'bach_phien_phong_bao'].includes(
            skill,
          )
            ? Math.PI / 8
            : 0;
          const dummy = addCreep(
            w,
            'renovation_dummy',
            {
              x: h.x + (fx * Math.cos(angle) - fy * Math.sin(angle)) * 54,
              y: h.y + (fx * Math.sin(angle) + fy * Math.cos(angle)) * 54,
            },
            c,
          );
          Object.assign(dummy, {
            archetypeId: 'creep_wild_dog',
            hp: 100000,
            maxHp: 100000,
            controlled: skill !== 'toa_sat_bac_do',
            cooldown: w.tick + 5,
          });
          dummy.invasion = {
            wave: 1,
            lane: 'west',
            targetId: h.id,
            chaseOrigin: { x: dummy.x, y: dummy.y },
            reacquireAt: w.tick + 100000,
            chaseRange: 500,
            aggroRestTicks: 30,
          };
          dummy.stats = {
            ...c.creep,
            hp: 100000,
            damage: 18,
            defense: 0,
            xp: 0,
            gold: 0,
          };
        };
        const observe = async (ms, expected, skill) => {
          const frames = new Set(),
            phases = new Set(),
            sources = new Set(),
            effects = new Map(),
            samples = [];
          let active = 0;
          const until = performance.now() + ms;
          while (performance.now() < until) {
            const v = await view(page),
              b = body(v, h.id);
            if (b?.visible) {
              if (
                !b.locomotion &&
                !['hurt', 'stun', 'death'].includes(b.pose)
              ) {
                assert(
                  renovated(b),
                  skill + ' stale cast ' + JSON.stringify(b),
                );
                assert.equal(b.effectiveDensity, 2, JSON.stringify(b));
                assert.equal(b.depth, b.y);
                active++;
              }
              if (b.action) {
                frames.add(b.texture + ':' + b.frame);
                phases.add(b.action.phase);
                sources.add(b.source);
                assert.equal(
                  b.action.body.startsWith('v2:')
                    ? b.action.body
                        .split(':')[1]
                        .startsWith(
                          expected === 'hero_vo_dang_kiem'
                            ? 'vo_dang'
                            : 'thien_son',
                        )
                    : b.action.body.startsWith(expected),
                  true,
                  skill + ' caster identity',
                );
              }
              if (samples.length < 14)
                samples.push({
                  at: Math.round(ms - (until - performance.now())),
                  pose: b.pose,
                  frame: b.frame,
                  phase: b.action?.phase,
                  source: b.source,
                  feet: [b.x, b.y],
                });
            }
            for (const e of v.renovation.skillEffects)
              effects.set(e.texture + ':' + e.frame, e);
            await sleep(35);
          }
          return {
            active,
            frames: [...frames],
            phases: [...phases],
            sources: [...sources],
            effects: [...effects.values()],
            samples,
          };
        };
        if (scope !== 'bosses')
          for (const profile of profiles.filter(
            (p) =>
              !captureOnly ||
              !process.env.VOLAM_V3_CAPTURE_BRANCHES ||
              process.env.VOLAM_V3_CAPTURE_BRANCHES.split(',').includes(
                p.basic,
              ),
          )) {
            const actor =
              {
                cai_bang_bong: 'hero_cai_bang',
                thien_son_phien: 'hero_thien_son',
                vo_dang_quyen: 'hero_vo_dang',
                thieu_lam_quyen: 'hero_thieu_lam',
              }[profile.basic] ?? 'hero_' + profile.basic;
            for (const [direction, fx, fy] of full
              ? [
                  ['right', 1, 0],
                  ['down', 0, 1],
                  ['left', -1, 0],
                  ['up', 0, -1],
                ]
              : [['right', 1, 0]]) {
              setup(profile, profile.skills[0], fx, fy);
              await wait(async () => {
                const s = (await read(page)).state.players[h.id];
                return (
                  s.basicId === profile.basic &&
                  s.qSkill === profile.skills[0] &&
                  s.pose === 'idle'
                );
              }, 'loadout ' + profile.basic);
              if (captureOnly)
                await wait(
                  async () => body(await view(page), h.id)?.locomotion,
                  'previous cast settled before branch ' + profile.basic,
                );
              await page.locator('#game canvas').focus();
              let before = (await read(page)).events.at(-1)?.id ?? 0;
              await page.keyboard.press('KeyA');
              await wait(
                async () =>
                  (await read(page)).events.some(
                    (e) =>
                      e.id > before &&
                      e.sourceId === h.id &&
                      e.kind === 'attack',
                  ),
                'basic ' + profile.basic,
              );
              const observed = await observe(750, actor, profile.basic);
              assert(
                observed.frames.length > 0,
                profile.basic + ' visible authored body',
              );
              assert(
                (await read(page)).events.some(
                  (e) =>
                    e.id > before && e.sourceId === h.id && e.kind === 'hit',
                ),
                profile.basic + ' actual hit',
              );
              result.basics.push({
                basic: profile.basic,
                direction,
                ...observed,
              });
              for (const skill of profile.skills) {
                setup(profile, skill, fx, fy);
                await wait(
                  async () => {
                    const s = (await read(page)).state.players[h.id];
                    return (
                      s.qSkill === skill &&
                      s.pose === 'idle' &&
                      Math.abs(s.x - 800) < 1
                    );
                  },
                  'fixture ' + skill + '/' + direction,
                );
                await page.locator('#game canvas').focus();
                before = (await read(page)).events.at(-1)?.id ?? 0;
                await page.keyboard.press('KeyQ');
                await wait(
                  async () =>
                    (await read(page)).events.some(
                      (e) =>
                        e.id > before &&
                        e.sourceId === h.id &&
                        e.kind === 'cast' &&
                        e.abilityId === skill,
                    ),
                  'Q ' + skill + '/' + direction,
                );
                const e = m1Config.skillCatalogue[skill].effect;
                const life = e.durationTicks
                  ? (e.durationTicks * 1000) / c.tickRate
                  : e.mode === 'multi_hit'
                    ? (e.hits * e.spacingTicks * 1000) / c.tickRate
                    : e.mode === 'dash'
                      ? (e.distance / e.speed) * 1000
                      : 1400;
                const primary = direction === 'right',
                  duration = captureOnly
                    ? 800
                    : primary
                      ? Math.max(1200, Math.min(18000, life + 500))
                      : 1100;
                const samplePromise = observe(duration, actor, skill).catch(
                  (failure) => ({ failure }),
                );
                if (captureOnly)
                  await wait(
                    async () => body(await view(page), h.id)?.action,
                    'visible cast capture ' + skill,
                  );
                else await sleep(primary ? 200 : 70);
                if (primary) {
                  const [a, b] = await Promise.all([view(page), view(old)]);
                  await Promise.all(
                    [
                      [page, 'new', body(a, h.id)],
                      [old, 'old', body(b, h.id)],
                    ].map(([p, suffix, b]) =>
                      p.screenshot({
                        path: resolve(out, skill + '-' + suffix + '.png'),
                        clip: {
                          x: Math.max(
                            0,
                            Math.min(854, Math.round(b.screen[0] - 256)),
                          ),
                          y: Math.max(
                            0,
                            Math.min(288, Math.round(b.screen[1] - 240)),
                          ),
                          width: 512,
                          height: 480,
                        },
                      }),
                    ),
                  );
                }
                const obs = await samplePromise;
                if (obs.failure) throw obs.failure;
                assert(obs.frames.length > 0, skill + ' native cast observed');
                const events = (await read(page)).events.filter(
                  (e) =>
                    e.id > before &&
                    e.sourceId === h.id &&
                    e.abilityId === skill,
                );
                const peerEvents = (await read(old)).events;
                assert(
                  events.some((e) =>
                    peerEvents.some((p) => p.id === e.id && p.kind === e.kind),
                  ),
                  skill + ' peer replicated server events',
                );
                result.skills.push({
                  skill,
                  direction,
                  description: m1Config.progression.skills[skill].descriptionVi,
                  bodyActor: actor,
                  observedMs: duration,
                  wholeLifetime: !captureOnly && primary && life + 500 <= 18000,
                  events: events.map((e) => ({
                    id: e.id,
                    kind: e.kind,
                    damage: e.damage,
                    x: e.x,
                    y: e.y,
                    fx: e.fx,
                    fy: e.fy,
                  })),
                  ...obs,
                });
                writeFileSync(
                  resolve(out, 'school-matrix-progress.json'),
                  JSON.stringify(result, null, 2) + '\n',
                );
                console.log('[v3] ' + skill + '/' + direction + ' PASS');
              }
            }
          }
        clear();
        h.statuses = [];
        h.hp = h.maxHp;
        if (scope !== 'heroes')
          result.bosses = await verifyRenovationBosses({
            room,
            pages,
            out,
            full,
          });
        if (players === 6)
          result.party = await naturalParty({ room, pages, out, wait });
        result.status = 'PASS';
        writeFileSync(
          resolve(
            out,
            captureOnly
              ? 'capture-matrix.json'
              : development
                ? 'iteration-matrix.json'
                : 'live-matrix.json',
          ),
          JSON.stringify(result, null, 2) + '\n',
        );
        return result;
      },
    });
  } catch (error) {
    result.status = 'FAIL';
    result.failure = String(error);
    writeFileSync(
      resolve(out, 'matrix-failure.json'),
      JSON.stringify(result, null, 2) + '\n',
    );
    throw error;
  }
}
async function naturalParty({ room, pages, out, wait }) {
  const sim = room.simulation,
    w = room.world,
    c = sim.arena.config;
  for (const h of [...sim.membership.keys()])
    if (sim.zoneOf(h)?.id !== 'arena') sim.exit(h);
  w.creeps.clear();
  w.projectiles.clear();
  w.areas = [];
  w.shots = [];
  w.actions = [];
  w.combos = [];
  w.vuong = undefined;
  w.namDe = undefined;
  sim.mainBosses.encounter = undefined;
  sim.dongTa.phase = 'waiting';
  const heroes = [...w.heroes.values()];
  for (const [i, h] of heroes.entries()) {
    const p = profiles[i];
    Object.assign(h, {
      schoolId: p.school,
      basicId: p.basic,
      x: 620 + (i % 3) * 150,
      y: 730 + Math.floor(i / 3) * 115,
      fx: 1,
      fy: 0,
      statuses: [],
      pose: 'idle',
      actionUntil: 0,
      hurtUntil: 0,
      cooldown: 0,
      skillIds: [p.skills[0], '', '', ''],
      skillCooldowns: [0, 0, 0, 0],
      abilityCooldowns: {},
    });
    h.progression.ranks = { [p.skills[0]]: 1 };
    h.progression.mode = 'custom';
    h.progression.revision++;
    room.state.players.get(h.id).schoolId = p.school;
    refreshCharacter(h, c);
    h.hp = h.maxHp;
    h.mana = h.maxMana;
    const e = addCreep(w, 'natural_' + i, { x: h.x + 45, y: h.y }, c);
    e.archetypeId = 'creep_wild_dog';
    e.invasion = {
      wave: 1,
      lane: 'west',
      targetId: h.id,
      chaseOrigin: { x: e.x, y: e.y },
      reacquireAt: w.tick + 100000,
      chaseRange: 500,
      aggroRestTicks: 30,
    };
    e.stats = { ...c.creep, hp: 140, defense: 0, damage: 3 };
    e.hp = e.maxHp = 140;
  }
  await wait(
    async () =>
      Object.keys((await read(pages[0])).state.creeps).filter((id) =>
        id.startsWith('natural_'),
      ).length === 6,
    'six natural targets',
  );
  const before = (await read(pages[0])).events.at(-1)?.id ?? 0;
  for (const p of pages) {
    await p.locator('#game canvas').focus();
    await p.keyboard.down('KeyA');
    await p.keyboard.press('KeyQ');
  }
  await sleep(250);
  await pages[0].screenshot({ path: resolve(out, 'six-player-combat.png') });
  await wait(async () => {
    const s = await read(pages[0]);
    return heroes.every((h) =>
      s.events.some(
        (e) => e.id > before && e.sourceId === h.id && e.kind === 'hit',
      ),
    );
  }, 'six client replicated hits');
  for (const p of pages) await p.keyboard.up('KeyA');
  const snapshots = await Promise.all(pages.map(read)),
    events = snapshots[0].events.filter(
      (e) => e.id > before && e.kind === 'hit',
    );
  assert(heroes.every((h) => events.some((e) => e.sourceId === h.id)));
  for (const s of snapshots)
    for (const e of events)
      assert(s.events.some((p) => p.id === e.id && p.damage === e.damage));
  await pages[0].screenshot({ path: resolve(out, 'six-player-after.png') });
  return { clients: 6, hitEvents: events.length, peerDamageAgreement: true };
}
if (import.meta.main) {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.VOLAM_REVIEW_CHROMIUM ??
      'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  try {
    await verifyRenovationV3(browser, {
      players: Number(process.env.VOLAM_V3_PLAYERS ?? 2),
      development: process.env.VOLAM_V3_PRODUCTION !== '1',
      full: process.env.VOLAM_V3_FULL === '1',
      scope: process.env.VOLAM_V3_SCOPE ?? 'all',
      captureOnly: process.env.VOLAM_V3_CAPTURE_ONLY === '1',
    });
  } finally {
    await browser.close();
  }
}
