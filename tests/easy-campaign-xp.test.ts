import { describe, expect, it } from 'vitest';
import { addHero, createWorld, InvasionDirector } from '@volam/game-core';
import {
  campaignDefinition,
  campaignForDifficulty,
  m1Config,
} from '@volam/game-data';
import { hurt } from '../packages/game-core/src/combat.js';
import { serverInvasionDefinition } from '../apps/game-server/src/invasion-config.js';

describe('Easy campaign wave EXP', () => {
  it('changes only invasion EXP and isolates each room from the baseline and other rooms', () => {
    const baseline = structuredClone(campaignDefinition);
    const easy = campaignForDifficulty(campaignDefinition, 'easy');
    const hard = campaignForDifficulty(campaignDefinition, 'hard');
    expect(easy).toEqual({
      ...baseline,
      invasionXp: [110, 450, 750, 750, 750],
    });
    expect(hard).toEqual(baseline);
    easy.invasionXp[0] = 999;
    easy.dungeonXp[0] = 999;
    easy.bosses.dong_ta!.xp = 999;
    expect(campaignDefinition).toEqual(baseline);
    expect(hard).toEqual(baseline);
    expect(
      campaignForDifficulty(campaignDefinition, 'easy').invasionXp[0],
    ).toBe(110);
  });

  for (const difficulty of ['easy', 'hard'] as const)
    for (const players of [1, 6])
      for (const seed of [17, 41, 89])
        for (const [chapter, wave] of [1, 6, 11, 16].entries())
          it(`${difficulty} P${players} wave ${wave} seed ${seed}: authored pool and real kill rewards preserve gold`, () => {
            const campaign = campaignForDifficulty(
              campaignDefinition,
              difficulty,
            );
            const config = {
              ...structuredClone(m1Config),
              campaign,
              creepSpawns: [],
            };
            const world = createWorld(config, seed);
            for (let i = 0; i < players; i++)
              addHero(world, `p${i}`, `P${i}`, config);
            const director = new InvasionDirector(
              serverInvasionDefinition({ NODE_ENV: 'production' }, 4),
              world,
            );
            director.wave = wave - 1;
            director.nextWaveTick = 1;
            for (let tick = 1; tick <= 1801; tick++)
              director.beforeStep(world, config, tick, players);
            expect(director.streaming).toBe(false);
            const enemies = [...world.creeps.values()].filter(
              (e) => e.invasion?.wave === wave,
            );
            expect(enemies.length).toBeGreaterThan(0);
            const xp =
              difficulty === 'easy'
                ? [110, 450, 750, 750][chapter]!
                : [100, 300, 450, 650][chapter]!;
            const gold = [70, 100, 130, 160][chapter]!;
            expect(enemies.reduce((s, e) => s + e.stats!.xp, 0)).toBeCloseTo(
              xp * players,
            );
            expect(enemies.reduce((s, e) => s + e.stats!.gold, 0)).toBeCloseTo(
              gold * players,
            );
            for (const enemy of enemies) {
              for (let i = 0; i < players; i++)
                hurt(world, enemy, `p${i}`, 'assist', 1, config, {
                  critChance: 0,
                  critMultiplier: 1,
                  directHp: true,
                });
              hurt(world, enemy, 'p0', 'kill', 100000, config, {
                critChance: 0,
                critMultiplier: 1,
                directHp: true,
              });
            }
            for (const hero of world.heroes.values()) {
              expect(hero.xp + (hero.farmXpRemainder ?? 0)).toBeCloseTo(xp);
              expect(hero.gold + (hero.farmGoldRemainder ?? 0)).toBeCloseTo(
                gold,
              );
            }
          });
});
