import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  createWorld,
  addHero,
  initializeProgression,
  gainExperience,
  changeBuild,
  pointAccounting,
  characterStats,
  submitInput,
  stepWorld,
  type CharacterStats,
  type PointAccounting,
} from '@volam/game-core';
import { m1Config } from '@volam/game-data';
const runs: Array<{
  level: number;
  basic: string;
  ultimate: boolean;
  seed: number;
  ranks: Record<string, number>;
  points: PointAccounting;
  stats: CharacterStats;
  seconds: number;
  damage: number;
  dps: number;
  hits: number;
  casts: number;
  mana: number;
}> = [];
for (const level of [1, 6, 15, 30])
  for (const basic of ['vo_dang_quyen', 'vo_dang_kiem'])
    for (const ultimate of [false, true])
      for (const seed of [42, 1337, 9001]) {
        const config = structuredClone(m1Config);
        config.collision = [];
        config.width = 1200;
        config.height = 800;
        config.spawn = { x: 300, y: 300 };
        config.creepSpawns = [
          { x: 340, y: 300 },
          { x: 365, y: 300 },
          { x: 340, y: 330 },
        ];
        config.creep.hp = 1000000;
        config.creep.speed = 0;
        config.creep.detectionRange = 1;
        const world = createWorld(config, seed),
          hero = addHero(world, 'bot', 'Võ Đang', config);
        hero.schoolId = 'vo_dang';
        initializeProgression(hero, config);
        gainExperience(hero, (level - 1) * 60, config);
        const ids = [
          'luong_nghi_thu',
          'duong_khi_kich',
          'bat_quai_kiem_tran',
          ultimate ? (level >= 6 ? 'thai_cuc_tran' : '') : 'that_tinh_kiem',
        ];
        changeBuild(world, hero, config, hero.progression!.revision, {
          action: 'loadout',
          ids,
        });
        changeBuild(world, hero, config, hero.progression!.revision, {
          action: 'basic',
          basicId: basic,
        });
        for (let round = 0; round < 4; round++)
          for (const skillId of ids.filter(Boolean))
            changeBuild(world, hero, config, hero.progression!.revision, {
              action: 'upgrade',
              skillId,
            });
        const before = characterStats(hero, config).total;
        let damage = 0,
          hits = 0,
          casts = 0;
        for (let tick = 0; tick < config.tickRate * 8; tick++) {
          if (tick % 2 === 0)
            submitInput(world, hero.id, hero.lastSequence + 1, {
              kind: 'basic',
            });
          if (tick % 6 === 0)
            submitInput(world, hero.id, hero.lastSequence + 1, {
              kind: 'cast',
              slot: Math.floor(tick / 6) % 4,
            });
          stepWorld(world, config);
          for (const e of world.events)
            if (e.sourceId === hero.id) {
              if (e.kind === 'hit') {
                damage += e.damage;
                hits++;
              }
              if (e.kind === 'cast') casts++;
            }
        }
        runs.push({
          level,
          basic,
          ultimate,
          seed,
          ranks: { ...hero.progression!.ranks },
          points: pointAccounting(hero, config),
          stats: before,
          seconds: 8,
          damage,
          dps: damage / 8,
          hits,
          casts,
          mana: hero.mana,
        });
      }
const summary = [1, 6, 15, 30].map((level) => {
  const rows = runs.filter((r) => r.level === level);
  return {
    level,
    minDps: Math.min(...rows.map((r) => r.dps)),
    maxDps: Math.max(...rows.map((r) => r.dps)),
    minAttack: Math.min(...rows.map((r) => r.stats.attackPower)),
    maxAttack: Math.max(...rows.map((r) => r.stats.attackPower)),
    surplus: [...new Set(rows.map((r) => r.points.surplus))],
  };
});
const output = fileURLToPath(new URL('../artifacts/', import.meta.url));
mkdirSync(output, { recursive: true });
writeFileSync(
  output + 'm3c2-balance.json',
  JSON.stringify(
    {
      scope:
        '48 eight-second probes; legal earned budgets/gates, mixed styles, both basics, four levels, three seeds. Stationary immortal defense5 targets, Vo Dang only; no equipment/PvP/boss/campaign or six-player performance claim. Manual A attempts2ticks, rotating skill attempts6ticks; mana/CD remain real.',
      runs,
      summary,
    },
    null,
    2,
  ) + '\n',
);
console.info(`${runs.length} legal progression probes`);
console.table(summary);
