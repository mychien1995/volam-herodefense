import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { addCreep, refreshCharacter } from '@volam/game-core';
import { verifyRenovationRuntime } from './verify-renovation-runtime.mjs';
import { waitForQa } from './qa-wait.mjs';
import { profiles } from './verify-renovation-v3.mjs';
const out = 'docs/evidence/renovation-v3';
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.VOLAM_REVIEW_CHROMIUM ??
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
try {
  await verifyRenovationRuntime(browser, {
    players: 6,
    development: false,
    evidenceDir: out,
    onReady: async ({ room, pages }) => {
      const sim = room.simulation,
        w = room.world,
        c = sim.arena.config,
        heroes = [...w.heroes.values()],
        page = pages[0];
      w.creeps.clear();
      sim.invasion.wave = 0;
      sim.invasion.nextWaveTick = w.tick + 100000;
      sim.dongTa.phase = 'waiting';
      const offsets = [
        [0, 0],
        [-95, 0],
        [95, 0],
        [-95, -78],
        [0, -78],
        [95, -78],
      ];
      for (const [i, h] of heroes.entries()) {
        const p = profiles[i];
        Object.assign(h, {
          schoolId: p.school,
          basicId: p.basic,
          level: 30,
          xp: 29 * c.xpPerLevel,
          x: 800 + offsets[i][0],
          y: 760 + offsets[i][1],
          fx: 1,
          fy: 0,
          statuses: [],
          moveX: 0,
          moveY: 0,
          skillIds: [p.skills[0], '', '', ''],
          skillCooldowns: [0, 0, 0, 0],
          abilityCooldowns: {},
          pose: 'idle',
          actionUntil: 0,
          hurtUntil: 0,
          cooldown: 0,
        });
        h.progression.mode = 'custom';
        h.progression.ranks = { [p.skills[0]]: 1 };
        h.progression.revision++;
        room.state.players.get(h.id).schoolId = p.school;
        refreshCharacter(h, c);
        h.hp = h.maxHp;
        h.mana = h.maxMana;
        const e = addCreep(w, 'readability_' + i, { x: h.x + 35, y: h.y }, c);
        Object.assign(e, {
          archetypeId: 'creep_wild_dog',
          controlled: true,
          hp: 10000,
          maxHp: 10000,
        });
        e.stats = { ...c.creep, hp: 10000, defense: 0, xp: 0, gold: 0 };
        e.invasion = {
          wave: 1,
          lane: 'west',
          targetId: h.id,
          chaseOrigin: { x: e.x, y: e.y },
          reacquireAt: w.tick + 100000,
          chaseRange: 500,
          aggroRestTicks: 30,
        };
      }
      await waitForQa(
        async () =>
          page.evaluate(
            (id) =>
              window.__VOLAM__.snapshot().state.players[id].qSkill ===
              'hoanh_tao_bong',
            heroes[0].id,
          ),
        'readability legal loadout',
      );
      await page.waitForTimeout(900);
      const initial = await page.evaluate(() =>
        window.__VOLAM__.presentation(),
      );
      assert.equal(initial.zoom, 2);
      for (const h of heroes) {
        const b = initial.renovation.bodies.find(
          (b) => b.name === 'actor:' + h.id,
        );
        assert(b?.visible);
        assert(b.screen[0] > 200 && b.screen[0] < 1150);
        assert(b.screen[1] > 220 && b.screen[1] < 560);
      }
      const before =
        (await page.evaluate(() => window.__VOLAM__.snapshot())).events.at(-1)
          ?.id ?? 0;
      await Promise.all(
        pages.map(async (p) => {
          await p.locator('#game canvas').focus();
          await p.keyboard.press('KeyQ');
        }),
      );
      const observed = {},
        effects = new Set();
      let captured = false;
      const until = performance.now() + 1500;
      while (performance.now() < until) {
        const v = await page.evaluate(() => window.__VOLAM__.presentation());
        for (const b of v.renovation.bodies) {
          if (!b.action) continue;
          const h = heroes.find((h) => b.name === 'actor:' + h.id);
          if (h) {
            assert(
              b.source.includes('/renovation-v3/') ||
                b.source.includes('/renovation-v2/'),
            );
            (observed[h.id] ??= new Set()).add(b.texture + ':' + b.frame);
          }
        }
        for (const e of v.renovation.skillEffects)
          effects.add(e.texture + ':' + e.frame);
        if (!captured && effects.size >= 4) {
          await page.screenshot({ path: out + '/six-player-readability.png' });
          captured = true;
        }
        await page.waitForTimeout(25);
      }
      assert(captured);
      assert.equal(
        Object.keys(observed).length,
        6,
        'all six real casters sampled with new body art',
      );
      const states = await Promise.all(
        pages.map((p) => p.evaluate(() => window.__VOLAM__.snapshot())),
      );
      const casts = states[0].events.filter(
        (e) =>
          e.id > before &&
          e.kind === 'cast' &&
          heroes.some((h) => h.id === e.sourceId),
      );
      assert.equal(new Set(casts.map((e) => e.sourceId)).size, 6);
      for (const s of states)
        for (const e of casts) assert(s.events.some((p) => p.id === e.id));
      const report = {
        status: 'PASS',
        clients: 6,
        production: true,
        zoom: 2,
        fixture:
          'Server-owned level30/rank1 loadouts and durable targets; real simultaneous Q inputs. Supplementary in-view art observation, separate from the final natural combat pass.',
        frames: Object.fromEntries(
          Object.entries(observed).map(([id, frames]) => [id, [...frames]]),
        ),
        effects: [...effects],
        castEventIds: casts.map((e) => e.id),
        peerCastAgreement: true,
      };
      writeFileSync(
        out + '/six-player-readability.json',
        JSON.stringify(report, null, 2) + '\n',
      );
      console.log(report);
      return report;
    },
  });
} finally {
  await browser.close();
}
