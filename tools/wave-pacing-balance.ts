import { mkdirSync, writeFileSync } from 'node:fs';
import {
  DungeonMatch,
  experienceAtLevel,
  gainExperience,
  initializeProgression,
} from '@volam/game-core';
import { campaignDefinition, creepDungeon, m1Config } from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';
const rows = [];
for (const school of ['cai_bang', 'thien_son', 'vo_dang', 'thieu_lam'])
  for (const basic of m1Config.progression!.schools[school]!.basicIds)
    for (const level of [1, 6, 15, 30])
      for (const players of [1, 6])
        for (const seed of [17, 41, 89]) {
          const run = (multiplier: number) => {
            const c = {
              ...structuredClone(m1Config),
              campaign: structuredClone(campaignDefinition),
              creepSpawns: [],
            };
            c.campaign.dungeonXp = [3, 5, 8, 11, 14].map((v) => v * multiplier);
            c.campaign.dungeonGold = [0.8, 1.5, 2, 2.5, 3].map(
              (v) => v * multiplier,
            );
            const m = new DungeonMatch(c, structuredClone(creepDungeon), seed);
            const h = m.add('p0', 'Farmer');
            for (let p = 1; p < players; p++) m.add('p' + p, 'Peer');
            h.schoolId = school;
            initializeProgression(h, c, 'fixed', basic);
            gainExperience(h, experienceAtLevel(level, c), c);
            const startXp = h.xp;
            m.enter(h.id, 'private', 'forest');
            const z = m.zoneOf(h.id)!;
            const enemyHp = z.config.creep.hp;
            for (const e of z.world.creeps.values())
              hurt(z.world, e, h.id, 'reward-probe', 100000, z.config, {
                critChance: 0,
                critMultiplier: 1,
                directHp: true,
              });
            return {
              enemies: z.world.creeps.size,
              enemyHp,
              xp: h.xp - startXp,
              xpRemainder: h.farmXpRemainder ?? 0,
              gold: h.gold,
              goldRemainder: h.farmGoldRemainder ?? 0,
            };
          };
          rows.push({
            school,
            basic,
            level,
            players,
            seed,
            baseline: run(1),
            candidate: run(1.25),
          });
        }
const report = {
  scope:
    'Real damaging kill settlement for one private forest wave; four schools, both basics, levels 1/6/15/30, P1/P6, seeds 17/41/89, no gear. Direct damage isolates economy, not DPS, clear time, survival, XP/minute or full campaign readiness. Level 30 is XP-capped; the retained over-level farm penalty applies.',
  probes: rows.length,
  chapterSeconds: campaignDefinition.chapterSeconds,
  rows,
};
const output = new URL('../artifacts/wave-pacing/', import.meta.url);
mkdirSync(output, { recursive: true });
writeFileSync(
  new URL('balance.json', output),
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify({
    probes: rows.length,
    chapterSeconds: report.chapterSeconds,
    output: 'artifacts/wave-pacing/balance.json',
    sample: rows[0],
  }),
);
