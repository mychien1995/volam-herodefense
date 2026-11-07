import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  DungeonMatch,
  createWorld,
  addHero,
  initializeProgression,
  gainExperience,
  experienceAtLevel,
  changeBuild,
  submitInput,
  stepWorld,
  transactMerchant,
  characterStats,
  pointAccounting,
  equipmentSlots,
} from '@volam/game-core';
import {
  m1Config,
  campaignDefinition,
  creepDungeon,
  creepCombatDefinition,
} from '@volam/game-data';

function build(
  h: ReturnType<typeof addHero>,
  world: ReturnType<typeof createWorld>,
  config: typeof m1Config,
) {
  for (let pass = 0; pass < 4; pass++)
    for (const slot of [4, 0, 1, 2, 3]) {
      if (pointAccounting(h, config).available <= 0) return;
      changeBuild(world, h, config, h.progression!.revision, {
        action: 'upgrade-slot',
        slot,
      });
    }
}
const rows: Array<{
  school: string;
  basic: string;
  seed: number;
  level: number;
  gear: number;
  pearlBonus: number;
  dps: number;
  stats: ReturnType<typeof characterStats>['total'];
}> = [];
for (const [school, profile] of Object.entries(m1Config.progression!.schools))
  for (const basic of profile.basicIds)
    for (const seed of [42, 1337, 9001])
      for (const level of [1, 6, 12, 18, 24, 28]) {
        const config = {
          ...structuredClone(m1Config),
          campaign: structuredClone(campaignDefinition),
          collision: [],
          width: 1200,
          height: 800,
          spawn: { x: 300, y: 300 },
          creepSpawns: [{ x: 345, y: 300 }],
          creepRespawn: false,
        };
        config.creep = {
          ...config.creep,
          hp: 1e9,
          defense: 30,
          speed: 0,
          damage: 0,
          detectionRange: 0,
        };
        const world = createWorld(config, seed),
          h = addHero(world, 'bot', 'Bot', config);
        for (const e of world.creeps.values()) {
          e.forcedMovementImmune = true;
          e.controlResistance = 1;
        }
        h.schoolId = school;
        initializeProgression(h, config, 'fixed', basic);
        gainExperience(h, experienceAtLevel(level, config), config);
        build(h, world, config);
        h.gold = 10000;
        const gear =
          level === 1
            ? 1
            : level === 6
              ? 2
              : level === 12
                ? 3
                : level === 18
                  ? 4
                  : 5;
        for (const slot of equipmentSlots)
          for (let rank = 0; rank < gear; rank++)
            transactMerchant(
              h,
              config,
              { inArena: true, matchTick: 0, worldTick: 0 },
              h.inventory?.revision ?? 0,
              { action: 'buy-basic', slot },
            );
        h.dragonBonus =
          level === 1 || level === 6
            ? 0
            : level === 12
              ? 0.12
              : level === 18
                ? 0.24
                : level === 24
                  ? 0.36
                  : 0.48;
        const stats = characterStats(h, config).total;
        h.hp = h.maxHp = stats.maxHp;
        h.mana = h.maxMana = stats.maxMana;
        let damage = 0;
        for (let tick = 0; tick < 900; tick++) {
          if (tick % 2 === 0)
            submitInput(world, h.id, h.lastSequence + 1, { kind: 'basic' });
          const slot = [0, 6, 12, 18, 24].indexOf(tick % 90);
          if (slot >= 0)
            submitInput(world, h.id, h.lastSequence + 1, {
              kind: 'cast',
              slot,
            });
          stepWorld(world, config);
          for (const e of world.events)
            if (e.kind === 'hit' && e.sourceId === h.id) damage += e.damage;
        }
        rows.push({
          school,
          basic,
          seed,
          level,
          gear,
          pearlBonus: h.dragonBonus,
          dps: damage / 30,
          stats,
        });
      }
const farm = [];
for (const [school, profile] of Object.entries(m1Config.progression!.schools))
  for (const basic of profile.basicIds)
    for (const seed of [42, 1337, 9001]) {
      const config = {
        ...structuredClone(m1Config),
        campaign: structuredClone(campaignDefinition),
        creepCombat: creepCombatDefinition,
        creepSpawns: [],
      };
      const m = new DungeonMatch(config, creepDungeon, seed),
        h = m.add('bot', 'Farmer');
      h.schoolId = school;
      initializeProgression(h, config, 'fixed', basic);
      h.invulnerable = true;
      build(h, m.arena.world, config);
      h.gold = 315;
      for (const slot of equipmentSlots)
        for (let rank = 0; rank < 2; rank++)
          transactMerchant(
            h,
            config,
            { inArena: true, matchTick: 0, worldTick: 0 },
            h.inventory?.revision ?? 0,
            { action: 'buy-basic', slot },
          );
      const start = h.gold;
      m.enter(h.id, 'private', 'forest');
      const zone = m.zoneOf(h.id)!;
      for (let tick = 0; tick < 300 * config.tickRate; tick++) {
        build(h, zone.world, config);
        const target = [...zone.world.creeps.values()]
          .filter((e) => e.hp > 0)
          .sort(
            (a, b) =>
              Math.hypot(a.x - h.x, a.y - h.y) -
              Math.hypot(b.x - h.x, b.y - h.y),
          )[0];
        if (target && tick % 6 === 0) {
          const d = Math.hypot(target.x - h.x, target.y - h.y);
          m.input(h.id, h.lastSequence + 1, {
            kind: 'move',
            x: d > 38 ? Math.sign(target.x - h.x) : 0,
            y: d > 38 ? Math.sign(target.y - h.y) : 0,
          });
        }
        if (tick % 2 === 0)
          m.input(h.id, h.lastSequence + 1, { kind: 'basic' });
        const slot = [0, 6, 12, 18, 24].indexOf(tick % 90);
        if (slot >= 0)
          m.input(h.id, h.lastSequence + 1, { kind: 'cast', slot });
        m.step();
      }
      farm.push({
        school,
        basic,
        seed,
        seconds: 300,
        xp: h.xp,
        gold: h.gold - start,
        xpPerMinute: h.xp / 5,
        goldPerMinute: (h.gold - start) / 5,
        wave: zone.wave,
        level: h.level,
      });
    }
const summary = {
  scope:
    '144 fixed-seed 30-second legal five-slot single-target armor30 probes at levels1/6/12/18/24/28; 24 five-minute invulnerable private-forest farm probes with manual inputs and real creep abilities. Gear is a fixture, no crafted effects. Farm excludes invasions/travel/death; this is not a completed human campaign or victory-rate measurement.',
  probes: rows.length,
  farmProbes: farm.length,
  levelDps: [1, 6, 12, 18, 24, 28].map((level) => ({
    level,
    min: Math.min(...rows.filter((r) => r.level === level).map((r) => r.dps)),
    max: Math.max(...rows.filter((r) => r.level === level).map((r) => r.dps)),
  })),
  earlyFarm: {
    xpPerMinute: [
      Math.min(...farm.map((r) => r.xpPerMinute)),
      Math.max(...farm.map((r) => r.xpPerMinute)),
    ],
    goldPerMinute: [
      Math.min(...farm.map((r) => r.goldPerMinute)),
      Math.max(...farm.map((r) => r.goldPerMinute)),
    ],
  },
};
mkdirSync(fileURLToPath(new URL('../artifacts/', import.meta.url)), {
  recursive: true,
});
writeFileSync(
  fileURLToPath(new URL('../artifacts/campaign-balance.json', import.meta.url)),
  JSON.stringify({ summary, config: campaignDefinition, rows, farm }, null, 2) +
    '\n',
);
console.log(JSON.stringify(summary));
