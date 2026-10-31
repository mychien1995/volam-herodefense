import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { addHero, createWorld, stepWorld, submitInput } from '@volam/game-core';
import { m1Config } from '@volam/game-data';
interface ProbeRun {
  level: number;
  basic: string;
  skillId: string;
  seed: number;
  seconds: number;
  damage: number;
  dps: number;
  hits: number;
  casts: number;
  criticals: number;
  mana: number;
  xp: number;
  gold: number;
}
const runs: ProbeRun[] = [];
for (const level of [1, 6, 15, 30])
  for (const basic of ['cai_bang_bong', 'cai_bang_chuong'])
    for (const skill of Object.values(m1Config.skillCatalogue!))
      for (const seed of [42, 1337, 9001]) {
        const config = structuredClone(m1Config);
        config.width = 1200;
        config.height = 800;
        config.collision = [];
        config.spawn = { x: 300, y: 300 };
        config.creepSpawns = [
          { x: 350, y: 300 },
          { x: 390, y: 300 },
          { x: 350, y: 340 },
        ];
        config.creep.hp = 1000000;
        config.creep.speed = 0;
        config.creep.detectionRange = 1;
        const world = createWorld(config, seed),
          hero = addHero(world, 'bot', 'Cái Bang', config);
        hero.level = level;
        hero.skillPoints = level;
        hero.basicId = basic;
        hero.skillIds = [skill.id, '', '', ''];
        let damage = 0,
          hits = 0,
          casts = 0,
          criticals = 0;
        submitInput(world, 'bot', 1, { kind: 'cast', slot: 0 });
        for (let tick = 0; tick < config.tickRate * 4; tick++) {
          if (tick % 18 === 0)
            submitInput(world, 'bot', hero.lastSequence + 1, { kind: 'basic' });
          stepWorld(world, config);
          for (const e of world.events)
            if (e.sourceId === hero.id) {
              if (e.kind === 'hit') {
                damage += e.damage;
                hits++;
                if (e.critical) criticals++;
              }
              if (e.kind === 'cast') casts++;
            }
        }
        runs.push({
          level,
          basic,
          skillId: skill.id,
          seed,
          seconds: 4,
          damage,
          dps: damage / 4,
          hits,
          casts,
          criticals,
          mana: Number(hero.mana.toFixed(2)),
          xp: hero.xp,
          gold: hero.gold,
        });
      }
const summary = Object.keys(m1Config.skillCatalogue!).map((skillId) => {
  const r = runs.filter((x) => x.skillId === skillId && x.level === 1);
  return {
    skillId,
    minDps: Math.min(...r.map((x) => x.dps)),
    maxDps: Math.max(...r.map((x) => x.dps)),
  };
});
const output = fileURLToPath(new URL('../artifacts/', import.meta.url));
mkdirSync(output, { recursive: true });
writeFileSync(
  output + 'm3a-balance.json',
  JSON.stringify(
    {
      scope:
        'M3A Cái Bang rank-1 prototype values only. Levels1/6/15/30, Bổng/Chưởng normals, three seeds, ten skills. No gear, other schools, PvP, boss resistance or production campaign balance claim.',
      method:
        'One skill cast followed by manual A attempts every18ticks for four seconds against three stationary immortal defense5 targets. No damage/XP hacks; fixture geometry/HP intentionally fixed. Dash can leave target range, so this is a burst probe rather than optimal sustained DPS.',
      runs,
      summary,
    },
    null,
    2,
  ),
);
console.info(
  `${runs.length} seeded four-second Cái Bang probes: artifacts/m3a-balance.json`,
);
console.table(summary);
