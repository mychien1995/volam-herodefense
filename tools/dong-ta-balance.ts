import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  DungeonMatch,
  initializeProgression,
  gainExperience,
  changeBuild,
  pointAccounting,
  characterStats,
  type Hero,
} from '@volam/game-core';
import {
  m1Config,
  creepDungeon,
  createInvasionDefinition,
  dongTaDefinition,
} from '@volam/game-data';
const rows: Array<Record<string, unknown>> = [];
const started = performance.now();
for (const level of [1, 6, 15, 30])
  for (const basic of Object.keys(m1Config.basics))
    for (const players of [1, 6])
      for (const seed of [42, 1337, 9001]) {
        const config = structuredClone(m1Config);
        config.creepSpawns = [];
        const d = structuredClone(dongTaDefinition);
        d.restTicks = 1;
        d.entryTicks = 1;
        const match = new DungeonMatch(
            config,
            creepDungeon,
            seed,
            createInvasionDefinition(180, 1000000),
            [],
            d,
          ),
          w = match.arena.world,
          e = match.dongTa!;
        for (let i = 0; i < players; i++) {
          const h = match.add('bot' + i, 'Bot' + i);
          h.schoolId = basic.split('_').slice(0, 2).join('_');
          initializeProgression(h, config, 'default');
          gainExperience(h, (level - 1) * config.xpPerLevel, config);
          const error = changeBuild(w, h, config, h.progression!.revision, {
            action: 'branch',
            basicId: basic,
          });
          if (error) throw Error(error);
        }
        match.invasion!.wave = 5;
        for (let n = 0; n < 4; n++) match.step();
        const initialStats = characterStats(
          w.heroes.get('bot0')!,
          config,
        ).total;
        let damage = 0,
          hits = 0,
          deaths = 0,
          heals = 0,
          elapsed = 0;
        for (
          ;
          elapsed < config.tickRate * 180 && e.phase !== 'cleared';
          elapsed++
        ) {
          for (const h of w.heroes.values()) {
            if (h.hp <= 0) continue;
            const boss = w.creeps.get('dong_ta');
            if (!boss) continue;
            const dx = boss.x - h.x,
              dy = boss.y - h.y;
            const ability = config.basics[h.basicId]!,
              range = 'range' in ability.effect ? ability.effect.range : 65;
            const targetRange = Math.min(range * 0.65, 145),
              n = Math.hypot(dx, dy);
            const command = (cmd: Parameters<typeof match.input>[2]) =>
              match.input(h.id, h.lastSequence + 1, cmd);
            if (elapsed % 3 === 0)
              command({
                kind: 'move',
                x: n > targetRange ? Math.sign(dx) : 0,
                y: n > targetRange ? Math.sign(dy) : 0,
              });
            if (n > 0) {
              h.fx = dx / n;
              h.fy = dy / n;
            }
            if (elapsed % 6 === 0) command({ kind: 'basic' });
            if (elapsed % 9 === 0)
              command({ kind: 'cast', slot: Math.floor(elapsed / 9) % 4 });
          }
          match.step();
          for (const { event } of match.events) {
            if (event.kind === 'hit' && event.targetId === 'dong_ta') {
              damage += event.damage;
              hits++;
            }
            if (event.kind === 'death' && event.targetId.startsWith('bot'))
              deaths++;
            if (event.kind === 'pulse' && event.abilityId === 'thanh_am_ho_tro')
              heals++;
          }
        }
        const heroes = [...w.heroes.values()],
          sum = (key: 'gold' | 'xp') => heroes.reduce((n, h) => n + h[key], 0);
        const h = heroes[0] as Hero;
        rows.push({
          seed,
          level,
          basic,
          players,
          result: e.phase,
          seconds: elapsed / config.tickRate,
          attempts: e.attempt,
          bossHp: w.creeps.get('dong_ta')?.hp ?? 0,
          bossMaxHp: w.creeps.get('dong_ta')?.maxHp ?? 0,
          damage,
          hits,
          dps: damage / (elapsed / config.tickRate || 1),
          deaths,
          heals,
          xp: sum('xp') - players * (level - 1) * config.xpPerLevel,
          gold: sum('gold'),
          items: heroes.reduce(
            (n, h) =>
              n + (h.bossItems?.length ?? 0) + (h.bossLoot?.length ?? 0),
            0,
          ),
          statueHp: w.statue!.hp,
          points: pointAccounting(h, config),
          stats: initialStats,
        });
      }
const out = fileURLToPath(new URL('../artifacts/dong-ta/', import.meta.url));
mkdirSync(out, { recursive: true });
const report = {
  status: 'MEASURED_PROPOSED_TUNING',
  seconds: (performance.now() - started) / 1000,
  scope:
    '192 fixed-seed runs: four schools/eight basics, legal automatic QWER builds, levels1/6/15/30, solo/six; 180s cap. No equipment. Bots pursue/attack without predictive dodging. Gate accelerated; normal combat/respawn/retry/rewards use production core.',
  cleared: rows.filter((r) => r['result'] === 'cleared').length,
  total: rows.length,
  rows,
};
writeFileSync(out + '/balance.json', JSON.stringify(report, null, 2));
const columns = [
  'seed',
  'level',
  'basic',
  'players',
  'result',
  'seconds',
  'attempts',
  'damage',
  'dps',
  'deaths',
  'heals',
  'xp',
  'gold',
  'items',
  'statueHp',
];
writeFileSync(
  out + '/balance.csv',
  columns.join(',') +
    '\n' +
    rows.map((r) => columns.map((k) => r[k]).join(',')).join('\n') +
    '\n',
);
console.log(
  JSON.stringify({
    seconds: report.seconds,
    total: report.total,
    cleared: report.cleared,
    byLevel: [1, 6, 15, 30].map((level) => ({
      level,
      cleared: rows.filter(
        (r) => r['level'] === level && r['result'] === 'cleared',
      ).length,
      total: rows.filter((r) => r['level'] === level).length,
    })),
  }),
);
