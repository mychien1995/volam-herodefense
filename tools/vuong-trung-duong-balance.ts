import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  addHero,
  changeBuild,
  createWorld,
  gainExperience,
  initializeProgression,
  stepWorld,
  submitInput,
  VUONG_ID,
  VuongEncounter,
} from '@volam/game-core';
import { m1Config, vuongDefinition } from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';

const rows = [];
const config = { ...m1Config, creepSpawns: [], creepRespawn: false };
for (const [school, data] of Object.entries(config.progression!.schools))
  for (const basic of data.basicIds)
    for (const level of [1, 6, 15, 30])
      for (const players of [1, 6])
        for (const seed of [42, 1337, 9001])
          for (const phase of [1, 2]) {
            const world = createWorld(config, seed);
            const party = Array.from({ length: players }, (_, i) => {
              const hero = addHero(world, 'probe' + i, school, config);
              hero.schoolId = school;
              initializeProgression(hero, config, 'default');
              gainExperience(hero, (level - 1) * config.xpPerLevel, config);
              const error = changeBuild(
                world,
                hero,
                config,
                hero.progression!.revision,
                { action: 'branch', basicId: basic },
              );
              if (error) throw Error(error);
              hero.x = 850 + 8 * i;
              hero.y = 616;
              hero.fx = -1;
              hero.fy = 0;
              hero.hp = hero.maxHp;
              hero.mana = hero.maxMana;
              return hero;
            });
            const encounter = new VuongEncounter(vuongDefinition);
            encounter.initialize(world, config);
            const boss = world.creeps.get(VUONG_ID)!;
            encounter.lightningHits = 3;
            if (phase === 2) {
              hurt(
                world,
                boss,
                party[0]!.id,
                'phase_prerequisite',
                boss.maxHp * 10,
                config,
              );
              stepWorld(world, config);
            }
            let dealt = 0,
              taken = 0,
              ticks = 0;
            const incoming = new Set<string>();
            for (; ticks < config.tickRate * 20; ++ticks) {
              for (const hero of party) {
                if (hero.hp <= 0) continue;
                const q = encounter.controls.get(hero.id)?.qte;
                if (q?.state === 'pending') {
                  submitInput(world, hero.id, hero.lastSequence + 1, {
                    kind: 'nam-de-key',
                    castId: q.id,
                    index: q.index,
                    key: q.keys[q.index]!,
                  });
                } else if (ticks % 6 === 0) {
                  submitInput(world, hero.id, hero.lastSequence + 1, {
                    kind: 'basic',
                  });
                  submitInput(world, hero.id, hero.lastSequence + 1, {
                    kind: 'cast',
                    slot: Math.floor(ticks / 6) % 4,
                  });
                }
              }
              stepWorld(world, config);
              for (const event of world.events) {
                if (event.kind !== 'hit') continue;
                if (event.targetId === VUONG_ID) dealt += event.damage;
                if (world.heroes.has(event.targetId)) {
                  taken += event.damage;
                  incoming.add(event.abilityId);
                }
              }
              if (
                encounter.wipeRequested ||
                boss.hp <= 0 ||
                party.every((h) => h.hp <= 0)
              ) {
                ticks++;
                break;
              }
            }
            const seconds = ticks / config.tickRate;
            rows.push({
              school,
              basic,
              level,
              players,
              seed,
              phase,
              seconds,
              dps: Math.round((dealt * 100) / seconds) / 100,
              taken,
              survivors: party.filter((h) => h.hp > 0).length,
              bossHp: boss.hp,
              wipe: encounter.wipeRequested,
              drops: party.reduce(
                (count, h) => count + (h.bossItems?.length ?? 0),
                0,
              ),
              incoming: [...incoming].join('|'),
            });
          }
const output = fileURLToPath(
  new URL('../docs/evidence/vuong-trung-duong', import.meta.url),
);
mkdirSync(output, { recursive: true });
writeFileSync(
  output + '/balance.json',
  JSON.stringify(
    {
      scope:
        'Seeded 20s exposure after shield or phase transition. Stationary legal builds use A/QWER and correct QTE keys. No movement, puzzle strategy, progression timing or kill-rate claims.',
      rows,
    },
    null,
    2,
  ) + '\n',
);
writeFileSync(
  output + '/balance.csv',
  Object.keys(rows[0]!).join(',') +
    '\n' +
    rows.map((r) => Object.values(r).join(',')).join('\n') +
    '\n',
);
console.log(
  `${rows.length} exposure probes; ${rows.filter((r) => !r.survivors).length} no-survivor runs; ${rows.reduce((n, r) => n + r.drops, 0)} items`,
);
