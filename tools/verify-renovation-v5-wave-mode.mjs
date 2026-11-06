import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifyRenovationRuntime } from './verify-renovation-runtime.mjs';
import { waitForQa } from './qa-wait.mjs';

export async function verifyRenovationWaveMode(
  browser,
  { development = false } = {},
) {
  const keys = [
    'VOLAM_DEV_LEGACY_SKILLS',
    'VOLAM_DEV_SKILLS',
    'VOLAM_DEV_PRACTICE_CREEPS',
    'VOLAM_DEV_WAVE_BOSSES',
    'VOLAM_DEV_FINAL_BOSS',
  ];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  for (const k of keys) process.env[k] = '1';
  const out = resolve('docs/evidence/renovation-v5');
  mkdirSync(out, { recursive: true });
  const read = (p) => p.evaluate(() => window.__VOLAM__.snapshot());
  const view = (p) => p.evaluate(() => window.__VOLAM__.presentation());
  const wait = (fn, label) => waitForQa(fn, label, { timeout: 20000 });
  try {
    return await verifyRenovationRuntime(browser, {
      players: 2,
      development,
      evidenceDir: out,
      onReady: async ({ room, pages }) => {
        const p = pages[0],
          w = room.world,
          sim = room.simulation;
        assert(room.devSkillLoadout && room.waveBossTestOptions);
        for (const h of w.heroes.values()) {
          assert.equal(h.level, 30);
          assert(h.skillIds.filter(Boolean).length === 4);
          assert(Object.values(h.progression.ranks).every((rank) => rank > 0));
        }
        await wait(
          async () =>
            [...w.creeps.values()].some(
              (e) => e.archetypeId === 'dong_ta' && e.hp > 0,
            ),
          'actual first boss',
        );
        assert.equal((await read(p)).state.defense.devWaveBossStage, 'dong_ta');
        await p.screenshot({ path: resolve(out, 'wave-boss-mode-first.png') });
        const h = [...w.heroes.values()][0];
        await p.locator('#game canvas').focus();
        const before = (await read(p)).events.at(-1)?.id ?? 0;
        await p.keyboard.press('KeyQ');
        await wait(
          async () =>
            (await read(p)).events.some(
              (e) => e.id > before && e.kind === 'cast' && e.sourceId === h.id,
            ),
          'test mode accepted Q',
        );
        await wait(
          () => h.skillCooldowns.every((n) => n === 0),
          'test mode zero skill cooldown',
        );
        // Labelled earlier-chapter prerequisites, not a claimed natural five-boss clear.
        sim.dongTa.phase = 'cleared';
        sim.tayDoc.phase = 'dead';
        if (w.namDe) w.namDe.phase = 'defeated';
        if (w.bacCai) w.bacCai.phase = 'defeated';
        sim.waveArena = undefined;
        sim.lockWaveArena(false);
        for (const id of ['dong_ta', 'tay_doc', 'nam_de', 'bac_cai'])
          sim.mainBosses.recordDefeat(id);
        w.creeps.clear();
        w.projectiles.clear();
        w.areas = [];
        w.shots = [];
        w.actions = [];
        w.combos = [];
        await wait(() => Boolean(w.vuong), 'actual fifth boss gate');
        await wait(
          async () => Boolean((await read(p)).state.vuong?.arena?.snapshot),
          'fifth boss replicated',
        );
        await wait(
          async () => (await view(p)).vuong?.visible > 0,
          'fifth boss Phaser renderer',
        );
        assert.equal(
          (await read(p)).state.defense.devWaveBossStage,
          'vuong_trung_duong',
        );
        await p.screenshot({ path: resolve(out, 'wave-boss-mode-final.png') });
        const report = {
          status: 'PASS',
          level: 30,
          zeroCooldown: true,
          first: 'dong_ta',
          final: 'vuong_trung_duong',
          players: 2,
          fixture:
            'Real review flags, lobby and keyboard Q. Observed actual first encounter. Earlier chapter defeat prerequisites then unlock the real fifth encounter; this is an entry/renderer check, not a natural five-boss clear.',
          peerFinal: JSON.parse(
            (await read(pages[1])).state.vuong.arena.snapshot,
          ).phase,
        };
        writeFileSync(
          resolve(out, 'wave-boss-mode.json'),
          JSON.stringify(report, null, 2),
        );
        return report;
      },
    });
  } finally {
    for (const k of keys)
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
  }
}
