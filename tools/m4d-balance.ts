import { mkdirSync, writeFileSync } from 'node:fs';
import {
  addHero,
  createWorld,
  emptyInventory,
  InvasionDirector,
} from '@volam/game-core';
import {
  campaignDefinition,
  createInvasionDefinition,
  m1Config,
} from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';
const densities = [];
for (const players of [1, 2, 6])
  for (const gates of [2, 3, 4] as const) {
    const run = (rows: 1 | 2, interval: number) => {
      const c = {
        ...structuredClone(m1Config),
        campaign: structuredClone(campaignDefinition),
        creepSpawns: [],
      };
      const w = createWorld(c, 17),
        d = createInvasionDefinition(interval, 2000, {
          portalCount: gates,
          rowsPerGate: rows,
        });
      const director = new InvasionDirector(d, w);
      for (let t = d.intervalTicks; t <= d.intervalTicks + d.streamTicks!; t++)
        director.beforeStep(w, c, t, players);
      const all = [...w.creeps.values()];
      return {
        count: all.length,
        creepsPerMinute: (all.length * 60) / interval,
        xp: all.reduce((n, e) => n + e.stats!.xp, 0),
        gold: all.reduce((n, e) => n + e.stats!.gold, 0),
      };
    };
    densities.push({ players, gates, baseline: run(1, 180), m4d: run(2, 120) });
  }
const spring = [];
for (const seed of [17, 41, 89]) {
  const c = structuredClone(m1Config),
    w = createWorld(c, seed),
    h = addHero(w, 'p', 'P', c);
  h.inventory = { ...emptyInventory(), crafted: { boots: 'spring' } };
  let activations = 0,
    heal = 0;
  for (let i = 0; i < 1000; i++) {
    h.hp = 500;
    h.maxHp = 1000;
    w.tick = i * 30 * c.tickRate;
    w.events = [];
    hurt(w, h, 'enemy', 'probe', 60, c, {
      critChance: 0,
      critMultiplier: 1,
      directHp: true,
    });
    for (const e of w.events)
      if (e.abilityId === 'gear_spring') {
        activations++;
        heal += e.damage;
      }
  }
  spring.push({
    seed,
    eligibleHits: 1000,
    activations,
    rate: activations / 1000,
    totalHealing: heal,
  });
}
const report = {
  scope:
    'Actual scheduled creep budgets and seeded Phung Xuan damage pipeline only. No bot combat, unattended-statue survival or human campaign clear-time claim.',
  densities,
  spring,
};
const output = new URL('../artifacts/m4d/', import.meta.url);
mkdirSync(output, { recursive: true });
writeFileSync(new URL('balance.json', output), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
