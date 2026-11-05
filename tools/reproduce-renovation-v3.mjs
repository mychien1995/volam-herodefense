import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { verifyRenovationRuntime } from './verify-renovation-runtime.mjs';
import { refreshCharacter } from '@volam/game-core';
import { waitForQa } from './qa-wait.mjs';
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.VOLAM_REVIEW_CHROMIUM ??
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
try {
  await verifyRenovationRuntime(browser, {
    players: 2,
    development: true,
    onReady: async ({ room, pages }) => {
      const [page] = pages,
        w = room.world,
        h = [...w.heroes.values()][0],
        c = room.simulation.arena.config;
      w.creeps.clear();
      room.simulation.invasion.nextWaveTick = w.tick + 100000;
      Object.assign(h, {
        schoolId: 'vo_dang',
        basicId: 'vo_dang_kiem',
        level: 30,
        xp: 29 * c.xpPerLevel,
        x: 800,
        y: 760,
        fx: 1,
        fy: 0,
        skillIds: ['van_kiem_quy_tong', '', '', ''],
      });
      room.state.players.get(h.id).schoolId = 'vo_dang';
      h.progression.mode = 'custom';
      h.progression.ranks = { van_kiem_quy_tong: 1 };
      h.progression.revision++;
      refreshCharacter(h, c);
      h.hp = h.maxHp;
      h.mana = h.maxMana;
      await waitForQa(
        async () =>
          page.evaluate(
            (id) =>
              window.__VOLAM__.snapshot().state.players[id].qSkill ===
              'van_kiem_quy_tong',
            h.id,
          ),
        'legal loadout replicated',
      );
      await page.locator('#game canvas').focus();
      await page.keyboard.press('KeyQ');
      await waitForQa(
        async () =>
          page.evaluate(() =>
            window.__VOLAM__
              .snapshot()
              .events.some(
                (e) => e.kind === 'cast' && e.abilityId === 'van_kiem_quy_tong',
              ),
          ),
        'real Q cast',
      );
      const states = [];
      for (const delay of [100, 500, 1200]) {
        await page.waitForTimeout(delay);
        states.push(
          await page.evaluate((id) => {
            const s = window.__VOLAM__.snapshot(),
              v = window.__VOLAM__.presentation();
            return {
              hero: s.state.players[id],
              body: v.renovation.bodies.find((b) => b.name === 'actor:' + id),
              effects: v.renovation.skillEffects,
            };
          }, h.id),
        );
      }
      await page.screenshot({
        path: 'docs/evidence/renovation-v3/van-kiem-before.png',
      });
      writeFileSync(
        'docs/evidence/renovation-v3/reproduce-before.json',
        JSON.stringify({ skill: 'van_kiem_quy_tong', states }, null, 2) + '\n',
      );
      console.log(
        states.map((s) => ({
          pose: s.hero.pose,
          body: s.body?.texture,
          frame: s.body?.frame,
          source: s.body?.source,
        })),
      );
      return { status: 'REPRODUCED' };
    },
  });
} finally {
  await browser.close();
}
