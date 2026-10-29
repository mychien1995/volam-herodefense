import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const reportPath = (name: string) =>
  fileURLToPath(new URL(`../artifacts/${name}`, import.meta.url));
import { addHero, createWorld, stepWorld, submitInput } from '@volam/game-core';
import { m1Config } from '@volam/game-data';
const seeds = [1, 42, 99, 888, 2026];
const levels = [1, 6, 15, 30];
const scenarios = [
  'melee_stationary',
  'ranged_stationary',
  'ranged_dodge',
  'hoa_van_chuong',
  'cuong_long_loan_vu',
] as const;
const seconds = 20;
interface ProbeRun {
  level: number;
  scenario: (typeof scenarios)[number];
  seed: number;
  seconds: number;
  damage: number;
  hits: number;
  attacks: number;
  dps: number;
  hp: number;
  mana: number;
  gold: number;
  xp: number;
}
const runs: ProbeRun[] = [];
for (const level of levels)
  for (const scenario of scenarios)
    for (const seed of seeds) {
      const config = structuredClone(m1Config);
      config.collision = [];
      config.spawn = { x: 300, y: 300 };
      config.creepSpawns = [
        { x: scenario === 'melee_stationary' ? 340 : 420, y: 300 },
      ];
      config.creep.hp = 1_000_000;
      config.creep.speed = 0;
      config.creep.detectionRange = 0.1;
      const world = createWorld(config, seed);
      const player = addHero(world, 'bot', 'M1 test bot', config);
      player.level = level;
      player.skillPoints = level;
      player.xp = (level - 1) * config.xpPerLevel;
      player.maxHp += (level - 1) * config.hpPerLevel;
      player.hp = player.maxHp;
      player.basicId =
        scenario === 'melee_stationary' ? 'cai_bang_bong' : 'cai_bang_chuong';
      const target = world.creeps.get('creep_0')!;
      let damage = 0;
      let hits = 0;
      let attacks = 0;
      for (let tick = 0; tick < config.tickRate * seconds; tick++) {
        if (scenario === 'ranged_dodge')
          target.y = 300 + Math.sin(tick / 10) * 70;
        const slot =
          scenario === 'hoa_van_chuong'
            ? 0
            : scenario === 'cuong_long_loan_vu'
              ? 1
              : -1;
        if (slot < 0 && world.tick >= player.cooldown)
          submitInput(world, player.id, player.lastSequence + 1, {
            kind: 'basic',
          });
        if (slot >= 0 && world.tick >= (player.skillCooldowns[slot] ?? 0))
          submitInput(world, player.id, player.lastSequence + 1, {
            kind: 'cast',
            slot,
          });
        stepWorld(world, config);
        for (const event of world.events)
          if (event.sourceId === player.id) {
            if (event.kind === 'hit') {
              damage += event.damage;
              hits++;
            }
            if (event.kind === 'attack' || event.kind === 'cast') attacks++;
          }
      }
      runs.push({
        level,
        scenario,
        seed,
        seconds,
        damage,
        hits,
        attacks,
        dps: damage / seconds,
        hp: player.hp,
        mana: Number(player.mana.toFixed(2)),
        gold: player.gold,
        xp: player.xp - (level - 1) * config.xpPerLevel,
      });
    }
const summary = levels.flatMap((level) =>
  scenarios.map((scenario) => {
    const group = runs.filter(
      (run) => run.level === level && run.scenario === scenario,
    );
    const dps = group.map((run) => run.dps);
    return {
      level,
      scenario,
      meanDps: Number((dps.reduce((a, b) => a + b, 0) / dps.length).toFixed(2)),
      minDps: Math.min(...dps),
      maxDps: Math.max(...dps),
    };
  }),
);
const report = {
  scope:
    'M1 single archetype, unbalanced prototype; no school passives, gear, dungeon, raid or PvP simulation',
  method:
    'Repeated manual-press bot, 20-second fixed-step run; stationary defense-5 dummy; dodge uses a perpendicular sinusoidal path; creep AI disabled; no rewards from the immortal dummy',
  seeds,
  levels,
  config: m1Config,
  runs,
  summary,
};
mkdirSync(reportPath(''), { recursive: true });
writeFileSync(reportPath('m1-balance.json'), JSON.stringify(report, null, 2));
writeFileSync(
  reportPath('m1-balance.csv'),
  'level,scenario,seed,seconds,damage,hits,attacks,dps,hp,mana,gold,xp\n' +
    runs.map((run) => Object.values(run).join(',')).join('\n') +
    '\n',
);
console.info(
  `M1 deterministic probe: ${runs.length} runs, ${seeds.length} seeds, levels ${levels.join('/')}; outputs artifacts/m1-balance.json and .csv`,
);
console.table(summary.filter((row) => row.level === 1));
